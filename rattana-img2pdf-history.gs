// Rattana Scanner — หลังบ้านประวัติการสแกน + เก็บไฟล์ใน Google Drive
// deploy: Deploy → Manage deployments → ✏️ → Version: New version → Deploy
//         (Execute as: Me / Who has access: Anyone)
//
// เช็กว่า deploy เวอร์ชันใหม่แล้วจริงไหม: เปิด URL ต่อท้าย ?action=ping
//   ต้องเห็น {"ok":true,"version":"4.0", ...} ถ้าเห็นเวอร์ชันเก่า/ไม่มี version = ยัง deploy ไม่ติด

var VERSION = '4.2';
var FOLDER_NAME = 'Rattana Scanner Files';
var RETENTION_DAYS = 90;
var SHEET_NAME = 'Sheet1';

// ตำแหน่งคอลัมน์ตายตัว (1-based) — ไม่อ่านจากหัวตารางอีกแล้ว
// เดิมโค้ดใช้ headers.indexOf('fileId') ซึ่งพังถ้าหัวตารางคอลัมน์ G ว่าง/เพี้ยน
// ทำให้ปุ่มดาวน์โหลดในประวัติใช้ไม่ได้ทั้งที่ไฟล์อยู่ใน Drive ครบ
var C_TIMESTAMP = 1, C_EMPID = 2, C_NAME = 3, C_FILENAME = 4, C_PAGES = 5, C_SIZEKB = 6, C_FILEID = 7, C_TYPE = 8;
var N_COLS = 8;
var HEADERS = ['timestamp', 'empId', 'name', 'filename', 'pages', 'sizeKB', 'fileId', 'type'];

function json_(obj) {
  obj.version = VERSION;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder_() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  // เขียนหัวตารางไว้ให้คนอ่านเข้าใจ — โค้ดไม่ได้พึ่งค่านี้แล้ว
  var current = sheet.getRange(1, 1, 1, N_COLS).getValues()[0];
  var same = HEADERS.every(function (h, i) { return current[i] === h; });
  if (!same) sheet.getRange(1, 1, 1, N_COLS).setValues([HEADERS]);
  return sheet;
}

// อ่านทุกแถวข้อมูล (ไม่รวมหัวตาราง) เป็น array ความกว้างคงที่เสมอ
function readRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, N_COLS).getValues();
}

function rowToObj_(r) {
  return {
    timestamp: r[C_TIMESTAMP - 1] instanceof Date ? r[C_TIMESTAMP - 1].toISOString() : String(r[C_TIMESTAMP - 1] || ''),
    empId: String(r[C_EMPID - 1] || ''),
    name: String(r[C_NAME - 1] || ''),
    filename: String(r[C_FILENAME - 1] || ''),
    pages: r[C_PAGES - 1],
    sizeKB: r[C_SIZEKB - 1],
    fileId: String(r[C_FILEID - 1] || ''),
    type: String(r[C_TYPE - 1] || ''),   // หมวดงานที่สร้างไฟล์นี้ (scan / merge / split / watermark)
  };
}

// ลบแถว (พร้อมไฟล์ใน Drive) ที่เก่ากว่า RETENTION_DAYS — เรียกทุกครั้งที่บันทึก
// จะได้ไม่ต้องตั้ง time-driven trigger แยก
function cleanupOldEntries_(sheet) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  var rows = readRows_(sheet);
  for (var i = rows.length - 1; i >= 0; i--) {
    var ts = new Date(rows[i][C_TIMESTAMP - 1]);
    if (!isNaN(ts.getTime()) && ts < cutoff) {
      var fid = rows[i][C_FILEID - 1];
      if (fid) { try { DriveApp.getFileById(String(fid)).setTrashed(true); } catch (e) {} }
      sheet.deleteRow(i + 2); // +2 = ข้ามหัวตาราง + index 0-based
    }
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // ลบรายการเดียวออกจากประวัติ (เจ้าของเท่านั้น)
    if (data.action === 'delete') {
      var sheetD = getSheet_();
      var rowsD = readRows_(sheetD);
      var wantId = String(data.fileId || '');
      var owner = String(data.empId || '');
      for (var i = 0; i < rowsD.length; i++) {
        if (String(rowsD[i][C_FILEID - 1]) === wantId && wantId) {
          if (String(rowsD[i][C_EMPID - 1]) !== owner) return json_({ ok: false, error: 'not authorized' });
          try { DriveApp.getFileById(wantId).setTrashed(true); } catch (err2) {}
          sheetD.deleteRow(i + 2);
          return json_({ ok: true, deleted: wantId });
        }
      }
      return json_({ ok: false, error: 'not found' });
    }

    var sheet = getSheet_();
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
      String(data.type || ''),
    ]);
    cleanupOldEntries_(sheet);
    return json_({ ok: true, fileId: fileId });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// GET ?action=ping                        -> เช็กว่า deploy เวอร์ชันไหนอยู่
// GET ?empId=123                          -> { ok:true, rows:[...] } ประวัติของตัวเอง ใหม่สุดก่อน สูงสุด 30
// GET ?action=file&fileId=X&empId=123     -> { ok:true, fileBase64, filename } เฉพาะเมื่อ empId ตรงกับเจ้าของแถวนั้น
//                                            ของคนอื่นดึงไม่ได้แม้จะเดา fileId ถูก
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};

    if (params.action === 'ping') {
      var sheetP = getSheet_();
      return json_({ ok: true, rowCount: Math.max(0, sheetP.getLastRow() - 1), lastColumn: sheetP.getLastColumn() });
    }

    var sheet = getSheet_();
    var rows = readRows_(sheet);

    if (params.action === 'file') {
      var fileId = String(params.fileId || '');
      var empId = String(params.empId || '');
      var hit = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][C_FILEID - 1]) === fileId && fileId) { hit = rows[i]; break; }
      }
      if (!hit || String(hit[C_EMPID - 1]) !== empId) return json_({ ok: false, error: 'not found or not authorized' });
      var file = DriveApp.getFileById(fileId);
      return json_({ ok: true, fileBase64: Utilities.base64Encode(file.getBlob().getBytes()), filename: String(hit[C_FILENAME - 1] || 'scan.pdf') });
    }

    var empId2 = String(params.empId || '');
    var out = rows
      .map(rowToObj_)
      .filter(function (r) { return !empId2 || r.empId === empId2; })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
      .slice(0, 30);
    return json_({ ok: true, rows: out });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
