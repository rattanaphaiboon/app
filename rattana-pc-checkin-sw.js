/*  Service Worker — Rattana PC Check-in
    มีไว้ 2 อย่างเท่านั้น
      1. ทำให้ Chrome ยอมให้ "ติดตั้งลงหน้าจอ" ได้ (ต้องมี fetch handler)
      2. เปิดแอปได้ตอนเน็ตหลุด โดยใช้ไฟล์ที่แคชไว้

    ⚠️ สโคปคือ /app/ ทั้งโฟลเดอร์ ซึ่งมีแอปตัวอื่นของบริษัทอยู่ด้วย
       จึงตั้งใจ "ไม่ยุ่ง" กับคำขอที่ไม่ใช่ของแอปนี้ — ปล่อยผ่านไปให้เบราว์เซอร์จัดการเอง
       และไฟล์ HTML ใช้ network-first เสมอ เพื่อไม่ให้ค้างเวอร์ชันเก่าหลัง deploy   */

const CACHE = 'rattana-pc-checkin-v1';

/* ไฟล์ของแอปนี้เท่านั้น — ห้ามใส่ไฟล์ของแอปอื่นในโฟลเดอร์เดียวกัน */
const SHELL = [
  './rattana-pc-checkin.html',
  './rattana-pc-checkin.webmanifest',
  './pc-icon-192.png',
  './pc-icon-512.png',
  './pc-icon-mask.png',
  './pc-icon-180.png'
];

const mine = url => SHELL.some(p => url.pathname.endsWith(p.replace('./', '')));
const isDoc = url => url.pathname.endsWith('rattana-pc-checkin.html');

self.addEventListener('install', e => {
  /* addAll ล้มทั้งชุดถ้าไฟล์เดียวโหลดไม่ได้ จึงใส่ทีละไฟล์แบบไม่สนถ้าพลาด */
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  /* ไม่ใช่ไฟล์ของแอปนี้ (แอปอื่นในโฟลเดอร์ / โมเดลใบหน้าจาก CDN / Apps Script)
     ไม่ต้องเข้าไปยุ่งเลย ปล่อยให้เบราว์เซอร์โหลดตามปกติ */
  if (url.origin !== self.location.origin || !mine(url)) return;

  if (isDoc(url)) {
    /* หน้าเว็บหลัก — เอาของใหม่จากเน็ตก่อนเสมอ เน็ตหลุดค่อยใช้ของในแคช */
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./rattana-pc-checkin.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./rattana-pc-checkin.html', { ignoreSearch: true }))
    );
    return;
  }

  /* ไอคอน/manifest — เอาจากแคชก่อน ไม่เปลี่ยนบ่อยอยู่แล้ว */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
