/* R-Flow — Firebase Cloud Messaging Service Worker
 *
 * ⚠️ ไฟล์นี้ทำงานแยก context จากแอป — อ่าน CFG ในแอปไม่ได้
 *    ต้องใส่ค่า firebaseConfig ให้ "ตรงกับ" CFG.firebase ใน r-flow.html
 *    (ดู handoff/FIREBASE-SETUP-GUIDE.md)
 *
 * ตอนนี้ config ว่าง = แอปยังไม่ register SW นี้ (pushConfigured() = false) → inert
 * เมื่อกรอกค่าแล้วต้อง deploy ไฟล์นี้ขึ้น GitHub Pages ที่ path เดียวกับ r-flow.html
 */

// SW เวอร์ชันใหม่มีผลทันที ไม่ต้องรอปิดแอปทุกแท็บ
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ▼▼▼ ใส่ค่าให้ตรงกับ CFG.firebase ใน r-flow.html ▼▼▼
const firebaseConfig = {
  apiKey: 'AIzaSyB9HMRkjw6uMnyYmIpNjvZEolK9wm9RiOM',
  authDomain: 'r-notification-913fd.firebaseapp.com',
  projectId: 'r-notification-913fd',
  storageBucket: 'r-notification-913fd.firebasestorage.app',
  messagingSenderId: '490344945360',
  appId: '1:490344945360:web:62a2a571c2e360245970d5',
  measurementId: 'G-P3CYL4NQBE'
};
// ▲▲▲ ─────────────────────────────────────────── ▲▲▲

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  /* ⚠️ หลังบ้านต้องส่งเป็น data-only (ไม่มี key `notification`) ไม่งั้น firebase SDK
     เด้งนอติให้เองแล้วไม่เรียกฟังก์ชันนี้ → ไม่มีเลขแดง + tag ไม่แยกตามงาน
     (อ่านทั้ง data และ notification ไว้ เผื่อหลังบ้านเวอร์ชันเก่ายังไม่ deploy) */
  messaging.onBackgroundMessage(function (payload) {
    const d = (payload && payload.data) || {};
    const n = (payload && payload.notification) || {};
    const link = d.link || 'r-flow.html';
    // tag แยกตามงาน → คนละงานเด้งแยกอัน (นับได้) · งานเดิมซ้ำ = ทับอันเดิม ไม่สแปม
    const m = String(link).match(/[?&]task=([^&#]+)/);
    const tag = m ? 'task-' + m[1] : 'rflow';
    return self.registration.showNotification(d.title || n.title || 'R-Flow', {
      body: d.body || n.body || '',
      icon: 'r-flow-icon-192.png',
      badge: 'r-flow-icon-192.png',
      tag: tag,
      renotify: true,
      data: { link: link }
    }).then(refreshBadge).catch(function () {});
  });
}

// เลขแดงบนไอคอนแอป = จำนวนนอติที่ยังค้างอยู่ (อย่างน้อย 1 ถ้าอ่านรายการไม่ได้)
function refreshBadge() {
  if (!(self.navigator && self.navigator.setAppBadge)) return;
  return self.registration.getNotifications()
    .then(function (list) { return self.navigator.setAppBadge(Math.max((list && list.length) || 0, 1)); })
    .catch(function () { try { self.navigator.setAppBadge(1); } catch (e) {} });
}

// กดที่ notification → เปิด/โฟกัสแอปไปที่งานนั้น
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || 'r-flow.html';
  // อัปเดตเลขบนไอคอนตามนอติที่ยังเหลือ (แอปจะคำนวณใหม่อีกทีตอนเปิด)
  if (self.navigator && self.navigator.setAppBadge) {
    self.registration.getNotifications().then(function (list) {
      const n = (list && list.length) || 0;
      return n > 0 ? self.navigator.setAppBadge(n) : (self.navigator.clearAppBadge && self.navigator.clearAppBadge());
    }).catch(function () {});
  }
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.url.indexOf('r-flow') > -1) {
          c.postMessage({ type: 'rf-open', link: link });   // แอปเปิดอยู่ → บอกให้เปิดงานนั้นเลย (ไม่ reload)
          return ('focus' in c) ? c.focus() : null;
        }
      }
      if (clients.openWindow) return clients.openWindow(link);   // แอปปิด → เปิด URL ที่มี ?task=<id>
    })
  );
});
