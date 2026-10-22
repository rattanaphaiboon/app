/* Service Worker ของแอป HR Rattana (rattana-attendance.html) — แอป v13.53 (surat 22/10/2026 "ช่วยให้ App โหลดเร็วขึ้น")
   เปิดแอป = ใช้หน้าที่จำไว้ในเครื่องทันที แล้วดึงไฟล์ใหม่เก็บไว้เบื้องหลัง (รอบหน้าได้ไฟล์ใหม่)
   ตัวเช็คเวอร์ชันในแอปเห็นเวอร์ชันใหม่ → เปิด ?_v=<เวอร์ชัน> = ดึงจากเน็ตเสมอ (ได้ของใหม่ทันที)
   ขอบเขต = หน้า rattana-attendance.html หน้าเดียว · ไม่แตะคำขอ Apps Script / ชีท / รูป / แอปอื่นในโฟลเดอร์เดียวกัน
   สวิตช์ฉุกเฉิน: เปิด rattana-attendance.html?nosw = ดึงจากเน็ต + แอปถอด Service Worker ออก */
const CACHE = 'hr-shell-v1';
const PAGE = new URL('rattana-attendance.html', self.registration.scope).href;

function fetchPage_() {
  return fetch(new Request(PAGE, { cache: 'no-cache', credentials: 'same-origin' }));
}
async function storePage_(res) {
  try { if (res && res.ok && res.type === 'basic') { const c = await caches.open(CACHE); await c.put(PAGE, res.clone()); } } catch (e) {}
  return res;
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(fetchPage_().then(storePage_).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.indexOf('hr-shell-') === 0 && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;   // คำขออื่นทั้งหมดไปเน็ตตามปกติ
  const u = new URL(req.url);
  if (u.origin + u.pathname !== PAGE) return;
  if (u.searchParams.has('nosw')) {   // สวิตช์ฉุกเฉิน: ไปเน็ตตรงๆ + ล้างไฟล์ที่จำไว้ + ถอดตัวเองออก
    e.waitUntil((async () => { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.indexOf('hr-shell-') === 0).map(k => caches.delete(k))); await self.registration.unregister(); })());
    return;
  }
  const fresh = u.searchParams.has('_v');
  e.respondWith((async () => {
    const net = fetchPage_().then(storePage_);
    if (!fresh) {
      const hit = await caches.match(PAGE, { cacheName: CACHE });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    }
    try { return await net; }
    catch (err) { const hit = await caches.match(PAGE, { cacheName: CACHE }); if (hit) return hit; throw err; }
  })());
});
