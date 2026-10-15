// Rattana 7 วันแรก — หลังบ้าน (Google Apps Script) v2.0
// พนักงานใหม่ลงทะเบียนด้วยเบอร์โทร → เช็คอินเข้างานด้วย GPS 7 วันแรก (ต้องอยู่ในพิกัดที่ทำงานเท่านั้น)
// + ตอบแบบประเมินการสอนงาน 3 ข้อ รอบวันที่ 3 และวันที่ 7 · ฝ่ายบุคคลติดตามผล
//
// ══════════════ วิธีติดตั้ง / อัปเดต ══════════════
//  1. เปิดชีต "Rattana 7 วันแรก" ▸ ส่วนขยาย (Extensions) ▸ Apps Script → ลบโค้ดเดิม วางไฟล์นี้ทั้งไฟล์ → Ctrl+S
//  2. เลือกฟังก์ชัน setupSheet ▸ Run (ถ้าขอสิทธิ์เพิ่ม — กดอนุญาต) → Execution log ต้องขึ้น "พร้อมใช้งาน" + จำนวนจุดพิกัด
//  3. Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy   (URL เดิม ไม่ต้องส่งใหม่)
//     ครั้งแรก: Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me / Who has access: Anyone (ทุกคน)
//  เช็คว่าติดแล้ว: เปิด URL ต่อท้าย ?action=ping → ต้องเห็น "version":"2.0"
//
//  ตัวเลือก (Project Settings ▸ Script Properties):
//    ALERT_EMAILS = hr@rattanaphaiboon.com, …  ← อีเมลเตือนทันทีเมื่อน้องใหม่ "เสี่ยงสูง" + สรุปรายวัน (ถ้าเปิด)
//  สรุปรายวัน (ไม่บังคับ): Run setupDailyTrigger ครั้งเดียว → ทุกวัน 10 โมง ส่งรายชื่อน้องใหม่ที่ยังไม่เช็คอินวันนี้

var VERSION = '2.0';
var REG_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ';    // ทะเบียนพนักงาน — ใช้ตรวจสิทธิ์ล็อกอินของ HR เท่านั้น
var STRUCT_SHEET_ID = '1tkJoaZj72MG9HIOkd-uM_Tvng-l2uqH61jUwqqiRTMI'; // ชีต "โครงสร้าง" — พิกัด/รัศมีที่ทำงาน + ตำแหน่งงาน
var CLIENT_ID = '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com';
var APP_URL = 'https://rattanaphaiboon.github.io/app/rattana-first7.html';
var SESSION_TTL = 21600;   // session หน้า HR 6 ชม.
var TRACK_DAYS = 7;        // เช็คอินติดตาม 7 วันแรก (วันเริ่มงาน = วันที่ 1)
var MAX_DAYS = 45;         // ตอบแบบประเมินได้ถึงวันที่ 45 (เผื่อตอบช้า)
var GPS_GRACE = 50;        // ยอมให้คลาดเคลื่อนตามความแม่น GPS ได้ไม่เกิน 50 ม. (แบบเดียวกับแอปเช็คอิน PC)
var DEFAULT_RADIUS = 100;

var PROV = { W1: 'สมุทรสงคราม', W2: 'สุพรรณบุรี', W3: 'ราชบุรี', W4: 'นครปฐม' };
// ใช้เมื่ออ่านชีตโครงสร้างไม่ได้เท่านั้น (ค่าจริงอยู่ในชีต แก้ที่ชีตได้เลย)
var SITES_FALLBACK = [
  { w: 'W1', name: 'สมุทรสงคราม', lat: 13.44186936, lng: 100.0391679, r: 100 },
  { w: 'W2', name: 'สุพรรณบุรี', lat: 14.63180863, lng: 100.1503435, r: 100 },
  { w: 'W3', name: 'ราชบุรี', lat: 13.52949214, lng: 99.84715447, r: 100 },
  { w: 'W4', name: 'นครปฐม', lat: 13.95458495, lng: 100.0558413, r: 100 }
];

// ข้อความต้องตรงกับฝั่งหน้าเว็บ (TAUGHT / HELPS ใน rattana-first7.html)
var TAUGHT = { full: 'สอนแล้ว เข้าใจงาน', part: 'สอนบ้าง ยังไม่ครบ', none: 'ยังไม่มีใครสอน' };
var HELPS = ['สอนงานเพิ่ม', 'อุปกรณ์/เครื่องมือ', 'เพื่อนร่วมงาน/หัวหน้า', 'เวลา/กะ/วันหยุด', 'เงินเดือน/สวัสดิการ', 'เดินทาง/ที่พัก'];
var RISK = { red: 'เสี่ยงสูง', yellow: 'ต้องดูแล', green: 'ปกติ' };

// ── แท็บ "ลงทะเบียน" (เลขคอลัมน์ตายตัว) ──
var REG_TAB = 'ลงทะเบียน';
var R_ID = 1, R_TS = 2, R_NAME = 3, R_PHONE = 4, R_POS = 5, R_W = 6, R_START = 7, R_KEY = 8, R_STATUS = 9,
    R_EMPCODE = 10, R_UA = 11, R_NOTE = 12;
var R_HEAD = ['รหัสลงทะเบียน', 'เวลาลงทะเบียน', 'ชื่อ - นามสกุล', 'เบอร์โทร', 'ตำแหน่ง', 'จังหวัด', 'วันเริ่มงาน',
              'รหัสเข้าใช้ (ห้ามแก้)', 'สถานะ', 'รหัสพนักงาน', 'อุปกรณ์', 'หมายเหตุ HR'];
// ── แท็บ "เช็คอิน" ──
var CHK_TAB = 'เช็คอิน';
var K_TS = 1, K_ID = 2, K_NAME = 3, K_PHONE = 4, K_W = 5, K_DATE = 6, K_DAY = 7, K_LAT = 8, K_LNG = 9, K_ACC = 10,
    K_DIST = 11, K_SITE = 12, K_OK = 13, K_UA = 14;
var K_HEAD = ['เวลา', 'รหัสลงทะเบียน', 'ชื่อ - นามสกุล', 'เบอร์โทร', 'จังหวัด', 'วันที่', 'ทำงานวันที่', 'ละติจูด', 'ลองติจูด',
              'ความแม่น GPS (ม.)', 'ระยะจากที่ทำงาน (ม.)', 'จุดที่ใกล้สุด', 'ผล', 'อุปกรณ์'];
// ── แท็บ "คำตอบ" (คอลัมน์เดิมจาก v1 — ไม่เลื่อน) ──
var RESP_SHEET = 'คำตอบ';
var C_ID = 1, C_TS = 2, C_CODE = 3, C_NAME = 4, C_NICK = 5, C_W = 6, C_DEPT = 7, C_SUP = 8, C_START = 9,
    C_DAY = 10, C_ROUND = 11, C_TAUGHT = 12, C_TEACHER = 13, C_READY = 14, C_STAY = 15, C_HELP = 16,
    C_COMMENT = 17, C_RISK = 18, C_UA = 19, C_HANDLED = 20, C_HBY = 21, C_HAT = 22, C_HNOTE = 23,
    C_TOPICS = 24, C_LEARN = 25;
var C_HEAD = ['รหัสรายการ', 'เวลา', 'รหัสลงทะเบียน', 'ชื่อ - สกุล', 'เบอร์โทร', 'จังหวัด', 'ตำแหน่ง', 'หัวหน้างาน',
              'วันเริ่มงาน', 'ทำงานวันที่', 'รอบ', '1. การสอนงาน', 'ผู้สอนงาน (ชื่อ)', '2. ความพร้อมทำงาน (1-5)',
              '3. ความรู้สึก/อยากทำงานต่อ (1-5)', 'อยากให้ HR ช่วย', 'ความคิดเห็น', 'ระดับความเสี่ยง',
              'อุปกรณ์', 'ติดตามแล้ว', 'ผู้ติดตาม', 'เวลาติดตาม', 'บันทึกการช่วยเหลือ',
              'สอนงานเรื่องอะไร', 'อยากเรียนรู้อะไรเพิ่ม'];

// ───────────────────────── เครื่องมือทั่วไป ─────────────────────────
function json_(obj) {
  obj.version = VERSION;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(s) {
  return String(s == null ? '' : s).replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
function norm_(s) { return clean_(s).toLowerCase(); }
function ymd_(d) { return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd'); }
function hm_(d) { return Utilities.formatDate(d, 'Asia/Bangkok', 'HH.mm'); }
function cellYmd_(v) { return v instanceof Date ? ymd_(v) : clean_(v); }
function utcOf_(ymd) { var a = String(ymd).split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
// ทำงานวันที่เท่าไร (วันเริ่มงาน = วันที่ 1) ตามเวลาไทย
function dayNo_(start) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '')) return 0;
  return Math.floor((utcOf_(ymd_(new Date())) - utcOf_(start)) / 864e5) + 1;
}
// วันที่ 3–6 = รอบวันที่ 3 (ตอบช้าได้ถึงวันที่ 6) · วันที่ 7 ขึ้นไป = รอบวันที่ 7
function roundOf_(day) { return day && day <= 6 ? 'วันที่ 3' : 'วันที่ 7'; }
function riskOf_(taught, ready, stay, helps) {
  if (taught === 'none' || stay <= 2) return 'red';
  if (taught === 'part' || ready <= 2 || stay === 3 || helps.length) return 'yellow';
  return 'green';
}
// เบอร์โทร → 0xxxxxxxxx (ตัดขีด/ช่องว่าง, +66 → 0)
function phone_(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (/^66\d{9}$/.test(d)) d = '0' + d.slice(2);
  return /^0\d{8,9}$/.test(d) ? d : '';
}
function distM_(lat1, lng1, lat2, lng2) {
  var R = 6371000, rad = Math.PI / 180;
  var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getTab_(name, head, widths, textCols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (!head.every(function (h, i) { return cur[i] === h; })) {
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    try {
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff').setWrap(true);
      (widths || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
      var n = Math.max(sh.getMaxRows() - 1, 1);
      (textCols || []).forEach(function (c) { sh.getRange(2, c, n, 1).setNumberFormat('@'); });
    } catch (e) { /* จัดรูปแบบไม่ได้ก็ไม่เป็นไร */ }
  }
  return sh;
}
function regSheet_() { return getTab_(REG_TAB, R_HEAD, [130, 140, 200, 110, 200, 110, 100, 120, 90, 100, 160, 240], [R_PHONE, R_START, R_KEY, R_EMPCODE]); }
function chkSheet_() { return getTab_(CHK_TAB, K_HEAD, [140, 130, 200, 110, 110, 100, 80, 100, 100, 90, 100, 200, 90, 160], [K_PHONE, K_DATE]); }
function respSheet_() {
  return getTab_(RESP_SHEET, C_HEAD, [110, 140, 130, 190, 110, 100, 160, 140, 95, 70, 70, 140, 160, 90, 90, 220, 300, 90, 150, 70, 150, 140, 260, 300, 300],
                 [C_CODE, C_NICK, C_START]);
}
function rows_(sh, n) {
  var last = sh.getLastRow();
  return last < 2 ? [] : sh.getRange(2, 1, last - 1, n).getValues();
}

// ───────────────────────── จุดพิกัดที่ทำงาน (ชีตโครงสร้าง) ─────────────────────────
// แถวที่มี ละติจูด/ลองติจูด → นับเป็นจุดของจังหวัด ถ้าคอลัมน์ "สาขา" = ชื่อจังหวัด หรือ "ที่อยู่" มี "จังหวัด<ชื่อ>"
// (เช่น ลาดใหญ่/บายพาส อยู่สมุทรสงคราม, รัตนมาร์ท ดอนตูม อยู่นครปฐม) · พิกัดซ้ำยุบเหลือจุดเดียว
function sites_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('f7_sites_v2');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var out = [];
  try {
    var sh = SpreadsheetApp.openById(STRUCT_SHEET_ID).getSheets()[0];
    var v = sh.getDataRange().getValues(), H = {};
    v[0].forEach(function (h, i) { h = clean_(h); if (h && !(h in H)) H[h] = i; });
    var iCo = H['ชื่อบริษัท'], iBr = H['สาขา'], iLat = H['ละติจูด'], iLng = H['ลองติจูด'], iR = H['ในระยะ'], iAd = H['ที่อยู่'];
    var seen = {};
    for (var r = 1; r < v.length; r++) {
      var lat = parseFloat(v[r][iLat]), lng = parseFloat(v[r][iLng]);
      if (!(lat && lng)) continue;
      var br = clean_(v[r][iBr]), ad = iAd >= 0 ? clean_(v[r][iAd]) : '';
      var rad = parseFloat(v[r][iR]) || DEFAULT_RADIUS;
      for (var w in PROV) {
        if (br !== PROV[w] && ad.indexOf('จังหวัด' + PROV[w]) < 0) continue;
        var k = w + lat.toFixed(5) + ',' + lng.toFixed(5);
        if (seen[k]) { if (seen[k].name.indexOf(br) < 0) seen[k].name += ' / ' + br; continue; }
        seen[k] = { w: w, name: br || PROV[w], lat: lat, lng: lng, r: rad };
        out.push(seen[k]);
      }
    }
  } catch (e) { out = []; }
  if (!out.length) out = SITES_FALLBACK;
  try { cache.put('f7_sites_v2', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
function provSites_(w) { return sites_().filter(function (s) { return s.w === w; }); }

// ───────────────────────── ทะเบียนน้องใหม่ (ลงทะเบียนด้วยเบอร์โทร) ─────────────────────────
function regObj_(row) {
  return {
    id: String(row[R_ID - 1] || ''), ts: row[R_TS - 1] instanceof Date ? row[R_TS - 1].toISOString() : String(row[R_TS - 1] || ''),
    name: clean_(row[R_NAME - 1]), phone: phone_(row[R_PHONE - 1]) || clean_(row[R_PHONE - 1]), pos: clean_(row[R_POS - 1]),
    w: clean_(row[R_W - 1]).toUpperCase(), start: cellYmd_(row[R_START - 1]), status: clean_(row[R_STATUS - 1]) || 'ทำงานอยู่',
    empCode: clean_(row[R_EMPCODE - 1]), note: clean_(row[R_NOTE - 1])
  };
}
// R_W เก็บรหัส W1–W4 ไว้หน้าข้อความ เช่น "W1 สมุทรสงคราม" → อ่านกลับแค่รหัส
function wOf_(cell) { var m = clean_(cell).toUpperCase().match(/^W\d/); return m ? m[0] : ''; }
function findReg_(by, val) {
  var sh = regSheet_(), v = rows_(sh, R_HEAD.length);
  for (var i = v.length - 1; i >= 0; i--) {
    var o = regObj_(v[i]); o.w = wOf_(v[i][R_W - 1]);
    if ((by === 'phone' && o.phone === val) || (by === 'id' && o.id === val))
      return { row: i + 2, reg: o, key: String(v[i][R_KEY - 1] || '') };
  }
  return null;
}
function needReg_(p) {
  var f = findReg_('id', clean_(p.id));
  if (!f || !p.key || f.key !== String(p.key)) throw { relogin: true, message: 'กรุณาเข้าสู่ระบบด้วยเบอร์โทรอีกครั้ง' };
  if (f.reg.status === 'ลาออก') throw { message: 'บัญชีนี้ถูกปิดแล้ว กรุณาติดต่อฝ่ายบุคคล' };
  return f;
}
function checkinsOf_(id) {
  return rows_(chkSheet_(), K_HEAD.length).filter(function (r) { return String(r[K_ID - 1]) === id; }).map(chkObj_);
}
function chkObj_(r) {
  var ts = r[K_TS - 1];
  return { ts: ts instanceof Date ? ts.toISOString() : String(ts || ''), id: String(r[K_ID - 1] || ''),
           name: clean_(r[K_NAME - 1]), phone: clean_(r[K_PHONE - 1]), w: wOf_(r[K_W - 1]),
           lat: Number(r[K_LAT - 1]) || 0, lng: Number(r[K_LNG - 1]) || 0,
           date: cellYmd_(r[K_DATE - 1]), day: Number(r[K_DAY - 1]) || 0, time: ts instanceof Date ? hm_(ts) : '',
           dist: Number(r[K_DIST - 1]) || 0, acc: Number(r[K_ACC - 1]) || 0, site: clean_(r[K_SITE - 1]),
           ok: clean_(r[K_OK - 1]) === 'ผ่าน' };
}
function answeredOf_(id) {
  return rows_(respSheet_(), C_HEAD.length).filter(function (r) { return String(r[C_CODE - 1]) === id; })
    .map(function (r) { return String(r[C_ROUND - 1] || ''); });
}
function me_(f) {
  var g = f.reg, day = dayNo_(g.start);
  return { id: g.id, name: g.name, phone: g.phone, pos: g.pos, w: g.w, prov: PROV[g.w] || '', start: g.start, status: g.status,
           day: day, round: roundOf_(day), today: ymd_(new Date()), trackDays: TRACK_DAYS,
           checkins: checkinsOf_(g.id).filter(function (c) { return c.ok; }), answered: answeredOf_(g.id),
           sites: provSites_(g.w), mates: mates_(g.w) };
}
// รายชื่อพนักงานในจังหวัดเดียวกัน (ชื่อ/ชื่อเล่น/แผนก เท่านั้น) ไว้แนะนำตอนพิมพ์ชื่อคนสอนงาน
function mates_(w) {
  try {
    return getRegistry_().filter(function (m) { return m.w === w; })
      .map(function (m) { return { name: m.name, nick: m.nick, dept: m.dept }; });
  } catch (e) { return []; }
}
function plogin_(p) {
  var ph = phone_(p.phone);
  if (!ph) return { ok: false, error: 'เบอร์โทรไม่ถูกต้อง (ต้องเป็นเบอร์ 10 หลัก ขึ้นต้นด้วย 0)' };
  var f = findReg_('phone', ph);
  if (!f) return { ok: true, notFound: true, phone: ph };
  if (f.reg.status === 'ลาออก') return { ok: false, error: 'เบอร์นี้ถูกปิดการใช้งานแล้ว กรุณาติดต่อฝ่ายบุคคล' };
  return { ok: true, me: me_(f), key: f.key };
}
function register_(p) {
  if (clean_(p.hp)) return { ok: false, error: 'x' };
  var ph = phone_(p.phone), name = clean_(p.name).slice(0, 100), pos = clean_(p.pos).slice(0, 80), w = clean_(p.w).toUpperCase();
  var start = clean_(p.start);
  if (!/\S+\s+\S+/.test(name)) return { ok: false, error: 'กรุณากรอกชื่อและนามสกุล (เว้นวรรคระหว่างชื่อกับนามสกุล)' };
  if (!ph) return { ok: false, error: 'เบอร์โทรไม่ถูกต้อง (ต้องเป็นเบอร์ 10 หลัก ขึ้นต้นด้วย 0)' };
  if (pos.length < 2) return { ok: false, error: 'กรุณาเลือกตำแหน่ง' };
  if (!PROV[w]) return { ok: false, error: 'กรุณาเลือกจังหวัดที่ทำงาน' };
  var d = dayNo_(start);
  if (!d || d > 31 || d < -13) return { ok: false, error: 'วันเริ่มงานไม่ถูกต้อง' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var f = findReg_('phone', ph);
    if (f) return { ok: true, me: me_(f), key: f.key, existed: true };   // เคยลงทะเบียนแล้ว → เข้าสู่ระบบให้เลย
    var id = 'NH' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
    var key = Utilities.getUuid().replace(/-/g, '');
    regSheet_().appendRow([id, new Date(), name, ph, pos, w + ' ' + PROV[w], start, key, 'ทำงานอยู่', '', clean_(p.ua).slice(0, 120), '']);
    SpreadsheetApp.flush();
    return { ok: true, me: me_(findReg_('id', id)), key: key, created: true };
  } finally { lock.releaseLock(); }
}
// เช็คอินเข้างาน — เซิร์ฟเวอร์คำนวณระยะเองจากพิกัดในชีตโครงสร้าง (ไม่เชื่อผลจากเครื่องผู้ใช้)
function checkin_(p) {
  var f = needReg_(p), g = f.reg, day = dayNo_(g.start);
  if (day < 1) return { ok: false, error: 'ยังไม่ถึงวันเริ่มงาน (เริ่ม ' + g.start + ')' };
  if (day > TRACK_DAYS) return { ok: false, error: 'ครบ ' + TRACK_DAYS + ' วันแรกแล้ว ไม่ต้องเช็คอินในแอปนี้แล้วค่ะ' };
  var lat = parseFloat(p.lat), lng = parseFloat(p.lng), acc = Math.round(parseFloat(p.acc) || 0);
  if (!(Math.abs(lat) > 0 && Math.abs(lng) > 0)) return { ok: false, error: 'อ่านตำแหน่ง GPS ไม่ได้' };
  var today = ymd_(new Date());
  var done = checkinsOf_(g.id).filter(function (c) { return c.ok && c.date === today; })[0];
  if (done) return { ok: true, inside: true, already: true, time: done.time, site: done.site, dist: done.dist, me: me_(f) };
  var best = null;
  provSites_(g.w).forEach(function (s) {
    var d = distM_(lat, lng, s.lat, s.lng);
    if (!best || d - s.r < best.d - best.s.r) best = { s: s, d: d };
  });
  if (!best) return { ok: false, error: 'ยังไม่ได้ตั้งพิกัดที่ทำงานของจังหวัดนี้ กรุณาติดต่อฝ่ายบุคคล' };
  var dist = Math.round(best.d), inside = dist - Math.min(acc, GPS_GRACE) <= best.s.r;
  var now = new Date();
  chkSheet_().appendRow([now, g.id, g.name, g.phone, g.w + ' ' + PROV[g.w], today, day, lat, lng, acc, dist, best.s.name,
                         inside ? 'ผ่าน' : 'นอกพื้นที่', clean_(p.ua).slice(0, 120)]);
  return { ok: true, inside: inside, dist: dist, r: best.s.r, acc: acc, site: best.s.name, time: hm_(now), me: inside ? me_(f) : null };
}

// ───────────────────────── รับคำตอบแบบประเมิน ─────────────────────────
function submit_(p) {
  if (clean_(p.hp)) return { ok: true, id: 'x' };
  var g = needReg_(p).reg, day = dayNo_(g.start);
  if (day > MAX_DAYS) return { ok: false, error: 'แบบประเมินนี้สำหรับพนักงานใหม่ในช่วงแรกของการทำงานเท่านั้น' };
  var taught = clean_(p.taught);
  if (!TAUGHT[taught]) return { ok: false, error: 'กรุณาตอบข้อ 1 การสอนงาน' };
  var ready = parseInt(p.ready, 10), stay = parseInt(p.stay, 10);
  if (!(ready >= 1 && ready <= 5)) return { ok: false, error: 'กรุณาตอบข้อ 2 ความพร้อมทำงาน' };
  if (!(stay >= 1 && stay <= 5)) return { ok: false, error: 'กรุณาตอบข้อ 3 ความรู้สึกต่องาน' };
  var teachers = (p.teachers || []).map(function (t) { return clean_(t).replace(/,/g, ' ').slice(0, 60); })
                                    .filter(function (t) { return t.length >= 2; }).slice(0, 5);
  if (taught === 'none') teachers = [];
  else if (!teachers.length) return { ok: false, error: 'กรุณาพิมพ์ชื่อคนที่สอนงานคุณ' };
  var topics = taught === 'none' ? '' : clean_(p.topics).slice(0, 500), learn = clean_(p.learn).slice(0, 500);
  if (taught !== 'none' && topics.length < 3) return { ok: false, error: 'กรุณาพิมพ์ว่าสอนงานเรื่องอะไร' };
  if (taught !== 'full' && learn.length < 3) return { ok: false, error: 'กรุณาพิมพ์ว่าอยากเรียนรู้อะไรเพิ่ม' };
  var helps = (p.helps || []).map(clean_).filter(function (h) { return HELPS.indexOf(h) >= 0; });
  var comment = clean_(p.comment).slice(0, 1000), ua = clean_(p.ua).slice(0, 120);
  var risk = riskOf_(taught, ready, stay, helps), round = roundOf_(day);
  var id = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    respSheet_().appendRow([id, new Date(), g.id, g.name, g.phone, g.w + ' ' + (PROV[g.w] || ''), g.pos, '', g.start,
                            day || '', round, TAUGHT[taught], teachers.join(', '), ready, stay, helps.join(', '),
                            comment, RISK[risk], ua, '', '', '', '', topics, learn]);
  } finally { lock.releaseLock(); }
  try {
    alertRisk_(g, day, round, taught, teachers, ready, stay, helps,
               comment + (topics ? '\n[สอนเรื่อง] ' + topics : '') + (learn ? '\n[อยากเรียนรู้เพิ่ม] ' + learn : ''), risk, id);
  } catch (e) { /* ส่งเมลไม่ได้ ไม่กระทบการบันทึก */ }
  return { ok: true, id: id, risk: risk, round: round, day: day };
}
function alertRisk_(g, day, round, taught, teachers, ready, stay, helps, comment, risk, id) {
  if (risk !== 'red') return;
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  if (!to) return;
  var body = 'พนักงานใหม่ตอบแบบประเมิน 7 วันแรก และอยู่ในกลุ่ม "เสี่ยงสูง" กรุณาติดต่อช่วยเหลือโดยเร็ว\n\n' +
    'พนักงาน: ' + g.name + '  โทร ' + g.phone + '\n' +
    'ตำแหน่ง/จังหวัด: ' + g.pos + ' / ' + (PROV[g.w] || '') + '\n' +
    'เริ่มงาน: ' + g.start + (day ? '  (ทำงานวันที่ ' + day + ')' : '') + ' · รอบ ' + round + '\n\n' +
    '1. การสอนงาน: ' + TAUGHT[taught] + (teachers.length ? ' — สอนโดย ' + teachers.join(', ') : '') + '\n' +
    '2. ความพร้อมทำงาน: ' + ready + '/5\n3. ความรู้สึก/อยากทำงานต่อ: ' + stay + '/5\n' +
    'อยากให้ HR ช่วย: ' + (helps.length ? helps.join(', ') : '-') + '\n\nความคิดเห็น:\n' + (comment || '(ไม่มี)') + '\n\n' +
    'เปิดดูในระบบ: ' + APP_URL + '\nรหัสรายการ: ' + id;
  MailApp.sendEmail({ to: to, subject: '[7 วันแรก] 🔴 น้องใหม่เสี่ยงลาออก — ' + g.name + ' · ' + (PROV[g.w] || ''), body: body, name: 'Rattana 7 วันแรก' });
}

// ───────────────────────── หน้า HR (ล็อกอิน Google) ─────────────────────────
function getRegistry_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('reg_f7_v2');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var sheets = SpreadsheetApp.openById(REG_SHEET_ID).getSheets(), sheet = null, H = {};
  for (var i = 0; i < sheets.length; i++) {
    var hdr = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0].map(clean_);
    if (hdr.indexOf('รหัสพนักงาน') >= 0 && hdr.indexOf('E-mail') >= 0) { sheet = sheets[i]; hdr.forEach(function (h, idx) { if (h && !(h in H)) H[h] = idx; }); break; }
  }
  if (!sheet) throw new Error('ไม่พบแท็บทะเบียนพนักงาน');
  var find = function (re) { for (var k in H) if (re.test(k)) return H[k]; return -1; };
  var iName = find(/^ชื่อ - สกุล$/), iDept = find(/^แผนก$/), iEmail = H['E-mail'], iStatus = find(/^Status$/), iRole = find(/^User Role$/), iW = find(/^W$/),
      iNick = find(/^ชื่อเล่น$/), iQuit = find(/ลาออก/);
  var vals = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), sheet.getLastColumn()).getValues();
  var out = vals.filter(function (r) { return clean_(r[iName]) && !(iQuit >= 0 && clean_(r[iQuit])); }).map(function (r) {
    return { name: clean_(r[iName]), nick: iNick >= 0 ? clean_(r[iNick]) : '', dept: iDept >= 0 ? clean_(r[iDept]) : '', email: norm_(r[iEmail]),
             w: iW >= 0 ? clean_(r[iW]).toUpperCase() : '', status: iStatus >= 0 ? norm_(r[iStatus]) : '', role: iRole >= 0 ? (parseInt(r[iRole], 10) || 1) : 1 };
  });
  try { cache.put('reg_f7_v2', JSON.stringify(out), 600); } catch (e) {}
  return out;
}
function verifyGoogle_(credential) {
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ Google ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
  var info = JSON.parse(res.getContentText());
  if (CLIENT_ID && info.aud !== CLIENT_ID) throw new Error('token ไม่ใช่ของแอป Rattana');
  if (String(info.email_verified) !== 'true') throw new Error('อีเมลนี้ยังไม่ได้ยืนยันกับ Google');
  return norm_(info.email);
}
function canView_(u) { return u.role >= 7 || /บุคคล|HR|บริหาร/i.test(u.dept); }
function login_(credential) {
  var email = verifyGoogle_(credential);
  var u = email ? getRegistry_().filter(function (x) { return x.email === email; })[0] : null;
  if (!u) throw new Error('ไม่พบอีเมล ' + email + ' ในทะเบียนพนักงาน กรุณาติดต่อฝ่ายบุคคล');
  if (u.status !== 'active') throw new Error('บัญชีนี้ยังไม่เปิดใช้งาน (Status ไม่ใช่ Active)');
  if (!canView_(u)) throw new Error('หน้านี้สำหรับฝ่ายบุคคลและผู้บริหารเท่านั้น (ข้อมูลพนักงานใหม่เป็นความลับ)');
  var user = { email: email, name: u.name, dept: u.dept, role: u.role, w: u.w };
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('s_' + token, JSON.stringify(user), SESSION_TTL);
  return { ok: true, token: token, user: user, exp: Date.now() + SESSION_TTL * 1000 };
}
function needAuth_(token) {
  token = String(token || '');
  var raw = /^[0-9a-f]{64}$/.test(token) ? CacheService.getScriptCache().get('s_' + token) : null;
  if (!raw) throw { auth: true, message: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่' };
  return JSON.parse(raw);
}
function keyOf_(map, label) { for (var k in map) if (map[k] === label) return k; return ''; }
function respObj_(row) {
  var ts = row[C_TS - 1], hat = row[C_HAT - 1];
  return {
    id: String(row[C_ID - 1] || ''), ts: ts instanceof Date ? ts.toISOString() : String(ts || ''),
    code: String(row[C_CODE - 1] || ''), name: String(row[C_NAME - 1] || ''), phone: String(row[C_NICK - 1] || ''),
    w: wOf_(row[C_W - 1]), pos: String(row[C_DEPT - 1] || ''), start: cellYmd_(row[C_START - 1]),
    day: Number(row[C_DAY - 1]) || 0, round: String(row[C_ROUND - 1] || ''),
    taught: keyOf_(TAUGHT, String(row[C_TAUGHT - 1] || '')),
    teachers: String(row[C_TEACHER - 1] || '').split(/\s*,\s*/).filter(String),
    ready: Number(row[C_READY - 1]) || 0, stay: Number(row[C_STAY - 1]) || 0,
    helps: String(row[C_HELP - 1] || '').split(/\s*,\s*/).filter(String),
    comment: String(row[C_COMMENT - 1] || ''), risk: keyOf_(RISK, String(row[C_RISK - 1] || '')) || 'green',
    handled: String(row[C_HANDLED - 1] || '') === 'Y', handledBy: String(row[C_HBY - 1] || ''),
    handledAt: hat instanceof Date ? hat.toISOString() : String(hat || ''), note: String(row[C_HNOTE - 1] || ''),
    topics: String(row[C_TOPICS - 1] || ''), learn: String(row[C_LEARN - 1] || '')
  };
}
function list_() {
  var regs = rows_(regSheet_(), R_HEAD.length).filter(function (r) { return r[R_ID - 1]; })
    .map(function (r) { var o = regObj_(r); o.w = wOf_(r[R_W - 1]); return o; });
  var chks = rows_(chkSheet_(), K_HEAD.length).filter(function (r) { return r[K_ID - 1]; }).map(chkObj_);
  var resp = rows_(respSheet_(), C_HEAD.length).filter(function (r) { return r[C_ID - 1]; }).map(respObj_);
  return { ok: true, regs: regs, checkins: chks, rows: resp, sites: sites_(), today: ymd_(new Date()) };
}
function findRowBy_(sh, col, val) {
  var v = rows_(sh, col);
  for (var i = 0; i < v.length; i++) if (String(v[i][col - 1]) === String(val)) return i + 2;
  return -1;
}

// ───────────────────────── ทางเข้า ─────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if ((p.action || 'ping') === 'ping') {
      var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(REG_TAB);
      return json_({ ok: true, app: 'Rattana 7 วันแรก', sheet: ss.getUrl(), regs: sh ? Math.max(sh.getLastRow() - 1, 0) : 0, sites: sites_().length });
    }
    if (p.action === 'positions') return json_({ ok: true, positions: positions_() });
    if (p.action === 'list') { needAuth_(p.token); return json_(list_()); }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err), auth: !!(err && err.auth) });
  }
}
function doPost(e) {
  var p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'ข้อมูลที่ส่งมาไม่ใช่ JSON' }); }
  try {
    switch (p.action) {
      case 'plogin': return json_(plogin_(p));
      case 'register': return json_(register_(p));
      case 'state': return json_({ ok: true, me: me_(needReg_(p)) });
      case 'checkin': return json_(checkin_(p));
      case 'submit': return json_(submit_(p));
      case 'login': return json_(login_(p.credential));
      case 'logout':
        if (/^[0-9a-f]{64}$/.test(String(p.token || ''))) CacheService.getScriptCache().remove('s_' + p.token);
        return json_({ ok: true });
      case 'handle': {
        var u = needAuth_(p.token), sh = respSheet_(), r = findRowBy_(sh, C_ID, p.id);
        if (r < 0) return json_({ ok: false, error: 'ไม่พบรายการ' });
        var on = !!p.handled, note = clean_(p.note).slice(0, 500);
        sh.getRange(r, C_HANDLED, 1, 4).setValues([[on ? 'Y' : '', on ? u.name : '', on ? new Date() : '', note]]);
        return json_({ ok: true, handled: on, by: u.name, at: on ? new Date().toISOString() : '', note: note });
      }
      case 'regUpdate': {   // HR แก้วันเริ่มงาน / สถานะ / รหัสพนักงาน / หมายเหตุ
        needAuth_(p.token);
        var rs = regSheet_(), rr = findRowBy_(rs, R_ID, p.id);
        if (rr < 0) return json_({ ok: false, error: 'ไม่พบผู้ลงทะเบียน' });
        if (p.start !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(p.start)) return json_({ ok: false, error: 'วันเริ่มงานไม่ถูกต้อง' }); rs.getRange(rr, R_START).setValue(p.start); }
        if (p.status !== undefined) rs.getRange(rr, R_STATUS).setValue(p.status === 'ลาออก' ? 'ลาออก' : 'ทำงานอยู่');
        if (p.empCode !== undefined) rs.getRange(rr, R_EMPCODE).setValue(clean_(p.empCode).slice(0, 20));
        if (p.note !== undefined) rs.getRange(rr, R_NOTE).setValue(clean_(p.note).slice(0, 300));
        return json_({ ok: true });
      }
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err), auth: !!(err && err.auth), relogin: !!(err && err.relogin) });
  }
}
// ตำแหน่งงานจากชีตโครงสร้าง (หน่วย/หมวด + ตำแหน่งงาน)
function positions_() {
  try {
    var v = SpreadsheetApp.openById(STRUCT_SHEET_ID).getSheets()[0].getDataRange().getValues(), H = {};
    v[0].forEach(function (h, i) { h = clean_(h); if (h && !(h in H)) H[h] = i; });
    var iU = H['หน่วย/หมวด'], iP = H['ตำแหน่งงาน'], out = [];
    for (var r = 1; r < v.length; r++) { var p = clean_(v[r][iP]); if (p) out.push({ unit: clean_(v[r][iU]), pos: p }); }
    return out;
  } catch (e) { return []; }
}

// ───────────────────────── สรุปรายวัน (ไม่บังคับ) ─────────────────────────
function dailyDigest() {
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  if (!to) return;
  var d = list_(), today = d.today, lines = [];
  d.regs.forEach(function (g) {
    var day = dayNo_(g.start);
    if (g.status === 'ลาออก' || day < 1 || day > TRACK_DAYS) return;
    var ok = d.checkins.some(function (c) { return c.id === g.id && c.ok && c.date === today; });
    if (!ok) lines.push('• ' + g.name + ' (' + g.pos + ' · ' + (PROV[g.w] || '') + ') วันที่ ' + day + ' — โทร ' + g.phone);
  });
  if (!lines.length) return;
  MailApp.sendEmail({ to: to, name: 'Rattana 7 วันแรก', subject: '[7 วันแรก] น้องใหม่ยังไม่เช็คอินวันนี้ ' + lines.length + ' คน',
    body: 'รายชื่อพนักงานใหม่ (7 วันแรก) ที่ยังไม่เช็คอินเข้างานวันนี้ ณ เวลา ' + hm_(new Date()) + ' น.\n\n' + lines.join('\n') + '\n\nดูรายละเอียด: ' + APP_URL });
}
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(10).inTimezone('Asia/Bangkok').create();
  Logger.log('ตั้งสรุปรายวัน 10.00 น. แล้ว ✓');
}

// ───────────────────────── ตั้งค่าครั้งแรก (Run ในตัวแก้ไข) ─────────────────────────
function setupSheet() {
  regSheet_(); chkSheet_(); respSheet_();
  CacheService.getScriptCache().removeAll(['f7_sites_v2', 'reg_f7_v2']);
  var s = sites_();
  Logger.log('พร้อมใช้งาน ✓ v' + VERSION + '  แท็บ: ' + REG_TAB + ' / ' + CHK_TAB + ' / ' + RESP_SHEET);
  for (var w in PROV) Logger.log('  ' + PROV[w] + ': ' + s.filter(function (x) { return x.w === w; }).map(function (x) { return x.name + ' (' + x.r + ' ม.)'; }).join(', '));
  Logger.log('ตำแหน่งงานจากชีตโครงสร้าง ' + positions_().length + ' ตำแหน่ง');
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  Logger.log(to ? 'อีเมลเตือน → ' + to : 'ยังไม่ตั้ง ALERT_EMAILS (ไม่ส่งอีเมลเตือน)');
}
