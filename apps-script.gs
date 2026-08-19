// ══════════════════════════════════════════════════════════
//  Rattana Credit Day — Google Apps Script Backend
//  วิธีใช้:
//  1. เปิด script.google.com → New project
//  2. วางโค้ดนี้ทั้งหมด
//  3. Deploy → New deployment → Web app
//     Execute as: Me | Who has access: Anyone
//  4. Copy URL แล้วนำไปใส่ในไฟล์ rattana-credit-day.html
//     ที่บรรทัด: const GAS_URL = 'วาง URL ที่นี่';
// ══════════════════════════════════════════════════════════

const SHEET_ID       = '17RnooJDTVab8FlSddRK-9xGG4qmbHm2sRes47ZrAIgQ';
const REC_SHEET_NAME = 'Credit Day Records';
const FOLDER_NAME    = 'วันเครดิตร้านค้า';

const FOLDER_NAMES = { creditDoc: 'สำเนาหนังสือรับรองบริษัท', idCard: 'บัตรประชาชน', vat: 'ภพ.20', creditRequest: 'หนังสือขอเครดิต', other: 'อื่นๆ' };

// ชีต "ขอเครดิต" ที่ต้องการบันทึกเพิ่ม
const CREDIT_REQ_SHEET_ID   = '1FXaeYjYgZRv7D0aa2Qtrp0eiABVba3eC8H-LjvS0xSI';
const CREDIT_REQ_SHEET_NAME = 'ขอเครดิต';
const CUSTOMER_SHEET_NAME   = 'Customer detail';

// ── Entry point ──────────────────────────────────────────
function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'submitCredit') {
      output.setContent(JSON.stringify(submitCredit(data)));
    } else if (data.action === 'submitCreditBatch') {
      output.setContent(JSON.stringify(submitCreditBatch(data)));
    } else if (data.action === 'flagRecord') {
      output.setContent(JSON.stringify(flagRecord(data)));
    } else if (data.action === 'updateDocFiles') {
      output.setContent(JSON.stringify(updateDocFiles(data)));
    } else {
      output.setContent(JSON.stringify({ success: false, error: 'Unknown action' }));
    }
  } catch(err) {
    output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }
  return output;
}

// ── Get or create Drive folder ────────────────────────────
function getOrCreateFolder(parentFolder, name) {
  const it = parentFolder.getFoldersByName(name);
  return it.hasNext() ? it.next() : parentFolder.createFolder(name);
}

function getRootFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

// คืน folder สำหรับแต่ละประเภทเอกสาร
function getFolderForType(type, root) {
  return getOrCreateFolder(root, FOLDER_NAMES[type] || type);
}

// สร้าง label ชื่อไฟล์: "ชื่อร้านค้า วัน/เดือน/ปี"
function makeFileLabel(shopName, dateStr) {
  // dateStr คาดว่าเป็น yyyy-MM-dd
  let label = shopName;
  if (dateStr) {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) label += ' ' + parts[2] + '/' + parts[1] + '/' + parts[0];
    else label += ' ' + dateStr;
  }
  return label;
}

// ── Upload one file to Drive, return view URL ─────────────
function uploadFile(fileData, folder, label) {
  if (!fileData || !fileData.data) return '';
  try {
    const bytes = Utilities.base64Decode(fileData.data);
    const ext   = (fileData.name || '').split('.').pop();
    const name  = label ? (label + (ext ? '.' + ext : '')) : (fileData.name || 'file');
    const blob  = Utilities.newBlob(bytes, fileData.mimeType, name);
    const file  = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/file/d/' + file.getId() + '/view';
  } catch(e) {
    Logger.log('Upload error: ' + e);
    return '';
  }
}

// ── Upload array of files into a subfolder, return folder URL ──
function uploadFiles(filesArray, folder, label) {
  if (!filesArray || !filesArray.length) return '';
  if (filesArray.length === 1) return uploadFile(filesArray[0], folder, label);
  const sub = getOrCreateFolder(folder, label);
  sub.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  filesArray.forEach((f, i) => uploadFile(f, sub, 'หน้า' + (i+1)));
  return 'https://drive.google.com/drive/folders/' + sub.getId();
}

// ── Build a row array matched to the sheet's actual header ───
function buildRow(headers, map) {
  return headers.map(h => {
    const key = String(h).trim();
    return map.hasOwnProperty(key) ? map[key] : '';
  });
}

// ── Batch submit (upload files once, write N rows) ───────
function submitCreditBatch(data) {
  const shopNames  = data.shopNames || [data.shopName];
  const root       = getRootFolder();
  const dateStr    = data.creditDate || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const shopLabel  = shopNames.length === 1 ? shopNames[0] : shopNames.length + ' ร้าน';
  const fileLabel  = makeFileLabel(shopLabel, dateStr);

  const creditDocFiles = Array.isArray(data.files.creditDoc) ? data.files.creditDoc : (data.files.creditDoc ? [data.files.creditDoc] : []);
  const idCardFiles    = Array.isArray(data.files.idCard) ? data.files.idCard : (data.files.idCard ? [data.files.idCard] : []);
  const otherFiles     = Array.isArray(data.files.other)  ? data.files.other  : (data.files.other  ? [data.files.other]  : []);
  const creditDocUrl     = uploadFiles(creditDocFiles, getFolderForType('creditDoc',     root), fileLabel);
  const idCardUrl        = uploadFiles(idCardFiles,    getFolderForType('idCard',        root), fileLabel);
  const otherUrl         = uploadFiles(otherFiles,     getFolderForType('other',         root), fileLabel);
  const vatUrl           = uploadFile(data.files.vat,           getFolderForType('vat',           root), fileLabel);
  const creditRequestUrl = uploadFile(data.files.creditRequest, getFolderForType('creditRequest', root), fileLabel);

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(REC_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REC_SHEET_NAME);
    const headers = ['วันที่บันทึก','ชื่อร้านค้า','รหัสบีพลัส','วันที่ขอเครดิต','จำนวนวันเครดิต',
                     'วงเงิน (บาท)','หนังสือขอเครดิต','สำเนาหนังสือรับรองบริษัท','บัตรประชาชน','ภพ.20','อื่นๆ',
                     'หมายเหตุ','ผู้บันทึก (Email)','ชื่อผู้บันทึก','สถานะ'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setBackground('#0d1b3e').setFontColor('#c9a84c').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const today   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  shopNames.forEach(shopName => {
    const bplusCode = data.bplusCode || lookupBplus(ss, shopName);
    const map = {
      'วันที่บันทึก':      today,
      'ชื่อร้านค้า':       shopName,
      'รหัสบีพลัส':        bplusCode,
      'วันที่ขอเครดิต':    data.creditDate    || '',
      'จำนวนวันเครดิต':   data.creditDays    || '',
      'วงเงิน (บาท)':      data.creditAmount  || 0,
      'หนังสือขอเครดิต':            creditRequestUrl,
      'สำเนาหนังสือรับรองบริษัท':  creditDocUrl,
      'บัตรประชาชน':       idCardUrl,
      'ภพ.20':             vatUrl,
      'อื่นๆ':             otherUrl,
      'หมายเหตุ':          data.note          || '',
      'ผู้บันทึก (Email)': data.recordedBy    || '',
      'ชื่อผู้บันทึก':     data.recordedName  || '',
      'สถานะ':             'ถูกต้อง',
    };
    sheet.appendRow(buildRow(headers, map));
  });

  return { success: true, creditDocUrl, idCardUrl, vatUrl, creditRequestUrl, otherUrl };
}

// ── Main submit handler ───────────────────────────────────
function submitCredit(data) {
  const root      = getRootFolder();
  const dateStr   = data.creditDate || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const fileLabel = makeFileLabel(data.shopName, dateStr);

  const creditDocFiles = Array.isArray(data.files.creditDoc) ? data.files.creditDoc : (data.files.creditDoc ? [data.files.creditDoc] : []);
  const idCardFiles    = Array.isArray(data.files.idCard)    ? data.files.idCard    : (data.files.idCard    ? [data.files.idCard]    : []);
  const creditDocUrl     = uploadFiles(creditDocFiles, getFolderForType('creditDoc', root), fileLabel);
  const idCardUrl        = uploadFiles(idCardFiles,    getFolderForType('idCard',    root), fileLabel);
  const vatUrl           = uploadFile(data.files.vat,           getFolderForType('vat',           root), fileLabel);
  const creditRequestUrl = uploadFile(data.files.creditRequest, getFolderForType('creditRequest', root), fileLabel);
  const otherUrl         = uploadFile(data.files.other,         getFolderForType('other',         root), fileLabel);

  // เขียนลง Sheets
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(REC_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(REC_SHEET_NAME);
    // Header row
    const headers = ['วันที่บันทึก','ชื่อร้านค้า','วันที่ขอเครดิต','จำนวนวันเครดิต',
                     'วงเงิน (บาท)','เอกสารขอเครดิต','บัตรประชาชน','ภพ.20',
                     'หมายเหตุ','ผู้บันทึก (Email)','ชื่อผู้บันทึก','สถานะ'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setBackground('#0d1b3e').setFontColor('#c9a84c').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 110);
    sheet.setColumnWidth(6, 220);
    sheet.setColumnWidth(7, 220);
    sheet.setColumnWidth(8, 220);
  }

  const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const bplusCode = data.bplusCode || lookupBplus(ss, data.shopName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const map = {
    'วันที่บันทึก':      today,
    'ชื่อร้านค้า':       data.shopName,
    'รหัสบีพลัส':        bplusCode,
    'วันที่ขอเครดิต':    data.creditDate    || '',
    'จำนวนวันเครดิต':   data.creditDays    || '',
    'วงเงิน (บาท)':      data.creditAmount  || 0,
    'หนังสือขอเครดิต':           creditRequestUrl,
    'สำเนาหนังสือรับรองบริษัท': creditDocUrl,
    'บัตรประชาชน':               idCardUrl,
    'ภพ.20':                     vatUrl,
    'อื่นๆ':                     otherUrl,
    'หมายเหตุ':                  data.note          || '',
    'ผู้บันทึก (Email)':         data.recordedBy    || '',
    'ชื่อผู้บันทึก':             data.recordedName  || '',
    'สถานะ':                     'ถูกต้อง',
  };
  sheet.appendRow(buildRow(headers, map));

  return { success: true, creditDocUrl, idCardUrl, vatUrl };
}

// ── บันทึกลงชีต "ขอเครดิต" + lookup รหัส บีพลัส ────────────
function writeToCreditReqSheet(shopName) {
  const ss    = SpreadsheetApp.openById(CREDIT_REQ_SHEET_ID);
  let   sheet = ss.getSheetByName(CREDIT_REQ_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CREDIT_REQ_SHEET_NAME);
    const headers = ['วัน-เวลาที่ทำ', 'ชื่อร้านค้า', 'รหัส บีพลัส'];
    sheet.appendRow(headers);
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setBackground('#0d1b3e').setFontColor('#c9a84c').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // lookup รหัส บีพลัส จาก Customer detail
  const bplusCode = lookupBplus(ss, shopName);

  const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
  sheet.appendRow([timestamp, shopName, bplusCode]);
}

// ── Lookup รหัส บีพลัส จากชีต Customer detail ───────────────
function lookupBplus(ss, shopName) {
  const custSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  if (!custSheet) return '';

  const data    = custSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const shopCol  = headers.indexOf('AR_NAME');
  const bplusCol = headers.indexOf('รหัส บีพลัส');
  if (shopCol === -1 || bplusCol === -1) return '';

  const target = String(shopName).trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][shopCol]).trim().toLowerCase() === target) {
      return data[i][bplusCol] || '';
    }
  }
  return '';
}

// ── Flag / unflag a record ────────────────────────────────
function flagRecord(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REC_SHEET_NAME);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  const allVals = sheet.getDataRange().getValues();
  const headers = allVals[0];

  // ensure สถานะ column exists
  let statusCol = headers.indexOf('สถานะ');
  if (statusCol === -1) {
    statusCol = headers.length;
    sheet.getRange(1, statusCol + 1).setValue('สถานะ');
    sheet.getRange(1, statusCol + 1).setBackground('#0d1b3e').setFontColor('#c9a84c').setFontWeight('bold');
  }

  // find matching row by shopName + recordDate (handle Date object or string)
  function normDate(v) {
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
    const d = new Date(v);
    if (!isNaN(d.getTime())) return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
    return String(v || '').trim();
  }
  // ensure หมายเหตุ column exists (column L)
  let noteCol = headers.indexOf('หมายเหตุ');

  // ensure สถานะการรับเอกสาร column exists (column P)
  let receivedCol = headers.indexOf('สถานะการรับเอกสาร');
  if (receivedCol === -1) {
    receivedCol = headers.length;
    sheet.getRange(1, receivedCol + 1).setValue('สถานะการรับเอกสาร');
    sheet.getRange(1, receivedCol + 1).setBackground('#0d1b3e').setFontColor('#c9a84c').setFontWeight('bold');
  }

  const targetDate = normDate(data.recordDate || '');
  const targetShop = String(data.shopName || '').trim();
  for (let i = 1; i < allVals.length; i++) {
    if (normDate(allVals[i][0]) === targetDate &&
        String(allVals[i][1] || '').trim() === targetShop) {
      // เขียนสถานะ
      sheet.getRange(i + 1, statusCol + 1).setValue(data.status || '');
      // เขียน note ลง column หมายเหตุ (ถ้ามี)
      if (noteCol !== -1 && data.note) {
        sheet.getRange(i + 1, noteCol + 1).setValue(data.note);
      }
      // เขียน "รับแล้ว" ลง column สถานะการรับเอกสาร (ถ้า status = ถูกต้อง)
      if (data.receivedDate) {
        sheet.getRange(i + 1, receivedCol + 1).setValue('รับแล้ว');
      }
      return { success: true };
    }
  }
  return { success: false, error: 'Record not found: ' + targetDate + ' / ' + targetShop };
}

// ── Re-upload doc files for a flagged record ─────────────
function updateDocFiles(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REC_SHEET_NAME);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  const allVals = sheet.getDataRange().getValues();
  const headers = allVals[0].map(h => String(h).trim());

  let rowIndex = -1;
  for (let i = 1; i < allVals.length; i++) {
    if (String(allVals[i][1]) === String(data.shopName) &&
        String(allVals[i][0]) === String(data.recordDate)) {
      rowIndex = i; break;
    }
  }
  if (rowIndex === -1) return { success: false, error: 'Record not found' };

  const root      = getRootFolder();
  const fileLabel = makeFileLabel(data.shopName, data.recordDate) + ' (แก้ไข)';
  const colMap    = { creditDoc: 'สำเนาหนังสือรับรองบริษัท', idCard: 'บัตรประชาชน', vat: 'ภพ.20' };

  const result = {};
  Object.entries(data.files || {}).forEach(([key, fileData]) => {
    const folder = getFolderForType(key, root);
    let url;
    if (Array.isArray(fileData)) {
      const urls = fileData.map((fd, i) => uploadFile(fd, folder, fileLabel + (fileData.length > 1 ? ` (${i+1})` : ''))).filter(Boolean);
      url = urls.join(', ');
    } else {
      url = uploadFile(fileData, folder, fileLabel);
    }
    if (url) {
      result[key + 'Url'] = url;
      const col = headers.indexOf(colMap[key]);
      if (col !== -1) sheet.getRange(rowIndex + 1, col + 1).setValue(url);
    }
  });

  return { success: true, ...result };
}

// ── Backfill สถานะ "ถูกต้อง" ให้ทุก row ที่ยังว่างอยู่ ────
function backfillStatus() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REC_SHEET_NAME);
  if (!sheet) { Logger.log('ไม่พบชีต: ' + REC_SHEET_NAME); return; }

  const allVals = sheet.getDataRange().getValues();
  const headers = allVals[0].map(h => String(h).trim());

  // หาคอลัมน์ สถานะ — ถ้าไม่มีให้สร้างใหม่
  let statusCol = headers.indexOf('สถานะ');
  if (statusCol === -1) {
    statusCol = headers.length;
    sheet.getRange(1, statusCol + 1).setValue('สถานะ');
    sheet.getRange(1, statusCol + 1)
         .setBackground('#0d1b3e').setFontColor('#c9a84c').setFontWeight('bold');
    Logger.log('สร้างคอลัมน์ สถานะ ที่คอลัมน์ ' + (statusCol + 1));
  }

  let filled = 0;
  for (let i = 1; i < allVals.length; i++) {
    const current = String(allVals[i][statusCol] || '').trim();
    if (!current) {
      sheet.getRange(i + 1, statusCol + 1).setValue('ถูกต้อง');
      filled++;
    }
  }
  Logger.log('เติม "ถูกต้อง" ให้ ' + filled + ' แถว (ข้ามแถวที่มีค่าอยู่แล้ว)');
}

// ── Test (รันใน Apps Script Editor เพื่อทดสอบ) ──────────
function testSetup() {
  Logger.log('✓ Script ready. SHEET_ID = ' + SHEET_ID);
  Logger.log('✓ Root folder: ' + getRootFolder().getName());
}
