# Rattana CI v1.5.0

UI กลางของบริษัท — Crystal Luxury (โหมดสว่าง) + Luxury Dark (โหมดมืด)
ใช้ได้ทั้ง iOS · Android · Laptop พร้อม popup และโมชันแบบพรีเมียม

## ไฟล์
- `rattana-ui.css` — สี ฟอนต์ คอมโพเนนต์ popup และโมชันทั้งหมด (class ขึ้นต้นด้วย `rt-`)
- `rattana-ui.js` — `window.RattanaUI`: ธีม, TH/EN, popup, เมนู, drawer, toast, ยืนยัน, ปุ่ม loading, ตรวจอุปกรณ์, จัดรูปแบบวันที่/เงิน
- `rattana-logo-navy.png` — โลโก้บนพื้นกรมท่า (มีพื้นที่ว่างรอบโลโก้แล้ว) ใช้บนพื้นสว่าง
- `rattana-logo-transparent.png` — โลโก้พื้นใส ใช้บนพื้นกรมท่า/โหมดมืดเท่านั้น
- `index.html` — หน้า demo + คู่มือ (คัดลอกโค้ดได้)
- `sample/` — รูปสินค้าตัวอย่างสำหรับหน้า demo (ข้อมูลตัวอย่าง)
- `rattana-sw.js` — ตัวช่วยแสดงการแจ้งเตือนนอกแอป (โหลดเองเมื่อแจ้งเตือนครั้งแรก ไม่ได้แคชหน้าเว็บ)
- `vendor/` — ตัวอ่านบาร์โค้ด/QR (ZXing, MIT) โหลดเฉพาะตอนเปิดสแกนบนเครื่องที่ไม่มีตัวอ่านในตัว
- `tokens.json` — ค่าสีและขนาดต้นฉบับ (ตรงกับ Design System "Rattana CI" บน Claude)

## ลิงก์
- หน้า demo + วิธีใช้ (คัดลอกโค้ดได้): https://rattanaphaiboon.github.io/app/rattana-ui/
- ไฟล์: https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.css · https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.js

> โฟลเดอร์นี้เป็นของกลางให้ "ดึงไปใช้เอง" (opt-in) ไม่มีผลกับแอปอื่นใน repo จนกว่าแอปนั้นจะลิงก์ไฟล์เอง

## ใช้ในแอป
```html
<html lang="th" data-theme="light">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F4F7FB">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <link rel="stylesheet" href="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.css">
  <script src="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.js" defer></script>
</head>
<body class="rt-app">
  <div class="rt-bg"><div class="rt-bg-arc"></div><div class="rt-bg-arc"></div></div>
  <a class="rt-logo" href="/">
    <img class="rt-logo-light" src="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-logo-navy.png" alt="RATTANA">
    <img class="rt-logo-dark" src="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-logo-transparent.png" alt="RATTANA">
  </a>
  <main class="rt-container rt-page">...</main>
</body>
```
Sidebar สีกรมท่า: `<img class="rt-logo-on-navy" src=".../rattana-logo-transparent.png" alt="RATTANA">`

## ทำให้แอปหน้าตาเหมือนต้นฉบับ (เช็กลิสต์ — ส่งให้ AI ที่ช่วยสร้างแอปได้เลย)
1. ใส่ **ทั้ง 2 บรรทัด** ใน `<head>`: `rattana-ui.css` **และ** `rattana-ui.js` (ไม่มี .js = ไม่มี popup ดรอปดาวน์ใหม่ ซูมรูป และโมชัน)
2. ลิงก์ไฟล์จาก `https://rattanaphaiboon.github.io/app/rattana-ui/` — อย่าก๊อปไฟล์ไปเก็บเอง ไม่งั้นไม่อัปเดตตาม
3. `<html data-theme="light">` (หรือ `dark`) และ `<body class="rt-app">`
4. ใช้ class `rt-` ของ Rattana CI เช่น `rt-btn rt-btn-gold`, `rt-input`, `rt-select`, `rt-search`, `rt-glass` — อย่าเขียนสไตล์ทับเอง
5. ฟอร์ม/ปุ่ม/รายการ ดูตัวอย่างและกด "คัดลอกโค้ด" จากหน้า demo
6. กระดิ่งแจ้งเตือนใช้ `rt-btn rt-btn-glass rt-btn-icon rt-bell` + `<span class="rt-count">` และอัปเดตตัวเลขด้วย `RattanaUI.setBadge(n)`
7. ช่องค้นหาใช้ `<label class="rt-search">` (มีปุ่ม X ให้เอง) · หน้าที่เกี่ยวกับสินค้าใส่ `data-rt-scan` ให้มีปุ่มสแกน
8. อย่าทำปุ่มกลับขึ้นบนสุดเอง — Rattana CI ใส่ให้ทุกหน้า

## ใหม่ใน v1.5
### แก้บั๊ก: ตัวเลขแจ้งเตือนโดนตัด
ตั้งแต่ v1.1 ปุ่ม `rt-btn` ตัดส่วนที่ล้นออกไป (เพื่อเอฟเฟกต์คลื่นตอนกด) ทำให้ตัวเลขบนกระดิ่งโดนตัดทุกแอป — แก้แล้ว คลื่นยังสวยเหมือนเดิม
```html
<button class="rt-btn rt-btn-glass rt-btn-icon rt-bell" data-rt-bell aria-label="การแจ้งเตือน">…ไอคอนกระดิ่ง…<span class="rt-count">3</span></button>
```
`RattanaUI.setBadge(n)` เปลี่ยนตัวเลขบนกระดิ่ง (เด้ง + กระดิ่งสั่น) ตัวเลขบนไอคอนแอป และชื่อแท็บ `(n)`

### ช่องค้นหามีปุ่ม X ล้างทั้งหมด
ทุก `.rt-search` ได้ปุ่ม X ด้านขวาอัตโนมัติ (ขึ้นเมื่อมีข้อความ) กดแล้วล้างและแอปได้รับ event `input` เหมือนผู้ใช้ลบเอง · ช่อง `type="search"` อื่นๆ ในหน้า rt-app ก็ได้ X แบบ Rattana

### สแกนบาร์โค้ด / QR
- `<label class="rt-search" data-rt-scan>` → มีปุ่มสแกนสีทอง สแกนได้แล้วใส่รหัสในช่องให้เอง + event `rt:scan`
- ปุ่มอื่น: `<button data-rt-scan="#ช่องที่จะใส่รหัส">` · เรียกเอง: `RattanaUI.scan().then(code => …)`
- ใช้ตัวอ่านในเครื่องถ้ามี (Android, Mac) ไม่งั้นใช้ ZXing (iPhone, Windows) · อ่าน EAN-13/8, UPC, Code 128/39/93, ITF, Codabar, QR, Data Matrix, PDF417
- กันอ่านผิด: บาร์โค้ดเส้นต้องอ่านได้ค่าเดิม 2 ครั้งติดกัน · สลับวิธีอ่าน 3 แบบทุกเฟรม (อ่านฉลากซีด/แสงไม่เท่ากันได้) · โฟกัสต่อเนื่อง · ไฟฉาย · พิมพ์รหัสเองได้ถ้ากล้องใช้ไม่ได้
- ต้องเปิดผ่าน https (GitHub Pages ได้อยู่แล้ว)

### ปุ่มกลับขึ้นบนสุด (ทุกหน้า)
ขึ้นเองที่มุมขวาล่างเมื่อเลื่อนลงไปไกล มีวงทองบอกว่าเลื่อนไปถึงไหนแล้ว หลบเมนูล่างและปุ่มลอยอื่นของแอปให้เอง · แอปที่มีปุ่มนี้ของตัวเองอยู่แล้วจะไม่ขึ้นซ้ำ · ปิดได้ด้วย `<body data-rt-no-top>`

### แจ้งเตือนนอกแอป
```js
RattanaUI.notifyPermission();   // ขออนุญาต — เรียกตอนผู้ใช้กดปุ่ม
RattanaUI.notify('มีคำขออนุมัติใหม่', { body: 'REQ-00142', url: location.href, tag: 'req', badge: 4 });
```
- ผู้ใช้ดูแอปอยู่ → ขึ้นเป็น toast ในแอป · สลับไปแอปอื่น/ย่อจอ → ขึ้นเป็นการแจ้งเตือนของเครื่อง กดแล้วกลับเข้าแอป
- iPhone/iPad: ต้องเพิ่มแอปไว้ที่หน้าจอโฮมก่อน (iOS 16.4 ขึ้นไป) — `notifyPermission()` สอนขั้นตอนให้เอง
- แจ้งเตือนตอน **ปิดแอปไปแล้วจริงๆ** ต้องมีเซิร์ฟเวอร์ส่ง (Web Push) — `rattana-sw.js` รองรับไว้แล้ว รอต่อเซิร์ฟเวอร์

### อื่นๆ
- ลูกของ `.rt-glass` ที่แอปตั้ง `position: absolute` ไม่โดนบังคับเป็น relative แล้ว
- ขอบทองตอนกดช่องกรอก (จาก v1.4.1) ใช้กับดรอปดาวน์ที่เปิดอยู่ด้วย

## ใหม่ใน v1.4.1
- กดช่องค้นหา / ช่องกรอก / ดรอปดาวน์ ไม่มีขอบดำแล้ว เหลือขอบทอง + วงทองอ่อน (Surat 2026-11-21: ใช้ทุกแอป)

## ใหม่ใน v1.4
- `<select>` ทุกตัวในหน้า `rt-app` ได้ดรอปดาวน์แบบ Rattana อัตโนมัติ แม้ลืมใส่ class `rt-select` (ตัวที่ไม่มี class ได้หน้าตากล่องแบบ Rattana ด้วย)

## ใหม่ใน v1.3
### ดรอปดาวน์แบบใหม่ (`select.rt-select`)
- บนคอม/แล็ปท็อป: กดแล้วได้รายการแบบกระจกของ Rattana เด้งขึ้นมา มีเครื่องหมายถูกที่ตัวที่เลือก ชื่อยาวขึ้นบรรทัดใหม่ไม่ตัด
- เกิน 10 รายการมีช่องพิมพ์ค้นหาให้เอง · ใช้คีย์บอร์ดได้ (↑ ↓ Enter Esc)
- ใช้ `<select>` เดิมได้เลย ไม่ต้องแก้โค้ด (v1.4: ทุก `<select>` ในหน้า `rt-app` ได้เอง) — `onchange` / `.value` / ฟอร์ม ทำงานเหมือนเดิม
- มือถือใช้ตัวเลือกของเครื่อง (iPhone/Android) ซึ่งจะเป็นสีตามธีมแล้ว ไม่ขาวโพลนในโหมดมืด
- อยากได้รายการแบบเดิมของเบราว์เซอร์ ใส่ `data-rt-native`
- เรียกเอง: `RattanaUI.selectMenu(selectElement)`

### ช่องค้นหา (`.rt-search`)
ไม่มีกรอบสี่เหลี่ยมโผล่ตอนกดพิมพ์แล้ว เหลือแค่ขอบทองโค้งรอบช่องเดียว

## ใหม่ใน v1.2
### กดรูปสินค้าแล้วรูปเด้งขึ้นมา (lightbox)
- รูปใน `.rt-product-media` กดได้เลย ไม่ต้องเขียนเพิ่ม: รูปเด้งขยายออกจากการ์ด มีชื่อสินค้าเต็มและราคาอยู่ใต้รูป
- ดูรูปถัดไปในตารางสินค้าเดียวกันได้: คอมกดลูกศรหรือปุ่มคีย์บอร์ด · มือถือปัดซ้าย/ขวา
- แตะรูปเพื่อซูม ×2.2 · ปัดลง กด Esc หรือแตะพื้นหลังเพื่อปิด
- รูปอื่นๆ ใส่ `data-rt-zoom` ก็กดดูได้ · ปิดด้วย `data-rt-zoom="false"` · รูปใหญ่แยกใส่ `data-rt-src="..."`
- เรียกเอง: `RattanaUI.lightbox(['a.jpg', 'b.jpg'], 0)` หรือ `RattanaUI.lightbox([{ src, caption: 'ชื่อสินค้า', sub: '฿1,290' }])`

### ชื่อสินค้าไม่ถูกตัดแล้ว
`.rt-product-name` แสดงชื่อเต็มเสมอ ขึ้นบรรทัดใหม่ได้ตามยาว (แอปเก่าที่ใส่ `rt-clamp2` ไว้ก็แสดงเต็มเอง) และราคาในการ์ดแถวเดียวกันอยู่ระดับเดียวกัน

## ใหม่ใน v1.1
### Popup (คอม = หน้าต่างกลางจอ · มือถือ = bottom sheet ปัดลงปิด หลบคีย์บอร์ดเอง)
```js
RattanaUI.popup({ icon: 'question', title: 'บันทึก?', message: '...', content: '<div>...</div>',
  actions: [{ label: 'ยกเลิก', variant: 'glass', value: false },
            { label: 'บันทึก', variant: 'gold', value: true, onClick: () => save() }] })   // คืน Promise = ปุ่มหมุนรอ
  .then(v => ...);
RattanaUI.confirm({ title, message, variant: 'approve' | 'reject', confirmText })   // → true/false (เหมือน v1.0)
RattanaUI.alert({ type: 'success' | 'error' | 'warning' | 'info', title, message });
RattanaUI.menu(button, [{ label: 'แก้ไข', value: 'edit' }, '-', { label: 'ลบ', value: 'del', danger: true }]);
RattanaUI.drawer({ title: 'ตัวกรอง', content: '...', side: 'right' | 'left' });
RattanaUI.sheet({ title, content });
RattanaUI.toast('ลบแล้ว', { type: 'info', duration: 6000, action: { label: 'เลิกทำ', onClick: undo } });  // ปัดทิ้งได้
```
icon: `success` `approve` `error` `reject` `warning` `info` `question` `gold`

### โมชัน (ใส่ attribute อย่างเดียว)
| attribute / class | ผล |
|---|---|
| `data-rt-reveal` (`scale` `left` `right` `blur`) | โผล่ตอนเลื่อนถึง |
| `data-rt-stagger="70"` | ลูกทุกตัวโผล่ทีละชิ้น |
| `data-rt-tilt="8"` | การ์ด 3D เอียงตามเมาส์ (คอมเท่านั้น) |
| `data-rt-count="248350" data-prefix="฿"` | ตัวเลขนับขึ้นเมื่อเห็น |
| `class="rt-page"` | หน้าเปิดแบบค่อย ๆ ปรากฏ + เปลี่ยนหน้ามี transition |
| `RattanaUI.transition(fn)` | เปลี่ยนเนื้อหาในหน้าแบบลื่น |

ปุ่มมีคลื่นแสงตอนกด, ปุ่มทองมีแสงวิ่ง, สลับธีมเป็นวงกลมกระจาย · เครื่องที่ตั้ง "ลดการเคลื่อนไหว" จะนิ่งเอง

### ปุ่มบันทึกแบบสั้น
- `rt-btn-block` เต็มความกว้างเฉพาะบนมือถือ · คอม/แท็บเล็ตเป็นปุ่มสั้นชิดขวา
- แถบปุ่ม: ข้อมูลอยู่ซ้าย ปุ่มอยู่ขวา
```html
<div class="rt-actions">
  <div class="rt-actions-info"><span class="rt-cell-main">รวม 12 รายการ · ฿35,400.00</span><span class="rt-cell-sub">บันทึกล่าสุด 11:20 น.</span></div>
  <button class="rt-btn rt-btn-glass">ยกเลิก</button>
  <button class="rt-btn rt-btn-gold">บันทึก</button>
</div>
```

### อุปกรณ์
- `html[data-platform="ios|android|desktop"]`, `data-input="touch|mouse"`, `data-standalone` และ `RattanaUI.platform`
- เว้นขอบรอยบาก/แถบ home ให้เอง: `.rt-safe-top` `.rt-safe-bottom` `.rt-sticky-top` `.rt-pad-bottom-nav`
- ช่องกรอก 16px บนจอสัมผัส (iPhone ไม่ซูมเอง) · ปุ่มกดอย่างน้อย 40–44px · hover เฉพาะเมาส์
- `RattanaUI.haptic('light' | 'success' | 'error')` สั่นบน Android
- โครงหน้าแอป `.rt-shell` (แล็ปท็อปเห็นเมนูข้าง · มือถือ/แท็บเล็ตสไลด์ออกด้วย `[data-rt-menu-toggle]`)
- ซ่อน/แสดง: `.rt-only-mobile` `.rt-only-desktop` `.rt-hide-mobile` `.rt-hide-desktop` `.rt-hide-standalone`

## กฎโลโก้
ห้ามวาดใหม่ เปลี่ยนสี ยืด ครอป แยกรถเข็นออกจากตัวหนังสือ หรือใส่เอฟเฟกต์ · ไฟล์พื้นใสห้ามวางบนพื้นสว่าง (ตัวหนังสือสีขาวจะหายไป)

## อัปเดตเวอร์ชัน
แก้ไฟล์ใน repo นี้ที่เดียว ทุกแอปที่ลิงก์มาจะได้หน้าตาใหม่ทันที (v1.1 ใช้ class และคำสั่งเดิมของ v1.0 ได้ทั้งหมด)
ถ้ากลัวแอปเก่าพัง ให้ทำโฟลเดอร์ตามเวอร์ชัน เช่น `/v1/rattana-ui.css` แล้วให้แอปลิงก์ไปที่เวอร์ชันที่ต้องการ
