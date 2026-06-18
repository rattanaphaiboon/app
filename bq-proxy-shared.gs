/**
 * Rattana Vendor Sales Compare — BigQuery Proxy
 * v1.8 — 2026-06-18
 *   - custHistory / custHistoryBatch — ประวัติซื้อราย ร้าน×สินค้า (CS) ย้อนหลัง N เดือน (ไม่รวมเดือนปัจจุบัน) → ฟีเจอร์ "แบ่งออเดอร์" Pre-order Picker
 * v1.7 — 2026-06-18
 *   - ping (?action=ping) คืน version → เช็ค deploy ตรงกับ GitHub ได้ (drift detection กันชนกับเพื่อน)
 * v1.6 — 2026-05-24
 *   - Sales_CS → Sales_CSxValue across all aggregates
 *   - stores: added level='vendor' (accurate grand-total unique customer count)
 *
 * ── DEPLOY INFO (ของจริงที่รันอยู่) ──
 * Script Editor : https://script.google.com/home/projects/1NC2e_Yd-CfiuvZ-Yf7tPm61WEg6IFhKeEQXRD6wxUwtaebq8dA2AdWRF/edit
 * Script ID     : 1NC2e_Yd-CfiuvZ-Yf7tPm61WEg6IFhKeEQXRD6wxUwtaebq8dA2AdWRF
 * Web App URL   : https://script.google.com/macros/s/AKfycbyMrMdvKv_WFPJOn5wxg6-CEd59uMnJlNJFltFfNuot0q5Wey8pciJk94JyhK__8UY2/exec
 *
 * ── วิธีอัปเดต (สำคัญ) ──
 * แก้ไฟล์นี้ใน GitHub เป็นแค่ "ต้นฉบับอ้างอิง" — ของจริงต้อง:
 *   1. copy code ทั้งหมดไปวางใน Apps Script (Script Editor ด้านบน)
 *   2. 💾 Save
 *   3. การทำให้ใช้งานได้ (Deploy) → จัดการการทำให้ใช้งานได้ → ✏ → เวอร์ชันใหม่ → Deploy
 *   4. Web App URL เดิมคงอยู่ ไม่ต้องเปลี่ยนใน HTML
 *
 * ── SETUP ครั้งแรก (ถ้าสร้าง project ใหม่) ──
 *   1. Apps Script → ⚙ Project Settings → ผูก GCP Project = project-test-471907 (Project Number)
 *   2. Services (+) → เพิ่ม BigQuery API
 *   3. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone
 *
 * Endpoints (GET):
 *   ?action=ping                              → health check (+ version → เทียบ deploy กับ GitHub)
 *   ?action=vendors&months=6                  → distinct Cat_Vendor (last N months)
 *   ?action=trend&vendor=<v>&months=6         → EXVat/Sales per WH per month + Channel
 *   ?action=sales&vendor=<v>&months=6         → drill-down (brand/pack/product) + Channel
 *   ?action=stores&vendor=<v>&months=6        → unique Customer_Code per level + Channel
 *   ?action=custHistory&cc=<code>&months=3    → ประวัติซื้อ 1 ร้าน ราย product (CS) — แบ่งออเดอร์
 *   ?action=custHistoryBatch&ccs=<c1,c2>&months=3 → ประวัติซื้อหลายร้าน ราย product (CS) — แบ่งออเดอร์
 */

var VERSION    = 'v1.8';   // bump ทุกครั้งที่แก้ — ping คืนค่านี้ เทียบกับ GitHub ได้ว่า live deploy ตรงไหม
var PROJECT_ID = 'project-test-471907';
var DATASET    = 'Testimport';
var VIEW       = 'BQ_2024_2025';

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'ping';
    var out;
    if (action === 'ping') {
      out = { ok: true, msg: 'pong', version: VERSION, time: new Date().toISOString() };
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
    } else if (action === 'custHistory') {
      var cc = e.parameter.cc || '';
      if (!cc) return json_({ ok: false, error: 'missing cc param' });
      out = { ok: true, data: getCustHistory_(cc, parseInt(e.parameter.months) || 6) };
    } else if (action === 'custHistoryBatch') {
      var ccs = e.parameter.ccs || '';
      if (!ccs) return json_({ ok: false, error: 'missing ccs param' });
      out = { ok: true, data: getCustHistoryBatch_(ccs, parseInt(e.parameter.months) || 6) };
    } else {
      out = { ok: false, error: 'unknown action: ' + action };
    }
    return json_(out);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** YYYY/MM labels for the last N months (excluding current month). */
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

/* ===== ประวัติซื้อรายร้าน (ฟีเจอร์ "แบ่งออเดอร์" Pre-order Picker) ===== */
// 1 ร้าน → ราย product (CS) ย้อนหลัง N เดือน (ไม่รวมเดือนปัจจุบัน)
function getCustHistory_(custCode, months) {
  var inList = lastNMonthLabels_(months).map(function (l) { return "'" + l + "'"; }).join(',');
  var c = String(custCode).replace(/'/g, "''");
  var query =
    'SELECT Product_Code, Product_Name, Cat_Brand, Cat_Pack, ' +
    '       SUM(Sales_CSxValue) AS sales_cs, SUM(Free_CS) AS free_cs, ' +
    '       SUM(Exvat) AS exvat, SUM(TotalBaht) AS total_baht, ' +
    '       MAX(Month_Year) AS last_month, COUNT(DISTINCT Month_Year) AS months_bought ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE CAST(Customer_Code AS STRING) = '" + c + "' " +
    '  AND Month_Year IN (' + inList + ') ' +
    'GROUP BY Product_Code, Product_Name, Cat_Brand, Cat_Pack ' +
    'ORDER BY sales_cs DESC';
  return runQuery_(query, ['product_code', 'product_name', 'cat_brand', 'cat_pack',
                           'sales_cs', 'free_cs', 'exvat', 'total_baht', 'last_month', 'months_bought']);
}
// หลายร้านพร้อมกัน (prefetch) — ccs = "7400300457,7400300458,..." → ราย ร้าน×product (CS)
function getCustHistoryBatch_(ccCsv, months) {
  var inList = lastNMonthLabels_(months).map(function (l) { return "'" + l + "'"; }).join(',');
  var ccs = String(ccCsv).split(',').map(function (x) { return "'" + x.trim().replace(/'/g, "''") + "'"; })
              .filter(function (x) { return x !== "''"; }).join(',');
  if (!ccs) return [];
  var query =
    'SELECT CAST(Customer_Code AS STRING) AS customer_code, ' +
    '       Product_Code, Product_Name, Cat_Brand, Cat_Pack, ' +
    '       SUM(Sales_CSxValue) AS sales_cs, SUM(Exvat) AS exvat, ' +
    '       MAX(Month_Year) AS last_month, COUNT(DISTINCT Month_Year) AS months_bought ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    'WHERE CAST(Customer_Code AS STRING) IN (' + ccs + ') ' +
    '  AND Month_Year IN (' + inList + ') ' +
    'GROUP BY customer_code, Product_Code, Product_Name, Cat_Brand, Cat_Pack ' +
    'ORDER BY customer_code, sales_cs DESC';
  return runQuery_(query, ['customer_code', 'product_code', 'product_name', 'cat_brand', 'cat_pack',
                           'sales_cs', 'exvat', 'last_month', 'months_bought']);
}

function getVendors_(months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var query =
    'SELECT Cat_Vendor, ' +
    '       SUM(Sales_CSxValue) AS sales_cs, ' +
    '       SUM(Exvat) AS exvat ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE Cat_Vendor IS NOT NULL AND Cat_Vendor != '' " +
    '  AND Month_Year IN (' + inList + ') ' +
    'GROUP BY Cat_Vendor ORDER BY exvat DESC';
  return runQuery_(query, ['vendor', 'sales_cs', 'exvat']);
}

function getTrendForVendor_(vendor, months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var v = String(vendor).replace(/'/g, "''");
  var query =
    'SELECT Month_Year, WH, Channel, ' +
    '       SUM(Exvat) AS exvat, ' +
    '       SUM(Sales_CSxValue) AS sales_cs ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE Cat_Vendor = '" + v + "' " +
    '  AND Month_Year IN (' + inList + ') ' +
    'GROUP BY Month_Year, WH, Channel ORDER BY Month_Year, WH';
  return runQuery_(query, ['month_year', 'wh', 'channel', 'exvat', 'sales_cs']);
}

function getSalesForVendor_(vendor, months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var v = String(vendor).replace(/'/g, "''");
  var query =
    'SELECT Month_Year, Cat_Brand, Cat_Pack, Product_Name, Product_Code, Channel, ' +
    '       SUM(Sales_CSxValue) AS sales_cs, ' +
    '       SUM(Free_CS) AS free_cs, ' +
    '       SUM(Exvat) AS exvat, SUM(TotalBaht) AS total_baht ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE Cat_Vendor = '" + v + "' " +
    '  AND Month_Year IN (' + inList + ') ' +
    'GROUP BY Month_Year, Cat_Brand, Cat_Pack, Product_Name, Product_Code, Channel ' +
    'ORDER BY Month_Year, Cat_Brand, Cat_Pack, Product_Name';
  return runQuery_(query, ['month_year', 'cat_brand', 'cat_pack', 'product_name', 'product_code', 'channel', 'sales_cs', 'free_cs', 'exvat', 'total_baht']);
}

/** Unique customer count per level (vendor/brand/pack/product) × channel-mode (total + per-channel). */
function getStoresForVendor_(vendor, months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var v = String(vendor).replace(/'/g, "''");
  var query =
    'WITH base AS ( ' +
    '  SELECT Month_Year, Cat_Brand, Cat_Pack, Product_Name, Channel, ' +
    '         CAST(Customer_Code AS STRING) AS Customer_Code ' +
    '  FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "  WHERE Cat_Vendor = '" + v + "' " +
    '    AND Month_Year IN (' + inList + ') ' +
    ') ' +
    // ── Vendor-level (all brands) ──
    "SELECT 'vendor' AS level, Month_Year, '' AS Cat_Brand, '' AS Cat_Pack, '' AS Product_Name, '' AS Channel, " +
    '       COUNT(DISTINCT Customer_Code) AS stores ' +
    'FROM base GROUP BY Month_Year ' +
    'UNION ALL ' +
    "SELECT 'vendor', Month_Year, '', '', '', Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Channel ' +
    // ── Brand level ──
    'UNION ALL ' +
    "SELECT 'brand', Month_Year, Cat_Brand, '', '', '', COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand ' +
    'UNION ALL ' +
    "SELECT 'brand', Month_Year, Cat_Brand, '', '', Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Channel ' +
    // ── Pack level ──
    'UNION ALL ' +
    "SELECT 'pack', Month_Year, Cat_Brand, Cat_Pack, '', '', COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack ' +
    'UNION ALL ' +
    "SELECT 'pack', Month_Year, Cat_Brand, Cat_Pack, '', Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack, Channel ' +
    // ── Product level ──
    'UNION ALL ' +
    "SELECT 'product', Month_Year, Cat_Brand, Cat_Pack, Product_Name, '', COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack, Product_Name ' +
    'UNION ALL ' +
    "SELECT 'product', Month_Year, Cat_Brand, Cat_Pack, Product_Name, Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack, Product_Name, Channel';
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
