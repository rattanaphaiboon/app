/*** Check Out App — Backend GAS (แยกออกจาก Pre-order Picker)
 * ─────────────────────────────────────────────────────────────────────────────
 * สคริปต์นี้รับใช้แอป rattana-check-out.html ตัวเดียว · เขียน/อ่าน 5 แท็บในไฟล์ของตัวเอง
 *   ยิงเช็คออก · ยิงเช็คใบเตรียม · ยิงโอนย้าย · ตารางแบ่งของ · โอนย้ายสร้างเอง
 *
 * ทำไมแยก: เดิมทั้ง 5 แท็บอยู่ไฟล์ "Import Pre-order picker claude" ปนกับงานของ Picker
 *   (รวม ~19,700 แถว · ยิงเช็คออกตัวเดียว 11,430) และใช้ GAS ตัวเดียวกัน
 *   → แก้อะไรทีต้องระวังพังข้ามแอป · แยกไฟล์+แยกสคริปต์แล้วต่างคนต่างอยู่
 *
 * ⚠️ ของที่ลอกมาจาก Picker GAS (gas-v26) แบบ "เหมือนเดิมเป๊ะ" — ห้ามปรับให้สวยขึ้น
 *    เพราะพฤติกรรมพวกนี้ผ่านงานจริงมาแล้วและแอปพึ่งพามันอยู่:
 *      · saveTransfer_ = merge รายเครื่อง (device-scoped) ไม่ใช่เขียนทับทั้งแท็บ
 *      · ทุกช่องเป็น TEXT (setNumberFormat '@') — ไม่งั้นบาร์โค้ด 0 นำหน้าหาย / วันที่กลายเป็น Date
 *      · auto-prune แถวเก่ากว่า TF_KEEP_DAYS วัน
 *      · LockService กันหลายเครื่องเขียนชนกัน
 *
 * Deploy: 💾 บันทึก → การทำให้ใช้งานได้ → การทำให้ใช้งานได้ใหม่ → ประเภท: เว็บแอป
 *   · ดำเนินการในชื่อ: ฉัน        · ผู้มีสิทธิ์เข้าถึง: ทุกคน
 *   → ก๊อป URL /exec มาใส่ CONFIG.gasUrl ในแอป Check Out
 *   → เปิด /exec ต้องเห็น {"ok":true,"app":"Check Out App","version":"co-gas-v1",...}
 ***/

var TARGET_SHEET_ID = '1sOB-ZemPeWqLxsK3dQuacZHgDTvYF52NwaLHGTE8NSw';   // "Check Out — ยิงเช็คออก" (ไฟล์ของแอปนี้)
var OLD_SHEET_ID    = '1_EXR_c5qYkjILICpYyOfB48vz_CQGuQ5hjlfze84Y0g';   // ไฟล์เดิมของ Picker — ใช้แค่ตอน migrate ครั้งเดียว

var VERSION = 'co-gas-v2';   // co-gas-v2: ลำดับแถวในชีท = ลำดับที่กดส่งครั้งแรก (เดิมบล็อกของคนที่เพิ่งส่งเด้งไปท้ายสุดทุกครั้ง ลำดับไม่นิ่ง) — ไว้ไล่เทียบกับที่เด้ง Discord · co-gas-v1: แยกหลังบ้านของ Check Out ออกมาเป็นโปรเจกต์ของตัวเอง · ลอก saveTransfer_/readTransfer_/clearTransfer_/saveManualTransfer_/readManualTransfer_/clearManualTransfer_/writeTab_ มาจาก Picker gas-v26 แบบไม่แก้พฤติกรรม · เปลี่ยนแค่ไฟล์ปลายทาง

var CO_TABS = ['ยิงเช็คออก', 'ยิงเช็คใบเตรียม', 'ยิงโอนย้าย', 'ตารางแบ่งของ', 'โอนย้ายสร้างเอง'];   // แท็บที่แอปนี้ดูแล (ใช้ตอน migrate/ping)

var TF_SYNC_HEADER = ['วันที่','คลัง','บาร์โค้ด','สินค้า','หน่วย','ต้องโอน','โอนได้','ขาด','ร้าน/เซล (จัดให้)','จัดให้(json)','ชื่อผู้โอน','วันที่โอน','เวลาโอน','เครื่อง','ยิงแล้ว(EA)','ยิงแยกหน่วย'];
var MTF_HEADER     = ['วันที่','ต้นทาง','ปลายทาง','บาร์โค้ด','สินค้า','หน่วย','จำนวน','ผู้สร้าง','เวลา'];
var TF_KEEP_DAYS   = 14;   // auto-prune ตอน save: แถว (col0 วันที่) เก่ากว่านี้ ตัดทิ้ง — กันชีทบวมถ้าลืมกดลบ

function doGet(e) {
  return jsonOut({ ok: true, app: 'Check Out App', version: VERSION, msg: 'GAS ready',
    sheetId: TARGET_SHEET_ID, tabs: CO_TABS, time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'saveTransfer')        return saveTransfer_(data);          // เขียนของยิง (merge เฉพาะแถวของเครื่องนั้น)
    if (data.action === 'readTransfer')        return readTransfer_(data);          // อ่านของยิงทุกเครื่อง (วัน/คลัง)
    if (data.action === 'clearTransfer')       return clearTransfer_(data);         // ลบของยิง วัน/คลัง (ใส่ by = เฉพาะคนนั้น)
    if (data.action === 'saveManualTransfer')  return saveManualTransfer_(data);    // เขียนทับแท็บ "โอนย้ายสร้างเอง"
    if (data.action === 'readManualTransfer')  return readManualTransfer_(data);    // อ่านแท็บ "โอนย้ายสร้างเอง" ทั้งแท็บ
    if (data.action === 'clearManualTransfer') return clearManualTransfer_(data);   // ล้างแท็บ "โอนย้ายสร้างเอง"
    return jsonOut({ ok: false, error: 'unknown action: ' + data.action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* payload: {action:'saveTransfer', tab, header, rows, date, wh, device}
 * เก็บแถวเครื่องอื่นไว้ · แทนที่เฉพาะแถวของ "เครื่องนี้ (device)" ที่ วัน/คลัง เดียวกัน
 * ทิ้งแถวเก่าที่ไม่มี device · TEXT ทุกช่อง · lock กันชน */
function saveTransfer_(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return jsonOut({ ok: false, error: 'busy — ลองใหม่' }); }
  try {
    var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
    var tab = data.tab || 'ยิงโอนย้าย';
    var header = data.header || TF_SYNC_HEADER;
    var nCol = header.length;
    var date = String(data.date || ''), wh = String(data.wh || ''), dev = String(data.device || '');
    var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
    var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
    var cutoff = Utilities.formatDate(new Date(Date.now() - TF_KEEP_DAYS * 86400000), 'Asia/Bangkok', 'yyyy-MM-dd');
    var kept = [], pruned = 0, at = -1;   /* at = ตำแหน่งที่บล็อกของเครื่องนี้เคยอยู่ (co-gas-v2) */
    if (lr >= 2 && dev && lc > 0) {
      var vals = sheet.getRange(2, 1, lr - 1, lc).getValues();
      for (var i = 0; i < vals.length; i++) {
        var r = vals[i], rd = (lc > 13) ? String(r[13] == null ? '' : r[13]).trim() : '';
        if (!rd) continue;                                                        // แถวเก่าไม่มี device → ทิ้ง
        var rdate = String(r[0] == null ? '' : r[0]).trim();
        if (rdate && rdate < cutoff) { pruned++; continue; }                      // auto-prune เกิน TF_KEEP_DAYS วัน
        if (rdate === date && String(r[1]) === wh && rd === dev) { if (at < 0) at = kept.length; continue; }   // แถวเครื่องนี้ (วัน/คลังนี้) → จะแทนที่ "ที่ตำแหน่งเดิม"
        var o = []; for (var c = 0; c < nCol; c++) o.push(r[c] == null ? '' : String(r[c])); kept.push(o);
      }
    }
    var incoming = (data.rows || []).map(function (r) { var o = []; for (var c = 0; c < nCol; c++) o.push(r[c] == null ? '' : String(r[c])); return o; });
    /* ═══ co-gas-v2: ลำดับในชีท = ลำดับที่ "กดส่งครั้งแรก" ═══
       เดิม kept.concat(incoming) = บล็อกของเครื่องที่เพิ่งส่ง เด้งไปต่อท้ายสุดทุกครั้ง
       → คนส่งก่อนถูกดันขึ้นไปเรื่อย ๆ ลำดับไม่นิ่ง ไล่เทียบกับที่เด้ง Discord ไม่ได้
       ใหม่: เคยส่งแล้ว = เขียนทับ "ที่เดิม" (at) · ยังไม่เคยส่ง = ต่อท้าย (คนมาทีหลังอยู่ล่าง) */
    var all = (at >= 0) ? kept.slice(0, at).concat(incoming, kept.slice(at)) : kept.concat(incoming);
    sheet.clearContents();
    sheet.getRange(1, 1, sheet.getMaxRows(), nCol).setNumberFormat('@');
    sheet.getRange(1, 1, 1, nCol).setValues([header.map(String)]);
    if (all.length) { var rng = sheet.getRange(2, 1, all.length, nCol); rng.setValues(all); try { rng.setNumberFormat('@'); rng.setValues(all); } catch (e2) {} }
    return jsonOut({ ok: true, saved: incoming.length, total: all.length, pruned: pruned });
  } finally { lock.releaseLock(); }
}

/* payload: {action:'readTransfer', tab, date, wh} → {rows:[{barcode,product,unit,demandQty,qty,ea,alloc,by,ts,device,bv,shop}]} */
function readTransfer_(data) {
  var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  var sheet = ss.getSheetByName(data.tab || 'ยิงโอนย้าย');
  if (!sheet) return jsonOut({ ok: true, rows: [] });
  var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
  if (lr < 2 || lc < 3) return jsonOut({ ok: true, rows: [] });
  var vals = sheet.getRange(2, 1, lr - 1, lc).getValues();
  var date = String(data.date || ''), wh = String(data.wh || ''), out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (date && String(r[0]) !== date) continue;
    if (wh && String(r[1]) !== wh) continue;
    out.push({ barcode: String(r[2] || ''), product: String(r[3] || ''), unit: String(r[4] || ''),
      demandQty: String(r[5] || ''), qty: String(r[6] || ''),
      ea: (lc > 14 ? String(r[14] || '') : ''),      // ยอดยิงรวมทุกหน่วย (EA) · ว่าง = แถวเก่า ผู้อ่าน fallback qty × EA/หน่วย
      alloc: (lc > 9 ? String(r[9] || '') : ''), by: (lc > 10 ? String(r[10] || '') : ''),
      ts: ((lc > 11 ? String(r[11] || '') : '') + ' ' + (lc > 12 ? String(r[12] || '') : '')).trim(),
      device: (lc > 13 ? String(r[13] || '') : ''),
      bv:   (lc > 16 ? String(r[16] || '') : ''),    // เลขที่ใบจอง
      shop: (lc > 17 ? String(r[17] || '') : '') }); // ชื่อร้าน
  }
  return jsonOut({ ok: true, rows: out, version: VERSION });
}

/* payload: {action:'clearTransfer', tab, date, wh, by} — ลบแถวของ วัน+คลัง · by ใส่ = ลบเฉพาะของคนนั้น */
function clearTransfer_(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return jsonOut({ ok: false, error: 'busy — ลองใหม่' }); }
  try {
    var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
    var sheet = ss.getSheetByName(String(data.tab || 'ยิงเช็คออก'));
    if (!sheet) return jsonOut({ ok: true, removed: 0, left: 0 });
    var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
    if (lr < 2 || lc < 2) return jsonOut({ ok: true, removed: 0, left: 0 });
    var date = String(data.date || ''), wh = String(data.wh || ''), byF = String(data.by || '').trim();
    var vals = sheet.getRange(2, 1, lr - 1, lc).getValues();
    var kept = [], removed = 0;
    for (var i = 0; i < vals.length; i++) {
      var r = vals[i];
      var hitBy = !byF || (lc > 10 && String(r[10] == null ? '' : r[10]).trim() === byF);
      if ((!date || String(r[0]) === date) && (!wh || String(r[1]) === wh) && hitBy) { removed++; continue; }
      var o = []; for (var c = 0; c < lc; c++) o.push(r[c] == null ? '' : String(r[c])); kept.push(o);
    }
    sheet.getRange(2, 1, lr - 1, lc).clearContent();
    if (kept.length) { var rng = sheet.getRange(2, 1, kept.length, lc); rng.setNumberFormat('@'); rng.setValues(kept); }
    return jsonOut({ ok: true, removed: removed, left: kept.length });
  } finally { lock.releaseLock(); }
}

/* payload: {action:'saveManualTransfer', tab, header, rows} — เขียนทับทั้งแท็บ (แอปถือ source of truth · draft ใบเดียว) */
function saveManualTransfer_(data) {
  var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  var n = writeTab_(ss, data.tab || 'โอนย้ายสร้างเอง', data.header || MTF_HEADER, data.rows || []);
  return jsonOut({ ok: true, saved: n });
}

/* payload: {action:'readManualTransfer', tab} — คืนทั้งแท็บ "โอนย้ายสร้างเอง" */
function readManualTransfer_(data) {
  var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  var sheet = ss.getSheetByName(String(data.tab || 'โอนย้ายสร้างเอง'));
  if (!sheet) return jsonOut({ ok: true, rows: [] });
  var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
  if (lr < 2 || lc < 4) return jsonOut({ ok: true, rows: [] });
  var vals = sheet.getRange(2, 1, lr - 1, lc).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i], bc = String(r[3] == null ? '' : r[3]).trim();
    if (!bc) continue;
    out.push({ date: String(r[0] || ''), from: String(r[1] || ''), to: String(r[2] || ''), barcode: bc,
      product: String(r[4] || ''), unit: String(r[5] || ''), qty: String(r[6] || ''),
      by: (lc > 7 ? String(r[7] || '') : ''), ts: (lc > 8 ? String(r[8] || '') : '') });
  }
  return jsonOut({ ok: true, rows: out, version: VERSION });
}

/* payload: {action:'clearManualTransfer', tab} — ล้างแท็บ (เหลือแต่หัวตาราง) */
function clearManualTransfer_(data) {
  var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  writeTab_(ss, data.tab || 'โอนย้ายสร้างเอง', MTF_HEADER, []);
  return jsonOut({ ok: true, cleared: true });
}

/* overwrite tab ใดก็ได้ · TEXT ทุกคอลัมน์ */
function writeTab_(ss, tabName, header, rows) {
  var sheet = ss.getSheetByName(String(tabName)) || ss.insertSheet(String(tabName));
  var nCol = Math.max(header.length, rows.length ? rows[0].length : 0, 1);
  var strRows = rows.map(function (r) { var o = []; for (var i = 0; i < nCol; i++) o.push(r[i] == null ? '' : String(r[i])); return o; });
  sheet.clearContents();
  sheet.getRange(1, 1, sheet.getMaxRows(), nCol).setNumberFormat('@');
  if (header.length) sheet.getRange(1, 1, 1, header.length).setValues([header.map(String)]);
  if (strRows.length) {
    var rng = sheet.getRange(2, 1, strRows.length, nCol);
    rng.setValues(strRows);
    try { rng.setNumberFormat('@'); rng.setValues(strRows); } catch (e2) {}
  }
  return strRows.length;
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ═══ ย้ายข้อมูลเดิมจากไฟล์ Picker → ไฟล์นี้ (▶ Run ครั้งเดียว) ═══
 * · คัดลอกอย่างเดียว ไม่ลบของเดิม — ไฟล์เก่ายังอยู่ครบ ย้อนกลับได้ตลอด
 * · เขียนทับทั้งแท็บในไฟล์ใหม่ → รันซ้ำได้ ไม่ต่อท้าย ไม่ซ้ำ
 * · ครั้งแรกจะขอสิทธิ์เข้าถึงไฟล์เก่า → กด "ตรวจสอบสิทธิ์" → อนุญาต */
function migrateFromPicker() {
  var src = SpreadsheetApp.openById(OLD_SHEET_ID);
  var dst = SpreadsheetApp.openById(TARGET_SHEET_ID);
  var log = [];
  CO_TABS.forEach(function (TAB) {
    var s = src.getSheetByName(TAB);
    if (!s) { log.push(TAB + ' : ไฟล์เก่าไม่มีแท็บนี้'); return; }
    var lr = s.getLastRow(), lc = s.getLastColumn();
    if (lr < 1 || lc < 1) { log.push(TAB + ' : ว่าง'); return; }
    var hdr = s.getRange(1, 1, 1, lc).getValues()[0];
    var keep = [];
    if (lr >= 2) {
      var vals = s.getRange(2, 1, lr - 1, lc).getValues();
      for (var i = 0; i < vals.length; i++) {
        var o = []; for (var c = 0; c < lc; c++) o.push(vals[i][c] == null ? '' : String(vals[i][c]));
        keep.push(o);
      }
    }
    var d = dst.getSheetByName(TAB) || dst.insertSheet(TAB);
    d.clearContents();
    d.getRange(1, 1, d.getMaxRows(), lc).setNumberFormat('@');
    d.getRange(1, 1, 1, lc).setValues([hdr.map(String)]);
    if (keep.length) {
      var rng = d.getRange(2, 1, keep.length, lc);
      rng.setValues(keep);
      try { rng.setNumberFormat('@'); rng.setValues(keep); } catch (e) {}
    }
    log.push(TAB + ' : ย้าย ' + keep.length + ' แถว');
  });
  SpreadsheetApp.flush();
  Logger.log(log.join('\n') + '\n★ ไฟล์เก่ายังอยู่ครบ ไม่ได้ลบอะไรเลย');
}
