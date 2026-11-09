// Rattana สนับสนุนงานปีใหม่ — หลังบ้าน (Google Apps Script) v1.1
// เก็บแบบตอบกลับการสนับสนุนจากเวนเดอร์ / ซัพพลายเออร์ ลง Google Sheet
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

var VERSION = '1.1';
var SHEET_ID = '16fWBSS1ZxzuRhawl7DWaZDl1RDD6TV6Dl6SMmSrA_9E'; // งบกินเลี้ยงปีใหม่
var TAB = 'APPของบ';
var DEFAULT_PIN = '2570';
var APP_URL = 'https://rattanaphaiboon.github.io/app/rattana-sponsor.html';

// คอลัมน์ตายตัว (1-based)
var HEADERS = ['เลขที่', 'เวลา', 'บริษัท/ห้างร้าน', 'การพิจารณา', 'เงินสนับสนุน (บาท)',
  'ของรางวัล (อ่านง่าย)', 'จำนวนชิ้นรวม', 'มูลค่าของรางวัลประมาณ', 'อื่น ๆ',
  'ผู้ประสานงาน', 'ตำแหน่งผู้ประสานงาน', 'เบอร์โทร', 'การส่งมอบ', 'ระบุการส่งมอบอื่น', 'วันที่สะดวกส่ง',
  'ผู้ตอบกลับ', 'ตำแหน่งผู้ตอบกลับ', 'ข้อความ', 'ลิงก์เฉพาะบริษัท', 'ได้รับแล้ว', 'เวลาที่บันทึกรับ',
  'ของรางวัล (JSON)'];
var C = { ID: 1, TS: 2, CO: 3, DEC: 4, MONEY: 5, GTXT: 6, GQTY: 7, GVAL: 8, OTHER: 9, CNAME: 10, CPOS: 11,
  CTEL: 12, DELIV: 13, DOTHER: 14, DDATE: 15, SNAME: 16, SPOS: 17, NOTE: 18, REF: 19, RCV: 20, RCVAT: 21, GJSON: 22 };
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
  return json_({ ok: false, error: 'unknown action' });
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents || '{}');
    if (p.action === 'submit') return json_(submit_(p.data || {}));
    if (p.action === 'list') { checkPin_(p.pin); return json_({ ok: true, rows: list_() }); }
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
    row[C.NOTE - 1] = dec === 'no' ? s_(d.note, 500) : ''; row[C.REF - 1] = s_(d.ref, 200);
    row[C.RCV - 1] = false; row[C.GJSON - 1] = JSON.stringify(gifts);
    sh.getRange(last + 1, 1, 1, N).setValues([row]);
    sh.getRange(last + 1, C.DDATE).setNumberFormat('@');
  } finally { lock.releaseLock(); }

  notify_(id, co, dec, money, gTxt, s_(d.other, 500), cName, cTel);
  return { ok: true, id: id };
}

function notify_(id, co, dec, money, gTxt, other, cName, cTel) {
  var to = prop_('NOTIFY_EMAILS'); if (!to) return;
  try {
    var body = (dec === 'yes' ? '🤝 ยินดีสนับสนุน' : '🙏 ไม่สะดวกสนับสนุน') + '\n\nบริษัท: ' + co +
      (money ? '\nเงินสนับสนุน: ' + money.toLocaleString() + ' บาท' : '') +
      (gTxt ? '\nของรางวัล: ' + gTxt : '') + (other ? '\nอื่น ๆ: ' + other : '') +
      '\nผู้ประสานงาน: ' + cName + ' ' + cTel + '\n\nดูสรุปทั้งหมด: ' + APP_URL + '?hr=1';
    MailApp.sendEmail(to, '[' + id + '] แบบตอบกลับสนับสนุนงานปีใหม่ — ' + co, body);
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
      sName: r[C.SNAME - 1], sPos: r[C.SPOS - 1], note: r[C.NOTE - 1], received: r[C.RCV - 1] === true
    };
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
