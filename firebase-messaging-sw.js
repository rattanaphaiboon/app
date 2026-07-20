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
  apiKey: 'AIzaSyB4vKh2UjTJcGlQMN9gk4N5Kmsn3ze11Wg',
  authDomain: 'r-flow-7d729.firebaseapp.com',
  projectId: 'r-flow-7d729',
  storageBucket: 'r-flow-7d729.firebasestorage.app',
  messagingSenderId: '297989335377',
  appId: '1:297989335377:web:21afc034988c0baec24b70'
};
// ▲▲▲ ─────────────────────────────────────────── ▲▲▲

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // ข้อความที่ส่งมาตอนแอปปิด/อยู่พื้นหลัง → เด้ง notification เอง
  messaging.onBackgroundMessage(function (payload) {
    const n = (payload && payload.notification) || {};
    const data = (payload && payload.data) || {};
    const link = data.link || 'r-flow.html';
    // tag แยกตามงาน → คนละงานเด้งแยกอัน (นับได้) · งานเดิมซ้ำ = ทับอันเดิม ไม่สแปม
    const m = String(link).match(/[?&]task=([^&#]+)/);
    const tag = m ? 'task-' + m[1] : 'rflow';
    self.registration.showNotification(n.title || 'R-Flow', {
      body: n.body || '',
      icon: 'r-flow-icon-192.png',
      badge: 'r-flow-icon-192.png',
      tag: tag,
      data: { link: link }
    }).then(function () {
      // เลขแดงบนไอคอนแอป = จำนวนนอติที่ยังค้างอยู่
      if (self.navigator && self.navigator.setAppBadge) {
        return self.registration.getNotifications().then(function (list) {
          return self.navigator.setAppBadge((list && list.length) || 1);
        });
      }
    }).catch(function () {});
  });
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
