/* Rattana Bill Fix — Service Worker (แจ้งเตือนเด้ง)
 * ใช้แสดงแจ้งเตือนบนมือถือ/คอม และเปิดแอปเมื่อกดแจ้งเตือน
 * ไม่ยุ่งกับ firebase-messaging-sw.js ของแอปอื่น (คนละไฟล์ คนละ scope)
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'rattana-bill-fix.html';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find(c => c.url.includes('rattana-bill-fix'));
    if (open) { await open.focus(); return; }
    await self.clients.openWindow(url);
  })());
});
