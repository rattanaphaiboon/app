// ═══════════════════════════════════════════════════════════
// WebApp.gs (Keepdata) v1.6 — 2026-09-22 · ส่วนที่เพิ่มจาก v1.5 เท่านั้น (ส่วนอื่นในไฟล์จริงไม่ได้แตะ)
//
// [1] บรรทัดแรกใน function handleAction(p) { (ก่อนบรรทัด save_pre ของ v1.5):
//   if (p && p.action === 'save_trucks') return saveTrucks(p);        // v1.6 (2026-09-22): จัดรถ — บันทึกเฉพาะคันที่แก้ (ล็อก + ตรวจชนกัน)
//   if (p && p.action === 'save_pre_books') return savePreBooks(p);   // v1.6: พรีปลีก — บันทึกเฉพาะเล่มที่แก้
//   if (p && p.action === 'save') return withScriptLock_(function () { return saveRows(p); });   // v1.6: action เดิมเข้าคิวล็อกด้วย
//
// [2] ต่อท้ายไฟล์ (ข้างล่างนี้ทั้งหมด):
// ═══════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// v1.6 (2026-09-22): ใช้หลายคนพร้อมกัน — บันทึกเฉพาะ "คันที่แก้" (Keepdata) / "เล่มที่แก้" (พรีปลีก)
//   user: "ทำให้แอปนี้ใช้ได้หลายคนในเวลาเดียวกัน แล้วเวลากดบันทึกไม่บันทึกซ้อนกัน" → เลือก "บันทึกเฉพาะคันที่ตัวเองแก้"
//   · action ใหม่ 'save_trucks' (Keepdata) / 'save_pre_books' (พรีปลีก) — ทับเฉพาะคีย์ที่ส่งมา คีย์อื่นของแผนเดียวกันไม่แตะ
//   · ล็อกคิวการบันทึก (LockService) — รวม action 'save' เดิมด้วย (แอปรุ่นเก่ายังใช้ได้เหมือนเดิม)
//   · ชนกัน: แอปส่ง known = {คีย์: รหัสบันทึกที่เห็นตอนโหลด} · ในชีทตอนนี้ไม่ตรง = มีคนบันทึกคีย์นั้นหลังแอปโหลด
//     → ไม่เขียนอะไรเลย ตอบ conflict ให้แอปถามก่อน (ส่ง force:true มาซ้ำ = ทับ)
//   · บิลเดียวอยู่ได้ที่เดียว: แถวเดิมของบิลที่ส่งมา (คีย์อื่น แผนเดียวกัน) ถูกลบ = บันทึกล่าสุดชนะ
//   แผนเดียวกัน: Keepdata = วันที่ส่ง (B) + คลัง · พรีปลีก = วันที่เอกสาร (A) + แหล่ง (C) + คลัง
// ════════════════════════════════════════════════════════════
const SAVE_ID_HEADER  = 'รหัสบันทึก';
const SAVED_BY_HEADER = 'ผู้บันทึก';

function withScriptLock_(fn) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); }
  catch (err) { return jsonOut({ ok: false, busy: true, message: 'ระบบกำลังบันทึกของคนอื่นอยู่ — ลองกดบันทึกอีกครั้ง' }); }
  try { return fn(); }
  finally { lock.releaseLock(); }
}
function saveTrucks(p)   { return withScriptLock_(function () { return saveGroups_(p, SHEET_NAME, 'plate'); }); }
function savePreBooks(p) { return withScriptLock_(function () { return saveGroups_(p, PRE_SHEET_NAME, 'book'); }); }

// Date / 'dd/mm/yyyy' / 'yyyy-mm-dd' → Date เที่ยงคืน · อ่านไม่ออก = null
function dayOf_(v) {
  if (v === '' || v == null) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return parseThaiDate(s);
}
function stampTxt_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
  return String(v == null ? '' : v);
}

function saveGroups_(p, sheetName, kind) {
  const headers = p.headers, rows = p.rows || [];
  const keys = (p.keys || []).map(function (k) { return String(k == null ? '' : k).trim(); }).filter(function (k) { return k; });
  if (!headers || !keys.length) return jsonOut({ ok: false, message: 'missing headers/keys' });
  const saveWh = String(p.warehouse || '').trim();
  const col = function (h) { return headers.indexOf(h); };
  const cWh = col(WH_HEADER), cRef = col('เลขบิล'), cId = col(SAVE_ID_HEADER), cBy = col(SAVED_BY_HEADER), cUpd = col('วันที่อัปเดต');
  const cKey = kind === 'plate' ? col('ทะเบียนรถ') : col('เล่ม');
  const cDay = kind === 'plate' ? DATE_COL - 1 : col('วันที่เอกสาร');
  const cSrc = kind === 'plate' ? -1 : col('แหล่ง');
  const planDay = dayOf_(kind === 'plate' ? p.deliveryDate : p.docDate);
  const planSrc = String(p.src || '').trim();
  if (cRef < 0 || cKey < 0 || cId < 0 || cDay < 0 || !planDay) return jsonOut({ ok: false, message: 'หัวคอลัมน์/วันที่ของแผนไม่ครบ' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName, ss.getNumSheets());
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  const lastRow = sh.getLastRow();
  const lastCol = Math.max(headers.length, sh.getLastColumn());
  const existing = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

  const keySet = {}; keys.forEach(function (k) { keySet[k] = 1; });
  const refSet = {}; rows.forEach(function (r) { const x = String(r[cRef] || '').trim(); if (x) refSet[x] = 1; });
  const keyOf = function (row) {
    let k = String(row[cKey] == null ? '' : row[cKey]).trim();
    if (!k && kind === 'book') k = String(row[cRef] || '').replace(/\s+/g, '').toUpperCase().slice(0, 4);   // แถวก่อนมีคอลัมน์ "เล่ม"
    return k;
  };
  const samePlan = function (row) {
    const d = dayOf_(row[cDay]); if (!d || !sameDay(d, planDay)) return false;
    if (cSrc >= 0 && planSrc && String(row[cSrc] || '').trim() !== planSrc) return false;
    const rowWh = cWh >= 0 ? String(row[cWh] || '').trim() : '';
    return !saveWh || rowWh === '' || rowWh === saveWh;
  };

  // ── 1) ตรวจชนกัน (ไม่เขียนอะไรจนกว่าจะผ่าน) ──
  const cur = {};   // คีย์ → {id, by, at} ของแถวที่อยู่ในชีทตอนนี้
  existing.forEach(function (row) {
    if (!samePlan(row)) return;
    const k = keyOf(row); if (!keySet[k] || cur[k]) return;
    cur[k] = { id: String(row[cId] || ''), by: cBy >= 0 ? String(row[cBy] || '') : '', at: cUpd >= 0 ? stampTxt_(row[cUpd]) : '' };
  });
  if (!p.force) {
    const known = p.known || {};
    const conflict = keys.filter(function (k) { return String(known[k] || '') !== String((cur[k] || {}).id || ''); })
      .map(function (k) { const c = cur[k] || {}; return { key: k, by: c.by || '', at: c.at || '', id: c.id || '' }; });
    if (conflict.length) {
      return jsonOut({ ok: false, conflict: conflict,
        message: 'มีคนบันทึก ' + conflict.map(function (c) { return c.key; }).join(', ') + ' ไปก่อนแล้ว หลังจากที่แอปโหลดข้อมูลมา' });
    }
  }

  // ── 2) เขียน: ลบแถวเดิมของคีย์ที่ส่งมา + แถวเดิมของบิลที่ส่งมา (ย้ายมาจากคีย์อื่น) + ของเก่าเกิน KEEP_DAYS ──
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  let deletedOld = 0, replaced = 0, moved = 0;
  const kept = existing.filter(function (row) {
    if (row.every(function (c) { return c === '' || c === null; })) return false;
    const dd = dayOf_(row[DATE_COL - 1]);   // วันที่ส่ง (B)
    if (dd && dd < cutoff) { deletedOld++; return false; }
    if (!samePlan(row)) return true;
    if (keySet[keyOf(row)]) { replaced++; return false; }
    if (refSet[String(row[cRef] || '').trim()]) { moved++; return false; }
    return true;
  });
  const norm = function (arr) { const out = arr.slice(0, headers.length); while (out.length < headers.length) out.push(''); return out; };
  const combined = kept.map(norm).concat(rows.map(norm));
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  if (combined.length) sh.getRange(2, 1, combined.length, headers.length).setValues(combined);
  return jsonOut({ ok: true, saveId: String(p.saveId || ''), keys: keys,
    message: 'บันทึก ' + keys.length + (kind === 'plate' ? ' คัน' : ' เล่ม') + ' · ' + rows.length + ' แถว (คลัง ' + (saveWh || '-') + ')'
      + ' · ทับของเดิม ' + replaced + (moved ? ' · ย้ายบิล ' + moved : '') + (deletedOld ? ' · ลบเก่า ' + deletedOld : '') });
}
