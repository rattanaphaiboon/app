/****************************************************************************************
 * HumanSoft → CheckinLog Sync — v1.0 (2026-08-24)
 *
 * ดึง "สแกนดิบ" จากเครื่องสแกนนิ้ว (ผ่าน HumanSoft Open API, read-only) มาลงระบบเรา:
 *   HumanSoft daily_in_month → กรองชนิด Fingerprint → Supabase checkin_log + ชีท CheckinLog
 * แถวที่เติมจะไหลเข้า "คิดสรุป/สรุปวัน/ลงเวลาAuto" เองอัตโนมัติ เพราะสูตรจับคู่ IN/OUT
 * จาก min/max เวลาในคอลัมน์ A ต่อคนต่อวัน (ไม่ได้อ่านคอลัมน์ F in/out)
 *
 * กันซ้ำ (idempotent): client_id = 'HMS-<รหัส>-<time_attendance_transac_id>'
 *   - ชีท: เช็คคอลัมน์ Q ก่อน append   - Supabase: upsert on_conflict=client_id
 *   - รันซ้ำกี่รอบก็ไม่เบิ้ล
 *
 * ── วิธีติดตั้ง (ในโปรเจกต์ Apps Script ตัวเดียวกับ rattana-backend.gs) ──────────────
 * 1) Editor → Files → + → Script → ตั้งชื่อ humansoft-sync → วางไฟล์นี้ทั้งไฟล์ → Save
 *    (ไม่ต้อง Deploy New version — trigger รันโค้ดล่าสุดเสมอ; ที่ต้อง deploy คือเฉพาะ web app)
 * 2) Project Settings → Script Properties เพิ่ม:
 *      HMS_KEY        = subscription key ของ RTN (ก้อนเดียวกับที่ตั้งไว้ในโปรเจกต์ proxy)
 *      HMS_SYNC_CODES = รหัสพนักงานที่ใช้เครื่องนิ้ว คั่น comma เช่น  11034,12034,66105
 * 3) รัน hmsSyncDryRun  → ดู Execution log: สะกดชนิดสแกน/รูปแบบเวลา/แถวที่จะเขียน (ยังไม่เขียนจริง)
 * 4) รัน hmsSyncRecent เองหนึ่งครั้ง → เช็คแถวใหม่ใน CheckinLog + สรุปวันขยับ
 * 5) รัน hmsSyncInstallTrigger → ตั้งรันอัตโนมัติทุก 30 นาที (ถอนด้วย hmsSyncRemoveTrigger)
 *
 * หมายเหตุ:
 * - ด่านเว้นช่วง 60 นาทีของ actionCheckin ไม่บังคับกับข้อมูลนำเข้า (เป็นบันทึกจริงจากเครื่อง)
 * - กะดึกข้ามคืนไม่ต้องทำอะไรพิเศษ — สูตรคิดสรุปตัดเที่ยงถึงเที่ยงตามแท็บจัดกะอยู่แล้ว
 * - อยากดึงชนิดอื่นด้วย (Facial ของ HumanSoft / Manual) → เพิ่มใน HMS_SYNC.TYPES
 * - เดือนย้อนหลัง: รัน hmsSyncBackfill (ค่าเริ่มต้น = เดือนปัจจุบัน; เดือนอื่นใช้ wrapper ล่างสุด)
 ***************************************************************************************/

const HMS_SYNC = {
  API: 'https://hms-api-management.azure-api.net/api/v1/open-apis/salary/get-data-filter',
  TYPES: ['fingerprint'],          // เทียบแบบ lowercase — เพิ่ม 'facial','manual' ได้
  BUDGET_MS: 4.5 * 60 * 1000,      // กันชนลิมิต 6 นาที/รันของ Apps Script
  RETRY: 2,
  TZ: 'Asia/Bangkok',
};

/* ── จุดเข้า: ให้ trigger เรียก — ดึงวันนี้ + เมื่อวาน (เมื่อวานติดไว้เสมอ เผื่อกะข้ามคืน/ข้อมูลมาช้า) ── */
function hmsSyncRecent() {
  const now = new Date();
  const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const ymdSet = {};
  ymdSet[Utilities.formatDate(now, HMS_SYNC.TZ, 'yyyyMMdd')] = 1;
  ymdSet[Utilities.formatDate(yest, HMS_SYNC.TZ, 'yyyyMMdd')] = 1;
  const months = {};
  months[Utilities.formatDate(now, HMS_SYNC.TZ, 'yyyy-MM')] = 1;
  months[Utilities.formatDate(yest, HMS_SYNC.TZ, 'yyyy-MM')] = 1;
  return hmsSyncRun_('recent', Object.keys(months), ymdSet);
}

/* ── ดึงทั้งเดือน (รันมือ ใช้ตอนเริ่มระบบ/ซ่อมข้อมูล) — ถ้าเกินงบเวลา รันซ้ำจนสถานะไม่ partial ── */
function hmsSyncBackfill(ym) {
  ym = (typeof ym === 'string' && /^\d{4}-\d{2}$/.test(ym))
    ? ym : Utilities.formatDate(new Date(), HMS_SYNC.TZ, 'yyyy-MM');
  return hmsSyncRun_('bf' + ym, [ym], null);
}
// เดือนอื่น: แก้เลขเดือนแล้วรันฟังก์ชันนี้แทน
function hmsSyncBackfillJuly() { return hmsSyncBackfill('2026-07'); }

/* ── ซ้อมยิงโดยไม่เขียนอะไรเลย — รันก่อนใช้จริงเสมอ แล้วอ่าน Execution log ── */
function hmsSyncDryRun() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('HMS_KEY');
  if (!key) { Logger.log('ยังไม่ได้ตั้ง Script Property: HMS_KEY'); return; }
  const codes = hmsSyncCodes_();
  if (!codes.length) { Logger.log('ยังไม่ได้ตั้ง Script Property: HMS_SYNC_CODES'); return; }
  const code = codes[0];
  const ym = Utilities.formatDate(new Date(), HMS_SYNC.TZ, 'yyyy-MM');
  const payload = hmsFetchMonth_(key, code, ym);
  if (!payload) { Logger.log('HumanSoft ตอบ "ไม่พบ" รหัส ' + code); return; }

  const days = payload.daily || [];
  const typeSeen = {};
  let totalScans = 0;
  days.forEach(function (d) {
    (d.time || []).forEach(function (t) {
      totalScans++;
      const tv = String(t.time_attendance_type_lv || '?');
      typeSeen[tv] = (typeSeen[tv] || 0) + 1;
    });
  });
  Logger.log('รหัส ' + code + ' เดือน ' + ym + ' — daily ' + days.length + ' วัน, สแกนดิบรวม ' + totalScans + ' ครั้ง');
  Logger.log('ชนิดสแกนที่พบ (สะกดตามจริง): ' + JSON.stringify(typeSeen));
  Logger.log('โปรไฟล์: ' + (payload.profile
    ? String(payload.profile.employee_name || '') + ' ' + String(payload.profile.employee_last_name || '') : '(ไม่มี)'));

  const scans = hmsPickScans_(payload, null);
  Logger.log('หลังกรองชนิด ' + JSON.stringify(HMS_SYNC.TYPES) + ' เหลือ ' + scans.length + ' ครั้ง');
  scans.slice(-6).forEach(function (s) {
    Logger.log('จะเขียน: HMS-' + code + '-' + s.tid + ' | ' + s.ymd + ' ' + s.hms
      + ' | raw=' + JSON.stringify(s.raw).slice(0, 280));
  });
  Logger.log('DRY RUN — ยังไม่เขียนอะไรทั้งสิ้น');
}

/* ── ติดตั้ง/ถอน trigger + ดูผลรอบล่าสุด ── */
function hmsSyncInstallTrigger() {
  hmsSyncRemoveTrigger();
  ScriptApp.newTrigger('hmsSyncRecent').timeBased().everyMinutes(30).create();
  Logger.log('ติดตั้ง trigger: hmsSyncRecent ทุก 30 นาที');
}
function hmsSyncRemoveTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'hmsSyncRecent') ScriptApp.deleteTrigger(tr);
  });
}
function hmsSyncStatus() {
  Logger.log(PropertiesService.getScriptProperties().getProperty('HMS_SYNC_LAST') || 'ยังไม่เคยรัน');
}

/* ═══════════════════════════ internal ═══════════════════════════ */

/* ตัวรันหลัก: ไล่ทีละรหัส เขียนจบเป็นรายคน (สะดุดกลางทางข้อมูลไม่ค้างครึ่งๆ)
 * เกินงบเวลา → จำตำแหน่งไว้ (HMS_SYNC_CUR_<label>) รอบถัดไปวิ่งต่อจากเดิม */
function hmsSyncRun_(label, months, ymdSet) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20 * 1000)) { Logger.log('hmsSync: รอบก่อนยังรันอยู่ — ข้ามรอบนี้'); return null; }
  try {
    const props = PropertiesService.getScriptProperties();
    const key = props.getProperty('HMS_KEY');
    if (!key) { Logger.log('hmsSync: ยังไม่ได้ตั้ง HMS_KEY'); return null; }
    const codes = hmsSyncCodes_();
    if (!codes.length) { Logger.log('hmsSync: ยังไม่ได้ตั้ง HMS_SYNC_CODES'); return null; }

    const curKey = 'HMS_SYNC_CUR_' + label;
    let startIdx = Number(props.getProperty(curKey) || 0);
    if (!(startIdx >= 0 && startIdx < codes.length)) startIdx = 0;

    const t0 = Date.now();
    const logSh = getOrCreateTab(T.LOG);
    const existing = hmsExistingCids_(logSh);
    const stats = { label: label, months: months, codes: 0, scans: 0, added: 0, dup: 0, partial: false, errors: [] };

    let i = startIdx;
    for (; i < codes.length; i++) {
      if (Date.now() - t0 > HMS_SYNC.BUDGET_MS) { stats.partial = true; break; }
      const code = codes[i];
      try {
        for (let mIdx = 0; mIdx < months.length; mIdx++) {
          const payload = hmsFetchMonth_(key, code, months[mIdx]);
          if (!payload) continue;                     // ไม่พบรหัสนี้ใน HumanSoft — ข้ามเงียบ (แบบ v3.1)
          hmsImportScans_(logSh, existing, code, payload, ymdSet, stats);
        }
        stats.codes++;
      } catch (e) {
        stats.errors.push(code + ': ' + e);
      }
      Utilities.sleep(400);                           // เว้นจังหวะกัน rate-limit (บทเรียน v1.8)
    }
    if (stats.partial) props.setProperty(curKey, String(i));
    else props.deleteProperty(curKey);

    stats.at = new Date().toISOString();
    if (stats.errors.length > 5) stats.errors = stats.errors.slice(0, 5).concat(['...รวม ' + stats.errors.length + ' รหัส']);
    props.setProperty('HMS_SYNC_LAST', JSON.stringify(stats).slice(0, 8000));
    Logger.log('hmsSync[' + label + '] ' + JSON.stringify(stats));
    return stats;
  } finally {
    lock.releaseLock();
  }
}

/* เขียนสแกนของพนักงาน 1 คน (เดือนเดียว) ลง Supabase + ชีท — คืนจำนวนที่เพิ่มจริง */
function hmsImportScans_(logSh, existing, code, payload, ymdSet, stats) {
  const scans = hmsPickScans_(payload, ymdSet);
  stats.scans += scans.length;
  if (!scans.length) return 0;

  const who = hmsWho_(code, payload.profile);
  // จัดกลุ่มต่อวัน → เรียงเวลา → ขาแรก=in ขาสุดท้าย=out (คอลัมน์ F เป็นข้อมูลเสริมเท่านั้น)
  const byDay = {};
  scans.forEach(function (s) { (byDay[s.ymd] = byDay[s.ymd] || []).push(s); });

  let added = 0;
  Object.keys(byDay).forEach(function (ymd) {
    const list = byDay[ymd].sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });
    list.forEach(function (s, idx) {
      const cid = 'HMS-' + code + '-' + s.tid;
      if (existing.has(cid)) { stats.dup++; return; }
      const type = (list.length >= 2 && idx === list.length - 1) ? 'out' : 'in';
      const d = new Date(s.iso);
      const srcTag = 'hms:' + String(s.raw.time_attendance_type_lv || '');

      if (sbReady_()) {
        try {
          sbUpsert_('checkin_log', {
            client_id: cid, emp_id: code, name: who.name,
            scan_at: d.toISOString(), type: type,
            branch: who.branch,
            lat: sbNum_(s.raw.latitude), lng: sbNum_(s.raw.longitude),
            distance: null, face_dist: null,
            scanned_by: srcTag, photo_path: '',
            retroactive: '', reason: '',
          }, 'client_id');
        } catch (e) { console.error('hmsSync sb ' + cid, e); }
      }
      // appendRow ทีละแถว (ไม่รวม setValues ก้อนเดียว) — กันแย่งแถวกับ actionCheckin
      // ตอนพนักงานสแกนหน้าเข้ามาพร้อมกันพอดี
      logSh.appendRow([
        d, code, who.name,
        hmsDdmmyyyy_(s.ymd), s.hms,
        type, who.branch,
        s.raw.latitude || '', s.raw.longitude || '', '', '',
        srcTag, '',
        '',
        '', 'hms-sync', cid,
      ]);
      existing.add(cid);
      added++; stats.added++;
    });
  });
  return added;
}

/* ดึง daily_in_month 1 คน 1 เดือน — คืน payload {profile, daily} | null ถ้าไม่พบรหัส */
function hmsFetchMonth_(key, code, ym) {
  const url = HMS_SYNC.API + '?path_action=daily_in_month'
    + '&employee_code=' + encodeURIComponent(code)
    + '&year_month=' + encodeURIComponent(ym);
  let lastMsg = '';
  for (let a = 0; a <= HMS_SYNC.RETRY; a++) {
    let res = null;
    try {
      res = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { 'Ocp-Apim-Subscription-Key': key },
        muteHttpExceptions: true,
      });
    } catch (e) { lastMsg = String(e); Utilities.sleep(700 * (a + 1)); continue; }
    let body = null;
    try { body = JSON.parse(res.getContentText()); } catch (e) {}
    const msg = (body && body.message) ? String(body.message) : ('HTTP ' + res.getResponseCode());
    if (res.getResponseCode() === 200 && body && body.payload) return body.payload;
    if (/not found|ไม่พบ/i.test(msg)) return null;
    lastMsg = msg;
    Utilities.sleep(700 * (a + 1));
  }
  throw new Error('daily_in_month ' + code + ' ' + ym + ' ล้มเหลว: ' + lastMsg);
}

/* แบสแกนทุกวันในเดือน → กรองชนิด + กรองวัน (ymdSet=null คือเอาทุกวัน) */
function hmsPickScans_(payload, ymdSet) {
  const days = (payload && payload.daily) || [];
  const want = HMS_SYNC.TYPES.map(function (x) { return String(x).toLowerCase(); });
  const out = [];
  days.forEach(function (day) {
    (day.time || []).forEach(function (t) {
      const tv = String(t.time_attendance_type_lv || '').toLowerCase();
      if (want.indexOf(tv) < 0) return;
      const inst = hmsScanInstant_(t);
      if (!inst) return;
      if (ymdSet && !ymdSet[inst.ymd]) return;
      out.push({ raw: t, tid: inst.tid, iso: inst.iso, ymd: inst.ymd, hms: inst.hms });
    });
  });
  return out;
}

/* เวลาสแกน → instant ไทย +07:00 ตรงๆ (บทเรียน v4.9 — ไม่พึ่ง timezone ของโปรเจกต์)
 * หลัก: attendance_datetime · สำรอง: 14 หลักแรกของ transac_id (yyyymmddHHMMSS) */
function hmsScanInstant_(t) {
  const tid = String(t.time_attendance_transac_id || '');
  const s = String(t.attendance_datetime || '').trim();
  let y, mo, dd, hh, mi, ss;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    y = +m[1]; mo = +m[2]; dd = +m[3]; hh = +m[4]; mi = +m[5]; ss = +(m[6] || 0);
  } else if (/^\d{14}/.test(tid)) {
    y = +tid.slice(0, 4); mo = +tid.slice(4, 6); dd = +tid.slice(6, 8);
    hh = +tid.slice(8, 10); mi = +tid.slice(10, 12); ss = +tid.slice(12, 14);
  } else return null;
  if (y > 2200) y -= 543;                              // กันเลขปี พ.ศ.
  const p2 = function (n) { return ('0' + n).slice(-2); };
  const iso = y + '-' + p2(mo) + '-' + p2(dd) + 'T' + p2(hh) + ':' + p2(mi) + ':' + p2(ss) + '+07:00';
  if (isNaN(new Date(iso).getTime())) return null;
  return {
    tid: tid || (String(y) + p2(mo) + p2(dd) + p2(hh) + p2(mi) + p2(ss)),
    iso: iso,
    ymd: String(y) + p2(mo) + p2(dd),
    hms: p2(hh) + ':' + p2(mi) + ':' + p2(ss),
  };
}

/* ชื่อ/สาขา: ยึดสะกดฝั่งเราก่อนเสมอ (Users → ทะเบียน PTT → โปรไฟล์ HumanSoft)
 * ถ้าสะกดไม่ตรงกับจัดกะ/Users "สรุปวัน" จะแตกเป็นคนละแถว (UNIQUE จับคู่ B&C) */
function hmsWho_(code, profile) {
  const u = findUserByEmpId(code);
  if (u && u.name) return { name: u.name, branch: u.branch || 'เครื่องสแกนนิ้ว' };
  const pr = pttMap_()[code];
  if (pr && pr.name) return { name: pr.name, branch: pr.saka || 'เครื่องสแกนนิ้ว' };
  const n = profile
    ? [profile.employee_name, profile.employee_last_name].filter(Boolean).join(' ').trim() : '';
  return { name: n || String(code), branch: 'เครื่องสแกนนิ้ว' };
}

/* clientId ที่มีแล้วทั้งคอลัมน์ Q — อ่านครั้งเดียวต่อรอบ */
function hmsExistingCids_(sh) {
  const set = new Set();
  const last = sh.getLastRow();
  if (last > 1) {
    const vals = sh.getRange(2, 17, last - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) {
      const v = String(vals[i][0] || '');
      if (v) set.add(v);
    }
  }
  return set;
}

function hmsSyncCodes_() {
  const raw = PropertiesService.getScriptProperties().getProperty('HMS_SYNC_CODES') || '';
  return raw.split(/[,\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}

function hmsDdmmyyyy_(ymd) {
  return ymd.slice(6, 8) + '/' + ymd.slice(4, 6) + '/' + ymd.slice(0, 4);
}
