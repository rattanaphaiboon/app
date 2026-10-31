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

/* ★★ v3.454 แจ้งเตือนเด้งบนมือถือ (Web Push แบบ Rattana One Chat)
   หลังบ้าน = Supabase Edge Function "dman-push" · payload {title, body, url, tag}
   tag เดียวกัน = ทับอันเดิม (ไม่ท่วมจอ) · renotify = สั่นซ้ำเมื่อมีอันใหม่จริง
   กดแจ้งเตือน → หน้าต่าง D-MAN ที่เปิดอยู่ไปที่ url นั้น (ไม่มี = เปิดใหม่) */
self.addEventListener('push', function(e){
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'D-MAN';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: 'd-man-icon.png',
    badge: 'd-man-icon.png',
    tag: d.tag || 'dman',
    renotify: true,
    data: { url: d.url || PAGE }
  }));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || PAGE, self.location.href).href;
  e.waitUntil((async function(){
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      try {
        if (isMyPage(new URL(w.url))) {
          await w.focus();
          try { await w.navigate(target); } catch(err) {}
          return;
        }
      } catch(err) {}
    }
    await self.clients.openWindow(target);
  })());
});
