/**
 * ═══════════════════════════════════════════════════════════
 *  Rattana Truck Trip — Backend (Google Apps Script)  v1.0
 *  แอปบันทึกเที่ยววิ่งขนส่ง
 * ═══════════════════════════════════════════════════════════
 *
 *  วิธี deploy:
 *   1. เปิดชีท → ส่วนขยาย → Apps Script → วางไฟล์นี้ทับ Code.gs
 *   2. Deploy → New deployment → Web app
 *        Execute as : Me (surat.rat@rattanaphaiboon.com)
 *        Who has access : Anyone
 *   3. คัดลอก Web app URL (.../exec) ไปวางในแอป → แท็บ "ตั้งค่า"
 *   4. ทุกครั้งที่แก้ไฟล์นี้ ต้อง Deploy → Manage deployments → New version
 *      (แค่กด Save ไม่พอ backend จะยังใช้โค้ดเก่า)
 *
 *  ทดสอบเร็ว: เปิด <WebAppURL>?action=health ในเบราว์เซอร์
 * ═══════════════════════════════════════════════════════════
 */

var CFG = {
  SHEET_ID : '1y7GHi25Kla2KdriSYgbu2gXVwjZStorMo3pqcWhHxXM',
  DATA_GID : 1055864501,        // แท็บ "บรรทุก APP"
  DATA_NAME: 'บรรทุก APP',       // ใช้เมื่อหา gid ไม่เจอ
  LIST_GID : 1583669874,        // แท็บ "List"
  LIST_NAME: 'List',
  TZ       : 'GMT+7',
  MAX_ROWS : 5000               // กันดึงข้อมูลเกินจนช้า
};

/**
 * นิยามคอลัมน์ในแท็บข้อมูล
 * เรียงตาม "ความเฉพาะเจาะจง" — ตัวที่ชื่อยาว/เจาะจงกว่าต้องอยู่ก่อน
 * เพราะรอบจับคู่แบบ substring จะให้ตัวแรกที่เจอจองคอลัมน์ไปก่อน
 * (เช่น "จำนวนงานบรรทุก" ต้องจองก่อน ไม่งั้น "งานบรรทุก" จะไปคว้าคอลัมน์นั้น)
 */
var FIELDS = [
  { key:'id',       header:'ID',            aliases:['id','เลขที่','รหัสรายการ'] },
  { key:'savedAt',  header:'บันทึกเมื่อ',    aliases:['บันทึกเมื่อ','timestamp','ประทับเวลา','วันที่บันทึก'] },
  { key:'user',     header:'ผู้บันทึก',      aliases:['ผู้บันทึก','อีเมลผู้บันทึก','ผู้ใช้'] },
  { key:'qty',      header:'จำนวนงานบรรทุก', aliases:['จำนวนงานบรรทุก','จำนวนงาน','จำนวนเที่ยว','จำนวน'] },
  { key:'transfer', header:'ถ่ายรถ (ถ้ามี)', aliases:['ถ่ายรถ (ถ้ามี)','ถ่ายรถ'] },
  { key:'driver',   header:'ผู้ขับ',        aliases:['ผู้ขับ','ผู้ขับรถ','คนขับ','พนักงานขับรถ'] },
  { key:'crew',     header:'ลูกทีม',        aliases:['ลูกทีม','ผู้ช่วย','เด็กรถ'] },
  { key:'job',      header:'งานบรรทุก',     aliases:['งานบรรทุก','ประเภทงาน','งาน'] },
  { key:'date',     header:'วันที่',        aliases:['วันที่'] }
];

/** ลำดับหัวคอลัมน์ตอนสร้างแท็บใหม่ (ตามลำดับในฟอร์ม) */
var NEW_HEADERS = ['ID','บันทึกเมื่อ','วันที่','ผู้ขับ','ลูกทีม','งานบรรทุก','จำนวนงานบรรทุก','ถ่ายรถ (ถ้ามี)','ผู้บันทึก'];

// ─────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || 'bootstrap';

    if (action === 'health')    return _ok({ ok:true, version:'1.0', ts:new Date().toISOString() });
    if (action === 'bootstrap') return _ok(bootstrap(p));
    if (action === 'list')      return _ok({ rows: listTrips(p) });
    if (action === 'lists')     return _ok(readLists());
    if (action === 'schema')    return _ok(schemaInfo());

    return _err('ไม่รู้จัก action: ' + action);
  } catch (err) {
    return _err(err.message + '\n' + (err.stack || ''));
  }
}

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = d.action;

    if (action === 'create') return _ok(createTrip(d));
    if (action === 'update') return _ok(updateTrip(d));
    if (action === 'delete') return _ok(deleteTrip(d));
    if (action === 'list')   return _ok({ rows: listTrips(d) });

    return _err('ไม่รู้จัก action: ' + action);
  } catch (err) {
    return _err(err.message + '\n' + (err.stack || ''));
  }
}

// ─────────────────────────────────────────────
// CORE
// ─────────────────────────────────────────────
function bootstrap(p) {
  var lists = readLists();
  return {
    rows        : listTrips(p || {}),
    listHeaders : lists.headers,
    lists       : lists.lists,
    schema      : schemaInfo(),
    serverTime  : new Date().toISOString(),
    version     : '1.0'
  };
}

function schemaInfo() {
  var sh  = _tab_(CFG.DATA_GID, CFG.DATA_NAME);
  var m   = _getMap_(sh, false);
  var out = { headers: m.headers, mapped: {}, missing: m.missing };
  FIELDS.forEach(function (f) {
    out.mapped[f.key] = m.map[f.key] ? m.headers[m.map[f.key] - 1] : null;
  });
  return out;
}

function listTrips(p) {
  p = p || {};
  var sh = _tab_(CFG.DATA_GID, CFG.DATA_NAME);
  var m  = _getMap_(sh, false);
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var vals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var from = p.from ? String(p.from) : '';
  var to   = p.to   ? String(p.to)   : '';
  var rows = [];

  for (var r = 0; r < vals.length; r++) {
    var row = vals[r];
    var o = { _row: r + 2 };
    FIELDS.forEach(function (f) {
      var c = m.map[f.key];
      o[f.key] = c ? row[c - 1] : '';
    });

    o.date     = _toISODate_(o.date);
    o.savedAt  = _toISOStamp_(o.savedAt);
    o.qty      = (o.qty === '' || o.qty === null) ? '' : Number(o.qty);
    o.id       = String(o.id || '');
    o.driver   = _s_(o.driver);
    o.crew     = _s_(o.crew);
    o.job      = _s_(o.job);
    o.transfer = _s_(o.transfer);
    o.user     = _s_(o.user);

    // ข้ามแถวว่างสนิท
    if (!o.date && !o.driver && !o.job && !o.crew && o.qty === '' && !o.transfer) continue;
    if (from && o.date && o.date < from) continue;
    if (to   && o.date && o.date > to)   continue;

    rows.push(o);
  }

  // ใหม่สุดขึ้นก่อน
  rows.sort(function (a, b) {
    var d = String(b.date || '').localeCompare(String(a.date || ''));
    if (d !== 0) return d;
    return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
  });

  return rows.slice(0, CFG.MAX_ROWS);
}

function createTrip(d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    _validate_(d);
    var sh = _tab_(CFG.DATA_GID, CFG.DATA_NAME);
    var m  = _getMap_(sh, true);   // true = สร้างคอลัมน์ที่ขาดให้อัตโนมัติ

    var id  = 'TR' + Utilities.formatDate(new Date(), CFG.TZ, 'yyyyMMddHHmmss') +
              '-' + Utilities.getUuid().replace(/-/g, '').substring(0, 5).toUpperCase();
    var rowIdx  = sh.getLastRow() + 1;
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var line    = new Array(lastCol).fill('');

    var payload = {
      id       : id,
      savedAt  : new Date(),
      date     : _toDateObj_(d.date),
      driver   : _s_(d.driver),
      crew     : _s_(d.crew),
      job      : _s_(d.job),
      qty      : _num_(d.qty),
      transfer : _s_(d.transfer),
      user     : _s_(d.user)
    };
    FIELDS.forEach(function (f) {
      var c = m.map[f.key];
      if (c) line[c - 1] = payload[f.key];
    });

    sh.getRange(rowIdx, 1, 1, lastCol).setValues([line]);
    return { id: id, row: rowIdx };
  } finally {
    lock.releaseLock();
  }
}

function updateTrip(d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!d.id) throw new Error('ไม่พบ ID ของรายการที่จะแก้ไข');
    _validate_(d);
    var sh  = _tab_(CFG.DATA_GID, CFG.DATA_NAME);
    var m   = _getMap_(sh, true);
    var row = _findRowById_(sh, m, d.id);
    if (!row) throw new Error('ไม่พบรายการ ' + d.id + ' (อาจถูกลบไปแล้ว)');

    var upd = {
      date     : _toDateObj_(d.date),
      driver   : _s_(d.driver),
      crew     : _s_(d.crew),
      job      : _s_(d.job),
      qty      : _num_(d.qty),
      transfer : _s_(d.transfer)
    };
    Object.keys(upd).forEach(function (k) {
      var c = m.map[k];
      if (c) sh.getRange(row, c).setValue(upd[k]);
    });
    if (m.map.user && d.user) sh.getRange(row, m.map.user).setValue(_s_(d.user));

    return { id: d.id, row: row };
  } finally {
    lock.releaseLock();
  }
}

function deleteTrip(d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!d.id) throw new Error('ไม่พบ ID ของรายการที่จะลบ');
    var sh  = _tab_(CFG.DATA_GID, CFG.DATA_NAME);
    var m   = _getMap_(sh, false);
    var row = _findRowById_(sh, m, d.id);
    if (!row) throw new Error('ไม่พบรายการ ' + d.id + ' (อาจถูกลบไปแล้ว)');
    sh.deleteRow(row);
    return { id: d.id, deleted: true };
  } finally {
    lock.releaseLock();
  }
}

/** อ่านแท็บ List — หัวคอลัมน์ = ชื่อชุดข้อมูล, ค่าใต้หัว = ตัวเลือก */
function readLists() {
  var sh = _tab_(CFG.LIST_GID, CFG.LIST_NAME);
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { headers: [], lists: {} };

  var vals    = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = vals[0].map(function (h) { return _s_(h); });
  var lists   = {}, out = [];

  headers.forEach(function (h, i) {
    if (!h) return;
    var seen = {}, arr = [];
    for (var r = 1; r < vals.length; r++) {
      var v = vals[r][i];
      if (v instanceof Date) v = Utilities.formatDate(v, CFG.TZ, 'yyyy-MM-dd');
      v = _s_(v);
      if (!v || seen[v]) continue;
      seen[v] = 1;
      arr.push(v);
    }
    lists[h] = arr;
    out.push(h);
  });

  return { headers: out, lists: lists };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function _tab_(gid, name) {
  var ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  var byGid = ss.getSheets().filter(function (s) { return s.getSheetId() === gid; })[0];
  if (byGid) return byGid;

  var byName = ss.getSheetByName(name);
  if (byName) return byName;

  // เผื่อชื่อแท็บมีช่องว่าง/อักขระซ่อนไม่ตรงเป๊ะ
  var n = _norm_(name);
  var loose = ss.getSheets().filter(function (s) { return _norm_(s.getName()) === n; })[0];
  if (loose) return loose;

  throw new Error('ไม่พบแท็บ "' + name + '" (gid ' + gid + ') ในชีทนี้');
}

/**
 * จับคู่หัวคอลัมน์กับ field
 * รอบ 1: ตรงเป๊ะ (หลัง normalize)  รอบ 2: มีคำนั้นอยู่ในหัวคอลัมน์
 * create=true → คอลัมน์ไหนไม่มี ต่อท้ายหัวตารางให้เลย
 */
function _getMap_(sh, create) {
  var lastCol = sh.getLastColumn();
  var headers = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(_s_) : [];

  // แท็บว่างเปล่า → วางหัวตารางมาตรฐาน
  if (create && headers.filter(Boolean).length === 0) {
    sh.getRange(1, 1, 1, NEW_HEADERS.length).setValues([NEW_HEADERS]);
    sh.getRange(1, 1, 1, NEW_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
    headers = NEW_HEADERS.slice();
    lastCol = NEW_HEADERS.length;
  }

  var norm    = headers.map(_norm_);
  var map     = {}, claimed = {}, missing = [];

  // รอบ 1 — ตรงเป๊ะ
  FIELDS.forEach(function (f) {
    for (var a = 0; a < f.aliases.length; a++) {
      var target = _norm_(f.aliases[a]);
      for (var i = 0; i < norm.length; i++) {
        if (claimed[i] || !norm[i]) continue;
        if (norm[i] === target) { map[f.key] = i + 1; claimed[i] = 1; return; }
      }
    }
  });

  // รอบ 2 — บางส่วน (alias ยาว ≥ 3 ตัวอักษรเท่านั้น กันจับมั่ว)
  FIELDS.forEach(function (f) {
    if (map[f.key]) return;
    for (var a = 0; a < f.aliases.length; a++) {
      var target = _norm_(f.aliases[a]);
      if (target.length < 3) continue;
      for (var i = 0; i < norm.length; i++) {
        if (claimed[i] || !norm[i]) continue;
        if (norm[i].indexOf(target) !== -1) { map[f.key] = i + 1; claimed[i] = 1; return; }
      }
    }
  });

  // ยังขาด → สร้างต่อท้าย (เฉพาะตอนเขียนข้อมูล)
  FIELDS.forEach(function (f) {
    if (map[f.key]) return;
    if (create) {
      lastCol += 1;
      sh.getRange(1, lastCol).setValue(f.header).setFontWeight('bold');
      headers[lastCol - 1] = f.header;
      map[f.key] = lastCol;
    } else {
      missing.push(f.header);
    }
  });

  return { map: map, headers: headers, missing: missing };
}

function _findRowById_(sh, m, id) {
  var col = m.map.id;
  if (!col) return 0;
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  var vals = sh.getRange(2, col, lastRow - 1, 1).getValues();
  var want = String(id).trim();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === want) return i + 2;
  }
  return 0;
}

function _validate_(d) {
  if (!_s_(d.date)) throw new Error('กรุณาระบุวันที่');
  if (!_s_(d.job))  throw new Error('กรุณาระบุงานบรรทุก');
  var q = _s_(d.qty);
  if (q !== '' && (isNaN(Number(q)) || Number(q) < 0)) {
    throw new Error('จำนวนงานบรรทุกต้องเป็นตัวเลขไม่ติดลบ');
  }
}

function _s_(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function _norm_(v) {
  return _s_(v).replace(/\s+/g, ' ').toLowerCase();
}

function _num_(v) {
  var s = _s_(v);
  if (s === '') return '';
  var n = Number(s);
  return isNaN(n) ? s : n;
}

/** 'yyyy-mm-dd' → Date (เที่ยงวัน กัน timezone เลื่อนวัน) */
function _toDateObj_(v) {
  var s = _s_(v);
  if (!s) return '';
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : d;
}

/** ค่าจากชีท → 'yyyy-mm-dd' (รองรับ Date, ISO, d/m/yyyy และปี พ.ศ.) */
function _toISODate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TZ, 'yyyy-MM-dd');
  var s = _s_(v);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    var y = Number(m[3]);
    if (y > 2400) y -= 543;                       // พ.ศ. → ค.ศ.
    return _pad4_(y) + '-' + _pad2_(m[2]) + '-' + _pad2_(m[1]);
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, CFG.TZ, 'yyyy-MM-dd');
}

function _toISOStamp_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TZ, "yyyy-MM-dd'T'HH:mm:ss");
  return _s_(v);
}

function _pad2_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
function _pad4_(n) { n = String(n); while (n.length < 4) n = '0' + n; return n; }

function _ok(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
function _err(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(msg) }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────
// เครื่องมือตรวจสอบ — รันจาก Apps Script editor ได้เลย
// ─────────────────────────────────────────────
/** ดูว่าระบบจับคู่คอลัมน์ในแท็บข้อมูลถูกไหม + แท็บ List อ่านได้กี่ชุด */
function TEST_schema() {
  var s = schemaInfo();
  Logger.log('หัวคอลัมน์ที่เจอ: ' + JSON.stringify(s.headers));
  Logger.log('จับคู่ได้: ' + JSON.stringify(s.mapped));
  Logger.log('ยังไม่มีในชีท (จะถูกสร้างตอนบันทึกครั้งแรก): ' + JSON.stringify(s.missing));
  var l = readLists();
  Logger.log('แท็บ List มีคอลัมน์: ' + JSON.stringify(l.headers));
  l.headers.forEach(function (h) {
    Logger.log('  • ' + h + ' = ' + l.lists[h].length + ' รายการ → ' + l.lists[h].slice(0, 5).join(', '));
  });
}

/** ดูข้อมูล 5 แถวล่าสุดที่อ่านได้ */
function TEST_list() {
  var rows = listTrips({});
  Logger.log('อ่านได้ ' + rows.length + ' แถว');
  Logger.log(JSON.stringify(rows.slice(0, 5), null, 2));
}
