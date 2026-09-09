function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Sheet1');
      sheet.appendRow(['timestamp', 'empId', 'name', 'filename', 'pages', 'sizeKB']);
    }
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

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Rattana Image to PDF history logger is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
