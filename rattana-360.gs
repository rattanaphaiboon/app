// Rattana 360 — หลังบ้าน (Google Apps Script) v1.0
// ประเมินพนักงานโดยบุคคลภายนอก (ลูกค้า / ขนส่ง / ซัพพลายเออร์ / เซลล์)
//
// ══════════════ วิธีติดตั้ง (ทำครั้งเดียว) ══════════════
//  1. สร้าง Google Sheet ใหม่ ตั้งชื่อ "Rattana 360" (ชีตนี้จะเก็บผลประเมินทั้งหมด)
//  2. เมนู ส่วนขยาย (Extensions) ▸ Apps Script → ลบโค้ดเดิมทิ้ง วางไฟล์นี้ทั้งไฟล์ → Ctrl+S
//  3. เลือกฟังก์ชัน setupSheet ▸ Run  (ครั้งแรกจะขอสิทธิ์ — กดอนุญาต)
//     ดูที่ Execution log ต้องขึ้น "พร้อมใช้งาน" และจำนวนพนักงานที่อ่านได้จากทะเบียน
//  4. Deploy ▸ New deployment ▸ ⚙️ Web app
//        Execute as: Me  /  Who has access: Anyone (ทุกคน)   ← ต้อง "ทุกคน" เท่านั้น
//  5. คัดลอก URL ที่ลงท้าย /exec ส่งให้ Claude ใส่ใน CONFIG.gasUrl ของ rattana-360.html
//     (ถ้า URL มี /a/macros/rattanaphaiboon.com/ ให้ตัดส่วนนั้นออก เหลือ script.google.com/macros/s/…/exec)
//  แก้โค้ดครั้งต่อไป: Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy (URL เดิม)
//  เช็คว่าติดแล้ว: เปิด URL ต่อท้าย ?action=ping → ต้องเห็น {"ok":true,"version":"1.0",…}
//
//  ตัวเลือกเพิ่มเติม (Project Settings ▸ Script Properties):
//    ALERT_EMAILS = hr@rattanaphaiboon.com, manager@…   ← ส่งอีเมลเตือนเมื่อได้คะแนนต่ำ (เว้นว่าง = ไม่ส่ง)

var VERSION = '1.0';
var REG_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ'; // ทะเบียนพนักงาน (ชีตบริษัท แท็บหลัก)
var CLIENT_ID = '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com';
var RESP_SHEET = 'ประเมิน';
var SESSION_TTL = 21600;           // อายุ session ของหน้า HR = 6 ชั่วโมง
var APP_URL = 'https://rattanaphaiboon.github.io/app/rattana-360.html';

var TYPES = ['ลูกค้า', 'ขนส่ง / คนส่งของ', 'ซัพพลายเออร์', 'เซลล์ / ผู้เสนอสินค้า', 'อื่นๆ'];
var BRANCH = { HQ: 'สำนักงานใหญ่', W1: 'สมุทรสงคราม', W2: 'สุพรรณบุรี', W3: 'ราชบุรี', W4: 'นครปฐม' };

// ตำแหน่งคอลัมน์ตายตัว (1-based) ของแท็บ "ประเมิน" — โค้ดอ้างด้วยเลข ไม่พึ่งข้อความหัวตาราง
var C_ID = 1, C_TS = 2, C_CODE = 3, C_NAME = 4, C_NICK = 5, C_W = 6, C_DEPT = 7, C_TYPE = 8,
    C_WHO = 9, C_TEL = 10, C_S1 = 11, C_S2 = 12, C_S3 = 13, C_S4 = 14, C_S5 = 15, C_AVG = 16,
    C_COMMENT = 17, C_SRC = 18, C_UA = 19, C_HANDLED = 20, C_HBY = 21, C_HAT = 22;
var N_COLS = 22;
var HEADERS = ['รหัสรายการ', 'เวลา', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'ชื่อเล่น', 'สาขา', 'แผนก',
               'ประเภทผู้ประเมิน', 'ชื่อ/บริษัทผู้ประเมิน', 'เบอร์ติดต่อกลับ',
               'มารยาทและการพูดจา', 'ความรวดเร็วและใส่ใจ', 'ความถูกต้องและเป็นมืออาชีพ',
               'การช่วยเหลือและแก้ปัญหา', 'ความพึงพอใจโดยรวม', 'เฉลี่ย', 'ความคิดเห็น',
               'ช่องทาง', 'อุปกรณ์', 'ติดตามแล้ว', 'ผู้ติดตาม', 'เวลาติดตาม'];

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

// ───────────────────────── ทะเบียนพนักงาน ─────────────────────────
// อ่านจากชีตบริษัท หาแท็บที่มีหัวคอลัมน์ "รหัสพนักงาน" + "E-mail" เอง (ชื่อแท็บเปลี่ยนได้ ไม่พัง)
// เก็บเฉพาะฟิลด์ที่ต้องใช้ ไว้ใน Cache 10 นาที — ไม่เอาข้อมูลส่วนตัวอื่นออกไปนอกสคริปต์
function getRegistry_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('reg_v1');
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
      iPhoto = find(/รูปพนักงาน/), iQuit = find(/ลาออก/);
  var vals = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), sheet.getLastColumn()).getValues();
  var out = [];
  for (var r = 0; r < vals.length; r++) {
    var row = vals[r], code = clean_(row[iCode]);
    if (!/^\d+$/.test(code)) continue;
    var quit = iQuit >= 0 ? clean_(row[iQuit]) : '';
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
      active: !quit
    });
  }
  try { var s = JSON.stringify(out); if (s.length < 95000) cache.put('reg_v1', s, 600); } catch (e) {}
  return out;
}
function findEmp_(code) {
  code = clean_(code);
  var reg = getRegistry_();
  for (var i = 0; i < reg.length; i++) if (reg[i].code === code) return reg[i];
  return null;
}
// ข้อมูลพนักงานที่ปล่อยให้คนนอกเห็นได้ — ชื่อ ชื่อเล่น แผนก สาขา รูป เท่านั้น
function publicEmp_(e) {
  return { code: e.code, name: e.name, nick: e.nick, w: e.w, wName: wName_(e.w), dept: e.dept, photo: e.photo };
}
function findUserByEmail_(email) {
  email = norm_(email);
  if (!email) return null;
  var reg = getRegistry_();
  for (var i = 0; i < reg.length; i++) if (reg[i].email === email) return reg[i];
  return null;
}

// ───────────────────────── session ของหน้า HR ─────────────────────────
// ล็อกอินด้วย Google → ตรวจ token กับ Google → ต้องมีอีเมลในทะเบียน + Status Active
// แล้วออก token ของเราเอง (อายุ 6 ชม.) ให้หน้า HR ใช้เรียกข้อมูล
function verifyGoogle_(credential) {
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
                              { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ Google ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
  var info = JSON.parse(res.getContentText());
  if (CLIENT_ID && info.aud !== CLIENT_ID) throw new Error('token ไม่ใช่ของแอป Rattana');
  if (String(info.email_verified) !== 'true') throw new Error('อีเมลนี้ยังไม่ได้ยืนยันกับ Google');
  return norm_(info.email);
}
function scopeOf_(u) {
  // ผู้จัดการขึ้นไป (role ≥ 5) / ฝ่ายบุคคล / บริหาร → เห็นทุกสาขา · คนอื่นเห็นเฉพาะสาขาตัวเอง
  return (u.role >= 5 || /บุคคล|HR|บริหาร/i.test(u.dept)) ? 'all' : 'w';
}
function login_(credential) {
  var email = verifyGoogle_(credential);
  var u = findUserByEmail_(email);
  if (!u) throw new Error('ไม่พบอีเมล ' + email + ' ในทะเบียนพนักงาน กรุณาติดต่อฝ่ายบุคคล');
  if (u.status !== 'active') throw new Error('บัญชีนี้ยังไม่เปิดใช้งาน (Status ไม่ใช่ Active) กรุณาติดต่อฝ่ายบุคคล');
  var user = { email: email, name: u.name, nick: u.nick, code: u.code, w: u.w, wName: wName_(u.w),
               dept: u.dept, role: u.role, scope: scopeOf_(u) };
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

// ───────────────────────── แท็บผลประเมิน ─────────────────────────
function getRespSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RESP_SHEET) || ss.insertSheet(RESP_SHEET);
  var current = sheet.getRange(1, 1, 1, N_COLS).getValues()[0];
  var same = HEADERS.every(function (h, i) { return current[i] === h; });
  if (!same) {
    sheet.getRange(1, 1, 1, N_COLS).setValues([HEADERS]);
    try {
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, N_COLS).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      var widths = [110, 150, 100, 200, 90, 70, 130, 150, 180, 120, 70, 70, 70, 70, 70, 60, 320, 80, 160, 80, 160, 150];
      for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
      sheet.getRange(2, C_TS, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('dd/MM/yyyy HH:mm');
      sheet.getRange(2, C_CODE, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
      sheet.getRange(2, C_TEL, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    } catch (e) { /* จัดรูปแบบไม่ได้ก็ไม่เป็นไร ข้อมูลสำคัญกว่า */ }
  }
  return sheet;
}
function rowToObj_(row) {
  var ts = row[C_TS - 1];
  var s = [C_S1, C_S2, C_S3, C_S4, C_S5].map(function (c) { return Number(row[c - 1]) || 0; });
  var hat = row[C_HAT - 1];
  return {
    id: String(row[C_ID - 1] || ''),
    ts: ts instanceof Date ? ts.toISOString() : String(ts || ''),
    code: String(row[C_CODE - 1] || ''), name: String(row[C_NAME - 1] || ''), nick: String(row[C_NICK - 1] || ''),
    w: String(row[C_W - 1] || ''), dept: String(row[C_DEPT - 1] || ''), type: String(row[C_TYPE - 1] || ''),
    who: String(row[C_WHO - 1] || ''), tel: String(row[C_TEL - 1] || ''),
    s: s, avg: Number(row[C_AVG - 1]) || 0, comment: String(row[C_COMMENT - 1] || ''),
    src: String(row[C_SRC - 1] || ''),
    handled: String(row[C_HANDLED - 1] || '') === 'Y',
    handledBy: String(row[C_HBY - 1] || ''),
    handledAt: hat instanceof Date ? hat.toISOString() : String(hat || '')
  };
}
function listRows_(user) {
  var sheet = getRespSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var vals = sheet.getRange(2, 1, last - 1, N_COLS).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    if (!vals[i][C_ID - 1]) continue;
    var o = rowToObj_(vals[i]);
    if (user.scope !== 'all' && o.w !== user.w) continue;
    out.push(o);
  }
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

// ───────────────────────── รับผลประเมิน (สาธารณะ) ─────────────────────────
function submit_(p) {
  if (clean_(p.hp)) return { ok: true, id: 'x' };            // honeypot: บอทกรอกช่องซ่อน → ทำเป็นรับไว้เฉย ๆ
  var emp = findEmp_(p.code);
  if (!emp) return { ok: false, error: 'ไม่พบรหัสพนักงาน' };
  if (!emp.active) return { ok: false, error: 'พนักงานคนนี้ไม่ได้อยู่ในทะเบียนแล้ว' };
  var type = clean_(p.type);
  if (TYPES.indexOf(type) < 0) return { ok: false, error: 'กรุณาเลือกว่าคุณคือใคร' };
  var s = [p.s1, p.s2, p.s3, p.s4, p.s5].map(function (v) { return parseInt(v, 10); });
  for (var i = 0; i < 5; i++) if (!(s[i] >= 1 && s[i] <= 5)) return { ok: false, error: 'กรุณาให้คะแนนให้ครบทุกหัวข้อ' };
  var avg = Math.round(s.reduce(function (a, b) { return a + b; }, 0) / 5 * 100) / 100;
  var comment = clean_(p.comment).slice(0, 1000), who = clean_(p.who).slice(0, 100), tel = clean_(p.tel).slice(0, 30);
  var src = clean_(p.src).slice(0, 20) || 'link', ua = clean_(p.ua).slice(0, 120);
  var id = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getRespSheet_();
    sheet.appendRow([id, new Date(), emp.code, emp.name, emp.nick, emp.w, emp.dept, type, who, tel,
                     s[0], s[1], s[2], s[3], s[4], avg, comment, src, ua, '', '', '']);
  } finally { lock.releaseLock(); }
  try { alertLow_(emp, type, s, avg, comment, who, tel, id); } catch (e) { /* ส่งเมลไม่ได้ ไม่ต้องให้กระทบการบันทึก */ }
  return { ok: true, id: id, avg: avg };
}
// คะแนนเฉลี่ย ≤ 2 หรือมีหัวข้อไหนได้ 1 → แจ้ง HR ทางอีเมล (ถ้าตั้ง ALERT_EMAILS ไว้)
function alertLow_(emp, type, s, avg, comment, who, tel, id) {
  var low = avg <= 2 || s.indexOf(1) >= 0;
  if (!low) return;
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  if (!to) return;
  var subject = '[Rattana 360] คะแนนต่ำ — ' + emp.name + (emp.nick ? ' (' + emp.nick + ')' : '') + ' · ' + wName_(emp.w);
  var lb = ['มารยาทและการพูดจา', 'ความรวดเร็วและใส่ใจ', 'ความถูกต้องและเป็นมืออาชีพ', 'การช่วยเหลือและแก้ปัญหา', 'ความพึงพอใจโดยรวม'];
  var lines = [];
  for (var i = 0; i < 5; i++) lines.push('  • ' + lb[i] + ': ' + s[i] + '/5');
  var body = 'มีการประเมินที่ได้คะแนนต่ำเข้ามา กรุณาตรวจสอบและติดตาม\n\n' +
    'พนักงาน: ' + emp.name + (emp.nick ? ' (' + emp.nick + ')' : '') + '  รหัส ' + emp.code + '\n' +
    'สาขา/แผนก: ' + wName_(emp.w) + ' / ' + emp.dept + '\n' +
    'ผู้ประเมิน: ' + type + (who ? ' — ' + who : '') + (tel ? ' โทร ' + tel : '') + '\n' +
    'เวลา: ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + '\n\n' +
    'คะแนน (เฉลี่ย ' + avg + '/5)\n' + lines.join('\n') + '\n\n' +
    'ความคิดเห็น:\n' + (comment || '(ไม่มี)') + '\n\n' +
    'เปิดดูในระบบ: ' + APP_URL + '\nรหัสรายการ: ' + id;
  MailApp.sendEmail({ to: to, subject: subject, body: body, name: 'Rattana 360' });
}

// ───────────────────────── ค้นหาพนักงาน (สาธารณะ — คืนไม่เกิน 8 คน) ─────────────────────────
function findEmps_(q, w) {
  q = norm_(q);
  w = clean_(w).toUpperCase();
  if (q.length < 2) return [];
  var reg = getRegistry_(), out = [];
  for (var i = 0; i < reg.length && out.length < 8; i++) {
    var e = reg[i];
    if (!e.active) continue;
    if (w && e.w !== w) continue;
    var hay = norm_(e.name + ' ' + e.nick + ' ' + e.code);
    if (hay.indexOf(q) >= 0) out.push(publicEmp_(e));
  }
  return out;
}

// ───────────────────────── ทางเข้า ─────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  try {
    if (action === 'ping') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName(RESP_SHEET);
      return json_({ ok: true, app: 'Rattana 360', sheet: ss.getUrl(), count: sh ? Math.max(sh.getLastRow() - 1, 0) : 0 });
    }
    if (action === 'emp') {
      var emp = findEmp_(p.code);
      if (!emp || !emp.active) return json_({ ok: false, error: 'ไม่พบรหัสพนักงาน' });
      return json_({ ok: true, emp: publicEmp_(emp) });
    }
    if (action === 'find') return json_({ ok: true, emps: findEmps_(p.q, p.w) });
    if (action === 'me') { var u0 = needAuth_(p.token); return json_({ ok: true, user: u0 }); }
    if (action === 'list') {
      var u = needAuth_(p.token);
      return json_({ ok: true, rows: listRows_(u), user: u });
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
      var on = !!p.handled;
      sheet.getRange(r, C_HANDLED, 1, 3).setValues([[on ? 'Y' : '', on ? u.name : '', on ? new Date() : '']]);
      return json_({ ok: true, handled: on, by: u.name, at: on ? new Date().toISOString() : '' });
    }
    if (action === 'delete') {
      var u2 = needAuth_(p.token);
      if (u2.role < 5) return json_({ ok: false, error: 'เฉพาะผู้จัดการขึ้นไปจึงลบรายการได้' });
      var sheet2 = getRespSheet_();
      var r2 = findRowById_(sheet2, p.id);
      if (r2 < 0) return json_({ ok: false, error: 'ไม่พบรายการ' });
      sheet2.deleteRow(r2);
      return json_({ ok: true });
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
  var reg = getRegistry_();
  var active = reg.filter(function (e) { return e.active; }).length;
  Logger.log('พร้อมใช้งาน ✓  แท็บ "' + sheet.getName() + '" มี ' + Math.max(sheet.getLastRow() - 1, 0) + ' รายการ');
  Logger.log('อ่านทะเบียนพนักงานได้ ' + reg.length + ' คน (ยังทำงานอยู่ ' + active + ' คน)');
  Logger.log('ขั้นต่อไป: Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me / Who has access: Anyone');
  var to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAILS');
  Logger.log(to ? 'อีเมลเตือนคะแนนต่ำ → ' + to : 'ยังไม่ตั้ง ALERT_EMAILS (ไม่ส่งอีเมลเตือนคะแนนต่ำ) — ตั้งได้ที่ Project Settings ▸ Script Properties');
}
