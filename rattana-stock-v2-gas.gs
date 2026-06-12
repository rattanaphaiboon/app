// ═══════════════════════════════════════════════════════
//  Rattana Stock Count — GAS Backend  v1.1
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
    if (action === 'getHistory') return json(getHistory(p));
    if (action === 'history')    return json(getHistory(p));
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
    if (action === 'saveDraft') return json(saveDraft(body));
    if (action === 'saveCount') return json(saveCount(body));
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

// ── SHEET HELPERS ─────────────────────────────────────
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

// ── GET ALL DRAFTS IN A WAREHOUSE (team aggregate) ────
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

// ── SAVE COUNT (final) ────────────────────────────────
// Columns: savedAt | warehouse | empId | name | startedAt | totalItems | itemsJson
function saveCount(b) {
  const sh = getOrCreate('StockCount',
    ['savedAt','warehouse','empId','name','startedAt','totalItems','itemsJson']);
  const now = new Date().toISOString();
  const items = b.items || {};
  sh.appendRow([
    now,
    b.warehouse || '',
    b.empId || '',
    b.name || '',
    b.startedAt || '',
    Object.keys(items).length,
    JSON.stringify(items)
  ]);

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

  return { ok: true };
}

// ── GET HISTORY ───────────────────────────────────────
function getHistory(p) {
  const sh = SpreadsheetApp.openById(SS_ID).getSheetByName('StockCount');
  if (!sh) return { ok: true, sessions: [] };
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { ok: true, sessions: [] };

  const sessions = [];
  for (let i = data.length - 1; i >= 1; i--) {
    let items = {};
    try { items = JSON.parse(data[i][6] || '{}'); } catch (_) {}
    sessions.push({
      savedAt:   data[i][0] ? new Date(data[i][0]).getTime() : 0,
      wh:        data[i][1],
      empId:     data[i][2],
      name:      data[i][3],
      startedAt: data[i][4] ? new Date(data[i][4]).getTime() : 0,
      items:     items
    });
    if (sessions.length >= 100) break;
  }
  return { ok: true, sessions: sessions };
}
