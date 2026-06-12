// ═══════════════════════════════════════════════════════
//  Rattana Stock Count — GAS Backend  v1.2
//  Sheet: 18Yn-gru-0BG1FPgsqxANFvuXULgFurK2t1TPIz1vOG4
//  Used by: rattana-stock-v2.html
// ═══════════════════════════════════════════════════════

const SS_ID = '18Yn-gru-0BG1FPgsqxANFvuXULgFurK2t1TPIz1vOG4';

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
    // If no action but payload has `rows`, treat it as saveCount (legacy format)
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
// Columns: userKey | warehouse | sessionStart | updatedAt | itemsJson | name
function saveDraft(b) {
  const sh = getOrCreate('Drafts',
    ['userKey','warehouse','sessionStart','updatedAt','itemsJson','name']);
  const data = sh.getDataRange().getValues();
  const now = new Date().toISOString();
  const key = (b.userKey || '') + '|' + (b.warehouse || '');

  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] + '|' + data[i][1]) === key) {
      sh.getRange(i + 1, 3, 1, 4).setValues([[
        b.sessionStart || data[i][2],
        now,
        JSON.stringify(b.items || {}),
        b.name || data[i][5] || ''
      ]]);
      return { ok: true };
    }
  }
  sh.appendRow([
    b.userKey || '',
    b.warehouse || '',
    b.sessionStart || '',
    now,
    JSON.stringify(b.items || {}),
    b.name || ''
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
function getDraft(p) {
  const sh = getOrCreate('Drafts',
    ['userKey','warehouse','sessionStart','updatedAt','itemsJson','name']);
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
          sessionStart: data[i][2],
          updatedAt:    data[i][3],
          items:        items,
          name:         data[i][5] || ''
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
      updatedAt: data[i][3] ? new Date(data[i][3]).getTime() : 0,
      items:     items
    });
  }
  return { ok: true, drafts: drafts };
}

// ── SAVE COUNT (final submit — writes flat rows) ──────
function saveCount(b) {
  const sh = getOrCreate('StockCount', [
    'savedAt','warehouse','empId','name','email',
    'sessionStart','รหัสสินค้า','ชื่อสินค้า',
    'CS','BP','PA','EA','นับได้(ชิ้น)',
    'สต็อกระบบ(CS.EA)','สต็อกระบบ(ชิ้น)',
    'ต่าง(ชิ้น)','ต่าง(CS.EA)','สถานะ','วันหมดอายุ'
  ]);
  const now = new Date().toISOString();
  const rows = Array.isArray(b.rows) ? b.rows : [];
  if (!rows.length) return { ok: false, error: 'no rows' };

  const out = rows.map(r => [
    now,
    b.warehouse || '',
    b.empId || '',
    b.counterName || b.name || '',
    b.email || '',
    b.sessionStart || b.startedAt || '',
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
    r.expiryDate || ''
  ]);
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
  const groups = new Map();
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const savedAt = r[0] ? new Date(r[0]).getTime() : 0;
    const wh = r[1], empId = r[2];
    const k = savedAt + '|' + wh + '|' + empId;
    if (!groups.has(k)) {
      groups.set(k, {
        savedAt, wh, empId,
        name: r[3] || '', email: r[4] || '',
        startedAt: r[5] ? new Date(r[5]).getTime() : 0,
        rows: []
      });
    }
    groups.get(k).rows.push({
      key: r[6], name: r[7],
      cs: r[8], bp: r[9], pa: r[10], ea: r[11],
      countedPieces: r[12],
      systemRaw: r[13], systemPieces: r[14],
      diffPieces: r[15], diffCSEA: r[16], status: r[17],
      expiryDate: r[18]
    });
  }
  const sessions = [...groups.values()]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, 100);
  return { ok: true, sessions };
}
