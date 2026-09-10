// Rattana Scanner — service worker สำหรับใช้งานออฟไลน์
// กลยุทธ์: network-first สำหรับตัวแอป (เปิดเน็ตอยู่ = ได้โค้ดใหม่เสมอ ไม่ค้างเวอร์ชันเก่า)
//          แล้วค่อย fallback ไปที่ cache เมื่อออฟไลน์
// อัปเวอร์ชันแอปต้องขยับ CACHE ด้วย เพื่อล้าง cache ก้อนเก่า
var CACHE = 'rattana-scanner-v5.3';
var ASSETS = [
  './rattana-img2pdf.html',
  './rattana-img2pdf.webmanifest',
  './img2pdf-icon-192.png',
  './img2pdf-icon-512.png',
  './img2pdf-icon-180.png',
  './img2pdf-icon-32.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // ไฟล์ข้าม origin บางตัวอาจโหลดไม่ได้ตอนติดตั้ง — อย่าให้ล้มทั้งชุด
      .then(function (c) { return Promise.allSettled(ASSETS.map(function (u) { return c.add(u); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // Apps Script (ประวัติ/ไฟล์) และ Google Sheets (รายชื่อผู้ใช้) ต้องสด ๆ เสมอ ห้าม cache
  var url = req.url;
  if (url.indexOf('script.google.com') !== -1 || url.indexOf('docs.google.com') !== -1) return;

  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('./rattana-img2pdf.html');
          return new Response('offline', { status: 503, statusText: 'offline' });
        });
      })
  );
});
