/**
 * Rattana กำลังคน — หลังบ้าน v1.0
 * อ่านแท็บ "Update ค่างาน" ในชีท "2. ค่างาน" แล้วส่งเฉพาะตัวเลขสรุป (ไม่มีชื่อ/เลขบัตร/เบอร์โทร)
 *
 * วิธีติดตั้ง
 *   1) เปิด https://script.new (ด้วยบัญชีที่เปิดชีท 2. ค่างาน ได้) → ลบโค้ดเดิม → วางไฟล์นี้ทั้งหมด → Save
 *   2) Deploy → New deployment → ประเภท Web app
 *        Execute as: Me   ·   Who has access: Anyone (ทุกคน)
 *   3) กด Authorize → คัดลอก URL ที่ลงท้าย /exec ส่งให้ Claude ใส่ในแอป
 *
 * นับอย่างไร
 *   ต้องมี   = แถวที่ช่อง L "ตำแหน่ง เปิด/ปิด" เป็น "เปิด" (ตำแหน่งที่ปิดไว้ไม่นับ)
 *   มีคนแล้ว = ในแถวที่เปิด ช่อง M "Status ตำแหน่ง" เป็น "เปิด"
 *   ขาด     = ในแถวที่เปิด ช่อง M เป็น "ขาด"
 */
var VERSION = '1.0';
var SHEET_ID = '1VBsJ8agEuLkifni5kHe1t4owQngseBU2ddJQz5ESZeU';
var TAB = 'Update ค่างาน';
var CACHE_SEC = 60;

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'ping') return json_({ ok: true, app: 'Rattana กำลังคน' });
    var cache = CacheService.getScriptCache();
    if (!p.fresh) {
      var hit = cache.get('mp');
      if (hit) return text_(hit);
    }
    var s = JSON.stringify(build_());
    try { cache.put('mp', s, CACHE_SEC); } catch (err) {}
    return text_(s);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function build_() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  if (!sh) throw new Error('ไม่พบแท็บ ' + TAB);
  var last = sh.getLastRow();
  if (last < 2) throw new Error('แท็บ ' + TAB + ' ไม่มีข้อมูล');
  // คอลัมน์ B..M (12 คอลัมน์) — ไม่แตะคอลัมน์ N (เลขบัตรประชาชน) เป็นต้นไป
  var v = sh.getRange(1, 2, last, 12).getDisplayValues();
  var H = v[0].map(function (h) { return String(h).trim(); });
  function at(name, fb) { var i = H.indexOf(name); return i >= 0 ? i : fb; }
  var iC = at('คลัง', 0), iD = at('แผนก', 2), iP = at('ชื่อตำแหน่ง', 4),
      iL = at('ตำแหน่ง เปิด/ปิด', 10), iM = at('Status ตำแหน่ง', 11);

  var map = {}, order = [], closed = 0;
  for (var r = 1; r < v.length; r++) {
    var row = v[r];
    var c = String(row[iC] || '').trim();
    if (!c) continue;
    var L = String(row[iL] || '').trim(), M = String(row[iM] || '').trim();
    if (L !== 'เปิด' || M === 'ปิด') { if (L === 'ปิด' || M === 'ปิด') closed++; continue; }
    var d = String(row[iD] || '').trim(), pos = String(row[iP] || '').trim();
    var k = c + '\t' + d + '\t' + pos;
    if (!map[k]) { map[k] = [c, d, pos, 0, 0]; order.push(k); }
    map[k][3]++;
    if (M === 'เปิด') map[k][4]++;
  }
  return {
    ok: true,
    version: VERSION,
    updated: new Date().toISOString(),
    closed: closed,
    rows: order.map(function (k) { return map[k]; })   // [ศูนย์, ฝ่าย, ตำแหน่ง, ต้องมี, มีคนแล้ว]
  };
}

function text_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}
function json_(obj) {
  obj.version = VERSION;
  return text_(JSON.stringify(obj));
}

/** กด Run ฟังก์ชันนี้ในหน้า Apps Script เพื่อทดสอบ + ขอสิทธิ์อ่านชีทครั้งแรก */
function testBuild() {
  var d = build_();
  var need = 0, have = 0;
  d.rows.forEach(function (r) { need += r[3]; have += r[4]; });
  Logger.log('ต้องมี ' + need + ' · มีคน ' + have + ' · ขาด ' + (need - have) + ' · ปิด ' + d.closed);
}
