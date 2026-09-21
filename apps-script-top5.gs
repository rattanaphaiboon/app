/**
 * ══ Top5ร้าน — สินค้าที่แต่ละร้านซื้อมากสุด 5 อย่างใน 12 เดือน (จาก BigQuery) ══
 * v1.0 — 2026-09-21 · ใช้คู่กับแอปจัดรถ delivery-queue v9.208 (แนะนำเติมสินค้าเมื่อรถยังไม่เต็ม)
 * ไฟล์นี้อยู่ในโปรเจกต์ Apps Script ของชีท "จัดรถส่งสินค้า" (โปรเจกต์เดียวกับ WebApp.gs ของ Keepdata)
 *   ⚠️ ไม่ได้แตะ WebApp.gs / ไม่ต้อง Deploy web app ใหม่ — ไฟล์นี้ทำงานผ่าน trigger ตั้งเวลาอย่างเดียว
 *
 * ทำอะไร:
 *   ดึงยอดขาย 12 เดือนล่าสุดที่ปิดแล้วจาก BigQuery (Testimport.BQ_2024_2025)
 *   → รวมต่อ ร้าน × สินค้า (รวมทุกหน่วย EA/PA/CS ด้วยชื่อสินค้า) → เรียงตาม "ลัง" (Sales_CS) มาก→น้อย
 *     (เท่ากันดูยอดเงิน) → เก็บ 5 อันดับแรกของแต่ละร้าน
 *   → เขียนทับแท็บ "Top5ร้าน" ในชีทนี้ · แอปอ่านแท็บนี้ผ่าน gviz เอง (แอปไม่ยิง BigQuery = ไม่กินโควต้า)
 *   ไม่นับ: หมวด Non-Product / Premium · สินค้าที่ได้แต่ของแถม (ยอดเงิน 0)
 *   ชื่อสินค้า: จับกับชีท Product (Sheet1) — ชื่อตรงตัวก่อน ไม่เจอค่อยใช้บาร์โค้ด CODE EA/PA/BP/CS
 *              → ได้ชื่อเดียวกับบิลในแอป (SKU_NAME) เทียบได้ตรง
 *
 * อัปเดตเอง: ทุกวันที่ 5 ของเดือน ช่วง 06:00-07:00 (trigger รายเดือน)
 *   ถ้าวันนั้นยอดเดือนที่แล้วยังไม่เข้า BigQuery → ใช้ข้อมูลล่าสุดที่มีไปก่อน แล้วลองใหม่วันรุ่งขึ้น (ถึงวันที่ 12)
 * ค่าใช้จ่าย BigQuery: ~0.5 GB ต่อครั้ง (เดือนละครั้ง)
 *
 * ── ตั้งค่าครั้งแรก ──
 *   1. บริการ (+) → BigQuery API → เพิ่ม
 *   2. เลือกฟังก์ชัน setupTop5 → ▶ เรียกใช้ → อนุญาตสิทธิ์ (BigQuery · ชีท · ตั้งเวลา)
 *      = ตั้ง trigger วันที่ 5 + ดึงข้อมูลรอบแรกทันที
 *   ดึงใหม่เองตอนไหนก็ได้: เรียกใช้ refreshTop5 · ดูผลรอบล่าสุด: เรียกใช้ t5Status
 */
var T5_PROJECT     = 'project-test-471907';
var T5_TABLE       = '`project-test-471907.Testimport.BQ_2024_2025`';
var T5_TAB         = 'Top5ร้าน';
var T5_TOPN        = 5;
var T5_MONTHS      = 12;
var T5_RETRY_UNTIL = 12;   // ข้อมูลยังไม่ครบ → ลองใหม่ทุกวันจนถึงวันที่เท่านี้ของเดือน
var T5_PRODUCT_SS  = '16mYDqAqqJma-_0vCIAajy6bcjdOZ7F6VagxkdkqAB2I';
var T5_PRODUCT_TAB = 'Sheet1';
// A..K = คอลัมน์ที่แอปอ่าน · L, M = ไว้ตรวจสอบ
var T5_HEADERS = ['รหัสร้าน', 'อันดับ', 'ชื่อสินค้า', 'ลัง (12 เดือน)', 'จำนวนเดือนที่ซื้อ', 'ซื้อล่าสุด',
                  'ยอดเงิน (บาท)', 'หมวด', 'คลัง', 'ช่วงข้อมูล', 'อัปเดต', 'รหัสสินค้า', 'ชื่อสินค้า (BigQuery)'];
var T5_TEXT_COLS = [1, 3, 6, 8, 9, 10, 11, 12, 13];   // กัน Sheets แปลง "2026/05" เป็นวันที่ / รหัสร้านเป็นตัวเลข

// ตั้ง trigger รายเดือน (วันที่ 5) + ดึงรอบแรกทันที — เรียกซ้ำได้ ไม่สร้าง trigger ซ้อน
function setupTop5() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'refreshTop5' || h === 't5Retry') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshTop5').timeBased().onMonthDay(5).atHour(6).inTimezone('Asia/Bangkok').create();
  return refreshTop5();
}

// trigger ลองใหม่ (ครั้งเดียว) — ลบตัวเองก่อนแล้วค่อยดึง
function t5Retry() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 't5Retry') ScriptApp.deleteTrigger(t);
  });
  return refreshTop5();
}

function refreshTop5() {
  var cache = CacheService.getScriptCache();
  if (cache.get('T5_RUNNING')) { console.log('Top5: กำลังดึงอยู่แล้ว ข้ามรอบนี้'); return { ok: false, error: 'busy' }; }
  cache.put('T5_RUNNING', '1', 600);
  try {
    var tz = 'Asia/Bangkok', now = new Date();
    var y = +Utilities.formatDate(now, tz, 'yyyy'), m = +Utilities.formatDate(now, tz, 'M'), d = +Utilities.formatDate(now, tz, 'd');
    var pm = m - 1, py = y;
    if (pm < 1) { pm = 12; py--; }
    var cap = py + '/' + ('0' + pm).slice(-2);   // เดือนที่แล้ว — ไม่เอาเดือนปัจจุบันที่ยังไม่ปิดยอด

    var rows = t5Query_(cap);
    if (!rows.length) throw new Error('BigQuery ไม่คืนข้อมูล (ไม่มียอดขายถึงเดือน ' + cap + ') — คงข้อมูลเดิมไว้');

    var win = String(rows[0][10] || '');
    var lastMonth = win.split('-')[1] || '';
    var names = t5ProductNames_();
    var stamp = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm');
    var stores = {}, mapped = 0;
    var out = rows.map(function (r) {
      var bqName = String(r[3] || '').trim(), code = String(r[2] || '').trim();
      var name = t5MapName_(names, bqName, code);
      if (name !== bqName) mapped++;
      stores[r[0]] = 1;
      return [String(r[0] || '').trim(), +r[1] || 0, name, +r[5] || 0, +r[7] || 0, String(r[8] || ''),
              +r[6] || 0, String(r[4] || ''), String(r[9] || ''), win, stamp, code, bqName];
    });
    t5Write_(out);

    var stale = !!(lastMonth && lastMonth < cap);
    if (stale && d <= T5_RETRY_UNTIL) t5ScheduleRetry_();
    var info = { ok: true, rows: out.length, stores: Object.keys(stores).length, window: win, stale: stale,
                 renamedByBarcode: mapped, productSheet: names.n, updated: stamp };
    PropertiesService.getScriptProperties().setProperty('T5_LAST', JSON.stringify(info));
    console.log('Top5: ' + JSON.stringify(info));
    return info;
  } finally {
    cache.remove('T5_RUNNING');
  }
}

function t5Status() {
  var last = PropertiesService.getScriptProperties().getProperty('T5_LAST') || '(ยังไม่เคยดึง)';
  var trig = ScriptApp.getProjectTriggers().filter(function (t) {
    var h = t.getHandlerFunction(); return h === 'refreshTop5' || h === 't5Retry';
  }).map(function (t) { return t.getHandlerFunction() + ' (' + t.getEventType() + ')'; });
  console.log('รอบล่าสุด: ' + last);
  console.log('trigger: ' + (trig.join(', ') || '(ไม่มี — เรียกใช้ setupTop5)'));
  return { last: last, triggers: trig };
}

function t5ScheduleRetry_() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 't5Retry'; });
  if (!has) ScriptApp.newTrigger('t5Retry').timeBased().after(24 * 60 * 60 * 1000).create();
}

// คืนแถว [cc, อันดับ, รหัสสินค้า, ชื่อสินค้า, หมวด, ลัง, ยอดเงิน, จำนวนเดือน, ซื้อล่าสุด, คลังหลักของร้าน, ช่วงข้อมูล]
function t5Query_(cap) {
  var sql = [
    'WITH lastm AS (',
    "  SELECT MAX(Month_Year) AS m FROM " + T5_TABLE + " WHERE Month_Year <= '" + cap + "'",
    '), win AS (',
    "  SELECT FORMAT_DATE('%Y/%m', DATE_SUB(PARSE_DATE('%Y/%m', m), INTERVAL " + (T5_MONTHS - 1) + " MONTH)) AS m1, m AS m2 FROM lastm",
    '), src AS (',
    '  SELECT TRIM(v.Customer_Code) AS cc, v.Product_Code AS pc, TRIM(v.Product_Name) AS pn, v.Cat_Type AS ct,',
    '         v.WH AS wh, v.Month_Year AS my, v.Sales_CS AS scs, v.Exvat AS sex',
    '  FROM ' + T5_TABLE + ' v CROSS JOIN win',
    '  WHERE v.Month_Year BETWEEN win.m1 AND win.m2',
    "    AND IFNULL(v.Cat_Type, '') NOT IN ('Non-Product', 'Premium')",
    "    AND IFNULL(TRIM(v.Customer_Code), '') != '' AND IFNULL(TRIM(v.Product_Name), '') != ''",
    '), cw AS (',
    '  SELECT cc, APPROX_TOP_COUNT(wh, 1)[OFFSET(0)].value AS wh FROM src GROUP BY cc',
    '), agg AS (',
    '  SELECT cc, pn, APPROX_TOP_COUNT(pc, 1)[OFFSET(0)].value AS pc, ANY_VALUE(ct) AS ct,',
    '         SUM(scs) AS tcs, SUM(sex) AS tex, COUNT(DISTINCT my) AS nm, MAX(my) AS lm',
    '  FROM src GROUP BY cc, pn HAVING tcs > 0 AND tex > 0',
    '), rk AS (',
    '  SELECT *, ROW_NUMBER() OVER (PARTITION BY cc ORDER BY tcs DESC, tex DESC, pn) AS r FROM agg',
    ')',
    'SELECT rk.cc, rk.r, rk.pc, rk.pn, rk.ct, ROUND(rk.tcs, 2) AS cs, ROUND(rk.tex, 2) AS ex, rk.nm, rk.lm, cw.wh,',
    "  (SELECT CONCAT(m1, '-', m2) FROM win) AS win",
    'FROM rk JOIN cw USING (cc) WHERE rk.r <= ' + T5_TOPN + ' ORDER BY rk.cc, rk.r'
  ].join('\n');
  var res = BigQuery.Jobs.query({ query: sql, useLegacySql: false, timeoutMs: 60000, maxResults: 10000 }, T5_PROJECT);
  var jobId = res.jobReference.jobId, loc = res.jobReference.location;
  var wait = 1000;
  while (!res.jobComplete) {
    Utilities.sleep(wait);
    wait = Math.min(wait * 2, 8000);
    res = BigQuery.Jobs.getQueryResults(T5_PROJECT, jobId, { location: loc, maxResults: 10000 });
  }
  var rows = (res.rows || []).slice();
  while (res.pageToken) {
    res = BigQuery.Jobs.getQueryResults(T5_PROJECT, jobId, { location: loc, pageToken: res.pageToken, maxResults: 10000 });
    rows = rows.concat(res.rows || []);
  }
  return rows.map(function (r) { return r.f.map(function (c) { return c.v; }); });
}

// ชีท Product → ชื่อสินค้าปัจจุบัน (จับด้วยชื่อ หรือบาร์โค้ดหน่วยใดก็ได้)
function t5ProductNames_() {
  var out = { byName: {}, byCode: {}, n: 0 };
  try {
    var sh = SpreadsheetApp.openById(T5_PRODUCT_SS).getSheetByName(T5_PRODUCT_TAB);
    var lastRow = sh.getLastRow(), lastCol = Math.min(sh.getLastColumn(), 40);
    if (lastRow < 2) return out;
    var head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || '').trim().toUpperCase(); });
    var iName = head.indexOf('PRODUCT NAME');
    var iCodes = ['CODE EA', 'CODE PA', 'CODE BP', 'CODE CS'].map(function (h) { return head.indexOf(h); }).filter(function (i) { return i >= 0; });
    if (iName < 0) return out;
    var width = Math.max.apply(null, [iName].concat(iCodes)) + 1;
    sh.getRange(2, 1, lastRow - 1, width).getValues().forEach(function (v) {
      var n = String(v[iName] || '').trim();
      if (!n) return;
      out.n++;
      out.byName[t5Norm_(n)] = n;
      iCodes.forEach(function (i) { var k = t5Code_(v[i]); if (k && !out.byCode[k]) out.byCode[k] = n; });
    });
  } catch (e) {
    console.warn('Top5: อ่านชีท Product ไม่ได้ ใช้ชื่อจาก BigQuery แทน — ' + e);
  }
  return out;
}
function t5Norm_(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function t5Code_(c) { return String(c == null ? '' : c).trim().replace(/^BC-/i, '').replace(/\.0+$/, '').replace(/^0+/, ''); }
function t5MapName_(names, bqName, code) {
  var hit = names.byName[t5Norm_(bqName)];
  if (hit) return hit;
  var k = t5Code_(code);
  if (k && names.byCode[k]) return names.byCode[k];
  return bqName;
}

function t5Write_(out) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(T5_TAB) || ss.insertSheet(T5_TAB);
  var w = T5_HEADERS.length, n = out.length + 1;
  sh.clearContents();
  if (sh.getMaxRows() < n) sh.insertRowsAfter(sh.getMaxRows(), n - sh.getMaxRows());
  if (sh.getMaxColumns() < w) sh.insertColumnsAfter(sh.getMaxColumns(), w - sh.getMaxColumns());
  T5_TEXT_COLS.forEach(function (c) { sh.getRange(1, c, n, 1).setNumberFormat('@'); });
  sh.getRange(1, 1, 1, w).setValues([T5_HEADERS]).setFontWeight('bold');
  for (var i = 0; i < out.length; i += 5000) {
    var part = out.slice(i, i + 5000);
    sh.getRange(2 + i, 1, part.length, w).setValues(part);
  }
  sh.setFrozenRows(1);
  var extra = sh.getMaxRows() - n;   // รอบก่อนมีร้านมากกว่า → ตัดแถวว่างท้ายชีท ให้ gviz อ่านเร็ว
  if (extra > 100) sh.deleteRows(n + 1, extra - 100);
  SpreadsheetApp.flush();
}
