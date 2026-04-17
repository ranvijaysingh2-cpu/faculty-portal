/**
 * Physics Wallah — Drive → Sheets PDF Indexer
 *
 * Walks the Drive folder structure:
 *   Result 25_26 Pdfs / Region / Center / Batch / TestDate / *.pdf
 *
 * Writes/overwrites the "pdf_index" sheet with columns:
 *   region | center | batch | test_date | pdf_name | gdrive_link
 *
 * Setup:
 *  1. Open the Google Sheet that will hold pdf_index data.
 *  2. Tools > Script editor > paste this file.
 *  3. Set ROOT_FOLDER_NAME to the exact name of your top-level Drive folder.
 *  4. Run indexPdfs() once manually, approve permissions.
 *  5. Set a time-driven trigger: Triggers > Add Trigger > indexPdfs > Weekly.
 */

var ROOT_FOLDER_NAME = "Result 25_26 Pdfs";
var SHEET_NAME = "pdf_index";

function indexPdfs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  } else {
    sheet.clearContents();
  }

  // Header row
  sheet.appendRow(["region", "center", "batch", "test_date", "pdf_name", "gdrive_link"]);

  var rows = [];
  var rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);

  if (!rootFolders.hasNext()) {
    Logger.log("ERROR: Root folder not found: " + ROOT_FOLDER_NAME);
    return;
  }

  var rootFolder = rootFolders.next();

  // Region level
  var regionIter = rootFolder.getFolders();
  while (regionIter.hasNext()) {
    var regionFolder = regionIter.next();
    var region = regionFolder.getName();

    // Center level
    var centerIter = regionFolder.getFolders();
    while (centerIter.hasNext()) {
      var centerFolder = centerIter.next();
      var center = centerFolder.getName();

      // Batch level
      var batchIter = centerFolder.getFolders();
      while (batchIter.hasNext()) {
        var batchFolder = batchIter.next();
        var batch = batchFolder.getName();

        // TestDate level
        var dateIter = batchFolder.getFolders();
        while (dateIter.hasNext()) {
          var dateFolder = dateIter.next();
          var testDate = dateFolder.getName();

          // PDFs
          var fileIter = dateFolder.getFilesByMimeType(MimeType.PDF);
          while (fileIter.hasNext()) {
            var file = fileIter.next();
            rows.push([
              region,
              center,
              batch,
              testDate,
              file.getName(),
              file.getUrl(),
            ]);
          }
        }
      }
    }
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }

  // Update last-synced cell in a separate sheet tab for reference
  var metaSheet = ss.getSheetByName("meta");
  if (!metaSheet) metaSheet = ss.insertSheet("meta");
  metaSheet.getRange("A1").setValue("last_indexed");
  metaSheet.getRange("B1").setValue(new Date().toISOString());

  Logger.log("Indexed " + rows.length + " PDFs across " + getUniqueCount(rows, 0) + " regions.");
}

function getUniqueCount(rows, colIndex) {
  var seen = {};
  rows.forEach(function(r) { seen[r[colIndex]] = true; });
  return Object.keys(seen).length;
}
