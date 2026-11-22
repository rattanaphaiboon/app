/* rattana-gate.js v1.1 — ด่านกลาง: พนักงานต้องลงทะเบียนก่อนใช้แอปภายในของรัตนไพบูลย์ (Surat 2026-11-22)
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
  var VER = 'v1.1';   /* v1.1 ตรวจซ้อนกันไม่หาย (คิวอีเมลล่าสุด) */
  var API = 'https://script.google.com/macros/s/AKfycby84X40inD9qNolqDB2M-iIC4MufFMD5VQAubf_iwZGb77FRWRx-ij04xzIx5DCP32_hQ/exec';
  var OA = 'https://line.me/R/ti/p/@869ayfup', KEY = 'rattana_gate_ok', busy = false, last = '', queued = null;
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
  function unblock() { var d = document.getElementById('rtGate'); if (d && d.parentNode) d.parentNode.removeChild(d); try { document.documentElement.style.overflow = ''; } catch (x) {} }
  function block(e) {
    if (document.getElementById('rtGate')) return;
    var d = document.createElement('div'); d.id = 'rtGate'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:rgba(8,20,40,.95);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Sarabun,"Leelawadee UI",system-ui,sans-serif');
    d.innerHTML = '<div style="background:#fff;color:#0b2747;max-width:400px;width:100%;border-radius:20px;padding:26px 22px;text-align:center;box-sizing:border-box">' +
      '<div style="font-size:21px;font-weight:800;margin-bottom:10px">ลงทะเบียนก่อนใช้งาน</div>' +
      '<div style="font-size:15px;line-height:1.65;margin-bottom:18px">แอปภายในบริษัทต้องลงทะเบียนก่อน<br>แอดไลน์ <b>Rattana-แจ้งข่าว</b> แล้วกรอกฟอร์มที่ส่งมา<br>(ยืนยันตัวตน + ยอมรับ PDPA และรักษาความลับ)<br><span style="color:#5b6b82">แอดไว้แล้ว: กดเมนู <b>ลงทะเบียน</b> ในแชท</span></div>' +
      '<a href="' + OA + '" target="_blank" rel="noopener" style="display:block;padding:14px;border-radius:999px;background:#06c755;color:#fff;font-weight:800;text-decoration:none;font-size:16px;margin-bottom:10px">แอดไลน์และลงทะเบียน</a>' +
      '<button type="button" id="rtGateRe" style="width:100%;padding:12px;border-radius:999px;border:1px solid #c9d3e2;background:#fff;color:#0b2747;font:inherit;font-weight:700;cursor:pointer">ลงทะเบียนแล้ว ตรวจอีกครั้ง</button>' +
      '<div id="rtGateMsg" style="font-size:12.5px;color:#5b6b82;margin-top:12px">บัญชี ' + e.replace(/[<>&"]/g, '') + ' · ด่าน ' + VER + '</div></div>';
    (document.body || document.documentElement).appendChild(d);
    try { document.documentElement.style.overflow = 'hidden'; } catch (x) {}
    document.getElementById('rtGateRe').onclick = function () { var m = document.getElementById('rtGateMsg'); if (m) m.textContent = 'กำลังตรวจ…'; check(e, true); };
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
        else { block(e); var m = document.getElementById('rtGateMsg'); if (m && force) m.textContent = 'ยังไม่พบการลงทะเบียน ถ้าเพิ่งกรอก รอสัก 1 นาทีแล้วกดอีกครั้ง'; }
      })
      .catch(function () { next(); });
  }
  function tick() { var e = emailNow(); if (e && e !== last) { last = e; check(e, false); } }
  window.RattanaGate = { ver: VER, check: function (e) { last = String(e || '').replace(/\s+/g, '').toLowerCase(); check(last, false); } };
  tick(); setInterval(tick, 3000);   /* ล็อกอินทีหลังก็ตรวจ */
})();
