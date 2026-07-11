/**
 * Rattana BQ Proxy — POS (Point of Sale)
 * ใช้กับ BigQuery table: project-test-471907.Testimport.POS
 * v1.0 — 2026-07-11
 *
 * Schema (POS):
 *   YEAR(INT), QUATER(STR), MONTH(STR "01"-"12"), WEEKNUM(INT),
 *   BILL_NO(STR), BARCODE(STR), PRODUCT_NAME(STR), UNIT(STR),
 *   SALES_QTY(FLOAT), FREE_QTY(FLOAT), UNIT_PRICE(FLOAT),
 *   EXVAT(FLOAT), TOTAL(FLOAT), CAMPAIGN(STR), TIME_SLOTS(STR),
 *   SALES_EA(FLOAT), FREE_EA(FLOAT), SALES_CS(FLOAT), FREE_CS(FLOAT),
 *   SALES_CSxVALUE(FLOAT), FREE_CSxVALUE(FLOAT),
 *   LEVEL(STR), SUB_DISTRICT(STR), DISTRICT(STR), PROVINCE(STR),
 *   CAT_BU(STR), CAT_TYPE(STR), CAT_GROUP(STR), CAT_VENDOR(STR),
 *   CAT_BRAND(STR), CAT_SIZE(STR), VENDOR_NAME(STR), AGENT(STR),
 *   TransID(INT)
 *
 * Month_Year ใน POS = CONCAT(CAST(YEAR AS STRING), '/', MONTH) → "2026/05"
 * (ไม่มีคอลัมน์ Month_Year โดยตรง ต่างจาก BQ_2024_2025)
 *
 * ── DEPLOY INFO ──
 * Script Editor : (สร้าง GAS project ใหม่ → ผูก GCP project-test-471907 → เพิ่ม BigQuery API)
 * Web App URL   : (ได้หลัง Deploy → New deployment → Web app → Execute as: Me, Access: Anyone)
 *
 * ── วิธีอัปเดต ──
 *   1. copy code นี้ไปวางใน Apps Script
 *   2. Save
 *   3. Deploy → จัดการการทำให้ใช้งานได้ → ✏ → เวอร์ชันใหม่ → Deploy
 *
 * ── SETUP ครั้งแรก ──
 *   1. Apps Script → ⚙ Project Settings → ผูก GCP Project = project-test-471907
 *   2. Services (+) → เพิ่ม BigQuery API
 *   3. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone
 *
 * Endpoints (GET):
 *   ?action=ping
 *     → health check + version
 *
 *   ?action=availMonths
 *     → เดือนที่มีข้อมูลจริง (month-picker) เรียงล่าสุดก่อน
 *       [{month_year:"2026/05", bill_count, exvat}]
 *
 *   ?action=summary&months=6
 *     → ยอดรวมรายเดือน: bill_count, exvat, sales_cs, total_baht
 *       (N เดือนย้อนหลัง ไม่รวมเดือนปัจจุบัน)
 *
 *   ?action=byVendor&months=6[&vendor=<v>]
 *     → ยอดแยกตาม CAT_VENDOR × เดือน
 *       [{month_year, vendor, exvat, sales_cs, bill_count}]
 *
 *   ?action=byProduct&months=6[&vendor=<v>][&top=20]
 *     → ยอดขายแยกตาม BARCODE × PRODUCT_NAME รวมเดือนที่เลือก
 *       [{barcode, product_name, cat_brand, cat_size, vendor, exvat, sales_cs, sales_qty}]
 *       top=N = คืนเฉพาะ N สินค้าขายดีสุด (เรียงตาม exvat desc)
 *
 *   ?action=byLocation&months=6[&province=<p>]
 *     → ยอดขายตาม DISTRICT × PROVINCE รวมเดือน
 *       [{province, district, exvat, sales_cs, bill_count}]
 *
 *   ?action=byTimeSlot&months=6[&vendor=<v>]
 *     → ยอดขายตาม TIME_SLOTS รวมเดือน
 *       [{time_slot, exvat, sales_cs, bill_count}]
 *
 *   ?action=byCampaign&months=6
 *     → ยอดขายตาม CAMPAIGN รวมเดือน
 *       [{campaign, exvat, sales_cs, bill_count}]
 *
 *   ?action=byLevel&months=6
 *     → ยอดขายตาม LEVEL (ระดับร้าน) รวมเดือน
 *       [{level, exvat, sales_cs, bill_count}]
 *
 *   ?action=byWeek&year=2026[&vendor=<v>]
 *     → ยอดขายรายสัปดาห์ตลอดปี
 *       [{year, weeknum, exvat, sales_cs, bill_count}]
 *
 * Endpoints (POST):
 *   POST {action:'byProductBatch', vendors:['v1','v2'], months:6}
 *     → ยอดขายสินค้าหลาย vendor พร้อมกัน
 *
 *   POST {action:'locationDetail', districts:['d1','d2'], months:6}
 *     → รายละเอียดสินค้าในหลายอำเภอ top 20 product/อำเภอ
 */

var VERSION    = 'v1.0';
var PROJECT_ID = 'project-test-471907';
var DATASET    = 'Testimport';
var TABLE      = 'POS';

/* ─── helper: สร้าง Month_Year label จาก YEAR+MONTH คอลัมน์ใน POS ─── */
function monthYearExpr_() {
  // POS ไม่มี Month_Year column โดยตรง → สร้างจาก YEAR + MONTH
  // MONTH เป็น STRING "01".."12" อยู่แล้ว
  return "CONCAT(CAST(YEAR AS STRING), '/', MONTH)";
}

/* ─── helper: สร้าง IN-list ของ Month_Year สำหรับ N เดือนย้อนหลัง ─── */
function lastNMonthLabels_(months) {
  var now  = new Date();
  var year = now.getFullYear();
  var mon  = now.getMonth() + 1; // 1-12
  var labels = [];
  for (var i = months; i >= 1; i--) {
    var m = mon - i;
    var y = year;
    while (m <= 0) { m += 12; y -= 1; }
    var mm = (m < 10 ? '0' + m : '' + m);
    labels.push(y + '/' + mm);
  }
  return labels;
}

/* ─── doGet ─── */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || 'ping';
    var out;

    if (action === 'ping') {
      out = { ok: true, msg: 'pong', version: VERSION, table: PROJECT_ID + '.' + DATASET + '.' + TABLE, time: new Date().toISOString() };

    } else if (action === 'availMonths') {
      out = { ok: true, data: getAvailMonths_() };

    } else if (action === 'summary') {
      out = { ok: true, data: getSummary_(parseInt(p.months) || 6) };

    } else if (action === 'byVendor') {
      out = { ok: true, data: getByVendor_(parseInt(p.months) || 6, p.vendor || '') };

    } else if (action === 'byProduct') {
      out = { ok: true, data: getByProduct_(parseInt(p.months) || 6, p.vendor || '', parseInt(p.top) || 0) };

    } else if (action === 'byLocation') {
      out = { ok: true, data: getByLocation_(parseInt(p.months) || 6, p.province || '') };

    } else if (action === 'byTimeSlot') {
      out = { ok: true, data: getByTimeSlot_(parseInt(p.months) || 6, p.vendor || '') };

    } else if (action === 'byCampaign') {
      out = { ok: true, data: getByCampaign_(parseInt(p.months) || 6) };

    } else if (action === 'byLevel') {
      out = { ok: true, data: getByLevel_(parseInt(p.months) || 6) };

    } else if (action === 'byWeek') {
      var yr = parseInt(p.year) || new Date().getFullYear();
      out = { ok: true, data: getByWeek_(yr, p.vendor || '') };

    } else {
      out = { ok: false, error: 'unknown action: ' + action };
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ─── doPost ─── */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    var action = body.action || '';
    var out;

    if (action === 'byProductBatch') {
      var vendors = body.vendors || [];
      if (typeof vendors === 'string') vendors = vendors.split(',');
      out = { ok: true, data: getByProductBatch_(vendors, parseInt(body.months) || 6) };

    } else if (action === 'locationDetail') {
      var districts = body.districts || [];
      if (typeof districts === 'string') districts = districts.split(',');
      out = { ok: true, data: getLocationDetail_(districts, parseInt(body.months) || 6) };

    } else {
      out = { ok: false, error: 'unknown post action: ' + action };
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ═══════════════════════════════════════════════
   QUERY FUNCTIONS
   ═══════════════════════════════════════════════ */

/* เดือนที่มีข้อมูลจริง — เรียงล่าสุดก่อน */
function getAvailMonths_() {
  var my = monthYearExpr_();
  var q =
    'SELECT ' + my + ' AS month_year, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count, ' +
    '       SUM(EXVAT) AS exvat ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    'WHERE YEAR IS NOT NULL AND MONTH IS NOT NULL ' +
    'GROUP BY month_year ' +
    'ORDER BY month_year DESC';
  return runQuery_(q, ['month_year', 'bill_count', 'exvat']);
}

/* ยอดรวมรายเดือน */
function getSummary_(months) {
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var q =
    'SELECT ' + my + ' AS month_year, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count, ' +
    '       SUM(EXVAT) AS exvat, ' +
    '       SUM(SALES_CS) AS sales_cs, ' +
    '       SUM(TOTAL) AS total_baht, ' +
    '       SUM(SALES_QTY) AS sales_qty ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    'WHERE ' + my + ' IN (' + inList + ') ' +
    'GROUP BY month_year ' +
    'ORDER BY month_year';
  return runQuery_(q, ['month_year', 'bill_count', 'exvat', 'sales_cs', 'total_baht', 'sales_qty']);
}

/* ยอดแยก vendor × เดือน */
function getByVendor_(months, vendor) {
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var vFilter = vendor ? "AND CAT_VENDOR = '" + esc_(vendor) + "' " : '';
  var q =
    'SELECT ' + my + ' AS month_year, CAT_VENDOR AS vendor, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "WHERE CAT_VENDOR IS NOT NULL AND CAT_VENDOR != '' " +
    '  AND ' + my + ' IN (' + inList + ') ' +
    vFilter +
    'GROUP BY month_year, vendor ' +
    'ORDER BY month_year, exvat DESC';
  return runQuery_(q, ['month_year', 'vendor', 'exvat', 'sales_cs', 'bill_count']);
}

/* ยอดขายสินค้าแยก BARCODE — กรอง vendor ได้, top=N คืน N สินค้าขายดีสุด */
function getByProduct_(months, vendor, top) {
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var vFilter = vendor ? "AND CAT_VENDOR = '" + esc_(vendor) + "' " : '';
  var topClause = (top > 0) ? 'LIMIT ' + top : '';
  var q =
    'SELECT BARCODE AS barcode, ANY_VALUE(PRODUCT_NAME) AS product_name, ' +
    '       ANY_VALUE(CAT_BRAND) AS cat_brand, ANY_VALUE(CAT_SIZE) AS cat_size, ' +
    '       ANY_VALUE(CAT_VENDOR) AS vendor, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, SUM(SALES_QTY) AS sales_qty, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "WHERE BARCODE IS NOT NULL AND BARCODE != '' " +
    '  AND ' + my + ' IN (' + inList + ') ' +
    vFilter +
    'GROUP BY barcode ' +
    'ORDER BY exvat DESC ' +
    topClause;
  return runQuery_(q, ['barcode', 'product_name', 'cat_brand', 'cat_size', 'vendor', 'exvat', 'sales_cs', 'sales_qty', 'bill_count']);
}

/* ยอดขายตาม DISTRICT × PROVINCE — กรอง province ได้ */
function getByLocation_(months, province) {
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var pvFilter = province ? "AND PROVINCE = '" + esc_(province) + "' " : '';
  var q =
    'SELECT PROVINCE AS province, DISTRICT AS district, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "WHERE PROVINCE IS NOT NULL AND PROVINCE != '' " +
    '  AND ' + my + ' IN (' + inList + ') ' +
    pvFilter +
    'GROUP BY province, district ' +
    'ORDER BY exvat DESC';
  return runQuery_(q, ['province', 'district', 'exvat', 'sales_cs', 'bill_count']);
}

/* ยอดขายตาม TIME_SLOTS — กรอง vendor ได้ */
function getByTimeSlot_(months, vendor) {
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var vFilter = vendor ? "AND CAT_VENDOR = '" + esc_(vendor) + "' " : '';
  var q =
    'SELECT TIME_SLOTS AS time_slot, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "WHERE TIME_SLOTS IS NOT NULL AND TIME_SLOTS != '' " +
    '  AND ' + my + ' IN (' + inList + ') ' +
    vFilter +
    'GROUP BY time_slot ' +
    'ORDER BY exvat DESC';
  return runQuery_(q, ['time_slot', 'exvat', 'sales_cs', 'bill_count']);
}

/* ยอดขายตาม CAMPAIGN */
function getByCampaign_(months) {
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var q =
    'SELECT CAMPAIGN AS campaign, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "WHERE CAMPAIGN IS NOT NULL AND CAMPAIGN != '' " +
    '  AND ' + my + ' IN (' + inList + ') ' +
    'GROUP BY campaign ' +
    'ORDER BY exvat DESC';
  return runQuery_(q, ['campaign', 'exvat', 'sales_cs', 'bill_count']);
}

/* ยอดขายตาม LEVEL (ระดับร้าน) */
function getByLevel_(months) {
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var q =
    'SELECT LEVEL AS level, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "WHERE LEVEL IS NOT NULL AND LEVEL != '' " +
    '  AND ' + my + ' IN (' + inList + ') ' +
    'GROUP BY level ' +
    'ORDER BY exvat DESC';
  return runQuery_(q, ['level', 'exvat', 'sales_cs', 'bill_count']);
}

/* ยอดขายรายสัปดาห์ตลอดปี — กรอง vendor ได้ */
function getByWeek_(year, vendor) {
  var vFilter = vendor ? "AND CAT_VENDOR = '" + esc_(vendor) + "' " : '';
  var q =
    'SELECT YEAR AS year, WEEKNUM AS weeknum, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, ' +
    '       COUNT(DISTINCT BILL_NO) AS bill_count ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    'WHERE YEAR = ' + parseInt(year) + ' ' +
    '  AND WEEKNUM IS NOT NULL ' +
    vFilter +
    'GROUP BY year, weeknum ' +
    'ORDER BY weeknum';
  return runQuery_(q, ['year', 'weeknum', 'exvat', 'sales_cs', 'bill_count']);
}

/* POST: ยอดสินค้าหลาย vendor พร้อมกัน */
function getByProductBatch_(vendors, months) {
  if (!vendors || !vendors.length) return [];
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var vList = vendors.map(function(v) { return "'" + esc_(v) + "'"; }).join(',');
  var q =
    'SELECT CAT_VENDOR AS vendor, BARCODE AS barcode, ANY_VALUE(PRODUCT_NAME) AS product_name, ' +
    '       ANY_VALUE(CAT_BRAND) AS cat_brand, ANY_VALUE(CAT_SIZE) AS cat_size, ' +
    '       SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, SUM(SALES_QTY) AS sales_qty ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "WHERE BARCODE IS NOT NULL AND BARCODE != '' " +
    '  AND CAT_VENDOR IN (' + vList + ') ' +
    '  AND ' + my + ' IN (' + inList + ') ' +
    'GROUP BY vendor, barcode ' +
    'ORDER BY vendor, exvat DESC';
  return runQuery_(q, ['vendor', 'barcode', 'product_name', 'cat_brand', 'cat_size', 'exvat', 'sales_cs', 'sales_qty']);
}

/* POST: รายละเอียดสินค้าในหลายอำเภอ top 20/อำเภอ */
function getLocationDetail_(districts, months) {
  if (!districts || !districts.length) return [];
  var inList = monthInList_(months);
  var my = monthYearExpr_();
  var dList = districts.map(function(d) { return "'" + esc_(d) + "'"; }).join(',');
  var q =
    'WITH base AS ( ' +
    '  SELECT DISTRICT AS district, BARCODE AS barcode, ANY_VALUE(PRODUCT_NAME) AS product_name, ' +
    '         ANY_VALUE(CAT_BRAND) AS cat_brand, ANY_VALUE(CAT_VENDOR) AS vendor, ' +
    '         SUM(EXVAT) AS exvat, SUM(SALES_CS) AS sales_cs, ' +
    '         COUNT(DISTINCT BILL_NO) AS bill_count ' +
    '  FROM `' + PROJECT_ID + '.' + DATASET + '.' + TABLE + '` ' +
    "  WHERE DISTRICT IN (" + dList + ") " +
    '    AND ' + my + ' IN (' + inList + ') ' +
    "    AND BARCODE IS NOT NULL AND BARCODE != '' " +
    '  GROUP BY district, barcode ' +
    ') ' +
    'SELECT *, ROW_NUMBER() OVER(PARTITION BY district ORDER BY exvat DESC) AS rk ' +
    'FROM base ' +
    'QUALIFY rk <= 20 ' +
    'ORDER BY district, exvat DESC';
  return runQuery_(q, ['district', 'barcode', 'product_name', 'cat_brand', 'vendor', 'exvat', 'sales_cs', 'bill_count', 'rk']);
}

/* ═══════════════════════════════════════════════
   SHARED UTILITIES
   ═══════════════════════════════════════════════ */

/* สร้าง IN-list string ของ Month_Year N เดือนย้อนหลัง */
function monthInList_(months) {
  return lastNMonthLabels_(months).map(function(l) { return "'" + l + "'"; }).join(',');
}

/* escape single-quote ใน string ก่อนนำไป SQL */
function esc_(s) {
  return String(s || '').replace(/'/g, "''");
}

/* run BigQuery query + paginate */
function runQuery_(query, keys) {
  var request = { query: query, useLegacySql: false, timeoutMs: 60000 };
  var qr = BigQuery.Jobs.query(request, PROJECT_ID);
  var jobId = qr.jobReference.jobId;
  var waits = 0;
  while (!qr.jobComplete && waits < 30) {
    Utilities.sleep(500);
    qr = BigQuery.Jobs.getQueryResults(PROJECT_ID, jobId);
    waits++;
  }
  if (!qr.jobComplete) throw new Error('BQ query timeout');
  var out = rowsToObjects_(qr.rows || [], keys);
  while (qr.pageToken) {
    qr = BigQuery.Jobs.getQueryResults(PROJECT_ID, jobId, { pageToken: qr.pageToken });
    out = out.concat(rowsToObjects_(qr.rows || [], keys));
  }
  return out;
}

function rowsToObjects_(rows, keys) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var f = rows[i].f;
    var obj = {};
    for (var k = 0; k < keys.length; k++) {
      obj[keys[k]] = (f[k] && f[k].v != null) ? f[k].v : '';
    }
    out.push(obj);
  }
  return out;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
