// ═══════════════════════════════════════════════════════
//  Rattana Stock Count — GAS Backend  v1.6  (Drafts retired + LockService)
//  Sheet: 18Yn-gru-0BG1FPgsqxANFvuXULgFurK2t1TPIz1vOG4
//  Used by: rattana-stock-v2.html
//
//  v1.3 — All written timestamps are Thai-formatted text:
//         "DD/MM/YYYY HH.mm.ss" with พ.ศ. year, Asia/Bangkok TZ.
//         getDraft / getAllDrafts / getHistory still return epoch ms
//         to the app (so app code is unchanged).
// ═══════════════════════════════════════════════════════

const SS_ID = '18Yn-gru-0BG1FPgsqxANFvuXULgFurK2t1TPIz1vOG4';   // default file (W1, W2, W3, …)
const TZ    = 'Asia/Bangkok';

// ═════════════════════════════════════════════════════════════
//  PER-WAREHOUSE SPREADSHEET ROUTING
//  C4 and W4 each live in their own Google Sheet file.
//  1) Run setupC4W4Sheets() once from the Apps Script editor —
//     check the Logger output for the new spreadsheet IDs.
//  2) Paste those IDs below.
//  3) Anything not listed here falls back to the default SS_ID.
// ═════════════════════════════════════════════════════════════
const WAREHOUSE_SS_ID = {
  'C4':  '1rWZ7_vWBTx7hcXucAtWNX3ruA5lVro90P3HkQ6amFMg',
  'W4':  '18RojK-hmI3-sqh6bRh3YVdt4EZ8EGYHgMGRLxrqkqxw',
  'EW4': '18RojK-hmI3-sqh6bRh3YVdt4EZ8EGYHgMGRLxrqkqxw'  // คลังของเสีย — ใช้ไฟล์เดียวกับ W4
};

function ssFor(wh) {
  const id = WAREHOUSE_SS_ID[String(wh || '').toUpperCase()] || SS_ID;
  return SpreadsheetApp.openById(id);
}

// Run this ONCE from the Apps Script editor. It creates two new Google
// Sheets (one for C4, one for W4) in your Drive and prints the IDs +
// URLs to the Logger. Copy the IDs into the WAREHOUSE_SS_ID map above.
function setupC4W4Sheets() {
  const c4 = SpreadsheetApp.create('Rattana Stock — C4');
  const w4 = SpreadsheetApp.create('Rattana Stock — W4');
  Logger.log('────── C4 ──────');
  Logger.log('ID:  ' + c4.getId());
  Logger.log('URL: ' + c4.getUrl());
  Logger.log('────── W4 ──────');
  Logger.log('ID:  ' + w4.getId());
  Logger.log('URL: ' + w4.getUrl());
  Logger.log('');
  Logger.log('→ paste the IDs above into WAREHOUSE_SS_ID and redeploy.');
}

// ── TIME HELPERS ──────────────────────────────────────
function thaiDateTime(input) {
  let d = input;
  if (!d) d = new Date();
  else if (!(d instanceof Date)) d = new Date(d);
  if (!d || isNaN(d)) return '';
  const s = Utilities.formatDate(d, TZ, 'dd/MM/yyyy HH:mm');
  const parts = s.split(' ');
  const dmy = parts[0].split('/');
  const beYear = parseInt(dmy[2], 10) + 543;
  return dmy[0] + '/' + dmy[1] + '/' + beYear + ' ' + parts[1];
}

// Accept Date object, ISO string, epoch ms, or Thai-formatted text.
// Returns Date or null.
function parseAnyTs(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  const s = String(v).trim();
  // Thai format: DD/MM/YYYY HH.MM.SS (year is BE)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?$/);
  if (m) {
    const day   = m[1].length === 1 ? '0' + m[1] : m[1];
    const month = m[2].length === 1 ? '0' + m[2] : m[2];
    const year  = parseInt(m[3], 10) - 543;
    const hh    = m[4].length === 1 ? '0' + m[4] : m[4];
    const mm    = m[5];
    const ss    = m[6] || '00';
    // Build ISO with +07:00 — works in every modern engine
    const d = new Date(year + '-' + month + '-' + day + 'T' + hh + ':' + mm + ':' + ss + '+07:00');
    return isNaN(d) ? null : d;
  }
  // ISO or other parseable form
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function tsMs(v) { const d = parseAnyTs(v); return d ? d.getTime() : 0; }

// ── ROUTING ───────────────────────────────────────────
function doGet(e) {
  const p = e.parameter || {};
  const action = p.action || '';
  try {
    if (action === 'liveLots')   return json(getLiveLots(p));
    if (action === 'getHistory' || action === 'history') return json(getHistory(p));
    // Retired Drafts endpoints — answer harmlessly for any cached old client.
    if (action === 'draft')      return json({ ok: true, draft: null });
    if (action === 'allDrafts')  return json({ ok: true, drafts: [] });
    return json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

// All write operations go through a script-wide lock so two users editing
// at the same time can't interleave a read-modify-write on the sheet
// (which would otherwise duplicate or lose rows). Reads (doGet) are NOT
// locked — they can run concurrently and only ever read.
function withLock(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);   // wait up to 20s for our turn
  } catch (e) {
    return { ok: false, error: 'busy — ระบบกำลังถูกใช้งานหนัก ลองใหม่อีกครั้ง' };
  }
  try {
    return fn();
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (_) {}
  const action = body.action || '';
  try {
    if (action === 'upsertLot')  return json(withLock(() => upsertLot(body)));
    if (action === 'deleteLot')  return json(withLock(() => deleteLot(body)));
    if (action === 'clearLive')  return json(withLock(() => clearLiveForUser(body)));
    if (action === 'saveCount' || (!action && Array.isArray(body.rows))) {
      return json(withLock(() => saveCount(body)));
    }
    // Retired Drafts endpoints — accept and ignore so old clients don't error
    // or recreate the Drafts sheet.
    if (action === 'saveDraft' || action === 'clearDraft') return json({ ok: true });
    return json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// getOrCreate(name, headers)              → default spreadsheet (back-compat)
// getOrCreate(ss,   name, headers)         → a specific spreadsheet
function getOrCreate(a, b, c) {
  let ss, name, headers;
  if (a && typeof a === 'object' && a.getSheetByName) {
    ss = a; name = b; headers = c;
  } else {
    ss = SpreadsheetApp.openById(SS_ID); name = a; headers = b;
  }
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ── (Drafts sheet retired — Live_<wh> is the only backend now) ──

// ── SAVE COUNT (final submit — writes flat rows) ──────
function saveCount(b) {
  const sh = getOrCreate(ssFor(b.warehouse), 'StockCount', [
    'savedAt','warehouse','location','empId','name','email',
    'sessionStart','รหัสสินค้า','ชื่อสินค้า',
    'CS','BP','PA','EA','นับได้(ชิ้น)',
    'สต็อกระบบ(CS.EA)','สต็อกระบบ(ชิ้น)',
    'ต่าง(ชิ้น)','ต่าง(CS.EA)','สถานะ','วันหมดอายุ'
  ]);
  const now = thaiDateTime(new Date());
  const startThai = thaiDateTime(b.sessionStart || b.startedAt || new Date());
  const rows = Array.isArray(b.rows) ? b.rows : [];
  if (!rows.length) return { ok: false, error: 'no rows' };

  const out = rows.map(function(r){
    return [
      now,
      b.warehouse || '',
      r.location || b.location || '',
      b.empId || '',
      b.counterName || b.name || '',
      b.email || '',
      startThai,
      r.key || '',
      r.name || '',
      r.cs || 0,
      r.bp || 0,
      r.pa || 0,
      r.ea || 0,
      r.countedPieces || 0,
      r.systemRaw || '',
      r.systemPieces || 0,
      r.diffPieces || 0,
      r.diffCSEA || '',
      r.status || '',
      r.expiryDate ? thaiDateTime(r.expiryDate + 'T00:00:00+07:00').split(' ')[0] : ''
    ];
  });
  sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);

  // Remove this user's live lot rows after a final save.
  try { clearLiveForUser({ userKey: b.userKey, warehouse: b.warehouse }); } catch (_) {}

  return { ok: true, written: out.length };
}

// ═══════════════════════════════════════════════════════
//  LIVE LOT SHEET  (1 lot = 1 row, fully addressable by lotId)
//  Columns:
//   0  lotId         (uuid)
//   1  เวลาบันทึก    (Thai-formatted)
//   2  warehouse
//   3  location
//   4  empId
//   5  ผู้นับ
//   6  userKey        (machine — for filtering own rows)
//   7  รหัสสินค้า
//   8  ชื่อสินค้า
//   9  factors_json   (so the app can compute pieces correctly)
//  10  CS
//  11  BP
//  12  PA
//  13  EA
//  14  วันหมดอายุ    (DD/MM/YYYY BE)
//  15  expiryISO      (YYYY-MM-DD — for parsing)
//  16  sessionStart   (Thai-formatted)
// ═══════════════════════════════════════════════════════
const LIVE_HEADERS = [
  'lotId','เวลาบันทึก','warehouse','location','empId','ผู้นับ','userKey',
  'รหัสสินค้า','ชื่อสินค้า','factors_json',
  'CS','BP','PA','EA','วันหมดอายุ','expiryISO','sessionStart',
  'นับได้(ชิ้น)','สต็อกระบบ(CS.EA)','สต็อกระบบ(ชิ้น)','ต่าง(ชิ้น)','ต่าง(CS.EA)'
];

// Per-warehouse sheets: Live_W1, Live_W2, Live_W3, Live_W4, Live_C4.
function liveSheetName(wh) {
  return 'Live_' + String(wh || '').toUpperCase();
}
function liveSheetFor(wh) {
  if (!wh) return null;
  return getOrCreate(ssFor(wh), liveSheetName(wh), LIVE_HEADERS);
}
// Backward-compat: search the legacy "Live" sheet in BOTH the warehouse's
// own spreadsheet and the default one so historical rows still surface.
function legacyLiveSheetsFor(wh) {
  const out = [];
  if (wh) {
    const s1 = ssFor(wh).getSheetByName('Live'); if (s1) out.push(s1);
  }
  const s2 = SpreadsheetApp.openById(SS_ID).getSheetByName('Live');
  if (s2 && (!out.length || out[0].getParent().getId() !== s2.getParent().getId())) out.push(s2);
  return out;
}
function findLiveRow(sh, lotId) {
  if (!sh || !lotId) return -1;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(lotId)) return i + 1; // 1-based row index
  }
  return -1;
}

// Upsert one lot by lotId. Body must include: lotId, warehouse, userKey,
// key (product key), name, counts{EA,PA,BP,CS}, factors{...}, expiryDate,
// location, empId, counterName (optional), sessionStart (optional).
function upsertLot(b) {
  if (!b.lotId) return { ok:false, error:'lotId required' };
  if (!b.warehouse) return { ok:false, error:'warehouse required' };
  const sh = liveSheetFor(b.warehouse);
  const c = b.counts || {EA:0,PA:0,BP:0,CS:0};
  const f = b.factors || {EA:1,PA:1,BP:1,CS:1};
  const expIso = b.expiryDate || '';
  const expThai = expIso ? thaiDateTime(expIso + 'T00:00:00+07:00').split(' ')[0] : '';
  // Compute pieces / diff vs system stock (app sends systemRaw + systemPieces).
  const factorCS = f.CS || 1;
  const countedPieces = ['EA','PA','BP','CS'].reduce((s,u) => s + (c[u]||0) * (f[u]||1), 0);
  const systemRaw    = b.systemRaw != null ? String(b.systemRaw) : '';
  const systemPieces = (b.systemPieces != null) ? Number(b.systemPieces) || 0 : 0;
  const diffPieces   = countedPieces - systemPieces;
  const diffCSEA = (function() {
    if (diffPieces === 0) return '0';
    const sign = diffPieces > 0 ? '+' : '-';
    const a = Math.abs(diffPieces);
    const cs = Math.floor(a / factorCS), ea = a - cs * factorCS;
    return sign + cs + '.' + ea;
  })();
  const rowVals = [
    b.lotId,
    thaiDateTime(new Date()),
    b.warehouse || '',
    b.location || '',
    b.empId || '',
    b.counterName || b.name || '',
    (b.userKey || '').toString().toLowerCase(),
    b.key || '',
    b.productName || b.name || '',
    JSON.stringify(f),
    c.CS || 0,
    c.BP || 0,
    c.PA || 0,
    c.EA || 0,
    expThai,
    expIso,
    b.sessionStart ? thaiDateTime(b.sessionStart) : '',
    countedPieces,
    systemRaw,
    systemPieces,
    diffPieces,
    diffCSEA
  ];
  const row = findLiveRow(sh, b.lotId);
  if (row > 0) {
    sh.getRange(row, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    sh.appendRow(rowVals);
  }
  return { ok: true };
}

function deleteLot(b) {
  if (!b.lotId) return { ok:false, error:'lotId required' };
  // Prefer the warehouse-specific sheet (in the warehouse's spreadsheet).
  // Fall back to scanning every Live* sheet in both that spreadsheet and
  // the default one so orphans get cleaned up wherever they landed.
  const tried = [];
  const seen = {};
  function consider(sh) {
    if (!sh) return;
    const tag = sh.getParent().getId() + '::' + sh.getName();
    if (seen[tag]) return; seen[tag] = 1; tried.push(sh);
  }
  if (b.warehouse) consider(liveSheetFor(b.warehouse));
  [ssFor(b.warehouse), SpreadsheetApp.openById(SS_ID)].forEach(ss => {
    ss.getSheets().forEach(s => {
      const n = s.getName();
      if (n === 'Live' || n.indexOf('Live_') === 0) consider(s);
    });
  });
  for (const sh of tried) {
    const row = findLiveRow(sh, b.lotId);
    if (row > 0) { sh.deleteRow(row); break; }
  }
  return { ok: true };
}

// Delete every live row for a given userKey + warehouse (called after final save).
function clearLiveForUser(b) {
  const uk = String(b.userKey || '').toLowerCase();
  const wh = String(b.warehouse || '');
  if (!wh) return { ok:false, error:'warehouse required' };
  const sheetsToScan = [liveSheetFor(wh)].concat(legacyLiveSheetsFor(wh)).filter(Boolean);
  sheetsToScan.forEach(sh => {
    const data = sh.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const sameWh = String(data[i][2] || '') === wh;
      const sameUser = String(data[i][6] || '').toLowerCase() === uk;
      if (sameUser && (sameWh || sh.getName().indexOf('Live_') === 0)) {
        sh.deleteRow(i + 1);
      }
    }
  });
  return { ok: true };
}

// Return all live lots for a warehouse (everyone — team summary fans out from here)
function getLiveLots(p) {
  const wh = String(p.warehouse || '');
  if (!wh) return { ok: true, lots: [] };
  const out = [];
  const seen = {}; // dedupe by lotId in case a row exists in both the per-wh sheet and a legacy "Live" sheet
  const sheets = [liveSheetFor(wh)].concat(legacyLiveSheetsFor(wh)).filter(Boolean);
  sheets.forEach(sh => {
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return;
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[2] || '') !== wh) continue;       // legacy sheet stores all warehouses
      const id = String(r[0] || '');
      if (id && seen[id]) continue;
      if (id) seen[id] = 1;
      let factors = {EA:1,PA:1,BP:1,CS:1};
      try { factors = JSON.parse(r[9] || '{}'); } catch (_) {}
      out.push({
        lotId:        r[0],
        ts:           tsMs(r[1]),
        warehouse:    r[2],
        location:     r[3] || '',
        empId:        r[4] || '',
        name:         r[5] || '',
        userKey:      r[6] || '',
        key:          r[7] || '',
        productName:  r[8] || '',
        factors:      factors,
        counts: { CS: r[10]||0, BP: r[11]||0, PA: r[12]||0, EA: r[13]||0 },
        expiryDate:   r[15] || ''
      });
    }
  });
  return { ok: true, lots: out };
}

// ── GET HISTORY ───────────────────────────────────────
function getHistory(p) {
  // If a warehouse is given, look in its SS; otherwise default SS.
  const sh = ssFor(p.warehouse).getSheetByName('StockCount');
  if (!sh) return { ok: true, sessions: [] };
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { ok: true, sessions: [] };

  // Group by (savedAt, warehouse, empId)
  const groups = {};
  const order = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    // Header: savedAt(0) | warehouse(1) | location(2) | empId(3) | name(4) | email(5)
    //       | sessionStart(6) | รหัสสินค้า(7) | ชื่อสินค้า(8)
    //       | CS(9) | BP(10) | PA(11) | EA(12) | นับได้(13)
    //       | สต็อกระบบ CS.EA(14) | สต็อกระบบ ชิ้น(15)
    //       | ต่าง ชิ้น(16) | ต่าง CS.EA(17) | สถานะ(18) | วันหมดอายุ(19)
    const savedAt = tsMs(r[0]);
    const wh = r[1], empId = r[3];
    const k = savedAt + '|' + wh + '|' + empId;
    if (!groups[k]) {
      groups[k] = {
        savedAt: savedAt,
        wh: wh,
        location: r[2] || '',
        empId: empId,
        name: r[4] || '',
        email: r[5] || '',
        startedAt: tsMs(r[6]),
        rows: []
      };
      order.push(k);
    }
    groups[k].rows.push({
      key: r[7], name: r[8],
      cs: r[9], bp: r[10], pa: r[11], ea: r[12],
      countedPieces: r[13],
      systemRaw: r[14], systemPieces: r[15],
      diffPieces: r[16], diffCSEA: r[17], status: r[18],
      expiryDate: r[19]
    });
  }
  const sessions = order.map(function(k){ return groups[k]; })
    .sort(function(a,b){ return b.savedAt - a.savedAt; })
    .slice(0, 100);
  return { ok: true, sessions: sessions };
}
