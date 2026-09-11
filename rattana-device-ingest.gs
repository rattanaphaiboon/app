/****************************************************************************************
 * rattana-device-ingest — จุดรับสแกนจากเครื่อง ZKTeco (ผ่าน Cloudflare Worker)  v0.2
 *                                                                          2026-09-11
 *
 * Cloudflare Worker (rattana-adms) แกะ protocol iclock ของเครื่องแล้ว POST JSON มาที่
 * backend นี้ action=deviceIngest — ฟังก์ชันนี้เขียนสแกนลง CheckinLog(ชีท) + Supabase
 * ด้วยท่อเดียวกับ actionCheckin เป๊ะ → สูตร "คิดสรุป/สรุปวัน/ลงเวลาAuto" ขยับเองอัตโนมัติ
 *
 * กันซ้ำ (idempotent): client_id = 'DEV-<SN>-<PIN>-<yyyyMMddHHmmss>'
 *   เครื่อง push ซ้ำ / Worker retry กี่รอบก็ไม่เบิ้ล (เช็คคอลัมน์ Q ก่อน + upsert Supabase)
 *
 * ── ติดตั้ง ────────────────────────────────────────────────────────────────────
 * 1) วางไฟล์นี้เป็นไฟล์ใหม่ในโปรเจกต์ Apps Script เดียวกับ rattana-backend.gs
 * 2) rattana-backend.gs → ในฟังก์ชัน handle() ใต้บล็อก registerUserSlip เพิ่ม 3 บรรทัด:
 *        if (action === 'deviceIngest') return jsonOut(actionDeviceIngest_(p));
 * 3) Script Properties เพิ่ม:  DEVICE_KEY = <รหัสลับสักชุด>  (ตัวเดียวกับที่ตั้งใน Worker)
 * 4) Deploy → Manage deployments → Edit → New version → Deploy  (ต้องออกเวอร์ชันใหม่)
 * 5) ทดสอบใน editor: Run → testDeviceIngest (เขียนสแกนปลอม 1 แถวลงชีท+Supabase)
 ***************************************************************************************/

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
  const existing = deviceExistingCids_(logSh);
  let added = 0, dup = 0, bad = 0;

  records.forEach(function (r) {
    const pin = String(r.pin || '').trim();
    const inst = deviceInstant_(String(r.dt || ''));
    if (!pin || !inst) { bad++; return; }

    const cid = 'DEV-' + sn + '-' + pin + '-' + inst.stamp;
    if (existing.has(cid)) { dup++; return; }

    const who = deviceWho_(pin);
    const scannedBy = 'device:' + deviceVerifyLabel_(r.verify);
    const type = deviceType_(r.status);
    const d = new Date(inst.iso);

    // Supabase (ถ้าตั้ง key แล้ว) — upsert กันซ้ำด้วย client_id
    if (sbReady_()) {
      try {
        sbUpsert_('checkin_log', {
          client_id: cid, emp_id: pin, name: who.name,
          scan_at: d.toISOString(), type: type,
          branch: who.branch, lat: null, lng: null, distance: null, face_dist: null,
          scanned_by: scannedBy, photo_path: '',
          retroactive: '', reason: '',
        }, 'client_id');
      } catch (e) { console.error('deviceIngest sb ' + cid, e); }
    }

    // ชีท CheckinLog — 17 คอลัมน์ ตรงกับ actionCheckin (A=Date … Q=clientId)
    logSh.appendRow([
      d, pin, who.name, inst.dmy, inst.hms,
      type, who.branch,
      '', '', '', '',
      scannedBy, '',
      '',
      '', 'device-adms', cid,
    ]);
    existing.add(cid);
    added++;
  });

  return { ok: true, sn: sn, added: added, dup: dup, bad: bad };
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
    stamp: Y + Mo + D + H + Mi + S,       // yyyyMMddHHmmss สำหรับ client_id
    dmy: D + '/' + Mo + '/' + Y,          // dd/MM/yyyy (คอลัมน์ D)
    hms: H + ':' + Mi + ':' + S,          // HH:mm:ss   (คอลัมน์ E)
  };
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

/* ZKTeco status → in/out (แค่ป้าย — สูตรสรุปวันคิด IN/OUT จาก min/max เวลาต่อวันเองอยู่แล้ว) */
function deviceType_(st) {
  const s = String(st || '').trim();
  return (s === '1' || s === '2' || s === '5') ? 'out' : 'in';
}

/* client_id ที่มีแล้วทั้งคอลัมน์ Q — อ่านครั้งเดียวต่อการเรียก */
function deviceExistingCids_(sh) {
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

/* ── ทดสอบใน editor: เขียนสแกนปลอม 1 แถว (รหัส 11111 เวลาตอนนี้) ──
   ชื่อฟังก์ชันห้ามลงท้ายด้วย _ ไม่งั้น Apps Script ซ่อนจากเมนู Run */
function testDeviceIngest() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const dt = now.toISOString().slice(0, 19).replace('T', ' ');
  const out = actionDeviceIngest_({
    key: PropertiesService.getScriptProperties().getProperty('DEVICE_KEY'),
    sn: 'TEST',
    records: [{ pin: '11111', dt: dt, status: '0', verify: '1' }],
  });
  Logger.log(JSON.stringify(out));
}
