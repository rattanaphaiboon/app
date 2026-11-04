/**
 * Rattana ClearStock v1.16 — Apps Script backend
 * ผูกกับไฟล์บันทึก: "เทียบสต็อก W4-C4 Claude app"
 *   https://docs.google.com/spreadsheets/d/1t3vu5I3y-tWDKDL_-l7M3igmBarG2KKJC9LZcaw0U4s
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me   |   Who has access: Anyone
 * แล้วนำ Web app URL ไปใส่ GAS_URL ใน rattana-clearstock.html
 */

const CFG = {
  PDDT_ID: '16mYDqAqqJma-_0vCIAajy6bcjdOZ7F6VagxkdkqAB2I',
  PDDT_SHEET: 'PDDT',
  SYNC_SHEET: '_SyncStatus',
  USERS_ID: '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ',
  USERS_SHEET: 'Sheet1',
  LOG_ID: '1t3vu5I3y-tWDKDL_-l7M3igmBarG2KKJC9LZcaw0U4s',   // ไฟล์บันทึก (ใช้เมื่อเป็น standalone script)
  LOC_ID: '1OmdfoSmPPA3ueKn624AU-WY6BJxS5iSS4e5YlPgl5nk', LOC_SHEET: 'Claude',   // Product Location Rattana Mart (พิกัด C4)
  WH_STAFF: ['W4', 'C4'],          // ผู้ใช้คลังที่ "รับทราบ" ได้
  ADJ_EMAILS: ['natthiya.mai@rattanaphaiboon.com'],   // ผู้ปรับสต็อกใน Bplus + แนบเอกสาร (ขั้นสุดท้าย)
  FOLDER_NAME: 'ClearStock – เอกสารปรับสต็อก',        // โฟลเดอร์ Drive เก็บไฟล์แนบ
  MAX_FILE_MB: 10,
  TZ: 'Asia/Bangkok',
  CACHE_SEC: 600,
};

const KINDS = {
  TR_W4_C4: { type: 'TRANSFER', th: 'ใบโอนย้าย', wh: 'W4 → C4', from: 'W4', to: 'C4' },
  TR_C4_W4: { type: 'TRANSFER', th: 'ใบโอนย้าย', wh: 'C4 → W4', from: 'C4', to: 'W4' },
  AJ_W4:    { type: 'ADJUST',   th: 'ขอปรับสต็อก', wh: 'W4', adj: 'W4' },
  AJ_C4:    { type: 'ADJUST',   th: 'ขอปรับสต็อก', wh: 'C4', adj: 'C4' },
};

const STATUS_TH = {
  PENDING_ACK: 'รอคลังรับทราบ',
  PENDING_APPROVAL: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว – รอปรับสต็อก',
  POSTED: 'ปรับสต็อกแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิก',
};

const SH = { DOCS: 'Docs', LINES: 'Lines', LOG: 'Log', CHECKS: 'Checks' };

const DOC_COLS = [
  ['id', 'DocID'], ['kind', 'Kind'], ['typeTh', 'ประเภท'], ['wh', 'คลัง'], ['lineCount', 'จำนวนรายการ'],
  ['status', 'Status'], ['statusTh', 'สถานะ'], ['note', 'หมายเหตุ'],
  ['createdAt', 'สร้างเมื่อ'], ['createdBy', 'ผู้สร้าง'], ['createdEmail', 'อีเมลผู้สร้าง'],
  ['ackAt', 'คลังรับทราบเมื่อ'], ['ackBy', 'คลังรับทราบโดย'], ['ackNote', 'หมายเหตุคลัง'],
  ['approvedAt', 'อนุมัติเมื่อ'], ['approvedBy', 'อนุมัติโดย'], ['approveNote', 'หมายเหตุอนุมัติ'],
  ['rejectedAt', 'ไม่อนุมัติ/ยกเลิกเมื่อ'], ['rejectedBy', 'ไม่อนุมัติ/ยกเลิกโดย'], ['rejectReason', 'เหตุผล'],
  ['postedAt', 'ปรับสต็อกเมื่อ'], ['postedBy', 'ปรับสต็อกโดย'], ['bplusDocNo', 'เลขที่เอกสาร Bplus'],
  ['files', 'ไฟล์เอกสาร (ลิงก์)'], ['postNote', 'หมายเหตุปรับสต็อก'], ['pddtSyncAt', 'PDDT sync ตอนปรับสต็อก'],
  ['updatedAt', 'อัปเดตล่าสุด'],
];

const LINE_COLS = [
  ['docId', 'DocID'], ['no', 'ลำดับ'], ['barcode', 'บาร์โค้ด'], ['name', 'ชื่อสินค้า'],
  ['unitCs', 'หน่วยลัง'], ['qtyCs', 'ชิ้น/ลัง'], ['qty', 'จำนวน (ชิ้น)'], ['qtyCsEa', 'จำนวน (ลัง.ชิ้น)'],
  ['w4Before', 'W4 ระบบก่อนแก้ (ชิ้น)'], ['c4Before', 'C4 ระบบก่อนแก้ (ชิ้น)'],
  ['w4Count', 'W4 นับจริง (ชิ้น)'], ['c4Count', 'C4 นับจริง (ชิ้น)'],
  ['w4Expect', 'W4 ที่ควรเป็นหลังแก้ (ชิ้น)'], ['c4Expect', 'C4 ที่ควรเป็นหลังแก้ (ชิ้น)'],
  ['w4After', 'W4 ใน PDDT ตอนยืนยัน (ชิ้น)'], ['c4After', 'C4 ใน PDDT ตอนยืนยัน (ชิ้น)'],
  ['verify', 'ผลตรวจ PDDT'], ['reason', 'เหตุผล'],
];

const LOG_COLS = ['เวลา', 'DocID', 'การกระทำ', 'โดย', 'อีเมล', 'รายละเอียด'];

// คำขอเช็คสต็อก: คลังหนึ่งนับแล้วขอให้อีกคลังนับสินค้าตัวเดียวกัน แล้วเอามาเทียบ (จำนวนเป็นชิ้นทั้งหมด)
const CHECK_COLS = [
  ['id', 'CheckID'], ['status', 'Status'], ['statusTh', 'สถานะ'],
  ['barcode', 'บาร์โค้ด'], ['name', 'ชื่อสินค้า'], ['unitCs', 'หน่วยลัง'], ['qtyCs', 'ชิ้น/ลัง'],
  ['reqWh', 'คลังที่ขอ'], ['ansWh', 'คลังที่ต้องเช็ค'],
  ['reqAt', 'ขอเมื่อ'], ['reqBy', 'ขอโดย'], ['reqEmail', 'ผู้ขอ (id)'],
  ['reqCount', 'คลังที่ขอ นับได้ (ชิ้น)'], ['reqSys', 'คลังที่ขอ ระบบตอนนับ (ชิ้น)'], ['reqStockAt', 'สต็อก ณ (ตอนขอ)'], ['note', 'หมายเหตุ'],
  ['ansAt', 'เช็คเมื่อ'], ['ansBy', 'เช็คโดย'], ['ansEmail', 'ผู้เช็ค (id)'],
  ['ansCount', 'คลังที่เช็ค นับได้ (ชิ้น)'], ['ansSys', 'คลังที่เช็ค ระบบตอนนับ (ชิ้น)'], ['ansStockAt', 'สต็อก ณ (ตอนเช็ค)'],
  ['closedAt', 'ปิดเมื่อ'], ['closedBy', 'ปิดโดย'], ['docIds', 'เอกสารแก้ไข'], ['updatedAt', 'อัปเดตล่าสุด'],
];
const CHECK_TH = {
  PENDING: 'รออีกคลังเช็ค', ANSWERED: 'เช็คครบแล้ว · รอสรุป', FIXED: 'ส่งเอกสารแก้ไขแล้ว',
  MATCH: 'ตรงกัน · ปิดเรื่อง', CLOSED: 'ปิดเรื่อง (ไม่แก้ไข)', CANCELLED: 'ยกเลิก',
};
const CHECK_EXPIRE_DAYS = 3;

// ───────────────────────── entry points ─────────────────────────
function doGet(e) { return handle_((e && e.parameter) || {}); }
function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (_) {}
  return handle_(p);
}

function handle_(p) {
  try {
    const action = String(p.action || '');
    if (action === 'ping') return json_({ ok: true, version: '1.16' });
    if (action === 'users') return json_({ ok: true, users: listUsers_() });
    if (action === 'login') return json_({ ok: true, user: loginByUid_(p.uid) });
    const user = requireUser_(p.email);
    let out;
    switch (action) {
      case 'me':       out = { user: user }; break;
      case 'products': out = getProducts_(p.fresh === true || p.fresh === '1'); break;
      case 'docs':     out = { docs: listDocs_() }; break;
      case 'sync':     out = { sync: getSyncInfo_() }; break;
      case 'locs':     out = getLocs_(); break;
      case 'prices':
        if (!user.perms.post) throw new Error('เฉพาะผู้ได้รับมอบหมายเท่านั้นที่ปรับสต็อกได้');
        out = { prices: getPrices_(p.codes) }; break;
      case 'create':   out = createDocs_(user, p.docs || []); break;
      case 'ack': case 'approve': case 'reject': case 'post': case 'cancel':
        out = transition_(user, action, p); break;
      case 'checks':     out = { checks: listChecks_(user) }; break;
      case 'checkReq':   out = checkReq_(user, p); break;
      case 'checkAns':   out = checkAns_(user, p); break;
      case 'checkClose': out = checkClose_(user, p); break;
      default: throw new Error('ไม่รู้จักคำสั่ง: ' + action);
    }
    return json_(Object.assign({ ok: true }, out));
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────── users & permissions ─────────────────────────
const normEmail_ = s => String(s || '').replace(/[​‌‍﻿]/g, '').replace(/\s+/g, '').toLowerCase();

function getUsers_() {
  const cache = CacheService.getScriptCache();
  const hit = cacheGet_(cache, 'users19');
  if (hit) return hit;
  const v = SpreadsheetApp.openById(CFG.USERS_ID).getSheetByName(CFG.USERS_SHEET).getDataRange().getDisplayValues();
  const h = v[0].map(s => String(s).trim());
  const c = n => h.indexOf(n);
  const iE = c('E-mail'), iN = c('ชื่อ - สกุล'), iW = c('W'), iR = c('User Role'), iS = c('Approval Stage'),
        iD = c('แผนก'), iSt = c('Status'), iEmp = c('รหัสพนักงาน'), iNk = c('ชื่อเล่น');
  const rows = v.slice(1).map(r => {
    const mail = normEmail_(r[iE]);
    return {
      mail: mail.indexOf('@') > 0 ? mail : '', name: String(r[iN] || '').trim(), w: String(r[iW] || '').trim().toUpperCase(),
      role: parseInt(r[iR], 10) || 1, stage: String(r[iS] || '').trim(), dept: String(r[iD] || '').trim(),
      status: String(r[iSt] || '').trim(), empId: String(r[iEmp] || '').trim(),
      nick: iNk >= 0 ? String(r[iNk] || '').trim() : '',
    };
  }).filter(u => u.mail || u.name);
  // ตัวระบุผู้ใช้ (เก็บใน field email ให้โค้ดส่วนอื่นใช้ต่อได้) = อีเมล ถ้ามีและไม่ได้ใช้ร่วมกับคนชื่ออื่น
  // ไม่มีอีเมล / อีเมลกลางที่หลายคนใช้ → emp:รหัสพนักงาน หรือ name:ชื่อ
  const namesByMail = {};
  rows.forEach(u => { if (u.mail) (namesByMail[u.mail] = namesByMail[u.mail] || {})[u.name] = 1; });
  const map = {};
  const active = x => x && x.status.toLowerCase() === 'active';
  rows.forEach(u => {
    const shared = u.mail && Object.keys(namesByMail[u.mail]).length > 1;
    const key = u.mail && !shared ? u.mail : normEmail_(u.empId ? 'emp:' + u.empId : 'name:' + u.name);
    u.email = key; u.uid = uid_(key);
    const prev = map[key];
    if (!prev || (!active(prev) && active(u))) map[key] = u;
  });
  cachePut_(cache, 'users19', map, CFG.CACHE_SEC);
  return map;
}

/** รหัสแทนอีเมลในหน้าเลือกชื่อ — รายชื่อเปิดให้ดูก่อนล็อกอิน จึงไม่ส่งอีเมลออกไป */
function uid_(email) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, 'clearstock:' + email)
    .slice(0, 6).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

/** หน้าเลือกชื่อ: ทุกคนที่ Active เรียงตามชื่อ (ไม่ส่งอีเมลออกไป) */
function listUsers_() {
  const map = getUsers_();
  return Object.keys(map).map(k => map[k])
    .filter(u => u.status.toLowerCase() === 'active' && u.name)
    .map(u => ({ uid: u.uid, name: u.name, nick: u.nick, dept: u.dept, w: u.w, emp: u.empId }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));
}

function loginByUid_(uid) {
  const map = getUsers_();
  const em = Object.keys(map).filter(k => map[k].uid === String(uid || ''))[0];
  if (!em) throw new Error('ไม่พบชื่อนี้ในระบบ — กดโหลดรายชื่อใหม่');
  return requireUser_(em);
}

function perms_(u) {
  const stage = String(u.stage || '').toLowerCase();
  const isWh = CFG.WH_STAFF.indexOf(u.w) >= 0;
  const isApprover = stage === 'mgt' || stage === 'all' || u.role >= 5;
  const isAdj = CFG.ADJ_EMAILS.map(normEmail_).indexOf(u.mail) >= 0;
  return { create: true, ack: isWh || u.role >= 8, approve: isApprover, post: isAdj };
}

function requireUser_(email) {
  const em = normEmail_(email);
  if (!em) throw new Error('กรุณาเข้าสู่ระบบ');
  const u = getUsers_()[em];
  if (!u) throw new Error('ไม่พบชื่อนี้ในระบบผู้ใช้ — กรุณาเลือกชื่อใหม่');
  if (u.status.toLowerCase() !== 'active') throw new Error('บัญชีถูกระงับ — ติดต่อ Admin');
  return Object.assign({}, u, { perms: perms_(u) });
}

// ───────────────────────── PDDT products ─────────────────────────
const PDDT_COLS = ['PRODUCT NAME', 'CODE EA', 'CODE PA', 'CODE BP', 'CODE CS', 'UNIT EA', 'UNIT PA', 'UNIT BP', 'UNIT CS',
  'QTY EA', 'QTY PA', 'QTY BP', 'QTY CS', 'SHORT NAME', 'STOCK W4', 'STOCK C4', 'SKU_USAGE'];
const PDDT_OPTIONAL = ['SKU_USAGE'];   // รูปสินค้า (ลิงก์ Google Drive) — ไม่มีคอลัมน์ก็ไม่ error

/** ลิงก์ Drive / lh3 / id เปล่า → file id ; อื่น ๆ → '' */
function driveId_(u) {
  u = String(u || '').trim().replace(/^["']+|["']+$/g, '');
  if (!u || u.charAt(0) === '#') return '';
  if (/^[\w-]{25,60}$/.test(u)) return u;
  const m = u.match(/\/d\/([\w-]{25,60})/) || u.match(/[?&]id=([\w-]{25,60})/);
  return m ? m[1] : '';
}

function getProducts_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cacheGet_(cache, 'pddt');
    // Stocksync ลงรอบใหม่แล้ว → ทิ้ง cache เก่าทันที ไม่ต้องรอหมดอายุ
    if (hit && hit.syncAt === getSyncAt_()) { hit.sync = getSyncInfo_(); return hit; }
  }
  const data = readPddt_();
  cachePut_(cache, 'pddt', data, CFG.CACHE_SEC);
  return data;
}

/** พิกัดสินค้า (ชีท Product Location แท็บ Claude) → { map: { บาร์โค้ด: [โลเคชัน, ...] } }
 *  บาร์โค้ดในชีทเป็นหน่วยไหนก็ได้ — แอปรวมพิกัดจากทุกบาร์โค้ดของสินค้าเอง */
function getLocs_() {
  const cache = CacheService.getScriptCache();
  const hit = cacheGet_(cache, 'locs');
  if (hit) return hit;
  const v = SpreadsheetApp.openById(CFG.LOC_ID).getSheetByName(CFG.LOC_SHEET).getDataRange().getDisplayValues();
  const h = v[0].map(s => String(s).trim()), iL = h.indexOf('โลเคชัน'), iB = h.indexOf('บาร์โค้ด');
  if (iL < 0 || iB < 0) throw new Error('ชีทพิกัดไม่พบคอลัมน์ โลเคชัน / บาร์โค้ด');
  const map = {};
  v.slice(1).forEach(r => {
    const loc = String(r[iL]).trim(), bc = String(r[iB]).trim();
    if (!loc || !bc) return;
    const a = map[bc] = map[bc] || [];
    if (a.indexOf(loc) < 0) a.push(loc);
  });
  const out = { map: map, rows: v.length - 1, loadedAt: new Date().toISOString() };
  cachePut_(cache, 'locs', out, CFG.CACHE_SEC);
  return out;
}

/** ราคาต่อหน่วย (PRICE CC00 ของหน่วยที่บาร์โค้ดนั้นเป็น) สำหรับไฟล์นำเข้า Bplus → { barcode: ราคา }
 *  readPddt_ เก็บตารางราคาไว้ใน cache ทุกครั้งที่อ่าน PDDT (ใช้ได้จนกว่า Stocksync จะลงรอบใหม่)
 *  — อ่านชีทใหม่ทุกครั้งใช้เวลาเป็นนาที */
let LAST_PRICES_ = null;
function getPrices_(codes) {
  const cache = CacheService.getScriptCache();
  let hit = cacheGet_(cache, 'prices');
  if (!hit || hit.syncAt !== getSyncAt_()) { getProducts_(true); hit = cacheGet_(cache, 'prices') || LAST_PRICES_ || { map: {} }; }
  const out = {};
  (codes || []).forEach(c => { c = String(c || '').trim(); if (c && c in hit.map) out[c] = hit.map[c]; });
  return out;
}

function readPddt_() {
  const sh = SpreadsheetApp.openById(CFG.PDDT_ID).getSheetByName(CFG.PDDT_SHEET);
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  const head = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(s => String(s).trim());
  const idx = PDDT_COLS.map(h => {
    const i = head.indexOf(h);
    if (i < 0 && PDDT_OPTIONAL.indexOf(h) < 0) throw new Error('PDDT ไม่พบคอลัมน์ ' + h);
    return i;
  });
  const pIdx = ['EA', 'PA', 'BP', 'CS'].map(u => [head.indexOf('CODE ' + u), head.indexOf('PRICE CC00 ' + u)]);
  // อ่านเป็นช่วงคอลัมน์ติดกัน ลดจำนวนครั้งที่เรียก API
  const sorted = idx.concat(pIdx.map(x => x[1])).filter((c, i, a) => c >= 0 && a.indexOf(c) === i).sort((a, b) => a - b);
  const runs = [];
  sorted.forEach(c => {
    const r = runs[runs.length - 1];
    if (r && c - r.end <= 4) r.end = c; else runs.push({ start: c, end: c });
  });
  const n = lastRow - 1, col = {};
  runs.forEach(r => {
    const vals = sh.getRange(2, r.start + 1, n, r.end - r.start + 1).getDisplayValues();
    for (let c = r.start; c <= r.end; c++) col[c] = vals.map(row => row[c - r.start]);
  });
  const iImg = PDDT_COLS.indexOf('SKU_USAGE');
  const rows = [];
  for (let i = 0; i < n; i++) {
    if (!String(col[idx[0]][i]).trim()) continue;
    const row = idx.map(c => (c < 0 ? '' : String(col[c][i]).trim()));
    row[iImg] = driveId_(row[iImg]);   // ส่งแค่ file id ให้ข้อมูลเล็กลง
    rows.push(row);
  }
  const sync = getSyncInfo_();
  const prices = {};
  pIdx.forEach(([ci, pi]) => {
    if (ci < 0 || pi < 0) return;
    for (let i = 0; i < n; i++) {
      const c = String(col[ci][i]).trim();
      if (c && !(c in prices)) prices[c] = Number(String(col[pi][i]).replace(/,/g, '')) || 0;
    }
  });
  LAST_PRICES_ = { syncAt: sync.syncAt, map: prices };
  cachePut_(CacheService.getScriptCache(), 'prices', LAST_PRICES_, 21600);
  return { cols: PDDT_COLS, rows: rows, syncAt: sync.syncAt, sync: sync, loadedAt: new Date().toISOString() };
}

/** อ่าน log ของ Stocksync (_SyncStatus) — แถวบนสุด = ล่าสุด
 *  syncAt  = เวลาที่ลงชีท PDDT เสร็จ
 *  stockAt = เวลาที่ Bplus ส่งไฟล์สต็อก ("file modified") = สต็อก ณ เวลานั้นจริง
 *  checkedAt = รอบที่ระบบเข้ามาเช็คล่าสุด (แม้ไม่มีไฟล์ใหม่) */
function getSyncInfo_() {
  const out = { syncAt: '', stockAt: '', rows: 0, checkedAt: '', history: [] };
  try {
    const v = SpreadsheetApp.openById(CFG.PDDT_ID).getSheetByName(CFG.SYNC_SHEET).getRange(1, 1, 60, 3).getDisplayValues();
    for (let i = 1; i < v.length; i++) {
      const ts = String(v[i][0]).trim(), ok = String(v[i][1]).toLowerCase() === 'ok', msg = String(v[i][2]);
      if (!ts) continue;
      if (!out.checkedAt && ok && !/Cleanup/.test(msg)) out.checkedAt = ts;
      const m = ok && msg.match(/Sync (\d+) rows/);
      if (!m) continue;
      const f = msg.match(/file modified ([\d\/]+ [\d:]+)/);
      const h = { syncAt: ts, stockAt: f ? f[1] : ts, rows: Number(m[1]) };
      if (!out.syncAt) Object.assign(out, h);
      if (out.history.length < 8) out.history.push(h);
    }
  } catch (_) {}
  return out;
}

function getSyncAt_() { return getSyncInfo_().syncAt; }

/** "3.14" (CS.EA ของ Bplus) → จำนวนชิ้นรวม ; ว่าง → null */
function csEaToEa_(s, qcs) {
  s = String(s == null ? '' : s).trim();
  if (!s) return null;
  const neg = s.charAt(0) === '-';
  if (neg) s = s.slice(1);
  const parts = s.split('.');
  const q = qcs > 0 ? qcs : 1;
  const tot = (parseInt(parts[0] || '0', 10) || 0) * q + (parseInt(parts[1] || '0', 10) || 0);
  return neg ? -tot : tot;
}

function eaToCsEa_(ea, qcs) {
  if (ea === null || ea === '' || ea === undefined) return '';
  const q = qcs > 0 ? qcs : 1, a = Math.abs(ea);
  return (ea < 0 ? '-' : '') + Math.floor(a / q) + '.' + (a % q);
}

// ───────────────────────── record sheets ─────────────────────────
function book_() { return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(CFG.LOG_ID); }

function ensureSheets_() {
  const ss = book_();
  const make = (name, headers) => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      const blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1');
      if (name === SH.DOCS && blank && blank.getLastRow() === 0) { sh = blank; sh.setName(name); }
      else sh = ss.insertSheet(name);
    }
    const hr = sh.getRange(1, 1, 1, headers.length);
    if (sh.getLastRow() === 0 || hr.getDisplayValues()[0].join('|') !== headers.join('|')) {
      hr.setValues([headers]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    return sh;
  };
  return {
    docs: make(SH.DOCS, DOC_COLS.map(c => c[1])),
    lines: make(SH.LINES, LINE_COLS.map(c => c[1])),
    log: make(SH.LOG, LOG_COLS),
    checks: make(SH.CHECKS, CHECK_COLS.map(c => c[1])),
  };
}

/** เรียกครั้งเดียวจากเมนู Run เพื่อสร้างชีทและขอสิทธิ์ */
function setup() {
  ensureSheets_();
  getUsers_();
  Logger.log('PDDT rows: ' + readPddt_().rows.length);
  Logger.log('โฟลเดอร์เอกสาร: ' + folder_().getUrl());
}

/** โฟลเดอร์ Drive สำหรับไฟล์แนบ (สร้างครั้งแรกแล้วจำ id ไว้) */
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (_) {} }
  const f = DriveApp.createFolder(CFG.FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

/** files = [{ name, type, data (base64) }] → ลิงก์ไฟล์ใน Drive */
function saveFiles_(docId, files) {
  const dir = folder_();
  return files.map((f, i) => {
    const bytes = Utilities.base64Decode(String(f.data || ''));
    if (!bytes.length) throw new Error('ไฟล์ว่าง: ' + f.name);
    if (bytes.length > CFG.MAX_FILE_MB * 1048576) throw new Error('ไฟล์ใหญ่เกิน ' + CFG.MAX_FILE_MB + ' MB: ' + f.name);
    const name = docId + '_' + (i + 1) + '_' + String(f.name || 'file').replace(/[\\/:*?"<>|]/g, '_');
    const file = dir.createFile(Utilities.newBlob(bytes, f.type || 'application/octet-stream', name));
    try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
    return file.getUrl();
  });
}

const iso_ = v => (v instanceof Date ? v.toISOString() : v);

function readTable_(sh, cols) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const v = sh.getRange(2, 1, last - 1, cols.length).getValues();
  return v.map((r, i) => {
    const o = { _row: i + 2 };
    cols.forEach((c, j) => { o[c[0]] = iso_(r[j]); });
    return o;
  });
}

function listDocs_() {
  const s = ensureSheets_();
  const docs = readTable_(s.docs, DOC_COLS).filter(d => d.id);
  const lines = readTable_(s.lines, LINE_COLS).filter(l => l.docId);
  const byDoc = {};
  lines.forEach(l => { delete l._row; (byDoc[l.docId] = byDoc[l.docId] || []).push(l); });
  docs.forEach(d => { delete d._row; d.lines = (byDoc[d.id] || []).sort((a, b) => a.no - b.no); });
  docs.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return docs.slice(0, 500);
}

function nextId_(sheet, prefix) {
  const now = new Date();
  const be = (Number(Utilities.formatDate(now, CFG.TZ, 'yyyy')) + 543) % 100;
  const base = prefix + '-' + ('0' + be).slice(-2) + Utilities.formatDate(now, CFG.TZ, 'MMdd') + '-';
  let max = 0;
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(r => {
      const id = String(r[0]);
      if (id.indexOf(base) === 0) max = Math.max(max, parseInt(id.slice(base.length), 10) || 0);
    });
  }
  return base + ('00' + (max + 1)).slice(-3);
}

function log_(s, docId, action, user, detail) {
  s.log.appendRow([new Date(), docId, action, user.name || user.email, user.email, detail || '']);
}

const numOrBlank_ = v => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? '' : Number(v));

function createDocs_(user, docs) {
  if (!docs.length) throw new Error('ไม่มีรายการ');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = ensureSheets_();
    const ids = [];
    docs.forEach(d => {
      const k = KINDS[d.kind];
      if (!k) throw new Error('ประเภทเอกสารไม่ถูกต้อง: ' + d.kind);
      const lines = (d.lines || []).filter(l => l && l.barcode && Number(l.qty));
      if (!lines.length) return;
      const id = nextId_(s.docs, k.type === 'TRANSFER' ? 'TR' : 'AJ');
      const now = new Date();
      const doc = {
        id: id, kind: d.kind, typeTh: k.th, wh: k.wh, lineCount: lines.length,
        status: 'PENDING_ACK', statusTh: STATUS_TH.PENDING_ACK, note: String(d.note || ''),
        createdAt: now, createdBy: user.name || user.email, createdEmail: user.email, updatedAt: now,
      };
      s.docs.appendRow(DOC_COLS.map(c => (doc[c[0]] === undefined ? '' : doc[c[0]])));
      const rows = lines.map((l, i) => {
        let qty = Math.round(Number(l.qty));
        if (k.type === 'TRANSFER') qty = Math.abs(qty);
        const qcs = Number(l.qtyCs) || 1;
        const w4 = numOrBlank_(l.w4Before), c4 = numOrBlank_(l.c4Before);
        let dW4 = 0, dC4 = 0;
        if (d.kind === 'TR_W4_C4') { dW4 = -qty; dC4 = qty; }
        if (d.kind === 'TR_C4_W4') { dW4 = qty; dC4 = -qty; }
        if (d.kind === 'AJ_W4') dW4 = qty;
        if (d.kind === 'AJ_C4') dC4 = qty;
        const line = {
          docId: id, no: i + 1, barcode: "'" + String(l.barcode), name: String(l.name || ''),
          unitCs: String(l.unitCs || ''), qtyCs: qcs, qty: qty, qtyCsEa: "'" + eaToCsEa_(qty, qcs),
          w4Before: w4, c4Before: c4, w4Count: numOrBlank_(l.w4Count), c4Count: numOrBlank_(l.c4Count),
          w4Expect: w4 === '' ? '' : w4 + dW4, c4Expect: c4 === '' ? '' : c4 + dC4,
          w4After: '', c4After: '', verify: '', reason: String(l.reason || ''),
        };
        return LINE_COLS.map(c => line[c[0]]);
      });
      s.lines.getRange(s.lines.getLastRow() + 1, 1, rows.length, LINE_COLS.length).setValues(rows);
      log_(s, id, 'สร้างเอกสาร', user, k.th + ' ' + k.wh + ' · ' + lines.length + ' รายการ');
      ids.push(id);
    });
    return { ids: ids };
  } finally {
    lock.releaseLock();
  }
}

// ───────────────────────── คำขอเช็คสต็อก ─────────────────────────
const otherWh_ = w => (w === 'W4' ? 'C4' : 'W4');
const myWh_ = u => (CFG.WH_STAFF.indexOf(u.w) >= 0 ? u.w : '');

/** 30 วันล่าสุด · คำขอที่ยังรอเช็คจะซ่อนตัวเลขที่ผู้ขอนับไว้ (กันอีกฝั่งนับตาม) — ยกเว้นผู้ขอเอง */
function listChecks_(user) {
  const s = ensureSheets_();
  const since = Date.now() - 30 * 864e5, expire = Date.now() - CHECK_EXPIRE_DAYS * 864e5;
  return readTable_(s.checks, CHECK_COLS).filter(c => c.id && new Date(c.reqAt).getTime() >= since).map(c => {
    delete c._row;
    c.barcode = String(c.barcode);
    if (c.status === 'PENDING' && new Date(c.reqAt).getTime() < expire) c.expired = true;
    if (c.status === 'PENDING' && normEmail_(c.reqEmail) !== user.email) c.reqCount = '';
    return c;
  }).sort((a, b) => String(b.reqAt).localeCompare(String(a.reqAt)));
}

function checkReq_(user, p) {
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  // พนักงาน W4 / C4 ขอได้เฉพาะคลังตัวเอง · คนอื่น (เช่น HQ ที่ไปนับเอง) ระบุคลังที่นับมาได้
  const wh = myWh_(user) || String(p.wh || '');
  need(CFG.WH_STAFF.indexOf(wh) >= 0, 'กรุณาระบุคลังที่นับ (W4 หรือ C4)');
  const barcode = String(p.barcode || '').trim(), count = Number(p.count);
  need(barcode, 'ไม่มีบาร์โค้ดสินค้า');
  need(p.count !== '' && p.count !== null && isFinite(count) && count >= 0, 'กรุณากรอกจำนวนที่นับได้ของ ' + wh);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = ensureSheets_();
    const ans = otherWh_(wh);
    const dup = readTable_(s.checks, CHECK_COLS).some(c => c.status === 'PENDING' && String(c.barcode) === barcode && c.ansWh === ans);
    need(!dup, 'สินค้านี้มีคำขอให้ ' + ans + ' เช็คค้างอยู่แล้ว');
    const id = nextId_(s.checks, 'CK'), now = new Date();
    const c = {
      id: id, status: 'PENDING', statusTh: CHECK_TH.PENDING, barcode: "'" + barcode, name: String(p.name || ''),
      unitCs: String(p.unitCs || ''), qtyCs: Number(p.qtyCs) || 1, reqWh: wh, ansWh: ans,
      reqAt: now, reqBy: user.name || user.email, reqEmail: user.email, reqCount: Math.round(count),
      reqSys: numOrBlank_(p.sys), reqStockAt: String(p.stockAt || ''), note: String(p.note || ''), updatedAt: now,
    };
    s.checks.appendRow(CHECK_COLS.map(k => (c[k[0]] === undefined ? '' : c[k[0]])));
    log_(s, id, 'ขอเช็คสต็อก', user, wh + ' นับ ' + c.reqCount + ' ชิ้น → ขอให้ ' + ans + ' เช็ค · ' + c.name);
    return { id: id };
  } finally { lock.releaseLock(); }
}

function findCheck_(s, id) {
  const c = readTable_(s.checks, CHECK_COLS).find(x => x.id === id);
  if (!c) throw new Error('ไม่พบคำขอเช็ค ' + id);
  return c;
}
function setCheckFields_(s, row, f) {
  f.updatedAt = new Date();
  if (f.status) f.statusTh = CHECK_TH[f.status];
  CHECK_COLS.forEach((k, j) => { if (f[k[0]] !== undefined) s.checks.getRange(row, j + 1).setValue(f[k[0]]); });
}

function checkAns_(user, p) {
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  const count = Number(p.count);
  need(p.count !== '' && p.count !== null && isFinite(count) && count >= 0, 'กรุณากรอกจำนวนที่นับได้');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = ensureSheets_();
    const c = findCheck_(s, String(p.id || ''));
    need(c.status === 'PENDING', 'คำขอนี้ไม่ได้รอเช็คแล้ว');
    need(myWh_(user) === c.ansWh || user.role >= 8, 'เฉพาะพนักงานคลัง ' + c.ansWh + ' เท่านั้นที่เช็คได้');
    need(normEmail_(c.reqEmail) !== user.email, 'ผู้ขอเช็คต้องให้อีกคลังเป็นคนนับ');
    setCheckFields_(s, c._row, {
      status: 'ANSWERED', ansAt: new Date(), ansBy: user.name || user.email, ansEmail: user.email,
      ansCount: Math.round(count), ansSys: numOrBlank_(p.sys), ansStockAt: String(p.stockAt || ''),
    });
    log_(s, c.id, 'เช็คสต็อก', user, c.ansWh + ' นับ ' + Math.round(count) + ' ชิ้น · ' + c.name);
    return { id: c.id };
  } finally { lock.releaseLock(); }
}

/** result: FIXED (สร้างเอกสารแก้ไขจาก p.docs) · MATCH · CLOSED · CANCELLED (ผู้ขอยกเลิกก่อนมีคนเช็ค) */
function checkClose_(user, p) {
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  const result = String(p.result || '');
  need(['FIXED', 'MATCH', 'CLOSED', 'CANCELLED'].indexOf(result) >= 0, 'ผลไม่ถูกต้อง');
  const s0 = ensureSheets_();
  const c0 = findCheck_(s0, String(p.id || ''));
  const mine = normEmail_(c0.reqEmail) === user.email || normEmail_(c0.ansEmail) === user.email || user.role >= 8;
  if (result === 'CANCELLED') need(c0.status === 'PENDING' && (normEmail_(c0.reqEmail) === user.email || user.role >= 8), 'ยกเลิกได้เฉพาะผู้ขอ ก่อนอีกคลังเช็ค');
  else need(c0.status === 'ANSWERED' && mine, 'ปิดเรื่องได้เฉพาะผู้ขอ / ผู้เช็ค หลังเช็คครบแล้ว');
  let ids = [];
  if (result === 'FIXED') {
    const docs = Array.isArray(p.docs) ? p.docs : [];
    need(docs.length, 'ไม่มีรายการแก้ไข');
    ids = createDocs_(user, docs).ids;
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = ensureSheets_();
    const c = findCheck_(s, c0.id);
    need(c.status === c0.status, 'คำขอนี้ถูกอัปเดตไปแล้ว — โหลดใหม่');
    setCheckFields_(s, c._row, { status: result, closedAt: new Date(), closedBy: user.name || user.email, docIds: ids.join(', ') });
    log_(s, c.id, CHECK_TH[result], user, ids.length ? 'สร้าง ' + ids.join(', ') : '');
    return { id: c.id, ids: ids };
  } finally { lock.releaseLock(); }
}

function findDoc_(s, id) {
  const docs = readTable_(s.docs, DOC_COLS);
  const d = docs.find(x => x.id === id);
  if (!d) throw new Error('ไม่พบเอกสาร ' + id);
  return d;
}

function setDocFields_(s, row, fields) {
  fields.updatedAt = new Date();
  if (fields.status) fields.statusTh = STATUS_TH[fields.status];
  DOC_COLS.forEach((c, j) => {
    if (fields[c[0]] !== undefined) s.docs.getRange(row, j + 1).setValue(fields[c[0]]);
  });
}

function transition_(user, action, p) {
  const id = String(p.docId || '');
  const note = String(p.note || '').trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const s = ensureSheets_();
    const d = findDoc_(s, id);
    const P = user.perms, now = new Date(), who = user.name || user.email;
    const isCreator = normEmail_(d.createdEmail) === user.email;
    const need = (cond, msg) => { if (!cond) throw new Error(msg); };
    let f, label;
    switch (action) {
      case 'ack':
        need(d.status === 'PENDING_ACK', 'เอกสารไม่ได้อยู่ในขั้นรอคลังรับทราบ');
        need(P.ack, 'เฉพาะพนักงานคลัง W4 / C4 เท่านั้นที่รับทราบได้');
        f = { status: 'PENDING_APPROVAL', ackAt: now, ackBy: who, ackNote: note }; label = 'คลังรับทราบ';
        break;
      case 'approve':
        need(d.status === 'PENDING_APPROVAL', 'เอกสารไม่ได้อยู่ในขั้นรออนุมัติ');
        need(P.approve, 'เฉพาะหัวหน้า/ผู้บริหารเท่านั้นที่อนุมัติได้');
        need(!isCreator, 'ผู้สร้างเอกสารอนุมัติเอกสารของตัวเองไม่ได้');
        f = { status: 'APPROVED', approvedAt: now, approvedBy: who, approveNote: note }; label = 'อนุมัติ';
        break;
      case 'reject':
        need(d.status === 'PENDING_ACK' || d.status === 'PENDING_APPROVAL', 'เอกสารนี้ไม่สามารถไม่อนุมัติได้แล้ว');
        need(d.status === 'PENDING_ACK' ? (P.ack || P.approve) : P.approve, 'คุณไม่มีสิทธิ์ไม่อนุมัติเอกสารนี้');
        need(note, 'กรุณาระบุเหตุผล');
        f = { status: 'REJECTED', rejectedAt: now, rejectedBy: who, rejectReason: note }; label = 'ไม่อนุมัติ';
        break;
      case 'cancel':
        need(d.status === 'PENDING_ACK' || d.status === 'PENDING_APPROVAL', 'ยกเลิกได้เฉพาะก่อนอนุมัติ');
        need(isCreator, 'เฉพาะผู้สร้างเอกสารเท่านั้นที่ยกเลิกได้');
        f = { status: 'CANCELLED', rejectedAt: now, rejectedBy: who, rejectReason: note || 'ยกเลิกโดยผู้สร้าง' }; label = 'ยกเลิก';
        break;
      case 'post': {
        need(d.status === 'APPROVED', 'เอกสารยังไม่ได้รับอนุมัติ');
        need(P.post, 'เฉพาะผู้ได้รับมอบหมายเท่านั้นที่ปรับสต็อกได้');
        const files = Array.isArray(p.files) ? p.files : [];
        need(files.length, 'กรุณาแนบเอกสารอย่างน้อย 1 ไฟล์');
        const urls = saveFiles_(id, files);
        f = { status: 'POSTED', postedAt: now, postedBy: who, bplusDocNo: String(p.bplusDocNo || '').trim(),
              files: urls.join('\n'), postNote: note, pddtSyncAt: getSyncAt_() };
        label = 'ปรับสต็อก';
        break;
      }
    }
    setDocFields_(s, d._row, f);
    log_(s, id, label, user, [note, f.bplusDocNo, f.files ? f.files.split('\n').length + ' ไฟล์' : ''].filter(Boolean).join(' · '));
    return { doc: id, status: f.status };
  } finally {
    lock.releaseLock();
  }
}

// ───────────────────────── chunked gzip cache ─────────────────────────
function cachePut_(cache, key, obj, ttl) {
  try {
    const gz = Utilities.gzip(Utilities.newBlob(JSON.stringify(obj), 'application/json'));
    const b64 = Utilities.base64Encode(gz.getBytes());
    const size = 90000, n = Math.ceil(b64.length / size), map = {};
    for (let i = 0; i < n; i++) map[key + '_' + i] = b64.substr(i * size, size);
    map[key + '_n'] = String(n);
    cache.putAll(map, ttl);
  } catch (_) {}
}

function cacheGet_(cache, key) {
  try {
    const n = Number(cache.get(key + '_n'));
    if (!n) return null;
    const keys = [];
    for (let i = 0; i < n; i++) keys.push(key + '_' + i);
    const got = cache.getAll(keys);
    let b64 = '';
    for (let i = 0; i < keys.length; i++) {
      if (got[keys[i]] == null) return null;
      b64 += got[keys[i]];
    }
    const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip');
    return JSON.parse(Utilities.ungzip(blob).getDataAsString('utf-8'));
  } catch (_) {
    return null;
  }
}
