/* Rattana — Firebase Cloud Messaging Service Worker (ใช้ร่วมทุกแอปใน origin นี้)
 *
 * ⚠️ ไฟล์นี้ทำงานแยก context จากแอป — อ่าน CFG ในแอปไม่ได้
 *    ต้องใส่ค่า firebaseConfig ให้ "ตรงกับ" CFG.firebase ของทุกแอปที่ใช้ไฟล์นี้ (R-Flow, Sales App, ...)
 *    (ดู D:\Calude\FIREBASE-PUSH-REFERENCE.md — เอกสารกลาง กติกา multi-app + บั๊กที่เจอแล้วจริง)
 *
 * ตอนนี้ config ว่าง = แอปยังไม่ register SW นี้ (pushConfigured() = false) → inert
 * เมื่อกรอกค่าแล้วต้อง deploy ไฟล์นี้ขึ้น GitHub Pages ที่ path เดียวกับทุกแอป (root ของ repo)
 *
 * ⚠️ multi-app: ทุก payload จากทุกแอปต้องมี data.app (เช่น 'rflow'/'sales') — ไม่มี field นี้ = ถือเป็น 'rflow'
 *    (backward-compat กับ payload เก่าที่ค้างอยู่ก่อนเพิ่มแอปที่ 2) ห้ามเดา appKey จาก url string
 */

// SW เวอร์ชันใหม่มีผลทันที ไม่ต้องรอปิดแอปทุกแท็บ
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ▼▼▼ ใส่ค่าให้ตรงกับ CFG.firebase / CONFIG.firebase ของทุกแอป ▼▼▼
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

// ── multi-app registry — เพิ่มแอปใหม่ = เพิ่ม entry ที่นี่ที่เดียว ──
//    urlFrag ใช้เทียบ client.url (เลือกโฟกัสแท็บที่เปิดอยู่ให้ตรงแอป) · msgType ใช้ postMessage บอกแอปที่เปิดอยู่
const APPS = {
  rflow: { icon: 'r-flow-icon-192.png', urlFrag: 'r-flow', defaultLink: 'r-flow.html', msgType: 'rf-open' },
  sales: { icon: 'rattana-sales-icon-192.png', urlFrag: 'rattana-sales-app', defaultLink: 'rattana-sales-app.html', msgType: 'sales-open' }
};
function appCfgFor(key) { return APPS[key] || APPS.rflow; }

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  /* ⚠️ หลังบ้านต้องส่งเป็น data-only (ไม่มี key `notification`) ไม่งั้น firebase SDK
     เด้งนอติให้เองแล้วไม่เรียกฟังก์ชันนี้ → ไม่มีเลขแดง + tag ไม่แยกตามงาน
     (อ่านทั้ง data และ notification ไว้ เผื่อหลังบ้านเวอร์ชันเก่ายังไม่ deploy) */
  messaging.onBackgroundMessage(function (payload) {
    const d = (payload && payload.data) || {};
    const n = (payload && payload.notification) || {};
    const appKey = (d.app && APPS[d.app]) ? d.app : 'rflow';   // ไม่มี data.app = ของเดิม R-Flow (backward-compat)
    const appCfg = appCfgFor(appKey);
    const link = d.link || appCfg.defaultLink;
    // tag แยกตามงาน → คนละงานเด้งแยกอัน (นับได้) · งานเดิมซ้ำ = ทับอันเดิม ไม่สแปม
    // R-Flow เดิม: แยกตาม ?task= ใน link (พฤติกรรมเดิมเป๊ะ) · แอปอื่น: ใช้ d.tag ที่หลังบ้านส่งมา (เช่น 'price'/'cn'/'kpi')
    let tag = appKey;
    if (appKey === 'rflow') {
      const m = String(link).match(/[?&]task=([^&#]+)/);
      tag = m ? 'task-' + m[1] : 'rflow';
    } else if (d.tag) {
      tag = appKey + '-' + d.tag;
    }
    return self.registration.showNotification(d.title || n.title || (appKey === 'rflow' ? 'R-Flow' : 'Rattana Sales'), {
      body: d.body || n.body || '',
      icon: d.icon || appCfg.icon,
      badge: d.icon || appCfg.icon,
      tag: tag,
      renotify: true,
      // taskTitle/fromName = ข้อมูลงานที่หลังบ้านแนบมา — แอปเอาไปโชว์หน้ารอตอนกดนอติได้เลยก่อน sync จริง
      // (หลังบ้านเวอร์ชันเก่ายังไม่ส่ง 2 ค่านี้ → ใช้ body ซึ่งเป็นชื่องานอยู่แล้วในเคสมอบงาน)
      data: { link: link, app: appKey, taskTitle: d.taskTitle || d.body || n.body || '', fromName: d.fromName || '' }
    }).then(refreshBadge).catch(function () {});
  });
}

// เลขแดงบนไอคอนแอป = จำนวนนอติที่ยังค้างอยู่ (อย่างน้อย 1 ถ้าอ่านรายการไม่ได้)
// หมายเหตุ: SW ตัวเดียวใช้ร่วมทุกแอป → เลขนี้รวมทุกแอปที่ค้างอยู่ ไม่ได้แยกต่อแอป (เหมือนเดิมตั้งแต่ก่อนมี multi-app)
function refreshBadge() {
  if (!(self.navigator && self.navigator.setAppBadge)) return;
  return self.registration.getNotifications()
    .then(function (list) { return self.navigator.setAppBadge(Math.max((list && list.length) || 0, 1)); })
    .catch(function () { try { self.navigator.setAppBadge(1); } catch (e) {} });
}

// กดที่ notification → เปิด/โฟกัสแอปไปที่งานนั้น
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  const appKey = (e.notification.data && e.notification.data.app) || 'rflow';
  const appCfg = appCfgFor(appKey);
  const link = (e.notification.data && e.notification.data.link) || appCfg.defaultLink;
  // อัปเดตเลขบนไอคอนตามนอติที่ยังเหลือ (แอปจะคำนวณใหม่อีกทีตอนเปิด)
  if (self.navigator && self.navigator.setAppBadge) {
    self.registration.getNotifications().then(function (list) {
      const n = (list && list.length) || 0;
      return n > 0 ? self.navigator.setAppBadge(n) : (self.navigator.clearAppBadge && self.navigator.clearAppBadge());
    }).catch(function () {});
  }
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      // ⚠️ ต้องเทียบ appKey (data.app) ไม่ใช่เดาจาก url string — ถ้ามีแท็บของแอปอื่นเปิดค้างอยู่ (origin เดียวกัน) จะโดน focus ผิดแอปทันที
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.url.indexOf(appCfg.urlFrag) > -1) {
          // แอปเปิดอยู่ → บอกให้เปิดหน้านั้นเลย (ไม่ reload) · แนบ title/body/data ไปด้วย
          // แอปเอาไปโชว์หน้ารอได้ทันทีถ้างานยังไม่ sync มา (ไม่ต้องรอ backend ตอบก่อนถึงจะมีอะไรให้ดู)
          c.postMessage({ type: appCfg.msgType, link: link, title: e.notification.title || '', body: e.notification.body || '', data: e.notification.data || {} });
          return ('focus' in c) ? c.focus() : null;
        }
      }
      if (clients.openWindow) return clients.openWindow(link);   // แอปปิด → เปิด URL ของแอปนั้น
    })
  );
});
