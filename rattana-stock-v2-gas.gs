// ═══════════════════════════════════════════════════════
//  Rattana Stock Count — GAS Backend  v1.3
//  Sheet: 18Yn-gru-0BG1FPgsqxANFvuXULgFurK2t1TPIz1vOG4
//  Used by: rattana-stock-v2.html
//
//  v1.3 — All written timestamps are Thai-formatted text:
//         "DD/MM/YYYY HH.mm.ss" with พ.ศ. year, Asia/Bangkok TZ.
//         getDraft / getAllDrafts / getHistory still return epoch ms
//         to the app (so app code is unchanged).
// ═══════════════════════════════════════════════════════

const SS_ID = '18Yn-gru-0BG1FPgsqxANFvuXULgFurK2t1TPIz1vOG4';
const TZ    = 'Asia/Bangkok';

// ── TIME HELPERS ──────────────────────────────────────
function thaiDateTime(input) {
  let d = input;
  if (!d) d = new Date();
  else if (!(d instanceof Date)) d = new Date(d);
  if (!d || isNaN(d)) return '';
  const s = Utilities.formatDate(d, TZ, 'dd/MM/yyyy HH.mm.ss');
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
    if (action === 'draft')      return json(getDraft(p));
    if (action === 'allDrafts')  return json(getAllDrafts(p));
    if (action === 'getHistory' || action === 'history') return json(getHistory(p));
    return json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (_) {}
  const action = body.action || '';
  try {
    if (action === 'saveDraft')  return json(saveDraft(body));
    if (action === 'clearDraft') return json(clearDraft(body));
    if (action === 'saveCount' || (!action && Array.isArray(body.rows))) {
      return json(saveCount(body));
    }
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

function getOrCreate(name, headers) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ── SAVE DRAFT ────────────────────────────────────────
// Columns: userKey | warehouse | sessionStart | updatedAt | itemsJson | name | location
// Both sessionStart and updatedAt are written as Thai-formatted text.
function saveDraft(b) {
  const sh = getOrCreate('Drafts',
    ['userKey','warehouse','sessionStart','updatedAt','itemsJson','name','location']);
  const data = sh.getDataRange().getValues();
  const nowThai = thaiDateTime(new Date());
  const startThai = b.sessionStart ? thaiDateTime(b.sessionStart) : '';
  const key = (b.userKey || '') + '|' + (b.warehouse || '');

  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] + '|' + data[i][1]) === key) {
      sh.getRange(i + 1, 3, 1, 5).setValues([[
        startThai || data[i][2],
        nowThai,
        JSON.stringify(b.items || {}),
        b.name || data[i][5] || '',
        b.location != null ? b.location : (data[i][6] || '')
      ]]);
      return { ok: true };
    }
  }
  sh.appendRow([
    b.userKey || '',
    b.warehouse || '',
    startThai,
    nowThai,
    JSON.stringify(b.items || {}),
    b.name || '',
    b.location || ''
  ]);
  return { ok: true };
}

function clearDraft(b) {
  const sh = SpreadsheetApp.openById(SS_ID).getSheetByName('Drafts');
  if (!sh) return { ok: true };
  const data = sh.getDataRange().getValues();
  const key = (b.userKey || '') + '|' + (b.warehouse || '');
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] + '|' + data[i][1]) === key) {
      sh.getRange(i + 1, 5).setValue('{}');
      return { ok: true };
    }
  }
  return { ok: true };
}

// ── GET ONE DRAFT (own) ───────────────────────────────
// updatedAt is returned as epoch ms so the app can compare timestamps.
function getDraft(p) {
  const sh = getOrCreate('Drafts',
    ['userKey','warehouse','sessionStart','updatedAt','itemsJson','name','location']);
  const data = sh.getDataRange().getValues();
  const key = (p.userKey || '') + '|' + (p.warehouse || '');
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] + '|' + data[i][1]) === key) {
      let items = {};
      try { items = JSON.parse(data[i][4] || '{}'); } catch (_) {}
      return {
        ok: true,
        draft: {
          userKey:      data[i][0],
          warehouse:    data[i][1],
          sessionStart: tsMs(data[i][2]),
          updatedAt:    tsMs(data[i][3]),
          items:        items,
          name:         data[i][5] || '',
          location:     data[i][6] || ''
        }
      };
    }
  }
  return { ok: true, draft: null };
}

// ── GET ALL DRAFTS (live team aggregate) ──────────────
function getAllDrafts(p) {
  const sh = SpreadsheetApp.openById(SS_ID).getSheetByName('Drafts');
  if (!sh) return { ok: true, drafts: [] };
  const data = sh.getDataRange().getValues();
  const wh = String(p.warehouse || '');
  const drafts = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || '') !== wh) continue;
    let items = {};
    try { items = JSON.parse(data[i][4] || '{}'); } catch (_) {}
    if (!Object.keys(items).length) continue;
    drafts.push({
      userKey:   data[i][0],
      name:      data[i][5] || '',
      updatedAt: tsMs(data[i][3]),
      items:     items
    });
  }
  return { ok: true, drafts: drafts };
}

// ── SAVE COUNT (final submit — writes flat rows) ──────
function saveCount(b) {
  const sh = getOrCreate('StockCount', [
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

  // Clear this user's draft after a final save
  try {
    const ds = SpreadsheetApp.openById(SS_ID).getSheetByName('Drafts');
    if (ds) {
      const dd = ds.getDataRange().getValues();
      const key = (b.userKey || '') + '|' + (b.warehouse || '');
      for (let i = 1; i < dd.length; i++) {
        if ((dd[i][0] + '|' + dd[i][1]) === key) {
          ds.getRange(i + 1, 5).setValue('{}');
          break;
        }
      }
    }
  } catch (_) {}

  return { ok: true, written: out.length };
}

// ── GET HISTORY ───────────────────────────────────────
function getHistory(p) {
  const sh = SpreadsheetApp.openById(SS_ID).getSheetByName('StockCount');
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
