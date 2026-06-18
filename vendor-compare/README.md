# Rattana Vendor Compare

แอปเทียบยอดขาย Vendor — ย้อนหลัง 6 เดือน (BigQuery) vs เดือนปัจจุบัน (BP) + การกระจายร้านค้า + ซื้อเข้า (Sell-In)

## 🔗 ลิงก์ใช้งาน

**https://rattanaphaiboon.github.io/app/vendor-compare/rattana-vendor-compare.html**

> เปิดได้เฉพาะ User Role ≥ 5 (เช็คจาก Users sheet)

## 📁 ไฟล์ในโฟลเดอร์

| ไฟล์ | คืออะไร |
|---|---|
| `rattana-vendor-compare.html` | ตัวแอป (HTML/CSS/JS ไฟล์เดียว) — deploy ผ่าน GitHub Pages |
| `backend.gs` | **ต้นฉบับอ้างอิง** ของ Apps Script BQ Proxy (ของจริงอยู่ใน Apps Script) |

## ⚙️ Data Sources

| แหล่ง | ID / ที่อยู่ | ใช้ทำอะไร |
|---|---|---|
| BigQuery | `project-test-471907.Testimport.BQ_2024_2025` | ยอดขายย้อนหลัง 6 เดือน |
| Apps Script Proxy | Script ID `1NC2e_Yd-CfiuvZ-Yf7tPm61WEg6IFhKeEQXRD6wxUwtaebq8dA2AdWRF` | ตัวกลางเรียก BQ |
| BP sheet | `1NxFkxiQev0xxGir93-qt0flNfzHz848-KuE7jDRSxQE` tab `BP` | ยอดขายเดือนปัจจุบัน |
| Stock sheet | `16mYDqAqqJma-_0vCIAajy6bcjdOZ7F6VagxkdkqAB2I` tab `PDDT` | สต๊อกตามคลัง |
| Sell-In (IB) | `1nqxRB3h0168e1bd2pquuW7DV1Y4hAo-TOiheXbLuA1c` tab `IB` | ซื้อเข้า |
| Users (auth) | `1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ` | login + role check |

## 🚀 วิธีอัปเดต

### อัปเดต HTML (หน้าเว็บ)
1. แก้ `rattana-vendor-compare.html`
2. commit + push เข้า `rattanaphaiboon/app` (branch `main`)
3. GitHub Pages อัปเดตเอง ~1-2 นาที

### อัปเดต backend.gs (ตัวเรียก BigQuery)
> ⚠️ แก้ใน GitHub อย่างเดียว **ไม่พอ** — ของจริงรันใน Apps Script
1. แก้ `backend.gs` ที่นี่ (เก็บประวัติ)
2. copy ทั้งหมดไปวางใน [Apps Script](https://script.google.com/home/projects/1NC2e_Yd-CfiuvZ-Yf7tPm61WEg6IFhKeEQXRD6wxUwtaebq8dA2AdWRF/edit)
3. 💾 Save → Deploy → จัดการการทำให้ใช้งานได้ → ✏ → เวอร์ชันใหม่ → Deploy
4. Web App URL เดิมคงอยู่

## 📌 ข้อควรรู้ / กับดัก

- **CFG_KEY versioning** — เปลี่ยน `DEFAULT_CFG` ต้อง bump `CFG_KEY` (เช่น v10) เพื่อล้าง localStorage เก่าของ user
- **BP column `Channal`** สะกดผิด (N เดียว) — code รองรับทั้ง 2 แบบ
- **Vendor name bridge** — BQ ใช้ชื่อเต็ม (`บริษัท แดรี่ พลัส จำกัด`), IB ใช้ชื่อย่อ (`บจก. แดรี่ พลัส`) → bridge ผ่าน BP column `Vendor_Name` (1 ชื่อเต็ม → หลายชื่อย่อได้)
- **CP Food Store** ยอด CS เป็นกิโล → หาร 1000 เป็นตัน (`_isCPVendor`)
- **% เทียบ AVG ตรงๆ** ไม่ใช่ pro-rata (stats card ใช้ per-day rate: BP/วันที่ผ่าน ÷ AVG/26)
- **OAuth origin** — ถ้าย้าย domain ต้องเพิ่ม origin ใหม่ใน [Cloud Console Credentials](https://console.cloud.google.com/apis/credentials) (Client ID `909097830974-...`)

## 🔢 เวอร์ชัน

- HTML: v3.0
- backend.gs: v1.6
