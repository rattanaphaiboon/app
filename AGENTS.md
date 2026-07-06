# AGENTS.md — กฎกลางสำหรับ AI agent ที่ทำงานใน repo `rattanaphaiboon/app`

> ไฟล์นี้ถูกอ่านอัตโนมัติโดย Claude Code / agent ทุกตัวที่ทำงานใน clone ของ repo นี้
> ทุกคนที่แก้ repo นี้ผ่าน AI ให้ยึดกฎด้านล่าง — ไม่ต้อง paste ซ้ำทุกแชท

## repo นี้คืออะไร
- Deploy repo ของ **production apps** เท่านั้น (Rattana Hub + แอปทั้งหมด) → GitHub Pages `https://rattanaphaiboon.github.io/app/`
- ❌ ห้าม commit: mockup / prototype / draft / backup / ไฟล์ที่มี version ในชื่อ (`*-v1.2.html`) — มี pre-commit hook กันอยู่
- version ของแอปอยู่ **ใน UI + ใน `<title>`** ไม่ใช่ในชื่อไฟล์ (URL ต้องคงที่)

## ⚠️ GitHub Pages Deploy Check — ตั้งแต่ 2026-07-06 = deploy ผ่าน GitHub Actions (ไม่ใช่ legacy build อีกแล้ว)
Deploy ทำผ่าน workflow **"Deploy to GitHub Pages"** (`.github/workflows/deploy-pages.yml`) ที่มี concurrency queue — แก้ปัญหา deploy ชนกัน fail ("Deployment failed, try again later") หายขาด

**วิธีเช็คว่าขึ้น live (ทำตามนี้เท่านั้น):**
1. ยืนยัน push: `git rev-parse HEAD` == `git rev-parse origin/main`
2. ยืนยัน deploy จบ: `gh run list --repo rattanaphaiboon/app --workflow "Deploy to GitHub Pages" --limit 3`
   - รอ run ที่คุม commit เรา (หรือใหม่กว่า) เป็น `completed success` ก่อน แล้วค่อยเช็ค live
3. ยืนยัน live: GET `https://rattanaphaiboon.github.io/app/<file>.html?cb=<timestamp>` → เทียบ `<title>`/marker โค้ดใหม่
   - `age` header = เช็ค Fastly CDN propagation (ปกติ · หน่วง 1-3 นาทีได้) — คนละเรื่องกับ build API

**สถานะ run:**
- `success` = ขึ้นแล้ว ✅
- `cancelled` = โดน commit ใหม่กว่า supersede = **ปกติ ไม่ใช่ error** — ของเราขึ้น live กับ run ตัวถัดไป (deploy ทั้ง repo) → ❌ ห้าม rerun ❌ ห้าม push ซ้ำ
- `failure` = ผิดปกติจริง (นานๆ ที เช่น GitHub flaky) → `gh run rerun <id>` เฉพาะตัวล่าสุดตัวเดียว

**❌ ห้ามทำเด็ดขาด:**
- ❌ **ห้าม poll REST API `/repos/.../pages/builds`** เป็นสัญญาณ deploy — เป็น legacy endpoint ที่**ตายแล้ว** จะคืน commit เก่าค้างตลอด → agent รอวนไม่จบ + push empty-commit "re-trigger" ซ้ำมั่ว (เคสจริง 2026-07-06) · ใช้ `gh run list` เท่านั้น
- ❌ ห้ามแก้/ลบ `.github/workflows/deploy-pages.yml`
- ❌ ห้ามสลับ Settings → Pages → Source กลับเป็น "Deploy from a branch"

## Push
- push เข้า `rattanaphaiboon/app` (main) เท่านั้น · ก่อน push เสมอ `git pull --rebase`
- clone นี้อาจถูกใช้ร่วมหลายแชท/หลายคน — ถ้าเห็น commit ที่ไม่ใช่ของตัวเอง ahead อยู่ **อย่า push พ่วงมั่ว** เช็คก่อนว่าเจ้าของพร้อม deploy แล้ว
