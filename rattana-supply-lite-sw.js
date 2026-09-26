// คลังอุปกรณ์ รัตนไพบูลย์ — service worker สำหรับติดตั้งเป็นแอปบนหน้าจอ
// ขอบเขตแค่ไฟล์ rattana-supply-lite.html (ตั้งตอน register) — ไม่ไปยุ่งกับแอปอื่นในโฟลเดอร์เดียวกัน
// จับเฉพาะการเปิดหน้า: ออนไลน์ = ดึงจากเน็ตเสมอ (ได้เวอร์ชันล่าสุด ไม่ค้างของเก่า)
//                    ออฟไลน์ = โชว์หน้าที่เก็บไว้ล่าสุดแทนหน้าขาว
// อย่างอื่น (หลังบ้าน Apps Script, ชีต, รูป Drive, ฟอนต์) ปล่อยผ่านไปเน็ตตามปกติ ไม่เก็บแคช
var CACHE = 'rattana-supply-lite-v1';
var PAGE  = './rattana-supply-lite.html';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.add(PAGE).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) {
          return k.indexOf('rattana-supply-lite-') === 0 && k !== CACHE;
        }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.mode !== 'navigate' || req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(PAGE, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(PAGE).then(function (hit) {
          return hit || new Response('ออฟไลน์ — ต่อเน็ตแล้วลองใหม่อีกครั้ง',
            { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        });
      })
  );
});
