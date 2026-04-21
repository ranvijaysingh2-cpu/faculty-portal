/**
 * PW Faculty Portal — Activity Logger + Report Engine
 *
 * Attached to: activity_log Google Sheet
 *
 * SCRIPT PROPERTIES (gear icon > Script properties):
 *   LOG_SECRET           : same as LOG_SECRET in Vercel env
 *   USER_ACCESS_SHEET_ID : Spreadsheet ID of user_access Google Sheet
 *                          Tabs required: faculty | heads | center_contacts | master_map
 *   PDF_INDEX_SHEET_ID   : Spreadsheet ID of pdf_index Google Sheet
 *   MANAGEMENT_EMAILS    : comma-separated boss emails (6-7 people)
 *
 * TABS in user_access sheet:
 *   faculty         : faculty_email | faculty_name | batch
 *   heads           : email | role | scope_value  (center_head / region_head)
 *   center_contacts : region | center | ch_email | ach_email | rah_email | raom_email | aom_email
 *                     (multiple emails per cell = comma-separated)
 *   master_map      : auto-built — never edit manually
 *
 * TRIGGERS:
 *   - doPost: logging + build_master_map + send_reports actions
 *   - Time-driven: Sunday 10am → sendAllReports()
 *     (Triggers > Add Trigger > sendAllReports | Week timer | Sunday | 9am–10am)
 */

var LOG_SHEET_NAME            = "activity_log";
var LOG_SECRET_PROP           = "LOG_SECRET";
var USER_ACCESS_SHEET_ID_PROP = "USER_ACCESS_SHEET_ID";
var PDF_INDEX_SHEET_ID_PROP   = "PDF_INDEX_SHEET_ID";
var MANAGEMENT_EMAILS_PROP    = "MANAGEMENT_EMAILS";

// ── Web App endpoint ──────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var secret = PropertiesService.getScriptProperties().getProperty(LOG_SECRET_PROP);
    if (secret && data._secret !== secret) return json({ error: "Forbidden" });

    if (data.action === "build_master_map") {
      buildMasterMap();
      return json({ success: true, action: "build_master_map" });
    }

    if (data.action === "send_reports") {
      sendAllReports();
      return json({ success: true, action: "send_reports" });
    }

    // Default: log activity event
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateLogSheet(ss);
    sheet.appendRow([
      data.timestamp   || new Date().toISOString(),
      data.email       || "",
      data.role        || "",
      data.scope_value || "",
      data.event_type  || "",
      data.pdf_name    || "",
      data.batch       || "",
      data.center      || "",
      data.region      || "",
      data.test_date   || "",
    ]);
    return json({ success: true });

  } catch (err) {
    return json({ error: err.message });
  }
}

function doGet() { return json({ status: "ok" }); }

// ── Build Master Map ──────────────────────────────────────────────────────────
// Joins faculty + pdf_index + center_contacts → writes master_map tab
// Called by: doPost action="build_master_map" (triggered by your PDF gen script)

function buildMasterMap() {
  var props        = PropertiesService.getScriptProperties();
  var userAccessId = props.getProperty(USER_ACCESS_SHEET_ID_PROP);
  var pdfIndexId   = props.getProperty(PDF_INDEX_SHEET_ID_PROP);
  if (!userAccessId || !pdfIndexId) {
    Logger.log("Set USER_ACCESS_SHEET_ID and PDF_INDEX_SHEET_ID in Script Properties.");
    return;
  }

  var userSs = SpreadsheetApp.openById(userAccessId);

  // 1. Read faculty tab
  var facultySheet = userSs.getSheetByName("faculty");
  if (!facultySheet) { Logger.log("faculty tab not found"); return; }
  var fRows = facultySheet.getDataRange().getValues();
  var fH    = headerMap(fRows[0]);
  var faculty = fRows.slice(1).map(function(r) {
    return {
      email: r[fH["faculty_email"]].toString().trim().toLowerCase(),
      name:  r[fH["faculty_name"]].toString().trim(),
      batch: r[fH["batch"]].toString().trim(),
    };
  }).filter(function(f) { return f.email && f.batch; });

  // 2. Read pdf_index → batch → { center, region }
  var pdfSs    = SpreadsheetApp.openById(pdfIndexId);
  var pdfSheet = pdfSs.getSheetByName("pdf_index");
  if (!pdfSheet) { Logger.log("pdf_index tab not found"); return; }
  var pRows    = pdfSheet.getDataRange().getValues();
  var pH       = headerMap(pRows[0]);
  var batchMap = {};
  pRows.slice(1).forEach(function(r) {
    var batch  = r[pH["batch"]].toString().trim();
    var center = r[pH["center"]].toString().trim();
    var region = r[pH["region"]].toString().trim();
    if (batch && center && !batchMap[batch]) batchMap[batch] = { center: center, region: region };
  });

  // 3. Read center_contacts → center → email columns
  var ccSheet = userSs.getSheetByName("center_contacts");
  if (!ccSheet) { Logger.log("center_contacts tab not found"); return; }
  var ccRows = ccSheet.getDataRange().getValues();
  var ccH    = headerMap(ccRows[0]);
  var ccMap  = {};
  ccRows.slice(1).forEach(function(r) {
    var center = r[ccH["center"]].toString().trim();
    if (!center || ccMap[center]) return;
    ccMap[center] = {
      ch_email:   r[ccH["ch_email"]].toString().trim(),
      ach_email:  r[ccH["ach_email"]].toString().trim(),
      rah_email:  r[ccH["rah_email"]].toString().trim(),
      raom_email: r[ccH["raom_email"]].toString().trim(),
      aom_email:  r[ccH["aom_email"]].toString().trim(),
    };
  });

  // 4. Build master_map rows
  var rows = [["faculty_email","faculty_name","batch","center","region",
               "ch_email","ach_email","rah_email","raom_email","aom_email"]];
  faculty.forEach(function(f) {
    var geo = batchMap[f.batch];
    var cc  = geo ? ccMap[geo.center] : null;
    rows.push([
      f.email, f.name, f.batch,
      geo ? geo.center : "",
      geo ? geo.region : "",
      cc ? cc.ch_email   : "",
      cc ? cc.ach_email  : "",
      cc ? cc.rah_email  : "",
      cc ? cc.raom_email : "",
      cc ? cc.aom_email  : "",
    ]);
  });

  // 5. Write master_map (clear + rewrite)
  var mmSheet = userSs.getSheetByName("master_map");
  if (!mmSheet) mmSheet = userSs.insertSheet("master_map");
  mmSheet.clearContents();
  mmSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  mmSheet.setFrozenRows(1);
  Logger.log("master_map built: " + (rows.length - 1) + " rows");
}

// ── Send All Reports ──────────────────────────────────────────────────────────
// Sunday 10am trigger + doPost action="send_reports" + admin panel button

function sendAllReports() {
  var props        = PropertiesService.getScriptProperties();
  var userAccessId = props.getProperty(USER_ACCESS_SHEET_ID_PROP);
  var mgmtEmails   = props.getProperty(MANAGEMENT_EMAILS_PROP);
  if (!userAccessId) { Logger.log("USER_ACCESS_SHEET_ID not set"); return; }
  if (!mgmtEmails)   { Logger.log("MANAGEMENT_EMAILS not set"); return; }

  // Load master_map
  var userSs  = SpreadsheetApp.openById(userAccessId);
  var mmSheet = userSs.getSheetByName("master_map");
  if (!mmSheet) { Logger.log("master_map not found — run buildMasterMap first"); return; }
  var mmRows = mmSheet.getDataRange().getValues();
  var mmH    = headerMap(mmRows[0]);

  var allFaculty = mmRows.slice(1).map(function(r) {
    return {
      email:      r[mmH["faculty_email"]].toString().trim().toLowerCase(),
      name:       r[mmH["faculty_name"]].toString().trim(),
      batch:      r[mmH["batch"]].toString().trim(),
      center:     r[mmH["center"]].toString().trim(),
      region:     r[mmH["region"]].toString().trim(),
      ch_email:   r[mmH["ch_email"]].toString().trim(),
      ach_email:  r[mmH["ach_email"]].toString().trim(),
      rah_email:  r[mmH["rah_email"]].toString().trim(),
      raom_email: r[mmH["raom_email"]].toString().trim(),
      aom_email:  r[mmH["aom_email"]].toString().trim(),
    };
  }).filter(function(f) { return f.email; });

  // Load activity_log — last 7 days
  var cutoff   = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  var logSs    = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = logSs.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) { Logger.log("activity_log not found"); return; }

  var logRows  = logSheet.getDataRange().getValues();
  var logH     = headerMap(logRows[0]);
  var activeEmails = {};
  var lastSeen     = {};

  logRows.slice(1).forEach(function(r) {
    var email = r[logH["email"]].toString().trim().toLowerCase();
    var ts    = new Date(r[logH["timestamp"]]);
    if (!email || isNaN(ts)) return;
    if (!lastSeen[email] || ts > lastSeen[email]) lastSeen[email] = ts;
    if (ts >= cutoff && (!activeEmails[email] || ts > activeEmails[email])) activeEmails[email] = ts;
  });

  var week = formatDate(cutoff) + " \u2013 " + formatDate(new Date());

  sendCenterReports(allFaculty, activeEmails, lastSeen, week);
  sendRegionReports(allFaculty, activeEmails, lastSeen, week);
  sendBossReport(allFaculty, activeEmails, lastSeen, week, mgmtEmails);

  Logger.log("All reports sent successfully.");
}

// ── Center Reports ────────────────────────────────────────────────────────────
// TO: ch_email, ach_email   CC: rah_email, raom_email, aom_email

function sendCenterReports(allFaculty, activeEmails, lastSeen, week) {
  var byCenter = {};
  allFaculty.forEach(function(f) {
    if (!f.center) return;
    if (!byCenter[f.center]) byCenter[f.center] = { rows: [], meta: f };
    byCenter[f.center].rows.push(f);
  });

  Object.keys(byCenter).forEach(function(center) {
    var g        = byCenter[center];
    var m        = g.meta;
    var toList   = splitEmails(m.ch_email + "," + m.ach_email);
    var ccList   = splitEmails(m.rah_email + "," + m.raom_email + "," + m.aom_email);
    if (toList.length === 0) return;

    var faculty  = g.rows;
    var active   = faculty.filter(function(f) { return  activeEmails[f.email]; });
    var inactive = faculty.filter(function(f) { return !activeEmails[f.email]; });
    var pct      = Math.round((active.length / faculty.length) * 100);

    // Batch-wise breakdown
    var batchStats = {};
    faculty.forEach(function(f) {
      if (!batchStats[f.batch]) batchStats[f.batch] = { total: 0, opened: 0 };
      batchStats[f.batch].total++;
      if (activeEmails[f.email]) batchStats[f.batch].opened++;
    });

    var lines = [];
    lines.push("Hi,");
    lines.push("");
    lines.push("Weekly faculty portal usage \u2014 " + center);
    lines.push("Week: " + week);
    lines.push("");
    lines.push("SUMMARY");
    lines.push(rep("\u2500", 60));
    lines.push("Faculty opened : " + active.length + " / " + faculty.length + " (" + pct + "%)");
    lines.push("Not opened     : " + inactive.length);

    if (inactive.length > 0) {
      lines.push("");
      lines.push("\u26a0\ufe0f  ACTION NEEDED \u2014 Faculty who have NOT opened results:");
      lines.push(rep("\u2500", 60));
      lines.push(pad("Name", 28) + pad("Batch", 24) + "Last Seen");
      lines.push(rep("\u2500", 70));
      inactive.sort(function(a, b) {
        if (!lastSeen[a.email] && !lastSeen[b.email]) return 0;
        if (!lastSeen[a.email]) return -1;
        if (!lastSeen[b.email]) return 1;
        return lastSeen[a.email] - lastSeen[b.email];
      }).forEach(function(f) {
        var seen = lastSeen[f.email] ? formatDate(lastSeen[f.email]) : "Never opened \u2190 contact now";
        lines.push(pad(f.name || f.email, 28) + pad(f.batch, 24) + seen);
      });
    }

    lines.push("");
    lines.push("BATCH-WISE ENGAGEMENT:");
    lines.push(rep("\u2500", 60));
    lines.push(pad("Batch", 28) + pad("Opened", 10) + pad("Total", 8) + "Rate");
    lines.push(rep("\u2500", 55));
    Object.keys(batchStats).sort().forEach(function(b) {
      var s    = batchStats[b];
      var bp   = Math.round((s.opened / s.total) * 100);
      var flag = bp === 100 ? " \u2705" : bp < 60 ? " \u26a0\ufe0f" : "";
      lines.push(pad(b, 28) + pad(s.opened + "/" + s.total, 10) + pad(s.total + "", 8) + bp + "%" + flag);
    });

    if (active.length > 0) {
      lines.push("");
      lines.push("ACTIVE FACULTY:");
      lines.push(rep("\u2500", 60));
      active.forEach(function(f) {
        lines.push("\u2022 " + (f.name || f.email) + "  [" + f.batch + "]  \u2014 " + formatDate(activeEmails[f.email]));
      });
    }

    lines.push("");
    lines.push("\u2014 PW Faculty Portal (automated weekly report, every Sunday)");

    var subj = "PW Portal \u2014 " + center + " \u2014 " + week + " (" + inactive.length + " inactive)";
    sendEmail(toList, ccList, subj, lines.join("\n"));
    Logger.log("Center report \u2192 " + toList.join(", "));
  });
}

// ── Region Reports ────────────────────────────────────────────────────────────
// TO: raom_email, aom_email   CC: rah_email

function sendRegionReports(allFaculty, activeEmails, lastSeen, week) {
  var byRegion = {};
  allFaculty.forEach(function(f) {
    if (!f.region) return;
    if (!byRegion[f.region]) byRegion[f.region] = { byCenter: {}, meta: f };
    var bc = byRegion[f.region].byCenter;
    if (!bc[f.center]) bc[f.center] = { rows: [], ch: f.ch_email };
    bc[f.center].rows.push(f);
  });

  Object.keys(byRegion).forEach(function(region) {
    var g       = byRegion[region];
    var m       = g.meta;
    var toList  = splitEmails(m.raom_email + "," + m.aom_email);
    var ccList  = splitEmails(m.rah_email);
    if (toList.length === 0) return;

    var bc = g.byCenter;
    var totalFaculty = 0, totalActive = 0;
    var centerList = Object.keys(bc).map(function(center) {
      var rows   = bc[center].rows;
      var opened = rows.filter(function(f) { return activeEmails[f.email]; }).length;
      totalFaculty += rows.length;
      totalActive  += opened;
      return { center: center, opened: opened, total: rows.length, ch: bc[center].ch,
               pct: Math.round((opened / rows.length) * 100) };
    }).sort(function(a, b) { return a.pct - b.pct; });

    var regionPct = Math.round((totalActive / totalFaculty) * 100);
    var critical  = centerList.filter(function(c) { return c.pct <  50; });
    var warn      = centerList.filter(function(c) { return c.pct >= 50 && c.pct < 80; });
    var good      = centerList.filter(function(c) { return c.pct >= 80; });

    var lines = [];
    lines.push("Hi,");
    lines.push("");
    lines.push("Weekly faculty portal usage \u2014 " + region + " Region");
    lines.push("Week: " + week);
    lines.push("");
    lines.push("REGION SUMMARY");
    lines.push(rep("\u2500", 60));
    lines.push("Faculty opened : " + totalActive + " / " + totalFaculty + " (" + regionPct + "%)");
    lines.push("Not opened     : " + (totalFaculty - totalActive));

    function centerTable(list) {
      lines.push(pad("Center", 38) + pad("Rate", 12) + "CH Contact");
      lines.push(rep("\u2500", 75));
      list.forEach(function(c) {
        lines.push(pad(c.center, 38) + pad(c.opened + "/" + c.total + " (" + c.pct + "%)", 12) + "  " + c.ch);
      });
    }

    if (critical.length > 0) {
      lines.push("");
      lines.push("\u274c  CENTERS NEEDING IMMEDIATE ATTENTION (< 50%):");
      centerTable(critical);
    }
    if (warn.length > 0) {
      lines.push("");
      lines.push("\u26a0\ufe0f  CENTERS BELOW TARGET (50\u201379%):");
      centerTable(warn);
    }
    if (good.length > 0) {
      lines.push("");
      lines.push("\u2705  CENTERS ON TRACK (\u2265 80%):");
      centerTable(good);
    }

    lines.push("");
    lines.push("FULL INACTIVE LIST BY CENTER:");
    lines.push(rep("\u2500", 90));
    lines.push(pad("Center", 35) + pad("Name", 28) + pad("Batch", 22) + "Last Seen");
    lines.push(rep("\u2500", 90));
    var hasAny = false;
    centerList.forEach(function(cs) {
      bc[cs.center].rows
        .filter(function(f) { return !activeEmails[f.email]; })
        .forEach(function(f) {
          hasAny = true;
          var seen = lastSeen[f.email] ? formatDate(lastSeen[f.email]) : "Never";
          lines.push(pad(cs.center, 35) + pad(f.name || f.email, 28) + pad(f.batch, 22) + seen);
        });
    });
    if (!hasAny) lines.push("(none \u2014 all faculty active this week \u2705)");

    lines.push("");
    lines.push("\u2014 PW Faculty Portal (automated weekly report, every Sunday)");

    var subj = "PW Portal \u2014 " + region + " Region \u2014 " + week + " (" + (totalFaculty - totalActive) + " inactive)";
    sendEmail(toList, ccList, subj, lines.join("\n"));
    Logger.log("Region report \u2192 " + toList.join(", "));
  });
}

// ── Boss Report ───────────────────────────────────────────────────────────────
// TO: all management emails

function sendBossReport(allFaculty, activeEmails, lastSeen, week, mgmtEmails) {
  var toList = splitEmails(mgmtEmails);
  if (toList.length === 0) return;

  var total  = allFaculty.length;
  var opened = allFaculty.filter(function(f) { return activeEmails[f.email]; }).length;
  var pct    = Math.round((opened / total) * 100);

  // Region stats
  var regionStats = {};
  allFaculty.forEach(function(f) {
    if (!f.region) return;
    if (!regionStats[f.region]) regionStats[f.region] = { total: 0, opened: 0 };
    regionStats[f.region].total++;
    if (activeEmails[f.email]) regionStats[f.region].opened++;
  });

  // Center stats
  var centerStats = {};
  allFaculty.forEach(function(f) {
    if (!f.center) return;
    if (!centerStats[f.center]) centerStats[f.center] = { total: 0, opened: 0, region: f.region, ch: f.ch_email };
    centerStats[f.center].total++;
    if (activeEmails[f.email]) centerStats[f.center].opened++;
  });

  var regionList = Object.keys(regionStats).map(function(r) {
    var s = regionStats[r];
    return { region: r, opened: s.opened, total: s.total, pct: Math.round((s.opened / s.total) * 100) };
  }).sort(function(a, b) { return a.pct - b.pct; });

  var criticalCenters = Object.keys(centerStats)
    .map(function(c) {
      var s = centerStats[c];
      return { center: c, region: s.region, ch: s.ch, opened: s.opened, total: s.total,
               pct: Math.round((s.opened / s.total) * 100) };
    })
    .filter(function(c) { return c.pct < 50; })
    .sort(function(a, b) { return a.pct - b.pct; });

  var inactiveAll = allFaculty
    .filter(function(f) { return !activeEmails[f.email]; })
    .sort(function(a, b) {
      if (!lastSeen[a.email] && !lastSeen[b.email]) return 0;
      if (!lastSeen[a.email]) return -1;
      if (!lastSeen[b.email]) return 1;
      return lastSeen[a.email] - lastSeen[b.email];
    });

  var lines = [];
  lines.push("PW Faculty Portal \u2014 Weekly Management Report");
  lines.push("Week: " + week);
  lines.push("");
  lines.push("PLATFORM OVERVIEW");
  lines.push(rep("\u2500", 60));
  lines.push("Total Faculty  : " + total);
  lines.push("Results Opened : " + opened + " (" + pct + "%)");
  lines.push("Not Opened     : " + (total - opened) + " (" + (100 - pct) + "%)");
  lines.push("");

  lines.push("REGION PERFORMANCE (worst first):");
  lines.push(rep("\u2500", 60));
  lines.push(pad("Region", 25) + pad("Opened", 14) + pad("Rate", 8) + "Status");
  lines.push(rep("\u2500", 60));
  regionList.forEach(function(r) {
    var status = r.pct >= 80 ? "\u2705 Good" : r.pct >= 60 ? "\u26a0\ufe0f  Monitor" : "\u274c Action needed";
    lines.push(pad(r.region, 25) + pad(r.opened + "/" + r.total, 14) + pad(r.pct + "%", 8) + status);
  });

  if (criticalCenters.length > 0) {
    lines.push("");
    lines.push("\u274c  CRITICAL CENTERS (< 50% \u2014 escalate to RAOM):");
    lines.push(rep("\u2500", 80));
    lines.push(pad("Center", 38) + pad("Region", 18) + pad("Rate", 8) + "CH");
    lines.push(rep("\u2500", 80));
    criticalCenters.forEach(function(c) {
      lines.push(pad(c.center, 38) + pad(c.region, 18) + pad(c.pct + "%", 8) + c.ch);
    });
  }

  lines.push("");
  lines.push("FULL INACTIVE LIST (" + inactiveAll.length + " faculty):");
  lines.push(rep("\u2500", 100));
  lines.push(pad("Region", 18) + pad("Center", 32) + pad("Name", 26) + pad("Batch", 22) + "Last Seen");
  lines.push(rep("\u2500", 100));
  inactiveAll.forEach(function(f) {
    var seen = lastSeen[f.email] ? formatDate(lastSeen[f.email]) : "Never opened";
    lines.push(pad(f.region, 18) + pad(f.center, 32) + pad(f.name || f.email, 26) + pad(f.batch, 22) + seen);
  });

  lines.push("");
  lines.push("\u2014 PW Faculty Portal (automated weekly report, every Sunday 10am)");

  var subj = "PW Portal \u2014 Management Report \u2014 " + week + " (" + (total - opened) + "/" + total + " inactive)";
  sendEmail(toList, [], subj, lines.join("\n"));
  Logger.log("Boss report \u2192 " + toList.join(", "));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOrCreateLogSheet(ss) {
  var sheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET_NAME);
    sheet.appendRow(["timestamp","email","role","scope_value","event_type",
                     "pdf_name","batch","center","region","test_date"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function headerMap(headerRow) {
  var map = {};
  headerRow.forEach(function(h, i) {
    map[h.toString().trim().toLowerCase().replace(/\s+/g, "_")] = i;
  });
  return map;
}

function splitEmails(str) {
  if (!str) return [];
  return str.split(",")
    .map(function(e) { return e.trim().toLowerCase(); })
    .filter(function(e) { return e && e !== "-" && e.indexOf("@") !== -1; })
    .filter(function(e, i, arr) { return arr.indexOf(e) === i; });
}

function sendEmail(toList, ccList, subject, body) {
  if (!toList || toList.length === 0) return;
  var opts = {};
  if (ccList && ccList.length > 0) opts.cc = ccList.join(",");
  MailApp.sendEmail(toList.join(","), subject, body, opts);
}

function pad(str, width) {
  str = (str || "").toString();
  return str.length >= width ? str.slice(0, width - 2) + "  " : str + rep(" ", width - str.length);
}

function rep(char, n) {
  var s = ""; for (var i = 0; i < n; i++) s += char; return s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), "dd MMM yyyy");
}
