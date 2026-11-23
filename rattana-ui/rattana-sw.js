/* Rattana CI — service worker for notifications (v1.5.0)
   Registered by rattana-ui.js only to show system notifications. It does not cache pages or files. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

/* tap a notification → bring the app's tab forward (or open it) */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    var target = new URL(url, self.location.href), best = null;
    list.forEach(function (c) { var u = new URL(c.url); if (u.origin === target.origin && u.pathname === target.pathname) best = best || c; });
    if (best) return best.focus().then(function (c) { if (c && target.hash && c.navigate && c.url !== target.href) return c.navigate(target.href); });
    return self.clients.openWindow(target.href);
  }));
});

/* ready for a push server later: payload {"title","body","url","tag","badge"} */
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  var p = self.registration.showNotification(d.title || 'RATTANA', {
    body: d.body || '', tag: d.tag, icon: d.icon || new URL('rattana-logo-navy.png', self.location.href).href,
    data: { url: d.url || self.registration.scope }, vibrate: [80, 40, 80]
  });
  if (d.badge != null && self.navigator.setAppBadge) p = Promise.all([p, self.navigator.setAppBadge(d.badge)]);
  e.waitUntil(p);
});
