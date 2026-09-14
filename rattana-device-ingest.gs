/****************************************************************************************
 * rattana-device-ingest — จุดรับสแกนจากเครื่อง ZKTeco (ผ่าน Cloudflare Worker)  v0.2
 *                                                                          2026-09-14
 *
 * Cloudflare Worker (rattana-adms) แกะ protocol iclock ของเครื่องแล้ว POST JSON มาที่
 * backend นี้ action=deviceIngest — ฟังก์ชันนี้เขียนสแกนลง CheckinLog(ชีท) + Supabase
 * ด้วยท่อเดียวกับ actionCheckin เป๊ะ → สูตร "คิดสรุป/สรุปวัน/ลงเวลาAuto" ขยับเองอัตโนมัติ
 *
 * กันซ้ำ (idempotent): client_id = 'DEV-<SN>-<PIN>-<yyyyMMddHHmmss>'
 *   เครื่อง push ซ้ำ / Worker retry กี่รอบก็ไม่เบิ้ล (เช็คคอลัมน์ Q ก่อน + upsert Supabase)
 *
 * ช่อง type สลับ เข้า/ออก: นับสแกนต่อคนต่อวัน (สแกนที่ 1=in, 2=out, 3=in...)
 *   — เป็นแค่ป้ายแสดงผล สรุปวันคิด IN/OUT จากเวลา first/last อยู่แล้ว ไม่ได้อ่านช่องนี้
 *
 * ── ติดตั้ง ────────────────────────────────────────────────────────────────────
 * 1) วางไฟล์นี้เป็นไฟล์ใหม่ในโปรเจกต์ Apps Script เดียวกับ rattana-backend.gs
 * 2) rattana-backend.gs → ในฟังก์ชัน handle() ใต้บล็อก registerUserSlip เพิ่ม 3 บรรทัด:
 *        if (action === 'deviceIngest') return jsonOut(actionDeviceIngest_(p));
 * 3) Script Properties เพิ่ม:  DEVICE_KEY = <รหัสลับสักชุด>  (ตัวเดียวกับที่ตั้งใน Worker)
 * 4) Deploy → Manage deployments → Edit → New version → Deploy  (ต้องออกเวอร์ชันใหม่)
 * 5) ทดสอบใน editor: Run → testDeviceIngest (เขียนสแกนปลอม 1 แถวลงชีท+Supabase)
 ***************************************************************************************/

/* เครื่องสแกนนิ้วติดผนัง = ไม่มี GPS แต่อยู่จุดเดิมตายตัว → เติมพิกัดของจุดติดตั้ง
 * แมพ SN เครื่อง → "ชื่อจุด" (ต้องตรงกับคอลัมน์ code หรือ name ในแท็บ Locations)
 * เพิ่มเครื่องใหม่/คนละสาขา = เพิ่มบรรทัด · '*' = ค่า default ทุกเครื่องที่ไม่ได้ระบุ */
const DEVICE_LOC_BY_SN = {
  '4368220400140': 'ลาดใหญ่',   // เครื่องที่ 1
  '4368212900146': 'ลาดใหญ่',   // เครื่องที่ 2 (Thai02) — ลาดใหญ่เหมือนกัน
};

function actionDeviceIngest_(p) {
  // ── ด่านรหัสลับ (ไม่ใช้ session เพราะเครื่องไม่มี login) ──
  const KEY = PropertiesService.getScriptProperties().getProperty('DEVICE_KEY') || '';
  if (!KEY || String(p.key || '') !== KEY) {
    return { ok: false, error: 'bad device key' };
  }
  const sn = String(p.sn || '').trim() || 'UNKNOWN';
  const records = Array.isArray(p.records) ? p.records : [];
  if (!records.length) return { ok: true, added: 0, dup: 0, msg: 'no records' };

  const logSh = getOrCreateTab(T.LOG);
  const loc = deviceLocLookup_(DEVICE_LOC_BY_SN[sn] || DEVICE_LOC_BY_SN['*'] || '');

  // อ่านชีทรอบเดียว → ได้ทั้ง (ก) ชุด client_id ที่มีแล้ว กันซ้ำ  (ข) จำนวนสแกนต่อคนต่อวัน ไว้สลับ เข้า/ออก
  // สำคัญ: key วันที่อ่านจากคอลัมน์ A (timestamp = Date แน่นอน) แปลงเป็น yyyyMMdd
  //        — ห้ามใช้คอลัมน์ D เพราะ Sheets แปลงข้อความวันที่เป็นชนิด Date อัตโนมัติ ทำให้ key ไม่ตรง
  const existing = new Set();
  const dayCount = {};   // 'empId|yyyyMMdd' → จำนวนสแกนที่มีในวันนั้น (นับรวมทั้งแอป+เครื่อง)
  const _last = logSh.getLastRow();
  if (_last > 1) {
    const rows = logSh.getRange(2, 1, _last - 1, 17).getValues();
    for (let i = 0; i < rows.length; i++) {
      const cidv = String(rows[i][16] || '');            // Q(17) = client_id
      if (cidv) existing.add(cidv);
      const emp = String(rows[i][1] || '').trim();       // B(2) = empId
      const ymd = deviceYmdKey_(rows[i][0]);             // A(1) = timestamp → yyyyMMdd
      if (emp && ymd) { const k = emp + '|' + ymd; dayCount[k] = (dayCount[k] || 0) + 1; }
    }
  }
  let added = 0, dup = 0, bad = 0;

  records.forEach(function (r) {
    const pin = String(r.pin || '').trim();
    const inst = deviceInstant_(String(r.dt || ''));
    if (!pin || !inst) { bad++; return; }

    const cid = 'DEV-' + sn + '-' + pin + '-' + inst.stamp;
    if (existing.has(cid)) { dup++; return; }

    const who = deviceWho_(pin);
    const scannedBy = 'device:' + deviceVerifyLabel_(r.verify);
    // สลับ เข้า/ออก ตามลำดับสแกนของวันนั้น (key = yyyyMMdd จาก stamp ให้ตรงกับ dayCount)
    const dkey = pin + '|' + inst.stamp.slice(0, 8);
    const priorCount = dayCount[dkey] || 0;
    const type = (priorCount % 2 === 0) ? 'in' : 'out';
    dayCount[dkey] = priorCount + 1;
    const d = new Date(inst.iso);
    // พิกัดจุดติดตั้งเครื่อง (คงที่) — อยู่ที่จุดพอดี distance = 0; ไม่รู้จุด = เว้นว่าง
    const lat = loc ? loc.lat : null;
    const lng = loc ? loc.lng : null;
    const dist = loc ? 0 : null;

    // Supabase (ถ้าตั้ง key แล้ว) — upsert กันซ้ำด้วย client_id
    if (sbReady_()) {
      try {
        sbUpsert_('checkin_log', {
          client_id: cid, emp_id: pin, name: who.name,
          scan_at: d.toISOString(), type: type,
          branch: who.branch, lat: lat, lng: lng, distance: dist, face_dist: null,
          scanned_by: scannedBy, photo_path: '',
          retroactive: '', reason: '',
        }, 'client_id');
      } catch (e) { console.error('deviceIngest sb ' + cid, e); }
    }

    // ชีท CheckinLog — 17 คอลัมน์ ตรงกับ actionCheckin (A=Date … Q=clientId)
    logSh.appendRow([
      d, pin, who.name, inst.dmy, inst.hms,
      type, who.branch,
      (lat == null ? '' : lat), (lng == null ? '' : lng), (dist == null ? '' : dist), '',
      scannedBy, '',
      '',
      '', 'device-adms', cid,
    ]);
    existing.add(cid);
    added++;
  });

  return {
    ok: true, sn: sn, added: added, dup: dup, bad: bad,
    loc: loc ? { name: loc.name, lat: loc.lat, lng: loc.lng } : null,  // ตรวจได้ว่า SN นี้ map สาขาไหน
  };
}

/* เวลาจากเครื่อง = เวลาไทยอยู่แล้ว → ประกอบ instant ด้วย +07:00 ตรงๆ (บทเรียน v4.9)
 * รับ "YYYY-MM-DD HH:MM:SS" (หรือมี T คั่น) */
function deviceInstant_(s) {
  const m = String(s).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const p2 = function (n) { return ('0' + n).slice(-2); };
  const Y = m[1], Mo = p2(m[2]), D = p2(m[3]), H = p2(m[4]), Mi = m[5], S = m[6];
  const iso = Y + '-' + Mo + '-' + D + 'T' + H + ':' + Mi + ':' + S + '+07:00';
  if (isNaN(new Date(iso).getTime())) return null;
  return {
    iso: iso,
    stamp: Y + Mo + D + H + Mi + S,       // yyyyMMddHHmmss สำหรับ client_id + คีย์วัน (slice 0,8)
    dmy: D + '/' + Mo + '/' + Y,          // dd/MM/yyyy (คอลัมน์ D)
    hms: H + ':' + Mi + ':' + S,          // HH:mm:ss   (คอลัมน์ E)
  };
}

/* คอลัมน์ A (timestamp) → yyyyMMdd — รับทั้ง Date (ปกติ) และข้อความ dd/MM/yyyy (สำรอง) */
function deviceYmdKey_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyyMMdd');
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + ('0' + m[2]).slice(-2) + ('0' + m[1]).slice(-2);
  return '';
}

/* ชื่อ/สาขา: ยึดสะกดฝั่งเราก่อนเสมอ (Users → ทะเบียน PTT) กัน "สรุปวัน" แตกแถวเพราะชื่อต่าง */
function deviceWho_(pin) {
  const u = (typeof findUserByEmpId === 'function') ? findUserByEmpId(pin) : null;
  if (u && u.name) return { name: u.name, branch: u.branch || 'เครื่องสแกน' };
  const pr = (typeof pttMap_ === 'function') ? (pttMap_()[pin] || null) : null;
  if (pr && pr.name) return { name: pr.name, branch: pr.saka || 'เครื่องสแกน' };
  return { name: pin, branch: 'เครื่องสแกน' };
}

/* ZKTeco verify mode → ป้ายอ่านง่าย (เก็บใน scanned_by = 'device:finger' ฯลฯ) */
function deviceVerifyLabel_(v) {
  switch (String(v || '').trim()) {
    case '1':  return 'finger';
    case '15': return 'face';
    case '0':  return 'password';
    case '2':  return 'finger';   // บางรุ่นใช้ 2 = นิ้ว
    case '3':  return 'card';
    case '4':  return 'card';
    default:   return v ? ('v' + v) : 'unknown';
  }
}

/* หาพิกัดจุดติดตั้งจากแท็บ Locations (คอลัมน์: code|name|lat|lng|radius|active|secret)
 * จับคู่ด้วย code/name แบบตรงเป๊ะก่อน แล้วค่อยเผื่อแบบ "มีคำนี้อยู่ในชื่อ" (กันสะกดต่างเล็กน้อย)
 * คืน {lat,lng,name} | null ถ้าไม่พบ */
function deviceLocLookup_(nameOrCode) {
  const key = String(nameOrCode || '').trim();
  if (!key) return null;
  try {
    const sh = getOrCreateTab(T.LOC);
    const data = sh.getDataRange().getValues();
    const ok = function (row) {
      const lat = parseFloat(row[2]), lng = parseFloat(row[3]);
      return (!isNaN(lat) && !isNaN(lng)) ? { lat: lat, lng: lng, name: String(row[1] || '').trim() } : null;
    };
    // รอบ 1: ตรงเป๊ะ (code หรือ name)
    for (let i = 1; i < data.length; i++) {
      const code = String(data[i][0] || '').trim();
      const name = String(data[i][1] || '').trim();
      if (code === key || name === key) { const r = ok(data[i]); if (r) return r; }
    }
    // รอบ 2: เผื่อสะกดต่าง — ชื่อจุดมีคำที่ตั้งไว้ หรือกลับกัน
    for (let i = 1; i < data.length; i++) {
      const name = String(data[i][1] || '').trim();
      if (name && (name.indexOf(key) >= 0 || key.indexOf(name) >= 0)) { const r = ok(data[i]); if (r) return r; }
    }
  } catch (e) { console.error('deviceLocLookup_', e); }
  return null;
}

/* ตัวช่วยตรวจ: ดูรายชื่อจุดทั้งหมดในแท็บ Locations (รันจาก editor ถ้าพิกัดไม่ขึ้น)
   แล้วเอาชื่อที่ถูกต้องไปใส่ใน DEVICE_LOC_BY_SN */
function deviceLocList() {
  const sh = getOrCreateTab(T.LOC);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0] && !data[i][1]) continue;
    Logger.log('code="' + data[i][0] + '" name="' + data[i][1] + '" lat=' + data[i][2] + ' lng=' + data[i][3]);
  }
}

/* ── ทดสอบใน editor: เขียนสแกนปลอม 1 แถว (รหัส 11111 เวลาตอนนี้) ──
   ชื่อฟังก์ชันห้ามลงท้ายด้วย _ ไม่งั้น Apps Script ซ่อนจากเมนู Run */
function testDeviceIngest() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const dt = now.toISOString().slice(0, 19).replace('T', ' ');
  // เปลี่ยน pin '11111' เป็นรหัสพนักงานจริง จะเห็นชื่อ+สาขาขึ้นจากทะเบียนด้วย
  // (sn ต้องตรง DEVICE_LOC_BY_SN จะได้เห็น lat/lng ของจุดติดตั้งเติมให้)
  const out = actionDeviceIngest_({
    key: PropertiesService.getScriptProperties().getProperty('DEVICE_KEY'),
    sn: '4368220400140',
    records: [{ pin: '11111', dt: dt, status: '0', verify: '1' }],
  });
  Logger.log(JSON.stringify(out));
}
