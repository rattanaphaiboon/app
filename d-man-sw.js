/* D-MAN service worker
   หน้าที่มีอย่างเดียว: ทำให้ติดตั้งเป็นแอปจริงได้ + เปิดแอปได้ตอนเน็ตหลุด

   ★★ ห้ามยุ่งกับหน้าอื่นในโฟลเดอร์ /app/ เด็ดขาด
      โฟลเดอร์นี้มีหลายแอป (HR/จัดรถ/เช็คสต็อก ฯลฯ) รอบแรก (v3.350) เขียนดักทุกไฟล์ .html
      แล้วแคชทับกันด้วยคีย์เดียว = กดแอปหนึ่งแล้วโผล่อีกแอป → v3.351 ดักเฉพาะหน้า D-MAN เท่านั้น
   ★★ เป็น network-first เสมอ ห้ามเปลี่ยนเป็น cache-first
      ไม่งั้นคนขับจะค้างอยู่แอปเวอร์ชันเก่าโดยไม่รู้ตัว (แอปนี้อัปเดตแทบทุกวัน) */
const CACHE = 'dman-shell-v2';
const PAGE  = 'rattana-deli-man-app.html';           // คีย์แคช = หน้านี้หน้าเดียว

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
    await Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch(err){ return; }
  if (!isMyPage(url)) return;                        // ไฟล์อื่น/แอปอื่น/ชีท ปล่อยผ่านทั้งหมด

  e.respondWith((async function(){
    try {
      const net = await fetch(req);                  // เอาของใหม่เสมอเมื่อเน็ตใช้ได้
      try { const c = await caches.open(CACHE); await c.put(PAGE, net.clone()); } catch(err){}
      return net;
    } catch(err) {
      const hit = await caches.match(PAGE);          // เน็ตหลุด = เปิดของที่เก็บไว้
      return hit || Response.error();
    }
  })());
});
