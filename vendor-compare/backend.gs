/**
 * Rattana Vendor Compare — Dedicated BigQuery Proxy
 * v3.1 — 2026-09-10  (เพิ่ม action=customers — ยอดซื้อ ราย ร้าน x เดือน ใช้หา 'ร้านที่หายไป')
 * v2.0 — 2026-06-18  (แยกออกจาก shared proxy v1.8 — เฉพาะ vendor-compare)
 *
 * ทำไมแยก: เดิม proxy ตัวเดียวใช้ร่วม 3 แอป (vendor-compare + Pre-order Picker + sales-app)
 *          → เซฟทับกัน. ตัวนี้เป็น proxy "เฉพาะ vendor-compare" deploy แยก project ของตัวเอง
 *          จะแก้/เซฟยังไงก็ไม่กระทบแอปอื่น
 *
 * ── SETUP (ทำครั้งเดียว) ──
 *   1. https://script.google.com → New project → ตั้งชื่อ "vendor-compare-proxy"
 *   2. วาง code นี้ทั้งหมด → 💾 Save
 *   3. ⚙ Project Settings → Google Cloud Platform (GCP) Project → Change project
 *      → ใส่ Project Number ของ project-test-471907
 *   4. Services (+) ซ้ายมือ → เพิ่ม "BigQuery API"
 *   5. Deploy → New deployment → Type: Web app
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      → copy "Web App URL" ที่ได้ (ลงท้าย /exec)
 *   6. ส่ง URL ใหม่นั้นมา → จะเอาไปใส่ใน HTML (DEFAULT_CFG.bqProxyUrl)
 *
 * Endpoints: ?action=ping | vendors | trend | sales | stores | customers
 *            (&vendor=<v>  รับหลายตัวคั่น |  ·  &months=6  หรือ  &mlist=2026/03,2026/04,...)
 */

var PROJECT_ID = 'project-test-471907';
var DATASET    = 'Testimport';
var VIEW       = 'BQ_2024_2025';

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'ping';
    var out;
    if (action === 'ping') {
      out = { ok: true, msg: 'pong', proxy: 'vendor-compare v3.1', time: new Date().toISOString() };
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
    } else if (action === 'customers') {
      var v4 = e.parameter.vendor || '';
      if (!v4) return json_({ ok: false, error: 'missing vendor param' });
      out = { ok: true, data: getCustomers_(v4, e.parameter.mlist, e.parameter.months) };
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
    '       SUM(Sales_CSxValue) AS sales_cs, ' +
    '       SUM(Sales_CS) AS sales_cs_raw ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE Cat_Vendor = '" + v + "' " +
    '  AND Month_Year IN (' + inList + ') ' +
    'GROUP BY Month_Year, WH, Channel ORDER BY Month_Year, WH';
  return runQuery_(query, ['month_year', 'wh', 'channel', 'exvat', 'sales_cs', 'sales_cs_raw']);
}

function getSalesForVendor_(vendor, months) {
  var labels = lastNMonthLabels_(months);
  var inList = labels.map(function(l) { return "'" + l + "'"; }).join(',');
  var v = String(vendor).replace(/'/g, "''");
  var query =
    'SELECT Month_Year, Cat_Brand, Cat_Pack, Product_Name, Product_Code, Channel, ' +
    '       SUM(Sales_CSxValue) AS sales_cs, ' +
    '       SUM(Sales_CS) AS sales_cs_raw, ' +
    '       SUM(Free_CS) AS free_cs, ' +
    '       SUM(Exvat) AS exvat, SUM(TotalBaht) AS total_baht ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    "WHERE Cat_Vendor = '" + v + "' " +
    '  AND Month_Year IN (' + inList + ') ' +
    'GROUP BY Month_Year, Cat_Brand, Cat_Pack, Product_Name, Product_Code, Channel ' +
    'ORDER BY Month_Year, Cat_Brand, Cat_Pack, Product_Name';
  return runQuery_(query, ['month_year', 'cat_brand', 'cat_pack', 'product_name', 'product_code', 'channel', 'sales_cs', 'sales_cs_raw', 'free_cs', 'exvat', 'total_baht']);
}

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
    "SELECT 'vendor' AS level, Month_Year, '' AS Cat_Brand, '' AS Cat_Pack, '' AS Product_Name, '' AS Channel, " +
    '       COUNT(DISTINCT Customer_Code) AS stores ' +
    'FROM base GROUP BY Month_Year ' +
    'UNION ALL ' +
    "SELECT 'vendor', Month_Year, '', '', '', Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Channel ' +
    'UNION ALL ' +
    "SELECT 'brand', Month_Year, Cat_Brand, '', '', '', COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand ' +
    'UNION ALL ' +
    "SELECT 'brand', Month_Year, Cat_Brand, '', '', Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Channel ' +
    'UNION ALL ' +
    "SELECT 'pack', Month_Year, Cat_Brand, Cat_Pack, '', '', COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack ' +
    'UNION ALL ' +
    "SELECT 'pack', Month_Year, Cat_Brand, Cat_Pack, '', Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack, Channel ' +
    'UNION ALL ' +
    "SELECT 'product', Month_Year, Cat_Brand, Cat_Pack, Product_Name, '', COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack, Product_Name ' +
    'UNION ALL ' +
    "SELECT 'product', Month_Year, Cat_Brand, Cat_Pack, Product_Name, Channel, COUNT(DISTINCT Customer_Code) " +
    'FROM base GROUP BY Month_Year, Cat_Brand, Cat_Pack, Product_Name, Channel';
  return runQuery_(query, ['level', 'month_year', 'cat_brand', 'cat_pack', 'product_name', 'channel', 'stores']);
}

/* ═══ v3.1 — ยอดซื้อ ราย ร้าน x เดือน ═══
   ใช้ตอบคำถาม "ร้านไหนเคยซื้อประจำแล้วหายไป" ในการ์ดสรุปผู้บริหารของแอป
   - vendor: รับหลายตัวคั่น | (ให้ตรงกับที่หน้าเว็บส่งมาตอนรวม Cat_Vendor หลายชื่อ)
     ตั้งใจกรองด้วย Cat_Vendor อย่างเดียวเหมือน action=stores ตัวเลข "หายกี่ร้าน" บนการ์ด
     จะได้มาจากฐานเดียวกันกับรายชื่อ ไม่งั้นเลขไม่ตรงกัน
   - เดือน: ส่ง mlist=2026/03,2026/04,... มาได้ตรง ๆ (หน้าเว็บส่งแบบนี้) ถ้าไม่ส่งใช้ months=N
   - ขนาดผลลัพธ์เล็ก (ร้าน ~400 x 6 เดือน ≈ 2,400 แถว) แอป cache ไว้เดือนละครั้งอยู่แล้ว */
function getCustomers_(vendor, mlist, months) {
  var vs = String(vendor || '').split('|')
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return x; });
  if (!vs.length) throw new Error('missing vendor param');

  var labels = monthLabels_(mlist, months);
  var nameCol = hasCol_('Customer_Name') ? 'ANY_VALUE(Customer_Name)' : "''";
  var query =
    'SELECT Month_Year, CAST(Customer_Code AS STRING) AS customer_code, ' +
    '       ' + nameCol + ' AS customer_name, ' +
    '       SUM(Exvat) AS exvat, SUM(Sales_CSxValue) AS sales_cs ' +
    'FROM `' + PROJECT_ID + '.' + DATASET + '.' + VIEW + '` ' +
    'WHERE Cat_Vendor IN (' + vs.map(sqlStr_).join(',') + ') ' +
    '  AND Month_Year IN (' + labels.map(sqlStr_).join(',') + ') ' +
    "  AND Customer_Code IS NOT NULL AND CAST(Customer_Code AS STRING) != '' " +
    'GROUP BY Month_Year, customer_code ' +
    'ORDER BY Month_Year, exvat DESC';
  return runQuery_(query, ['month_year', 'customer_code', 'customer_name', 'exvat', 'sales_cs']);
}

function sqlStr_(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

function monthLabels_(mlist, months) {
  if (mlist) {
    var a = String(mlist).split(',')
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return /^[0-9]{4}\/[0-9]{2}$/.test(x); });
    if (a.length) return a;
  }
  return lastNMonthLabels_(parseInt(months) || 6);
}

/* view มีคอลัมน์นี้ไหม (cache 6 ชม.) — กัน query พังถ้า BQ ไม่มี Customer_Name
   ถ้าไม่มี ชื่อร้านจะว่าง แล้วแอปไปหยิบชื่อจากชีท BP แทนเอง */
function hasCol_(col) {
  try {
    var c = CacheService.getScriptCache();
    var k = 'hasCol_' + VIEW + '_' + col;
    var v = c.get(k);
    if (v !== null) return v === '1';
    var q = 'SELECT column_name AS c ' +
            'FROM `' + PROJECT_ID + '.' + DATASET + '.INFORMATION_SCHEMA.COLUMNS` ' +
            "WHERE table_name = '" + VIEW + "'";
    var cols = runQuery_(q, ['c']).map(function (r) { return String(r.c).toLowerCase(); });
    var has = cols.indexOf(String(col).toLowerCase()) >= 0;
    c.put(k, has ? '1' : '0', 21600);
    return has;
  } catch (e) {
    return false;
  }
}

/* ทดสอบใน editor ได้เลย (กด Run แล้วดู Execution log) */
function testCustomers_() {
  var r = getCustomers_('บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)', '', 6);
  Logger.log('ได้ ' + r.length + ' แถว');
  Logger.log(JSON.stringify(r.slice(0, 3)));
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