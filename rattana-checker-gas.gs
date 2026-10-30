// ═══════════════════════════════════════════════════════════════
//  Rattana Stock Checker — GAS Backend  v3.3
//  Deploy ครั้งเดียว — route ข้อมูลไปยัง Sheet แยกต่อคลังอัตโนมัติ
//
//  วิธี setup (ครั้งแรก):
//  1. วาง code นี้ใน Apps Script project ใหม่ (standalone)
//  2. รัน setupSheets() — จะสร้าง Google Sheet 5 ไฟล์ให้อัตโนมัติ
//     แล้ว log Spreadsheet ID ออกมาใน Execution log
//  3. Copy ID แต่ละคลัง ใส่ใน WAREHOUSE_SHEET_IDS ด้านล่าง
//  4. Deploy → New deployment → Web app
//       Execute as: Me / Who has access: Anyone
//  5. Copy URL ใส่ใน COUNT_SAVE_URL ในแอป
//
//  Sheets ที่สร้างให้เองในแต่ละ Spreadsheet:
//    History — บันทึกผลการนับรอบสุดท้าย
//    Putaway — จุดวาง (พาเลท)
//    นับเศษ  — นับเศษ (loose): ชื่อ/บาร์/หน่วย/จำนวน/วันหมดอายุ/คลัง
//
//  Draft ระหว่างนับ → CacheService (ไม่แตะ Sheet, auto-expire 6 ชั่วโมง)
// ═══════════════════════════════════════════════════════════════

// ── ใส่ Spreadsheet ID ของแต่ละคลังที่นี่ ──────────────────
// (รัน setupSheets() แล้ว copy ID จาก Execution log มาวางที่นี่)
const WAREHOUSE_SHEET_IDS = {
  W1: "17nTzpxVarjRZ19emirnol-k25RDuLgICUynf1-q2ZL8",
  W2: "15Ul4_M17EjTE6Q7mQi2EjSuU1f9rlXVvwArmJ4_FkB0",
  W3: "18PYOY8bcyFbSysxQ_Vd04hDLs9eV6FTaIfuyDryi54E",
  W4: "16oVMcnO-Oet110GmjJnbCqsBhubeE2HKr6kBPSDuflo",
  C4: "1tM1Nz8uDkdvXA19Pfmn50zy-pY1cXUN7WkUEvTk687E",
};

// ── ไฟล์กลาง "Rattana Stock Count Log" — รวมทุกคลังไว้ที่เดียว (เขียนคู่กับไฟล์คลัง) ──
// ⚠️ ต้องแชร์ไฟล์นี้ให้บัญชีที่ deploy (phatarawan.nga) เป็น "ผู้แก้ไข" ไม่งั้นเขียนไม่ได้ (จับ error เงียบ ไม่กระทบไฟล์คลัง)
const CENTRAL_SHEET_ID = "1nfXoUdA3t9zcpnGA0xN2XTu6QQfRgomdYJuAco5-89U";
// หัวคอลัมน์ไฟล์กลาง แท็บ StockCount (เรียงตามที่ผู้ใช้จัดไว้ A..S)
const CENTRAL_COUNT_HEADERS = [
  'Saved At','Session Start','Warehouse','Emp ID','Counter Name','Product Key','Product Name',
  'Counted CS','Counted BP','Counted PA','Counted EA','Counted Pieces','System Stock','System Pieces',
  'Diff Pieces','Status','Diff CS.EA','Expiry Date','Email'
];

// ── รันครั้งเดียวเพื่อสร้าง Google Sheet ทุกคลัง ────────────
function setupSheets() {
  const WH_NAMES = { W1:'สมุทรสงคราม', W2:'สุพรรณบุรี', W3:'ราชบุรี', W4:'นครปฐม', C4:'รัตนมาร์ท' };
  const results = [];
  Object.keys(WH_NAMES).forEach(function(wh) {
    const existing = WAREHOUSE_SHEET_IDS[wh];
    if (existing) {
      Logger.log(wh + ' (' + WH_NAMES[wh] + '): ใช้ ID เดิม → ' + existing);
      results.push(wh + ': "' + existing + '"');
      return;
    }
    const ss = SpreadsheetApp.create('Rattana Stock Checker — ' + wh + ' ' + WH_NAMES[wh]);
    Logger.log(wh + ' (' + WH_NAMES[wh] + '): สร้างใหม่ → ' + ss.getId());
    Logger.log('  URL: ' + ss.getUrl());
    results.push(wh + ': "' + ss.getId() + '"');
  });
  Logger.log('');
  Logger.log('═══ copy ไปใส่ใน WAREHOUSE_SHEET_IDS ═══');
  Logger.log('const WAREHOUSE_SHEET_IDS = {');
  results.forEach(function(line) { Logger.log('  ' + line + ','); });
  Logger.log('};');
}

function ssFor_(wh) {
  const id = WAREHOUSE_SHEET_IDS[String(wh || '').toUpperCase()];
  if (!id) throw new Error('ไม่พบ Spreadsheet ID สำหรับคลัง ' + wh + ' — กรุณารัน setupSheets() ก่อน');
  return SpreadsheetApp.openById(id);
}

// ตรวจว่าบัญชีที่ deploy เข้าถึง "ไฟล์กลาง" ได้ไหม (ใช้ ?action=centralcheck)
function centralCheck_() {
  try {
    const ss = SpreadsheetApp.openById(CENTRAL_SHEET_ID);
    return { ok: true, name: ss.getName(), tabs: ss.getSheets().map(function(s){ return s.getName(); }) };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

// ── HELPERS ──────────────────────────────────────────────────
const TZ = 'Asia/Bangkok';

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreate_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}

// ชื่อแท็บตามแคตตาล็อกย่อย (Colgate/Chaindrite ของ W3) — ปกติ = base, พิเศษ = "base <label>"
// เช่น catTab_('History','Colgate') = "History Colgate"
function catTab_(base, catalog) {
  const c = String(catalog || '').trim();
  return c ? base + ' ' + c : base;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (_) { return { ok: false, error: 'ระบบยุ่ง ลองใหม่อีกครั้ง' }; }
  try { return fn(); } finally { try { lock.releaseLock(); } catch (_) {} }
}

function draftKey_(userKey, warehouse) {
  return 'draft_' + String(userKey || '').toLowerCase() + '_' + String(warehouse || '').toUpperCase();
}

// ── ROUTING ──────────────────────────────────────────────────
function doGet(e) {
  const p = e.parameter || {};
  try {
    if (p.action === 'ping')    return json_({ ok: true, v: '3.3' });
    if (p.action === 'checkprogress') return json_(getCheckProgress_());   // v3.3
    if (p.action === 'history') return json_(getHistory_());
    if (p.action === 'scraphistory')  return json_(getScrapHistory_('นับเศษ'));
    // v3.2: รวมงานนับเศษกับใกล้หมดอายุเป็นงานเดียว แท็บเดียว
    //       action เดิมยังตอบอยู่ แต่ชี้แท็บ "นับเศษ" — เครื่องที่ยังค้างแอปเก่าจะได้ตรวจเจอ ไม่ถูกบล็อก
    if (p.action === 'expiryhistory') return json_(getScrapHistory_('นับเศษ'));
    if (p.action === 'draft')   return json_(getDraft_(p.userKey, p.warehouse));
    if (p.action === 'putaway') return json_(putawayList_());
    if (p.action === 'centralcheck') return json_(centralCheck_());
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) { return json_({ ok: false, error: err.message }); }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (_) {}
  const action = body.action || '';
  try {
    if (action === 'saveDraft')     return json_(saveDraft_(body));
    if (action === 'clearDraft')    return json_(clearDraft_(body));
    if (action === 'putawayAdd')    return json_(withLock_(() => putawayAdd_(body)));
    if (action === 'putawayRemove') return json_(withLock_(() => putawayRemove_(body)));
    if (action === 'saveScrap')     return json_(withLock_(() => saveScrap_(body)));
    if (!action && Array.isArray(body.rows)) return json_(withLock_(() => saveCount_(body)));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) { return json_({ ok: false, error: err.message }); }
}

// ── DRAFTS (CacheService — ไม่มี Sheet) ─────────────────────
const DRAFT_TTL = 21600; // 6 ชั่วโมง

function saveDraft_(b) {
  const key = draftKey_(b.userKey, b.warehouse);
  const val = JSON.stringify({
    userKey:      String(b.userKey || '').toLowerCase(),
    warehouse:    String(b.warehouse || '').toUpperCase(),
    items:        b.items || {},
    updatedAt:    new Date().toISOString(),
    sessionStart: b.sessionStart || ''
  });
  CacheService.getScriptCache().put(key, val, DRAFT_TTL);
  return { ok: true };
}

function clearDraft_(b) {
  CacheService.getScriptCache().remove(draftKey_(b.userKey, b.warehouse));
  return { ok: true };
}

function getDraft_(userKey, warehouse) {
  const raw = CacheService.getScriptCache().get(draftKey_(userKey, warehouse));
  if (!raw) return { ok: true, draft: null };
  try { return { ok: true, draft: JSON.parse(raw) }; }
  catch (_) { return { ok: true, draft: null }; }
}

// ── HISTORY ──────────────────────────────────────────────────
const HIST_HEADERS = [
  'savedAt','warehouse','empId','counterName','sessionStart','email',
  'key','name','cs','bp','pa','ea','countedPieces',
  'systemRaw','systemPieces','diffPieces','diffCSEA','status','expiryDate',
  'countedAt'   // v2.6: เวลาที่เช็คจริงต่อสินค้า (คอลัมน์ T) → เรียงประวัติใหม่→เก่า
];

// แปลงวันที่ทุกอันให้เป็นรูปแบบเดียวกัน → "yyyy-MM-dd HH:mm:ss" เวลาไทย เช่น 2026-07-01 14:00:50
function fmtDT_(v) {
  if (!v) return '';
  const d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd HH:mm:ss');
}

function saveCount_(b) {
  const ss = ssFor_(b.warehouse);
  const sh = getOrCreate_(ss, catTab_('History', b.catalog), HIST_HEADERS);
  // v2.6: ชีตเดิมมี 19 คอลัมน์ — เติมหัวคอลัมน์ที่ขาด (countedAt) ให้อัตโนมัติ (ค่าเดิมเหมือนเดิม ไม่กระทบ)
  if (sh.getLastColumn() < HIST_HEADERS.length) {
    sh.getRange(1, 1, 1, HIST_HEADERS.length).setValues([HIST_HEADERS]).setFontWeight('bold');
  }
  const rows = Array.isArray(b.rows) ? b.rows : [];
  if (!rows.length) return { ok: false, error: 'no rows' };
  const savedAt = fmtDT_(b.savedAt || new Date().toISOString());
  const session = fmtDT_(b.sessionStart || '');
  const out = rows.map(function(r) {
    return [
      savedAt,
      b.warehouse || '',
      b.empId || '',
      b.counterName || b.name || '',
      session,
      b.email || '',
      r.key || '',
      r.name || '',
      r.cs || 0, r.bp || 0, r.pa || 0, r.ea || 0,
      r.countedPieces || 0,
      r.systemRaw || '',
      r.systemPieces || 0,
      r.diffPieces || 0,
      r.diffCSEA || '',
      r.status || '',
      r.expiryDate || '',
      fmtDT_(r.countedAt || '')   // v2.6: เวลาเช็คจริง (yyyy-MM-dd HH:mm:ss เวลาไทย ระดับวินาที)
    ];
  });
  const startRow = sh.getLastRow() + 1;
  // ตั้ง format เป็น "ข้อความ" ก่อนเขียน เพื่อกัน 0 หน้าบาร์โค้ดหาย
  sh.getRange(startRow, 1, out.length, 1).setNumberFormat('@'); // savedAt
  sh.getRange(startRow, 7, out.length, 1).setNumberFormat('@'); // key (บาร์โค้ด)
  // v2.5: systemRaw/diffCSEA เป็นรูปแบบ "CS.EA" (เลขหลังจุด = จำนวน EA ตรงๆ ไม่ใช่ทศนิยม)
  // ถ้าปล่อยเป็นตัวเลข Sheets จะตัด 0 ท้ายทิ้ง → "3.90" (3 CS 90 EA) เพี้ยนเป็น 3.9 (อ่านเป็น 9 EA)
  sh.getRange(startRow, 14, out.length, 1).setNumberFormat('@'); // systemRaw
  sh.getRange(startRow, 17, out.length, 1).setNumberFormat('@'); // diffCSEA
  sh.getRange(startRow, 20, out.length, 1).setNumberFormat('@'); // countedAt (v2.6) — กันวันที่ถูกแปลงรูปแบบ
  sh.getRange(startRow, 1, out.length, out[0].length).setValues(out);
  // ── เขียนลงไฟล์กลาง (StockCount) ด้วย — ล้มเหลวก็ไม่กระทบการเขียนไฟล์คลัง ──
  try {
    const csh = getOrCreate_(SpreadsheetApp.openById(CENTRAL_SHEET_ID), catTab_('StockCount', b.catalog), CENTRAL_COUNT_HEADERS);
    if (csh.getLastColumn() < CENTRAL_COUNT_HEADERS.length) {
      csh.getRange(1, 1, 1, CENTRAL_COUNT_HEADERS.length).setValues([CENTRAL_COUNT_HEADERS]).setFontWeight('bold');
    }
    const cout = rows.map(function(r) {
      return [
        savedAt, session, b.warehouse || '', b.empId || '', b.counterName || b.name || '',
        r.key || '', r.name || '', r.cs || 0, r.bp || 0, r.pa || 0, r.ea || 0, r.countedPieces || 0,
        r.systemRaw || '', r.systemPieces || 0, r.diffPieces || 0, r.status || '', r.diffCSEA || '',
        r.expiryDate || '', b.email || ''
      ];
    });
    const cStart = csh.getLastRow() + 1;
    csh.getRange(cStart, 1,  cout.length, 1).setNumberFormat('@'); // Saved At
    csh.getRange(cStart, 6,  cout.length, 1).setNumberFormat('@'); // Product Key (บาร์โค้ด)
    csh.getRange(cStart, 13, cout.length, 1).setNumberFormat('@'); // System Stock (CS.EA)
    csh.getRange(cStart, 17, cout.length, 1).setNumberFormat('@'); // Diff CS.EA
    csh.getRange(cStart, 18, cout.length, 1).setNumberFormat('@'); // Expiry Date
    csh.getRange(cStart, 1, cout.length, cout[0].length).setValues(cout);
  } catch (e) { /* ไฟล์กลางเขียนไม่ได้ (สิทธิ์?) — ข้ามไป ไม่ทำให้ทั้งฟังก์ชันล้ม */ }
  // v3.3: แถวสรุป "เช็คครบไหม" — ล้มเหลวก็ไม่กระทบการบันทึกผลนับ
  try { saveCheckProgress_(b); } catch (e) {}
  return { ok: true, written: out.length };
}


// ── ความคืบหน้าการเช็ค (v3.3) ───────────────────────────────
//  แอปส่ง b.progress มาพร้อมผลนับตอนกดส่ง → บันทึก 1 แถวต่อ 1 ครั้งที่ส่ง
//  ตอบคำถาม: เช็คครบไหม · เช็คไปกี่ตัว · ไม่ได้เช็คกี่ตัว · ไม่ได้เช็คอะไรบ้าง
//  b.progress = { kind, day, targets: [{ k: คีย์สินค้า, n: ชื่อ }, ...] }
//  ★ แอปส่งมาแค่ "ตัวที่ต้องเช็ค" — ฝั่งนี้ไปนับเองว่าวันนี้คนนี้เช็คอะไรไปแล้วจาก History
//    (รวมแถวที่เพิ่งเขียนไปเมื่อกี้ด้วย) → ส่งหลายรอบในวันเดียว แถวล่าสุดก็ยังเป็นภาพรวมสะสม
const CHECK_HEADERS = [
  'Saved At','Warehouse','Emp ID','Counter Name','Email',
  'ฐานที่ใช้','วันที่ขายอ้างอิง','ต้องเช็ค','เช็คแล้ว','ยังไม่เช็ค','ครบ %','รายชื่อที่ยังไม่เช็ค'
];
const CHECK_TAB = 'ความคืบหน้า';
const CHECK_MISS_MAX = 400;   // ชื่อที่ยัดลงช่องเดียว — เกินนี้สรุปเป็นตัวเลขแทน

function normName_(v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }

// คีย์สินค้าที่คนนี้เช็คไปแล้ว "วันนี้" ในคลังนี้ (อ่านจาก History ที่เพิ่งเขียนเสร็จ)
function doneKeysToday_(b, today) {
  const map = {};
  try {
    const sh = getOrCreate_(ssFor_(b.warehouse), catTab_('History', b.catalog), HIST_HEADERS);
    const last = sh.getLastRow();
    if (last < 2) return map;
    const who  = normName_(b.counterName || b.name || '');
    const vals = sh.getRange(2, 1, last - 1, 7).getValues();   // A=savedAt .. G=key
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (String(v[0] || '').slice(0, 10) !== today) continue;
      if (who && normName_(v[3]) !== who) continue;
      const k = String(v[6] || '');
      if (k) map[k] = 1;
    }
  } catch (e) {}
  return map;
}

function saveCheckProgress_(b) {
  const p = b && b.progress;
  if (!p || !Array.isArray(p.targets) || !p.targets.length) return;
  const ss = ssFor_(b.warehouse);
  const sh = getOrCreate_(ss, catTab_(CHECK_TAB, b.catalog), CHECK_HEADERS);
  if (sh.getLastColumn() < CHECK_HEADERS.length) {
    sh.getRange(1, 1, 1, CHECK_HEADERS.length).setValues([CHECK_HEADERS]).setFontWeight('bold');
  }
  const stamp = fmtDT_(b.savedAt || new Date().toISOString());
  const dkeys = doneKeysToday_(b, stamp.slice(0, 10));
  const names = [];
  let total = 0, done = 0;
  const seen = {};
  p.targets.forEach(function (t) {
    const k = String((t && t.k) || '');
    if (!k || seen[k]) return;
    seen[k] = 1;
    total++;
    if (dkeys[k]) done++;
    else names.push(String((t && t.n) || k));
  });
  if (!total) return;
  const miss = total - done;
  let missTxt = names.slice(0, CHECK_MISS_MAX).join(' | ');
  if (names.length > CHECK_MISS_MAX) {
    missTxt += ' … และอีก ' + (names.length - CHECK_MISS_MAX) + ' ตัว';
  }
  const row = [
    stamp,
    b.warehouse || '', b.empId || '', b.counterName || b.name || '', b.email || '',
    p.kind || '', p.day || '',
    total, done, miss, Math.round(done * 100 / total),
    missTxt
  ];
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, 1).setNumberFormat('@');   // Saved At
  sh.getRange(r, 7, 1, 1).setNumberFormat('@');   // วันที่ขายอ้างอิง
  sh.getRange(r, 1, 1, row.length).setValues([row]);
}

// อ่านกลับให้หน้าแดชบอร์ด — รวมทุกคลัง เรียงใหม่→เก่า
function getCheckProgress_() {
  const out = [];
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function (wh) {
    let ss;
    try { ss = ssFor_(wh); } catch (e) { return; }
    ss.getSheets().forEach(function (sh) {
      const nm = sh.getName();
      if (nm.indexOf(CHECK_TAB) !== 0) return;
      const last = sh.getLastRow();
      if (last < 2) return;
      const n = Math.min(400, last - 1);
      const vals = sh.getRange(last - n + 1, 1, n, CHECK_HEADERS.length).getValues();
      const cat = nm.slice(CHECK_TAB.length).trim();
      vals.forEach(function (v) {
        if (!v[0]) return;
        out.push({
          savedAt: String(v[0]), warehouse: String(v[1] || wh), empId: String(v[2] || ''),
          counterName: String(v[3] || ''), email: String(v[4] || ''), catalog: cat,
          kind: String(v[5] || ''), day: String(v[6] || ''),
          total: Number(v[7]) || 0, done: Number(v[8]) || 0, miss: Number(v[9]) || 0,
          pct: Number(v[10]) || 0, missNames: String(v[11] || '')
        });
      });
    });
  });
  out.sort(function (a, b) { return a.savedAt < b.savedAt ? 1 : (a.savedAt > b.savedAt ? -1 : 0); });
  return { ok: true, rows: out.slice(0, 600) };
}

// ── นับเศษ (SCRAP) — บันทึกในแท็บ "นับเศษ" ของ spreadsheet คลังนั้น ─────────
// v3.2: งานนับเศษกับใกล้หมดอายุรวมเป็นงานเดียว ลงแท็บ "นับเศษ" แท็บเดียว
//       แล้วบอกสถานะด้วย 2 คอลัมน์ท้าย — กรอง/เรียงในชีทเอาได้เลย
const SCRAP_HEADERS = [
  'savedAt','warehouse','empId','counterName','email',
  'barcode','name','unit','qty','expiryDate','countedAt',
  'ใกล้หมดอายุ','เหลือ (วัน)'
];
const EXPIRY_NEAR_DAYS = 90;   // ≤ 90 วัน = ใกล้หมดอายุ (ตรงกับที่แอปใช้เตือน)

// คำนวณฝั่ง server เสมอ ไม่รับค่าจากแอป — ทุกเครื่องจะได้ผลตรงกัน
// แม้จะมีเครื่องที่ค้างแอปเวอร์ชันเก่าอยู่ก็ยังได้สถานะถูกต้อง
// คืน [ป้ายสถานะ, จำนวนวันที่เหลือ]  ติดลบ = หมดอายุไปแล้วกี่วัน
function expiryInfo_(v) {
  if (!v) return ['', ''];
  const raw = String(v).trim();
  let d = new Date(raw);                                       // รับทั้ง ISO และ Date.toString
  if (isNaN(d.getTime())) d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d.getTime())) return ['', ''];
  const tz = Session.getScriptTimeZone() || 'Asia/Bangkok';
  const dayOf = function(x) { return new Date(Utilities.formatDate(x, tz, 'yyyy/MM/dd')); };
  const days = Math.round((dayOf(d) - dayOf(new Date())) / 86400000);
  if (days < 0) return ['หมดอายุแล้ว', days];
  return [days <= EXPIRY_NEAR_DAYS ? 'ใช่' : '', days];
}

function saveScrap_(b) {
  const rows = Array.isArray(b.rows) ? b.rows : [];
  if (!rows.length) return { ok: false, error: 'no rows' };
  const wh = b.warehouse;
  // v3.2: ลงแท็บ "นับเศษ" แท็บเดียว — b.kind ที่แอปเก่าส่งมาไม่ใช้แล้ว (ตั้งใจไม่สนใจ)
  //       ของที่ใกล้หมดอายุไม่แยกแท็บ แต่ติดป้ายในคอลัมน์ท้ายแทน
  const base = 'นับเศษ';
  const sh = getOrCreate_(ssFor_(wh), catTab_(base, b.catalog), SCRAP_HEADERS);
  // เผื่อชีตเดิมหัวคอลัมน์ไม่ครบ → เติมหัวให้
  if (sh.getLastColumn() < SCRAP_HEADERS.length) {
    sh.getRange(1, 1, 1, SCRAP_HEADERS.length).setValues([SCRAP_HEADERS]).setFontWeight('bold');
  }
  const savedAt = fmtDT_(b.savedAt || new Date().toISOString());
  const out = rows.map(function(r) {
    const ex = expiryInfo_(r.expiryDate);
    return [
      savedAt, wh || '', b.empId || '', b.counterName || '', b.email || '',
      r.barcode || '', r.name || '', r.unit || '', Number(r.qty) || 0,
      r.expiryDate || '', fmtDT_(r.countedAt || ''),
      ex[0], ex[1]
    ];
  });
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1,  out.length, 1).setNumberFormat('@'); // savedAt
  sh.getRange(startRow, 6,  out.length, 1).setNumberFormat('@'); // barcode (กัน 0 หน้าหาย)
  sh.getRange(startRow, 10, out.length, 1).setNumberFormat('@'); // expiryDate
  sh.getRange(startRow, 11, out.length, 1).setNumberFormat('@'); // countedAt
  sh.getRange(startRow, 1, out.length, out[0].length).setValues(out);
  // ── เขียนลงไฟล์กลาง (แท็บเดียวกับของคลัง) ด้วย — ล้มเหลวก็ไม่กระทบไฟล์คลัง ──
  try {
    const csh = getOrCreate_(SpreadsheetApp.openById(CENTRAL_SHEET_ID), catTab_(base, b.catalog), SCRAP_HEADERS);
    if (csh.getLastColumn() < SCRAP_HEADERS.length) {
      csh.getRange(1, 1, 1, SCRAP_HEADERS.length).setValues([SCRAP_HEADERS]).setFontWeight('bold');
    }
    const cStart = csh.getLastRow() + 1;
    csh.getRange(cStart, 1,  out.length, 1).setNumberFormat('@');
    csh.getRange(cStart, 6,  out.length, 1).setNumberFormat('@');
    csh.getRange(cStart, 10, out.length, 1).setNumberFormat('@');
    csh.getRange(cStart, 11, out.length, 1).setNumberFormat('@');
    csh.getRange(cStart, 1, out.length, out[0].length).setValues(out);
  } catch (e) { /* ไฟล์กลางเขียนไม่ได้ — ข้ามไป */ }
  return { ok: true, written: out.length };
}

// ── BACKFILL ─────────────────────────────────────────────────
// รันครั้งเดียว: แปลง savedAt + sessionStart ของแถวเก่าให้เป็น "yyyy-MM-dd HH:mm:ss"
// และลบคอลัมน์ "(ไทย)" 2 คอลัมน์ท้ายตารางออก (ถ้ามี) ให้รูปแบบเหมือนกันหมด
function backfillDateFormat() {
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function(wh) {
    const id = WAREHOUSE_SHEET_IDS[wh];
    if (!id) return;
    const sh = SpreadsheetApp.openById(id).getSheetByName('History');
    if (!sh) { Logger.log(wh + ': ไม่มีชีต History'); return; }

    // ลบคอลัมน์ไทยท้ายตาราง (U แล้ว T) ถ้าหัวตรง
    [21, 20].forEach(function(col) {
      if (sh.getMaxColumns() >= col) {
        const hdr = String(sh.getRange(1, col).getValue() || '');
        if (hdr.indexOf('ไทย') !== -1) sh.deleteColumn(col);
      }
    });

    const lastRow = sh.getLastRow();
    if (lastRow < 2) { Logger.log(wh + ': ไม่มีข้อมูล'); return; }
    const n = lastRow - 1;
    const savedVals   = sh.getRange(2, 1, n, 1).getValues();  // col A
    const sessionVals = sh.getRange(2, 5, n, 1).getValues();  // col E
    const outSaved = [], outStart = [];
    for (let i = 0; i < n; i++) {
      outSaved.push([ fmtDT_(savedVals[i][0]) ]);
      outStart.push([ fmtDT_(sessionVals[i][0]) ]);
    }
    sh.getRange(2, 1, n, 1).setNumberFormat('@').setValues(outSaved);
    sh.getRange(2, 5, n, 1).setNumberFormat('@').setValues(outStart);
    Logger.log(wh + ': แปลงแล้ว ' + n + ' แถว');
  });
  Logger.log('เสร็จสิ้น ✓');
}

// ── CLEANUP: ล้างแถวผี (ล็อตว่างที่นับ 0 แต่ถือสต็อก/ขาดเกิน) ในชีต History ─────
//  รันครั้งเดียวจาก editor:
//     cleanupPhantomRows(true)  → ดูตัวอย่างก่อน (ไม่แก้ไขข้อมูล)
//     cleanupPhantomRows()      → ล้างจริง
//  วิธีทำงาน: จับกลุ่มแถวที่ savedAt + key เดียวกัน (= สินค้าตัวเดียว ในการบันทึกครั้งเดียว)
//    ถ้ากลุ่มมีทั้งแถว "นับจริง" (cs/bp/pa/ea/countedPieces > 0) และแถวผี "นับ 0":
//      → ย้าย สต็อก/ขาดเกิน/สถานะ ไปไว้บนแถวนับจริง "แถวแรก" แล้วลบแถวผีทิ้ง
//    กลุ่มที่นับ 0 ทั้งหมด (นับไม่เจอจริง = ขาด) จะเก็บไว้ ไม่ลบ
//    หลายล็อตจริง (นับ > 0 หลายแถว) จะเก็บแยกแถวไว้เหมือนเดิม
function cleanupPhantomRows(dryRun) {
  const IDX = { savedAt:0, key:6, cs:8, bp:9, pa:10, ea:11, counted:12,
                sysRaw:13, sysPc:14, diffPc:15, diffCSEA:16, status:17 };
  const isReal = function(r) {
    return (Number(r[IDX.cs])||0) + (Number(r[IDX.bp])||0) + (Number(r[IDX.pa])||0) +
           (Number(r[IDX.ea])||0) + (Number(r[IDX.counted])||0) > 0;
  };
  const hasSys = function(r) {
    return String(r[IDX.status]).trim() !== '' || String(r[IDX.sysRaw]).trim() !== '' ||
           (Number(r[IDX.sysPc])||0) !== 0 || (Number(r[IDX.diffPc])||0) !== 0 ||
           String(r[IDX.diffCSEA]).trim() !== '';
  };
  const report = [];
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function(wh) {
    const id = WAREHOUSE_SHEET_IDS[wh];
    if (!id) return;
    const sh = SpreadsheetApp.openById(id).getSheetByName('History');
    if (!sh) { report.push(wh + ': ไม่มีชีต History'); return; }
    const lastRow = sh.getLastRow();
    if (lastRow < 2) { report.push(wh + ': ไม่มีข้อมูล'); return; }
    const nCol = sh.getLastColumn();
    const data = sh.getRange(2, 1, lastRow - 1, nCol).getValues(); // sheet row จริง = i + 2

    // จับกลุ่ม savedAt + key
    const groups = {};
    data.forEach(function(row, i) {
      const gk = String(row[IDX.savedAt]) + '||' + String(row[IDX.key]);
      (groups[gk] || (groups[gk] = [])).push(i);
    });

    const edits = [];    // { row: sheetRowNum, vals: [systemRaw, systemPieces, diffPieces, diffCSEA, status] }
    const toDelete = [];  // sheetRowNum
    Object.keys(groups).forEach(function(gk) {
      const idxs = groups[gk];
      if (idxs.length < 2) return; // แถวเดียว = ไม่มีอะไรให้รวม
      const reals    = idxs.filter(function(i){ return isReal(data[i]); });
      const phantoms = idxs.filter(function(i){ return !isReal(data[i]); });
      if (!phantoms.length || !reals.length) return; // ไม่มีแถวผี หรือ ไม่มีแถวนับจริง → ข้าม

      // หาแถวต้นทางของ สต็อก/ขาดเกิน (แถวไหนก็ได้ในกลุ่มที่มีข้อมูลนี้ — ปกติคือแถวผี)
      let srcI = -1;
      idxs.forEach(function(i){ if (srcI < 0 && hasSys(data[i])) srcI = i; });
      if (srcI < 0) srcI = phantoms[0];
      const src = data[srcI];

      // ใส่ สต็อก/ขาดเกิน/สถานะ ลงแถวนับจริง "แถวแรก"
      edits.push({ row: reals[0] + 2,
        vals: [ src[IDX.sysRaw], src[IDX.sysPc], src[IDX.diffPc], src[IDX.diffCSEA], src[IDX.status] ] });
      // แถวนับจริงที่เหลือ → เคลียร์คอลัมน์ สต็อก/ขาดเกิน ให้ว่าง (กันซ้ำ)
      reals.slice(1).forEach(function(i){ edits.push({ row: i + 2, vals: ['', 0, 0, '', ''] }); });
      // ลบแถวผีทั้งหมดในกลุ่ม
      phantoms.forEach(function(i){ toDelete.push(i + 2); });
    });

    if (dryRun) {
      report.push(wh + ' [ตัวอย่าง]: จะลบแถวผี ' + toDelete.length + ' แถว, ปรับ ' + edits.length + ' แถว');
      return;
    }
    // เขียนแก้ก่อน (เลขแถวยังไม่ขยับ) — คอลัมน์ N..R = 14..18 (systemRaw..status)
    edits.forEach(function(e){ sh.getRange(e.row, 14, 1, 5).setValues([e.vals]); });
    // ลบแถวจากล่างขึ้นบน เพื่อไม่ให้เลข index เลื่อน
    toDelete.sort(function(a, b){ return b - a; });
    toDelete.forEach(function(rowNum){ sh.deleteRow(rowNum); });
    report.push(wh + ': ลบแถวผี ' + toDelete.length + ' แถว, ปรับ ' + edits.length + ' แถว');
  });
  const msg = (dryRun ? '── ตัวอย่าง (ยังไม่แก้ไข) ──\n' : '── ล้างเสร็จ ✓ ──\n') + report.join('\n');
  Logger.log(msg);
  return msg;
}

// เลือกฟังก์ชันนี้จาก dropdown แล้วกด Run เพื่อ "ดูตัวอย่าง" ก่อน (ไม่แก้ไขข้อมูล)
function previewPhantomRows() { return cleanupPhantomRows(true); }

// ── FILL STATUS: เติมคอลัมน์ status (R) ให้ครบทุกแถว ─────────────
//  รันครั้งเดียวจาก editor:
//     fillMissingStatus(true)  → ดูตัวอย่างก่อน (ไม่แก้ไขข้อมูล)  [หรือเลือก previewFillStatus]
//     fillMissingStatus()      → เติมจริง
//  เหตุผล: สินค้าที่มีหลายล็อต (หลายวันหมดอายุ) จะมีสถานะแค่แถวแรก แถวรองว่าง
//  วิธีทำงาน: จับกลุ่ม savedAt + key แล้วหา "สถานะรวมของสินค้า"
//     - ใช้สถานะจากแถวที่มีอยู่แล้วในกลุ่ม (ปกติคือแถวแรก)
//     - ถ้าทั้งกลุ่มไม่มีสถานะเลย → คำนวณจากยอดรวม (นับรวม - สต็อกรวม)
//  แล้วเติมสถานะนั้นลงทุกแถวในกลุ่มที่ยังว่าง (ไม่แตะตัวเลขสต็อก/ขาดเกิน)
function fillMissingStatus(dryRun) {
  const IDX = { savedAt:0, key:6, counted:12, sysPc:14, status:17 };
  const report = [];
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function(wh) {
    const id = WAREHOUSE_SHEET_IDS[wh];
    if (!id) return;
    const sh = SpreadsheetApp.openById(id).getSheetByName('History');
    if (!sh) { report.push(wh + ': ไม่มีชีต History'); return; }
    const lastRow = sh.getLastRow();
    if (lastRow < 2) { report.push(wh + ': ไม่มีข้อมูล'); return; }
    const nCol = sh.getLastColumn();
    const data = sh.getRange(2, 1, lastRow - 1, nCol).getValues(); // sheet row จริง = i + 2

    // จับกลุ่ม savedAt + key
    const groups = {};
    data.forEach(function(row, i) {
      const gk = String(row[IDX.savedAt]) + '||' + String(row[IDX.key]);
      (groups[gk] || (groups[gk] = [])).push(i);
    });

    const updates = []; // { row: sheetRowNum, status }
    Object.keys(groups).forEach(function(gk) {
      const idxs = groups[gk];
      // หาสถานะรวมของกลุ่ม
      let st = '';
      idxs.forEach(function(i){
        const s = String(data[i][IDX.status]).trim();
        if (!st && s) st = s;
      });
      if (!st) { // ทั้งกลุ่มไม่มีสถานะ → คำนวณจากยอดรวม
        let counted = 0, sysPc = 0;
        idxs.forEach(function(i){
          counted += Number(data[i][IDX.counted]) || 0;
          sysPc   += Number(data[i][IDX.sysPc])  || 0;
        });
        const d = counted - sysPc;
        st = d === 0 ? 'ตรง' : (d < 0 ? 'ขาด' : 'เกิน');
      }
      // เติมสถานะให้ทุกแถวในกลุ่มที่ยังว่าง
      idxs.forEach(function(i){
        if (!String(data[i][IDX.status]).trim()) updates.push({ row: i + 2, status: st });
      });
    });

    if (dryRun) {
      report.push(wh + ' [ตัวอย่าง]: จะเติมสถานะ ' + updates.length + ' แถว');
      return;
    }
    updates.forEach(function(u){ sh.getRange(u.row, 18).setValue(u.status); }); // col R = 18
    report.push(wh + ': เติมสถานะ ' + updates.length + ' แถว');
  });
  const msg = (dryRun ? '── ตัวอย่าง (ยังไม่แก้ไข) ──\n' : '── เติมสถานะเสร็จ ✓ ──\n') + report.join('\n');
  Logger.log(msg);
  return msg;
}

// เลือกฟังก์ชันนี้จาก dropdown แล้วกด Run เพื่อ "ดูตัวอย่าง" ก่อน (ไม่แก้ไขข้อมูล)
function previewFillStatus() { return fillMissingStatus(true); }

// ── ซ่อมแถวเก่า: systemRaw / diffCSEA ที่ Sheets แปลงเป็นตัวเลข (v2.5) ───────
//  ปัญหา: 2 คอลัมน์นี้เป็นรูปแบบ "CS.EA" (เลขหลังจุด = จำนวน EA ตรงๆ) แต่ถูกเก็บเป็นตัวเลข
//         → Sheets ตัด 0 ท้ายทิ้ง: "3.90" (3 CS 90 EA) เพี้ยนเป็น 3.9 · "-0.10" (10 EA) เพี้ยนเป็น -0.1
//  ซ่อมได้เพราะตัวเลขจริงยังถูก: systemPieces / diffPieces → คำนวณข้อความใหม่
//  ตัวคูณ (ชิ้น/ลัง) หาจากแถวที่นับเป็น CS ล้วนของ key เดียวกัน: countedPieces ÷ cs
//  รัน: previewCSEAText() ดูก่อน → backfillCSEAText() ซ่อมจริง
function backfillCSEAText(dryRun) {
  const IDX = { key:6, cs:8, bp:9, pa:10, ea:11, counted:12, sysRaw:13, sysPc:14, diffPc:15, diffCSEA:16 };
  const report = [];
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function(wh) {
    const id = WAREHOUSE_SHEET_IDS[wh];
    if (!id) return;
    const sh = SpreadsheetApp.openById(id).getSheetByName('History');
    if (!sh) { report.push(wh + ': ไม่มีชีต History'); return; }
    const lastRow = sh.getLastRow();
    if (lastRow < 2) { report.push(wh + ': ไม่มีข้อมูล'); return; }
    const n = lastRow - 1;
    const data = sh.getRange(2, 1, n, sh.getLastColumn()).getValues();

    // รอบ 1 — หาตัวคูณลัง (ชิ้น/ลัง) ต่อ key จากแถวที่นับเป็น CS ล้วน
    const factorByKey = {};
    data.forEach(function(r) {
      const key = String(r[IDX.key]).trim(); if (!key) return;
      const cs = Number(r[IDX.cs])||0, bp = Number(r[IDX.bp])||0,
            pa = Number(r[IDX.pa])||0, ea = Number(r[IDX.ea])||0,
            counted = Number(r[IDX.counted])||0;
      if (cs > 0 && bp === 0 && pa === 0 && ea === 0 && counted > 0) {
        const f = counted / cs;
        if (f > 0 && f === Math.floor(f) && !factorByKey[key]) factorByKey[key] = f;
      }
    });

    // รอบ 2 — คำนวณข้อความ CS.EA ใหม่จากตัวเลขที่ถูกต้อง (เว้นช่องว่างไว้เหมือนเดิม)
    const sysOut = [], diffOut = [];
    let fixed = 0, unresolved = 0;
    data.forEach(function(r) {
      const f = factorByKey[String(r[IDX.key]).trim()];
      const curSys  = String(r[IDX.sysRaw]).trim();
      const curDiff = String(r[IDX.diffCSEA]).trim();
      let sysVal = curSys, diffVal = curDiff;
      if (f) {
        if (curSys !== '') {
          const sp = Number(r[IDX.sysPc]) || 0;
          const cs = Math.floor(sp / f);
          sysVal = cs + '.' + (sp - cs * f);
        }
        if (curDiff !== '') {
          const dp = Number(r[IDX.diffPc]) || 0;
          if (dp === 0) diffVal = '0';
          else {
            const a = Math.abs(dp), cs = Math.floor(a / f);
            diffVal = (dp > 0 ? '+' : '-') + cs + '.' + (a - cs * f);
          }
        }
        if (sysVal !== curSys || diffVal !== curDiff) fixed++;
      } else if (curSys !== '' || curDiff !== '') {
        unresolved++;
      }
      sysOut.push([sysVal]);
      diffOut.push([diffVal]);
    });

    if (dryRun) {
      report.push(wh + ' [ตัวอย่าง]: ซ่อม ' + fixed + ' แถว · หาตัวคูณไม่ได้ ' + unresolved +
                  ' แถว · รู้ตัวคูณ ' + Object.keys(factorByKey).length + ' สินค้า');
      return;
    }
    sh.getRange(2, 14, n, 1).setNumberFormat('@').setValues(sysOut);   // systemRaw  (N)
    sh.getRange(2, 17, n, 1).setNumberFormat('@').setValues(diffOut);  // diffCSEA   (Q)
    report.push(wh + ': ซ่อม ' + fixed + ' แถว · หาตัวคูณไม่ได้ ' + unresolved + ' แถว');
  });
  const msg = (dryRun ? '── ตัวอย่าง (ยังไม่แก้ไข) ──\n' : '── ซ่อมเสร็จ ✓ ──\n') + report.join('\n');
  Logger.log(msg);
  return msg;
}
// เลือกฟังก์ชันนี้จาก dropdown แล้วกด Run เพื่อ "ดูตัวอย่าง" ก่อน (ไม่แก้ไขข้อมูล)
function previewCSEAText() { return backfillCSEAText(true); }

// ── PUTAWAY (จุดวาง) — แยกเก็บในไฟล์ของแต่ละคลัง (แท็บ Putaway ใน spreadsheet เดียวกับ History) ──
const PUTAWAY_HEADERS = ['id','savedAt','warehouse','empId','counterName','key','name','pallets','location','status','removedAt','removedBy'];

function putawaySheetFor_(wh) {
  return getOrCreate_(ssFor_(wh), 'Putaway', PUTAWAY_HEADERS);
}

function putawayAdd_(b) {
  const sh = putawaySheetFor_(b.warehouse);
  const id = Utilities.getUuid();
  const row = [ id, fmtDT_(new Date().toISOString()), b.warehouse || '', b.empId || '',
    b.counterName || '', b.key || '', b.name || '', Number(b.pallets) || 0,
    b.location || '', 'active', '', '' ];
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, 1, 1).setNumberFormat('@'); // id เป็นข้อความ
  sh.getRange(startRow, 6, 1, 1).setNumberFormat('@'); // key (บาร์โค้ด) เป็นข้อความ
  sh.getRange(startRow, 1, 1, row.length).setValues([row]);
  return { ok: true, id: id };
}

// ค้นหา id ในทุกคลัง แล้ว mark เป็น removed (soft delete — เก็บประวัติไว้)
function putawayRemove_(b) {
  const target = String(b.id || '');
  if (!target) return { ok: false, error: 'no id' };
  const whs = Object.keys(WAREHOUSE_SHEET_IDS);
  for (let w = 0; w < whs.length; w++) {
    const id = WAREHOUSE_SHEET_IDS[whs[w]];
    if (!id) continue;
    try {
      const sh = SpreadsheetApp.openById(id).getSheetByName('Putaway');
      if (!sh) continue;
      const data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === target && String(data[i][9]) !== 'removed') {
          sh.getRange(i + 1, 10).setValue('removed');
          sh.getRange(i + 1, 11).setValue(fmtDT_(new Date().toISOString()));
          sh.getRange(i + 1, 12).setValue(b.counterName || '');
          return { ok: true };
        }
      }
    } catch (_) {}
  }
  return { ok: false, error: 'not found' };
}

function putawayList_() {
  const rows = [];
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function(wh) {
    const id = WAREHOUSE_SHEET_IDS[wh];
    if (!id) return;
    try {
      const sh = SpreadsheetApp.openById(id).getSheetByName('Putaway');
      if (!sh) return;
      const data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        if (String(r[9]) === 'removed') continue; // แสดงเฉพาะที่ยังวางอยู่
        rows.push({
          id: String(r[0] || ''), savedAt: String(r[1] || ''), warehouse: String(r[2] || ''),
          empId: String(r[3] || ''), counterName: String(r[4] || ''), key: String(r[5] || ''),
          name: String(r[6] || ''), pallets: Number(r[7]) || 0, location: String(r[8] || '')
        });
      }
    } catch (_) {}
  });
  rows.sort(function(a, b) { return (b.savedAt || '').localeCompare(a.savedAt || ''); });
  return { ok: true, rows: rows };
}

function getHistory_() {
  const rows = [];
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function(wh) {
    const id = WAREHOUSE_SHEET_IDS[wh];
    if (!id) return;
    try {
      // อ่านทุกแท็บที่ขึ้นต้น "History" (History = ปกติ, "History Colgate"/"History Chaindrite" = แคตตาล็อกย่อย)
      SpreadsheetApp.openById(id).getSheets().forEach(function(sh) {
        const nm = sh.getName();
        if (nm !== 'History' && nm.indexOf('History ') !== 0) return;
        const catalog = nm === 'History' ? '' : nm.slice(8).trim();  // "History ".length = 8
        const data = sh.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          const r = data[i];
          rows.push({
            savedAt:       String(r[0]  || ''),
            warehouse:     String(r[1]  || ''),
            empId:         String(r[2]  || ''),
            counterName:   String(r[3]  || ''),
            sessionStart:  String(r[4]  || ''),
            email:         String(r[5]  || ''),
            key:           String(r[6]  || ''),
            name:          String(r[7]  || ''),
            cs:            Number(r[8])  || 0,
            bp:            Number(r[9])  || 0,
            pa:            Number(r[10]) || 0,
            ea:            Number(r[11]) || 0,
            countedPieces: Number(r[12]) || 0,
            systemRaw:     String(r[13] || ''),
            systemPieces:  Number(r[14]) || 0,
            diffPieces:    Number(r[15]) || 0,
            diffCSEA:      String(r[16] || ''),
            status:        String(r[17] || ''),
            expiryDate:    String(r[18] || ''),
            countedAt:     String(r[19] || ''),  // v2.6
            catalog:       catalog               // v3.0: Colgate/Chaindrite/'' (จากชื่อแท็บ)
          });
        }
      });
    } catch(_) {}
  });
  rows.sort(function(a, b) { return (b.savedAt || '').localeCompare(a.savedAt || ''); });
  return { ok: true, rows: rows.slice(0, 800) };
}

// อ่านประวัติ "นับเศษ" จากทุกคลัง (แท็บ นับเศษ) — สำหรับชิป "ประวัติเช็คเศษ"
// v3.2: เหลือแท็บ 'นับเศษ' แท็บเดียว (งานนับเศษกับใกล้หมดอายุรวมกันแล้ว)
//        พารามิเตอร์ base ยังคงไว้เผื่อต้องอ่านแท็บ 'ใกล้หมดอายุ' เก่าย้อนหลัง
function getScrapHistory_(base) {
  const PFX = String(base || 'นับเศษ');
  const rows = [];
  Object.keys(WAREHOUSE_SHEET_IDS).forEach(function(wh) {
    const id = WAREHOUSE_SHEET_IDS[wh];
    if (!id) return;
    try {
      SpreadsheetApp.openById(id).getSheets().forEach(function(sh) {
        const nm = sh.getName();
        if (nm !== PFX && nm.indexOf(PFX + ' ') !== 0) return;
        const catalog = nm === PFX ? '' : nm.slice((PFX + ' ').length).trim();
        const data = sh.getDataRange().getValues();
        // SCRAP_HEADERS: savedAt,warehouse,empId,counterName,email,barcode,name,unit,qty,expiryDate,countedAt
        for (let i = 1; i < data.length; i++) {
          const r = data[i];
          rows.push({
            savedAt:     String(r[0]  || ''),
            warehouse:   String(r[1]  || ''),
            empId:       String(r[2]  || ''),
            counterName: String(r[3]  || ''),
            email:       String(r[4]  || ''),
            barcode:     String(r[5]  || ''),
            name:        String(r[6]  || ''),
            unit:        String(r[7]  || ''),
            qty:         Number(r[8]) || 0,
            expiryDate:  String(r[9]  || ''),
            countedAt:   String(r[10] || ''),
            expiryFlag:  String(r[11] || ''),          // v3.2
            expiryDays:  r[12] === '' || r[12] === null || r[12] === undefined
                           ? '' : Number(r[12]),       // v3.2
            catalog:     catalog
          });
        }
      });
    } catch (_) {}
  });
  rows.sort(function(a, b) { return (b.savedAt || '').localeCompare(a.savedAt || ''); });
  return { ok: true, rows: rows.slice(0, 1000) };
}
