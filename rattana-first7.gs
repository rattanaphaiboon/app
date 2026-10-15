// Rattana 7 วันแรก — หลังบ้าน (Google Apps Script) v1.2
// ติดตามการสอนงานพนักงานใหม่ใน 7 วันแรก (พนักงานใหม่ตอบเอง 3 ข้อ · ฝ่ายบุคคลดูผล)
//
// ══════════════ วิธีติดตั้ง (ทำครั้งเดียว) ══════════════
//  1. สร้าง Google Sheet ใหม่ ตั้งชื่อ "Rattana 7 วันแรก" (ชีตนี้จะเก็บคำตอบทั้งหมด)
//  2. เมนู ส่วนขยาย (Extensions) ▸ Apps Script → ลบโค้ดเดิมทิ้ง วางไฟล์นี้ทั้งไฟล์ → Ctrl+S
//  3. เลือกฟังก์ชัน setupSheet ▸ Run  (ครั้งแรกจะขอสิทธิ์ — กดอนุญาต)
//     ดูที่ Execution log ต้องขึ้น "พร้อมใช้งาน" และจำนวนพนักงานใหม่ที่อ่านได้จากทะเบียน
//  4. Deploy ▸ New deployment ▸ ⚙️ Web app
//        Execute as: Me  /  Who has access: Anyone (ทุกคน)   ← ต้อง "ทุกคน" เท่านั้น
//  5. คัดลอก URL ที่ลงท้าย /exec ส่งให้ Claude ใส่ใน CONFIG.gasUrl ของ rattana-first7.html
//     (ถ้า URL มี /a/macros/rattanaphaiboon.com/ ให้ตัดส่วนนั้นออก เหลือ script.google.com/macros/s/…/exec)
//  แก้โค้ดครั้งต่อไป: Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy (URL เดิม)
//  เช็คว่าติดแล้ว: เปิด URL ต่อท้าย ?action=ping → ต้องเห็น {"ok":true,"version":"1.0",…}
//
//  ตัวเลือกเพิ่มเติม (Project Settings ▸ Script Properties):
//    ALERT_EMAILS = hr@rattanaphaiboon.com, …   ← ส่งอีเมลทันทีเมื่อน้องใหม่ "เสี่ยงสูง" (ยังไม่มีใครสอน / อยากลาออก)

var VERSION = '1.2';
var REG_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ'; // ทะเบียนพนักงาน (ชีตบริษัท แท็บหลัก)
var CLIENT_ID = '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com';
var RESP_SHEET = 'คำตอบ';
var SESSION_TTL = 21600;           // อายุ session ของหน้า HR = 6 ชั่วโมง
var MAX_DAYS = 45;                 // รับคำตอบได้ถึงวันที่ 45 นับจากวันเริ่มงาน (เผื่อตอบช้า)
var APP_URL = 'https://rattanaphaiboon.github.io/app/rattana-first7.html';

// ข้อความต้องตรงกับฝั่งหน้าเว็บ (TAUGHT / HELPS ใน rattana-first7.html) · ผู้สอนงาน = ชื่อที่น้องใหม่พิมพ์เอง (สูงสุด 5 ชื่อ)
var TAUGHT = { full: 'สอนแล้ว เข้าใจงาน', part: 'สอนบ้าง ยังไม่ครบ', none: 'ยังไม่มีใครสอน' };
var HELPS = ['สอนงานเพิ่ม', 'อุปกรณ์/เครื่องมือ', 'เพื่อนร่วมงาน/หัวหน้า', 'เวลา/กะ/วันหยุด', 'เงินเดือน/สวัสดิการ', 'เดินทาง/ที่พัก'];
var RISK = { red: 'เสี่ยงสูง', yellow: 'ต้องดูแล', green: 'ปกติ' };
var BRANCH = { HQ: 'สำนักงานใหญ่', W1: 'สมุทรสงคราม', W2: 'สุพรรณบุรี', W3: 'ราชบุรี', W4: 'นครปฐม', C4: 'รัตนมาร์ท ดอนตูม' };

// ตำแหน่งคอลัมน์ตายตัว (1-based) ของแท็บ "คำตอบ" — โค้ดอ้างด้วยเลข ไม่พึ่งข้อความหัวตาราง
var C_ID = 1, C_TS = 2, C_CODE = 3, C_NAME = 4, C_NICK = 5, C_W = 6, C_DEPT = 7, C_SUP = 8, C_START = 9,
    C_DAY = 10, C_ROUND = 11, C_TAUGHT = 12, C_TEACHER = 13, C_READY = 14, C_STAY = 15, C_HELP = 16,
    C_COMMENT = 17, C_RISK = 18, C_UA = 19, C_HANDLED = 20, C_HBY = 21, C_HAT = 22, C_HNOTE = 23,
    C_TOPICS = 24, C_LEARN = 25;   // v1.2 ต่อท้าย ไม่แทรกกลาง — ชีตที่มีข้อมูลเดิมไม่เลื่อน
var N_COLS = 25;
var HEADERS = ['รหัสรายการ', 'เวลา', 'รหัสพนักงาน', 'ชื่อ - สกุล', 'ชื่อเล่น', 'สาขา', 'แผนก', 'หัวหน้างาน',
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
function wName_(w) { w = clean_(w).toUpperCase(); return BRANCH[w] || clean_(w); }
function ymd_(d) { return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd'); }
// วันเริ่มงานในทะเบียน: เป็น Date หรือข้อความ d/M/yyyy (บางเซลล์กรอกเป็น พ.ศ.) → 'yyyy-MM-dd'
function parseStart_(v) {
  if (v instanceof Date && !isNaN(v)) return ymd_(v);
  var m = clean_(v).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!m) return '';
  var y = +m[3]; if (y > 2400) y -= 543;
  var d = new Date(y, +m[2] - 1, +m[1]);
  return isNaN(d) ? '' : ymd_(d);
}
// ทำงานวันที่เท่าไร (วันเริ่มงาน = วันที่ 1) ตามเวลาไทย
function dayNo_(start) {
  if (!start) return 0;
  var a = start.split('-'), t = ymd_(new Date()).split('-');
  var d0 = Date.UTC(+a[0], +a[1] - 1, +a[2]), d1 = Date.UTC(+t[0], +t[1] - 1, +t[2]);
  return Math.floor((d1 - d0) / 864e5) + 1;
}
function roundOf_(day) { return day && day <= 4 ? 'วันที่ 3' : 'วันที่ 7'; }
function riskOf_(taught, ready, stay, helps) {
  if (taught === 'none' || stay <= 2) return 'red';
  if (taught === 'part' || ready <= 2 || stay === 3 || helps.length) return 'yellow';
  return 'green';
}

// ───────────────────────── ทะเบียนพนักงาน ─────────────────────────
// หาแท็บที่มีหัวคอลัมน์ "รหัสพนักงาน" + "E-mail" เอง (ชื่อแท็บเปลี่ยนได้ ไม่พัง) · แคช 10 นาที
function getRegistry_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('reg_f7_v1');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var ss = SpreadsheetApp.openById(REG_SHEET_ID);
  var sheets = ss.getSheets(), sheet = null, H = {};
  for (var i = 0; i < sheets.length; i++) {
    var hdr = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0].map(clean_);
    if (hdr.indexOf('รหัสพนักงาน') >= 0 && hdr.indexOf('E-mail') >= 0) {
      sheet = sheets[i];
      hdr.forEach(function (h, idx) { if (h && !(h in H)) H[h] = idx; });
      break;
    }
  }
  if (!sheet) throw new Error('ไม่พบแท็บทะเบียนพนักงาน (ต้องมีหัวคอลัมน์ รหัสพนักงาน และ E-mail)');
  var find = function (re) { for (var k in H) if (re.test(k)) return H[k]; return -1; };
  var iCode = H['รหัสพนักงาน'], iName = find(/^ชื่อ - สกุล$/), iNick = find(/^ชื่อเล่น$/), iW = find(/^W$/),
      iDept = find(/^แผนก$/), iEmail = H['E-mail'], iStatus = find(/^Status$/), iRole = find(/^User Role$/),
      iPhoto = find(/รูปพนักงาน/), iQuit = find(/ลาออก/), iStart = find(/^เริ่มงาน$/), iSup = find(/หัวหน้างาน/);
  var vals = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), sheet.getLastColumn()).getValues();
  var out = [];
  for (var r = 0; r < vals.length; r++) {
    var row = vals[r], code = clean_(row[iCode]);
    if (!/^\d+$/.test(code)) continue;
    out.push({
      code: code,
      name: iName >= 0 ? clean_(row[iName]) : '',
      nick: iNick >= 0 ? clean_(row[iNick]) : '',
      w: iW >= 0 ? clean_(row[iW]).toUpperCase() : '',
      dept: iDept >= 0 ? clean_(row[iDept]) : '',
      email: norm_(row[iEmail]),
      status: iStatus >= 0 ? norm_(row[iStatus]) : '',
      role: iRole >= 0 ? (parseInt(row[iRole], 10) || 1) : 1,
      photo: iPhoto >= 0 ? clean_(row[iPhoto]) : '',
      start: iStart >= 0 ? parseStart_(row[iStart]) : '',
      sup: iSup >= 0 ? clean_(row[iSup]) : '',
      active: !(iQuit >= 0 && clean_(row[iQuit]))
    });
  }
  try { var s = JSON.stringify(out); if (s.length < 95000) cache.put('reg_f7_v1', s, 600); } catch (e) {}
  return out;
}
function findEmp_(code) {
  code = clean_(code);
  var reg = getRegistry_();
  for (var i = 0; i < reg.length; i++) if (reg[i].code === code) return reg[i];
  return null;
}
// ข้อมูลที่ส่งให้หน้าแบบประเมินได้ — ชื่อ ชื่อเล่น แผนก สาขา รูป วันเริ่มงาน เท่านั้น
// + รายชื่อเพื่อนร่วมงานสาขาเดียวกัน (ชื่อ/ชื่อเล่น/แผนก) ไว้แนะนำตอนพิมพ์ชื่อคนสอนงาน — หัวหน้างาน + แผนกเดียวกันขึ้นก่อน
function publicEmp_(e) {
  var day = dayNo_(e.start), supKey = norm_(e.sup);
  var mates = getRegistry_().filter(function (m) { return m.active && m.w === e.w && m.code !== e.code; })
    .map(function (m) { return { name: m.name, nick: m.nick, dept: m.dept, sup: !!supKey && norm_(m.name) === supKey }; })
    .sort(function (a, b) { return (b.sup - a.sup) || ((b.dept === e.dept) - (a.dept === e.dept)); });
  return { code: e.code, name: e.name, nick: e.nick, w: e.w, wName: wName_(e.w), dept: e.dept, photo: e.photo,
           start: e.start, day: day, round: roundOf_(day), mates: mates };
}
function findUserByEmail_(email) {
  email = norm_(email);
  if (!email) return null;
  var reg = getRegistry_();
  for (var i = 0; i < reg.length; i++) if (reg[i].email === email) return reg[i];
  return null;
}

// ───────────────────────── session ของหน้า HR ─────────────────────────
// คำตอบของน้องใหม่เป็นเรื่องอ่อนไหว (เช่น "หัวหน้าไม่สอน") → ให้ดูได้เฉพาะ ฝ่ายบุคคล / บริหาร / role ≥ 7
function verifyGoogle_(credential) {
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
                              { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ Google ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
  var info = JSON.parse(res.getContentText());
  if (CLIENT_ID && info.aud !== CLIENT_ID) throw new Error('token ไม่ใช่ของแอป Rattana');
  if (String(info.email_verified) !== 'true') throw new Error('อีเมลนี้ยังไม่ได้ยืนยันกับ Google');
  return norm_(info.email);
}
function canView_(u) { return u.role >= 7 || /บุคคล|HR|บริหาร/i.test(u.dept); }
function login_(credential) {
  var email = verifyGoogle_(credential);
  var u = findUserByEmail_(email);
  if (!u) throw new Error('ไม่พบอีเมล ' + email + ' ในทะเบียนพนักงาน กรุณาติดต่อฝ่ายบุคคล');
  if (u.status !== 'active') throw new Error('บัญชีนี้ยังไม่เปิดใช้งาน (Status ไม่ใช่ Active) กรุณาติดต่อฝ่ายบุคคล');
  if (!canView_(u)) throw new Error('หน้านี้สำหรับฝ่ายบุคคลและผู้บริหารเท่านั้น (คำตอบของพนักงานใหม่เป็นความลับ)');
  var user = { email: email, name: u.name, nick: u.nick, code: u.code, w: u.w, wName: wName_(u.w),
               dept: u.dept, role: u.role };
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

// ───────────────────────── แท็บคำตอบ ─────────────────────────
function getRespSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RESP_SHEET) || ss.insertSheet(RESP_SHEET);
  var current = sheet.getRange(1, 1, 1, N_COLS).getValues()[0];
  var same = HEADERS.every(function (h, i) { return current[i] === h; });
  if (!same) {
    sheet.getRange(1, 1, 1, N_COLS).setValues([HEADERS]);
    try {
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, N_COLS).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff').setWrap(true);
      var widths = [110, 140, 90, 190, 80, 70, 130, 160, 95, 70, 70, 140, 160, 90, 90, 220, 300, 90, 150, 70, 150, 140, 260, 300, 300];
      for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
      var n = Math.max(sheet.getMaxRows() - 1, 1);
      sheet.getRange(2, C_TS, n, 1).setNumberFormat('dd/MM/yyyy HH:mm');
      sheet.getRange(2, C_CODE, n, 1).setNumberFormat('@');
      sheet.getRange(2, C_START, n, 1).setNumberFormat('@');
    } catch (e) { /* จัดรูปแบบไม่ได้ก็ไม่เป็นไร ข้อมูลสำคัญกว่า */ }
  }
  return sheet;
}
function keyOf_(map, label) { for (var k in map) if (map[k] === label) return k; return ''; }
function rowToObj_(row) {
  var ts = row[C_TS - 1], hat = row[C_HAT - 1], st = row[C_START - 1];
  return {
    id: String(row[C_ID - 1] || ''),
    ts: ts instanceof Date ? ts.toISOString() : String(ts || ''),
    code: String(row[C_CODE - 1] || ''), name: String(row[C_NAME - 1] || ''), nick: String(row[C_NICK - 1] || ''),
    w: String(row[C_W - 1] || ''), dept: String(row[C_DEPT - 1] || ''), sup: String(row[C_SUP - 1] || ''),
    start: st instanceof Date ? ymd_(st) : String(st || ''),
    day: Number(row[C_DAY - 1]) || 0, round: String(row[C_ROUND - 1] || ''),
    taught: keyOf_(TAUGHT, String(row[C_TAUGHT - 1] || '')),
    teachers: String(row[C_TEACHER - 1] || '').split(/\s*,\s*/).filter(String),
    ready: Number(row[C_READY - 1]) || 0, stay: Number(row[C_STAY - 1]) || 0,
    helps: String(row[C_HELP - 1] || '').split(/\s*,\s*/).filter(String),
    comment: String(row[C_COMMENT - 1] || ''),
    risk: keyOf_(RISK, String(row[C_RISK - 1] || '')) || 'green',
    handled: String(row[C_HANDLED - 1] || '') === 'Y',
    handledBy: String(row[C_HBY - 1] || ''),
    handledAt: hat instanceof Date ? hat.toISOString() : String(hat || ''),
    note: String(row[C_HNOTE - 1] || ''),
    topics: String(row[C_TOPICS - 1] || ''), learn: String(row[C_LEARN - 1] || '')
  };
}
function listRows_() {
  var sheet = getRespSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var vals = sheet.getRange(2, 1, last - 1, N_COLS).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) if (vals[i][C_ID - 1]) out.push(rowToObj_(vals[i]));
  return out;
}
function findRowById_(sheet, id) {
  id = String(id || '');
  if (!id) return -1;
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, C_ID, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

// ───────────────────────── รับคำตอบจากพนักงานใหม่ (สาธารณะ) ─────────────────────────
function submit_(p) {
  if (clean_(p.hp)) return { ok: true, id: 'x' };            // honeypot: บอทกรอกช่องซ่อน → ทำเป็นรับไว้เฉย ๆ
  var emp = findEmp_(p.code);
  if (!emp || !emp.active) return { ok: false, error: 'ไม่พบรหัสพนักงานนี้ในทะเบียน กรุณาติดต่อฝ่ายบุคคล' };
  var day = dayNo_(emp.start);
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
  var risk = riskOf_(taught, ready, stay, helps);
  var round = roundOf_(day);
  var id = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getRespSheet_().appendRow([id, new Date(), emp.code, emp.name, emp.nick, emp.w, emp.dept, emp.sup, emp.start,
                               day || '', round, TAUGHT[taught], teachers.join(', '), ready, stay, helps.join(', '),
                               comment, RISK[risk], ua, '', '', '', '', topics, learn]);
  } finally { lock.releaseLock(); }
  try { alertRisk_(emp, day, round, taught, teachers, ready, stay, helps, comment + (topics ? '\n[สอนเรื่อง] ' + topics : '') + (learn ? '\n[อยากเรียนรู้เพิ่ม] ' + learn : ''), risk, id); } catch (e) { /* ส่งเมลไม่ได้ ไม่กระทบการบันทึก */ }
  return { ok: true, id: id, risk: risk, round: round, day: day };
}
// เสี่ยงสูง (ยังไม่มีใครสอน / อยากลาออก) → อีเมลถึง HR ทันที ถ้าตั้ง ALERT_EMAILS ไว้
function alertRisk_(emp, day, round, taught, teachers, ready, stay, helps, comment, risk, id) {
  if (risk !== 'red') return;
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  if (!to) return;
  var subject = '[7 วันแรก] 🔴 น้องใหม่เสี่ยงลาออก — ' + emp.name + (emp.nick ? ' (' + emp.nick + ')' : '') + ' · ' + wName_(emp.w);
  var body = 'พนักงานใหม่ตอบแบบประเมิน 7 วันแรก และอยู่ในกลุ่ม "เสี่ยงสูง" กรุณาติดต่อช่วยเหลือโดยเร็ว\n\n' +
    'พนักงาน: ' + emp.name + (emp.nick ? ' (' + emp.nick + ')' : '') + '  รหัส ' + emp.code + '\n' +
    'สาขา/แผนก: ' + wName_(emp.w) + ' / ' + emp.dept + '\n' +
    'หัวหน้างาน: ' + (emp.sup || '-') + '\n' +
    'เริ่มงาน: ' + (emp.start || '-') + (day ? '  (ทำงานวันที่ ' + day + ')' : '') + ' · รอบ ' + round + '\n\n' +
    '1. การสอนงาน: ' + TAUGHT[taught] + (teachers.length ? ' — สอนโดย ' + teachers.join(', ') : '') + '\n' +
    '2. ความพร้อมทำงาน: ' + ready + '/5\n' +
    '3. ความรู้สึก/อยากทำงานต่อ: ' + stay + '/5\n' +
    'อยากให้ HR ช่วย: ' + (helps.length ? helps.join(', ') : '-') + '\n\n' +
    'ความคิดเห็น:\n' + (comment || '(ไม่มี)') + '\n\n' +
    'เปิดดูในระบบ: ' + APP_URL + '\nรหัสรายการ: ' + id;
  MailApp.sendEmail({ to: to, subject: subject, body: body, name: 'Rattana 7 วันแรก' });
}

// ───────────────────────── ทางเข้า ─────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  try {
    if (action === 'ping') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName(RESP_SHEET);
      return json_({ ok: true, app: 'Rattana 7 วันแรก', sheet: ss.getUrl(), count: sh ? Math.max(sh.getLastRow() - 1, 0) : 0 });
    }
    if (action === 'emp') {
      var emp = findEmp_(p.code);
      if (!emp || !emp.active) return json_({ ok: false, error: 'ไม่พบรหัสพนักงาน' });
      return json_({ ok: true, emp: publicEmp_(emp), maxDays: MAX_DAYS });
    }
    if (action === 'me') { var u0 = needAuth_(p.token); return json_({ ok: true, user: u0 }); }
    if (action === 'list') {
      var u = needAuth_(p.token);
      return json_({ ok: true, rows: listRows_(), user: u });
    }
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
    if (action === 'handle') {
      var u = needAuth_(p.token);
      var sheet = getRespSheet_();
      var r = findRowById_(sheet, p.id);
      if (r < 0) return json_({ ok: false, error: 'ไม่พบรายการ' });
      var on = !!p.handled, note = clean_(p.note).slice(0, 500);
      sheet.getRange(r, C_HANDLED, 1, 4).setValues([[on ? 'Y' : '', on ? u.name : '', on ? new Date() : '', note]]);
      return json_({ ok: true, handled: on, by: u.name, at: on ? new Date().toISOString() : '', note: note });
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    if (err && err.auth) return json_({ ok: false, error: err.message, auth: true });
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

// ───────────────────────── ตั้งค่าครั้งแรก (Run ในตัวแก้ไข) ─────────────────────────
function setupSheet() {
  var sheet = getRespSheet_();
  CacheService.getScriptCache().remove('reg_f7_v1');
  var reg = getRegistry_();
  var fresh = reg.filter(function (e) { var d = dayNo_(e.start); return e.active && d >= 1 && d <= 30; });
  Logger.log('พร้อมใช้งาน ✓  แท็บ "' + sheet.getName() + '" มี ' + Math.max(sheet.getLastRow() - 1, 0) + ' รายการ');
  Logger.log('อ่านทะเบียนพนักงานได้ ' + reg.length + ' คน · เริ่มงานภายใน 30 วันล่าสุด ' + fresh.length + ' คน');
  Logger.log('ขั้นต่อไป: Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me / Who has access: Anyone');
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  Logger.log(to ? 'อีเมลเตือนน้องใหม่เสี่ยงสูง → ' + to : 'ยังไม่ตั้ง ALERT_EMAILS (ไม่ส่งอีเมลเตือน) — ตั้งได้ที่ Project Settings ▸ Script Properties');
}
