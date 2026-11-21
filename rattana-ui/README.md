# Rattana CI v1.4.0

UI กลางของบริษัท — Crystal Luxury (โหมดสว่าง) + Luxury Dark (โหมดมืด)
ใช้ได้ทั้ง iOS · Android · Laptop พร้อม popup และโมชันแบบพรีเมียม

## ไฟล์
- `rattana-ui.css` — สี ฟอนต์ คอมโพเนนต์ popup และโมชันทั้งหมด (class ขึ้นต้นด้วย `rt-`)
- `rattana-ui.js` — `window.RattanaUI`: ธีม, TH/EN, popup, เมนู, drawer, toast, ยืนยัน, ปุ่ม loading, ตรวจอุปกรณ์, จัดรูปแบบวันที่/เงิน
- `rattana-logo-navy.png` — โลโก้บนพื้นกรมท่า (มีพื้นที่ว่างรอบโลโก้แล้ว) ใช้บนพื้นสว่าง
- `rattana-logo-transparent.png` — โลโก้พื้นใส ใช้บนพื้นกรมท่า/โหมดมืดเท่านั้น
- `index.html` — หน้า demo + คู่มือ (คัดลอกโค้ดได้)
- `sample/` — รูปสินค้าตัวอย่างสำหรับหน้า demo (ข้อมูลตัวอย่าง)
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
