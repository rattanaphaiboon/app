// Rattana 7 วันแรก — หลังบ้าน (Google Apps Script) v3.1
// พนักงานใหม่ลงทะเบียนด้วยเบอร์โทร (+รูปหน้า) → 7 วันแรก ทำวันละ 2 ครั้ง ต้องอยู่ในพิกัดที่ทำงานเท่านั้น
//   เช้า  = เช็คอินเข้างานอย่างเดียว                              → แท็บ "เข้า-ออกงาน" (ประเภท = เข้างาน)
//   เย็น  = ชื่อพี่เลี้ยง/คนที่ไปด้วย + ตอบคำถาม + เช็คเอาท์        → แท็บ "เข้า-ออกงาน" (ประเภท = เลิกงาน) + แท็บ "คำตอบ"
//          ไม่ทันตอนเย็น → ทำเช้าวันประเมินถัดไปได้ (วิธี = ทำเช้าวันถัดไป ไม่ต้องใส่เหตุผล)
//   วันไหนไม่ได้ทำ → ทำย้อนหลังได้ (ต้องอยู่ที่ทำงาน + เวลาจริง + เหตุผล) ช่อง "วิธี" = ทำย้อนหลัง
//
// ══════════════ วิธีติดตั้ง / อัปเดต ══════════════
//  1. เปิดชีต "Rattana 7 วันแรก" ▸ ส่วนขยาย (Extensions) ▸ Apps Script → ลบโค้ดเดิม วางไฟล์นี้ทั้งไฟล์ → Ctrl+S
//  2. เลือกฟังก์ชัน setupSheet ▸ Run (ถ้าขอสิทธิ์เพิ่ม — กดอนุญาต) → Execution log ต้องขึ้น "พร้อมใช้งาน" + จำนวนจุดพิกัด
//  3. Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy   (URL เดิม ไม่ต้องส่งใหม่)
//     ครั้งแรก: Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me / Who has access: Anyone (ทุกคน)
//  เช็คว่าติดแล้ว: เปิด URL ต่อท้าย ?action=ping → ต้องเห็น "version":"3.1"
//  v3.1 ครั้งแรกหลังอัปเดต ระบบเติม 0 หน้าเบอร์โทรที่หายไปในชีตให้เอง (แท็บ ลงทะเบียน / เข้า-ออกงาน / คำตอบ) + ตั้งคอลัมน์เบอร์เป็นข้อความ
//  v3.0 ไม่บังคับพิกัดแล้ว — บันทึกได้ทุกที่ ช่อง "ผล" ลงว่า อยู่ในพิกัด / นอกพิกัด / ไม่มีพิกัด (เปิด GPS ไม่ได้)
//  v2.9 แก้ชีตตัด 0 หน้าเบอร์โทร (0891234567 → 891234567) ทำให้ล็อกอินด้วยเบอร์ไม่เจอ → อ่านเบอร์เติม 0 คืน + บันทึกเบอร์/วันที่/เวลาเป็นข้อความ
//  v2.6 วันที่ 1 = วันที่ลงทะเบียน (ไม่ให้เลือกวันเริ่มงาน) · ประเมิน 7 วันทำงาน ข้ามวันอาทิตย์
//  v2.4 รวมเข้างาน/เลิกงานไว้แท็บเดียว "เข้า-ออกงาน" — setupSheet ย้ายข้อมูลจากแท็บ "เข้างาน"/"เลิกงาน" เดิมให้ แล้วซ่อนแท็บเดิมไว้เป็นสำรอง
//  v2.1 ใช้ Google Drive เก็บรูปหน้า → ตอน Run setupSheet จะขอสิทธิ์ Drive เพิ่ม (กดอนุญาต)
//
//  ตัวเลือก (Project Settings ▸ Script Properties):
//    ALERT_EMAILS = hr@rattanaphaiboon.com, …  ← อีเมลเตือนทันทีเมื่อน้องใหม่ "เสี่ยงสูง" + สรุปรายวัน (ถ้าเปิด)
//  สรุปรายวัน (ไม่บังคับ): Run setupDailyTrigger ครั้งเดียว → 10.00 น. คนที่ยังไม่เช็คอินเข้างาน · 19.00 น. คนที่ยังไม่เช็คเอาท์

var VERSION = '3.1';
var AREA = { in: 'อยู่ในพิกัด', out: 'นอกพิกัด', none: 'ไม่มีพิกัด' };
var REG_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ';    // ทะเบียนพนักงาน — ใช้ตรวจสิทธิ์ล็อกอินของ HR เท่านั้น
var STRUCT_SHEET_ID = '1tkJoaZj72MG9HIOkd-uM_Tvng-l2uqH61jUwqqiRTMI'; // ชีต "โครงสร้าง" — พิกัด/รัศมีที่ทำงาน + ตำแหน่งงาน
var CLIENT_ID = '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com';
var APP_URL = 'https://rattanaphaiboon.github.io/app/rattana-first7.html';
var SESSION_TTL = 21600;   // session หน้า HR 6 ชม.
var TRACK_DAYS = 7;        // ประเมิน 7 วันทำงาน — วันที่ 1 = วันที่ลงทะเบียน · ข้ามวันหยุด OFF_DAYS
var OFF_DAYS = [0];        // 0 = วันอาทิตย์ (วันหยุดบริษัท) ไม่นับเป็นวันประเมิน ไม่ต้องเช็คอิน
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
    R_EMPCODE = 10, R_UA = 11, R_NOTE = 12, R_THUMB = 13, R_PHOTO = 14;
var R_HEAD = ['รหัสลงทะเบียน', 'เวลาลงทะเบียน', 'ชื่อ - นามสกุล', 'เบอร์โทร', 'ตำแหน่ง', 'จังหวัด', 'วันที่ 1 (วันเริ่มประเมิน)',
              'รหัสเข้าใช้ (ห้ามแก้)', 'สถานะ', 'รหัสพนักงาน', 'อุปกรณ์', 'หมายเหตุ HR',
              'รูปหน้า (ย่อ · ห้ามแก้)', 'ไฟล์รูปหน้า'];
var PHOTO_FOLDER = 'Rattana 7 วันแรก - รูปหน้าพนักงานใหม่';
// ── แท็บ "เข้า-ออกงาน" — เข้างานและเลิกงานอยู่แท็บเดียว แยกด้วยคอลัมน์ "ประเภท" ──
var ATT_TAB = 'เข้า-ออกงาน';
var OLD_TABS = { 'เข้างาน': 'in', 'เลิกงาน': 'out' };   // แท็บแยกของ v2.2 — setupSheet ย้ายข้อมูลมาแท็บนี้
var TYPE_LB = { in: 'เข้างาน', out: 'เลิกงาน' };
var K_TS = 1, K_ID = 2, K_NAME = 3, K_PHONE = 4, K_W = 5, K_DATE = 6, K_DAY = 7, K_TYPE = 8, K_TIME = 9, K_MODE = 10,
    K_REASON = 11, K_MENTOR = 12, K_RESP = 13, K_DIST = 14, K_SITE = 15, K_OK = 16, K_LAT = 17, K_LNG = 18, K_ACC = 19, K_UA = 20;
var K_HEAD = ['เวลาที่กดบันทึก', 'รหัสลงทะเบียน', 'ชื่อ - นามสกุล', 'เบอร์โทร', 'จังหวัด', 'วันที่', 'ทำงานวันที่',
              'ประเภท (เข้างาน / เลิกงาน)', 'เวลา', 'วิธี (GPS / ทำย้อนหลัง)', 'เหตุผลที่ทำย้อนหลัง',
              'พี่เลี้ยง / คนที่ไปทำงานด้วย (เลิกงาน)', 'รหัสคำตอบ (เลิกงาน → แท็บ คำตอบ)',
              'ระยะจากที่ทำงาน (ม.)', 'จุดที่ใกล้สุด', 'พิกัด (อยู่ในพิกัด / นอกพิกัด)', 'ละติจูด', 'ลองติจูด', 'ความแม่น GPS (ม.)', 'อุปกรณ์'];
var K_N = K_HEAD.length;
// ── แท็บ "คำตอบ" (คอลัมน์เดิมจาก v1 — ไม่เลื่อน) ──
var RESP_SHEET = 'คำตอบ';
var C_ID = 1, C_TS = 2, C_CODE = 3, C_NAME = 4, C_NICK = 5, C_W = 6, C_DEPT = 7, C_SUP = 8, C_START = 9,
    C_DAY = 10, C_ROUND = 11, C_TAUGHT = 12, C_TEACHER = 13, C_READY = 14, C_STAY = 15, C_HELP = 16,
    C_COMMENT = 17, C_RISK = 18, C_UA = 19, C_HANDLED = 20, C_HBY = 21, C_HAT = 22, C_HNOTE = 23,
    C_TOPICS = 24, C_LEARN = 25;   // C_DATE = 26 (ต่อท้าย)
var C_HEAD = ['รหัสรายการ', 'เวลา', 'รหัสลงทะเบียน', 'ชื่อ - สกุล', 'เบอร์โทร', 'จังหวัด', 'ตำแหน่ง', 'หัวหน้างาน',
              'วันเริ่มงาน', 'ทำงานวันที่', 'รอบ', '1. การสอนงาน', 'ผู้สอนงาน (ชื่อ)', '2. ความพร้อมทำงาน (1-5)',
              '3. ความรู้สึก/อยากทำงานต่อ (1-5)', 'อยากให้ HR ช่วย', 'ความคิดเห็น', 'ระดับความเสี่ยง',
              'อุปกรณ์', 'ติดตามแล้ว', 'ผู้ติดตาม', 'เวลาติดตาม', 'บันทึกการช่วยเหลือ',
              'สอนงานเรื่องอะไร', 'อยากเรียนรู้อะไรเพิ่ม', 'วันที่'];
var C_DATE = 26;

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
function daysBetween_(a, b) { return Math.round((utcOf_(b) - utcOf_(a)) / 864e5); }
// 7 วันประเมินของคนหนึ่ง: นับจากวันที่ 1 ข้ามวันอาทิตย์ จนครบ 7 วัน (ตรงกับ trackDates ในหน้าเว็บ)
function trackDates_(start) {
  var out = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '')) return out;
  var t = utcOf_(start);
  for (var g = 0; out.length < TRACK_DAYS && g < 40; g++, t += 864e5) {
    var d = new Date(t);
    if (OFF_DAYS.indexOf(d.getUTCDay()) < 0) out.push(Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd'));
  }
  return out;
}
function trackDay_(start, date) { return trackDates_(start).indexOf(date) + 1; }   // 0 = ไม่ใช่วันประเมิน
// วันประเมินล่าสุดก่อน "today" — คำถามเย็นของวันนั้นทำเช้าวันถัดไปได้
function prevTrack_(start, today) { return trackDates_(start).filter(function (d) { return d < today; }).pop() || ''; }
function riskOf_(taught, ready, stay, helps) {
  if (taught === 'none' || stay <= 2) return 'red';
  if (taught === 'part' || ready <= 2 || stay === 3 || helps.length) return 'yellow';
  return 'green';
}
// เบอร์โทร → 0xxxxxxxxx (ตัดขีด/ช่องว่าง, +66 → 0)
function phone_(p) {
  var d = String(p == null ? '' : p).replace(/\.0+$/, '').replace(/\D/g, '');
  if (/^66\d{9}$/.test(d)) d = '0' + d.slice(2);
  // ชีตแปลงเบอร์เป็นตัวเลขแล้วตัด 0 ข้างหน้า: มือถือเหลือ 9 หลัก (8x/9x/6x) · บ้านเหลือ 8 หลัก → เติม 0 คืน
  if (/^[1-9]\d{7,8}$/.test(d)) d = '0' + d;
  return /^0\d{8,9}$/.test(d) ? d : '';
}
// เขียนลงชีตเป็นข้อความ (กันชีตแปลง 0891234567 → 891234567 · 08.10 → 8.1 · 2026-10-16 → วันที่)
function txt_(v) { v = String(v == null ? '' : v); return v ? "'" + v : ''; }
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
function regSheet_() { return getTab_(REG_TAB, R_HEAD, [130, 140, 200, 110, 200, 110, 100, 120, 90, 100, 160, 240, 80, 260], [R_PHONE, R_START, R_KEY, R_EMPCODE]); }
function attSheet_() {
  return getTab_(ATT_TAB, K_HEAD, [140, 130, 190, 110, 110, 95, 70, 110, 70, 120, 180, 200, 150, 90, 180, 90, 100, 100, 80, 160],
                 [K_PHONE, K_DATE, K_TIME]);
}
function respSheet_() {
  return getTab_(RESP_SHEET, C_HEAD, [110, 140, 130, 190, 110, 100, 160, 140, 95, 70, 70, 140, 160, 90, 90, 220, 300, 90, 150, 70, 150, 140, 260, 300, 300, 95],
                 [C_CODE, C_NICK, C_START, C_DATE]);
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
    empCode: clean_(row[R_EMPCODE - 1]), note: clean_(row[R_NOTE - 1]),
    photo: /^data:image\/jpeg;base64,/.test(String(row[R_THUMB - 1] || '')) ? String(row[R_THUMB - 1]) : '', photoUrl: clean_(row[R_PHOTO - 1])
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
function allAtt_() {
  return rows_(attSheet_(), K_N).filter(function (r) { return r[K_ID - 1]; }).map(attObj_);
}
function checkinsOf_(id) { return allAtt_().filter(function (c) { return c.id === id; }); }
function cellHm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'HH.mm');
  if (typeof v === 'number' && v >= 0 && v < 24) {   // 08.10 ถูกแปลงเป็นเลข 8.1
    var h = Math.floor(v), mi = Math.round((v - h) * 100);
    return ('0' + h).slice(-2) + '.' + ('0' + mi).slice(-2);
  }
  var m = clean_(v).match(/^(\d{1,2})[:.](\d{2})/); return m ? ('0' + m[1]).slice(-2) + '.' + m[2] : clean_(v);
}
function attObj_(r) {
  var ts = r[K_TS - 1], type = clean_(r[K_TYPE - 1]) === TYPE_LB.out ? 'out' : 'in';
  return { ts: ts instanceof Date ? ts.toISOString() : String(ts || ''), id: String(r[K_ID - 1] || ''), type: type,
           name: clean_(r[K_NAME - 1]), phone: clean_(r[K_PHONE - 1]), w: wOf_(r[K_W - 1]),
           date: cellYmd_(r[K_DATE - 1]), day: Number(r[K_DAY - 1]) || 0, time: cellHm_(r[K_TIME - 1]),
           mode: { 'ทำย้อนหลัง': 'fix', 'ทำเช้าวันถัดไป': 'next' }[clean_(r[K_MODE - 1])] || 'gps', reason: clean_(r[K_REASON - 1]),
           mentors: clean_(r[K_MENTOR - 1]).split(/\s*,\s*/).filter(String), resp: clean_(r[K_RESP - 1]),
           dist: Number(r[K_DIST - 1]) || 0, site: clean_(r[K_SITE - 1]),
           ok: clean_(r[K_OK - 1]) !== 'นอกพื้นที่',   // 'นอกพื้นที่' = ระบบเก่า (v2.x) ที่บล็อกไม่ให้บันทึก
           area: { 'นอกพิกัด': 'out', 'นอกพื้นที่': 'out', 'ไม่มีพิกัด': 'none' }[clean_(r[K_OK - 1])] || 'in',
           lat: Number(r[K_LAT - 1]) || 0, lng: Number(r[K_LNG - 1]) || 0, acc: Number(r[K_ACC - 1]) || 0 };
}
function me_(f) {
  var g = f.reg, day = trackDay_(g.start, ymd_(new Date()));
  return { id: g.id, name: g.name, phone: g.phone, pos: g.pos, w: g.w, prov: PROV[g.w] || '', start: g.start, status: g.status, photo: g.photo,
           day: day, today: ymd_(new Date()), trackDays: TRACK_DAYS,
           checkins: checkinsOf_(g.id).filter(function (c) { return c.ok; }),
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
  var start = ymd_(new Date());   // วันที่ 1 = วันที่ลงทะเบียนเสมอ (ไม่ให้เลือกเอง)
  if (!/\S+\s+\S+/.test(name)) return { ok: false, error: 'กรุณากรอกชื่อและนามสกุล (เว้นวรรคระหว่างชื่อกับนามสกุล)' };
  if (!ph) return { ok: false, error: 'เบอร์โทรไม่ถูกต้อง (ต้องเป็นเบอร์ 10 หลัก ขึ้นต้นด้วย 0)' };
  if (pos.length < 2) return { ok: false, error: 'กรุณาเลือกตำแหน่ง' };
  if (!PROV[w]) return { ok: false, error: 'กรุณาเลือกจังหวัดที่ทำงาน' };
  var photo = String(p.photo || ''), thumb = String(p.thumb || '');
  var JPG = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/;
  if (!JPG.test(photo) || photo.length > 400000) return { ok: false, error: 'กรุณาถ่ายรูปหน้าตัวเองจากกล้อง' };
  if (!JPG.test(thumb) || thumb.length > 40000) thumb = '';
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var f = findReg_('phone', ph);
    if (f) return { ok: true, me: me_(f), key: f.key, existed: true };   // เคยลงทะเบียนแล้ว → เข้าสู่ระบบให้เลย
    var id = 'NH' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
    var key = Utilities.getUuid().replace(/-/g, '');
    var url = '';
    try { url = savePhoto_(photo, start + ' ' + name + ' ' + ph + '.jpg'); } catch (e) { url = 'บันทึกรูปไม่สำเร็จ: ' + e.message; }
    regSheet_().appendRow([id, new Date(), name, txt_(ph), pos, w + ' ' + PROV[w], txt_(start), txt_(key), 'ทำงานอยู่', '', clean_(p.ua).slice(0, 120), '', thumb, url]);
    SpreadsheetApp.flush();
    styleOnce_();
    return { ok: true, me: me_(findReg_('id', id)), key: key, created: true };
  } finally { lock.releaseLock(); }
}
// รูปหน้าเต็ม → โฟลเดอร์ใน Drive ของเจ้าของสคริปต์ (ไม่แชร์สาธารณะ) · รูปย่อเก็บในชีตไว้โชว์หน้า HR
function savePhoto_(dataUrl, fileName) {
  var props = PropertiesService.getScriptProperties(), fid = props.getProperty('PHOTO_FOLDER_ID'), folder = null;
  if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) { folder = null; } }
  if (!folder) { folder = DriveApp.createFolder(PHOTO_FOLDER); props.setProperty('PHOTO_FOLDER_ID', folder.getId()); }
  var blob = Utilities.newBlob(Utilities.base64Decode(dataUrl.split(',')[1]), 'image/jpeg', fileName);
  return folder.createFile(blob).getUrl();
}
// เช็คอิน (in) / เช็คเอาท์ (out) — เซิร์ฟเวอร์คำนวณระยะเองจากพิกัดในชีตโครงสร้าง (ไม่เชื่อผลจากเครื่องผู้ใช้)
// p.date + p.time + p.reason = ทำย้อนหลังของวันนั้น (ต้องอยู่ที่ทำงานตอนกดเหมือนกัน)
function attend_(p, type) {
  if (clean_(p.hp)) return { ok: false, error: 'x' };
  var f = needReg_(p), g = f.reg, today = ymd_(new Date()), fix = !!p.date;
  var date = fix ? clean_(p.date) : today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'วันที่ไม่ถูกต้อง' };
  if (date < g.start) return { ok: false, error: 'ยังไม่ถึงวันที่ 1 (' + g.start + ')' };
  var day = trackDay_(g.start, date);
  if (!day || date > today) {
    if (OFF_DAYS.indexOf(new Date(utcOf_(date)).getUTCDay()) >= 0) return { ok: false, error: 'วันอาทิตย์เป็นวันหยุด ไม่ต้องเช็คอิน' };
    return { ok: false, error: fix ? 'ทำย้อนหลังได้เฉพาะ 7 วันประเมิน และวันที่ผ่านมาแล้ว' : 'ครบ ' + TRACK_DAYS + ' วันแล้ว ไม่ต้องเช็คอินในแอปนี้แล้วค่ะ' };
  }
  var time = '', reason = '', next = fix && type === 'out' && date === prevTrack_(g.start, today);
  if (fix) {
    var m = clean_(p.time).match(/^(\d{1,2})[:.](\d{2})$/);
    reason = clean_(p.reason).slice(0, 200) || (next ? 'ทำเช้าวันถัดไป' : '');
    if (!m || +m[1] > 23 || +m[2] > 59 || reason.length < 2) return { ok: false, error: next ? 'กรุณาใส่เวลาเลิกงาน' : 'กรุณาใส่เวลาจริงและเหตุผล' };
    time = ('0' + m[1]).slice(-2) + '.' + m[2];
  }
  var lat = parseFloat(p.lat), lng = parseFloat(p.lng), acc = Math.round(parseFloat(p.acc) || 0);
  var hasGps = Math.abs(lat) > 0 && Math.abs(lng) > 0;   // ไม่บังคับ — เปิด GPS ไม่ได้ก็ยังบันทึกได้ (ไม่มีพิกัด)
  if (!hasGps) { lat = ''; lng = ''; acc = ''; }
  var label = type === 'in' ? 'เข้างาน' : 'เลิกงาน';
  var done = checkinsOf_(g.id).filter(function (c) { return c.ok && c.type === type && c.date === date; })[0];
  if (done) return { ok: false, error: (fix ? 'วันนั้น' : 'วันนี้') + 'บันทึก' + label + 'ไว้แล้ว (' + done.time + ' น.)' };
  var mentors = [], sv = null;
  if (type === 'out') {   // เช้าเช็คอินอย่างเดียว · ชื่อพี่เลี้ยงใส่ตอนเย็น
    mentors = (p.mentors || []).map(function (t) { return clean_(t).replace(/,/g, ' ').slice(0, 60); }).filter(function (t) { return t.length >= 2; }).slice(0, 5);
    if (!mentors.length) return { ok: false, error: 'กรุณาใส่ชื่อพี่เลี้ยง / คนที่ไปทำงานด้วย' };
    p.teachers = clean_(p.taught) === 'none' ? [] : mentors;
    sv = surveyCheck_(p);
    if (sv.error) return { ok: false, error: sv.error };
  }
  // ไม่บล็อกแล้ว — คำนวณระยะไว้ลงชีตว่า อยู่ในพิกัด / นอกพิกัด
  var best = null;
  if (hasGps) provSites_(g.w).forEach(function (s) {
    var d = distM_(lat, lng, s.lat, s.lng);
    if (!best || d - s.r < best.d - best.s.r) best = { s: s, d: d };
  });
  var dist = best ? Math.round(best.d) : '', area = !best ? 'none' : (dist - Math.min(acc, GPS_GRACE) <= best.s.r ? 'in' : 'out');
  var site = best ? best.s.name : '', now = new Date();
  if (!fix) time = hm_(now);
  var ua = clean_(p.ua).slice(0, 120), respId = '';
  var row = function (resp, ok) {
    return [now, g.id, g.name, txt_(g.phone), g.w + ' ' + PROV[g.w], txt_(date), day, TYPE_LB[type], txt_(time), next ? 'ทำเช้าวันถัดไป' : fix ? 'ทำย้อนหลัง' : 'GPS', reason,
            mentors.join(', '), resp, dist, site, AREA[area], lat, lng, acc, ua];
  };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (type === 'out') {
      respId = Utilities.formatDate(now, 'Asia/Bangkok', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
      respSheet_().appendRow([respId, now, g.id, g.name, txt_(g.phone), g.w + ' ' + (PROV[g.w] || ''), g.pos, '', txt_(g.start),
                              day, 'วันที่ ' + day, TAUGHT[sv.taught], sv.teachers.join(', '), sv.ready, sv.stay, sv.helps.join(', '),
                              sv.comment, RISK[sv.risk], ua, '', '', '', '', sv.topics, sv.learn, txt_(date)]);
    }
    attSheet_().appendRow(row(respId, true));
  } finally { lock.releaseLock(); }
  if (type === 'out') {
    try {
      alertRisk_(g, day, 'วันที่ ' + day + (next ? ' (ทำเช้าวันถัดไป)' : fix ? ' (ทำย้อนหลัง)' : ''), sv.taught, sv.teachers, sv.ready, sv.stay, sv.helps,
                 sv.comment + (sv.topics ? '\n[สอนเรื่อง] ' + sv.topics : '') + (sv.learn ? '\n[อยากเรียนรู้เพิ่ม] ' + sv.learn : ''), sv.risk, respId);
    } catch (e) { /* ส่งเมลไม่ได้ ไม่กระทบการบันทึก */ }
  }
  styleOnce_();
  return { ok: true, inside: true, area: area, type: type, time: time, dist: dist, acc: acc, site: site,
           risk: sv ? sv.risk : '', me: me_(f) };
}
// ตรวจคำตอบก่อนกลับบ้าน (ตรงกับ surveyCheck ในหน้าเว็บ)
function surveyCheck_(p) {
  var taught = clean_(p.taught);
  if (!TAUGHT[taught]) return { error: 'กรุณาตอบข้อ 1 การสอนงาน' };
  var ready = parseInt(p.ready, 10), stay = parseInt(p.stay, 10);
  if (!(ready >= 1 && ready <= 5)) return { error: 'กรุณาตอบข้อ 2 ความพร้อมทำงาน' };
  if (!(stay >= 1 && stay <= 5)) return { error: 'กรุณาตอบข้อ 3 ความรู้สึกต่องาน' };
  var teachers = (p.teachers || []).map(function (t) { return clean_(t).replace(/,/g, ' ').slice(0, 60); })
                                    .filter(function (t) { return t.length >= 2; }).slice(0, 5);
  if (taught === 'none') teachers = [];
  else if (!teachers.length) return { error: 'กรุณาใส่ชื่อคนที่สอนงานคุณ' };
  var topics = taught === 'none' ? '' : clean_(p.topics).slice(0, 500), learn = clean_(p.learn).slice(0, 500);
  if (taught !== 'none' && topics.length < 3) return { error: 'กรุณาพิมพ์ว่าสอนงานเรื่องอะไร' };
  if (taught !== 'full' && learn.length < 3) return { error: 'กรุณาพิมพ์ว่าอยากเรียนรู้อะไรเพิ่ม' };
  var helps = (p.helps || []).map(clean_).filter(function (h) { return HELPS.indexOf(h) >= 0; });
  return { taught: taught, ready: ready, stay: stay, teachers: teachers, topics: topics, learn: learn, helps: helps,
           comment: clean_(p.comment).slice(0, 1000), risk: riskOf_(taught, ready, stay, helps) };
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
    topics: String(row[C_TOPICS - 1] || ''), learn: String(row[C_LEARN - 1] || ''), date: cellYmd_(row[C_DATE - 1])
  };
}
function list_() {
  var regs = rows_(regSheet_(), R_HEAD.length).filter(function (r) { return r[R_ID - 1]; })
    .map(function (r) { var o = regObj_(r); o.w = wOf_(r[R_W - 1]); return o; });
  var chks = allAtt_();
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
      case 'checkin': return json_(attend_(p, 'in'));
      case 'checkout': return json_(attend_(p, 'out'));
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
  // ก่อนเที่ยง = ใครยังไม่เช็คอินเข้างาน · บ่าย/เย็น = ใครยังไม่เช็คเอาท์ (ตอบคำถาม)
  var d = list_(), today = d.today, type = +Utilities.formatDate(new Date(), 'Asia/Bangkok', 'H') < 12 ? 'in' : 'out', lines = [];
  var label = type === 'in' ? 'ยังไม่เช็คอินเข้างาน' : 'ยังไม่ตอบคำถาม + เช็คเอาท์ (ทำเช้าพรุ่งนี้ได้)';
  d.regs.forEach(function (g) {
    var day = trackDay_(g.start, today);
    if (g.status === 'ลาออก' || !day) return;
    var ok = d.checkins.some(function (c) { return c.id === g.id && c.ok && c.type === type && c.date === today; });
    if (!ok) lines.push('• ' + g.name + ' (' + g.pos + ' · ' + (PROV[g.w] || '') + ') วันที่ ' + day + ' — โทร ' + g.phone);
  });
  if (!lines.length) return;
  MailApp.sendEmail({ to: to, name: 'Rattana 7 วันแรก', subject: '[7 วันแรก] น้องใหม่' + label + 'วันนี้ ' + lines.length + ' คน',
    body: 'รายชื่อพนักงานใหม่ (7 วันแรก) ที่' + label + 'วันนี้ ณ เวลา ' + hm_(new Date()) + ' น.\n\n' + lines.join('\n') + '\n\nดูรายละเอียด: ' + APP_URL });
}
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(10).inTimezone('Asia/Bangkok').create();
  ScriptApp.newTrigger('dailyDigest').timeBased().everyDays(1).atHour(19).inTimezone('Asia/Bangkok').create();
  Logger.log('ตั้งสรุปรายวันแล้ว ✓ 10.00 น. (ยังไม่เช็คอิน) และ 19.00 น. (ยังไม่เช็คเอาท์)');
}

// ── v2.2 เคยแยกแท็บ "เข้างาน"/"เลิกงาน" (18 คอลัมน์: …7 ทำงานวันที่, 8 เวลา, 9 วิธี, 10 เหตุผล, 11 พี่เลี้ยง|รหัสคำตอบ, 12 ระยะ, 13 จุด, 14 ผล, 15-17 lat/lng/acc, 18 อุปกรณ์)
//    → ย้ายทุกแถวมาแท็บ "เข้า-ออกงาน" แล้วเปลี่ยนชื่อแท็บเดิมเป็น "สำรอง-…" และซ่อนไว้ (ไม่ลบข้อมูล)
function migrateOldTabs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), out = [], moved = 0;
  for (var name in OLD_TABS) {
    var sh = ss.getSheetByName(name);
    if (!sh) continue;
    var type = OLD_TABS[name];
    rows_(sh, 18).forEach(function (r) {
      if (!r[1]) return;
      out.push([r[0], r[1], r[2], r[3], r[4], r[5], r[6], TYPE_LB[type], r[7], r[8], r[9],
                type === 'in' ? r[10] : '', type === 'out' ? r[10] : '', r[11], r[12], r[13], r[14], r[15], r[16], r[17]]);
    });
    sh.setName('สำรอง-' + name + '-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd-HHmm'));
    sh.hideSheet();
  }
  if (out.length) {
    out.sort(function (a, b) { return new Date(a[0]) - new Date(b[0]); });
    var att = attSheet_();
    att.getRange(att.getLastRow() + 1, 1, out.length, K_N).setValues(out);
    moved = out.length;
  }
  return moved;
}
// แต่งสีครั้งเดียวหลังอัปเดตเวอร์ชัน (ไม่ต้อง Run setupSheet)
function styleOnce_() {
  try {
    var pr = PropertiesService.getScriptProperties();
    if (pr.getProperty('STYLE_VER') === VERSION) return;
    pr.setProperty('STYLE_VER', VERSION);
    fixPhones_(); styleAttTab_();
  } catch (e) {}
}
// เติม 0 หน้าเบอร์โทรที่ชีตตัดทิ้ง (890832386 → 0890832386) + ตั้งทั้งคอลัมน์เป็นข้อความ กันหายอีก
function fixPhones_() {
  var n = 0;
  [[regSheet_(), R_PHONE], [attSheet_(), K_PHONE], [respSheet_(), C_NICK]].forEach(function (x) {
    var sh = x[0], col = x[1], last = sh.getLastRow();
    sh.getRange(2, col, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    if (last < 2) return;
    var rg = sh.getRange(2, col, last - 1, 1), v = rg.getValues(), changed = false;
    v = v.map(function (r) {
      var ph = phone_(r[0]);
      if (ph && String(r[0]) !== ph) { changed = true; n++; return [ph]; }
      return [r[0] === '' || r[0] == null ? '' : String(r[0])];
    });
    if (changed) rg.setValues(v);
  });
  return n;
}
// แต่งสีคอลัมน์ "ประเภท" ให้แยกง่าย: เข้างาน = เขียว · เลิกงาน = ฟ้า · พิกัด: อยู่ในพิกัด = เขียว · นอกพิกัด = แดง · ไม่มีพิกัด = เหลือง
function styleAttTab_() {
  try {
    var sh = attSheet_(), n = Math.max(sh.getMaxRows() - 1, 1);
    var tCol = sh.getRange(2, K_TYPE, n, 1), okCol = sh.getRange(2, K_OK, n, 1);
    var rules = sh.getConditionalFormatRules().filter(function (r) {
      return !r.getRanges().some(function (g) { return g.getColumn() === K_TYPE || g.getColumn() === K_OK; });
    });
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(TYPE_LB.in).setBackground('#d9f2e3').setFontColor('#1e8449').setBold(true).setRanges([tCol]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(TYPE_LB.out).setBackground('#dbe8fb').setFontColor('#1a4fa3').setBold(true).setRanges([tCol]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(AREA.in).setBackground('#d9f2e3').setFontColor('#1e8449').setRanges([okCol]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(AREA.out).setBackground('#fde2df').setFontColor('#c0392b').setBold(true).setRanges([okCol]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(AREA.none).setBackground('#fef3d7').setFontColor('#a87800').setRanges([okCol]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('นอกพื้นที่').setBackground('#eeeeee').setFontColor('#777777').setRanges([okCol]).build());
    sh.setConditionalFormatRules(rules);
  } catch (e) { /* แต่งสีไม่ได้ก็ไม่เป็นไร */ }
}

// ───────────────────────── ตั้งค่าครั้งแรก (Run ในตัวแก้ไข) ─────────────────────────
function setupSheet() {
  regSheet_(); attSheet_(); respSheet_();
  var moved = migrateOldTabs_();
  if (moved) Logger.log('ย้ายข้อมูลจากแท็บ เข้างาน/เลิกงาน เดิม ' + moved + ' แถว → "' + ATT_TAB + '" (แท็บเดิมซ่อนไว้เป็นสำรอง)');
  styleAttTab_();
  Logger.log('เติม 0 หน้าเบอร์โทร ' + fixPhones_() + ' ช่อง');
  DriveApp.getRootFolder();   // ขอสิทธิ์ Drive ไว้ก่อน (ใช้เก็บรูปหน้า)
  CacheService.getScriptCache().removeAll(['f7_sites_v2', 'reg_f7_v2']);
  var s = sites_();
  Logger.log('พร้อมใช้งาน ✓ v' + VERSION + '  แท็บ: ' + REG_TAB + ' / ' + ATT_TAB + ' / ' + RESP_SHEET);
  for (var w in PROV) Logger.log('  ' + PROV[w] + ': ' + s.filter(function (x) { return x.w === w; }).map(function (x) { return x.name + ' (' + x.r + ' ม.)'; }).join(', '));
  Logger.log('ตำแหน่งงานจากชีตโครงสร้าง ' + positions_().length + ' ตำแหน่ง');
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  Logger.log(to ? 'อีเมลเตือน → ' + to : 'ยังไม่ตั้ง ALERT_EMAILS (ไม่ส่งอีเมลเตือน)');
}
