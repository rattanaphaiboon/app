/**
 * Rattana Zone — หลังบ้าน (Google Apps Script Web App)
 * โซนรับผิดชอบ ความสะอาด & ความเรียบร้อย · สแกน QR หน้าโซน
 *
 * ติดตั้ง (ครั้งเดียว):
 *  1) สร้างโปรเจกต์ Apps Script ใหม่ วางโค้ดนี้ทั้งไฟล์ → บันทึก
 *  2) Run ▸ setup  (อนุญาตสิทธิ์ → ระบบสร้างแท็บในชีต "พื้นที่รับผิดชอบ" + โฟลเดอร์รูป + ข้อมูลตั้งต้นให้เอง)
 *  3) Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone
 *  4) เอา URL /exec ไปใส่ CONFIG.gasUrl ในแอป
 * แก้โค้ดครั้งต่อไป: Deploy ▸ Manage deployments ▸ ✏️ ▸ New version (URL เดิม)
 */
var VERSION = '1.2';
var DATA_SHEET_ID = '1dfC9rOa4_jsiINEMSn6MDYrgh-wWH7ZnoruRRjnz3f0'; // ชีต "พื้นที่รับผิดชอบ" (หลังบ้านแอปนี้)
var REG_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ'; // ทะเบียนพนักงาน
var CLIENT_ID = '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com';
var CENTER_OF = { W1: 'W1', W2: 'W2', W3: 'W3', W4: 'W4', C4: 'W4' };   // สถานที่ → ศูนย์
var EMP_TTL_DAYS = 90, GOOGLE_TTL_DAYS = 30;

var T = {
  SITES:  { name: 'สถานที่', head: ['id', 'ศูนย์', 'ชื่อสถานที่', 'พื้นที่ (JSON)', 'รหัสพื้นที่ (JSON)'] },
  GRANTS: { name: 'สิทธิ์ผู้ดูแล', head: ['รหัสพนักงาน', 'ชื่อ', 'สิทธิ์ (mgr=หัวหน้างาน, hr=HR)', 'ให้โดย', 'เวลา'] },
  ZONES:  { name: 'โซน', head: ['id', 'สถานที่', 'พื้นที่', 'ไอคอน', 'ชื่อโซน', 'รายการเช็ก (JSON)', 'เจ้าของโซน', 'คนสำรอง', 'ตรวจก่อน', 'รอบตรวจ', 'เวร (JSON)', 'รูปก่อน/หลัง', 'ใช้งาน', 'แก้ไขล่าสุด', 'แก้ไขโดย'] },
  CHECKS: { name: 'ผลตรวจ', head: ['id', 'โซน', 'วันที่', 'เวลา(ms)', 'รหัสผู้ตรวจ', 'ผู้ตรวจ', 'ผล (JSON)', 'รูปหลังทำ', 'รูปก่อนทำ', 'หมายเหตุ', 'สแกนหน้างาน', 'ทำแทน', 'ทำแทนใคร', 'เวลาบันทึก'] },
  AUDITS: { name: 'คะแนน5ส', head: ['id', 'โซน', 'วันที่', 'ผู้ตรวจ', 'คะแนน (JSON)', 'คำแนะนำ', 'รูป', 'เฉลี่ย'] },
  ISSUES: { name: 'ปัญหา', head: ['id', 'โซน', 'วันที่', 'เวลา(ms)', 'ผู้แจ้ง', 'ปัญหา', 'รูป', 'สถานะ', 'วิธีแก้', 'วันที่แก้', 'ผู้ปิดงาน'] }
};

// ───────────────────────── util ─────────────────────────
function json_(o) { o.version = VERSION; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean_(s) { return String(s == null ? '' : s).replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim(); }
function norm_(s) { return clean_(s).toLowerCase(); }
function props_() { return PropertiesService.getScriptProperties(); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'); }
function daysAgo_(n) { return Utilities.formatDate(new Date(Date.now() - n * 864e5), 'Asia/Bangkok', 'yyyy-MM-dd'); }
function pj_(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }
function ss_() {
  return SpreadsheetApp.openById(DATA_SHEET_ID);
}
function sh_(t) {
  var ss = ss_(), s = ss.getSheetByName(t.name);
  if (!s) { s = ss.insertSheet(t.name); s.getRange(1, 1, 1, t.head.length).setValues([t.head]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff'); s.setFrozenRows(1); }
  else if (s.getLastColumn() < t.head.length) s.getRange(1, 1, 1, t.head.length).setValues([t.head]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  return s;
}
// รหัสพื้นที่มาตรฐาน — ใช้ประกอบรหัสโซน เช่น W1-WH01
var AREA_CODE = { 'คลังสินค้า': 'WH', 'ลาน/ท่ารถ': 'YD', 'สำนักงาน': 'OF', 'ส่วนกลาง': 'CM', 'หน้าร้าน': 'FR', 'หลังร้าน': 'BK', 'ภายนอก': 'OT', 'ห้องน้ำ': 'WC', 'ห้องเย็น': 'CL' };
function rows_(t) {
  var s = sh_(t), n = s.getLastRow();
  return n < 2 ? [] : s.getRange(2, 1, n - 1, t.head.length).getValues();
}
function findRow_(t, id) {
  var s = sh_(t), n = s.getLastRow(); if (n < 2) return -1;
  var ids = s.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}
function dstr_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd') : clean_(v); }

// ───────────────────────── ทะเบียนพนักงาน ─────────────────────────
function getRegistry_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('zreg_v2');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var sheets = SpreadsheetApp.openById(REG_SHEET_ID).getSheets(), sheet = null, H = {};
  for (var i = 0; i < sheets.length; i++) {
    var hdr = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0].map(clean_);
    if (hdr.indexOf('รหัสพนักงาน') >= 0 && hdr.indexOf('E-mail') >= 0) { sheet = sheets[i]; hdr.forEach(function (h, k) { if (h && !(h in H)) H[h] = k; }); break; }
  }
  if (!sheet) throw new Error('ไม่พบแท็บทะเบียนพนักงาน');
  var f = function (re) { for (var k in H) if (re.test(k)) return H[k]; return -1; };
  var iCode = H['รหัสพนักงาน'], iName = f(/^ชื่อ - สกุล$/), iNick = f(/^ชื่อเล่น$/), iW = f(/^W$/), iDept = f(/^แผนก$/),
      iEmail = H['E-mail'], iStatus = f(/^Status$/), iRole = f(/^User Role$/), iBirth = f(/วันเดือนปีเกิด/), iQuit = f(/ลาออก/),
      iBoss = f(/ชื่อหัวหน้างาน/);
  var vals = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), sheet.getLastColumn()).getValues(), out = [];
  // ใครถูกระบุเป็น "ชื่อหัวหน้างาน" ของพนักงานคนอื่น = หัวหน้างาน (ได้สิทธิ์จัดการพื้นที่ของศูนย์ตัวเอง)
  var bossTxt = iBoss >= 0 ? vals.map(function (r) { return clean_(r[iBoss]).replace(/\s/g, ''); }).filter(String).join('|') : '';
  vals.forEach(function (r) {
    var code = clean_(r[iCode]); if (!/^\d+$/.test(code)) return;
    out.push({ code: code, name: clean_(r[iName]), nick: iNick >= 0 ? clean_(r[iNick]) : '', w: clean_(r[iW]).toUpperCase(),
      dept: iDept >= 0 ? clean_(r[iDept]) : '', email: norm_(r[iEmail]), status: iStatus >= 0 ? norm_(r[iStatus]) : '',
      role: iRole >= 0 ? (parseInt(r[iRole], 10) || 1) : 1, birth: iBirth >= 0 ? birthKeys_(r[iBirth]) : [],
      active: !(iQuit >= 0 && clean_(r[iQuit])) });
    var me = out[out.length - 1], key = me.name.replace(/\s/g, '');
    me.sup = !!(key && bossTxt.indexOf(key) >= 0);
  });
  try { var s = JSON.stringify(out); if (s.length < 95000) cache.put('zreg_v2', s, 600); } catch (e) {}
  return out;
}
// วันเกิด → ชุดตัวเลข 8 หลัก ddmmyyyy ทั้ง พ.ศ. และ ค.ศ. (พนักงานพิมพ์แบบไหนก็ได้)
function birthKeys_(v) {
  var d, m, y;
  if (v instanceof Date && !isNaN(v)) {
    var s = Utilities.formatDate(v, 'Asia/Bangkok', 'dd/MM/yyyy').split('/'); d = s[0]; m = s[1]; y = +s[2];
  } else {
    var p = clean_(v).match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
    if (!p) { var q = clean_(v).replace(/\D/g, ''); if (q.length !== 8) return []; p = [0, q.slice(0, 2), q.slice(2, 4), q.slice(4)]; }
    d = ('0' + p[1]).slice(-2); m = ('0' + p[2]).slice(-2); y = +p[3];
  }
  if (!y) return [];
  var be = y < 2400 ? y + 543 : y, ce = be - 543;
  return [d + m + be, d + m + ce];
}
function people_() {
  return getRegistry_().filter(function (e) { return e.active && CENTER_OF[e.w] && e.name; })
    .map(function (e) { return { name: e.name, site: e.w, code: e.code }; });
}
function findEmp_(code) { var e = null; getRegistry_().forEach(function (x) { if (x.code === String(code)) e = x; }); return e; }
function grants_() {
  var c = CacheService.getScriptCache(), hit = c.get('zgr');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var g = {}; rows_(T.GRANTS).forEach(function (r) { if (r[0]) g[String(r[0])] = String(r[2]); });
  c.put('zgr', JSON.stringify(g), 120); return g;
}

// ───────────────────────── token (ลงลายเซ็น HMAC ไม่ต้องเก็บ session) ─────────────────────────
function secret_() {
  var s = props_().getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty('TOKEN_SECRET', s); }
  return s;
}
function b64_(s) { return Utilities.base64EncodeWebSafe(s).replace(/=+$/, ''); }
function sign_(p) {
  var body = b64_(Utilities.newBlob(JSON.stringify(p)).getBytes());
  return body + '.' + b64_(Utilities.computeHmacSha256Signature(body, secret_()));
}
function verify_(tok) {
  var parts = String(tok || '').split('.'); if (parts.length !== 2) return null;
  if (b64_(Utilities.computeHmacSha256Signature(parts[0], secret_())) !== parts[1]) return null;
  try {
    var pad = parts[0] + '==='.slice((parts[0].length + 3) % 4);
    var p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(pad)).getDataAsString());
    return p.exp > Date.now() ? p : null;
  } catch (e) { return null; }
}
function need_(tok, minRole) {
  var u = verify_(tok);
  if (!u) throw { auth: true, message: 'กรุณาเข้าสู่ระบบใหม่' };
  var e = findEmp_(u.c);                       // สิทธิ์คิดใหม่ทุกครั้ง: ให้/ถอนสิทธิ์แล้วมีผลทันที ไม่ต้องล็อกอินใหม่
  if (e && !e.active) throw { auth: true, message: 'บัญชีพ้นสภาพแล้ว' };
  if (e) { u.r = roleOf_(e); u.w = CENTER_OF[e.w] || 'ALL'; u.s = CENTER_OF[e.w] ? e.w : ''; }
  var rank = { emp: 1, mgr: 2, hr: 3 };
  if (minRole && rank[u.r] < rank[minRole]) throw new Error('สิทธิ์ไม่พอสำหรับคำสั่งนี้');
  return u;
}
// hr = เห็น/จัดการทุกศูนย์ · mgr = หัวหน้างาน/ผู้จัดการ จัดการพื้นที่ของศูนย์ตัวเอง · emp = พนักงาน
function roleOf_(e) {
  var g = grants_()[e.code] || '';
  if (g === 'hr' || e.role >= 5 || /บุคคล|HR|บริหาร/i.test(e.dept)) return 'hr';
  if (g === 'mgr' || e.role >= 4 || e.sup) return CENTER_OF[e.w] ? 'mgr' : 'hr';
  return 'emp';
}
function userOut_(e, r, days) {
  var p = { c: e.code, n: e.name, s: CENTER_OF[e.w] ? e.w : '', w: CENTER_OF[e.w] || 'ALL', r: r, exp: Date.now() + days * 864e5 };
  return { ok: true, token: sign_(p), user: p };
}
function empLogin_(b) {
  var code = clean_(b.code).replace(/\D/g, ''), birth = clean_(b.birth).replace(/\D/g, '');
  var c = CacheService.getScriptCache(), k = 'zfail_' + code, fails = +(c.get(k) || 0);
  if (fails >= 5) throw new Error('ใส่ผิดหลายครั้ง กรุณารอ 15 นาที');
  var e = null; getRegistry_().forEach(function (x) { if (x.code === code) e = x; });
  if (!e || !e.active) { c.put(k, String(fails + 1), 900); throw new Error('ไม่พบรหัสพนักงานนี้ (หรือพ้นสภาพแล้ว)'); }
  if (!e.birth.length) throw new Error('ไม่มีวันเกิดในทะเบียน — ใช้ปุ่ม Google หรือติดต่อฝ่ายบุคคล');
  if (e.birth.indexOf(birth) < 0) { c.put(k, String(fails + 1), 900); throw new Error('วันเกิดไม่ตรงกับทะเบียน (พิมพ์ วว ดด ปปปป พ.ศ. 8 หลัก)'); }
  c.remove(k);
  return userOut_(e, roleOf_(e), EMP_TTL_DAYS);
}
function googleLogin_(b) {
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(b.credential), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ Google ไม่สำเร็จ');
  var info = JSON.parse(res.getContentText());
  if (info.aud !== CLIENT_ID) throw new Error('token ไม่ใช่ของแอป Rattana');
  var email = norm_(info.email), e = null;
  getRegistry_().forEach(function (x) { if (x.email === email && x.active) e = x; });
  if (!e) throw new Error('ไม่พบอีเมล ' + email + ' ในทะเบียนพนักงาน');
  return userOut_(e, roleOf_(e), GOOGLE_TTL_DAYS);
}
function canCenter_(u, w) { if (u.r === 'hr') return; if (u.w !== w) throw new Error('จัดการได้เฉพาะศูนย์ของคุณ'); }
function centerOfZone_(zoneId) {
  var r = findRow_(T.ZONES, zoneId); if (r < 0) throw new Error('ไม่พบโซน ' + zoneId);
  var site = sh_(T.ZONES).getRange(r, 2).getValue();
  return siteCenter_(site);
}
function siteCenter_(site) {
  var w = '';
  rows_(T.SITES).forEach(function (x) { if (String(x[0]) === String(site)) w = String(x[1]); });
  return w;
}

// ───────────────────────── รูป ─────────────────────────
function savePhoto_(dataUrl, name) {
  var m = String(dataUrl || '').match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return '';
  var folder = DriveApp.getFolderById(props_().getProperty('PHOTO_FOLDER_ID'));
  var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name + '.jpg'));
  return 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w800';
}

// ───────────────────────── อ่านข้อมูลทั้งหมด (boot) ─────────────────────────
function boot_(u) {
  var from = daysAgo_(35), fromA = daysAgo_(70);
  var sites = rows_(T.SITES).map(function (r) { return { id: String(r[0]), w: String(r[1]), name: String(r[2]), areas: pj_(r[3], []), codes: pj_(r[4], {}) }; });
  var zones = rows_(T.ZONES).filter(function (r) { return r[0] && r[12] !== false && String(r[12]) !== 'FALSE'; }).map(function (r) {
    return { id: String(r[0]), site: String(r[1]), area: String(r[2]), icon: String(r[3]), name: String(r[4]), items: pj_(r[5], []),
      owner: String(r[6]), backup: String(r[7]), due: clean_(r[8]) || '10.00', freq: String(r[9] || 'ทุกวัน'), rota: pj_(r[10], null), before: r[11] === true || String(r[11]) === 'TRUE' };
  });
  var checks = rows_(T.CHECKS).filter(function (r) { return dstr_(r[2]) >= from; }).map(function (r) {
    return { id: String(r[0]), zoneId: String(r[1]), date: dstr_(r[2]), time: +r[3], by: String(r[5]), res: pj_(r[6], []), photo: String(r[7]), before: String(r[8]),
      note: String(r[9]), scan: r[10] === true || String(r[10]) === 'TRUE', proxy: r[11] === true || String(r[11]) === 'TRUE' };
  });
  var audits = rows_(T.AUDITS).filter(function (r) { return dstr_(r[2]) >= fromA; }).map(function (r) {
    return { id: String(r[0]), zoneId: String(r[1]), date: dstr_(r[2]), by: String(r[3]), sc: pj_(r[4], {}), note: String(r[5]), photo: String(r[6]) };
  });
  var issues = rows_(T.ISSUES).filter(function (r) { return r[7] === 'open' || dstr_(r[2]) >= from; }).map(function (r) {
    return { id: String(r[0]), zoneId: String(r[1]), date: dstr_(r[2]), time: +r[3], by: String(r[4]), text: String(r[5]), photo: String(r[6]),
      status: String(r[7]), fixNote: String(r[8]), fixDate: dstr_(r[9]) };
  });
  var grants = u.r === 'emp' ? [] : rows_(T.GRANTS).filter(function (r) { return r[0]; }).map(function (r) {
    var e = findEmp_(r[0]); return { code: String(r[0]), name: String(r[1]), r: String(r[2]), site: e ? e.w : '', by: String(r[3]) };
  });
  return { ok: true, today: today_(), user: u, sites: sites, zones: zones, people: people_(), checks: checks, audits: audits, issues: issues, grants: grants };
}

// ───────────────────────── เขียนข้อมูล ─────────────────────────
function nextId_(p) { return p + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10); }
function act_(a, b, u) {
  var now = new Date(), d = today_();
  switch (a) {
    case 'check': {
      centerOfZone_(b.zoneId);
      var id = nextId_('C'), photo = savePhoto_(b.photo, b.zoneId + '_' + id), before = savePhoto_(b.before, b.zoneId + '_' + id + '_before');
      if (!photo) throw new Error('ต้องมีรูปหลังทำ');
      sh_(T.CHECKS).appendRow([id, b.zoneId, d, Date.now(), u.c, u.n, JSON.stringify(b.res || []), photo, before, clean_(b.note), !!b.scan, !!b.proxy, clean_(b.for), now]);
      if (b.issue) sh_(T.ISSUES).appendRow([nextId_('I'), b.zoneId, d, Date.now(), u.n, clean_(b.issueText) || 'ต้องแก้', photo, 'open', '', '', '']);
      return { id: id };
    }
    case 'issue': {
      centerOfZone_(b.zoneId);
      var iid = nextId_('I'); sh_(T.ISSUES).appendRow([iid, b.zoneId, d, Date.now(), u.n, clean_(b.text), savePhoto_(b.photo, 'issue_' + iid), 'open', '', '', '']);
      return { id: iid };
    }
    case 'fixIssue': {
      need_(b.t, 'mgr'); var r = findRow_(T.ISSUES, b.id); if (r < 0) throw new Error('ไม่พบรายการ');
      canCenter_(u, centerOfZone_(sh_(T.ISSUES).getRange(r, 2).getValue()));
      sh_(T.ISSUES).getRange(r, 8, 1, 4).setValues([['done', clean_(b.note), d, u.n]]); return {};
    }
    case 'audit': {
      need_(b.t, 'mgr'); canCenter_(u, centerOfZone_(b.zoneId));
      var sc = b.sc || {}, vals = Object.keys(sc).map(function (k) { return +sc[k]; }), avg = vals.length ? vals.reduce(function (x, y) { return x + y; }, 0) / vals.length : 0;
      var aid = nextId_('A'); sh_(T.AUDITS).appendRow([aid, b.zoneId, d, u.n, JSON.stringify(sc), clean_(b.note), savePhoto_(b.photo, 'audit_' + aid), Math.round(avg * 10) / 10]);
      return { id: aid };
    }
    case 'saveZone': {
      // ทุกคนเพิ่มโซนใหม่ในศูนย์ตัวเองได้ · แก้โซนเดิมต้องเป็นหัวหน้างานขึ้นไป
      var z = b.zone || {}; if (z.id) need_(b.t, 'mgr'); canCenter_(u, siteCenter_(z.site));
      if (!clean_(z.name)) throw new Error('ไม่มีชื่อโซน');
      var row = [z.id, z.site, clean_(z.area), clean_(z.icon) || '🧹', clean_(z.name), JSON.stringify(z.items || []), clean_(z.owner), clean_(z.backup),
                 clean_(z.due) || '10.00', clean_(z.freq) || 'ทุกวัน', z.rota ? JSON.stringify(z.rota) : '', !!z.before, true, now, u.n];
      var zr = z.id ? findRow_(T.ZONES, z.id) : -1;
      if (zr > 0) { row[0] = z.id; sh_(T.ZONES).getRange(zr, 1, 1, row.length).setValues([row]); }
      else {
        var all = rows_(T.ZONES).map(function (x) { return String(x[0]).toUpperCase(); }), code = clean_(z.code).toUpperCase();
        if (code) {
          if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(code)) throw new Error('รหัสโซนใช้ได้เฉพาะ A-Z 0-9 และ - (2–20 ตัว)');
          if (all.indexOf(code) >= 0) throw new Error('รหัสโซน ' + code + ' มีอยู่แล้ว');
        } else code = nextZoneCode_(z.site, z.area, all);
        row[0] = code; sh_(T.ZONES).appendRow(row);
      }
      sh_(T.ZONES).getRange(zr > 0 ? zr : sh_(T.ZONES).getLastRow(), 9).setNumberFormat('@').setValue(clean_(z.due) || '10.00');
      return { id: row[0] };
    }
    case 'delZone': {
      need_(b.t, 'mgr'); canCenter_(u, centerOfZone_(b.id));
      var dr = findRow_(T.ZONES, b.id); sh_(T.ZONES).getRange(dr, 13, 1, 3).setValues([[false, now, u.n]]); return {};
    }
    case 'setOwner': {
      need_(b.t, 'mgr'); canCenter_(u, centerOfZone_(b.zoneId));
      var or = findRow_(T.ZONES, b.zoneId); sh_(T.ZONES).getRange(or, b.k === 'backup' ? 8 : 7).setValue(clean_(b.v));
      sh_(T.ZONES).getRange(or, 14, 1, 2).setValues([[now, u.n]]); return {};
    }
    case 'saveRota': {
      need_(b.t, 'mgr'); canCenter_(u, centerOfZone_(b.zoneId));
      var rr = findRow_(T.ZONES, b.zoneId); sh_(T.ZONES).getRange(rr, 11).setValue(b.rota ? JSON.stringify(b.rota) : '');
      sh_(T.ZONES).getRange(rr, 14, 1, 2).setValues([[now, u.n]]); return {};
    }
    case 'addSite': {
      need_(b.t, 'mgr'); canCenter_(u, b.w);
      var sid = b.w + 'S' + (rows_(T.SITES).length + 1);
      sh_(T.SITES).appendRow([sid, b.w, clean_(b.name), JSON.stringify(b.areas || [])]); return { id: sid };
    }
    case 'setAreas': {
      canCenter_(u, siteCenter_(b.site));
      var sr = findRow_(T.SITES, b.site); if (sr < 0) throw new Error('ไม่พบสถานที่');
      if (u.r === 'emp') {   // พนักงานเพิ่มพื้นที่ได้ แต่ลบ/เปลี่ยนรหัสพื้นที่เดิมไม่ได้
        var cur = pj_(sh_(T.SITES).getRange(sr, 4).getValue(), []), curC = pj_(sh_(T.SITES).getRange(sr, 5).getValue(), {});
        if (cur.some(function (a) { return (b.areas || []).indexOf(a) < 0; })) throw new Error('ลบพื้นที่ได้เฉพาะหัวหน้างานขึ้นไป');
        Object.keys(curC).forEach(function (k) { if (b.codes && b.codes[k] !== curC[k]) throw new Error('แก้รหัสพื้นที่เดิมได้เฉพาะหัวหน้างานขึ้นไป'); });
      }
      sh_(T.SITES).getRange(sr, 4).setValue(JSON.stringify(b.areas || []));
      if (b.codes) sh_(T.SITES).getRange(sr, 5).setValue(JSON.stringify(b.codes));
      return {};
    }
    case 'grant': {
      need_(b.t, 'mgr');
      var ge = findEmp_(b.code); if (!ge || !ge.active) throw new Error('ไม่พบพนักงานรหัส ' + b.code);
      var gr = b.r === 'hr' ? 'hr' : 'mgr';
      if (gr === 'hr' && u.r !== 'hr') throw new Error('ให้สิทธิ์ HR ได้เฉพาะ HR');
      canCenter_(u, CENTER_OF[ge.w] || 'ALL');
      var gRow = findRow_(T.GRANTS, ge.code), vals2 = [ge.code, ge.name, gr, u.n, now];
      if (gRow > 0) sh_(T.GRANTS).getRange(gRow, 1, 1, 5).setValues([vals2]); else sh_(T.GRANTS).appendRow(vals2);
      CacheService.getScriptCache().remove('zgr'); return {};
    }
    case 'ungrant': {
      need_(b.t, 'mgr');
      var ue = findEmp_(b.code); if (ue) canCenter_(u, CENTER_OF[ue.w] || 'ALL');
      var uRow = findRow_(T.GRANTS, b.code); if (uRow > 0) sh_(T.GRANTS).deleteRow(uRow);
      CacheService.getScriptCache().remove('zgr'); return {};
    }
  }
  throw new Error('ไม่รู้จักคำสั่ง ' + a);
}

function areaCode_(site, area) {
  var ac = '', idx = -1;
  rows_(T.SITES).forEach(function (x) { if (String(x[0]) === String(site)) { ac = (pj_(x[4], {}) || {})[area] || ''; idx = pj_(x[3], []).indexOf(area); } });
  return (ac || AREA_CODE[area] || ('Z' + String.fromCharCode(65 + (Math.max(idx, 0) % 26)))).toUpperCase();
}
function nextZoneCode_(site, area, all) {
  var pre = String(site).toUpperCase() + '-' + areaCode_(site, area), max = 0;
  all.forEach(function (id) { if (id.indexOf(pre) === 0) { var n = parseInt(id.slice(pre.length), 10); if (n > max) max = n; } });
  return pre + ('0' + (max + 1)).slice(-2);
}

// ───────────────────────── Web App ─────────────────────────
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (!e) return json_({ ok: true, setup: setup() });   // กด Run doGet ในตัวแก้ไข = ติดตั้ง/ขอสิทธิ์
    if (p.action === 'boot') return json_(boot_(need_(p.t)));
    if (p.action === 'nextCode') { var nu = need_(p.t, 'mgr'); return json_({ ok: true, code: nextZoneCode_(p.site, p.area, rows_(T.ZONES).map(function (x) { return String(x[0]).toUpperCase(); })) }); }
    return json_({ ok: true, app: 'Rattana Zone', installed: !!props_().getProperty('SHEET_ID') });
  } catch (err) { return json_({ ok: false, auth: !!err.auth, error: err.message || String(err) }); }
}
function doPost(e) {
  var b = {};
  try { b = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, error: 'bad json' }); }
  try {
    if (b.action === 'empLogin') return json_(empLogin_(b));
    if (b.action === 'googleLogin') return json_(googleLogin_(b));
    var u = need_(b.t), lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw new Error('ระบบกำลังยุ่ง ลองใหม่อีกครั้ง');
    try { var out = act_(b.action, b, u); out.ok = true; return json_(out); } finally { lock.releaseLock(); }
  } catch (err) { return json_({ ok: false, auth: !!err.auth, error: err.message || String(err) }); }
}

// ───────────────────────── ติดตั้ง (Run ครั้งเดียว) ─────────────────────────
function setup() {
  var P = props_(), ss;
  ss = SpreadsheetApp.openById(DATA_SHEET_ID); P.setProperty('SHEET_ID', DATA_SHEET_ID);
  Object.keys(T).forEach(function (k) {
    var t = T[k], s = ss.getSheetByName(t.name) || ss.insertSheet(t.name);
    s.getRange(1, 1, 1, t.head.length).setValues([t.head]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
    s.setFrozenRows(1);
  });
  var first = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1'); if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first); // ลบเฉพาะแท็บว่าง
  if (!P.getProperty('PHOTO_FOLDER_ID')) {
    var f = DriveApp.createFolder('Rattana Zone — รูปตรวจโซน');
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { Logger.log('ตั้งแชร์โฟลเดอร์ไม่ได้: ' + e); }
    P.setProperty('PHOTO_FOLDER_ID', f.getId());
  }
  secret_();
  if (sh_(T.SITES).getLastRow() < 2) {
    var A = JSON.stringify(['คลังสินค้า', 'ลาน/ท่ารถ', 'สำนักงาน', 'ส่วนกลาง']);
    sh_(T.SITES).getRange(2, 1, 5, 4).setValues([
      ['W1', 'W1', 'ศูนย์สมุทรสงคราม', A], ['W2', 'W2', 'ศูนย์สุพรรณบุรี', A], ['W3', 'W3', 'ศูนย์ราชบุรี', A], ['W4', 'W4', 'ศูนย์นครปฐม', A],
      ['C4', 'W4', 'รัตนมาร์ท ดอนตูม', JSON.stringify(['หน้าร้าน', 'หลังร้าน', 'ภายนอก'])]]);
  }
  sh_(T.ZONES).getRange('I:I').setNumberFormat('@');
  Logger.log('ติดตั้งเสร็จ ชีต: ' + ss.getUrl() + ' · พนักงานในระบบ ' + people_().length + ' คน');
  return ss.getUrl();
}
