/* D-MAN service worker
   หน้าที่มีอย่างเดียว: ทำให้ติดตั้งเป็นแอปจริงได้ + เปิดแอปได้ตอนเน็ตหลุด
   ★★ เป็น network-first เสมอ ห้ามเปลี่ยนเป็น cache-first เด็ดขาด
      ไม่งั้นคนขับจะค้างอยู่แอปเวอร์ชันเก่าโดยไม่รู้ตัว (แอปนี้อัปเดตแทบทุกวัน)
   แคชไว้แค่ไฟล์หน้าแอปไฟล์เดียว ไว้ใช้ตอนเน็ตใช้ไม่ได้จริง ๆ */
const CACHE = 'dman-shell-v1';
const PAGE  = 'rattana-deli-man-app.html';

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
  if (url.origin !== self.location.origin) return;          // ชีท/Google/แผนที่ ปล่อยผ่านตามปกติ

  const isPage = (req.mode === 'navigate') || url.pathname.endsWith('.html');
  if (!isPage) return;                                       // ไฟล์อื่นไม่ยุ่ง

  e.respondWith((async function(){
    try {
      const net = await fetch(req);                          // เอาของใหม่เสมอเมื่อเน็ตใช้ได้
      try { const c = await caches.open(CACHE); await c.put(PAGE, net.clone()); } catch(err){}
      return net;
    } catch(err) {
      const hit = await caches.match(PAGE);                  // เน็ตหลุด = เปิดของที่เก็บไว้
      return hit || Response.error();
    }
  })());
});
