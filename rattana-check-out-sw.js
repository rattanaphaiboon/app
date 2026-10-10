/* Service worker สำหรับ Rattana Check Out (PWA) — scope เฉพาะ /app/rattana-check-out*
 * ไม่แคชอะไรเลย ไม่แก้ response (network passthrough)
 * มีไว้เพื่อให้เบราว์เซอร์ยอมให้ "ติดตั้งเป็นแอป" ได้เท่านั้น → ไม่กระทบแอปอื่นในโฟลเดอร์ /app/ */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* ปล่อยให้เบราว์เซอร์โหลดจากเน็ตตามปกติ */ });
