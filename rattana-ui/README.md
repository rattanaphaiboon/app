# RATTANA UI v1.0.0

UI กลางของบริษัท — Crystal Luxury (โหมดสว่าง) + Luxury Dark (โหมดมืด)

## ไฟล์
- `rattana-ui.css` — สี ฟอนต์ และคอมโพเนนต์ทั้งหมด (class ขึ้นต้นด้วย `rt-`)
- `rattana-ui.js` — `window.RattanaUI`: สลับธีม, TH/EN, toast, หน้าต่างยืนยัน, ปุ่ม loading, จัดรูปแบบวันที่/เงิน
- `rattana-logo-navy.png` — โลโก้บนพื้นกรมท่า (มีพื้นที่ว่างรอบโลโก้แล้ว) ใช้บนพื้นสว่าง
- `rattana-logo-transparent.png` — โลโก้พื้นใส ใช้บนพื้นกรมท่า/โหมดมืดเท่านั้น
- `index.html` — หน้า demo + คู่มือ (คัดลอกโค้ดได้)
- `tokens.json` — ค่าสีและขนาดต้นฉบับ (ตรงกับ Design System "RATTANA" บน Claude)

## ลิงก์
- หน้า demo + วิธีใช้ (คัดลอกโค้ดได้): https://rattanaphaiboon.github.io/app/rattana-ui/
- ไฟล์: https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.css · https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.js

> โฟลเดอร์นี้เป็นของกลางให้ "ดึงไปใช้เอง" (opt-in) ไม่มีผลกับแอปอื่นใน repo จนกว่าแอปนั้นจะลิงก์ไฟล์เอง

## ใช้ในแอป
```html
<html lang="th" data-theme="light">
<head>
  <link rel="stylesheet" href="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.css">
  <script src="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-ui.js" defer></script>
</head>
<body class="rt-app">
  <div class="rt-bg"><div class="rt-bg-arc"></div><div class="rt-bg-arc"></div></div>
  <a class="rt-logo" href="/">
    <img class="rt-logo-light" src="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-logo-navy.png" alt="RATTANA">
    <img class="rt-logo-dark" src="https://rattanaphaiboon.github.io/app/rattana-ui/rattana-logo-transparent.png" alt="RATTANA">
  </a>
  ...
</body>
```
Sidebar สีกรมท่า: `<img class="rt-logo-on-navy" src=".../rattana-logo-transparent.png" alt="RATTANA">`

## กฎโลโก้
ห้ามวาดใหม่ เปลี่ยนสี ยืด ครอป แยกรถเข็นออกจากตัวหนังสือ หรือใส่เอฟเฟกต์ · ไฟล์พื้นใสห้ามวางบนพื้นสว่าง (ตัวหนังสือสีขาวจะหายไป)

## อัปเดตเวอร์ชัน
แก้ไฟล์ใน repo นี้ที่เดียว ทุกแอปที่ลิงก์มาจะได้หน้าตาใหม่ทันที
ถ้ากลัวแอปเก่าพัง ให้ทำโฟลเดอร์ตามเวอร์ชัน เช่น `/v1/rattana-ui.css` แล้วให้แอปลิงก์ไปที่เวอร์ชันที่ต้องการ
