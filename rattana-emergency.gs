// Rattana แบบสำรวจสถานการณ์ฉุกเฉิน — หลังบ้าน (Google Apps Script) v1.0
// แบบสำรวจบ้านพนักงาน ช่วงน้ำท่วม 2569 — พนักงานกรอกได้เลยไม่ต้องล็อกอิน / HR ดูแดชบอร์ด+แผนที่
// รายชื่อพนักงานครบ 5 บริษัท: รัตนไพบูลย์ · อาร์พีบี (แท็บ ข้อมูลพนักงาน) + สเตชั่น · สโตร์ · คอฟฟี่ (แท็บ ข้อมูลPTT)
//
// ══════════════ วิธีติดตั้ง (ทำครั้งเดียว) ══════════════
//  1. เปิดชีต "แบบสำรวจบ้านพนักงาน สถานการณ์ฉุกเฉิน น้ำท่วม 2026"
//     เมนู ส่วนขยาย (Extensions) ▸ Apps Script → ลบโค้ดเดิมทิ้ง วางไฟล์นี้ทั้งไฟล์ → Ctrl+S
//  2. เลือกฟังก์ชัน setupSheet ▸ Run (ครั้งแรกจะขอสิทธิ์ — กดอนุญาต)
//     ดู Execution log: ต้องเห็นจำนวนพนักงานแยกตามบริษัท + แท็บ "รายงาน" / "ล่าสุดรายคน" + โฟลเดอร์รูป
//  3. Deploy ▸ New deployment ▸ ⚙️ Web app
//        Execute as: Me  /  Who has access: Anyone (ทุกคน)   ← ต้อง "ทุกคน" เท่านั้น
//  4. คัดลอก URL ที่ลงท้าย /exec ส่งให้ Claude ใส่ใน CONFIG.gasUrl ของ rattana-emergency.html
//     (ถ้า URL มี /a/macros/rattanaphaiboon.com/ ให้ตัดส่วนนั้นออก เหลือ script.google.com/macros/s/…/exec)
//  แก้โค้ดครั้งต่อไป: Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy (URL เดิม)
//  เช็คว่าติดแล้ว: เปิด URL ต่อท้าย ?action=ping → ต้องเห็น {"ok":true,"version":"1.0",…}
//
//  ตัวเลือกเพิ่มเติม (Project Settings ▸ Script Properties):
//    ALERT_EMAILS = hr@rattanaphaiboon.com, …   ← ส่งอีเมลด่วนเมื่อมีคนแจ้ง "วิกฤต" / ขออพยพ / ขอไปโรงพยาบาล
//                   (เว้นว่าง = ส่งหาพนักงานแผนกบุคคลทุกคนในทะเบียนผู้ใช้ที่ Status Active)
//    ALERT_OFF = 1  ← ปิดอีเมลด่วนทั้งหมด

var VERSION = '1.1';
// ทะเบียนพนักงาน 5 บริษัท (ชีต "APP ออกหนังสือ HR") — หาแท็บด้วย gid ก่อน ไม่เจอค่อยหาด้วยชื่อ
var EMP_SHEET_ID = '1iCdOIMnpaVzhoFXfDfiqh0EbOHnAumD4UW_IM4HuzwA';
var EMP_TABS = [
  { gid: 1667915290, name: 'ข้อมูลพนักงาน', kind: 'main' },   // รัตนไพบูลย์ / อาร์พีบี / ผู้บริหาร / ฝึกงาน …
  { gid: 678223223,  name: 'ข้อมูลPTT',     kind: 'ptt' }     // ปั๊ม: สเตชั่น / สโตร์ / คอฟฟี่
];
// ทะเบียนผู้ใช้แอป (อีเมล + User Role) — ใช้ตรวจสิทธิ์หน้า HR และเป็นรายชื่อสำรองถ้าเปิดชีตข้างบนไม่ได้
var USERS_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ';
var CLIENT_ID = '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com';
var LOG_SHEET = 'รายงาน';          // ทุกครั้งที่ส่ง (ประวัติรายวัน)
var LATEST_SHEET = 'ล่าสุดรายคน';   // 1 แถวต่อ 1 คน = สถานการณ์ล่าสุด (เรียงวิกฤตขึ้นก่อน)
var SESSION_TTL = 21600;           // อายุ session หน้า HR = 6 ชั่วโมง
var APP_URL = 'https://rattanaphaiboon.github.io/app/rattana-emergency.html';
var APP_NAME = 'แบบสำรวจสถานการณ์ฉุกเฉิน';
var EVENT_NAME = 'น้ำท่วม 2569';
var TZ = 'Asia/Bangkok';
var MAX_PHOTOS = 3;

var BRANCH = { HQ: 'สำนักงานใหญ่', W1: 'สมุทรสงคราม', W2: 'สุพรรณบุรี', W3: 'ราชบุรี', W4: 'นครปฐม', C4: 'รัตนมาร์ท ดอนตูม',
               BP: 'บายพาส (ปั๊ม)', LY: 'ลาดใหญ่ (ปั๊ม)' };
// ข้อความระดับต้องตรงกับ LEVELS ใน rattana-emergency.html (ขึ้นต้นด้วยเลข → เรียง/ระบายสีในชีตได้)
var LEVELS = { 1: '1 · ปกติ / เฝ้าระวัง', 2: '2 · ได้รับผลกระทบ', 3: '3 · วิกฤต' };
var FOLLOW = ['', 'ติดต่อแล้ว', 'กำลังช่วยเหลือ', 'ช่วยเหลือแล้ว'];

// ตำแหน่งคอลัมน์ตายตัว (1-based) — ใช้ทั้งแท็บ "รายงาน" และ "ล่าสุดรายคน"
var C_ID = 1, C_TS = 2, C_CODE = 3, C_NAME = 4, C_NICK = 5, C_CO = 6, C_W = 7, C_DEPT = 8, C_LEVEL = 9, C_WATER = 10,
    C_COMMUTE = 11, C_PLACE = 12, C_PLACE_D = 13, C_TEL = 14, C_VULN = 15, C_HELP = 16, C_NOTE = 17,
    C_LAT = 18, C_LNG = 19, C_ACC = 20, C_MAP = 21, C_LOC_NOTE = 22, C_P1 = 23, C_P2 = 24, C_P3 = 25,
    C_SRC = 26, C_FOLLOW = 27, C_FBY = 28, C_FAT = 29, C_HRNOTE = 30, C_HRWATER = 31;
var N_COLS = 31;
var HEADERS = ['รหัสรายการ', 'เวลา', 'รหัสพนักงาน', 'ชื่อ-สกุล', 'ชื่อเล่น', 'บริษัท', 'สาขา', 'แผนก / ตำแหน่ง',
               'ระดับสถานการณ์', 'ระดับน้ำที่บ้าน', 'การมาทำงาน', 'ตอนนี้พักอยู่ที่', 'รายละเอียดที่พัก',
               'เบอร์ติดต่อตอนนี้', 'ผู้ที่ต้องดูแลพิเศษ', 'ความช่วยเหลือที่ต้องการ', 'รายละเอียดเพิ่มเติม',
               'ละติจูด', 'ลองจิจูด', 'ความแม่นยำ (ม.)', 'แผนที่', 'หมายเหตุตำแหน่ง', 'รูป 1', 'รูป 2', 'รูป 3',
               'อุปกรณ์', 'สถานะติดตาม (HR)', 'ผู้ติดตาม', 'เวลาติดตาม', 'บันทึก HR', 'ระดับน้ำจากรูป (HR ประเมิน)'];

// ───────────────────────── เครื่องมือทั่วไป ─────────────────────────
function json_(obj) {
  obj.version = VERSION;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(s) {
  return String(s == null ? '' : s).replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
function cleanMulti_(s, max) { // เก็บขึ้นบรรทัดใหม่ไว้ (ข้อความยาว)
  return String(s == null ? '' : s).replace(/[​-‍﻿]/g, '').replace(/\r/g, '').trim().slice(0, max || 1000);
}
function norm_(s) { return clean_(s).toLowerCase(); }
function blank_(s) { s = clean_(s); return !s || s === '-' || s === '0'; }
// รหัสสาขา: W1–W4 / HQ / C4 ตามทะเบียน · ปั๊ม → BP (บายพาส) / LY (ลาดใหญ่)
function normW_(w) {
  w = clean_(w);
  if (/บายพาส/.test(w)) return 'BP';
  if (/ลาดใหญ่/.test(w)) return 'LY';
  return w.toUpperCase();
}
function wName_(w) { w = normW_(w); return BRANCH[w] || w; }
// ชื่อบริษัทแบบสั้น — 5 บริษัทในเครือ ที่เหลือ (ฝึกงาน / ผู้บริหาร / นอกระบบ ฯลฯ) ใช้ตามทะเบียน
function coShort_(s) {
  s = clean_(s);
  if (/อาร์พีบี/.test(s)) return 'อาร์พีบี';
  if (/สเตชั่น/.test(s)) return 'สเตชั่น';
  if (/สโตร์/.test(s)) return 'สโตร์';
  if (/คอฟฟี่/.test(s)) return 'คอฟฟี่';
  if (/รัตนไพบูลย์/.test(s)) return 'รัตนไพบูลย์';
  return s;
}
function isoOf_(v) { return v instanceof Date ? v.toISOString() : String(v || ''); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
// แคชก้อนใหญ่ — CacheService เก็บได้ค่าละ ~100KB จึงหั่นเป็นชิ้น
function cacheGetBig_(key) {
  var c = CacheService.getScriptCache(), n = parseInt(c.get(key + '_n'), 10);
  if (!n) return null;
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(key + '_' + i);
  var parts = c.getAll(keys), s = '';
  for (var j = 0; j < keys.length; j++) { if (parts[keys[j]] == null) return null; s += parts[keys[j]]; }
  try { return JSON.parse(s); } catch (e) { return null; }
}
function cachePutBig_(key, obj, ttl) {
  try {
    var s = JSON.stringify(obj), size = 25000, m = {}, n = Math.ceil(s.length / size);
    for (var i = 0; i < n; i++) m[key + '_' + i] = s.substr(i * size, size);
    m[key + '_n'] = String(n);
    CacheService.getScriptCache().putAll(m, ttl);
  } catch (e) { /* แคชไม่ได้ก็อ่านสดทุกครั้ง */ }
}
// อ่านแท็บเป็นอาร์เรย์ของ object ตามหัวคอลัมน์ (หัวซ้ำ → ใช้คอลัมน์แรก · หัวมีขึ้นบรรทัดใหม่ → ยุบเป็นช่องว่าง)
function readTable_(sheet) {
  var lastR = sheet.getLastRow(), lastC = sheet.getLastColumn();
  if (lastR < 2 || lastC < 1) return [];
  var vals = sheet.getRange(1, 1, lastR, lastC).getValues();
  var head = vals[0].map(clean_), idx = {};
  head.forEach(function (h, i) { if (h && !(h in idx)) idx[h] = i; });
  var out = [];
  for (var r = 1; r < vals.length; r++) {
    var o = {};
    for (var h in idx) o[h] = vals[r][idx[h]];
    out.push(o);
  }
  return out;
}
function tabOf_(ss, t) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) if (sheets[i].getSheetId() === t.gid) return sheets[i];
  return ss.getSheetByName(t.name);
}

// ───────────────────────── ทะเบียนพนักงาน 5 บริษัท ─────────────────────────
// คืนเฉพาะคนที่ยังทำงานอยู่: { code, name, nick, w, dept, co, tel, addr, emerg }
// tel / addr (ที่อยู่ตามทะเบียน) / emerg (ผู้ติดต่อฉุกเฉิน) ส่งให้หน้า HR ที่ล็อกอินแล้วเท่านั้น
function getEmployees_() {
  var hit = cacheGetBig_('emp_v1');
  if (hit) return hit;
  var list = [], seen = {}, err = '';
  try {
    var ss = SpreadsheetApp.openById(EMP_SHEET_ID);
    EMP_TABS.forEach(function (t) {
      var sh = tabOf_(ss, t);
      if (!sh) { err += ' ไม่พบแท็บ ' + t.name; return; }
      readTable_(sh).forEach(function (r) {
        var e = t.kind === 'ptt' ? fromPtt_(r) : fromMain_(r);
        if (!e || seen[e.code]) return;      // รหัสซ้ำข้ามแท็บ → ใช้แถวแรก (แท็บหลักมาก่อน)
        seen[e.code] = 1;
        list.push(e);
      });
    });
  } catch (e) { err = e.message; }
  if (!list.length) {
    // เปิดชีต HR ไม่ได้ (ไม่มีสิทธิ์/ย้ายไฟล์) → ใช้ทะเบียนผู้ใช้แอปแทน ระบบยังใช้งานได้
    list = getUsers_().filter(function (u) { return u.active; }).map(function (u) {
      return { code: u.code, name: u.name, nick: u.nick, w: u.w, dept: u.dept, co: coShort_(u.co), tel: u.tel, addr: '', emerg: '' };
    });
    if (err) Logger.log('อ่านทะเบียน 5 บริษัทไม่ได้ (' + err + ') — ใช้ทะเบียนผู้ใช้แทน');
  }
  cachePutBig_('emp_v1', list, 600);
  return list;
}
function addrOf_(r) {
  var p = [];
  if (!blank_(r['บ้านเลขที่'])) p.push(clean_(r['บ้านเลขที่']));
  if (!blank_(r['หมู่'])) p.push('ม.' + clean_(r['หมู่']));
  if (!blank_(r['ซอย'])) p.push('ซ.' + clean_(r['ซอย']));
  if (!blank_(r['ถนน'])) p.push('ถ.' + clean_(r['ถนน']));
  if (!blank_(r['ตำบล'])) p.push('ต.' + clean_(r['ตำบล']));
  if (!blank_(r['อำเภอ'])) p.push('อ.' + clean_(r['อำเภอ']));
  if (!blank_(r['จังหวัด'])) p.push('จ.' + clean_(r['จังหวัด']));
  return p.length ? p.join(' ') : clean_(r['ที่อยู่']);
}
function fromMain_(r) {
  var code = clean_(r['รหัสพนักงาน']);
  if (!code || /\s/.test(code)) return null;
  var status = clean_(r['Status']) + ' ' + clean_(r['สถานะพนักงาน']);
  if (!blank_(r['ออกจากงาน']) || /ลาออก|ไล่ออก|พ้นสภาพ/.test(status)) return null;
  var name = clean_(r['ชื่อ - สกุล'] || r['ชื่อ-สกุล']) || clean_(clean_(r['ชื่อ']) + ' ' + clean_(r['นามสกุล']));
  if (!name) return null;
  var dept = clean_(r['แผนก']) || clean_(r['แผนก2']), pos = clean_(r['ตำแหน่ง']);
  var emName = clean_(r['ชื่อผู้ติดต่อ(ฉุกเฉิน)']), emTel = clean_(r['เบอร์ผู้ติดต่อ(ฉุกเฉิน)']), emRel = clean_(r['ความสัมพันธ์']);
  return {
    code: code, name: name, nick: clean_(r['ชื่อเล่น']), w: normW_(r['W']),
    dept: dept && pos && dept !== pos ? dept + ' · ' + pos : (dept || pos),
    co: coShort_(r['บริษัท']), tel: clean_(r['เบอร์โทร']), addr: addrOf_(r),
    emerg: blank_(emTel) ? '' : [blank_(emName) ? '' : emName, blank_(emRel) ? '' : '(' + emRel + ')', emTel].filter(String).join(' ')
  };
}
function fromPtt_(r) {
  var code = clean_(r['รหัสใหม่'] || r['รหัสพนักงาน']);
  if (!code || /\s/.test(code)) return null;
  if (!blank_(r['ออก']) || clean_(r['สถานะทำงาน']) === 'ออก' || /ลาออก/.test(clean_(r['สถานะผ่านงาน']))) return null;
  var name = clean_(r['ชื่อสกุล']) || clean_(clean_(r['ชื่อ']) + ' ' + clean_(r['สกุล']));
  if (!name) return null;
  var store = clean_(r['คลัง']), pos = clean_(r['ตำแหน่ง']);
  return {
    code: code, name: name, nick: clean_(r['ชื่อเล่น']), w: normW_(r['สาขา']),
    dept: pos || store,                    // คลัง (สเตชั่น/สโตร์/คอฟฟี่) = ชื่อบริษัทอยู่แล้ว ไม่ต้องซ้ำ
    co: coShort_(r['ชื่อบริษัท']) || coShort_(store) || 'ปั๊ม', tel: '', addr: '', emerg: ''
  };
}
function findEmp_(code) {
  code = clean_(code);
  var list = getEmployees_();
  for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
  return null;
}
// ข้อมูลที่ปล่อยให้หน้าสาธารณะเห็นได้ — ชื่อ ชื่อเล่น แผนก สาขา บริษัท เท่านั้น (ไม่มีเบอร์/ที่อยู่/วันเกิด)
function publicEmp_(e) {
  return { code: e.code, name: e.name, nick: e.nick, w: e.w, wName: wName_(e.w), dept: e.dept, co: e.co };
}
// เรียงผล: ตรงทุกตัว (ชื่อเล่น/ชื่อ/นามสกุล/รหัส) → ขึ้นต้นด้วยคำที่พิมพ์ → มีคำนี้อยู่ข้างใน
// (ชื่อเล่นสั้น ๆ เช่น "นก" จะไม่ถูกคนที่มีคำนี้ซ่อนในนามสกุลดันตกรายการ)
function findEmps_(q) {
  q = norm_(q);
  if (!q) return [];
  var digits = /^\d+$/.test(q);
  if (!digits && q.length < 2) return [];
  var list = getEmployees_(), hits = [];
  for (var i = 0; i < list.length; i++) {
    var e = list[i], s = -1;
    if (digits) {
      if (e.code === q) s = 0; else if (e.code.indexOf(q) === 0) s = 1;
    } else {
      var nick = norm_(e.nick), name = norm_(e.name), parts = name.split(' ').concat(nick.split(' '));
      if (nick === q || parts.indexOf(q) >= 0) s = 0;
      else if (parts.some(function (p) { return p.indexOf(q) === 0; })) s = 1;
      else if ((name + ' ' + nick).indexOf(q) >= 0) s = 2;
    }
    if (s >= 0) hits.push({ s: s, i: i, e: e });
  }
  hits.sort(function (a, b) { return a.s - b.s || a.i - b.i; });
  return hits.slice(0, 10).map(function (h) { return publicEmp_(h.e); });
}

// ───────────────────────── ทะเบียนผู้ใช้แอป (สิทธิ์หน้า HR) ─────────────────────────
// หาแท็บที่มีหัวคอลัมน์ "รหัสพนักงาน" + "E-mail" เอง (ชื่อแท็บคือ Sheet1 — ไม่พึ่งชื่อ)
function getUsers_() {
  var hit = cacheGetBig_('users_v1');
  if (hit) return hit;
  var ss = SpreadsheetApp.openById(USERS_SHEET_ID);
  var sheets = ss.getSheets(), sheet = null, H = {};
  for (var i = 0; i < sheets.length; i++) {
    var hdr = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0].map(clean_);
    if (hdr.indexOf('รหัสพนักงาน') >= 0 && hdr.indexOf('E-mail') >= 0) {
      sheet = sheets[i];
      hdr.forEach(function (h, idx) { if (h && !(h in H)) H[h] = idx; });
      break;
    }
  }
  if (!sheet) throw new Error('ไม่พบแท็บทะเบียนผู้ใช้ (ต้องมีหัวคอลัมน์ รหัสพนักงาน และ E-mail)');
  var find = function (re) { for (var k in H) if (re.test(k)) return H[k]; return -1; };
  var iCode = H['รหัสพนักงาน'], iName = find(/^ชื่อ - สกุล$/), iNick = find(/^ชื่อเล่น$/), iW = find(/^W$/),
      iDept = find(/^แผนก$/), iEmail = H['E-mail'], iStatus = find(/^Status$/), iRole = find(/^User Role$/),
      iTel = find(/^เบอร์โทร/), iCo = find(/^บริษัท$/), iQuit = find(/ลาออก/);
  var vals = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), sheet.getLastColumn()).getValues();
  var out = [];
  for (var r = 0; r < vals.length; r++) {
    var row = vals[r], code = clean_(row[iCode]);
    if (!/^\d+$/.test(code)) continue;
    out.push({
      code: code,
      name: iName >= 0 ? clean_(row[iName]) : '',
      nick: iNick >= 0 ? clean_(row[iNick]) : '',
      w: iW >= 0 ? normW_(row[iW]) : '',
      dept: iDept >= 0 ? clean_(row[iDept]) : '',
      co: iCo >= 0 ? clean_(row[iCo]) : '',
      email: norm_(row[iEmail]),
      status: iStatus >= 0 ? norm_(row[iStatus]) : '',
      role: iRole >= 0 ? (parseInt(row[iRole], 10) || 1) : 1,
      tel: iTel >= 0 ? clean_(row[iTel]) : '',
      active: !(iQuit >= 0 && clean_(row[iQuit]))
    });
  }
  cachePutBig_('users_v1', out, 600);
  return out;
}

// ───────────────────────── session หน้า HR ─────────────────────────
function verifyGoogle_(credential) {
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
                              { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ Google ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
  var info = JSON.parse(res.getContentText());
  if (CLIENT_ID && info.aud !== CLIENT_ID) throw new Error('token ไม่ใช่ของแอป Rattana');
  if (String(info.email_verified) !== 'true') throw new Error('อีเมลนี้ยังไม่ได้ยืนยันกับ Google');
  return norm_(info.email);
}
// ข้อมูลนี้มีพิกัดบ้านพนักงาน — HR / บริหาร / ผู้จัดการ (role ≥ 5) เห็นทุกสาขา · หัวหน้างาน (role 4) เห็นเฉพาะสาขาตัวเอง
function scopeOf_(u) {
  if (u.role >= 5 || /บุคคล|HR|บริหาร/i.test(u.dept)) return 'all';
  if (u.role >= 4) return 'w';
  return '';
}
function login_(credential) {
  var email = verifyGoogle_(credential);
  var users = getUsers_(), u = null;
  for (var i = 0; i < users.length; i++) if (users[i].email === email) { u = users[i]; break; }
  if (!u) throw new Error('ไม่พบอีเมล ' + email + ' ในทะเบียนผู้ใช้ กรุณาติดต่อฝ่ายบุคคล');
  if (u.status !== 'active') throw new Error('บัญชีนี้ยังไม่เปิดใช้งาน (Status ไม่ใช่ Active) กรุณาติดต่อฝ่ายบุคคล');
  var scope = scopeOf_(u);
  if (!scope) throw new Error('หน้านี้สำหรับฝ่ายบุคคล ผู้จัดการ และหัวหน้างานเท่านั้น — ถ้าต้องการแจ้งสถานการณ์ของตัวเอง ให้เปิดแบบสำรวจ');
  var user = { email: email, name: u.name, nick: u.nick, code: u.code, w: u.w, wName: wName_(u.w),
               dept: u.dept, role: u.role, scope: scope };
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('s_' + token, JSON.stringify(user), SESSION_TTL);
  return { ok: true, token: token, user: user, exp: Date.now() + SESSION_TTL * 1000 };
}
function auth_(token) {
  token = String(token || '');
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  var raw = CacheService.getScriptCache().get('s_' + token);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function needAuth_(token) {
  var u = auth_(token);
  if (!u) throw { auth: true, message: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่' };
  return u;
}

// ───────────────────────── แท็บในชีต ─────────────────────────
function prepSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet && name === LOG_SHEET) {
    // ชีตที่สร้างใหม่มีแท็บว่าง "ชีต1"/"Sheet1" — ถ้ายังว่างอยู่ เปลี่ยนชื่อมาใช้เลย ไม่ให้มีแท็บเปล่าค้าง
    var blank = ss.getSheetByName('ชีต1') || ss.getSheetByName('Sheet1');
    if (blank && blank.getLastRow() === 0) { blank.setName(name); sheet = blank; }
  }
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getMaxColumns() < N_COLS) sheet.insertColumnsAfter(sheet.getMaxColumns(), N_COLS - sheet.getMaxColumns());
  var current = sheet.getRange(1, 1, 1, N_COLS).getValues()[0];
  var same = HEADERS.every(function (h, i) { return current[i] === h; });
  if (!same) {
    sheet.getRange(1, 1, 1, N_COLS).setValues([HEADERS]);
    try {
      sheet.setFrozenRows(1);
      sheet.setFrozenColumns(4);
      sheet.getRange(1, 1, 1, N_COLS).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff').setWrap(true);
      var widths = [110, 130, 90, 170, 70, 100, 130, 170, 150, 130, 150, 150, 200, 110, 160, 240, 260,
                    90, 90, 80, 100, 180, 70, 70, 70, 140, 130, 140, 130, 220, 150];
      for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
      var rows = Math.max(sheet.getMaxRows() - 1, 1);
      sheet.getRange(2, C_TS, rows, 1).setNumberFormat('dd/MM/yyyy HH:mm');
      sheet.getRange(2, C_FAT, rows, 1).setNumberFormat('dd/MM/yyyy HH:mm');
      sheet.getRange(2, C_CODE, rows, 1).setNumberFormat('@');
      sheet.getRange(2, C_TEL, rows, 1).setNumberFormat('@');
      // ระบายสีตามระดับ 🔴🟡🟢
      var rng = sheet.getRange(2, C_LEVEL, rows, 1);
      var rules = sheet.getConditionalFormatRules().filter(function (r) {
        return !r.getRanges().some(function (x) { return x.getColumn() === C_LEVEL; });
      });
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('3').setBackground('#ffd5d0').setFontColor('#b91c1c').setBold(true).setRanges([rng]).build());
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('2').setBackground('#fef3c7').setFontColor('#92400e').setRanges([rng]).build());
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('1').setBackground('#dcfce7').setFontColor('#166534').setRanges([rng]).build());
      sheet.setConditionalFormatRules(rules);
    } catch (e) { /* จัดรูปแบบไม่ได้ก็ไม่เป็นไร ข้อมูลสำคัญกว่า */ }
  }
  return sheet;
}
function rowToObj_(row) {
  var lv = parseInt(String(row[C_LEVEL - 1] || ''), 10) || 0;
  var photos = [C_P1, C_P2, C_P3].map(function (c) { return fileIdOf_(row[c - 1]); }).filter(String);
  return {
    id: String(row[C_ID - 1] || ''), ts: isoOf_(row[C_TS - 1]),
    code: String(row[C_CODE - 1] || ''), name: String(row[C_NAME - 1] || ''), nick: String(row[C_NICK - 1] || ''),
    co: String(row[C_CO - 1] || ''), w: normW_(String(row[C_W - 1] || '').split(' ')[0]), dept: String(row[C_DEPT - 1] || ''),
    level: lv, water: String(row[C_WATER - 1] || ''), commute: String(row[C_COMMUTE - 1] || ''),
    place: String(row[C_PLACE - 1] || ''), placeD: String(row[C_PLACE_D - 1] || ''), tel: String(row[C_TEL - 1] || ''),
    vuln: String(row[C_VULN - 1] || ''), help: String(row[C_HELP - 1] || ''), note: String(row[C_NOTE - 1] || ''),
    lat: Number(row[C_LAT - 1]) || null, lng: Number(row[C_LNG - 1]) || null, acc: Number(row[C_ACC - 1]) || null,
    locNote: String(row[C_LOC_NOTE - 1] || ''), photos: photos,
    follow: String(row[C_FOLLOW - 1] || ''), followBy: String(row[C_FBY - 1] || ''), followAt: isoOf_(row[C_FAT - 1]),
    hrNote: String(row[C_HRNOTE - 1] || ''), hrWater: String(row[C_HRWATER - 1] || '')
  };
}
// เซลล์รูปเก็บเป็น =HYPERLINK("https://drive.google.com/file/d/<id>/view","📷 รูป 1") — ดึง id กลับ
function fileIdOf_(v) {
  var m = String(v || '').match(/\/d\/([-\w]{20,})/) || String(v || '').match(/id=([-\w]{20,})/);
  return m ? m[1] : '';
}
function readAll_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  // อ่านสูตรด้วย (คอลัมน์รูปเป็น HYPERLINK — getValues ได้แค่ข้อความ "📷 รูป 1")
  var vals = sheet.getRange(2, 1, last - 1, N_COLS).getValues();
  var fx = sheet.getRange(2, C_P1, last - 1, 3).getFormulas();
  for (var i = 0; i < vals.length; i++) for (var k = 0; k < 3; k++) if (fx[i][k]) vals[i][C_P1 - 1 + k] = fx[i][k];
  return vals;
}
function findRowById_(sheet, id) {
  id = String(id || '');
  if (!id) return -1;
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, C_ID, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}
function personKey_(code, name) { return code && code !== '-' ? String(code) : 'N:' + norm_(name); }

// ───────────────────────── รูปภาพ (เก็บใน Drive) ─────────────────────────
function photoFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var parent = null;
  try { var ps = DriveApp.getFileById(ss.getId()).getParents(); if (ps.hasNext()) parent = ps.next(); } catch (e) {}
  var name = APP_NAME + ' — รูปบ้านพนักงาน (' + EVENT_NAME + ')';
  var folder = parent ? parent.createFolder(name) : DriveApp.createFolder(name);
  props.setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}
function savePhotos_(photos, emp, id) {
  var out = [];
  if (!photos || !photos.length) return out;
  var folder = photoFolder_();
  var stamp = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmm');
  for (var i = 0; i < photos.length && i < MAX_PHOTOS; i++) {
    var b64 = String(photos[i] || '').replace(/^data:image\/\w+;base64,/, '');
    if (!b64 || b64.length > 6000000) continue;
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg',
      stamp + '_' + (emp.code || 'x') + '_' + clean_(emp.name).replace(/[\\/:*?"<>|]/g, '') + '_' + (i + 1) + '.jpg');
    var f = folder.createFile(blob);
    f.setDescription(APP_NAME + ' · ' + id);
    // ให้ HR เปิดดูรูปในแดชบอร์ดได้ (ลิงก์เดาไม่ได้) — ถ้าโดเมนไม่ให้แชร์สาธารณะ ใช้แชร์ในองค์กรแทน
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (e) { try { f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {} }
    out.push(f.getId());
  }
  return out;
}
function photoCell_(fileId, n) {
  return fileId ? '=HYPERLINK("https://drive.google.com/file/d/' + fileId + '/view","📷 รูป ' + n + '")' : '';
}

// ───────────────────────── รับรายงาน (สาธารณะ) ─────────────────────────
function submit_(p) {
  if (clean_(p.hp)) return { ok: true, id: 'x' };                 // honeypot: บอทกรอกช่องซ่อน
  var emp;
  if (clean_(p.code)) {
    emp = findEmp_(p.code);
    if (!emp) return { ok: false, error: 'ไม่พบรหัสพนักงาน ' + clean_(p.code) };
  } else {
    // ไม่พบชื่อในทะเบียน (พนักงานใหม่ ฯลฯ) — รับไว้ก่อน ไม่ปิดทางแจ้งเหตุ
    var nm = clean_(p.manualName).slice(0, 80);
    if (nm.length < 3) return { ok: false, error: 'กรุณาพิมพ์ชื่อ-นามสกุล' };
    emp = { code: '-', name: nm, nick: '', w: normW_(p.manualW).slice(0, 10), dept: '(ไม่พบในทะเบียน)', co: '' };
  }
  var lv = parseInt(p.level, 10);
  if (!LEVELS[lv]) return { ok: false, error: 'กรุณาเลือกระดับสถานการณ์' };
  var lat = Number(p.lat), lng = Number(p.lng), acc = Number(p.acc);
  var hasGps = p.lat !== '' && p.lng !== '' && isFinite(lat) && isFinite(lng) &&
               Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
  var locNote = cleanMulti_(p.locNote, 300);
  if (!hasGps && !locNote) return { ok: false, error: 'ยังไม่มีตำแหน่ง — กดจับพิกัด หรือพิมพ์ที่อยู่/จุดสังเกต' };

  var id = Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  var fileIds = [];
  try { fileIds = savePhotos_(p.photos, emp, id); } catch (e) { locNote = (locNote ? locNote + ' · ' : '') + '(บันทึกรูปไม่สำเร็จ: ' + e.message + ')'; }

  var row = [];
  for (var c = 1; c <= N_COLS; c++) row[c - 1] = '';
  row[C_ID - 1] = id;
  row[C_TS - 1] = new Date();
  row[C_CODE - 1] = emp.code;
  row[C_NAME - 1] = emp.name;
  row[C_NICK - 1] = emp.nick || '';
  row[C_CO - 1] = emp.co || '';
  row[C_W - 1] = emp.w ? emp.w + ' ' + wName_(emp.w) : '';
  row[C_DEPT - 1] = emp.dept || '';
  row[C_LEVEL - 1] = LEVELS[lv];
  row[C_WATER - 1] = clean_(p.water).slice(0, 60);
  row[C_COMMUTE - 1] = clean_(p.commute).slice(0, 60);
  row[C_PLACE - 1] = clean_(p.place).slice(0, 60);
  row[C_PLACE_D - 1] = cleanMulti_(p.placeD, 300);
  row[C_TEL - 1] = clean_(p.tel).slice(0, 30);
  row[C_VULN - 1] = clean_(p.vuln).slice(0, 200);
  row[C_HELP - 1] = clean_(p.help).slice(0, 400);
  row[C_NOTE - 1] = cleanMulti_(p.note, 1000);
  row[C_LAT - 1] = hasGps ? Math.round(lat * 1e6) / 1e6 : '';
  row[C_LNG - 1] = hasGps ? Math.round(lng * 1e6) / 1e6 : '';
  row[C_ACC - 1] = hasGps && isFinite(acc) && p.acc !== '' ? Math.round(acc) : '';
  row[C_MAP - 1] = hasGps ? '=HYPERLINK("https://www.google.com/maps?q=' + lat.toFixed(6) + ',' + lng.toFixed(6) + '","📍 เปิดแผนที่")' : '';
  row[C_LOC_NOTE - 1] = locNote;
  row[C_P1 - 1] = photoCell_(fileIds[0], 1);
  row[C_P2 - 1] = photoCell_(fileIds[1], 2);
  row[C_P3 - 1] = photoCell_(fileIds[2], 3);
  row[C_SRC - 1] = clean_(p.ua).slice(0, 120);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    prepSheet_(LOG_SHEET).appendRow(row);
    upsertLatest_(row, emp);
  } finally { lock.releaseLock(); }
  try { alertUrgent_(row, lv, fileIds); } catch (e) { /* ส่งเมลไม่ได้ ไม่กระทบการบันทึก */ }
  return { ok: true, id: id, photos: fileIds.length };
}
// แท็บ "ล่าสุดรายคน": 1 คน 1 แถว — แทนที่แถวเดิมด้วยรายงานใหม่ แล้วเรียง วิกฤต → ปกติ, ใหม่ → เก่า
function upsertLatest_(row, emp) {
  var sheet = prepSheet_(LATEST_SHEET);
  var key = personKey_(emp.code, emp.name), last = sheet.getLastRow(), target = -1;
  if (last >= 2) {
    var keys = sheet.getRange(2, C_CODE, last - 1, 2).getValues();
    for (var i = 0; i < keys.length; i++) if (personKey_(String(keys[i][0]), keys[i][1]) === key) { target = i + 2; break; }
  }
  if (target < 0) target = last + 1;
  sheet.getRange(target, 1, 1, N_COLS).setValues([row]);
  var n = sheet.getLastRow() - 1;
  if (n > 1) sheet.getRange(2, 1, n, N_COLS).sort([{ column: C_LEVEL, ascending: false }, { column: C_TS, ascending: false }]);
}
// แจ้ง HR ทางอีเมลทันทีเมื่อ "วิกฤต" หรือขออพยพ / ขอไปโรงพยาบาล
function alertUrgent_(row, lv, fileIds) {
  var help = String(row[C_HELP - 1] || '');
  if (!(lv === 3 || /อพยพ|โรงพยาบาล/.test(help))) return;
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('ALERT_OFF')) return;
  var to = props.getProperty('ALERT_EMAILS');
  if (!to) {
    to = getUsers_().filter(function (e) {
      return e.active && e.status === 'active' && e.email && /บุคคล|HR/i.test(e.dept);
    }).map(function (e) { return e.email; }).join(',');
  }
  if (!to) return;
  var emp = findEmp_(row[C_CODE - 1]) || {};
  var who = row[C_NAME - 1] + (row[C_NICK - 1] ? ' (' + row[C_NICK - 1] + ')' : '');
  var subject = '🚨 [' + APP_NAME + ' · ' + EVENT_NAME + '] ' + (lv === 3 ? 'วิกฤต' : 'ขอความช่วยเหลือ') + ' — ' + who + ' · ' + row[C_W - 1];
  var lat = row[C_LAT - 1], lng = row[C_LNG - 1];
  var body = 'มีพนักงานแจ้งสถานการณ์น้ำท่วมที่ต้องดูแลด่วน\n\n' +
    'พนักงาน: ' + who + '  รหัส ' + row[C_CODE - 1] + '\n' +
    'บริษัท/สาขา: ' + (row[C_CO - 1] || '-') + ' / ' + row[C_W - 1] + '\n' +
    'แผนก/ตำแหน่ง: ' + row[C_DEPT - 1] + '\n' +
    'ระดับ: ' + row[C_LEVEL - 1] + '\n' +
    'ระดับน้ำ: ' + row[C_WATER - 1] + '\n' +
    'ตอนนี้พักอยู่ที่: ' + row[C_PLACE - 1] + (row[C_PLACE_D - 1] ? ' — ' + row[C_PLACE_D - 1] : '') + '\n' +
    'เบอร์ติดต่อ: ' + (row[C_TEL - 1] || emp.tel || '-') + '\n' +
    (emp.emerg ? 'ผู้ติดต่อฉุกเฉิน (ทะเบียน): ' + emp.emerg + '\n' : '') +
    'ผู้ที่ต้องดูแลพิเศษ: ' + (row[C_VULN - 1] || '-') + '\n' +
    'ต้องการ: ' + (help || '-') + '\n' +
    (row[C_NOTE - 1] ? 'รายละเอียด: ' + row[C_NOTE - 1] + '\n' : '') +
    '\nตำแหน่ง: ' + (lat !== '' ? 'https://www.google.com/maps?q=' + lat + ',' + lng + (row[C_ACC - 1] ? ' (±' + row[C_ACC - 1] + ' ม.)' : '') : (row[C_LOC_NOTE - 1] || '-')) + '\n' +
    (lat !== '' && row[C_LOC_NOTE - 1] ? 'หมายเหตุตำแหน่ง: ' + row[C_LOC_NOTE - 1] + '\n' : '') +
    (emp.addr ? 'ที่อยู่ตามทะเบียน: ' + emp.addr + '\n' : '') +
    (fileIds.length ? 'รูป: ' + fileIds.map(function (f) { return 'https://drive.google.com/file/d/' + f + '/view'; }).join('  ') + '\n' : '') +
    '\nเปิดแดชบอร์ด: ' + APP_URL + '?hr=1\nรหัสรายการ: ' + row[C_ID - 1];
  MailApp.sendEmail({ to: to, subject: subject, body: body, name: APP_NAME });
}

// ───────────────────────── ข้อมูลหน้า HR ─────────────────────────
function inScope_(user, wCell) {
  if (user.scope === 'all') return true;
  return normW_(String(wCell || '').split(' ')[0]) === user.w;
}
function list_(user, days) {
  var vals = readAll_(prepSheet_(LOG_SHEET));
  var since = days > 0 ? Date.now() - days * 864e5 : 0;
  var rows = [];
  for (var i = 0; i < vals.length; i++) {
    if (!vals[i][C_ID - 1]) continue;
    if (!inScope_(user, vals[i][C_W - 1])) continue;
    var o = rowToObj_(vals[i]);
    if (since && new Date(o.ts).getTime() < since) continue;
    rows.push(o);
  }
  // รายชื่อพนักงานในขอบเขต — ทำรายการ "ยังไม่รายงาน" + เบอร์/ที่อยู่ตามทะเบียน/ผู้ติดต่อฉุกเฉิน ให้ HR ตามตัว
  var reg = getEmployees_().filter(function (e) { return user.scope === 'all' || e.w === user.w; });
  return { ok: true, rows: rows, reg: reg, user: user, today: today_() };
}
function follow_(user, p) {
  var status = clean_(p.follow);
  if (FOLLOW.indexOf(status) < 0) return { ok: false, error: 'สถานะไม่ถูกต้อง' };
  var note = cleanMulti_(p.hrNote, 1000), water = clean_(p.hrWater).slice(0, 60);
  var at = status ? new Date() : '';
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var done = 0;
    [LOG_SHEET, LATEST_SHEET].forEach(function (name) {
      var sheet = prepSheet_(name);
      var r = findRowById_(sheet, p.id);
      if (r < 0) return;
      if (!inScope_(user, sheet.getRange(r, C_W).getValue())) return;
      sheet.getRange(r, C_FOLLOW, 1, 5).setValues([[status, status ? user.name : '', at, note, water]]);
      done++;
    });
    if (!done) return { ok: false, error: 'ไม่พบรายการ (หรือไม่มีสิทธิ์สาขานี้)' };
  } finally { lock.releaseLock(); }
  return { ok: true, follow: status, followBy: status ? user.name : '', followAt: at ? at.toISOString() : '', hrNote: note, hrWater: water };
}

// ───────────────────────── ทางเข้า ─────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  try {
    if (action === 'ping') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName(LOG_SHEET), lt = ss.getSheetByName(LATEST_SHEET);
      return json_({ ok: true, app: APP_NAME, event: EVENT_NAME, sheet: ss.getUrl(), employees: getEmployees_().length,
                     count: sh ? Math.max(sh.getLastRow() - 1, 0) : 0, people: lt ? Math.max(lt.getLastRow() - 1, 0) : 0 });
    }
    if (action === 'find') return json_({ ok: true, emps: findEmps_(p.q) });
    if (action === 'emp') {
      var emp = findEmp_(p.code);
      if (!emp) return json_({ ok: false, error: 'ไม่พบรหัสพนักงาน' });
      return json_({ ok: true, emp: publicEmp_(emp) });
    }
    if (action === 'me') return json_({ ok: true, user: needAuth_(p.token) });
    if (action === 'list') return json_(list_(needAuth_(p.token), parseInt(p.days, 10) || 0));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    if (err && err.auth) return json_({ ok: false, error: err.message, auth: true });
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'ข้อมูลที่ส่งมาไม่ใช่ JSON' }); }
  var action = p.action || '';
  try {
    if (action === 'submit') return json_(submit_(p));
    if (action === 'login') return json_(login_(p.credential));
    if (action === 'logout') {
      if (/^[0-9a-f]{64}$/.test(String(p.token || ''))) CacheService.getScriptCache().remove('s_' + p.token);
      return json_({ ok: true });
    }
    if (action === 'follow') return json_(follow_(needAuth_(p.token), p));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    if (err && err.auth) return json_({ ok: false, error: err.message, auth: true });
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

// ───────────────────────── ตั้งค่าครั้งแรก (Run ในตัวแก้ไข) ─────────────────────────
function setupSheet() {
  CacheService.getScriptCache().remove('emp_v1_n');
  var log = prepSheet_(LOG_SHEET), latest = prepSheet_(LATEST_SHEET);
  var folder = photoFolder_();
  var emps = getEmployees_(), byCo = {};
  emps.forEach(function (e) { var k = e.co || '(ไม่ระบุ)'; byCo[k] = (byCo[k] || 0) + 1; });
  Logger.log('พร้อมใช้งาน ✓  แท็บ "' + log.getName() + '" ' + Math.max(log.getLastRow() - 1, 0) + ' รายการ · "' +
             latest.getName() + '" ' + Math.max(latest.getLastRow() - 1, 0) + ' คน');
  Logger.log('โฟลเดอร์รูป: ' + folder.getUrl());
  Logger.log('รายชื่อพนักงานที่ค้นหาได้ ' + emps.length + ' คน → ' +
             Object.keys(byCo).map(function (k) { return k + ' ' + byCo[k]; }).join(' · '));
  var props = PropertiesService.getScriptProperties();
  var to = props.getProperty('ALERT_EMAILS');
  var hr = getUsers_().filter(function (e) { return e.active && e.status === 'active' && e.email && /บุคคล|HR/i.test(e.dept); });
  Logger.log(props.getProperty('ALERT_OFF') ? 'ปิดอีเมลด่วนอยู่ (ALERT_OFF)' :
             to ? 'อีเมลด่วน → ' + to : 'อีเมลด่วน → แผนกบุคคลในทะเบียนผู้ใช้ ' + hr.length + ' คน: ' + hr.map(function (e) { return e.email; }).join(', '));
  Logger.log('ขั้นต่อไป: Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me / Who has access: Anyone');
}
