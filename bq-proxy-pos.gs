/**
 * Rattana POS (Sell-Out) — BigQuery Proxy
 * v1.0 — 2026-06-18  (แยกตัวใหม่ ไม่เกี่ยวกับ proxy เดิม)
 *
 * ดึงจาก VIEW: project-test-471907.Testimport.BQ_POS  (ข้อมูล POS ขายออกหน้าร้าน)
 * โครงสร้าง endpoint เหมือน vendor-compare proxy แต่ map column ของ POS:
 *
 *   response key   ← POS column
 *   ─────────────────────────────────
 *   month_year     ← MONTH            (format "2026/03")
 *   cat_vendor     ← CAT_VENDOR
 *   cat_brand      ← CAT_BRAND
 *   cat_pack       ← CAT_SIZE         (POS ไม่มี Cat_Pack)
 *   product_name   ← PRODUCT_NAME
 *   product_code   ← BARCODE          (POS ไม่มี Product_Code)
 *   sales_cs       ← SALES_CSxVALUE
 *   free_cs        ← FREE_CS
 *   exvat          ← EXVAT
 *   total_baht     ← TOTAL
 *   wh             ← TIME_SLOTS       (T1-T4 — ใช้แทน W1-W4 ในกราฟ)
 *   channel        ← PROVINCE         (ใช้เป็น filter)
 *   stores         ← COUNT(DISTINCT MEMBER)
 *
 * ── เปลี่ยน mapping ได้ง่าย ──
 *   - อยากให้ "wh" เป็น LEVEL/CAMPAIGN แทน TIME_SLOTS → แก้ที่ getTrend/getStores
 *   - อยากให้ "channel" เป็น LEVEL/CAMPAIGN/DISTRICT แทน PROVINCE → แก้ตามจุดที่ comment ไว้
 *   - อยากนับ "บิล" แทน "สมาชิก" → เปลี่ยน MEMBER เป็น BILL_NO ใน getStores
 *
 * ── SETUP (ทำครั้งเดียว) ──
 *   1. script.google.com → New project → ชื่อ "pos-proxy"
 *   2. วาง code นี้ → Save
 *   3. ⚙ Settings → ผูก GCP Project = project-test-471907 (Project Number)
 *   4. Services (+) → BigQuery API
 *   5. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone → copy URL /exec
 *
 * Endpoints: ?action=ping | vendors | trend | sales | stores  (&vendor=<v>&months=6)
 */

var PROJECT_ID = 'project-test-471907';
var DATASET    = 'Testimport';
var VIEW       = 'BQ_POS';

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'ping';
    var out;
    if (action === 'ping') {
      out = { ok: true, msg: 'pong', proxy: 'POS v1.0', view: VIEW, time: new Date().toISOString() };
    } else if (action === 'vendors') {
      out = { ok: true, data: getVendors_(parseInt(e.parameter.months) || 6) };
    } else if (action === 'trend') {
      var v1 = e.parameter.vendor || '';
      if (!v1) return json_({ ok: false, error: 'missing vendor param' });
      out = { ok: true, data: getTrendForVendor_(v1, parseInt(e.parameter.months) || 6) };
    } else if (action === 'sales') {
      var v2 = e.parameter.vendor || '';
      if (!v2) return json_({ ok: false, error: 'missing vendor param' });
      out = { ok: true, data: getSalesForVendor_(v2, parseInt(e.parameter.months) || 6) };
    } else if (action === 'stores') {
      var v3 = e.parameter.vendor || '';
      if (!v3) return json_({ ok: false, error: 'missing vendor param' });
      out = { ok: true, data: getStoresForVendor_(v3, parseInt(e.parameter.months) || 6) };
    } else {
      out = { ok: false, error: 'unknown action: ' + action };
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function lastNMonthLabels_(months) {
  var now  = new Date();
  var year = now.getFullYear();
  var mon  = now.getMonth() + 1;
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

// WHERE clause ตัด Non-Product + แถว header ที่หลุดมา
var VALID_ = "CAT_VENDOR IS NOT NULL AND CAT_VENDOR != '' AND CAT_VENDOR != 'Non-Product'";

function getVendors_(months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var query =
    'SELECT CAT_VENDOR AS vendor, ' +
    '       SUM(SALES_CSxVALUE) AS sales_cs, ' +
    '       SUM(EXVAT) AS exvat ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    'WHERE ' + VALID_ + ' AND MONTH IN (' + inList + ') ' +
    'GROUP BY CAT_VENDOR ORDER BY exvat DESC';
  return runQuery_(query, ['vendor', 'sales_cs', 'exvat']);
}

function getTrendForVendor_(vendor, months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var v = String(vendor).replace(/'/g, "''");
  // wh ← TIME_SLOTS, channel ← PROVINCE  (แก้สองคำนี้ถ้าอยากใช้มิติอื่น)
  var query =
    'SELECT MONTH AS month_year, TIME_SLOTS AS wh, PROVINCE AS channel, ' +
    '       SUM(EXVAT) AS exvat, ' +
    '       SUM(SALES_CSxVALUE) AS sales_cs ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE CAT_VENDOR = '" + v + "' AND MONTH IN (" + inList + ') ' +
    'GROUP BY month_year, wh, channel ORDER BY month_year, wh';
  return runQuery_(query, ['month_year', 'wh', 'channel', 'exvat', 'sales_cs']);
}

function getSalesForVendor_(vendor, months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var v = String(vendor).replace(/'/g, "''");
  // cat_pack ← CAT_SIZE, product_code ← BARCODE, channel ← PROVINCE, total_baht ← TOTAL
  var query =
    'SELECT MONTH AS month_year, CAT_BRAND AS cat_brand, CAT_SIZE AS cat_pack, ' +
    '       PRODUCT_NAME AS product_name, BARCODE AS product_code, PROVINCE AS channel, ' +
    '       SUM(SALES_CSxVALUE) AS sales_cs, ' +
    '       SUM(FREE_CS) AS free_cs, ' +
    '       SUM(EXVAT) AS exvat, SUM(TOTAL) AS total_baht ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE CAT_VENDOR = '" + v + "' AND MONTH IN (" + inList + ') ' +
    'GROUP BY month_year, cat_brand, cat_pack, product_name, product_code, channel ' +
    'ORDER BY month_year, cat_brand, cat_pack, product_name';
  return runQuery_(query, ['month_year', 'cat_brand', 'cat_pack', 'product_name', 'product_code', 'channel', 'sales_cs', 'free_cs', 'exvat', 'total_baht']);
}

/** unique MEMBER (สมาชิก) per level × channel(PROVINCE). เปลี่ยน MEMBER→BILL_NO ถ้าอยากนับจำนวนบิล */
function getStoresForVendor_(vendor, months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var v = String(vendor).replace(/'/g, "''");
  var query =
    'WITH base AS ( ' +
    '  SELECT MONTH AS month_year, CAT_BRAND, CAT_SIZE, PRODUCT_NAME, PROVINCE AS channel, ' +
    '         CAST(MEMBER AS STRING) AS unit ' +
    '  FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "  WHERE CAT_VENDOR = '" + v + "' AND MONTH IN (" + inList + ') ' +
    "    AND MEMBER IS NOT NULL AND CAST(MEMBER AS STRING) != '' " +
    ') ' +
    "SELECT 'vendor' AS level, month_year, '' AS cat_brand, '' AS cat_pack, '' AS product_name, '' AS channel, " +
    '       COUNT(DISTINCT unit) AS stores FROM base GROUP BY month_year ' +
    'UNION ALL ' +
    "SELECT 'vendor', month_year, '', '', '', channel, COUNT(DISTINCT unit) FROM base GROUP BY month_year, channel " +
    'UNION ALL ' +
    "SELECT 'brand', month_year, CAT_BRAND, '', '', '', COUNT(DISTINCT unit) FROM base GROUP BY month_year, CAT_BRAND " +
    'UNION ALL ' +
    "SELECT 'brand', month_year, CAT_BRAND, '', '', channel, COUNT(DISTINCT unit) FROM base GROUP BY month_year, CAT_BRAND, channel " +
    'UNION ALL ' +
    "SELECT 'pack', month_year, CAT_BRAND, CAT_SIZE, '', '', COUNT(DISTINCT unit) FROM base GROUP BY month_year, CAT_BRAND, CAT_SIZE " +
    'UNION ALL ' +
    "SELECT 'pack', month_year, CAT_BRAND, CAT_SIZE, '', channel, COUNT(DISTINCT unit) FROM base GROUP BY month_year, CAT_BRAND, CAT_SIZE, channel " +
    'UNION ALL ' +
    "SELECT 'product', month_year, CAT_BRAND, CAT_SIZE, PRODUCT_NAME, '', COUNT(DISTINCT unit) FROM base GROUP BY month_year, CAT_BRAND, CAT_SIZE, PRODUCT_NAME " +
    'UNION ALL ' +
    "SELECT 'product', month_year, CAT_BRAND, CAT_SIZE, PRODUCT_NAME, channel, COUNT(DISTINCT unit) FROM base GROUP BY month_year, CAT_BRAND, CAT_SIZE, PRODUCT_NAME, channel";
  return runQuery_(query, ['level', 'month_year', 'cat_brand', 'cat_pack', 'product_name', 'channel', 'stores']);
}

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
  var rows = qr.rows || [];
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var f = rows[i].f;
    var obj = {};
    for (var k = 0; k < keys.length; k++) {
      obj[keys[k]] = (f[k] && f[k].v != null) ? f[k].v : '';
    }
    out.push(obj);
  }
  while (qr.pageToken) {
    qr = BigQuery.Jobs.getQueryResults(PROJECT_ID, jobId, { pageToken: qr.pageToken });
    var rows2 = qr.rows || [];
    for (var j = 0; j < rows2.length; j++) {
      var f2 = rows2[j].f;
      var obj2 = {};
      for (var k2 = 0; k2 < keys.length; k2++) {
        obj2[keys[k2]] = (f2[k2] && f2[k2].v != null) ? f2[k2].v : '';
      }
      out.push(obj2);
    }
  }
  return out;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
