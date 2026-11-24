/* Rattana Sales (rattana-sales.html) — เก็บแอปไว้ในเครื่อง · Surat 2026-11-24
   ขอบเขต = เฉพาะ /app/rattana-sales.html (ลงทะเบียน scope ระบุไฟล์) → ไม่แตะแอปอื่นใน /app/ (sw.js กลางไม่มี fetch ตั้งใจ)
   วิธี: เปิดแอป = ส่งชุดในเครื่องทันที แล้วโหลดเวอร์ชันใหม่เก็บไว้เบื้องหลัง (เปิดครั้งหน้าได้ของใหม่ · แบนเนอร์ "มีเวอร์ชันใหม่" ของแอปยังเตือนตามเดิม)
   ❌ ไม่ยุ่ง: คำขอที่มี ?vc= (แอปเช็คเวอร์ชันเอง) · POST · หลังบ้าน/ข้อมูล · โดเมนอื่นนอกจาก rattanaphaiboon.github.io */
const CACHE = 'rs-shell-1';
const PAGE = new URL('rattana-sales.html', self.location).href;
const ASSET = /\/app\/(rattana-sales-(32|180|192|512)\.png|rattana-sales\.webmanifest|rattana-ui\/rattana-ui\.(css|js))$/;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.add(PAGE)).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(Promise.all([self.clients.claim(),
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('rs-shell-') && k !== CACHE).map(k => caches.delete(k))))])); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  const isPage = u.pathname.endsWith('/rattana-sales.html') && !u.searchParams.has('vc');
  if (!isPage && !ASSET.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const key = isPage ? PAGE : req;
    const hit = await c.match(key);
    const net = fetch(isPage ? new Request(PAGE, { cache: 'no-cache' }) : req)
      .then(r => { if (r && r.ok && r.type === 'basic') c.put(key, r.clone()); return r; })
      .catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || fetch(req);
  }));
});
