function getOrCreateSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Sheet1');
    sheet.appendRow(['timestamp', 'empId', 'name', 'filename', 'pages', 'sizeKB']);
  }
  return sheet;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_();
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      String(data.empId || ''),
      data.name || '',
      data.filename || '',
      data.pages || '',
      data.sizeKB || '',
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET ?empId=123 -> { ok:true, rows:[...] } most-recent-first, capped at 30.
// No spreadsheet ID needed — the script already knows its own bound sheet.
function doGet(e) {
  try {
    var empId = (e.parameter && e.parameter.empId || '').toString();
    var values = getOrCreateSheet_().getDataRange().getValues();
    var headers = values.shift() || [];
    var rows = values
      .map(function (row) {
        var obj = {};
        headers.forEach(function (h, i) { obj[h] = row[i]; });
        return obj;
      })
      .filter(function (r) { return !empId || String(r.empId) === empId; })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
      .slice(0, 30);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
