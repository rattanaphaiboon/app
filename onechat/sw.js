/* Rattana One Chat (เดิม RTN Chat Hub) — Service Worker v3 (หลายบัญชี: กดแจ้งเตือนแล้วเปิดแชทในบัญชีของมัน)
   หน้าที่เดียว: รับ Web Push แล้วเด้งแจ้งเตือนของเครื่อง แม้ปิดแอพอยู่
   ไม่ cache ไฟล์แอพ (แอพเป็นไฟล์เดียว อัปเดตบ่อย — cache แล้วจะได้ของเก่า) */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const ICON = 'icon-192.png';
// ไอคอนของแจ้งเตือน = รูปประจำบัญชีที่แชทนั้นอยู่ (badge ยังเป็นไอคอนแอพ — Android ใช้ทำสัญลักษณ์ขาวดำบนแถบสถานะ)
const ACCT_ICON = { 1:'acct-purchase.png', 2:'acct-rpbsale.jpg', 3:'acct-rattanamart.jpg', 4:'acct-hr.jpg' };

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) { d = { body: event.data && event.data.text() }; }

  const title = d.title || 'Rattana One Chat';
  const opts = {
    body: d.body || '',
    icon: ACCT_ICON[d.account] || ICON,
    badge: ICON,
    // เรื่องเดียวกันเด้งทับอันเดิม ไม่ท่วมจอ · renotify ให้สั่นซ้ำเมื่อมีอันใหม่จริง
    tag: d.tag || 'pur',
    renotify: true,
    data: { chat: d.chat || '', account: d.account || '', url: d.url || './' },
    requireInteraction: d.kind === 'sla',
    silent: false,
  };
  // ตัวเลขบนไอคอนแอพหน้าจอโฮม — เซิร์ฟเวอร์ส่งจำนวนงานที่รอตอบมาให้ (d.count)
  // ต้องทำตรงนี้ด้วย ไม่งั้นเลขจะอัปเดตเฉพาะตอนเปิดแอพ
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, opts),
    setBadge(d.count),
  ]));
});

async function setBadge(n){
  try{
    if(typeof n !== 'number' || !self.navigator) return;
    if(n > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(n);
    else if(self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  }catch(_){ /* เบราว์เซอร์ไม่รองรับ ก็ข้ามไป */ }
}

// แอพบอกให้ตั้ง/ล้างเลขบนไอคอนได้ด้วย (ตอนเปิดแอพอยู่)
self.addEventListener('message', e => {
  if(e.data?.type === 'badge') e.waitUntil(setBadge(e.data.count));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || './', self.location.href);
  if (data.chat) target.hash = 'chat=' + data.chat + (data.account ? '&a=' + data.account : '');

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        w.postMessage({ type: 'open-chat', chat: data.chat || '', account: data.account || '' });
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
