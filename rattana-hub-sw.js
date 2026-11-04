/* Rattana Hub service worker
   หน้าที่เดียว: ให้ติดตั้งเป็นแอปจริงได้ + เปิด Hub ได้ตอนเน็ตหลุด
   ★ ดักเฉพาะหน้า rattana-hub.html — โฟลเดอร์ /app/ มีหลายแอป ห้ามยุ่งหน้าอื่น
   ★ network-first เสมอ ห้ามเปลี่ยนเป็น cache-first (ไม่งั้นค้างเวอร์ชันเก่า) */
const CACHE = 'rattana-hub-shell-v1';
const PAGE  = 'rattana-hub.html';

function isMyPage(url) {
  return url.origin === self.location.origin && url.pathname.endsWith('/' + PAGE);
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add(PAGE); }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k.indexOf('rattana-hub-shell-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (!isMyPage(url)) return;

  e.respondWith((async function () {
    try {
      const net = await fetch(req);
      if (net && net.ok) {
        try { const c = await caches.open(CACHE); await c.put(PAGE, net.clone()); } catch (err) {}
      }
      return net;
    } catch (err) {
      const hit = await caches.match(PAGE);
      return hit || Response.error();
    }
  })());
});
