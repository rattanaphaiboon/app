/* R-Flow — Firebase Cloud Messaging Service Worker
 *
 * ⚠️ ไฟล์นี้ทำงานแยก context จากแอป — อ่าน CFG ในแอปไม่ได้
 *    ต้องใส่ค่า firebaseConfig ให้ "ตรงกับ" CFG.firebase ใน r-flow.html
 *    (ดู handoff/FIREBASE-SETUP-GUIDE.md)
 *
 * ตอนนี้ config ว่าง = แอปยังไม่ register SW นี้ (pushConfigured() = false) → inert
 * เมื่อกรอกค่าแล้วต้อง deploy ไฟล์นี้ขึ้น GitHub Pages ที่ path เดียวกับ r-flow.html
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ▼▼▼ ใส่ค่าให้ตรงกับ CFG.firebase ใน r-flow.html ▼▼▼
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};
// ▲▲▲ ─────────────────────────────────────────── ▲▲▲

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // ข้อความที่ส่งมาตอนแอปปิด/อยู่พื้นหลัง → เด้ง notification เอง
  messaging.onBackgroundMessage(function (payload) {
    const n = (payload && payload.notification) || {};
    const data = (payload && payload.data) || {};
    self.registration.showNotification(n.title || 'R-Flow', {
      body: n.body || '',
      icon: 'r-flow-icon-192.png',
      badge: 'r-flow-icon-192.png',
      tag: data.tag || undefined,      // งานเดียวกัน = รวมเป็นอันเดียว ไม่สแปม
      data: { link: data.link || 'r-flow.html' }
    });
  });
}

// กดที่ notification → เปิด/โฟกัสแอปไปที่งานนั้น
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || 'r-flow.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].url.indexOf('r-flow') > -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
