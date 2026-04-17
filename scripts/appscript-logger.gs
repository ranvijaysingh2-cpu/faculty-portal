/**
 * PW Faculty Portal — Activity Logger (Apps Script Web App)
 *
 * This script acts as a logging endpoint. The Next.js app POSTs events here.
 * Events are appended to the "activity_log" sheet in this spreadsheet.
 *
 * SETUP:
 *  1. Open (or create) a Google Sheet — can be the same sheet as pdf_index.
 *  2. Extensions > Apps Script > paste this file.
 *  3. Deploy > New deployment > Type: Web App
 *     - Execute as: Me
 *     - Who has access: Anyone  ← required so the app can POST without OAuth
 *  4. Copy the Web App URL → add to Vercel as ACTIVITY_LOG_URL env var.
 *  5. For the weekly inactivity email:
 *     - Triggers (clock icon) > Add Trigger
 *     - Function: sendInactivityReport | Time-driven | Week timer | Monday 8am
 *     - Set MANAGEMENT_EMAIL in Script Properties (gear icon > Script properties)
 */

var LOG_SHEET_NAME     = "activity_log";
var USER_SHEET_NAME    = "user_access";

// Set this in Apps Script > Project Settings > Script Properties
// Key: LOG_SECRET  Value: (same value as LOG_SECRET in your .env.local / Vercel env)
var LOG_SECRET_PROP    = "LOG_SECRET";

// ── Web App endpoint ─────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var expectedSecret = PropertiesService.getScriptProperties().getProperty(LOG_SECRET_PROP);
    if (expectedSecret && data._secret !== expectedSecret) {
      return json({ error: "Forbidden" });
    }
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateLogSheet(ss);

    sheet.appendRow([
      data.timestamp  || new Date().toISOString(),
      data.email      || "",
      data.role       || "",
      data.scope_value || "",
      data.event_type || "",
      data.pdf_name   || "",
      data.batch      || "",
      data.center     || "",
      data.region     || "",
      data.test_date  || "",
    ]);

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message });
  }
}

// Needed so the Web App responds to preflight / health checks
function doGet() {
  return json({ status: "ok" });
}

// ── Weekly inactivity report ─────────────────────────────────────────────────

function sendInactivityReport() {
  var props           = PropertiesService.getScriptProperties();
  var managementEmail = props.getProperty("MANAGEMENT_EMAIL");
  if (!managementEmail) {
    Logger.log("Set MANAGEMENT_EMAIL in Script Properties first.");
    return;
  }

  var ss          = SpreadsheetApp.getActiveSpreadsheet();
  var userSheet   = ss.getSheetByName(USER_SHEET_NAME);
  var logSheet    = ss.getSheetByName(LOG_SHEET_NAME);

  if (!userSheet || !logSheet) {
    Logger.log("Missing sheet: " + USER_SHEET_NAME + " or " + LOG_SHEET_NAME);
    return;
  }

  // All users from user_access sheet
  var userRows   = userSheet.getDataRange().getValues();
  var userHeader = userRows[0].map(function(h) { return h.toString().trim().toLowerCase(); });
  var emailCol   = userHeader.indexOf("email");
  var roleCol    = userHeader.indexOf("role");
  var scopeCol   = userHeader.indexOf("scope_value");

  var allUsers = userRows.slice(1).map(function(r) {
    return {
      email:      r[emailCol].toString().trim().toLowerCase(),
      role:       r[roleCol].toString().trim(),
      scope:      r[scopeCol].toString().trim(),
    };
  }).filter(function(u) { return u.email; });

  // Activity in last 7 days
  var cutoff    = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  var logRows   = logSheet.getDataRange().getValues();
  var logHeader = logRows[0].map(function(h) { return h.toString().trim().toLowerCase(); });
  var tsCol     = logHeader.indexOf("timestamp");
  var actEmailCol = logHeader.indexOf("email");

  var activeEmails = {};
  logRows.slice(1).forEach(function(r) {
    var ts = new Date(r[tsCol]);
    if (ts >= cutoff) {
      activeEmails[r[actEmailCol].toString().trim().toLowerCase()] = ts;
    }
  });

  // Last seen for each user (any time, not just last 7 days)
  var lastSeen = {};
  logRows.slice(1).forEach(function(r) {
    var email = r[actEmailCol].toString().trim().toLowerCase();
    var ts    = new Date(r[tsCol]);
    if (!lastSeen[email] || ts > lastSeen[email]) {
      lastSeen[email] = ts;
    }
  });

  var inactive = allUsers.filter(function(u) { return !activeEmails[u.email]; });
  var active   = allUsers.filter(function(u) { return  activeEmails[u.email]; });

  if (inactive.length === 0) {
    Logger.log("All users active this week — no email sent.");
    return;
  }

  // Build email
  var lines = [];
  lines.push("Hi,");
  lines.push("");
  lines.push("Weekly PW Faculty Portal usage report (" + formatDate(cutoff) + " – " + formatDate(new Date()) + "):");
  lines.push("");
  lines.push("✅ Active this week: " + active.length + " users");
  lines.push("❌ NOT opened portal this week: " + inactive.length + " users");
  lines.push("");
  lines.push("─────────────────────────────────────────");
  lines.push("INACTIVE USERS (please follow up / send reminder email):");
  lines.push("─────────────────────────────────────────");

  inactive.forEach(function(u) {
    var seen = lastSeen[u.email]
      ? "last seen " + formatDate(lastSeen[u.email])
      : "never opened";
    lines.push("• " + u.email + "  [" + u.role + " — " + u.scope + "]  (" + seen + ")");
  });

  lines.push("");
  lines.push("─────────────────────────────────────────");
  lines.push("ACTIVE USERS:");
  lines.push("─────────────────────────────────────────");
  active.forEach(function(u) {
    var ts = activeEmails[u.email];
    lines.push("• " + u.email + "  [" + u.role + "]  (last seen " + formatDate(ts) + ")");
  });

  lines.push("");
  lines.push("— PW Faculty Portal (automated report)");

  MailApp.sendEmail(
    managementEmail,
    "PW Portal — Weekly Usage Report (" + inactive.length + " inactive)",
    lines.join("\n")
  );

  Logger.log("Report sent to " + managementEmail);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateLogSheet(ss) {
  var sheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET_NAME);
    sheet.appendRow([
      "timestamp", "email", "role", "scope_value",
      "event_type", "pdf_name", "batch", "center", "region", "test_date"
    ]);
    // Freeze header row
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), "dd MMM yyyy");
}
