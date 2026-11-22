/* rattana-gate.js v1.3 — ด่านกลาง: พนักงานต้องลงทะเบียนก่อนใช้แอปภายในของรัตนไพบูลย์ (Surat 2026-11-22)
   ลงทะเบียน = แอดไลน์ OA Rattana-แจ้งข่าว + ยอมรับ PDPA และข้อตกลงรักษาความลับ (เก็บใน Users Sheet คอลัมน์ AH-AJ)
   ใส่ 1 บรรทัดก่อน </body> ของแอปภายใน:
     <script src="https://rattanaphaiboon.github.io/app/rattana-gate.js" defer></script>
   · อ่านอีเมลคนที่ล็อกอินจาก localStorage rattana_session / rattanaUser (ล็อกอินกลางของ Hub)
     แอปที่ล็อกอินแบบอื่น ให้เรียก RattanaGate.check(email) หลังล็อกอินเสร็จ
   · ถามหลังบ้าน Rattana Ticket ?action=regCheck · ผ่านแล้วจำในเครื่อง 1 วัน
   · ต่อหลังบ้านไม่ได้ = ไม่บัง (กันแอปใช้ไม่ได้ทั้งบริษัท)
   · ห้ามใส่ในแอปที่คนนอกใช้ (ROO, SupplyLink, Pre-Book, SMR Service Desk) และหน้า Ticket (ที่กรอกฟอร์ม) */
(function () {
  if (window.RattanaGate) return;
  var VER = 'v1.3';   /* v1.3 แอปวาดหน้าใหม่แล้วหน้าบังหาย → ใส่กลับเอง (ตรวจทุก 1 วิ) · v1.2 หน้าบังแบบ Rattana CI (กรมท่า-ทอง · การ์ดกระจก · 3 ขั้น) · v1.1 ตรวจซ้อนกันไม่หาย */
  var API = 'https://script.google.com/macros/s/AKfycby84X40inD9qNolqDB2M-iIC4MufFMD5VQAubf_iwZGb77FRWRx-ij04xzIx5DCP32_hQ/exec';
  var OA = 'https://line.me/R/ti/p/@869ayfup', KEY = 'rattana_gate_ok', busy = false, last = '', queued = null, blockedFor = '', gateEl = null, cssEl = null;
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function pick(o) {   /* หาอีเมลใน object ที่แอปเก็บคนล็อกอิน: .email · .data.email · .user.email · .me.email */
    if (!o || typeof o !== 'object') return '';
    var c = [o.email, o.data && o.data.email, o.user && o.user.email, o.me && o.me.email];
    for (var i = 0; i < c.length; i++) { var e = String(c[i] || '').replace(/\s+/g, '').toLowerCase(); if (/^[^@]+@[^@]+\.[^@]+$/.test(e)) return e; }
    return '';
  }
  function emailNow() {
    var ks = ['rattana_session', 'rattanaUser', 'rf_session'];   /* ล็อกอินกลางของ Hub + R-flow */
    for (var i = 0; i < ks.length; i++) {
      try {
        var p = JSON.parse(ls(ks[i]) || 'null'); if (!p) continue;
        if (p.exp && Date.now() > p.exp) continue;
        var e = pick(p); if (e) return e;
      } catch (x) {}
    }
    try { if (typeof currentUser !== 'undefined') { var e1 = pick(currentUser); if (e1) return e1; } } catch (x) {}   /* แอปที่เก็บคนล็อกอินในตัวแปร currentUser */
    try { var e2 = pick(window.currentUser); if (e2) return e2; } catch (x) {}
    return '';
  }
  function okCached(e) { try { var c = JSON.parse(ls(KEY) || 'null'); return !!c && c.e === e && c.until > Date.now(); } catch (x) { return false; } }
  function setOk(e) { try { localStorage.setItem(KEY, JSON.stringify({ e: e, until: Date.now() + 864e5 })); } catch (x) {} }
  function unblock() { blockedFor = ''; var d = document.getElementById('rtGate'); if (d && d.parentNode) d.parentNode.removeChild(d); var c = document.getElementById('rtGateCss'); if (c && c.parentNode) c.parentNode.removeChild(c); try { document.documentElement.style.overflow = ''; } catch (x) {} }
  var CSS = '#rtGate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;overflow:auto;' +
    'font-family:"IBM Plex Sans Thai",Inter,"Leelawadee UI",system-ui,sans-serif;color:#011e3e;-webkit-font-smoothing:antialiased;' +
    'background:radial-gradient(60% 45% at 18% 12%,rgba(252,183,15,.22),transparent 70%),radial-gradient(55% 50% at 88% 90%,rgba(56,132,255,.28),transparent 70%),linear-gradient(160deg,#102b49 0%,#011e3e 55%,#06172b 100%)}' +
    '#rtGate *{box-sizing:border-box}' +
    '#rtGate .g-card{width:100%;max-width:420px;border-radius:24px;padding:24px 22px 18px;background:rgba(255,255,255,.94);border:1px solid rgba(255,255,255,.95);' +
    'box-shadow:0 30px 60px -20px rgba(0,0,0,.55),inset 0 1px 0 #fff;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);animation:rtgIn .42s cubic-bezier(.2,.9,.25,1)}' +
    '@keyframes rtgIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
    '#rtGate .g-logo{display:block;height:34px;margin:0 auto 14px}' +
    '#rtGate .g-badge{width:58px;height:58px;margin:0 auto 12px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:#fff3d2;color:#8a6200;box-shadow:inset 0 0 0 1px rgba(252,183,15,.45)}' +
    '#rtGate h2{margin:0;font-size:22px;font-weight:700;text-align:center;letter-spacing:.1px}' +
    '#rtGate .g-sub{margin:6px 0 16px;text-align:center;font-size:14.5px;line-height:1.6;color:#4a5d75}' +
    '#rtGate ol{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}' +
    '#rtGate li{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-radius:14px;background:rgba(1,30,62,.04);font-size:14.5px;line-height:1.5}' +
    '#rtGate li b{font-weight:700}' +
    '#rtGate .g-n{flex:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13.5px;color:#011e3e;' +
    'background:linear-gradient(180deg,#ffd35a,#fcb70f 55%,#eaa300);box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}' +
    '#rtGate .g-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;padding:12px 16px;border-radius:999px;font:inherit;font-size:16px;font-weight:700;text-decoration:none;cursor:pointer;border:0;transition:filter .14s,transform .14s}' +
    '#rtGate .g-btn:active{transform:scale(.98)}' +
    '#rtGate .g-gold{color:#011e3e;background:linear-gradient(180deg,#ffd35a 0%,#fcb70f 55%,#eaa300 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -2px 0 rgba(138,98,0,.25),0 12px 24px -10px rgba(234,163,0,.8)}' +
    '#rtGate .g-gold:hover{filter:brightness(1.04)}' +
    '#rtGate .g-line{width:22px;height:22px;border-radius:6px;background:#06c755;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;letter-spacing:-.2px}' +
    '#rtGate .g-glass{margin-top:10px;color:#011e3e;background:rgba(255,255,255,.86);box-shadow:inset 0 0 0 1px rgba(1,30,62,.14)}' +
    '#rtGate .g-glass:hover{background:#fff}' +
    '#rtGate .g-msg{margin-top:12px;text-align:center;font-size:12.5px;color:#5b6b82;line-height:1.5}' +
    '#rtGate .g-msg.is-warn{color:#b45309;font-weight:600}' +
    '@media (max-width:380px){#rtGate .g-card{padding:20px 16px 16px}#rtGate h2{font-size:20px}}';
  function block(e) {
    if (document.getElementById('rtGate')) return;
    blockedFor = e;
    if (!document.getElementById('rtGateFont')) { try { var f = document.createElement('link'); f.id = 'rtGateFont'; f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap'; document.head.appendChild(f); } catch (x) {} }
    var st = cssEl = document.createElement('style'); st.id = 'rtGateCss'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
    var d = gateEl = document.createElement('div'); d.id = 'rtGate'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'rtGateT');
    d.innerHTML = '<div class="g-card">' +
      '<img class="g-logo" src="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-logo-navy.png" alt="RATTANA" onerror="this.style.display=\'none\'">' +
      '<div class="g-badge"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg></div>' +
      '<h2 id="rtGateT">ลงทะเบียนก่อนใช้งาน</h2>' +
      '<p class="g-sub">แอปภายในรัตนไพบูลย์ ต้องยืนยันตัวตน<br>และยอมรับ PDPA กับข้อตกลงรักษาความลับก่อน</p>' +
      '<ol><li><span class="g-n">1</span><span>แอดไลน์ <b>Rattana-แจ้งข่าว</b></span></li>' +
      '<li><span class="g-n">2</span><span>กดลิงก์ฟอร์มที่ส่งมา (แอดไว้แล้ว กดเมนู <b>ลงทะเบียน</b>)</span></li>' +
      '<li><span class="g-n">3</span><span>กลับมากด <b>ตรวจอีกครั้ง</b> ใช้งานได้เลย</span></li></ol>' +
      '<a class="g-btn g-gold" href="' + OA + '" target="_blank" rel="noopener"><span class="g-line">LINE</span>แอดไลน์และลงทะเบียน</a>' +
      '<button type="button" class="g-btn g-glass" id="rtGateRe">ลงทะเบียนแล้ว ตรวจอีกครั้ง</button>' +
      '<div class="g-msg" id="rtGateMsg">บัญชี ' + e.replace(/[<>&"]/g, '') + ' · ด่าน ' + VER + '</div></div>';
    (document.body || document.documentElement).appendChild(d);
    try { document.documentElement.style.overflow = 'hidden'; } catch (x) {}
    document.getElementById('rtGateRe').onclick = function () { var m = document.getElementById('rtGateMsg'); if (m) { m.className = 'g-msg'; m.textContent = 'กำลังตรวจ…'; } check(e, true); };
  }
  function next() { busy = false; if (queued) { var q = queued; queued = null; check(q.e, q.f); } }
  function check(e, force) {
    e = String(e || '').replace(/\s+/g, '').toLowerCase();
    if (!e) return;
    if (busy) { queued = { e: e, f: force }; return; }
    if (!force && okCached(e)) { unblock(); return; }
    busy = true;
    fetch(API + '?action=regCheck&email=' + encodeURIComponent(e) + '&n=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        next();
        if (!j || !j.ok) return;   /* ตอบผิดปกติ = ไม่บัง */
        if (j.reg) { setOk(e); unblock(); }
        else { block(e); var m = document.getElementById('rtGateMsg'); if (m && force) { m.className = 'g-msg is-warn'; m.textContent = 'ยังไม่พบการลงทะเบียน ถ้าเพิ่งกรอก รอสัก 1 นาทีแล้วกดอีกครั้ง'; } }
      })
      .catch(function () { next(); });
  }
  function tick() { var e = emailNow(); if (e && e !== last) { last = e; check(e, false); } }
  window.RattanaGate = { ver: VER, check: function (e) { last = String(e || '').replace(/\s+/g, '').toLowerCase(); check(last, false); } };
  /* v1.3 แอปที่วาดหน้าใหม่ทั้งหน้า (เช่น Hub) ลบหน้าบังทิ้ง → ใส่กลับ */
  function guard() {
    if (!blockedFor || !gateEl) return;
    if (!document.getElementById('rtGateCss') && cssEl) (document.head || document.documentElement).appendChild(cssEl);
    if (!document.getElementById('rtGate')) { (document.body || document.documentElement).appendChild(gateEl); try { document.documentElement.style.overflow = 'hidden'; } catch (x) {} }
  }
  tick(); setInterval(tick, 3000); setInterval(guard, 1000);   /* ล็อกอินทีหลังก็ตรวจ */
})();
