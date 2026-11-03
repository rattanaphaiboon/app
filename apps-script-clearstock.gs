/**
 * Rattana ClearStock v1.0 — Apps Script backend
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
  WH_STAFF: ['W4', 'C4'],          // ผู้ใช้คลังที่ "รับทราบ" ได้
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
  APPROVED: 'อนุมัติแล้ว – รอทำในระบบ',
  POSTED: 'ทำในระบบแล้ว – รอยืนยัน PDDT',
  CLOSED: 'ยืนยันใน PDDT แล้ว',
  REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิก',
};

const SH = { DOCS: 'Docs', LINES: 'Lines', LOG: 'Log' };

const DOC_COLS = [
  ['id', 'DocID'], ['kind', 'Kind'], ['typeTh', 'ประเภท'], ['wh', 'คลัง'], ['lineCount', 'จำนวนรายการ'],
  ['status', 'Status'], ['statusTh', 'สถานะ'], ['note', 'หมายเหตุ'],
  ['createdAt', 'สร้างเมื่อ'], ['createdBy', 'ผู้สร้าง'], ['createdEmail', 'อีเมลผู้สร้าง'],
  ['ackAt', 'คลังรับทราบเมื่อ'], ['ackBy', 'คลังรับทราบโดย'], ['ackNote', 'หมายเหตุคลัง'],
  ['approvedAt', 'อนุมัติเมื่อ'], ['approvedBy', 'อนุมัติโดย'], ['approveNote', 'หมายเหตุอนุมัติ'],
  ['rejectedAt', 'ไม่อนุมัติ/ยกเลิกเมื่อ'], ['rejectedBy', 'ไม่อนุมัติ/ยกเลิกโดย'], ['rejectReason', 'เหตุผล'],
  ['postedAt', 'ทำในระบบเมื่อ'], ['postedBy', 'ทำในระบบโดย'], ['bplusDocNo', 'เลขที่เอกสาร Bplus'],
  ['closedAt', 'ยืนยัน PDDT เมื่อ'], ['closedBy', 'ยืนยัน PDDT โดย'], ['pddtSyncAt', 'PDDT sync รอบที่ยืนยัน'],
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
    if (action === 'ping') return json_({ ok: true, version: '1.0' });
    const user = requireUser_(p.email);
    let out;
    switch (action) {
      case 'me':       out = { user: user }; break;
      case 'products': out = getProducts_(p.fresh === true || p.fresh === '1'); break;
      case 'docs':     out = { docs: listDocs_() }; break;
      case 'create':   out = createDocs_(user, p.docs || []); break;
      case 'ack': case 'approve': case 'reject': case 'post': case 'close': case 'cancel':
        out = transition_(user, action, p); break;
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
  const hit = cacheGet_(cache, 'users');
  if (hit) return hit;
  const v = SpreadsheetApp.openById(CFG.USERS_ID).getSheetByName(CFG.USERS_SHEET).getDataRange().getDisplayValues();
  const h = v[0].map(s => String(s).trim());
  const c = n => h.indexOf(n);
  const iE = c('E-mail'), iN = c('ชื่อ - สกุล'), iW = c('W'), iR = c('User Role'), iS = c('Approval Stage'),
        iD = c('แผนก'), iSt = c('Status'), iEmp = c('รหัสพนักงาน');
  const map = {};
  v.slice(1).forEach(r => {
    const em = normEmail_(r[iE]);
    if (!em) return;
    const u = {
      email: em, name: String(r[iN] || '').trim(), w: String(r[iW] || '').trim().toUpperCase(),
      role: parseInt(r[iR], 10) || 1, stage: String(r[iS] || '').trim(), dept: String(r[iD] || '').trim(),
      status: String(r[iSt] || '').trim(), empId: String(r[iEmp] || '').trim(),
    };
    const prev = map[em];
    const active = x => x && x.status.toLowerCase() === 'active';
    if (!prev || (!active(prev) && active(u))) map[em] = u;
  });
  cachePut_(cache, 'users', map, CFG.CACHE_SEC);
  return map;
}

function perms_(u) {
  const stage = String(u.stage || '').toLowerCase();
  const isWh = CFG.WH_STAFF.indexOf(u.w) >= 0;
  const isApprover = stage === 'mgt' || stage === 'all' || u.role >= 5;
  return { create: true, ack: isWh || u.role >= 8, approve: isApprover, post: isWh || isApprover, close: isWh || isApprover };
}

function requireUser_(email) {
  const em = normEmail_(email);
  if (!em) throw new Error('กรุณาเข้าสู่ระบบ');
  const u = getUsers_()[em];
  if (!u) throw new Error('ไม่พบอีเมลนี้ในระบบผู้ใช้ (' + em + ')');
  if (u.status.toLowerCase() !== 'active') throw new Error('บัญชีถูกระงับ — ติดต่อ Admin');
  return Object.assign({}, u, { perms: perms_(u) });
}

// ───────────────────────── PDDT products ─────────────────────────
const PDDT_COLS = ['PRODUCT NAME', 'CODE EA', 'CODE PA', 'CODE BP', 'CODE CS', 'UNIT EA', 'UNIT PA', 'UNIT BP', 'UNIT CS',
  'QTY EA', 'QTY PA', 'QTY BP', 'QTY CS', 'SHORT NAME', 'STOCK W4', 'STOCK C4'];

function getProducts_(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cacheGet_(cache, 'pddt');
    if (hit) return hit;
  }
  const data = readPddt_();
  cachePut_(cache, 'pddt', data, CFG.CACHE_SEC);
  return data;
}

function readPddt_() {
  const sh = SpreadsheetApp.openById(CFG.PDDT_ID).getSheetByName(CFG.PDDT_SHEET);
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  const head = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(s => String(s).trim());
  const idx = PDDT_COLS.map(h => {
    const i = head.indexOf(h);
    if (i < 0) throw new Error('PDDT ไม่พบคอลัมน์ ' + h);
    return i;
  });
  // อ่านเป็นช่วงคอลัมน์ติดกัน ลดจำนวนครั้งที่เรียก API
  const sorted = idx.slice().sort((a, b) => a - b);
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
  const rows = [];
  for (let i = 0; i < n; i++) {
    if (!String(col[idx[0]][i]).trim()) continue;
    rows.push(idx.map(c => String(col[c][i]).trim()));
  }
  return { cols: PDDT_COLS, rows: rows, syncAt: getSyncAt_(), loadedAt: new Date().toISOString() };
}

function getSyncAt_() {
  try {
    const v = SpreadsheetApp.openById(CFG.PDDT_ID).getSheetByName(CFG.SYNC_SHEET).getRange(1, 1, 30, 3).getDisplayValues();
    for (let i = 1; i < v.length; i++) {
      if (String(v[i][1]).toLowerCase() === 'ok' && /Sync \d+ rows/.test(v[i][2])) return v[i][0];
    }
  } catch (_) {}
  return '';
}

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
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    return sh;
  };
  return {
    docs: make(SH.DOCS, DOC_COLS.map(c => c[1])),
    lines: make(SH.LINES, LINE_COLS.map(c => c[1])),
    log: make(SH.LOG, LOG_COLS),
  };
}

/** เรียกครั้งเดียวจากเมนู Run เพื่อสร้างชีทและขอสิทธิ์ */
function setup() {
  ensureSheets_();
  getUsers_();
  Logger.log('PDDT rows: ' + readPddt_().rows.length);
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
        need(P.post, 'คุณไม่มีสิทธิ์บันทึกการทำรายการในระบบ');
        const no = String(p.bplusDocNo || '').trim();
        need(no, 'กรุณาระบุเลขที่เอกสาร Bplus');
        f = { status: 'POSTED', postedAt: now, postedBy: who, bplusDocNo: no }; label = 'ทำในระบบ Bplus';
        break;
      }
      case 'close':
        need(d.status === 'POSTED', 'ต้องทำในระบบ Bplus ก่อนจึงยืนยัน PDDT ได้');
        need(P.close || isCreator, 'คุณไม่มีสิทธิ์ยืนยัน PDDT');
        f = { status: 'CLOSED', closedAt: now, closedBy: who };
        f.pddtSyncAt = snapshotAfter_(s, id, p.fresh === true);
        label = 'ยืนยันใน PDDT';
        break;
    }
    setDocFields_(s, d._row, f);
    log_(s, id, label, user, note || f.bplusDocNo || '');
    return { doc: id, status: f.status };
  } finally {
    lock.releaseLock();
  }
}

/** เก็บสต็อก W4/C4 ปัจจุบันจาก PDDT ลงแต่ละบรรทัด เป็นหลักฐานว่าแก้ไขแล้ว */
function snapshotAfter_(s, docId, fresh) {
  const prod = getProducts_(fresh);
  const map = {};
  prod.rows.forEach(r => {
    [r[1], r[2], r[3], r[4]].forEach(code => { if (code && !map[code]) map[code] = r; });
  });
  const last = s.lines.getLastRow();
  if (last < 2) return prod.syncAt;
  const v = s.lines.getRange(2, 1, last - 1, LINE_COLS.length).getValues();
  const col = k => LINE_COLS.findIndex(c => c[0] === k);
  const cBc = col('barcode'), cQ = col('qtyCs'), cW4e = col('w4Expect'), cC4e = col('c4Expect'),
        cW4a = col('w4After'), cC4a = col('c4After'), cVer = col('verify');
  v.forEach((r, i) => {
    if (r[0] !== docId) return;
    const p = map[String(r[cBc])];
    if (!p) { s.lines.getRange(i + 2, cVer + 1).setValue('ไม่พบใน PDDT'); return; }
    const qcs = parseInt(p[12], 10) || Number(r[cQ]) || 1;
    const w4 = csEaToEa_(p[14], qcs), c4 = csEaToEa_(p[15], qcs);
    const diff = (now, exp) => (exp === '' || exp === null ? null : (now || 0) - Number(exp));
    const dw = diff(w4, r[cW4e]), dc = diff(c4, r[cC4e]);
    const txt = (dw === 0 && dc === 0) ? 'ตรงตามที่ควรเป็น'
      : 'ต่างจากที่ควรเป็น W4 ' + (dw > 0 ? '+' : '') + (dw == null ? '-' : dw) + ' / C4 ' + (dc > 0 ? '+' : '') + (dc == null ? '-' : dc) + ' ชิ้น (อาจมีขาย/รับเข้าระหว่างทาง)';
    s.lines.getRange(i + 2, cW4a + 1, 1, 2).setValues([[w4 === null ? '' : w4, c4 === null ? '' : c4]]);
    s.lines.getRange(i + 2, cVer + 1).setValue(txt);
  });
  return prod.syncAt;
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
