/* จัดคิวรถ (delivery-queue-app.html) service worker — v9.561
   หน้าที่มีอย่างเดียว: ทำให้ติดตั้งเป็นแอปจริงได้ (Android สร้าง WebAPK) + เปิดแอปได้ตอนเน็ตหลุด
   เดิม manifest เป็น data: URL และไม่มี service worker → ติดตั้งแล้วได้แค่ "ทางลัด" กดไอคอนเปิดเข้าเบราว์เซอร์ (อาการเดียวกับ D-MAN ก่อน v3.350)

   ★★ ห้ามยุ่งกับหน้าอื่นในโฟลเดอร์ /app/ เด็ดขาด
      โฟลเดอร์นี้มีหลายแอป (D-MAN/HR/เช็คสต็อก ฯลฯ) — ดักเฉพาะหน้า delivery-queue-app.html หน้าเดียว
      (D-MAN v3.350 เคยดักทุกไฟล์ .html แล้วแคชทับกันด้วยคีย์เดียว = กดแอปหนึ่งแล้วโผล่อีกแอป)
   ★★ network-first เสมอ ห้ามเปลี่ยนเป็น cache-first
      แอปนี้อัปเดตแทบทุกวัน ถ้า cache-first คนจัดรถจะค้างเวอร์ชันเก่าโดยไม่รู้ตัว */
const CACHE = 'dq-shell-v1';
const PAGE  = 'delivery-queue-app.html';              // คีย์แคช = หน้านี้หน้าเดียว

function isMyPage(url){
  return url.origin === self.location.origin && url.pathname.endsWith('/' + PAGE);
}

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.add(PAGE); }).catch(function(){}));
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    const keys = await caches.keys();
    // ลบเฉพาะแคชของแอปนี้รุ่นเก่า (dq-shell-*) — แคชของแอปอื่นในโดเมนเดียวกันไม่แตะ
    await Promise.all(keys.filter(function(k){ return k.indexOf('dq-shell-') === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch(err){ return; }
  if (!isMyPage(url)) return;                         // ไฟล์อื่น/แอปอื่น/ชีท/GAS ปล่อยผ่านทั้งหมด

  e.respondWith((async function(){
    try {
      const net = await fetch(req);                   // เอาของใหม่เสมอเมื่อเน็ตใช้ได้
      try { if (net && net.ok) { const c = await caches.open(CACHE); await c.put(PAGE, net.clone()); } } catch(err){}
      return net;
    } catch(err) {
      const hit = await caches.match(PAGE);           // เน็ตหลุด = เปิดของที่เก็บไว้
      return hit || Response.error();
    }
  })());
});
