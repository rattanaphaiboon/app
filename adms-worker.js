/****************************************************************************************
 * rattana-adms — Cloudflare Worker v0.2 (ต่อท่อจริง)  2026-09-11
 *
 * ตัวรับข้อมูลจากเครื่องสแกน ZKTeco (protocol ADMS/iclock) แทน sync.humansoft.work
 *   เครื่อง ──push──> Worker นี้ ──POST JSON──> Apps Script (action=deviceIngest)
 *                                              └─> ชีท CheckinLog + Supabase → สรุปวัน
 *
 * v0.2 ต่างจาก v0.1: แกะ ATTLOG แล้วส่งต่อเข้า backend จริง (v0.1 แค่จดดูเฉยๆ)
 *   - ส่งสำเร็จ → ตอบเครื่อง OK: N (เครื่องเคลียร์ระเบียนนั้น)
 *   - ส่งล้มเหลว/ยังไม่ตั้งค่า → ตอบ error (เครื่องเก็บค้างไว้ในตัว แล้ว push ซ้ำเอง = ไม่มีข้อมูลหาย)
 *   - client_id ฝั่ง backend กันซ้ำอยู่แล้ว → push ซ้ำกี่รอบก็ไม่เบิ้ล
 *
 * ── ตั้งค่า Worker (ทำครั้งเดียว) ────────────────────────────────────────────────
 * Cloudflare → rattana-adms → Settings → Variables and Secrets → + Add  (2 ตัว):
 *   ADMS_BACKEND_URL = <Apps Script Web App /exec URL ของ rattana-backend>
 *   DEVICE_KEY       = <รหัสลับชุดเดียวกับ Script Property DEVICE_KEY ใน backend>
 * (ใส่แล้วกด Deploy ซ้ำหนึ่งครั้ง) — ยังไม่ใส่ก็ไม่พัง: เครื่องจะ buffer ไว้จนกว่าจะตั้งเสร็จ
 *
 * ── หน้าดูสด ──  https://rattana-adms.patcha-ruk.workers.dev/peek
 *   (log อยู่ในหน่วยความจำชั่วคราว/ต่อ instance — ดูคร่าวๆ พอ; ตัวจริงยึดชีท+Supabase)
 ***************************************************************************************/

const RING = [];
const MAX_RING = 200;

function note(line) {
  const t = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  RING.push('[' + t + '] ' + line);
  while (RING.length > MAX_RING) RING.shift();
  console.log(line);
}

function text(s, status) {
  return new Response(s, { status: status || 200, headers: { 'Content-Type': 'text/plain' } });
}

/* แกะ body ของ ATTLOG → [{pin, dt, status, verify}]
 * รูปแบบมาตรฐาน ZKTeco: PIN <TAB> YYYY-MM-DD HH:MM:SS <TAB> status <TAB> verify <TAB> ...
 * ใช้ regex กันทั้งแบบคั่น TAB และคั่นช่องว่าง (datetime มีช่องว่างกลาง จึงต้องจับด้วย pattern) */
function parseAttlog(body) {
  const recs = [];
  String(body || '').split('\n').forEach(function (line) {
    line = line.trim();
    if (!line) return;
    const m = line.match(/^(\S+)[\t ]+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})[\t ]+(\d+)(?:[\t ]+(\d+))?/);
    if (!m) return;
    recs.push({ pin: m[1], dt: m[2].replace('T', ' '), status: m[3] || '0', verify: m[4] || '' });
  });
  return recs;
}

async function forward(env, sn, records) {
  if (!env || !env.ADMS_BACKEND_URL || !env.DEVICE_KEY) return { ok: false, reason: 'not-configured' };
  try {
    const resp = await fetch(env.ADMS_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deviceIngest', key: env.DEVICE_KEY, sn: sn, records: records }),
    });
    const txt = await resp.text();
    return { ok: resp.ok && txt.indexOf('"ok":true') >= 0, status: resp.status, body: txt.slice(0, 200) };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const qs = url.searchParams.toString();
    const sn = url.searchParams.get('SN') || '';
    const table = (url.searchParams.get('table') || '').toUpperCase();

    // ── หน้าเฝ้าดูสำหรับคน ──
    if (path.endsWith('/peek')) {
      const cfg = (env && env.ADMS_BACKEND_URL && env.DEVICE_KEY)
        ? '🟢 ต่อ backend แล้ว' : '🟠 ยังไม่ได้ตั้ง ADMS_BACKEND_URL / DEVICE_KEY';
      const rows = RING.slice().reverse().map(function (l) {
        return '<div class="r">' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</div>';
      }).join('') || '<div class="r none">— ยังไม่มีอะไรเข้ามา —</div>';
      const html = '<!doctype html><html><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<meta http-equiv="refresh" content="5">'
        + '<title>rattana-adms จุดสังเกตการณ์</title><style>'
        + 'body{font-family:monospace;background:#0d1b3e;color:#e8ecf7;margin:0;padding:12px}'
        + 'h1{font-size:15px;margin:0 0 4px}small{color:#9fb0d8}'
        + '.r{background:#16265c;border-radius:6px;padding:6px 8px;margin:6px 0;font-size:11px;word-break:break-all}'
        + '.none{color:#9fb0d8;background:none}'
        + '</style></head><body><h1>📡 rattana-adms v0.2 — จุดสังเกตการณ์</h1>'
        + '<small>' + cfg + ' · หน้ารีเฟรชเองทุก 5 วินาที · รวม ' + RING.length + ' รายการ</small>'
        + rows + '</body></html>';
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ── จากนี้ = เครื่องคุยเข้ามา ──
    let body = '';
    if (request.method === 'POST') {
      try { body = await request.text(); } catch (e) { body = ''; }
    }

    // handshake: GET .../iclock/cdata?SN=xxx&options=all → ตอบ option ให้เครื่องเริ่ม push
    if (path.indexOf('/iclock/cdata') >= 0 && request.method === 'GET') {
      note('HANDSHAKE SN=' + sn + (qs ? ' ?' + qs.slice(0, 120) : ''));
      return text([
        'GET OPTION FROM: ' + sn,
        'ATTLOGStamp=None', 'OPERLOGStamp=None', 'ATTPHOTOStamp=None',
        'ErrorDelay=30', 'Delay=10',
        'TransTimes=00:00;14:05', 'TransInterval=1', 'TransFlag=1111000000',
        'TimeZone=7', 'Realtime=1', 'Encrypt=None',
      ].join('\n'));
    }

    // เครื่องส่งข้อมูล
    if (path.indexOf('/iclock/cdata') >= 0 && request.method === 'POST') {
      if (table === 'ATTLOG') {
        const records = parseAttlog(body);
        // body มีของแต่แกะไม่ออก = อย่าเพิ่ง ACK (กันข้อมูลหาย) + จด body ดิบไว้แก้ parser
        if (!records.length && body.trim()) {
          note('ATTLOG SN=' + sn + ' ⚠ แกะไม่ออก BODY: ' + body.slice(0, 400));
          return text('ERROR parse', 500);
        }
        const r = await forward(env, sn, records);
        note('ATTLOG SN=' + sn + ' recs=' + records.length + ' → '
          + (r.ok ? 'ส่งเข้าระบบ OK' : 'FAIL(' + (r.reason || r.status) + ')')
          + (records[0] ? ' | ตัวอย่าง ' + JSON.stringify(records[0]) : ''));
        if (r.ok) return text('OK: ' + records.length);
        return text('ERROR forward', 500);   // เครื่อง buffer + push ซ้ำเอง
      }
      // OPERLOG (เหตุการณ์เครื่อง) / อื่นๆ — รับทราบเฉยๆ ไม่ต้องเก็บ
      const n = body.split('\n').filter(function (x) { return x.trim(); }).length;
      note((table || 'DATA') + ' SN=' + sn + ' lines=' + n);
      return text('OK: ' + n);
    }

    // เครื่องแวะถามคำสั่ง / อื่นๆ ใต้ /iclock/ → ตอบ OK
    if (path.indexOf('/iclock/') >= 0) return text('OK');

    return text('rattana-adms v0.2');
  },
};
