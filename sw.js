// Rattana Sales App — minimal service worker (v8.100, Phase 1: PWA App Badge)
//   Purpose: allow a complete PWA install (Add to Home Screen) + ready for Phase 2 Web Push.
//   ⚠️ NO fetch handler ON PURPOSE: this lives in a shared /app/ scope (GitHub Pages monorepo with
//      many Rattana apps). Without a fetch handler it never intercepts/caches, so every other app
//      under /app/ keeps working exactly as before. Do not add caching here without scoping it
//      strictly to rattana-sales-app paths.
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', () => { /* no clients.claim() — stay least-invasive for sibling apps */ });

// ─── TODO Phase 2: Web Push — uncomment + wire an Apps Script sender when ready ───
//   Apps Script posts { title, body, badge } to the push service; this SW shows the noti + sets the
//   icon badge even when the app is fully closed.
// self.addEventListener('push', (event) => {
//   let data = {}; try { data = event.data ? event.data.json() : {}; } catch (e) {}
//   const n = Number(data.badge || 0);
//   event.waitUntil((async () => {
//     try {
//       if (n > 0 && 'setAppBadge' in self.navigator) await self.navigator.setAppBadge(n);
//       else if ('clearAppBadge' in self.navigator) await self.navigator.clearAppBadge();
//     } catch (e) {}
//     await self.registration.showNotification(data.title || 'Rattana Sales', {
//       body: data.body || 'มีงานใหม่ต้องจัดการ', icon: 'icons/icon.svg', badge: 'icons/icon.svg', data,
//     });
//   })());
// });
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();
//   event.waitUntil(self.clients.openWindow('rattana-sales-app.html'));
// });
