// Rattana ขอสนับสนุน — หลังบ้าน (Google Apps Script) v1.6
// เก็บแบบตอบกลับการสนับสนุนจากเวนเดอร์ / ซัพพลายเออร์ ลง Google Sheet (เปลี่ยนหัวข้อกิจกรรมได้จากหน้า HR)
//
// ══════════════ วิธีติดตั้ง (ทำครั้งเดียว) ══════════════
//  1. เปิดชีต "งบกินเลี้ยงปีใหม่ 2025" (ข้อมูลลงแท็บ APPของบ)
//  2. เมนู ส่วนขยาย (Extensions) ▸ Apps Script → ลบโค้ดเดิม วางไฟล์นี้ทั้งไฟล์ → Ctrl+S
//  3. เลือกฟังก์ชัน setupSheet ▸ Run (ครั้งแรกจะขอสิทธิ์ — กดอนุญาต)
//  4. Deploy ▸ New deployment ▸ ⚙️ Web app
//        Execute as: Me  /  Who has access: Anyone (ทุกคน)   ← ต้อง "ทุกคน" เท่านั้น
//  5. คัดลอก URL ที่ลงท้าย /exec ส่งให้ Claude ใส่ใน CONFIG.gasUrl ของ rattana-sponsor.html
//     (ถ้ามี /a/macros/rattanaphaiboon.com/ ให้ตัดออก เหลือ script.google.com/macros/s/…/exec)
//  แก้โค้ดครั้งต่อไป: Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version ▸ Deploy
//
//  Script Properties (Project Settings ▸ Script Properties):
//    HR_PIN        = รหัสเข้าหน้าสรุปของ HR (ไม่ตั้ง = ใช้ค่าเริ่มต้นด้านล่าง)
//    NOTIFY_EMAILS = อีเมล HR คั่นด้วย , — ได้อีเมลแจ้งทุกครั้งที่มีเวนเดอร์ตอบกลับ (เว้นว่าง = ไม่ส่ง)

var VERSION = '1.6';
var SHEET_ID = '16fWBSS1ZxzuRhawl7DWaZDl1RDD6TV6Dl6SMmSrA_9E'; // งบกินเลี้ยงปีใหม่
var TAB = 'APPของบ';
var DEFAULT_PIN = '2570';
var APP_URL = 'https://rattanaphaiboon.github.io/app/rattana-sponsor.html';

// คอลัมน์ตายตัว (1-based)
var HEADERS = ['เลขที่', 'เวลา', 'บริษัท/ห้างร้าน', 'การพิจารณา', 'เงินสนับสนุน (บาท)',
  'ของรางวัล (อ่านง่าย)', 'จำนวนชิ้นรวม', 'มูลค่าของรางวัลประมาณ', 'อื่น ๆ',
  'ผู้ประสานงาน', 'ตำแหน่งผู้ประสานงาน', 'เบอร์โทร', 'การส่งมอบ', 'ระบุการส่งมอบอื่น', 'วันที่สะดวกส่ง',
  'ผู้ตอบกลับ', 'ตำแหน่งผู้ตอบกลับ', 'ข้อความ', 'ลิงก์เฉพาะบริษัท', 'ได้รับแล้ว', 'เวลาที่บันทึกรับ',
  'ของรางวัล (JSON)', 'กิจกรรม', 'ไฟล์แนบ'];
var C = { ID: 1, TS: 2, CO: 3, DEC: 4, MONEY: 5, GTXT: 6, GQTY: 7, GVAL: 8, OTHER: 9, CNAME: 10, CPOS: 11,
  CTEL: 12, DELIV: 13, DOTHER: 14, DDATE: 15, SNAME: 16, SPOS: 17, NOTE: 18, REF: 19, RCV: 20, RCVAT: 21, GJSON: 22, EV: 23, FILES: 24 };
// ───── หัวข้อ + กำหนดเปิด/ปิดฟอร์ม: แท็บ "หัวข้อของบปีใหม่" ─────
// คอลัมน์ (หาจากชื่อหัว): เรื่อง | เริ่มฟอร์ม | จบฟอร์ม | วันจัดงาน (ไม่บังคับ) | ข้อความต้อนรับ (ไม่บังคับ)
// แถวที่วันนี้อยู่ระหว่าง เริ่ม–จบ = เปิดรับ (ถ้าซ้อนกัน เอาแถวที่เริ่มล่าสุด) · วันที่ใส่ d/m/ค.ศ. หรือ พ.ศ. ก็ได้
var TOPIC_TAB = 'หัวข้อของบปีใหม่';
var DEFAULT_COMPANY = 'บริษัท รัตนไพบูลย์ สมุทรสงคราม 2555 จำกัด';
var DEFAULT_INTRO = 'ขอขอบพระคุณที่ให้ความอนุเคราะห์พิจารณาสนับสนุนงบประมาณ ของขวัญ หรือของรางวัล กรุณากรอกแบบตอบกลับนี้ ใช้เวลาประมาณ 2 นาที';
// ชื่อบริษัท + หนังสือขอความอนุเคราะห์ เก็บใน Script Properties (SP_CFG) — แก้จากหน้า HR
function props_() {
  var c = {}; try { c = JSON.parse(prop_('SP_CFG') || '{}'); } catch (e) {}
  return { company: c.company || DEFAULT_COMPANY, letterName: c.letterName || '', letterUrl: c.letterUrl || '', letterType: c.letterType || '',
    docNo: c.docNo || '', docSubject: c.docSubject || '', docDate: c.docDate || '' };
}
function putProps_(p) { PropertiesService.getScriptProperties().setProperty('SP_CFG', JSON.stringify(p)); }
function ymd_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var m = String(v || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) { var y = +m[3]; if (y < 100) y += 2000; if (y > 2400) y -= 543; return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); }
  m = String(v || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) { var y2 = +m[1]; if (y2 > 2400) y2 -= 543; return y2 + '-' + m[2] + '-' + m[3]; }
  return '';
}
function topics_() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TOPIC_TAB);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 3)).getValues();
  var H = v[0].map(function (h) { return String(h).trim(); });
  var col = function (re, d) { for (var i = 0; i < H.length; i++) if (re.test(H[i])) return i; return d; };
  var iT = col(/เรื่อง|หัวข้อ/, 0), iS = col(/เริ่ม/, 1), iE = col(/จบ|สิ้นสุด|ปิด/, 2), iD = col(/วันจัด/, -1), iI = col(/ข้อความ/, -1);
  var out = [];
  for (var r = 1; r < v.length; r++) {
    var t = s_(v[r][iT], 200); if (!t) continue;
    out.push({ event: t, start: ymd_(v[r][iS]), end: ymd_(v[r][iE]), eventDate: iD >= 0 ? ymd_(v[r][iD]) : '',
      intro: iI >= 0 ? String(v[r][iI] || '').trim() : '', row: r + 1 });
  }
  return out;
}
function cfg_() {
  var p = props_(), T = topics_(), today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var pick = null, status = 'none';
  var open = T.filter(function (t) { return (!t.start || t.start <= today) && (!t.end || today <= t.end); });
  // กิจกรรมที่เปิดรับ เรียง "มีก่อน" ขึ้นก่อน (วันจัดงาน → วันจบฟอร์ม) — ตัวแรก = ตัวเด่นบนหน้าเวนเดอร์
  var key = function (t) { return t.eventDate || t.end || '9999'; };
  open.sort(function (a, b) { return key(a).localeCompare(key(b)); });
  if (open.length) { pick = open[0]; status = 'open'; }
  else {
    var soon = T.filter(function (t) { return t.start > today; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
    var past = T.filter(function (t) { return t.end && t.end < today; }).sort(function (a, b) { return b.end.localeCompare(a.end); });
    if (soon.length) { pick = soon[0]; status = 'soon'; } else if (past.length) { pick = past[0]; status = 'closed'; }
  }
  pick = pick || { event: 'ยังไม่ได้ตั้งหัวข้อ', start: '', end: '', eventDate: '', intro: '' };
  return { company: p.company, event: pick.event, start: pick.start, end: pick.end, eventDate: pick.eventDate,
    intro: pick.intro || DEFAULT_INTRO, status: status, today: today,
    letterName: p.letterName, letterUrl: p.letterUrl, letterType: p.letterType,
    docNo: p.docNo, docSubject: p.docSubject, docDate: p.docDate,
    topics: T, topicTab: TOPIC_TAB,
    open: open.map(function (t) { return { event: t.event, start: t.start, end: t.end, eventDate: t.eventDate, intro: t.intro }; }),
    upcoming: T.filter(function (t) { return t.start > today; }).map(function (t) { return { event: t.event, start: t.start, end: t.end, eventDate: t.eventDate }; }) };
}
function saveCfg_(c) {
  var p = props_(); p.company = s_((c || {}).company, 200) || DEFAULT_COMPANY; putProps_(p);
  return { ok: true, cfg: cfg_() };
}
// แนบ / ลบ หนังสือขอความอนุเคราะห์ (file = {name,type,data base64} หรือ null = ลบ)
function setLetter_(file) {
  var p = props_();
  if (file && file.data) { var f = saveFile_(file, 'หนังสือขอความอนุเคราะห์ - '); p.letterName = f.name; p.letterUrl = f.url; p.letterType = f.type; }
  else { p.letterName = ''; p.letterUrl = ''; p.letterType = ''; }
  putProps_(p);
  return { ok: true, cfg: cfg_() };
}

// ───── ไฟล์แนบ → Google Drive โฟลเดอร์ "ไฟล์แนบ ขอสนับสนุน" (อยู่โฟลเดอร์เดียวกับชีต) ─────
// ───── เชื่อมแอปออกหนังสือ (Rattana Letter): ชีต One Link Rattana แท็บ "APP รันเลขที่" ─────
var LETTER_SHEET = '16iOUKOG2DY7rCDfxS-UFjEB9Ii2XS_lf3qVOl8Cdjj0';
var LETTER_TAB = 'APP รันเลขที่';
function letters_() {
  var sh = SpreadsheetApp.openById(LETTER_SHEET).getSheetByName(LETTER_TAB);
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
  var H = v[0].map(function (h) { return String(h).trim(); });
  var ix = function (re) { for (var i = 0; i < H.length; i++) if (re.test(H[i])) return i; return -1; };
  var iNo = ix(/^เลขที่/), iDate = ix(/^วันที่หนังสือ/), iCo = ix(/^บริษัท/), iSub = ix(/^เรื่อง/), iTo = ix(/^เรียน/),
      iSt = ix(/^สถานะ/), iJs = ix(/ข้อมูลหนังสือ/), iBy = ix(/^ผู้ขอ$/);
  var out = [];
  for (var r = v.length - 1; r >= 1 && out.length < 300; r--) {
    var row = v[r], no = iNo >= 0 ? row[iNo] : ''; if (!no) continue;
    if (iSt >= 0 && /ยกเลิก/.test(row[iSt])) continue;
    var data = null; try { data = JSON.parse(iJs >= 0 ? row[iJs] || 'null' : 'null'); } catch (e) {}
    var to = [];
    if (data && data.circ && data.toList) to = String(data.toList).split('\n');
    else if (data && data.to) to = [data.to];
    else if (iTo >= 0) to = [row[iTo]];
    to = to.map(function (s) { return String(s).trim(); }).filter(String);
    out.push({ no: no, date: iDate >= 0 ? row[iDate] : '', company: iCo >= 0 ? row[iCo] : '', subject: iSub >= 0 ? row[iSub] : '',
      by: iBy >= 0 ? row[iBy] : '', to: to });
  }
  return out;
}
// ผูกเลขที่หนังสือกับฟอร์ม (เวนเดอร์เห็น "อ้างถึงหนังสือเลขที่ …") · doc=null = เลิกผูก
function setDoc_(doc) {
  var p = props_();
  p.docNo = doc ? s_(doc.no, 60) : ''; p.docSubject = doc ? s_(doc.subject, 300) : ''; p.docDate = doc ? s_(doc.date, 60) : '';
  putProps_(p);
  return { ok: true, cfg: cfg_() };
}

var MAX_FILE = 10 * 1024 * 1024;
function folder_() {
  var id = prop_('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var parents = DriveApp.getFileById(SHEET_ID).getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var it = parent.getFoldersByName('ไฟล์แนบ ขอสนับสนุน');
  var fd = it.hasNext() ? it.next() : parent.createFolder('ไฟล์แนบ ขอสนับสนุน');
  PropertiesService.getScriptProperties().setProperty('FOLDER_ID', fd.getId());
  return fd;
}
function saveFile_(file, prefix) {
  var bytes = Utilities.base64Decode(String(file.data).replace(/^data:[^,]*,/, ''));
  if (bytes.length > MAX_FILE) throw new Error('ไฟล์ ' + file.name + ' ใหญ่เกิน 10 MB');
  var type = s_(file.type, 100) || 'application/octet-stream';
  if (!/^(image\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats|application\/vnd\.ms-excel)/.test(type)) throw new Error('ไม่รองรับไฟล์ชนิด ' + type);
  var name = (prefix || '') + s_(file.name, 120).replace(/[\\\/:*?"<>|]/g, '');
  var f = folder_().createFile(Utilities.newBlob(bytes, type, name));
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { try { f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {} }
  return { name: s_(file.name, 120), url: f.getUrl(), type: type, id: f.getId() };
}
var N = HEADERS.length;
var DELIV = { self: 'บริษัทจะนำส่งด้วยตนเอง', pickup: 'ขอให้บริษัท รัตนไพบูลย์ฯ ติดต่อรับ', other: 'อื่น ๆ' };

function json_(o) { o.version = VERSION; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function s_(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 300); }
function n_(v) { var x = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return isFinite(x) ? x : 0; }
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function sheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
  if (String(sh.getRange(1, 1).getValue()) !== HEADERS[0]) {
    sh.getRange(1, 1, 1, N).setValues([HEADERS]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('E:E').setNumberFormat('#,##0.00');
    sh.getRange('H:H').setNumberFormat('#,##0.00');
  }
  return sh;
}
function setupSheet() { var sh = sheet_(); Logger.log('พร้อมใช้งาน แท็บ "' + TAB + '" แถวข้อมูล ' + Math.max(sh.getLastRow() - 1, 0)); }

function doGet(e) {
  var a = (e && e.parameter && e.parameter.action) || 'ping';
  if (a === 'ping') return json_({ ok: true, count: Math.max(sheet_().getLastRow() - 1, 0) });
  if (a === 'config') return json_({ ok: true, cfg: cfg_() });
  return json_({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents || '{}');
    if (p.action === 'submit') return json_(submit_(p.data || {}));
    if (p.action === 'list') { checkPin_(p.pin); return json_({ ok: true, rows: list_(), cfg: cfg_() }); }
    if (p.action === 'saveConfig') { checkPin_(p.pin); return json_(saveCfg_(p.cfg)); }
    if (p.action === 'setLetter') { checkPin_(p.pin); return json_(setLetter_(p.file)); }
    if (p.action === 'letters') { checkPin_(p.pin); return json_({ ok: true, items: letters_() }); }
    if (p.action === 'setDoc') { checkPin_(p.pin); return json_(setDoc_(p.doc)); }
    if (p.action === 'setReceived') { checkPin_(p.pin); return json_(setReceived_(p.id, !!p.received)); }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) { return json_({ ok: false, error: String(err.message || err) }); }
}

function checkPin_(pin) {
  var want = prop_('HR_PIN') || DEFAULT_PIN;
  if (String(pin || '') !== want) throw new Error('รหัสผ่านไม่ถูกต้อง');
}

function submit_(d) {
  var dec = d.decision === 'yes' ? 'yes' : d.decision === 'no' ? 'no' : '';
  var co = s_(d.company, 200), cName = s_(d.cName, 120), cTel = s_(d.cTel, 40), sName = s_(d.sName, 120);
  if (!co || !dec || !cName || !cTel || !sName) return { ok: false, error: 'ข้อมูลไม่ครบ' };
  var cur = cfg_();
  if (cur.status !== 'open') return { ok: false, error: cur.status === 'soon' ? 'ฟอร์มยังไม่เปิดรับ' : 'ฟอร์มปิดรับแล้ว' };
  var gifts = [];
  if (dec === 'yes' && d.gifts && d.gifts.length) {
    d.gifts.slice(0, 50).forEach(function (g) {
      var nm = s_(g.name, 150); if (!nm) return;
      gifts.push({ name: nm, qty: n_(g.qty) || 1, unit: s_(g.unit, 30) || 'ชิ้น', val: n_(g.val) });
    });
  }
  var money = dec === 'yes' ? n_(d.money) : 0;
  var gQty = 0, gVal = 0;
  gifts.forEach(function (g) { gQty += g.qty; gVal += g.qty * g.val; });
  var gTxt = gifts.map(function (g) { return g.name + ' ' + g.qty + ' ' + g.unit; }).join(' / ');
  var deliv = dec === 'yes' ? (DELIV[d.deliv] ? d.deliv : '') : '';
  // กิจกรรมที่เวนเดอร์เลือก: ต้องเป็นกิจกรรมที่เปิดรับอยู่ หรือ "อื่น ๆ: …" ที่พิมพ์เอง
  var want = s_(d.topic, 200), ev = cur.event;
  if (want && cur.open.some(function (t) { return t.event === want; })) ev = want;
  else if (/^อื่น ๆ: .{2,}/.test(want)) ev = want;
  var files = [];
  (d.files || []).slice(0, 5).forEach(function (f) { if (f && f.data) files.push(saveFile_(f, co + ' - ')); });

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = sheet_(), last = sh.getLastRow(), max = 0;
    if (last > 1) sh.getRange(2, C.ID, last - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(/^SP(\d+)$/); if (m) max = Math.max(max, +m[1]);
    });
    var id = 'SP' + ('00' + (max + 1)).slice(-3);
    var row = new Array(N).fill('');
    row[C.ID - 1] = id; row[C.TS - 1] = new Date(); row[C.CO - 1] = co;
    row[C.DEC - 1] = dec === 'yes' ? 'ยินดีสนับสนุน' : 'ไม่สะดวกสนับสนุน';
    row[C.MONEY - 1] = money || ''; row[C.GTXT - 1] = gTxt; row[C.GQTY - 1] = gQty || ''; row[C.GVAL - 1] = gVal || '';
    row[C.OTHER - 1] = dec === 'yes' ? s_(d.other, 500) : '';
    row[C.CNAME - 1] = cName; row[C.CPOS - 1] = s_(d.cPos, 120); row[C.CTEL - 1] = "'" + cTel;
    row[C.DELIV - 1] = deliv ? DELIV[deliv] : ''; row[C.DOTHER - 1] = deliv === 'other' ? s_(d.delivOther, 200) : '';
    row[C.DDATE - 1] = dec === 'yes' && /^\d{4}-\d{2}-\d{2}$/.test(d.delivDate || '') ? d.delivDate : '';
    row[C.SNAME - 1] = sName; row[C.SPOS - 1] = s_(d.sPos, 120);
    row[C.NOTE - 1] = dec === 'no' ? s_(d.note, 500) : ''; row[C.REF - 1] = [s_(d.doc, 60) ? 'หนังสือ ' + s_(d.doc, 60) : '', s_(d.ref, 200)].filter(String).join(' · ');
    row[C.RCV - 1] = false; row[C.GJSON - 1] = JSON.stringify(gifts); row[C.EV - 1] = ev; row[C.FILES - 1] = files.map(function (f) { return f.name + ' ' + f.url; }).join('\n');
    sh.getRange(last + 1, 1, 1, N).setValues([row]);
    sh.getRange(last + 1, C.DDATE).setNumberFormat('@');
  } finally { lock.releaseLock(); }

  notify_(id, co, dec, money, gTxt, s_(d.other, 500), cName, cTel, ev, files);
  return { ok: true, id: id };
}

function notify_(id, co, dec, money, gTxt, other, cName, cTel, ev, files) {
  var to = prop_('NOTIFY_EMAILS'); if (!to) return;
  try {
    var body = (dec === 'yes' ? '🤝 ยินดีสนับสนุน' : '🙏 ไม่สะดวกสนับสนุน') + '\n\nบริษัท: ' + co +
      (money ? '\nเงินสนับสนุน: ' + money.toLocaleString() + ' บาท' : '') +
      (gTxt ? '\nของรางวัล: ' + gTxt : '') + (other ? '\nอื่น ๆ: ' + other : '') +
      (files && files.length ? '\nไฟล์แนบ: ' + files.map(function (f) { return f.url; }).join(' ') : '') +
      '\nผู้ประสานงาน: ' + cName + ' ' + cTel + '\n\nดูสรุปทั้งหมด: ' + APP_URL + '?hr=1';
    MailApp.sendEmail(to, '[' + id + '] ตอบกลับสนับสนุน ' + ev + ' — ' + co, body);
  } catch (e) { console.warn('mail fail ' + e); }
}

function list_() {
  var sh = sheet_(), last = sh.getLastRow(); if (last < 2) return [];
  var tz = Session.getScriptTimeZone();
  var inv = {}; Object.keys(DELIV).forEach(function (k) { inv[DELIV[k]] = k; });
  return sh.getRange(2, 1, last - 1, N).getValues().filter(function (r) { return r[0]; }).map(function (r) {
    var g = []; try { g = JSON.parse(r[C.GJSON - 1] || '[]'); } catch (e) {}
    var dd = r[C.DDATE - 1]; if (dd instanceof Date) dd = Utilities.formatDate(dd, tz, 'yyyy-MM-dd');
    var ts = r[C.TS - 1]; ts = ts instanceof Date ? Utilities.formatDate(ts, tz, "yyyy-MM-dd'T'HH:mm:ss") : String(ts);
    return {
      id: r[0], ts: ts, company: r[C.CO - 1], decision: String(r[C.DEC - 1]).indexOf('ยินดี') === 0 ? 'yes' : 'no',
      money: n_(r[C.MONEY - 1]), gifts: g, other: r[C.OTHER - 1], cName: r[C.CNAME - 1], cPos: r[C.CPOS - 1],
      cTel: String(r[C.CTEL - 1]), deliv: inv[r[C.DELIV - 1]] || '', delivOther: r[C.DOTHER - 1], delivDate: String(dd || ''),
      sName: r[C.SNAME - 1], sPos: r[C.SPOS - 1], note: r[C.NOTE - 1], received: r[C.RCV - 1] === true, event: r[C.EV - 1] || '', ref: String(r[C.REF - 1] || ''), files: files_(r[C.FILES - 1])
    };
  });
}

function files_(txt) {
  return String(txt || '').split('\n').filter(String).map(function (l) {
    var i = l.lastIndexOf(' http'); return i < 0 ? { name: l, url: '' } : { name: l.slice(0, i), url: l.slice(i + 1) };
  });
}

function setReceived_(id, v) {
  var sh = sheet_(), last = sh.getLastRow(); if (last < 2) return { ok: false, error: 'ไม่พบรายการ' };
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) {
    sh.getRange(i + 2, C.RCV, 1, 2).setValues([[v, v ? new Date() : '']]);
    return { ok: true };
  }
  return { ok: false, error: 'ไม่พบรายการ ' + id };
}
