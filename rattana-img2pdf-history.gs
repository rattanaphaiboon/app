var FOLDER_NAME = 'Rattana Scanner Files';
var RETENTION_DAYS = 90;

function getOrCreateFolder_() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
}

var EXPECTED_HEADERS = ['timestamp', 'empId', 'name', 'filename', 'pages', 'sizeKB', 'fileId'];

function getOrCreateSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Sheet1');
  // Always force row 1 to exactly this header set, in this order — correct for a brand-new
  // sheet, an older sheet from before the fileId column existed, and a no-op if already right.
  var current = sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
  var matches = EXPECTED_HEADERS.every(function (h, i) { return current[i] === h; });
  if (!matches) sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).setValues([EXPECTED_HEADERS]);
  return sheet;
}

// Deletes rows (and their Drive files) older than RETENTION_DAYS. Runs opportunistically
// on every save so no separate time-driven trigger needs to be configured.
function cleanupOldEntries_(sheet) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var tsCol = headers.indexOf('timestamp');
  var fileIdCol = headers.indexOf('fileId');
  for (var i = values.length - 1; i >= 1; i--) {
    var ts = new Date(values[i][tsCol]);
    if (ts < cutoff) {
      var fid = values[i][fileIdCol];
      if (fid) { try { DriveApp.getFileById(fid).setTrashed(true); } catch (e) {} }
      sheet.deleteRow(i + 1);
    }
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_();
    var fileId = '';
    if (data.fileBase64) {
      var blob = Utilities.newBlob(Utilities.base64Decode(data.fileBase64), 'application/pdf', data.filename || 'scan.pdf');
      fileId = getOrCreateFolder_().createFile(blob).getId();
    }
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      String(data.empId || ''),
      data.name || '',
      data.filename || '',
      data.pages || '',
      data.sizeKB || '',
      fileId,
    ]);
    cleanupOldEntries_(sheet);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, fileId: fileId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET ?empId=123                          -> { ok:true, rows:[...] } (own history, newest first, max 30)
// GET ?action=file&fileId=X&empId=123     -> { ok:true, fileBase64, filename } only if that row's
//                                             own empId matches — one person's history never returns
//                                             another person's file, even if fileId is guessed.
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var sheet = getOrCreateSheet_();
    var values = sheet.getDataRange().getValues();
    var headers = values.shift() || [];

    if (params.action === 'file') {
      var fileId = params.fileId;
      var empId = (params.empId || '').toString();
      var empIdCol = headers.indexOf('empId'), fileIdCol = headers.indexOf('fileId'), filenameCol = headers.indexOf('filename');
      var row = values.find(function (r) { return String(r[fileIdCol]) === fileId; });
      if (!row || !fileId || String(row[empIdCol]) !== empId) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'not found or not authorized' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var file = DriveApp.getFileById(fileId);
      var base64 = Utilities.base64Encode(file.getBlob().getBytes());
      return ContentService.createTextOutput(JSON.stringify({ ok: true, fileBase64: base64, filename: row[filenameCol] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var empId2 = (params.empId || '').toString();
    var rows = values
      .map(function (row) {
        var obj = {};
        headers.forEach(function (h, i) { obj[h] = row[i]; });
        return obj;
      })
      .filter(function (r) { return !empId2 || String(r.empId) === empId2; })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
      .slice(0, 30);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
