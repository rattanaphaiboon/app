/* Rattana Bill Fix — Service Worker (แจ้งเตือนเด้ง) v2
 * - เด้งแจ้งเตือนบนมือถือ/คอม และเปิดแอปเมื่อกดแจ้งเตือน
 * - รับ Web Push จาก Apps Script (ปิดแอปอยู่ก็เด้ง): ถูกปลุกแบบไม่มีข้อมูล → ถามข้อความของเครื่องนี้จาก Script (pushPeek) → เด้ง
 * ไม่ยุ่งกับ firebase-messaging-sw.js ของแอปอื่น (คนละไฟล์ คนละ scope)
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxv8rXoDsc9vxEWsEQfqaMov0aoVTwPs1B10eiArDTda39xy61IiGvg7Y8oNXnjRIMc/exec';
const ICON = 'bill-fix-badge-192.png';
const APP = 'rattana-bill-fix.html';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// จำว่าเด้งข้อความไหนไปแล้ว (กันเด้งซ้ำเมื่อถูกปลุกหลายครั้ง)
async function seenIds() {
  try { const r = await (await caches.open('bf-push')).match('seen'); return r ? await r.json() : []; } catch (e) { return []; }
}
async function saveSeen(ids) {
  try { await (await caches.open('bf-push')).put('seen', new Response(JSON.stringify(ids.slice(-50)))); } catch (e) {}
}

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let msgs = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'pushPeek', endpoint: sub ? sub.endpoint : '' }) });
      msgs = ((await res.json()).msgs) || [];
    } catch (err) {}
    const seen = await seenIds();
    let fresh = msgs.filter(m => m && m.id && !seen.includes(m.id));
    // ไม่มีข้อความใหม่ (ถูกปลุกซ้ำ) → เด้งอันล่าสุดทับของเดิม (tag เดียวกัน ไม่เพิ่มอันใหม่)
    if (!fresh.length && msgs.length) fresh = [msgs[msgs.length - 1]];
    if (!fresh.length) fresh = [{ title: 'Rattana Bill Fix', body: 'มีอัปเดตคำขอแก้บิล — แตะเพื่อเปิดดู', tag: 'update', link: APP }];
    await saveSeen(seen.concat(fresh.map(m => m.id).filter(Boolean)));
    // แอปเปิดอยู่ → ให้ดึงรายการใหม่ทันที
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.filter(c => c.url.includes('rattana-bill-fix')).forEach(c => c.postMessage({ type: 'bf-refresh' }));
    await Promise.all(fresh.map(m => self.registration.showNotification(m.title || 'Rattana Bill Fix', {
      body: m.body || '', icon: ICON, badge: ICON, tag: 'billfix-' + (m.tag || m.id || Date.now()), renotify: true,
      data: { url: m.link || APP }, vibrate: [200, 100, 200],
    })));
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || APP, self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find(c => c.url.includes('rattana-bill-fix'));
    if (open) { open.postMessage({ type: 'bf-open', link: url }); await open.focus(); return; }
    await self.clients.openWindow(url);
  })());
});
