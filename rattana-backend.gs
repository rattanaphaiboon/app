/**
 * ============================================================
 * RATTANA ATTENDANCE — APPS SCRIPT BACKEND
 * v8.9 — หน้าอนุมัติเห็น "รูปแนบ" ที่พนักงานส่งมา (คอลัมน์ O การลาApp) — คู่แอป v12.61 · ต้อง Deploy
 * v8.8 — getTimeIssues: หัวหน้า PTT เต็มระบบไม่มีลูกน้องในชีท Users → ทีมว่าง การ์ดไม่ขึ้น
 *         แก้: ดึงทีมจากทะเบียน PTT ให้ด้วย + previewTimeIssues() ไว้ตรวจจาก editor
 * v8.7 — getTimeIssues() — ข้อมูลลงเวลาที่ต้องตรวจของลูกทีม (คู่แอป v12.59 · ★ ต้อง Deploy)
 *         แจ้งเป็นการ์ดในแอปให้หัวหน้า แทนส่งอีเมล — เตือนคนที่แก้ได้ ข้างปุ่มที่ใช้แก้
 * v8.6 — getPTTBuyers อ่านคอลัมน์สถานะผิด (K แทน J) → พนักงาน PTT 4 คนหายจากลิสต์ชื่อผู้ซื้อ
 * v8.5 — getAmazonOrders() — ประวัติที่ "ผู้กด" คีย์ไว้ ล่าสุดบนสุด (คู่แอป v12.55 · ต้อง Deploy)
 * v8.4 — auditInOutPairs บอกเลขแถวของเคสที่ต้องแก้เอง (หาแถวในชีทได้ทันที)
 * v8.3 — เซิร์ฟเวอร์ตัดสิน เข้า/ออก เอง (คู่แอป v12.54 · ★ ต้อง Deploy New version):
 *         เดิมเชื่อค่าที่แอปส่ง ซึ่งแอปเดาจาก log ในเครื่อง → ว่างได้ (เปลี่ยนเครื่อง/ล้างแคช/
 *         กดก่อน sync กลับมา/จอสแกนลูกทีมตั้งโหมดค้างที่ "เข้า") = ได้ เข้า ซ้อน เข้า ทั้งวัน
 *         แก้: autoInOut_() อ่านสแกนล่าสุดของคนนั้นในวันเดียวกันจากชีท แล้วสลับให้ถูก (ทำในล็อก)
 *         ยกเว้นเมื่อผู้ใช้กดเลือกเอง (typeForced) หรือส่งซ้ำของเก่าที่ค้างออฟไลน์
 * v8.2 — auditLeaveDates() / fixLeaveDatesApply() — วันที่ในชีทการลาApp หน้าตาไม่เหมือนกัน
 *         (คนแก้เซลล์เองในชีท) · ที่กลายเป็น "ข้อความ" ทำสูตรลา+โควต้าตกหล่นเงียบๆ
 * v8.1 — systemHealthCheck() ตรวจสุขภาพระบบรวบยอด (รันจาก editor · อ่านอย่างเดียว)
 *         + ถอด 680032 ชลธิชา วิมลสถาพร ออกจาก HS_QUOTA_2026 (ลาออกแล้ว · ไม่เคยมีในชีทไหน)
 *         เห็นครบ: สแกนซ้ำ · Holidays · สูตรสรุปวันรุ่นใหม่หรือยัง · โควต้า/ใช้ก่อนใช้แอป/ผู้อนุมัติเฉพาะ · การลาApp
 * v8.0 — cleanDuplicateScans ลบเป็นก้อน (แถวติดกันรวบครั้งเดียว) — 730 แถวเรียกทีละแถวเสี่ยงหมดเวลา
 * v7.9 — แก้ต้นเหตุสแกนลงซ้ำ (คู่แอป v12.53 · ★ ต้อง Deploy New version ถึงจะหยุดซ้ำ):
 *         actionCheckin ไม่เคยมีล็อก → แอป retry ขณะคำขอแรกยังทำงานค้าง = สองคำขอวิ่งพร้อมกัน
 *         ทั้งคู่อ่านชีทก่อนอีกฝั่งเขียน → ด่านกันซ้ำ+ด่าน 60 นาที มองไม่เห็นกัน → ได้ 2-4 แถวเวลาเดียว
 *         แก้: ครอบด้วย LockService(25 วิ) ตั้งแต่ตรวจซ้ำจนเขียนเสร็จ + เทียบ clientId แบบตัดช่องว่าง/รองรับค่าเก่าที่เป็นตัวเลข
 *         + cleanDuplicateScans(วัน, true) ล้างแถวซ้ำเก่า (เก็บแถวที่มีรูปไว้ก่อน)
 * v7.8 — ตรวจสแกนซ้ำ: auditDuplicateScans() → แท็บ "ตรวจสแกนซ้ำ" (รันจาก editor)
 *         บอกสาเหตุรายคู่จาก clientId: เหมือนกัน=ตัวกันซ้ำไม่ทำงาน · ต่างกัน=ส่งคนละครั้ง · ว่าง=แถวเก่า
 * v7.7 — วันหยุดที่ "มีสแกน" = นับเป็นวันทำงาน (ต้องรัน setupDailySummary ใหม่):
 *         ไม่มีสแกน → วันอาทิตย์/วันนักขัตฯ ตามเดิม · มีสแกน ≥9 ชม. → "ทำงานเต็มวัน" (นับแรงปกติ)
 *         มาแต่ไม่ครบเกณฑ์ → "ทำงานวันหยุด" · สแกนขาเดียว → "ไม่ครบคู่ (วันหยุด)" — ทั้งคู่ไม่นับขาด
 *         คอลัมน์ I ยังโชว์ชื่อวันหยุด → HR กรองคิดค่าทำงานวันหยุดได้
 * v7.6 — ตรวจแท็บ Holidays: checkHolidays() บอกว่าคอลัมน์ A เป็นวันที่จริงหรือข้อความ
 *         (สูตรสรุปวันใช้ VLOOKUP(INT(วันที่)) — ถ้าเป็นข้อความจะหาไม่เจอเงียบๆ)
 *         + fixHolidayDates() แปลงข้อความเป็นวันที่จริงให้ · รันจาก editor ไม่ต้อง Deploy
 * v7.5 — ตรวจบั๊กทั้งระบบ (คู่แอป v12.51):
 *         · ทางถอย T.LEAVE ยังคิดโควต้าแบบ ชม.÷8 — เปลี่ยนมาใช้ leaveQuotaDays_ ให้ตรงกติกาเดียวกัน
 *         · reimburseAmount_ หาคอลัมน์ "ค่าแรงต่อวัน" แบบชื่อเป๊ะก่อน (กันโดนคอลัมน์อื่นที่มีคำว่ารายวัน)
 * v7.4 — หน้าอนุมัติเห็น "ลาตั้งแต่–ถึง กี่วัน" (คู่แอป v12.50):
 *         getPendingAll ส่ง endDate (คอลัมน์ N) + hours (M) + quotaDays มาด้วยสำหรับใบลา
 * v7.3 — กติกาหักโควต้าลาแบบขั้นบันได (คู่แอป v12.48):
 *         ลาวันเดียว ไม่เกิน 4 ชม. = หัก 0.5 วัน · เกิน 4 ชม. = หัก 1 วัน · ลาหลายวัน = ตามจำนวนวัน
 *         (เดิมหารชั่วโมง÷8 เช่น ลา 2 ชม. หักแค่ 0.25) · คอลัมน์ M ยังเก็บชั่วโมงจริงเหมือนเดิม
 * v7.2 — ขอตกเบิก: คิดยอด "จำนวนเงิน" ใหม่ตามกติกา:
 *         ปรับปรุงเวลา = ค่าแรงรายวัน + เบี้ยเลี้ยงต่อวัน · ลาย้อนหลัง = รายวันอย่างเดียว
 *         ปัดเศษตามหลักคณิตศาสตร์ · หาคอลัมน์จากชื่อหัวในชีท Slip/Slip PTT (สลับคอลัมน์ได้)
 *         หาไม่เจอ = ปล่อยว่างให้ HR กรอกเอง (ไม่ใส่เลขมั่ว)
 * v7.1 — ขอตกเบิก: เลิกเติมช่อง "จำนวนเงิน" (ยกเลิกแล้วด้วย v7.2)
 *         + ตัดการอ่านค่าแรงต่อวันจากชีท Slip ออก (ไม่แตะข้อมูลเงินเดือนโดยไม่จำเป็น)
 * v7.0 — แยก "ยอดที่ใช้ก่อนย้ายมาใช้แอป" ออกจากเพดาน (รันจาก editor):
 *         เดิมยัด "คงเหลือ" ลงช่องเพดาน → หน้าจอโชว์เพี้ยน (พิชชาพร พักร้อน 2/1 แทน 6/5)
 *         ตอนนี้: แท็บโควต้าลา = สิทธิเต็มจริง · แท็บใหม่ "ใช้ก่อนใช้แอป" = วันที่ HumanSoft นับไว้แล้ว
 *         ใช้ไป = แท็บนั้น + ใบลาในแอป · คงเหลือ = เพดาน − ใช้ไป (ตรงกับ HumanSoft ทุกช่อง)
 *         ► รัน importQuotaHumanSoft2026() ซ้ำอีกครั้ง (สร้างแท็บ+ตั้งค่าให้เอง)
 * v6.9 — แท็บตรวจโควต้า: คอลัมน์ "ช่วงอายุงาน" เคยว่าง (อ้างฟิลด์ผิด)
 * v6.8 — แก้ "ตัดโควต้าซ้ำ" ตอนนำเข้าจาก HumanSoft (รันจาก editor):
 *         ใบลาที่บันทึกในแอปแล้ว HumanSoft ก็นับไปแล้ว → เขียนยอดคงเหลือตรงๆ = หักซ้ำ
 *         (พิชชาพร ลากิจเหลือ 4 แทนที่จะเป็น 5) → เขียน "คงเหลือ + วันที่แอปจะหักเอง" แทน
 *         ► รัน importQuotaHumanSoft2026() ซ้ำได้เลย ค่าจะถูกตั้งใหม่ให้ถูกต้อง
 * v6.7 — นำเข้าโควต้าจากรายงาน HumanSoft ปี 2026 (รันจาก editor):
 *         ► importQuotaHumanSoft2026() — เขียน "ยอดคงเหลือ" ลงแท็บโควต้าลา 38 คน
 *         ตัวเลขจากไฟล์ "รายงานโควตาการลาประจำปี 2026" (ณ 26/08/2026) · ลาคลอดรวม 98 วัน
 * v6.6 — แก้ "ไม่พบวันเริ่มงาน" ของพนักงาน PTT (ต้อง Deploy New version):
 *         ทะเบียน PTT ทำด้วย IMPORTRANGE/QUERY → ช่อง "เข้า" เป็นวันที่จริง (Date)
 *         pttMap_ เดิมใช้ String(Date) ได้ "Fri Dec 27 2019..." → parseDDMMYYYY อ่านไม่ออก
 *         = PTT ที่ไม่มีแถวในชีท Users ทุกคน โควต้าลาไม่ทำงาน (หน้าโควต้าขึ้น "แจ้ง HR")
 *         แก้: pttMap_ ใช้ formatDate() + parseDDMMYYYY รองรับ yyyy-MM-dd
 * v6.5 — ตัวตรวจโควต้า auditLeaveQuota() (รันจาก editor):
 *         ได้แท็บ "ตรวจโควต้า" เทียบรายคน: เพดาน / ใช้ไปแล้ว / คงเหลือ / ที่มาของเพดาน
 *         + อ่านชีทการลาApp ครั้งเดียวต่อการรัน (เร็วขึ้นมากเวลาคิดโควต้าหลายคน)
 *         หมายเหตุกติกา (surat เคาะ 24/08): ลาคร่อมวันหยุด = นับทุกวันตามปฏิทิน (ไม่ข้ามเสาร์-อาทิตย์)
 * v6.4 — เพิ่ม "ลาฝึกอบรม" + ตัวปรับลาคลอดเป็น 98 วัน (คู่แอป v12.45):
 *         ลาฝึกอบรม: ฟอร์มยื่น → ชีท → ตัวนับ → หน้าโควต้า ครบวงจร (ค่าเริ่มต้น = ไม่จำกัด กรอกจำกัดได้ในแท็บโควต้าลา)
 *         ► รัน fixMaternityQuota98() 1 ครั้ง — ปรับคอลัมน์ลาคลอดในแท็บให้รวมกันได้ 98 วัน
 * v6.3 — โควต้าลา: อ่านคอลัมน์ตาม "ชื่อหัวคอลัมน์" ไม่ใช่ตำแหน่ง:
 *         HR จัดเรียง/เพิ่มคอลัมน์เองได้ (ลาคลอด+ลาคลอดไม่รับค่าจ้าง รวมเป็นเพดานเดียว)
 *         + รับวันเริ่มงานที่ HR พิมพ์เองในคอลัมน์ D (คนที่ Users/PTT ไม่มีวันเริ่มงาน เดิมโควต้าไม่ทำงานเลย)
 *         + setupLeaveQuota ไม่เขียนทับหัวคอลัมน์ที่ HR จัดไว้ และไม่ลบวันเริ่มงานที่พิมพ์เอง
 * v6.2 — ตารางผู้อนุมัติเฉพาะของแอปนี้ (คู่แอป v12.43):
 *         แท็บ "ผู้อนุมัติเฉพาะ" ในชีทแอป — กำหนดผู้อนุมัติรายคนโดยไม่แตะชีท Users (แอปอื่นใช้ร่วม)
 *         ► รัน setupApproverOverride() 1 ครั้ง (สร้างแท็บ + ใส่ จิรวรรณ พวงแก้ว → ธนภรณ์ รัตนไพบูลย์)
 *         คำขอของคนที่มีชื่อในตาราง = เข้าคิวผู้อนุมัติคนนั้นเท่านั้น (HR ยังเห็นทุกใบ)
 * v6.1 — ห้ามอนุมัติคำขอของตัวเอง (คู่แอป v12.42):
 *         getPendingAll ตัดแถวที่ empId = ผู้ขอเอง — คำขอของหัวหน้าเด้งไปหาหัวหน้าของเขา
 *         (จิรวรรณ เห็นคำขอตัวเองในคิวตัวเอง เพราะทีม PTT รวมตัวเธอ) · คนอื่นที่มีสิทธิ์ยังเห็นครบ
 * v6.0 — กันคำขอลงซ้ำ "ทุกหัวข้อ" (คู่แอป v12.41):
 *         ด่านที่ router: reqId ซ้ำ = ไม่ทำซ้ำ ตอบ ok (ทะเบียนแท็บซ่อน _reqLog)
 *         ครอบ ลา/เปลี่ยนวันหยุด/แก้เวลา/ขอเอกสาร/อุปกรณ์/เบิกเงิน/สั่งข้าว/สวัสดิการ/ใบเตือน/
 *         โอนย้าย-ผ่านทดลอง-ปรับเงินเดือน-ขอกำลังคน/สั่งของ/จัดกะ/แก้เวลารายวัน
 * v5.9 — กันคำขอลงซ้ำ เฉพาะกลุ่มลา (คู่แอป v12.40):
 *         ต้นเหตุ: แอป retry อัตโนมัติ 3 ครั้งเมื่อ Apps Script ตอบช้า/ตอบ HTML
 *         แต่ฝั่งเซิร์ฟเวอร์เขียนแถวไปแล้ว → 1 การกด = ได้สูงสุด 3 แถว (ห่างกัน ~30 วิ)
 *         แก้: actionSubmitLeaveApp รับ p.reqId (รหัสกำกับคำขอ คงเดิมทุก retry) เก็บคอลัมน์ P
 *              เจอ reqId ซ้ำ = ไม่เขียนซ้ำ ตอบ ok · สำรอง: แถวเหมือนกันเป๊ะภายใน 5 นาที = ข้าม
 *              + LockService กัน 2 คำขอชนกัน · cleanDuplicateLeaveRows() ล้างแถวซ้ำเก่า (รันครั้งเดียว)
 * v5.8 — ปุ่ม "ยกเลิกคำขอ" ให้พนักงาน (คู่แอป v12.39 · ต้อง Deploy New version):
 *         cancelMyLeave — ยกเลิกคำขอของตัวเองในการลาApp ได้เฉพาะสถานะยังรอ (pending)
 *         เปลี่ยนสถานะเป็น 'cancelled' ไม่ลบแถว (เก็บประวัติ + ไม่นับโควต้า/สรุปวัน/แท็บอนุมัติ)
 *         กันแถวขยับด้วยการเทียบเวลา "ขอวันที่" · HR ยกเลิกแทนพนักงานได้
 * v5.7 — หน้าอนุมัติมีแท็บ รออนุมัติ/อนุมัติ/ไม่อนุมัติ (คู่แอป v12.38 · ต้อง Deploy New version):
 *         getPendingAll รับ p.withDone=1 → ส่งรายการที่อนุมัติ/ไม่อนุมัติแล้วมาด้วย
 *         (จำกัดท้ายสุด 60 รายการ/ชีท กัน payload บวม) ทุกรายการมี field status + approver
 * v5.6 — QR ต้องตรงจุดที่ยืนอยู่จริง (คู่แอป v12.37 · ต้อง Deploy New version):
 *         อุดช่องโหว่: เดิมสแกน QR ของ "จุดอื่น" ก็ผ่าน (เช่น อยู่ HQ สแกน QR ของ W2)
 *         → actionCheckin เทียบพิกัด GPS ที่ส่งมากับพิกัดของจุดใน QR ต้องอยู่ในรัศมี
 *         (+เผื่อคลาดเคลื่อน 80 ม.) ไม่งั้นปฏิเสธ · ฝั่งแอป v12.37 กันไว้อีกชั้นตั้งแต่ตอนสแกน
 * v5.5 — QR ประจำจุดสแกน (คู่แอป v12.19 · ต้อง Deploy New version):
 *         หลักฐานสำรองเมื่อ "ระบบใบหน้าไม่พร้อม" — HR พิมพ์ QR ติดไว้แต่ละจุด
 *         พนักงานสแกน QR = พิสูจน์ว่าอยู่หน้างานจริง (รูปถ่าย+GPS ยังเก็บตามปกติ)
 *         ► ขั้นตอน: วางไฟล์ → รัน setupLocationQR() 1 ครั้ง (สร้าง secret ใน Locations
 *           คอลัมน์ G) → Deploy New version → ในแอป (HR): ตั้งค่า → พิมพ์ QR ประจำจุดสแกน
 *         · QR = "RTQR|รหัสจุด|secret" · secret อยู่เฉพาะชีท (getLocations ส่งแค่ธง qr)
 *         · actionCheckin ตรวจ qrToken ตรงกับจุดจริงก่อนบันทึก · scannedBy = "qr:จุด"
 * v5.4 — แก้ SyntaxError: Identifier 'QUOTA_TAB' has already been declared
 *         (v5.3 ตั้งชื่อชนกับ QUOTA_TAB='โควต้ากะ' ของระบบจัดกะ ~บรรทัด 3475)
 *         → เปลี่ยนของโควต้าลาเป็น LQ_TAB / LQ_COLS
 * v5.3 — แท็บ "โควต้าลา" ให้ HR กรอกโควต้ารายคนเอง (คู่แอป v12.14):
 *         ► รัน setupLeaveQuota() 1 ครั้งจาก editor (ไม่ต้อง Deploy ก็สร้างแท็บได้
 *           แต่ต้อง Deploy New version เพื่อให้ระบบ "อ่าน" ค่าที่กรอกไปใช้จริง)
 *         โครง: รหัส|ชื่อ|คลัง|วันเริ่มงาน|โควต้าอัตโนมัติ(อ้างอิง)|ลากิจ|ป่วยมีใบ|
 *               ป่วยไม่มีใบ|พักร้อน|กิจไม่รับค่าจ้าง|ลาคลอด|หมายเหตุ
 *         กติกาช่องสีเหลือง: เว้นว่าง = ใช้ค่าอัตโนมัติตามอายุงาน · ตัวเลข = ใช้ตัวเลขนั้น
 *         (เช่น พักร้อนยกยอดใส่ยอดรวม) · "ไม่จำกัด" = ไม่จำกัด
 *         รันซ้ำได้: ค่าที่กรอกไม่หาย เติมพนักงานใหม่ + รีเฟรชคอลัมน์ข้อมูล/ค่าอ้างอิง
 * v5.2 — โควต้าล็อกแข็ง (surat เคาะ · คู่แอป v12.13 · ต้อง Deploy New version):
 *         เกินโควต้า = ยื่นไม่ได้ (QUOTA_HARD_BLOCK=true) + ข้อความแนะนำประเภทที่ยังเหลือ
 *         (เฉพาะ กิจ/พักร้อน/กิจไม่รับค่าจ้าง) · ยกเว้น HR ยื่นแทนได้ (ติดธง ⚠เกินโควต้า)
 * v5.1 — ระบบโควต้าลาครบวงจร (คู่แอป v12.12 · ต้อง Deploy New version):
 *         (1) พนักงาน PTT ใช้หน้าโควต้าได้แล้ว — วันเริ่มงานจากทะเบียน PTT คอลัมน์ "เข้า"
 *         (2) เพิ่มโควต้าลาคลอด 98 วันตามกฎหมาย (นับใช้ไปจากลาคลอดทั้งสองแบบ)
 *         (3) ด่านโควต้าตอนยื่น (soft): เกินยังยื่นได้ แต่รายละเอียดถูกประทับ "⚠เกินโควต้า"
 *             ให้ผู้อนุมัติ/ชีทเห็นชัด · สวิตช์ QUOTA_HARD_BLOCK=true = ห้ามยื่นเมื่อเกิน
 *         (4) getLeaveQuota ตอบ startSource บอกที่มาวันเริ่มงาน (Users/ทะเบียน PTT)
 * v5.0 — การลาApp = แหล่งความจริงเดียวของฝั่ง "อ่าน" (ต้อง Deploy New version):
 *         getMyLeaves + โควต้าวันลา อ่านจากชีทการลาApp โดยตรง (แปลงประเภทไทย→โค้ดให้แอป)
 *         — เดิมอ่านแท็บ log ภายในที่เขียนคู่ตอนยื่น: HR ลบแถวในชีทแล้วรายการค้างในแอป
 *         และสถานะใน log ไม่เคยถูกอัปเดตตอนอนุมัติ → หน้าโควต้านับวันลาที่ใช้ได้ 0 ตลอด (บั๊กแฝง)
 *         แท็บ log ยังเขียนต่อเป็นประวัติสำรอง แต่ไม่ถูกใช้อ่านแล้ว (ยังไม่ migrate = อ่านแบบเดิม)
 * v4.9 — รอบเก็บบั๊ก (คู่แอป v12.10):
 *         (1) รูปแนบฟอร์มลา (ใบรับรองแพทย์) เคยถูกทิ้งเงียบ — ฟอร์มส่งชื่อ attachment
 *             แต่รับแค่ photo → รับทั้งคู่แล้ว (ลง Supabase requests/ + ลิงก์คอลัมน์ O)
 *         (2) เติมสแกนย้อนหลัง (v4.8): สร้างเวลาแบบระบุ +07:00 ตรงๆ — เดิมพึ่ง timezone
 *             โปรเจกต์สคริปต์ ถ้าไม่ใช่ Bangkok เวลาจะเพี้ยน 7 ชม.
 *         (3) สรุปวัน คอลัมน์ "เวลาที่ใช้ลา" โชว์ชั่วโมงของวันนั้น (cap 8) —
 *             เดิมโชว์ยอดรวมทั้งใบ (ลา 3 วันขึ้น 24 ทุกวัน)
 * v4.8 — ปิดวงจร "แก้เวลาย้อนหลัง" (ต้อง Deploy New version):
 *         อนุมัติคำขอแก้เวลาใน การลาApp → ระบบแตก "เข้า/ออก HH:MM" + วันที่ จากคำขอ
 *         แล้วเติมสแกน retroactive (ป้าย "ย้อน", scannedBy=timeadjust:ผู้อนุมัติ)
 *         ลง CheckinLog + Supabase ทันที → คิดสรุป/สรุปวัน/ลงเวลาAuto ขยับเองอัตโนมัติ
 *         (เดิมอนุมัติแล้วได้แค่ตราประทับ — เวลาไม่เข้าระบบ วันนั้นค้างเป็นผิด/ขาด;
 *          ท่อเก่า applyTimeAdjust เขียนลง "ลงเวลาApp" ที่เลิกใช้ + ทางส่งคำขอเดิมแอปเลิกเรียก)
 *         idempotent: วันเดียว-ชนิดเดียว เติมได้ครั้งเดียว (แก้เพิ่มให้ HR ลบแถวในชีทเอง)
 * v4.7 — ลาครึ่งวัน/รายชั่วโมง คิดเศษวันตามชั่วโมงจริง ÷ 8 (surat เคาะ):
 *         สรุปวัน เพิ่มคอลัมน์ K (ซ่อน) = ชม.ลาอนุมัติ/วัน (cap 8) + สถานะใหม่
 *         "ทำงาน (ลาบางส่วน)" (มีสแกนครบคู่ ไม่เช็ค 9 ชม.) / "ผิด (ลาบางส่วน)" / "ลา"
 *         ลงเวลาAuto: ช่องลา = Σชม./8 · แรง = เต็มวัน + (1−ชม.ลา/8) · ขาดคิดเศษเช่นกัน
 *         ► วางแล้วรัน setupDailySummary + setupMonthlyAuto (ไม่ต้อง Deploy)
 * v4.6 — ลาคลอดครบวงจร (คู่แอป v12.9): typeLabel โค้ดดิบ maternity_paid/unpaid
 *         จากแอปเก่า → แปลงเป็น "ลาคลอด (รับ/ไม่รับค่าจ้าง)" ก่อนลงชีท
 *         + ลงเวลาAuto ช่อง "ลาไม่รับค่าจ้าง" ไม่นับลาคลอดซ้ำ (เข้าช่องลาคลอดช่องเดียว)
 * v4.5 — แท็บ "ลงเวลาAuto" (setupMonthlyAuto — รันจาก editor ไม่ต้อง Deploy):
 *         สรุปยอดรายคนจาก สรุปวัน ตามโครงชีทนับมือ HR: ชื่อ|รหัส|คลัง|แรงที่ทำงาน|
 *         ป่วยมีบพ.|กิจรับค่าจ้าง|ลาคลอด|พักร้อน|ป่วยไม่มีใบ|ขาดงาน|ลาไม่รับค่าจ้าง|
 *         สลับวันหยุด|รวมวัน|แรงที่ทำงาน — ขาดงาน = "ผิด" ที่ไม่มีใบลา,
 *         อาทิตย์/นักขัตฯ ไม่นับ, ช่วงวันที่ตาม B1/D1 ของ สรุปวัน
 * v4.4 — เติมช่องที่เคยว่างในการลาApp:
 *         · ชื่อเล่น — ไล่หา ฟอร์ม → ชีท Users → "ทะเบียน PTT คอลัมน์ H ชื่อเล่น" (เพิ่มใน pttMap_)
 *         · จำนวนชั่วโมง — ฟอร์มไม่ส่ง (เปลี่ยนวันหยุด ฯลฯ) = 8 ชม./วัน × จำนวนวัน อัตโนมัติ
 *           ยกเว้น "แก้เวลาย้อนหลัง" ตั้งใจเว้นว่าง (ไม่ใช่การใช้ชั่วโมงลา)
 * v4.3 — ชีทการลาApp โครงคอลัมน์ใหม่ (คำขอ 3 แบบลงชีทเดียว หัวเดียวกัน):
 *         วันที่ | รหัสพนักงาน | ชื่อ-นามสกุล | ชื่อเล่น | คลัง | ประเภทเอกสาร | ขอโดย |
 *         ขอวันที่(timestamp) | สถานะ | ผู้อนุมัติ | อนุมัติเมื่อ | รายละเอียด | จำนวนชั่วโมง
 *         (+ ถึงวันที่, รูปแนบ ต่อท้าย — ลาหลายวัน/รูป) · คลัง จาก User slip คอลัมน์ D
 *         ► ขั้นตอน: วางไฟล์ → Deploy New version ก่อน → รัน migrateLeaveSheet() ครั้งเดียว
 *           (ของเก่าย้ายให้ครบ เก็บสำรองที่ "การลาApp เดิม") → รัน setupDailySummary อัปสูตรลา
 *         · โค้ดรู้จักทั้งสองโครง (เช็คหัว E="คลัง") — ยังไม่ migrate ก็ไม่พัง
 *         · approveAny ประทับ "อนุมัติเมื่อ" (K) อัตโนมัติตอนอนุมัติ/ปฏิเสธ
 * v4.2 — submitLeaveApp รับ p.photo (รูปแนบจากฟอร์ม เช่น เปลี่ยนวันหยุด v12.8):
 *         อัปขึ้น Supabase Storage ใต้ requests/{empId}/... แล้วเขียน "ลิงก์เปิดรูป"
 *         (ผ่านประตู photoView + PHOTO_KEY) ลงคอลัมน์ S "รูปแนบ" ของชีทการลาApp
 *         — backend เก่าไม่พัง แค่ไม่เก็บรูป (ฟิลด์ถูกเมิน)
 * v4.1 — getCheckinLog รับพารามิเตอร์ month ('MM/yyyy') ดึงสแกนทั้งเดือนของพนักงาน
 *         ในคำขอเดียว — ให้ปฏิทิน "ดูประวัติ" ในแอป (v12.5) ระบายสีวันจากข้อมูลระบบ
 *         (แอปมี fallback ใช้กับ backend เก่าได้ แต่เดือนย้อนหลังอาจไม่ครบ — วางตัวนี้แล้วครบ)
 * v4.0 — กะดึกดู "รายวันจากตารางจัดกะ" (สโตร์สลับกะได้ ไม่ฟิกซ์ตัวคน):
 *         วันไหนแท็บจัดกะลงกะเวลาเข้า ≥ 18:00 ให้ใคร → วันนั้นของคนนั้นนับวันแบบ
 *         เที่ยงถึงเที่ยง (เข้า 21:50 + ออก 08:01 วันรุ่งขึ้น = แถวเดียว ทำงานเต็มวัน)
 *         เทียบด้วย ชื่อ-สกุล (TRIM) + วันที่เริ่มกะ · จัดกะกะดึกต้องลงวันที่ = วันเริ่มกะเย็น
 * v3.9 — (ยังใช้ได้เป็นตัวเสริม) User slip คอลัมน์ F "กะ" = "ดึก" สำหรับคนกะดึกตายตัว
 *         — คนที่สลับกะไปมา "อย่าใส่" ให้ระบบดูจากจัดกะรายวันแทน
 * v3.8 — "สรุปวัน": สแกนขาเดียว หรือกดซ้ำติดกัน (ช่วงแรก→สุดท้าย ≤ 5 นาที) —
 *         เวลาโชว์เฉพาะช่อง IN (OUT เว้นว่าง) + สถานะ "ผิด (ไม่ครบคู่)" เสมอ
 *         (เดิมเวลาเดียวกันโชว์ทั้ง IN-OUT อ่านสับสน / กดซ้ำใน 1 นาทีขึ้น "ผิด" เฉยๆ)
 * v3.7 — คอลัมน์ "คลัง" (User slip คอลัมน์ D: HQ/W1-W4) เข้าระบบ:
 *         login ส่ง khlang มากับ user + แท็บ "สรุปวัน" เพิ่มคอลัมน์ J "คลัง"
 *         (VLOOKUP รหัสพนักงาน → User slip) ให้กรอง/จับข้อมูลตามคลังได้
 * v3.6 — เกณฑ์สถานะ "สรุปวัน": ยึดช่วงสแกนแรก→สุดท้าย (สแกนเกินไม่ถือว่าผิด)
 *         ≥2 สแกน: ช่วง ≥9 ชม. = ทำงานเต็มวัน / ไม่ถึง = ผิด · สแกนเดียว = ผิด (ไม่ครบคู่)
 * v3.4 — setupDailySummary(): สร้างรายงาน "สรุปวัน" อัตโนมัติ (แท็บ+สูตร+สี ครบ
 *         ในคลิกเดียว — แทน ลงเวลาApp ที่เลิกใช้) Run ครั้งเดียวจาก editor
 * v3.3 — เลิกเขียนชีท "ลงเวลาApp" (สวิตช์ WRITE_ATT_SHEET=false — ตรรกะช่อง IN/OUT
 *         ไม่เข้ากับกะจริง ข้อมูลเพี้ยน; HR เขียนสูตรเองจาก CheckinLog ดิบแทน)
 *         คู่กับแอป v12.1: แถบเตือน "ไม่ครบคู่" ย้ายมาคำนวณจาก log ในเครื่อง
 * v3.2 — รวมร่าง 2 สาย (เลข v3.1 ชนกันจากคนละแชต):
 *         (ก) จากสายนี้: ด่านกันซ้ำ "ทุกชนิด" 60 นาที + retroactive ยกเว้น (คู่แอป v12.0)
 *         (ข) จากอีกสาย: checkin_log บน Supabase เก็บ retroactive/reason ครบเท่าชีท
 *             (ต้องรัน SQL เพิ่มคอลัมน์ + view หัวคอลัมน์ตามชีทก่อน)
 * v3.1 — ด่านกันสแกนซ้ำขยายเป็น "ทุกชนิด" ภายใน 60 นาที (สาขาเดียวกัน) — คู่กับแอป v12.0
 *         เดิมกันเฉพาะชนิดเดิม แต่แอปสลับ เข้า→ออก อัตโนมัติตอนพนักงานสแกนซ้ำ
 *         (เข้า 07:40 → กดซ้ำ 07:50 กลายเป็น "ออก") เลยหลุดด่าน = เข้า-ออกซ้อนตอนเช้า
 *         · แก้เวลาย้อนหลัง (retroactive) ได้รับยกเว้น — ตั้งใจเติมคู่ที่ขาด ให้ผ่าน
 * v3.0 — action photoView: ประตูเปิดรูปสแกนสำหรับคลิกจากตาราง Supabase
 *         (แทน Edge Function ที่ตั้งยาก) — ต้องตั้ง Script Property: PHOTO_KEY
 * v2.9 — เส้นทางซ่อมรูป (dup) ใช้เวลาจากแถวชีทตัวจริงเสมอ — ห้ามให้เวลาจากคำขอ retry
 *         (เครื่องเก่าส่งเวลาเพี้ยน) ทับ scan_at ใน Supabase (เคสเวลาโชว์ 00:27 ทั้งที่สแกน 14:27)
 * v2.8 — พนักงานใหม่สมัครเองแล้ว login ตัน (คอลัมน์สถานะว่าง): มีตัวตนจริงในทะเบียน
 *         (Users active / PTT "อยู่") → เปิดใช้งานอัตโนมัติ; ไม่มีทะเบียน → ข้อความบอกสาเหตุจริง
 * v2.7 — รอบเก็บบั๊กจาก audit #2:
 *   - ด่านกันซ้ำ: เลิก break เร็ว (แถว resync แทรกท้ายทำด่านปิดเงียบ) + ต่างสาขาอนุญาต
 *     + ซ่อม ลงเวลาApp บนเส้นทาง dup/guard (idempotent) + type รับตัวพิมพ์ใหญ่
 *   - audit fallback ชีท: เทียบวันที่กับเซลล์ชนิด Date ถูกต้อง
 *   - login รหัสผ่าน: userRole 5/6 ได้ role supervisor/manager เท่ากับ login Google
 *   - ปิดช่องโหว่สิทธิ์เก่า: postAnnouncement (ใครก็โพสต์ได้), approveAny (ใครก็อนุมัติได้!),
 *     saveDayFix (แก้เวลาแทนใครก็ได้)
 * v2.6 — ด่านกันสแกนซ้ำฝั่งเซิร์ฟเวอร์: ชนิดเดิมภายใน 60 นาที → ไม่บันทึกเพิ่ม (dup+guard)
 *         (ด่านฝั่งเครื่องตาบอดได้ถ้า log หาย — เคยเกิด 7 แถว/นาที ตอนปิด-เปิดแอปรัว)
 * v2.5 — getPTTStaff all-mode: อนุญาต HR ด้วย (หน้า "ทีม" ของ HR ดูทีม PTT ได้)
 * v2.4 — เส้นทาง dup ของ actionCheckin = ตัวซ่อมรูปตกหล่น: client ส่งรูปซ้ำ →
 *         อัปขึ้น Storage + เติม photo_path ทั้ง Postgres และชีท (self-healing)
 * v2.3 — actionCheckin ตอบ photoSaved — รูปอัปโหลดพลาดไม่เงียบอีกต่อไป (แอปเตือนทันที)
 * v2.2 — getAuditLog: หน้า "ตรวจสอบสแกน" (รายการ+รูปรายวันจาก Supabase, fallback ชีท)
 *         + sbSignedUrls_ (batch signed URL)
 * v2.1 — check-in รู้จักพนักงาน PTT (fallback ทะเบียน PTT เมื่อไม่อยู่ในชีท Users —
 *         เดิมปฏิเสธ "ไม่พบพนักงาน" ทำให้ PTT ลงเวลาเข้าระบบไม่ได้เลย)
 * v2.0 — รอบเก็บบั๊กจาก audit:
 *   - isHR: รองรับ Google login (role ตัวเลข 7 = HR) — เดิม HR ที่ login Google ลบ/แก้หน้าไม่ได้
 *   - getPTTStaff: ตัดสินสิทธิ์จาก user.empId (session) ไม่ใช่ p.empId ที่ client อ้าง
 *   - registerFace: หัวหน้าลงหน้าให้ได้เฉพาะลูกทีม/สาขาตัวเอง (กันสวมหน้าใต้รหัสคนอื่น)
 *   - deleteFace: ลบทุกแถวซ้ำ · pttMap_/usersData cache ต่อ execution (กัน timeout)
 *   - checkin: normalize type ให้ชีท=Supabase + dup path ซ่อม Postgres ที่ตกหล่น
 *   (v1.9: หัวหน้า PTT เต็มระบบ 11202 all:1 · v1.8: ผจก. PTT เห็นหน้าลูกทีม
 *    v1.7: ลงหน้าครั้งเดียว แก้/ลบ = HR · v1.6: หน้า 2 เทมเพลต + Supabase face_data)
 * ============================================================
 */

const CFG = {
  attendanceSheetId: '1aywVdJ5-zw70__3BHjE3itjZotiubaRUAMjWOzgCAts',
  usersSheetId:     '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ',
  usersTab:         'Sheet1',
  clientId:         '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com',
  workStart:        '08:00',
  workEnd:          '17:00',
  workHours:        9,
  graceMin:         14,          // ผ่อนผันมาสาย (นาที) — ให้ตรงหน้าสรุปในแอป
  breakStart:       '12:00',     // พักเที่ยง — หักออกจากชั่วโมงทำงาน
  breakEnd:         '13:00',
  hrDept:           'ทรัพยากรบุคคล',
  pttUsersSheetId: '1lnIVDnPe1g8UYwAAtbE1bddWsq_sAGiVWmbnuBr5VBM',
  pttUsersTab:     'ข้อมูลพนักงาน PTT',
};

const T = {
  ATT:  'ลงเวลาApp',
  LOG:  'CheckinLog',
  FACE: 'FaceData',
  LEAVE: 'LeaveLog',
  TADJ: 'TimeAdjustLog',
  WARN: 'ใบเตือนApp',
  LOC:  'Locations',
  PLOC: 'PersonalLocations',
  SET:  'Settings',
  HOL:  'Holidays',
};

const ATT_COL = {
  empId: 0, name: 1, date: 2,
  in1: 3, out1: 4, in2: 5, out2: 6, note: 7,
  firstIn: 8, lastOut: 9, status: 10,
  lateMin: 11, statusLate: 12, lateText: 13,
  branch: 14, bu: 15,
  leaveType: 16, leaveHours: 17, holiday: 18, missedTime: 19,
};

const U_COL = {
  company: 0, branch: 1, empId: 2, prefix: 3, name: 4, nationality: 5,
  nickname: 6, gender: 7, email: 8, dob: 9, startDate: 10, status: 11,
  jobCode: 12, supervisorName: 13, glideApp: 14, userRole: 15,
  approvalStage: 16, department: 17,
};

/* ============================================================
   NAME CLEANER — ลงชีทแค่ "ชื่อ สกุล"
   ตัด "รหัส · " หน้า และ "(ชื่อเล่น)" ท้าย
   ============================================================ */
function cleanName_(s){
  return String(s || '')
    .replace(/^\s*\S+\s*·\s*/, '')   // ตัด "รหัส · " หน้าชื่อ
    .replace(/\s*\(.*\)\s*$/, '')    // ตัด "(ชื่อเล่น)" ท้ายชื่อ
    .trim();
}
function stripNick_(s){ return cleanName_(s); }   // เก็บไว้เผื่อโค้ดเก่าเรียก

/* ============================================================
   ENTRY POINTS
   ============================================================ */

function doGet(e)  { return handle(e, 'GET');  }
function doPost(e) { return handle(e, 'POST'); }

function handle(e, method) {
  try {
    let p = {};
    if (method === 'POST') {
      try { p = JSON.parse((e.postData && e.postData.contents) || '{}'); }
      catch(_) { p = {}; }
    } else {
      p = e.parameter || {};
    }
    const action = p.action || '';

    if (action === 'ping') {
      // v5.7: ใส่เลขเวอร์ชันไว้เช็คจากภายนอกได้ว่า deployment ล่าสุดคือตัวไหน (แก้ทุกครั้งที่ออกเวอร์ชันใหม่)
      return jsonOut({ ok:true, msg:'LOGINFIX-OK', v:'8.9', time:new Date().toISOString(), clientId:CFG.clientId });
    }

    // v3.0: ประตูเปิดรูปสแกน — คลิกจากตาราง Supabase (checkin_log_th) แล้วเห็นรูปเลย
    // ใช้: <WebAppURL>?action=photoView&k=<PHOTO_KEY>&p=<photo_path>
    // ตั้งรหัสใน Script Properties: PHOTO_KEY (เหมือน SB_URL/SB_KEY)
    if (action === 'photoView') {
      const key = PropertiesService.getScriptProperties().getProperty('PHOTO_KEY') || '';
      if (!key || String(p.k || '') !== key) {
        return HtmlService.createHtmlOutput('<b>forbidden</b> — รหัสไม่ถูกต้อง');
      }
      const path = String(p.p || '').trim();
      const u = path ? sbSignedUrl_(path, 300) : '';
      if (!u) return HtmlService.createHtmlOutput('ไม่พบรูป (' + path.replace(/</g, '&lt;') + ')');
      return HtmlService.createHtmlOutput(
        '<!doctype html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh">' +
        '<img src="' + u.replace(/"/g, '&quot;') + '" style="max-width:96vw;max-height:96vh;border-radius:10px"></body>');
    }

    if (action === 'debug') {
      return jsonOut({ ok:true, debug: debugVerify(p.idToken) });
    }

    // เข้าระบบด้วยรหัส/รหัสผ่าน (ไม่ต้องมี idToken)
    if (action === 'loginByUser') {
      return jsonOut(actionLoginByUser(p));
    }
    if (action === 'registerUserSlip') {
      return jsonOut(actionRegisterUserSlip(p));
    }

    // ตรวจ session — รองรับทั้ง Google idToken และ SHEET:<รหัส>
    let user;
    if (p.idToken && String(p.idToken).indexOf('SHEET:') === 0) {
      user = sheetSessionUser(String(p.idToken).slice(6));
      if (!user) return jsonOut({ ok:false, error:'Unauthorized — sheet session invalid' });
    } else {
      user = verifyToken(p.idToken);
      if (!user) return jsonOut({ ok:false, error:'Unauthorized — invalid idToken or user not active' });
    }

    // ── v6.0: ด่านกันคำขอซ้ำระดับ router — ครอบ "ทุกหัวข้อ" ที่เขียนข้อมูล ──
    // (v5.9 กันเฉพาะกลุ่มลา/เปลี่ยนวันหยุด/แก้เวลา · หัวข้ออื่น เช่น ขอเอกสาร/อุปกรณ์/เบิกเงิน/
    //  สั่งข้าว/สวัสดิการ/ใบเตือน ยังซ้ำได้เมื่อแอป retry ตอนเซิร์ฟเวอร์ตอบช้า)
    if (p.reqId && REQ_DEDUPE_ACTIONS[action] && reqSeen_(String(p.reqId))) {
      return jsonOut({ ok:true, dup:true, msg:'คำขอนี้บันทึกไว้แล้ว (ส่งซ้ำ)' });
    }
    const _out = (function () {
    switch (action) {
      case 'checkin':              return actionCheckin(p, user);
      case 'registerFace':         return actionRegisterFace(p, user);
      case 'deleteFace':           return actionDeleteFace(p, user);
      case 'submitLeave':          return actionSubmitLeave(p, user);
      case 'submitLeaveApp':       return actionSubmitLeaveApp(p, user);
      case 'submitTimeAdjust':     return actionSubmitTimeAdjust(p, user);
      case 'submitWarning':        return actionSubmitWarning(p, user);
      case 'approveRequest':       return actionApproveRequest(p, user);
      case 'getFaceData':          return actionGetFaceData(user);
      case 'getSettings':          return actionGetSettings(user);
      case 'getLocations':         return actionGetLocations(user);
      case 'getLocationQR':        return jsonOut(getLocationQR(p, user));   // v5.5: HR พิมพ์ QR ประจำจุด
      case 'cancelMyLeave':        return jsonOut(cancelMyLeave(p, user));   // v5.8: พนักงานยกเลิกคำขอตัวเอง
      case 'getPersonalLocations': return actionGetPersonalLocations(p, user);
      case 'getCheckinLog':        return actionGetCheckinLog(p, user);
      case 'getAttendance':        return actionGetAttendance(p, user);
      case 'getMyLeaves':          return actionGetMyLeaves(p, user);
      case 'getMyTimeAdjusts':     return actionGetMyTimeAdjusts(p, user);
      case 'getMyWarnings':        return actionGetMyWarnings(p, user);
      case 'getApprovals':         return actionGetApprovals(user);
      case 'getLeaveQuota':        return actionGetLeaveQuota(p, user);
      case 'getHolidays':          return actionGetHolidays(user);
      case 'getAllUsers':          return actionGetAllUsers(user);
      case 'getIncompletePairs':   return actionGetIncompletePairs(p, user);
      case 'saveSettings':         return actionSaveSettings(p, user);
      case 'saveLocation':         return actionSaveLocation(p, user);
      case 'deleteLocation':       return actionDeleteLocation(p, user);
      case 'savePersonalLocation': return actionSavePersonalLocation(p, user);
      case 'saveHoliday':          return actionSaveHoliday(p, user);
      case 'deleteHoliday':        return actionDeleteHoliday(p, user);
      case 'whoami':               return jsonOut({ ok:true, user });
      case 'getSlipData':          return jsonOut(getSlipData(p, user));
      case 'getAnnouncements':     return jsonOut(getAnnouncements(p, user));
      case 'postAnnouncement':     return jsonOut(postAnnouncement(p, user));
      case 'verifySlipPin':        return jsonOut(verifySlipPin(p, user));
      case 'submitOfficeEquip':    return jsonOut(actionSubmitOfficeEquip(p, user));
      case 'getMyOfficeEquip':     return jsonOut(actionGetMyOfficeEquip(p, user));
      case 'submitDocRequest':     return jsonOut(actionSubmitDocRequest(p, user));
      case 'getMyDocRequests':     return jsonOut(actionGetMyDocRequests(p, user));
      case 'submitReimburse':      return jsonOut(actionSubmitReimburse(p, user));
      case 'getMyReimburse':       return jsonOut(actionGetMyReimburse(p, user));
      case 'getOfficeRefData':     return jsonOut(actionGetOfficeRefData(p, user));
      case 'submitFoodOrder':      return jsonOut(actionSubmitFoodOrder(p, user));
      case 'getMyFoodOrders':      return jsonOut(actionGetMyFoodOrders(p, user));
      case 'getPendingAll':        return jsonOut(getPendingAll(p, user));
      case 'getTimeIssues':        return jsonOut(getTimeIssues(p, user));   // v8.7: ข้อมูลลงเวลาที่ต้องตรวจ (การ์ดเตือนหัวหน้า)
      case 'approveAny':           return jsonOut(approveAny(p, user));
      case 'submitWelfare':        return jsonOut(actionSubmitWelfare(p, user));
      case 'getMyWelfare':         return jsonOut(actionGetMyWelfare(p, user));
      case 'submitHrApp':          return jsonOut(actionSubmitHrApp(p, user));
      case 'getSlipDataPTT':       return jsonOut(getSlipDataPTT(p, user));
      case 'getPTTStaff':          return jsonOut(getPTTStaff(p, user));
      case 'getAuditLog':          return jsonOut(getAuditLog(p, user));   // v2.2: หน้าตรวจสอบสแกน
      case 'submitSalaryAdjust':   return jsonOut(actionSubmitSalaryAdjust(p, user));
      case 'getAmazonMenu':        return jsonOut(getAmazonMenu(p, user));
      case 'submitAmazonOrder':    return jsonOut(actionSubmitAmazonOrder(p, user));
      case 'getAmazonOrders':      return jsonOut(getAmazonOrders(p, user));   // v8.5: ประวัติที่คีย์ไว้
      case 'submitShift':          return jsonOut(actionSubmitShift(p, user));
      case 'getShifts':            return jsonOut(getShifts(p, user));
      case 'getPTTBuyers':         return jsonOut(getPTTBuyers(p, user));
      case 'getQuota':             return jsonOut(getQuota(p));
      case 'submitQuota':          return jsonOut(submitQuota(p));
      case 'emailSlip':            return jsonOut(emailSlip(p, user));
      case 'saveDayFix':           return jsonOut(saveDayFix(p, user));

      default:
        return jsonOut({ ok:false, error:'Unknown action: ' + action });
    }
    })();
    // v6.0: บันทึกรหัสกำกับคำขอ "หลังทำสำเร็จ" เท่านั้น — ล้มเหลวแล้ว retry ต้องยังส่งใหม่ได้
    if (p.reqId && REQ_DEDUPE_ACTIONS[action]) {
      try {
        if (String(_out.getContent()).indexOf('"ok":true') >= 0) reqMark_(String(p.reqId), action, user);
      } catch (e) {}
    }
    return _out;
  } catch (err) {
    return jsonOut({ ok:false, error:String(err), stack:err && err.stack });
  }
}

/* ── v6.0: ทะเบียนรหัสกำกับคำขอ (แท็บซ่อน _reqLog) — กันคำขอลงซ้ำทุกหัวข้อ ──
   แอปสร้าง reqId ครั้งเดียวต่อการกด 1 ครั้ง แล้วติดไปกับทุก retry
   เจอ reqId เดิม = คำขอนั้นบันทึกสำเร็จไปแล้ว → ตอบ ok โดยไม่เขียนซ้ำ */
const REQ_DEDUPE_ACTIONS = {
  submitLeaveApp:1, submitLeave:1, submitTimeAdjust:1, submitOfficeEquip:1, submitDocRequest:1,
  submitReimburse:1, submitFoodOrder:1, submitWelfare:1, submitWarning:1, submitHrApp:1,
  submitSalaryAdjust:1, submitAmazonOrder:1, submitShift:1, saveDayFix:1,
};
function reqLogTab_() {
  let sh = getTab('_reqLog');
  if (!sh) {
    sh = getOrCreateTab('_reqLog', ['reqId', 'action', 'empId', 'เมื่อ']);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}
function reqSeen_(reqId) {
  try {
    const sh = reqLogTab_();
    if (sh.getLastRow() < 2) return false;
    const hit = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(reqId).matchEntireCell(true).findNext();
    return !!hit;
  } catch (e) { return false; }
}
function reqMark_(reqId, action, user) {
  try {
    const sh = reqLogTab_();
    sh.appendRow([reqId, action, String((user && user.empId) || ''), new Date()]);
    // เก็บย้อนหลังพอประมาณ — เกิน 3000 แถวตัดหัวทิ้ง 1000 (reqId เก่ากว่านั้นไม่มีทาง retry แล้ว)
    const last = sh.getLastRow();
    if (last > 3000) sh.deleteRows(2, 1000);
  } catch (e) {}
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   SUPABASE — เก็บสแกนหน้า (Postgres) + รูป (Storage)
   ตั้ง Script Properties: SB_URL, SB_KEY (sb_secret_...)
   ตาราง: checkin_log · bucket: checkin-photos (private)
   ============================================================ */
function sb_() {
  const p = PropertiesService.getScriptProperties();
  return { url: p.getProperty('SB_URL'), key: p.getProperty('SB_KEY') };
}
function sbReady_() { const s = sb_(); return !!(s.url && s.key); }
function sbNum_(v) { return (v === '' || v == null || isNaN(Number(v))) ? null : Number(v); }

/* upsert 1 แถว (กันซ้ำด้วย on_conflict) */
function sbUpsert_(table, row, onConflict) {
  const s = sb_();
  try {
    const res = UrlFetchApp.fetch(s.url + '/rest/v1/' + table + (onConflict ? '?on_conflict=' + onConflict : ''), {
      method: 'post', contentType: 'application/json',
      headers: { apikey: s.key, Authorization: 'Bearer ' + s.key,
                 Prefer: 'resolution=merge-duplicates,return=minimal' },
      payload: JSON.stringify(row), muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code >= 300) console.error('sbUpsert ' + table + ' HTTP ' + code + ' ' + res.getContentText().slice(0, 200));
    return code < 300;
  } catch (e) { console.error('sbUpsert', e); return false; }
}

/* อัปรูป base64 → Storage คืน path (ไม่เก็บ base64 ในชีทแล้ว) */
function sbUploadPhoto_(dataUrl, path) {
  if (!dataUrl || dataUrl.indexOf('base64,') < 0) return '';
  const s = sb_();
  const parts = dataUrl.split(',');
  const mime = (parts[0].match(/data:(.*?);/) || [])[1] || 'image/jpeg';
  try {
    const res = UrlFetchApp.fetch(s.url + '/storage/v1/object/checkin-photos/' + path, {
      method: 'post', contentType: mime,
      headers: { apikey: s.key, Authorization: 'Bearer ' + s.key, 'x-upsert': 'true' },
      payload: Utilities.base64Decode(parts[1]), muteHttpExceptions: true
    });
    return res.getResponseCode() < 300 ? path : '';
  } catch (e) { console.error('sbUploadPhoto', e); return ''; }
}

/* signed URL (รูป private) อายุ 1 ชม. — สำหรับดูรูปย้อนหลัง */
function sbSignedUrl_(path, sec) {
  if (!path) return '';
  const s = sb_();
  try {
    const res = UrlFetchApp.fetch(s.url + '/storage/v1/object/sign/checkin-photos/' + path, {
      method: 'post', contentType: 'application/json',
      headers: { apikey: s.key, Authorization: 'Bearer ' + s.key },
      payload: JSON.stringify({ expiresIn: sec || 3600 }), muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) return '';
    return s.url + '/storage/v1' + JSON.parse(res.getContentText()).signedURL;
  } catch (e) { return ''; }
}

/* v2.2: signed URL หลาย path ในคำขอเดียว (batch) — สำหรับหน้า "ตรวจสอบสแกน" */
function sbSignedUrls_(paths, sec) {
  const out = {};
  const uniq = paths.filter((p, i) => p && paths.indexOf(p) === i);
  if (!uniq.length || !sbReady_()) return out;
  const s = sb_();
  try {
    const res = UrlFetchApp.fetch(s.url + '/storage/v1/object/sign/checkin-photos', {
      method: 'post', contentType: 'application/json',
      headers: { apikey: s.key, Authorization: 'Bearer ' + s.key },
      payload: JSON.stringify({ expiresIn: sec || 3600, paths: uniq }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() < 300) {
      JSON.parse(res.getContentText()).forEach(x => {
        if (x && x.signedURL && x.path) out[x.path] = s.url + '/storage/v1' + x.signedURL;
      });
    }
  } catch (e) { console.error('sbSignedUrls', e); }
  return out;
}

/* v2.2: รายการสแกนรายวัน + รูป สำหรับหน้า "ตรวจสอบสแกน" (HR เห็นหมด · หัวหน้าเห็นตามสิทธิ์) */
function getAuditLog(p, user) {
  if (!isHR(user) && !isSupervisor(user)) return { ok: false, error: 'สำหรับ HR/หัวหน้าเท่านั้น' };
  const dateStr = String(p.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { ok: false, error: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)' };
  const rows = [];

  if (sbReady_()) {
    const s = sb_();
    const dayStart = new Date(dateStr + 'T00:00:00+07:00');
    const st = dayStart.toISOString();
    const en = new Date(dayStart.getTime() + 86400000).toISOString();
    try {
      const res = UrlFetchApp.fetch(s.url + '/rest/v1/checkin_log?scan_at=gte.' + st + '&scan_at=lt.' + en +
        '&order=scan_at.asc&limit=1000&select=emp_id,name,scan_at,type,branch,distance,face_dist,scanned_by,photo_path', {
        headers: { apikey: s.key, Authorization: 'Bearer ' + s.key }, muteHttpExceptions: true });
      if (res.getResponseCode() < 300) {
        const data = JSON.parse(res.getContentText());
        const visible = data.filter(r => isHR(user) || canSeeUser(user, r.emp_id));
        const signed = sbSignedUrls_(visible.map(r => r.photo_path).filter(Boolean), 3600);
        visible.forEach(r => rows.push({
          empId: String(r.emp_id || ''), name: r.name || '', scanAt: r.scan_at, type: r.type || '',
          branch: r.branch || '', distance: r.distance, faceDist: r.face_dist,
          scannedBy: r.scanned_by || '', photoUrl: r.photo_path ? (signed[r.photo_path] || '') : '',
        }));
        return { ok: true, source: 'supabase', rows: rows };
      }
    } catch (e) { console.error('getAuditLog sb', e); }
  }

  // fallback: อ่านจากชีท CheckinLog (photo อาจเป็น base64 เดิม หรือ path)
  const sh = getTab(T.LOG);
  if (!sh) return { ok: true, source: 'sheet', rows: [] };
  const data = sh.getDataRange().getValues();
  const dmy = dateStr.slice(8, 10) + '/' + dateStr.slice(5, 7) + '/' + dateStr.slice(0, 4);
  const pendingPaths = [];
  const raw = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    // v2.7: เซลล์วันที่อาจถูก Sheets แปลงเป็น Date จริง — เทียบสตริงตรงๆ จะว่างเปล่าเงียบๆ
    const cellDmy = (r[3] instanceof Date) ? Utilities.formatDate(r[3], 'Asia/Bangkok', 'dd/MM/yyyy') : String(r[3]).trim();
    if (cellDmy !== dmy) continue;
    if (!isHR(user) && !canSeeUser(user, r[1])) continue;
    const photoCell = String(r[14] || '');
    if (photoCell && photoCell.indexOf('data:') !== 0) pendingPaths.push(photoCell);
    raw.push({ r: r, photoCell: photoCell });
  }
  const signed2 = sbSignedUrls_(pendingPaths, 3600);
  raw.forEach(x => {
    const r = x.r;
    rows.push({
      empId: String(r[1] || ''), name: String(r[2] || ''),
      scanAt: (r[0] instanceof Date) ? r[0].toISOString() : String(r[0] || ''),
      type: String(r[5] || ''), branch: String(r[6] || ''),
      distance: r[9], faceDist: r[10], scannedBy: String(r[11] || ''),
      photoUrl: x.photoCell.indexOf('data:') === 0 ? x.photoCell : (signed2[x.photoCell] || ''),
    });
  });
  return { ok: true, source: 'sheet', rows: rows };
}

/* ทดสอบว่าต่อ Supabase ติด — Run ฟังก์ชันนี้ 1 ครั้งหลังตั้ง Script Properties */
function testSupabase() {
  const s = sb_();
  if (!s.url || !s.key) { Logger.log('❌ ยังไม่ได้ตั้ง SB_URL / SB_KEY'); return; }
  const insOk = sbUpsert_('checkin_log', {
    client_id: 'TEST-' + Date.now(), emp_id: '0', name: 'ทดสอบ',
    scan_at: new Date().toISOString(), type: 'in'
  }, 'client_id');
  Logger.log('INSERT → ' + (insOk ? 'OK' : 'FAIL'));
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const upOk = sbUploadPhoto_(png, 'test/ping.png');
  Logger.log('UPLOAD → ' + (upOk ? 'OK' : 'FAIL'));
  Logger.log((insOk && upOk) ? '✅ Supabase พร้อมใช้งาน!' : '⚠️ มีบางอย่างผิด — ดู log ด้านบน');
}

/* ลบรูปเก่ากว่า 60 วัน — Run setupPhotoCleanup 1 ครั้งเพื่อตั้ง cron รายวัน */
function cleanupOldPhotos_() {
  if (!sbReady_()) return;
  const s = sb_();
  const cutoff = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const res = UrlFetchApp.fetch(
    s.url + '/rest/v1/checkin_log?select=id,photo_path&scan_at=lt.' + encodeURIComponent(cutoff) + '&photo_path=neq.&limit=500',
    { headers: { apikey: s.key, Authorization: 'Bearer ' + s.key }, muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) return;
  const rows = JSON.parse(res.getContentText());
  if (!rows.length) return;
  const paths = rows.map(r => r.photo_path).filter(Boolean);
  if (paths.length) {
    UrlFetchApp.fetch(s.url + '/storage/v1/object/checkin-photos', {
      method: 'delete', contentType: 'application/json',
      headers: { apikey: s.key, Authorization: 'Bearer ' + s.key },
      payload: JSON.stringify({ prefixes: paths }), muteHttpExceptions: true });
  }
  const ids = rows.map(r => r.id).join(',');
  UrlFetchApp.fetch(s.url + '/rest/v1/checkin_log?id=in.(' + ids + ')', {
    method: 'patch', contentType: 'application/json',
    headers: { apikey: s.key, Authorization: 'Bearer ' + s.key, Prefer: 'return=minimal' },
    payload: JSON.stringify({ photo_path: '' }), muteHttpExceptions: true });
  console.log('cleanup: ลบรูป ' + paths.length + ' ไฟล์');
}
function setupPhotoCleanup() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'cleanupOldPhotos_') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cleanupOldPhotos_').timeBased().everyDays(1).atHour(2).create();
  Logger.log('✅ ตั้ง cron ลบรูปเก่า 60 วัน (รันทุกวัน ~ตี 2) เรียบร้อย');
}

/* ============================================================
   AUTH
   ============================================================ */

function verifyToken(idToken) {
  if (!idToken) return null;
  try {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) {
      console.error('tokeninfo HTTP', res.getResponseCode(), res.getContentText().substring(0, 200));
      return null;
    }
    const info = JSON.parse(res.getContentText());
    if (info.aud !== CFG.clientId) {
      console.error('aud mismatch — got:', info.aud, 'expected:', CFG.clientId);
      return null;
    }
    if (parseInt(info.exp, 10) * 1000 < Date.now()) {
      console.error('token expired');
      return null;
    }
    const email = String(info.email || '').toLowerCase().trim();
    if (!email) {
      console.error('no email in token');
      return null;
    }
    const user = lookupUserByEmail(email);
    if (!user) console.error('user not found or not active:', email);
    return user;
  } catch (e) {
    console.error('verifyToken exception', e);
    return null;
  }
}

function debugVerify(idToken) {
  if (!idToken) return { stage:'no_token' };
  try {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    const code = res.getResponseCode();
    if (code !== 200) return { stage:'tokeninfo_fail', http: code, body: res.getContentText().substring(0, 300) };
    const info = JSON.parse(res.getContentText());
    const out = { stage:'parsed', aud: info.aud, exp_iso: new Date(parseInt(info.exp,10)*1000).toISOString(), email_in_token: info.email, expected_clientId: CFG.clientId };
    if (info.aud !== CFG.clientId) { out.stage = 'aud_mismatch'; return out; }
    if (parseInt(info.exp, 10) * 1000 < Date.now()) { out.stage = 'expired'; return out; }
    const email = String(info.email || '').toLowerCase().trim();
    out.email_normalized = email;
    const sh = SpreadsheetApp.openById(CFG.usersSheetId).getSheetByName(CFG.usersTab);
    if (!sh) { out.stage = 'users_sheet_not_found'; out.tab = CFG.usersTab; return out; }
    const data = sh.getDataRange().getValues();
    out.users_rows = data.length - 1;
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      const rowEmail = String(r[U_COL.email] || '').toLowerCase().trim();
      if (rowEmail === email) {
        const status = String(r[U_COL.status] || '').trim().toLowerCase();
        out.matched_row = i + 1;
        out.matched_status_raw = String(r[U_COL.status] || '');
        out.matched_status_normalized = status;
        out.matched_empId = String(r[U_COL.empId] || '');
        out.matched_name = String(r[U_COL.name] || '');
        out.matched_role = r[U_COL.userRole];
        if (status !== 'active') { out.stage = 'not_active'; return out; }
        out.stage = 'ok';
        return out;
      }
    }
    out.stage = 'email_not_in_sheet';
    return out;
  } catch (e) {
    return { stage:'exception', error: String(e), stack: e && e.stack };
  }
}

function lookupUserByEmail(email) {
  const sh = SpreadsheetApp.openById(CFG.usersSheetId).getSheetByName(CFG.usersTab);
  if (!sh) return null;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[U_COL.email] || '').toLowerCase().trim() === email) {
      if (String(r[U_COL.status] || '').trim().toLowerCase() !== 'active') return null;
      return {
        empId: String(r[U_COL.empId] || ''),
        name: String(r[U_COL.name] || ''),
        nickname: String(r[U_COL.nickname] || ''),
        email,
        role: parseInt(r[U_COL.userRole], 10) || 1,
        branch: String(r[U_COL.branch] || ''),
        department: String(r[U_COL.department] || ''),
        startDate: r[U_COL.startDate] || '',
        supervisorName: String(r[U_COL.supervisorName] || ''),
      };
    }
  }
  return null;
}

/* v2.0: cache ตาราง Users ต่อ execution — canSeeUser ถูกเรียกวนต่อแถว ถ้าเปิดชีทใหม่ทุกครั้งจะ timeout */
let _usersDataCache = null;
function usersData_() {
  if (!_usersDataCache) {
    const sh = SpreadsheetApp.openById(CFG.usersSheetId).getSheetByName(CFG.usersTab);
    _usersDataCache = sh ? sh.getDataRange().getValues() : [];
  }
  return _usersDataCache;
}

function findUserByEmpId(empId) {
  const data = usersData_();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][U_COL.empId]) === String(empId)) {
      const r = data[i];
      return {
        empId: String(r[U_COL.empId]),
        name: String(r[U_COL.name]),
        nickname: String(r[U_COL.nickname]),
        email: String(r[U_COL.email] || '').toLowerCase(),
        role: parseInt(r[U_COL.userRole], 10) || 1,
        branch: String(r[U_COL.branch]),
        department: String(r[U_COL.department]),
        startDate: r[U_COL.startDate],
        supervisorName: String(r[U_COL.supervisorName]),
      };
    }
  }
  return null;
}

/* role helpers */
/* v2.0: Google login ให้ role เป็นตัวเลข (userRole 1-7) — เดิม >=8 ไม่มีทางจริง ทำให้ HR ที่ login
   ด้วย Google ลบ/แก้ใบหน้าไม่ได้เลย. ให้ตรงกับ lookupEmpInfo: userRole 7 = HR, แผนกมีคำว่า ทรัพยากรบุคคล */
function isHR(u) {
  if (!u) return false;
  if (u.role === 'hr' || u.role >= 7) return true;
  return String(u.department || '').indexOf('ทรัพยากรบุคคล') >= 0 || u.department === CFG.hrDept;
}
function isManager(u)    { return u.role === 'manager' || u.role >= 6 || isHR(u); }
function isSupervisor(u) { return u.role === 'supervisor' || u.role >= 5 || isManager(u); }
function canSeeAllBranches(u) { return isManager(u); }
/* v1.8: โหลด roster PTT ครั้งเดียวต่อ execution → Map(empId → {saka, khlang, position}) */
let _pttMapCache = null;
function pttMap_() {
  if (_pttMapCache) return _pttMapCache;
  const m = {};
  try {
    const ss = SpreadsheetApp.openById('1lnIVDnPe1g8UYwAAtbE1bddWsq_sAGiVWmbnuBr5VBM');
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      const d = sheets[i].getDataRange().getValues();
      if (!d.some(r => r[0] === 'บายพาส' || r[0] === 'ลาดใหญ่')) continue;
      d.forEach(r => {
        if (r[0] !== 'บายพาส' && r[0] !== 'ลาดใหญ่') return;
        if (String(r[9]).trim() !== 'อยู่') return;
        const id = String(r[2] || '').trim(); if (!id) return;
        m[id] = { saka: String(r[0]).trim(), khlang: String(r[1]).trim(), position: String(r[20] || '').trim(),
                  name: String(r[6] || '').trim(),      // v2.1: ใช้เป็น fallback ตอน check-in
                  nickname: String(r[7] || '').trim(),   // v4.4: ชื่อเล่น (ทะเบียน PTT คอลัมน์ H)
                  // v6.6: ทะเบียน PTT สร้างด้วย IMPORTRANGE/QUERY → ช่อง "เข้า" เป็น Date จริง
                  // เดิม String(Date) ได้ "Fri Dec 27 2019 00:00:00 GMT+0700" → parseDDMMYYYY อ่านไม่ออก
                  // = พนักงาน PTT ที่ไม่มีแถวในชีท Users ทุกคน "ไม่พบวันเริ่มงาน" → โควต้าลาไม่ทำงานเลย
                  startDate: formatDate(r[12]) };          // v5.1: วันเริ่มงาน (คอลัมน์ "เข้า") — คิดโควต้าลา
      });
      break;
    }
  } catch (e) {}
  if (Object.keys(m).length) _pttMapCache = m;   // v2.0: อ่านพลาด → อย่า cache ค่าว่างทั้ง execution
  return m;
}

function canSeeUser(u, empId) {
  if (canSeeAllBranches(u)) return true;
  if (String(u.empId) === String(empId)) return true;
  if (isSupervisor(u)) {
    const t = findUserByEmpId(empId);
    if (t && t.branch === u.branch) return true;
  }
  // v1.8: ผู้จัดการ PTT เห็นหน้าลูกทีมสาขา+คลังเดียวกัน (ลูกทีมลงหน้าเอง → kiosk หัวหน้าดึงไปใช้ได้เลย)
  const pm = pttMap_();
  const me = pm[String(u.empId)], t2 = pm[String(empId)];
  if (me && t2 && /^ผู้จัดการ/.test(me.position) && me.saka === t2.saka && me.khlang === t2.khlang) return true;
  // v1.9: หัวหน้า PTT เต็มระบบ (เช่น จิรวรรณ 11202) เห็นหน้าพนักงาน PTT ทุกคน
  if (PTT_ALL_SUPERVISORS.indexOf(String(u.empId)) >= 0 && t2) return true;
  return false;
}

/* ============================================================
   SHEET HELPERS
   ============================================================ */

function getSS() { return SpreadsheetApp.openById(CFG.attendanceSheetId); }
function getTab(name) { return getSS().getSheetByName(name); }
function getOrCreateTab(name, headers) {
  let sh = getTab(name);
  if (!sh) {
    sh = getSS().insertSheet(name);
    if (headers && headers.length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function initSheets() {
  const ss = getSS();
  let att = ss.getSheetByName(T.ATT);
  if (!att) {
    att = ss.insertSheet(T.ATT);
    att.getRange(1,1,1,20).setValues([[
      'รหัสพนักงาน','ชื่อ-นามสกุล','ของวันที่',
      'IN','OUT','IN','OUT','หมายเหตุ',
      'เวลาบันทึกเข้า','เวลาบันทึกออก','สถาณะการลงเวลา',
      'สาย','Status','สาย','คลัง','BU',
      'ประเภทการลา','เวลาที่ใช้ลา','วันหยุด','เวลาที่ผิด',
    ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
    att.setFrozenRows(1);
  }

  getOrCreateTab(T.LOG,   ['timestamp','empId','name','date','time','type','branch','lat','lng','distance','faceDist','scannedBy','retroactive','reason','photo','submittedBy','clientId']);
  getOrCreateTab(T.FACE,  ['empId','name','descriptor','photo','registeredAt','registeredBy']);
  getOrCreateTab(T.LEAVE, ['id','submittedAt','empId','name','type','typeLabel','startDate','endDate','hours','unit','reason','attachment','status','approver','approvedAt','approveNote','submittedBy']);
  getOrCreateTab(T.TADJ,  ['id','submittedAt','empId','name','date','type','correctTime','branch','reason','status','approver','approvedAt','approveNote','submittedBy']);
  getOrCreateTab(T.WARN,  ['id','issuedAt','empId','name','level','category','detail','incidentDate','issuedBy','status']);
  getOrCreateTab(T.LOC,   ['code','name','lat','lng','radius','active']);
  getOrCreateTab(T.PLOC,  ['empId','name','locName','lat','lng','radius','note']);
  getOrCreateTab(T.SET,   ['key','value','note']);
  getOrCreateTab(T.HOL,   ['date','name','type']);

  const setSh = getTab(T.SET);
  if (setSh.getLastRow() < 2) {
    setSh.getRange(2,1,4,3).setValues([
      ['radius', '50', 'รัศมีอนุญาตเช็คอินมาตรฐาน (เมตร)'],
      ['faceThr', '0.5', 'เกณฑ์จับใบหน้า ต่ำ=เข้ม สูง=หลวม'],
      ['startTime', '08:00', 'เวลาเข้างานมาตรฐาน'],
      ['liveness', 'medium', 'ระดับ liveness check'],
    ]);
  }

  SpreadsheetApp.getUi().alert('✅ สร้าง tabs ครบแล้ว\n\nไปต่อ: Deploy → New deployment → Web app');
}

/* ============================================================
   CHECKIN
   ============================================================ */

/* v8.3: "สแกนครั้งนี้ควรเป็น เข้า หรือ ออก" — ดูจากสแกนล่าสุดของคนนี้ในวันเดียวกันจากชีท
   (แหล่งจริง ไม่ใช่ log ในเครื่องของแอปที่ว่างได้) · ไม่มีสแกนวันนี้เลย = 'in'
   อ่านย้อนจากท้ายชีท 800 แถวพอ — ทั้งบริษัทสแกนวันหนึ่งไม่ถึงเท่านี้ */
function autoInOut_(logSh, empId, when) {
  const last = logSh.getLastRow();
  if (last < 2) return 'in';
  const tz = 'Asia/Bangkok';
  const day = Utilities.formatDate(when, tz, 'yyyy-MM-dd');
  const from = Math.max(2, last - 799);
  const d = logSh.getRange(from, 1, last - from + 1, 6).getValues();
  const id = String(empId).trim();
  const limit = when.getTime() + 120000;      // แถวที่เวลาใหม่กว่าสแกนนี้ ไม่นับ (กันเคสส่งย้อนหลัง)
  let lastType = null, lastMs = -1;
  for (let i = 0; i < d.length; i++) {
    if (String(d[i][1] || '').trim() !== id) continue;
    const ts = (d[i][0] instanceof Date) ? d[i][0] : new Date(d[i][0]);
    if (!ts || isNaN(ts.getTime())) continue;
    const ms = ts.getTime();
    if (ms > limit) continue;
    if (Utilities.formatDate(ts, tz, 'yyyy-MM-dd') !== day) continue;
    if (ms >= lastMs) { lastMs = ms; lastType = String(d[i][5] || '').trim().toLowerCase() === 'out' ? 'out' : 'in'; }
  }
  if (lastType === null) return 'in';         // ยังไม่มีสแกนวันนี้
  return lastType === 'in' ? 'out' : 'in';
}

function actionCheckin(p, user) {
  const empId = String(p.empId || user.empId);
  if (empId !== user.empId && !isSupervisor(user)) {
    return jsonOut({ ok:false, error:'ไม่มีสิทธิ์เช็คอินแทนคนอื่น' });
  }
  let target = findUserByEmpId(empId);
  if (!target) {
    // v2.1: พนักงาน PTT ไม่อยู่ในชีท Users ของ Rattana — หาจากทะเบียน PTT แทน
    // (เดิมตรงนี้ปฏิเสธ "ไม่พบพนักงาน" = PTT ลงเวลาเข้าระบบไม่ได้ทั้งบริษัท)
    const pr = pttMap_()[empId];
    if (pr) target = { empId: empId, name: pr.name, branch: pr.saka, department: 'PTT ' + (pr.khlang || ''), role: 1 };
  }
  if (!target) return jsonOut({ ok:false, error:'ไม่พบพนักงาน ' + empId });

  // v5.5: ตรวจหลักฐาน QR ประจำจุด (เมื่อแอปส่งมา — ใช้แทนใบหน้าตอนระบบใบหน้าไม่พร้อม)
  if (p.qrToken) {
    const locSh = getTab(T.LOC);
    const ld = locSh ? locSh.getDataRange().getValues() : [];
    let qrRow = -1;
    for (let i = 1; i < ld.length; i++) {
      if (String(ld[i][0]).trim() === String(p.qrLoc || '').trim() &&
          String(ld[i][6] || '').trim() !== '' &&
          String(ld[i][6]).trim() === String(p.qrToken).trim()) { qrRow = i; break; }
    }
    if (qrRow < 0) return jsonOut({ ok:false, error:'QR ไม่ถูกต้อง — สแกน QR ประจำจุดที่ติดไว้ที่สาขาเท่านั้น' });
    // v5.6: QR ต้องเป็นของจุดที่ผู้สแกน "ยืนอยู่จริง" — เทียบพิกัดที่ส่งมากับพิกัดของจุดนั้นในชีท
    // (อุดช่องโหว่: อยู่ HQ แต่สแกน QR ของ W2 เดิมผ่านได้)
    const qlat = parseFloat(ld[qrRow][2]) || 0, qlng = parseFloat(ld[qrRow][3]) || 0;
    const qrad = parseFloat(ld[qrRow][4]) || 100;
    const plat = parseFloat(p.lat) || 0, plng = parseFloat(p.lng) || 0;
    if (!plat || !plng) return jsonOut({ ok:false, error:'ไม่มีพิกัด GPS แนบมา — เปิด GPS แล้วสแกนใหม่' });
    if (qlat && qlng) {
      const R = 6371000, toRad = d => d * Math.PI / 180;
      const dLat = toRad(qlat - plat), dLng = toRad(qlng - plng);
      const a = Math.pow(Math.sin(dLat / 2), 2) +
                Math.cos(toRad(plat)) * Math.cos(toRad(qlat)) * Math.pow(Math.sin(dLng / 2), 2);
      const dist = 2 * R * Math.asin(Math.sqrt(a));
      if (dist > qrad + 80) {   // +80 ม. เผื่อ GPS คลาดเคลื่อน
        return jsonOut({ ok:false, error:'QR "' + p.qrLoc + '" เป็นของจุดอื่น (ห่างจากคุณ ' + Math.round(dist) + ' ม.) — ใช้ QR ของจุดที่คุณอยู่เท่านั้น' });
      }
    }
  }

  const bu = p.bu || target.department || '';
  const branch = p.branch || target.branch || '';
  const now = new Date();
  const tz = 'Asia/Bangkok';
  // v8.7: ใช้ "เวลาสแกนจริง" ถ้ามี clientTs (สำหรับ re-sync log ที่ค้าง) ไม่งั้นใช้ตอนนี้
  let when = now;
  if (p.clientTs) { const w = new Date(p.clientTs); if (!isNaN(w.getTime())) when = w; }
  const dateStr = Utilities.formatDate(when, tz, 'dd/MM/yyyy');
  const timeStr = Utilities.formatDate(when, tz, 'HH:mm:ss');

  // v2.0/v2.7: normalize type ครั้งเดียว ใช้ทุกที่ — รับ 'OUT'/'Out' ด้วย (เดิมกลายเป็น in เงียบๆ)
  let type = (String(p.type || '').trim().toLowerCase() === 'out') ? 'out' : 'in';
  // ── v8.3: เซิร์ฟเวอร์เป็นคนตัดสิน เข้า/ออก (ตัดสินจริงในล็อกด้านล่าง) ──────────────
  // เดิมเชื่อค่าที่แอปส่งมาล้วนๆ ซึ่งแอปเดาจาก log ในเครื่อง → ว่างได้หลายทาง:
  //   · เปลี่ยนเครื่อง/ล้างแคช/ล็อกอินใหม่  · กดสแกนก่อน syncLogsFromSheet จะกลับมา
  //   · จอสแกนลูกทีม (kiosk) ที่หัวหน้าตั้งโหมดค้างไว้ที่ "เข้า" ทั้งวัน
  // ผลคือได้ "เข้า" ซ้อน "เข้า" → วันนั้นไม่มีเวลาออก ขึ้น "ลงเวลาไม่ครบ"
  const typeForced = (String(p.typeForced || '') === '1' || p.typeForced === true);   // ผู้ใช้กดเลือกเอง = ยึดตามนั้น
  const typeReplay = !!p.clientTs && Math.abs(now.getTime() - when.getTime()) > 10 * 60000;  // ส่งซ้ำของเก่าที่ค้างออฟไลน์
  let typeFixed = false;

  const logSh = getOrCreateTab(T.LOG);
  // ── v7.9: ล็อกก่อนตรวจซ้ำ+เขียน (surat เจอ 103 คู่ที่ clientId เหมือนกัน = ตัวกันซ้ำไม่ทำงาน) ──
  // ต้นเหตุ: แอป retry ขณะที่คำขอแรก "ยังทำงานค้างอยู่บนเซิร์ฟเวอร์" → สองคำขอวิ่งพร้อมกัน
  // ทั้งคู่อ่านชีทก่อนที่อีกฝั่งจะเขียน → ด่านกันซ้ำ/ด่าน 60 นาที มองไม่เห็นกัน → ได้ 2-4 แถวเวลาเดียวกัน
  let _ckLock = null;
  try { _ckLock = LockService.getScriptLock(); _ckLock.waitLock(25000); } catch (e) { _ckLock = null; }
  try {
  // v8.3: ตัดสิน เข้า/ออก จากชีทจริง — ทำในล็อก คำขอที่วิ่งพร้อมกันจึงไม่เห็นสถานะเก่า
  if (!typeForced && !typeReplay) {
    try {
      const auto = autoInOut_(logSh, empId, when);
      if (auto && auto !== type) { type = auto; typeFixed = true; }
    } catch (e) { console.error('autoInOut_', e); }
  }
  // v8.7: กันบันทึกซ้ำ — ถ้า clientId นี้เคยลงแล้ว ข้าม (idempotent re-sync)
  const cid = String(p.clientId || '').trim();
  if (cid) {
    const last = logSh.getLastRow();
    if (last > 1) {
      const ids = logSh.getRange(2, 17, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        // v7.9: เทียบแบบตัดช่องว่าง + เผื่อค่าเก่าที่ชีทเก็บเป็นตัวเลข (id รุ่นเดิมเป็นตัวเลขทศนิยม)
        const cellId = String(ids[i][0] == null ? '' : ids[i][0]).trim();
        if (cellId && (cellId === cid || (parseFloat(cellId) && parseFloat(cellId) === parseFloat(cid)))) {
          // v2.0/v2.4: รอบก่อนชีทลงแล้วแต่ Supabase/รูปอาจพลาด — เส้นทางซ้ำนี้คือตัวซ่อม:
          // อัปรูปที่ตกหล่น + เติม photo_path ทั้ง Postgres และชีท (client ส่งรูปซ้ำมาเอง)
          let dupPhotoSaved = null;
          if (sbReady_()) {
            try {
              // v2.9: เวลา = เอาจาก "แถวชีทตัวจริง" (คอลัมน์ A) เสมอ — ห้ามใช้เวลาจากคำขอ retry
              // (เครื่องเวอร์ชันเก่าส่งเวลาแปลงเพี้ยนมาได้ → เคยทับ scan_at เป็นเวลาผิดทั้งที่ชีทถูก)
              const origWhenCell = logSh.getRange(i + 2, 1).getValue();
              const origWhen = (origWhenCell instanceof Date && !isNaN(origWhenCell.getTime())) ? origWhenCell : when;
              let ph = '';
              if (p.photo) {
                ph = sbUploadPhoto_(p.photo, empId + '/' + Utilities.formatDate(origWhen, tz, 'yyyyMMdd') + '/' + cid + '.jpg');
                dupPhotoSaved = !!ph;
                if (ph) logSh.getRange(i + 2, 15).setValue(ph);   // col O ในชีทด้วย
              }
              const row = {
                client_id: cid, emp_id: empId, name: target.name,
                scan_at: origWhen.toISOString(), type: type,
                branch: branch, lat: sbNum_(p.lat), lng: sbNum_(p.lng),
                distance: sbNum_(p.distance), face_dist: sbNum_(p.faceDist),
                scanned_by: p.scannedBy || 'self',
                retroactive: p.retroactive ? 'Y' : '',           // v3.2
                reason: (p.retroactive && p.reason) || ''
              };
              if (ph) row.photo_path = ph;
              sbUpsert_('checkin_log', row, 'client_id');
            } catch (e) {}
          }
          // v2.7: รอบแรกอาจลงแถว log แล้วแต่ ลงเวลาApp พลาด (exception กลางทาง) — upsert ซ้ำเป็น idempotent ซ่อมให้
          if (WRITE_ATT_SHEET) { try { upsertAttendance({ empId: empId, name: target.name, dateStr: dateStr, timeStr: timeStr, type: type, branch: branch, bu: bu, note: '' }); } catch (e) {} }
          return jsonOut({ ok:true, dup:true, msg:'มีอยู่แล้ว', photoSaved: dupPhotoSaved });
        }
      }
    }
  }

  // v2.6: กันสแกนชนิดเดิมซ้ำภายใน 60 นาที — ฝั่งเซิร์ฟเวอร์ (ด่านฝั่งเครื่องตาบอดได้
  // ถ้า log ในเครื่องหาย เช่น ปิด-เปิดแอปรัวๆ ตอนเน็ตอ่อน → เคยได้ 7 แถวใน 1 นาที)
  {
    const lastR = logSh.getLastRow();
    if (lastR > 1) {
      const n = Math.min(300, lastR - 1);
      const chunk = logSh.getRange(lastR - n + 1, 1, n, 7).getValues();
      // v2.7: ไล่ครบทั้ง 300 แถว ห้าม break — แถว resync เวลาเก่าแทรกท้ายชีทได้ (append ≠ เรียงเวลา)
      // เดิม break เจอแถวเก่าปุ๊บ = ด่านถูกปิดเงียบทั้งด่าน
      for (let i = chunk.length - 1; i >= 0; i--) {
        const r = chunk[i];
        const ts = (r[0] instanceof Date) ? r[0].getTime() : new Date(r[0]).getTime();
        if (isNaN(ts)) continue;
        if (Math.abs(when.getTime() - ts) > 3600000) continue;   // ระยะเกิน 1 ชม. — ไม่เกี่ยว
        if (String(r[1]) !== empId) continue;
        if (String(r[6] || '').trim() !== String(branch || '').trim()) continue;   // v2.7: ต่างสาขา = สแกนจริงคนละที่ อนุญาต
        if (String(r[5]).trim().toLowerCase() !== type) {
          // v3.1: "ต่างชนิด" ก็ไม่รอด — ห้ามสแกนทุกชนิดภายใน 60 นาที (คู่กับด่านฝั่งแอป v12.0)
          // เดิมพนักงานสแกนซ้ำ 07:40→07:50 ถูกแอปสลับเป็น "ออก" หลุดด่านชนิดเดิม = เข้า-ออกซ้อนตอนเช้า
          if (p.retroactive) continue;   // ฟอร์มแก้เวลาย้อนหลัง = ตั้งใจเติมคู่ที่ขาด — ให้ผ่าน
          const rowLabel = String(r[5]).trim().toLowerCase() === 'out' ? 'ออก' : 'เข้า';
          const hhmm0 = Utilities.formatDate(new Date(ts), tz, 'HH:mm');
          return jsonOut({ ok:true, dup:true, guard:true,
            msg:'สแกน' + rowLabel + 'ไปแล้วเมื่อ ' + hhmm0 + ' น. — เว้นระยะ 60 นาทีก่อนสแกน' + (type === 'out' ? 'ออก' : 'เข้า') });
        }
        const hhmm = Utilities.formatDate(new Date(ts), tz, 'HH:mm');
        // v2.7: กันเคสแถว log ลงแล้วแต่ ลงเวลาApp พลาดรอบก่อน — upsert ซ้ำได้ (idempotent) ให้ตารางวันตามทัน
        if (WRITE_ATT_SHEET) { try { upsertAttendance({ empId: empId, name: target.name, dateStr: dateStr, timeStr: Utilities.formatDate(new Date(ts), tz, 'HH:mm:ss'), type: type, branch: branch, bu: bu, note: '' }); } catch (e) {} }
        return jsonOut({ ok:true, dup:true, guard:true,
          msg:'สแกน' + (type === 'out' ? 'ออก' : 'เข้า') + 'ไปแล้วเมื่อ ' + hhmm + ' — ไม่บันทึกซ้ำ' });
      }
    }
  }

  // v1.5: รูป → Supabase Storage (ไม่ยัด base64 ลงเซลล์ชีทอีก) + สแกนดิบ → Postgres
  const useSB = sbReady_();
  let photoPath = '';
  if (useSB && p.photo) {
    photoPath = sbUploadPhoto_(p.photo, empId + '/' + Utilities.formatDate(when, tz, 'yyyyMMdd') + '/' + (cid || when.getTime()) + '.jpg');
  }
  if (useSB) {
    sbUpsert_('checkin_log', {
      client_id: cid || null, emp_id: empId, name: target.name,
      scan_at: when.toISOString(), type: type,
      branch: branch, lat: sbNum_(p.lat), lng: sbNum_(p.lng),
      distance: sbNum_(p.distance), face_dist: sbNum_(p.faceDist),
      scanned_by: p.scannedBy || 'self', photo_path: photoPath,
      retroactive: p.retroactive ? 'Y' : '',                    // v3.2: ให้ครบเท่าชีท (view checkin_log_th)
      reason: (p.retroactive && p.reason) || ''
    }, 'client_id');
  }
  // ช่อง photo ในชีท: ถ้าใช้ Supabase = เก็บ path (สั้น) · ถ้ายังไม่ตั้ง = เก็บ base64 เดิม (backward compat)
  const photoCell = useSB ? photoPath : (p.photo || '');

  logSh.appendRow([
    when, empId, target.name, dateStr, timeStr,
    type, branch,
    p.lat || '', p.lng || '', p.distance || '', p.faceDist || '',
    p.scannedBy || 'self', p.retroactive ? 'Y' : '',
    (p.retroactive && p.reason) || '',
    photoCell, user.email, cid,   // O=photo(path) · Q(17)=clientId
  ]);

  // v3.3: เลิกเขียนชีท "ลงเวลาApp" — ตรรกะช่อง IN/OUT ไม่เข้ากับกะจริง ข้อมูลเพี้ยน
  // HR ทำสูตรเองจาก CheckinLog (ดิบ ถูกต้อง) แทน · เปิดกลับได้ด้วยสวิตช์เดียว
  const res = WRITE_ATT_SHEET ? upsertAttendance({
    empId, name: target.name, dateStr, timeStr,
    type: type, branch, bu,
    note: p.retroactive ? ('ย้อนหลัง: ' + (p.reason || '-')) : '',
  }) : { status: '', slot: '' };

  // v2.3: บอก client ตรงๆ ว่ารูปขึ้น Storage จริงไหม — จะได้ไม่พลาดเงียบ (หน้า audit ขึ้น "ไม่มีรูป")
  return jsonOut({ ok:true, msg:'บันทึกแล้ว', status:res.status, slot:res.slot,
    type: type, typeFixed: typeFixed,   // v8.3: แอปเอาไปแก้ log ในเครื่องให้ตรงกับที่ลงชีทจริง
    photoSaved: (useSB && p.photo) ? !!photoPath : null });
  } finally { if (_ckLock) { try { _ckLock.releaseLock(); } catch (e) {} } }   // v7.9
}

/* v3.3: สวิตช์ชีท "ลงเวลาApp" — false = หยุดเขียน (HR เขียนสูตรเองจาก CheckinLog) */
const WRITE_ATT_SHEET = false;

/* ============================================================
   v3.4: สร้างรายงาน "สรุปวัน" อัตโนมัติ — Run ฟังก์ชันนี้ครั้งเดียวจาก editor
   ได้: แท็บ "สรุปวัน" (ทุกคน×ทุกวัน + IN/OUT + สถานะสี + การลา + วันหยุด)
        + แท็บ "คิดสรุป" (ตัวคำนวณ ซ่อนไว้) + แท็บ "Holidays" (ถ้ายังไม่มี)
   เปลี่ยนช่วงรายงานได้เองที่ B1 (เริ่ม) / D1 (จบ) ในแท็บ "สรุปวัน"
   ============================================================ */
function setupDailySummary() {
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);

  // Holidays — สร้างเปล่าไว้ให้เติมวันนักขัตฤกษ์ (A=วันที่ B=ชื่อวันหยุด)
  let hol = ss.getSheetByName('Holidays');
  if (!hol) {
    hol = ss.insertSheet('Holidays');
    hol.getRange(1, 1, 1, 2).setValues([['วันที่', 'ชื่อวันหยุด']])
      .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  }

  // ── แท็บคำนวณ (ซ่อน) ──
  // v4.0: กะดึกข้ามคืน "รายวันตามตารางจัดกะ" (สโตร์สลับกะได้ ไม่ฟิกซ์ตัวคน):
  //   วันไหนแท็บ "จัดกะ" ลงกะให้คนนั้น (ชื่อ-สกุล+วันที่) โดยเวลาเข้า ≥ 18:00 → วันนั้นนับแบบ
  //   "เที่ยงถึงเที่ยง" (สแกนก่อนเที่ยงของเช้าวันถัดไปนับเป็นกะเมื่อวานเย็น)
  //   → เข้า 21:50 + ออก 08:01 วันรุ่งขึ้น จับคู่อยู่แถวเดียว "ของวันที่" = วันเริ่มกะ
  //   เสริม: User slip คอลัมน์ F = "ดึก" ยังใช้ได้สำหรับคนกะดึกตายตัว (อย่าใส่ให้คนสลับกะ)
  //   เงื่อนไขให้จับคู่ถูก: จัดกะของกะดึกต้องลง "วันที่" เป็นวันเริ่มกะตอนเย็น และชื่อสะกดตรงกับในระบบ
  let calc = ss.getSheetByName('คิดสรุป');
  if (!calc) calc = ss.insertSheet('คิดสรุป'); else calc.clear();
  calc.getRange('A1').setFormula(
    `=LET(nid, IFERROR(FILTER('User slip'!B2:B&"", TRIM('User slip'!F2:F)="ดึก"), {"__none__"}), nkey, IFERROR(FILTER(TRIM('จัดกะ'!C2:C)&"|"&IFERROR(INT(IFERROR(DATEVALUE('จัดกะ'!G2:G), 'จัดกะ'!G2:G)), -1), (TRIM('จัดกะ'!C2:C)<>"") * (IFERROR(TIMEVALUE('จัดกะ'!D2:D), IF(ISNUMBER('จัดกะ'!D2:D), MOD('จัดกะ'!D2:D, 1), 0)) >= 0.75)), {"__none__"}), adj, ARRAYFORMULA(((ISNUMBER(MATCH(TRIM(CheckinLog!C2:C)&"|"&INT(CheckinLog!A2:A-0.5), nkey, 0)) + ISNUMBER(MATCH(CheckinLog!B2:B&"", nid, 0))) > 0) * 0.5), src, FILTER({INT(CheckinLog!A2:A - adj)&"|"&CheckinLog!B2:B, CheckinLog!A2:A - INT(CheckinLog!A2:A - adj)}, CheckinLog!A2:A<>""), QUERY(src, "select Col1, min(Col2), max(Col2), count(Col2) group by Col1 label Col1 '', min(Col2) '', max(Col2) '', count(Col2) ''", 0))`
  );
  try { calc.hideSheet(); } catch (e) {}

  // ── แท็บรายงาน ──
  let rp = ss.getSheetByName('สรุปวัน');
  if (!rp) rp = ss.insertSheet('สรุปวัน'); else { rp.clear(); rp.setConditionalFormatRules([]); }
  const now = new Date();
  rp.getRange('A1').setValue('ตั้งแต่');
  rp.getRange('B1').setValue(new Date(now.getFullYear(), now.getMonth(), 1)).setNumberFormat('dd/MM/yyyy');
  rp.getRange('C1').setValue('ถึง');
  rp.getRange('D1').setValue(now).setNumberFormat('dd/MM/yyyy');
  rp.getRange('A3:J3').setValues([[
    'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'ของวันที่', 'IN', 'OUT',
    'สถานะการลงเวลา', 'ประเภทการลา', 'เวลาที่ใช้ลา', 'วันหยุด', 'คลัง'
  ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  rp.setFrozenRows(3);

  rp.getRange('A4').setFormula(
    `=LET(ppl, SORT(UNIQUE(FILTER({CheckinLog!B2:B&"", CheckinLog!C2:C&""}, CheckinLog!A2:A<>""))), nP, ROWS(ppl), nD, D1-B1+1, ids, INDEX(ppl,,1), nms, INDEX(ppl,,2), {FLATTEN(MAKEARRAY(nP, nD, LAMBDA(r,c, INDEX(ids, r)))), FLATTEN(MAKEARRAY(nP, nD, LAMBDA(r,c, INDEX(nms, r)))), FLATTEN(MAKEARRAY(nP, nD, LAMBDA(r,c, B$1+c-1)))})`
  );
  rp.getRange('D4').setFormula(
    `=ARRAYFORMULA(IF(A4:A="",, IFERROR(VLOOKUP(INT(C4:C)&"|"&A4:A, คิดสรุป!A:D, 2, FALSE), "")))`
  );
  // v3.8: สแกนขาเดียว/กดซ้ำติดกัน (ช่วงแรก→สุดท้าย ≤ 5 นาที) → OUT เว้นว่าง โชว์เฉพาะ IN
  rp.getRange('E4').setFormula(
    `=ARRAYFORMULA(IF(A4:A="",, LET(tin, IFERROR(VLOOKUP(INT(C4:C)&"|"&A4:A, คิดสรุป!A:D, 2, FALSE), 0), tout, IFERROR(VLOOKUP(INT(C4:C)&"|"&A4:A, คิดสรุป!A:D, 3, FALSE), 0), IF((tout-tin)<=5/1440, "", tout))))`
  );
  // v3.6: ยึดช่วง "สแกนแรก→สุดท้าย" เป็นหลัก (สแกนเกินกลางวันไม่ถือว่าผิด):
  //   ≥2 สแกน: ช่วง ≥ 9 ชม. = ทำงานเต็มวัน / ไม่ถึง = ผิด
  // v3.8: ขาเดียว "หรือ" กดซ้ำติดกัน (ช่วง ≤ 5 นาที = จุดเดียวโดยพฤตินัย) = ผิด (ไม่ครบคู่)
  // v4.7: ลาบางส่วน (0 < ชม.ลา K < 8) — มีสแกนครบคู่ = "ทำงาน (ลาบางส่วน)" (ไม่เช็ค 9 ชม.
  //   เพราะวันนั้นได้รับอนุญาตให้อยู่ไม่ครบ) · ไม่มาสแกนเลย = "ผิด (ลาบางส่วน)"
  //   ลาเต็มวัน (K ≥ 8) + ไม่มีสแกน = "ลา"
  rp.getRange('F4').setFormula(
    // v7.7 (surat เคาะ 29/08 — ทางเลือก B): "มีสแกน" ชนะวันหยุด
    //   ไม่มีสแกน → วันอาทิตย์/วันนักขัตฯ ตามเดิม (ไม่ถูกนับขาด)
    //   มีสแกนในวันหยุด → คิดเหมือนวันทำงาน (ช่วง ≥9 ชม. = "ทำงานเต็มวัน" นับเป็นแรงปกติ)
    //   วันหยุดที่มาสแกนแต่ไม่ครบเกณฑ์ → "ทำงานวันหยุด" / "ไม่ครบคู่ (วันหยุด)" — ไม่นับขาด (ตัวนับขาดจับเฉพาะ "ผิด*")
    //   คอลัมน์ I ยังโชว์ชื่อวันหยุดไว้เสมอ → HR กรองคิดค่าทำงานวันหยุดได้
    `=ARRAYFORMULA(IF(A4:A="",, LET(cnt, IFERROR(VLOOKUP(INT(C4:C)&"|"&A4:A, คิดสรุป!A:D, 4, FALSE), 0), tin, IFERROR(VLOOKUP(INT(C4:C)&"|"&A4:A, คิดสรุป!A:D, 2, FALSE), 0), tout, IFERROR(VLOOKUP(INT(C4:C)&"|"&A4:A, คิดสรุป!A:D, 3, FALSE), 0), hol, IFERROR(VLOOKUP(INT(C4:C), Holidays!A:B, 2, FALSE), ""), lh, IF(ISNUMBER(K4:K), K4:K, 0), off, (WEEKDAY(C4:C)=1)+(hol<>""), IF(cnt=0, IF(WEEKDAY(C4:C)=1, "วันอาทิตย์", IF(hol<>"", "วันนักขัตฯ", IF(lh>=8, "ลา", IF(lh>0, "ผิด (ลาบางส่วน)", "ผิด")))), IF((tout-tin)<=5/1440, IF(off, "ไม่ครบคู่ (วันหยุด)", "ผิด (ไม่ครบคู่)"), IF((lh>0)*(lh<8), "ทำงาน (ลาบางส่วน)", IF((tout-tin)>=9/24, "ทำงานเต็มวัน", IF(off, "ทำงานวันหยุด", "ผิด"))))))))`
  );
  // v4.3: การลาApp โครงใหม่ — A วันที่, N ถึงวันที่, F ประเภทเอกสาร, I สถานะ, M จำนวนชั่วโมง
  rp.getRange('G4').setFormula(
    `=MAP(A4:A, C4:C, LAMBDA(id, d, IF(id="",, IFERROR(TEXTJOIN(", ", 1, FILTER('การลาApp'!F2:F, 'การลาApp'!B2:B&""=id, IFERROR(DATEVALUE('การลาApp'!A2:A), 'การลาApp'!A2:A)<=d, IFERROR(DATEVALUE('การลาApp'!N2:N), 'การลาApp'!N2:N)>=d, ISNUMBER(SEARCH("อนุมัติ", 'การลาApp'!I2:I&"")) + ('การลาApp'!I2:I="approved"))), ""))))`
  );
  // v4.9: โชว์ชั่วโมงลาของ "วันนั้น" (cap 8 จากคอลัมน์ K) — เดิมโชว์ยอดรวมทั้งใบ (ลา 3 วันขึ้น 24 ทุกวัน)
  rp.getRange('H4').setFormula(
    `=ARRAYFORMULA(IF(A4:A="",, IF(ISNUMBER(K4:K)*(K4:K>0), K4:K, "")))`
  );
  rp.getRange('I4').setFormula(
    `=ARRAYFORMULA(IF(A4:A="",, IF(WEEKDAY(C4:C)=1, "วันอาทิตย์", IFERROR(VLOOKUP(INT(C4:C), Holidays!A:B, 2, FALSE), ""))))`
  );
  // v3.7: คลัง จาก User slip คอลัมน์ D — เทียบเป็นข้อความทั้งคู่ (รหัสในชีทเป็นเลข, ใน A เป็นข้อความ)
  // และช่อง D ที่ว่างให้ได้ "" ไม่ใช่ 0
  rp.getRange('J4').setFormula(
    `=ARRAYFORMULA(IF(A4:A="",, IFERROR(VLOOKUP(A4:A&"", {'User slip'!B2:B&"", 'User slip'!D2:D&""}, 2, FALSE), "")))`
  );
  // v4.7: K (ซ่อน) = ชั่วโมงลาอนุมัติของวันนั้น (cap 8) — ใช้คิดสถานะลาบางส่วน + เศษวันใน ลงเวลาAuto
  rp.getRange('K3').setValue('ชม.ลา').setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  rp.getRange('K4').setFormula(
    `=MAP(A4:A, C4:C, LAMBDA(id, d, IF(id="",, LET(s, IFERROR(SUM(FILTER('การลาApp'!M2:M, 'การลาApp'!B2:B&""=id, IFERROR(DATEVALUE('การลาApp'!A2:A), 'การลาApp'!A2:A)<=d, IFERROR(DATEVALUE('การลาApp'!N2:N), 'การลาApp'!N2:N)>=d, ISNUMBER(SEARCH("อนุมัติ", 'การลาApp'!I2:I&"")) + ('การลาApp'!I2:I="approved"))), 0), MIN(8, N(s))))))`
  );
  try { rp.hideColumns(11); } catch (e) {}

  rp.getRange('C4:C').setNumberFormat('dd/MM/yyyy');
  rp.getRange('D4:E').setNumberFormat('HH:mm');

  // สีสถานะ (เหมือน HumanSoft)
  const mk = (txt, color) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains(txt).setBackground(color)
    .setRanges([rp.getRange('F4:F')]).build();
  // v4.7: ลำดับสำคัญ — "ผิด (ลาบางส่วน)" ให้เข้ากติกา "ผิด" (แดง), "ลา" เพียวๆ อยู่ท้ายสุด
  rp.setConditionalFormatRules([
    mk('ทำงานเต็มวัน', '#c9f5ee'),
    mk('ทำงาน (ลาบางส่วน)', '#b8e6cf'),
    mk('ทำงานวันหยุด', '#ffd9a0'),          // v7.7: มาทำงานในวันหยุด (ยังไม่ครบเกณฑ์วันเต็ม)
    mk('ไม่ครบคู่ (วันหยุด)', '#ffe3b3'),   // v7.7
    mk('ผิด', '#f8c7c4'),
    mk('วันอาทิตย์', '#fff2a8'),
    mk('วันนักขัตฯ', '#c8f7c5'),
    mk('ลา', '#cfe2f3'),
  ]);

  ss.setActiveSheet(rp);
  Logger.log('✅ สร้างแท็บ "สรุปวัน" เรียบร้อย — เปลี่ยนช่วงวันที่ได้ที่ B1/D1');
}

/* v4.5: แท็บ "ลงเวลาAuto" — สรุปยอดรายคนจากแท็บ สรุปวัน (โครงเดียวกับชีทนับมือของ HR)
   ตัวเลขวิ่งตามช่วงวันที่ B1/D1 ของ สรุปวัน · รัน setupMonthlyAuto() จาก editor (รันซ้ำ = ล้างสร้างใหม่) */
function setupMonthlyAuto() {
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
  let sh = ss.getSheetByName('ลงเวลาAuto');
  if (!sh) sh = ss.insertSheet('ลงเวลาAuto'); else sh.clear();

  sh.getRange(1, 1, 1, 14).setValues([[
    'ชื่อสกุล', 'รหัส พนง.', 'คลัง', 'จำนวนแรงที่ทำงาน', 'ป่วยมีบพ.', 'กิจรับค่าจ้าง',
    'ลาคลอด ญ/ช', 'พักร้อน', 'ป่วยไม่มีใบแพทย์', 'ขาดงาน', 'ลาไม่รับค่าจ้าง',
    'สลับวันหยุด', 'รวมวัน', 'จำนวนแรงที่ทำงาน',
  ]]).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  // สีหัวคอลัมน์ตามชีทนับมือ
  const paint = (col, bg, fc) => sh.getRange(1, col).setBackground(bg).setFontColor(fc || '#000000');
  paint(1, '#f6b26b'); paint(2, '#f6b26b'); paint(3, '#f6b26b');
  paint(4, '#d9ead3'); paint(5, '#93c47d'); paint(6, '#d9ead3'); paint(7, '#ffff00');
  paint(8, '#d9ead3'); paint(9, '#d9d2e9'); paint(10, '#990000', '#ffffff');
  paint(11, '#990000', '#ffffff'); paint(12, '#7030a0', '#ffffff');
  paint(13, '#4472c4', '#ffffff'); paint(14, '#d9ead3');
  sh.setFrozenRows(1);
  sh.getRange('A1').setNote(
    'สรุปอัตโนมัติจากแท็บ "สรุปวัน" — ช่วงวันที่ตามช่อง B1/D1 ของ สรุปวัน\n' +
    'แนะนำตั้ง "ถึง" (D1) เป็นเมื่อวาน กันวันนี้ถูกนับขาดก่อนพนักงานสแกนออก\n' +
    'ขาดงาน = วันสถานะ "ผิด" ที่ไม่มีใบลา · วันอาทิตย์/นักขัตฯ ไม่ถูกนับในทุกช่อง');

  // รายชื่อ (เรียงตามชื่อ) — ชื่อ | รหัส | คลัง จาก สรุปวัน
  sh.getRange('A2').setFormula(
    `=SORT(UNIQUE(FILTER({สรุปวัน!B4:B&"", สรุปวัน!A4:A&"", สรุปวัน!J4:J&""}, สรุปวัน!A4:A<>"")))`
  );
  // v4.7: คิด "เศษวัน" ตามชั่วโมงจริง ÷ 8 (surat เคาะ 14/08) — ใช้คอลัมน์ K (ชม.ลา) ของ สรุปวัน
  //   ช่องลา = Σ(ชม.ลา)/8 ต่อประเภท · ศูนย์เว้นว่าง · ปัด 2 ตำแหน่ง
  const noHol = `สรุปวัน!F4:F, "<>วันอาทิตย์", สรุปวัน!F4:F, "<>วันนักขัตฯ"`;
  // เก็บค่าจริงไม่ปัดเศษ (กัน 0.63+0.38=1.01) — การแสดงผล 2 ตำแหน่งใช้ number format แทน
  const leaveSum = (crit) =>
    `=ARRAYFORMULA(IF(B2:B="",, LET(s, SUMIFS(สรุปวัน!K4:K, สรุปวัน!A4:A, B2:B&"", ${crit})/8, IF(s=0,,s))))`;
  // D แรง = วันเต็ม + เศษที่เหลือของวัน "ทำงาน (ลาบางส่วน)" (1 − ชม.ลา/8)
  sh.getRange('D2').setFormula(
    `=ARRAYFORMULA(IF(B2:B="",, LET(full, COUNTIFS(สรุปวัน!A4:A, B2:B&"", สรุปวัน!F4:F, "ทำงานเต็มวัน"), pc, COUNTIFS(สรุปวัน!A4:A, B2:B&"", สรุปวัน!F4:F, "ทำงาน (ลาบางส่วน)"), ph, SUMIFS(สรุปวัน!K4:K, สรุปวัน!A4:A, B2:B&"", สรุปวัน!F4:F, "ทำงาน (ลาบางส่วน)"), full + pc - ph/8)))`
  );
  sh.getRange('E2').setFormula(leaveSum(`สรุปวัน!G4:G, "*ป่วย*", สรุปวัน!G4:G, "<>*ไม่มีใบ*", ${noHol}`));
  sh.getRange('F2').setFormula(leaveSum(`สรุปวัน!G4:G, "*กิจ*", สรุปวัน!G4:G, "<>*ไม่รับค่าจ้าง*", ${noHol}`));
  sh.getRange('G2').setFormula(leaveSum(`สรุปวัน!G4:G, "*คลอด*", ${noHol}`));
  sh.getRange('H2').setFormula(leaveSum(`สรุปวัน!G4:G, "*พักร้อน*", ${noHol}`));
  sh.getRange('I2').setFormula(leaveSum(`สรุปวัน!G4:G, "*ไม่มีใบ*", ${noHol}`));
  // J ขาด = "ผิด" ที่ไม่มีใบลา (เต็มวัน) + เศษที่ขาดของ "ผิด (ลาบางส่วน)" (ลาแล้วส่วนที่เหลือไม่มาสแกน)
  sh.getRange('J2').setFormula(
    `=ARRAYFORMULA(IF(B2:B="",, LET(a, COUNTIFS(สรุปวัน!A4:A, B2:B&"", สรุปวัน!F4:F, "ผิด*", สรุปวัน!G4:G, "="), pc, COUNTIFS(สรุปวัน!A4:A, B2:B&"", สรุปวัน!F4:F, "ผิด (ลาบางส่วน)"), ph, SUMIFS(สรุปวัน!K4:K, สรุปวัน!A4:A, B2:B&"", สรุปวัน!F4:F, "ผิด (ลาบางส่วน)"), s, a + pc - ph/8, IF(s=0,,s))))`
  );
  // v4.6: กันนับซ้ำ — "ลาคลอด (ไม่รับค่าจ้าง)" ต้องเข้าช่องลาคลอดช่องเดียว
  sh.getRange('K2').setFormula(leaveSum(`สรุปวัน!G4:G, "*ไม่รับค่าจ้าง*", สรุปวัน!G4:G, "<>*คลอด*", ${noHol}`));
  sh.getRange('L2').setFormula(leaveSum(`สรุปวัน!G4:G, "*เปลี่ยนวันหยุด*", ${noHol}`));
  sh.getRange('M2').setFormula(
    `=ARRAYFORMULA(IF(B2:B="",, D2:D+E2:E+F2:F+G2:G+H2:H+I2:I+J2:J+K2:K+L2:L))`
  );
  sh.getRange('N2').setFormula(`=ARRAYFORMULA(IF(B2:B="",, D2:D))`);
  sh.getRange('D2:N').setHorizontalAlignment('center').setNumberFormat('0.##');   // v4.7: เศษวันโชว์ 2 ตำแหน่ง เลขเต็มโชว์เลขเต็ม
  ss.setActiveSheet(sh);
  Logger.log('✅ สร้างแท็บ "ลงเวลาAuto" เรียบร้อย — ตัวเลขวิ่งตามช่วงวันที่ของ สรุปวัน (B1/D1)');
}

/* v4.3: ย้ายชีทการลาApp ไปโครงคอลัมน์ใหม่ — รันครั้งเดียวจาก editor "หลัง Deploy v4.3 แล้ว"
   ของเก่าถูกเก็บที่แท็บ "การลาApp เดิม" + แถวเก่าถูกย้ายเข้าโครงใหม่ให้ครบ */
function migrateLeaveSheet() {
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
  const old = ss.getSheetByName('การลาApp');
  if (old && leaveSheetIsNew_(old)) { Logger.log('การลาApp เป็นโครงใหม่อยู่แล้ว — ไม่ต้องย้าย'); return; }
  if (ss.getSheetByName('การลาApp เดิม')) { Logger.log('⚠ มีแท็บ "การลาApp เดิม" อยู่แล้ว — ยกเลิก กันย้ายซ้ำ'); return; }
  if (old) old.setName('การลาApp เดิม');
  const sh = ss.insertSheet('การลาApp');
  sh.getRange(1, 1, 1, 15).setValues([LEAVE_HEADERS_V2])
    .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (old) {
    const data = old.getDataRange().getValues();
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[1] || '').trim() === '') continue;
      const st = String(r[9] || '');
      const decided = /อนุมัติ|approved|rejected|ปฏิเสธ/i.test(st);
      rows.push([
        r[15] || r[0],                        // A วันที่ ← เริ่มวันลา (P) — ไม่มีก็ใช้วันที่ขอ
        r[1], r[2],                           // B C
        r[3] || ((pttMap_()[String(r[1]).trim()] || {}).nickname) || '',   // D ชื่อเล่น (v4.4: เติมจากทะเบียน PTT ถ้าว่าง)
        khlangOf_(r[1]),                      // E คลัง (เติมจาก User slip ปัจจุบัน)
        r[6],                                 // F ประเภทเอกสาร ← ประเภท (G)
        r[7],                                 // G ขอโดย (H)
        r[11] || r[8] || r[0],                // H ขอวันที่ ← อัพเดทเมื่อ (L) / ขอวันที่ (I)
        st,                                   // I สถานะ (J)
        r[10],                                // J ผู้อนุมัติ (K)
        decided ? (r[11] || '') : '',         // K อนุมัติเมื่อ — เฉพาะรายการที่ตัดสินแล้ว
        r[12],                                // L รายละเอียด (M)
        r[13],                                // M จำนวนชั่วโมง (N)
        r[16] || r[15] || '',                 // N ถึงวันที่ ← สิ้นสุดวันลา (Q) / เริ่ม (P)
        r.length > 18 ? (r[18] || '') : '',   // O รูปแนบ (S)
      ]);
    }
    if (rows.length) sh.getRange(2, 1, rows.length, 15).setValues(rows);
    Logger.log('ย้าย ' + rows.length + ' แถวจากโครงเก่าเรียบร้อย');
  }
  Logger.log('✅ การลาApp โครงใหม่พร้อมใช้ — ของเก่าเก็บไว้ที่แท็บ "การลาApp เดิม" · อย่าลืมรัน setupDailySummary อัปสูตรคอลัมน์ลา');
}

function upsertAttendance(d) {
  const sh = getOrCreateTab(T.ATT);
  const data = sh.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][ATT_COL.empId]) === d.empId &&
        formatDate(data[i][ATT_COL.date]) === d.dateStr) {
      rowIdx = i; break;
    }
  }

  let row;
  if (rowIdx === -1) {
    row = new Array(20).fill('');
    row[ATT_COL.empId] = d.empId;
    row[ATT_COL.name] = d.name;
    row[ATT_COL.date] = d.dateStr;
  } else {
    row = data[rowIdx].slice();
  }

  if (!row[ATT_COL.branch]) row[ATT_COL.branch] = d.branch;
  if (!row[ATT_COL.bu])     row[ATT_COL.bu]     = d.bu;

  let slot = '';
  if (d.type === 'in') {
    if (!row[ATT_COL.in1])      { row[ATT_COL.in1] = d.timeStr; slot = 'in1 (D)'; }
    else if (!row[ATT_COL.in2]) { row[ATT_COL.in2] = d.timeStr; slot = 'in2 (F)'; }
    else                         slot = 'overflow (raw log only)';
  } else if (d.type === 'out') {
    if (!row[ATT_COL.out1])      { row[ATT_COL.out1] = d.timeStr; slot = 'out1 (E)'; }
    else if (!row[ATT_COL.out2]) { row[ATT_COL.out2] = d.timeStr; slot = 'out2 (G)'; }
    else                          slot = 'overflow (raw log only)';
  }

  if (d.note) {
    row[ATT_COL.note] = String(row[ATT_COL.note] || '').trim();
    row[ATT_COL.note] = row[ATT_COL.note] ? (row[ATT_COL.note] + ' | ' + d.note) : d.note;
  }

  recomputeRow(row, d.dateStr, d.empId);

  if (rowIdx === -1) sh.appendRow(row);
  else sh.getRange(rowIdx + 1, 1, 1, row.length).setValues([row]);

  return { rowIdx: rowIdx === -1 ? sh.getLastRow() : rowIdx + 1, status: row[ATT_COL.status], slot };
}

function recomputeRow(row, dateStr, empId) {
  const ins  = [row[ATT_COL.in1],  row[ATT_COL.in2]].filter(Boolean);
  const outs = [row[ATT_COL.out1], row[ATT_COL.out2]].filter(Boolean);

  row[ATT_COL.firstIn] = ins.length  ? ins.slice().sort()[0]               : '';
  row[ATT_COL.lastOut] = outs.length ? outs.slice().sort().reverse()[0]    : '';

  const dateObj = parseDDMMYYYY(dateStr);
  const isSun = dateObj && dateObj.getDay() === 0;
  const holidayName = isHoliday(dateStr);
  const approvedLeave = getApprovedLeaveForDate(empId, dateStr);

  if (isSun) {
    row[ATT_COL.status]  = 'วันอาทิตย์';
    row[ATT_COL.holiday] = 'อาทิตย์';
    row[ATT_COL.leaveType] = '';
    row[ATT_COL.leaveHours] = '';
  } else if (holidayName) {
    row[ATT_COL.status]  = 'วันนักขัตฯ';
    row[ATT_COL.holiday] = holidayName;
    row[ATT_COL.leaveType] = '';
    row[ATT_COL.leaveHours] = '';
  } else if (approvedLeave) {
    row[ATT_COL.status]      = 'ลา' + (approvedLeave.typeLabel || '');
    row[ATT_COL.leaveType]   = approvedLeave.typeLabel || '';
    row[ATT_COL.leaveHours]  = approvedLeave.hours || '';
    row[ATT_COL.holiday]     = '';
  } else if (ins.length && outs.length) {
    const inMin  = toMinutes(row[ATT_COL.firstIn]);
    const outMin = toMinutes(row[ATT_COL.lastOut]);
    const workedMin = (outMin - inMin) - lunchOverlap_(inMin, outMin);   // v8.7: หักพักเที่ยง
    row[ATT_COL.status]      = workedMin >= (8 * 60) ? 'ทำงานเต็มวัน' : 'ผิด';
    row[ATT_COL.holiday]     = '';
    row[ATT_COL.leaveType]   = '';
    row[ATT_COL.leaveHours]  = '';
  } else {
    row[ATT_COL.status]      = 'ผิด';
    row[ATT_COL.holiday]     = '';
    row[ATT_COL.leaveType]   = '';
    row[ATT_COL.leaveHours]  = '';
  }

  if (row[ATT_COL.firstIn]) {
    const lateMin = computeLateMinutes(row[ATT_COL.firstIn]);
    if (lateMin > 0) {
      const hh = Math.floor(lateMin / 60);
      const mm = lateMin % 60;
      row[ATT_COL.lateMin]    = pad2(hh) + ':' + pad2(mm) + ':00';
      row[ATT_COL.statusLate] = 'สาย';
      row[ATT_COL.lateText]   = 'สาย ' + lateMin + ' นาที';
    } else {
      row[ATT_COL.lateMin]    = '';
      row[ATT_COL.statusLate] = '';
      row[ATT_COL.lateText]   = '';
    }
  } else {
    row[ATT_COL.lateMin]    = '';
    row[ATT_COL.statusLate] = '';
    row[ATT_COL.lateText]   = '';
  }

  if (row[ATT_COL.firstIn] && row[ATT_COL.lastOut]) {
    const inMin  = toMinutes(row[ATT_COL.firstIn]);
    const outMin = toMinutes(row[ATT_COL.lastOut]);
    const worked = (outMin - inMin) - lunchOverlap_(inMin, outMin);   // v8.7: หักพักเที่ยง
    const miss   = (CFG.workHours * 60) - worked;
    if (miss > 0) {
      const hh = Math.floor(miss / 60);
      const mm = miss % 60;
      row[ATT_COL.missedTime] = (hh ? (hh + ' ชั่วโมง ') : '') + (mm ? (mm + ' นาที') : (hh ? '' : '0 นาที'));
    } else {
      row[ATT_COL.missedTime] = '';
    }
  } else if (ins.length || outs.length) {
    row[ATT_COL.missedTime] = 'ลงเวลาไม่ครบคู่';
  } else {
    row[ATT_COL.missedTime] = '';
  }
}

function computeLateMinutes(timeStr) {
  // v8.7: นับสายจาก "กะเข้า + ผ่อนผัน" (ให้ตรงหน้าสรุปในแอป)
  return Math.max(0, toMinutes(timeStr) - (toMinutes(CFG.workStart) + (CFG.graceMin || 0)));
}
/* v8.7 — พักเที่ยงที่คาบเกี่ยวกับช่วงทำงาน (นาที) */
function lunchOverlap_(inMin, outMin) {
  const bs = toMinutes(CFG.breakStart), be = toMinutes(CFG.breakEnd);
  return Math.max(0, Math.min(outMin, be) - Math.max(inMin, bs));
}
function toMinutes(t) {
  if (!t) return 0;
  if (t instanceof Date) return t.getHours() * 60 + t.getMinutes();
  const parts = String(t).split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}
function pad2(n) { return String(n).padStart(2, '0'); }
function formatDate(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'dd/MM/yyyy');
  return String(v).trim();
}
function parseDDMMYYYY(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  // v6.6: รองรับ yyyy-MM-dd ด้วย (ข้อมูลที่ผ่าน IMPORTRANGE/QUERY บางทีมาเป็นรูปแบบนี้)
  const iso = String(s).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y > 2400) y -= 543;
  return new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

/* ============================================================
   FACE DATA
   ============================================================ */

function actionRegisterFace(p, user) {
  const empId = String(p.empId || user.empId);
  // v2.0: หัวหน้าลงหน้าให้ได้เฉพาะคนในขอบเขตตัวเอง (สาขาเดียวกัน/ลูกทีมตรง/ทีม PTT ตามสิทธิ์)
  // — กัน supervisor สุ่มลงหน้าใต้รหัสคนอื่นที่ไม่เกี่ยว (สวมหน้า + ล็อกเจ้าตัวถาวร)
  if (empId !== user.empId && !isHR(user)) {
    const t = findUserByEmpId(empId);
    const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
    const isMyReport = t && norm(t.supervisorName) === norm(user.name);
    if (!isSupervisor(user) && !isMyReport && !canSeeUser(user, empId)) {
      return jsonOut({ ok:false, error:'ไม่มีสิทธิ์ลงทะเบียนใบหน้าให้คนอื่น' });
    }
    if (isSupervisor(user) && !isMyReport && !canSeeUser(user, empId)) {
      return jsonOut({ ok:false, error:'ไม่มีสิทธิ์ลงทะเบียนใบหน้าให้พนักงานนอกทีม/นอกสาขา' });
    }
  }
  // v1.6: descriptor อาจเป็น [128 ตัวเลข] (1 เทมเพลต) หรือ [[128],[128]] (2 เทมเพลต ไม่ยิ้ม/ยิ้ม)
  const sh = getOrCreateTab(T.FACE);
  const data = sh.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === empId) { rowIdx = i; break; }
  }
  // v1.7: ลงทะเบียนได้ครั้งเดียว — เขียนทับใบหน้าที่มีอยู่ได้เฉพาะ HR (กันสวมหน้าคนอื่น)
  if (rowIdx !== -1 && String(data[rowIdx][2] || '').length > 2 && !isHR(user)) {
    return jsonOut({ ok:false, error:'🔒 ลงทะเบียนใบหน้าได้ครั้งเดียว — ติดต่อ HR หากต้องแก้ไข' });
  }
  const newRow = [
    empId, p.name || '', JSON.stringify(p.descriptor || []),
    p.photo || '', new Date(), p.registeredBy || user.empId,
  ];
  if (rowIdx === -1) sh.appendRow(newRow);
  else sh.getRange(rowIdx + 1, 1, 1, 6).setValues([newRow]);

  // v1.6: dual-write → Supabase (ตาราง face_data + รูปใน Storage ใต้ faces/ — cron ลบรูปเก่าไม่แตะโฟลเดอร์นี้)
  let sbOk = false;
  if (sbReady_()) {
    try {
      const ph1 = p.photo  ? sbUploadPhoto_(p.photo,  'faces/' + empId + '/neutral.jpg') : '';
      const ph2 = p.photo2 ? sbUploadPhoto_(p.photo2, 'faces/' + empId + '/smile.jpg')   : '';
      sbOk = sbUpsert_('face_data', {
        emp_id: empId,
        name: p.name || '',
        descriptors: p.descriptor || [],          // jsonb — เก็บตามที่ client ส่ง (1 หรือ 2 เทมเพลต)
        photo_path: ph1,
        photo2_path: ph2,
        registered_by: p.registeredBy || user.empId,
        registered_at: new Date().toISOString(),
      }, 'emp_id');
    } catch (e) { console.error('sb face_data', e); }
  }
  return jsonOut({ ok:true, msg:'ลงทะเบียนใบหน้าสำเร็จ', supabase: sbOk });
}

function actionDeleteFace(p, user) {
  const empId = String(p.empId || user.empId);
  // v1.7: ลบใบหน้าได้เฉพาะ HR (รวมถึงของตัวเอง — ลงทะเบียนครั้งเดียว)
  if (!isHR(user)) {
    return jsonOut({ ok:false, error:'🔒 ลบใบหน้าได้เฉพาะ HR — ติดต่อฝ่ายบุคคล' });
  }
  const sh = getOrCreateTab(T.FACE);
  const data = sh.getDataRange().getValues();
  // v2.0: ลบทุกแถวที่ตรง (เผื่อมีแถวซ้ำจากอดีต) — ไล่จากล่างขึ้นบน index จะได้ไม่เลื่อน
  let removed = 0;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === empId) { sh.deleteRow(i + 1); removed++; }
  }
  sbDeleteFace_(empId);   // v1.6: ลบใน Supabase ด้วย
  return jsonOut({ ok:true, removed, msg: removed ? undefined : 'ไม่พบข้อมูลใบหน้า' });
}

/* v1.6: ลบ face_data + รูปใน Storage ของพนักงานคนนั้น */
function sbDeleteFace_(empId) {
  if (!sbReady_()) return;
  const s = sb_();
  try {
    UrlFetchApp.fetch(s.url + '/rest/v1/face_data?emp_id=eq.' + encodeURIComponent(empId), {
      method: 'delete', headers: { apikey: s.key, Authorization: 'Bearer ' + s.key, Prefer: 'return=minimal' },
      muteHttpExceptions: true });
    UrlFetchApp.fetch(s.url + '/storage/v1/object/checkin-photos', {
      method: 'delete', contentType: 'application/json',
      headers: { apikey: s.key, Authorization: 'Bearer ' + s.key },
      payload: JSON.stringify({ prefixes: ['faces/' + empId + '/neutral.jpg', 'faces/' + empId + '/smile.jpg'] }),
      muteHttpExceptions: true });
  } catch (e) { console.error('sbDeleteFace', e); }
}

function actionGetFaceData(user) {
  const sh = getOrCreateTab(T.FACE);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[0]) continue;
    if (!canSeeUser(user, r[0])) continue;
    try {
      out.push({
        empId: String(r[0]),
        name: String(r[1] || ''),
        descriptor: JSON.parse(r[2] || '[]'),
        photo: String(r[3] || ''),
        registeredAt: r[4],
      });
    } catch(_) {}
  }
  return jsonOut({ ok:true, faces: out });
}

/* ============================================================
   LEAVE
   ============================================================ */

/* v4.3: โครงคอลัมน์ใหม่ของชีทการลาApp (surat เคาะ 14/08) — คำขอทั้ง 3 แบบ
   (ขอลางาน / เปลี่ยนวันหยุด / แก้เวลาย้อนหลัง) ลงชีทเดียวหัวเดียวกัน
   + "ถึงวันที่" (ลาหลายวัน) และ "รูปแนบ" ต่อท้าย */
const LEAVE_HEADERS_V2 = [
  'วันที่','รหัสพนักงาน','ชื่อ-นามสกุล','ชื่อเล่น','คลัง',
  'ประเภทเอกสาร','ขอโดย','ขอวันที่','สถานะ','ผู้อนุมัติ',
  'อนุมัติเมื่อ','รายละเอียด','จำนวนชั่วโมง','ถึงวันที่','รูปแนบ',
];
function leaveSheetIsNew_(sh) {
  try { return String(sh.getRange(1, 5).getValue()).trim() === 'คลัง'; } catch (e) { return false; }
}
/* คลัง จาก User slip คอลัมน์ D — แคชต่อ execution */
let _slipKhlangCache = null;
function khlangOf_(empId) {
  try {
    if (!_slipKhlangCache) {
      _slipKhlangCache = {};
      const sh = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName('User slip');
      if (sh) sh.getDataRange().getValues().slice(1).forEach(r => {
        const id = String(r[1] || '').trim();
        if (id && !(id in _slipKhlangCache)) _slipKhlangCache[id] = String(r[3] || '').trim();
      });
    }
    return _slipKhlangCache[String(empId).trim()] || '';
  } catch (e) { return ''; }
}

function actionSubmitLeaveApp(p, user) {
  const empId = String(p.empId || user.empId);
  if (empId !== user.empId && !isSupervisor(user)) {
    return jsonOut({ ok:false, error:'ไม่มีสิทธิ์' });
  }
  const target = findUserByEmpId(empId) || user;
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
  let sh = ss.getSheetByName('การลาApp');
  if (!sh) {
    sh = ss.insertSheet('การลาApp');
    sh.getRange(1, 1, 1, 15).setValues([LEAVE_HEADERS_V2])
      .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }

  const now = new Date();
  const tz  = 'Asia/Bangkok';
  const requestDate = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
  const updateTime  = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');
  const startDate   = String(p.startDate || requestDate);
  const endDate     = String(p.endDate || startDate);
  const nameDate    = `${cleanName_(target.name)} ${startDate}`;

  // ── v5.9: กันคำขอลงซ้ำ ──────────────────────────────────────────────
  // แอป retry เองเมื่อเซิร์ฟเวอร์ตอบช้า/ตอบ HTML ทั้งที่แถวถูกเขียนไปแล้ว → เดิมได้ 2-3 แถวต่อการกด 1 ครั้ง
  // ล็อกก่อน เพื่อให้ "ตรวจซ้ำ → เขียน" เป็นก้อนเดียว (retry รอบสองจะเห็นแถวของรอบแรกเสมอ)
  let _lk = null;
  try { _lk = LockService.getScriptLock(); _lk.waitLock(20000); } catch (e) { _lk = null; }
  try {
  const reqId = String(p.reqId || '').trim();
  if (leaveSheetIsNew_(sh) && sh.getLastRow() > 1) {
    const lastRow = sh.getLastRow();
    // 1) reqId เดิม (คงที่ทุก retry) — เจอแล้ว = เขียนไปแล้ว ไม่ต้องเขียนซ้ำ
    if (reqId) {
      const ids = sh.getRange(2, 16, lastRow - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0] || '').trim() === reqId) return jsonOut({ ok:true, dup:true, row:i + 2 });
      }
    }
    // 2) สำรอง (แอปเวอร์ชันเก่าไม่ส่ง reqId / ผู้ใช้กดซ้ำเอง): แถวเหมือนกันเป๊ะ + ยื่นห่างไม่เกิน 5 นาที
    const scanFrom = Math.max(2, lastRow - 39);
    const recent = sh.getRange(scanFrom, 1, lastRow - scanFrom + 1, 14).getValues();
    const rsn = String(p.reason || '');
    for (let i = recent.length - 1; i >= 0; i--) {
      const r = recent[i];
      if (String(r[1] || '').trim() !== empId) continue;
      if (String(r[0] || '').trim() !== startDate) continue;
      if (String(r[5] || '').trim() !== String(p.typeLabel || p.type || '').trim()) continue;
      if (String(r[11] || '').replace('⚠เกินโควต้า · ', '').trim() !== rsn.trim()) continue;
      const prev = parseDDMMYYYYHHmm_(String(r[7] || ''));
      if (prev && (now.getTime() - prev.getTime()) <= 5 * 60 * 1000) {
        return jsonOut({ ok:true, dup:true, row:scanFrom + i });
      }
    }
  }

  // v4.2: รูปแนบจากฟอร์ม (เช่น เปลี่ยนวันหยุด/ใบรับรองแพทย์) → Supabase Storage ใต้ requests/
  // (cron ลบรูป 60 วันไม่แตะ — มันลบเฉพาะ path ใน checkin_log) + ลิงก์เปิดรูปผ่าน photoView ลงคอลัมน์ S
  let photoLink = '';
  // v4.9: ฟอร์มลาส่งรูปแนบมาในชื่อ "attachment" (ใบรับรองแพทย์) — เดิมถูกทิ้งเงียบเพราะรับแค่ photo
  const photoData = String(p.photo || p.attachment || '');
  if (photoData.indexOf('base64,') > 0 && sbReady_()) {
    try {
      const pPath = 'requests/' + empId + '/' + Utilities.formatDate(now, tz, 'yyyyMMdd') + '/LA' + Date.now() + '.jpg';
      if (sbUploadPhoto_(photoData, pPath)) {
        const pk = PropertiesService.getScriptProperties().getProperty('PHOTO_KEY') || '';
        photoLink = pk
          ? (ScriptApp.getService().getUrl() + '?action=photoView&k=' + pk + '&p=' + encodeURIComponent(pPath))
          : pPath;
      }
    } catch (e) { console.error('leave photo upload', e); }
  }
  // v4.6: แอปเวอร์ชันเก่าส่ง typeLabel ลาคลอดเป็นโค้ดดิบ (ลืม map ฝั่งแอป) — แปลงเป็นไทยก่อนลงชีท
  const LEAVE_LABEL_FIX = { maternity_paid: 'ลาคลอด (รับค่าจ้าง)', maternity_unpaid: 'ลาคลอด (ไม่รับค่าจ้าง)' };
  let typeLabelVal = String(p.typeLabel || p.type || '');
  if (LEAVE_LABEL_FIX[typeLabelVal]) typeLabelVal = LEAVE_LABEL_FIX[typeLabelVal];

  // v4.4: ชื่อเล่น — ไล่จาก ฟอร์ม → ชีท Users → ทะเบียน PTT (คอลัมน์ H)
  const nickVal = p.nickname || target.nickname || ((pttMap_()[empId] || {}).nickname) || '';
  // v4.4: จำนวนชั่วโมง — ฟอร์มไม่ส่งมา (เช่น เปลี่ยนวันหยุด) = 8 ชม./วัน × จำนวนวัน
  //       ยกเว้น แก้เวลาย้อนหลัง (ไม่ใช่การใช้ชั่วโมงลา) เว้นว่างไว้
  let hoursVal = (p.hours !== undefined && p.hours !== null && String(p.hours) !== '') ? p.hours : '';
  if (hoursVal === '' && String(p.type || '') !== 'time_adjust') {
    let days = 1;
    try {
      const sd = parseDDMMYYYY(startDate), ed = parseDDMMYYYY(endDate);
      if (sd && ed) days = Math.max(1, Math.round((ed - sd) / 86400000) + 1);
    } catch (e) {}
    hoursVal = 8 * days;
  }

  // v5.2: ด่านโควต้าแบบล็อกแข็ง (surat เคาะ) — เกินโควต้า = ยื่นไม่ได้ + แนะนำประเภทที่ยังเหลือ
  //       ข้อยกเว้น: HR ยื่นแทนได้แม้เกิน (เคสพิเศษ) — แถวจะติดธง "⚠เกินโควต้า" ให้เห็น
  const QUOTA_HARD_BLOCK = true;
  let overQuota = false;
  try {
    const qKey = { personal:'personal', sick_with_cert:'sickWithCert', sick_no_cert:'sickNoCert',
                   vacation:'vacation', unpaid_personal:'unpaidPersonal',
                   maternity_paid:'maternity', maternity_unpaid:'maternity',
                   training:'training' }[String(p.type || '')];   // v6.4
    if (qKey) {
      const q = leaveQuotaFor_(empId);
      if (q && q.remaining[qKey] != null) {
        const reqDays = leaveQuotaDays_(hoursVal, startDate, endDate);   // v7.3: ขั้นบันได 0.5 / 1 วัน
        if (reqDays > q.remaining[qKey]) {
          overQuota = true;
          if (QUOTA_HARD_BLOCK && !isHR(user)) {
            // แนะนำเฉพาะ กิจ/พักร้อน/กิจไม่รับค่าจ้าง — ไม่ชวนใช้ลาป่วย/ลาคลอดแทน
            const NAMES = { personal:'ลากิจ', vacation:'ลาพักร้อน', unpaidPersonal:'ลากิจไม่รับค่าจ้าง' };
            const alts = [];
            Object.keys(NAMES).forEach(k => {
              if (k === qKey) return;
              const rv = q.remaining[k];
              if (rv == null) alts.push(NAMES[k] + ' (ไม่จำกัด)');
              else if (rv >= reqDays) alts.push(NAMES[k] + ' (เหลือ ' + rv + ' วัน)');
            });
            return jsonOut({ ok:false, error:'ยื่นไม่ได้ — เกินโควต้า: ประเภทนี้เหลือ ' + q.remaining[qKey] + ' วัน (ขอ ' + reqDays + ' วัน)' + (alts.length ? ' · ใช้แทนได้: ' + alts.join(' · ') : '') });
          }
        }
      }
    }
  } catch (e) {}
  const reasonVal = (overQuota ? '⚠เกินโควต้า · ' : '') + (p.reason || '');

  if (leaveSheetIsNew_(sh)) {
    // v4.3: โครงใหม่ 15 คอลัมน์ — อนุมัติเมื่อ (K) เว้นว่าง รอประทับตอน approveAny
    sh.appendRow([
      startDate,                              // A วันที่ (วันที่มีผล: วันเริ่มลา/วันที่ขอเปลี่ยน/วันที่แก้เวลา)
      empId,                                  // B รหัสพนักงาน
      cleanName_(target.name),                // C ชื่อ-นามสกุล
      nickVal,                                // D ชื่อเล่น
      khlangOf_(empId),                       // E คลัง
      typeLabelVal,                           // F ประเภทเอกสาร
      cleanName_(user.name || ''),            // G ขอโดย
      updateTime,                             // H ขอวันที่ (timestamp)
      'pending',                              // I สถานะ
      '',                                     // J ผู้อนุมัติ
      '',                                     // K อนุมัติเมื่อ
      reasonVal,                              // L รายละเอียด (v5.1: มีธงเกินโควต้านำหน้าเมื่อเกิน)
      hoursVal,                               // M จำนวนชั่วโมง
      endDate,                                // N ถึงวันที่
      photoLink,                              // O รูปแนบ
    ]);
    // v5.9: ประทับรหัสกำกับคำขอไว้คอลัมน์ P — retry รอบถัดไปเห็นแล้วไม่เขียนซ้ำ
    if (reqId) {
      try {
        if (String(sh.getRange(1, 16).getValue() || '') === '') {
          sh.getRange(1, 16).setValue('reqId').setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
        }
        sh.getRange(sh.getLastRow(), 16).setValue(reqId);
      } catch (e) {}
    }
  } else {
    // ยังไม่รัน migrateLeaveSheet() — เขียนโครงเก่า 18+1 คอลัมน์ตามเดิม กันแถวเพี้ยน
    try {
      if (photoLink && String(sh.getRange(1, 19).getValue() || '') === '') {
        sh.getRange(1, 19).setValue('รูปแนบ').setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      }
    } catch (e) {}
    sh.appendRow([
      requestDate,
      empId,
      cleanName_(target.name),
      nickVal,
      '',
      target.branch || '',
      typeLabelVal,
      cleanName_(user.name || ''),
      requestDate,
      'pending',
      '',
      updateTime,
      reasonVal,
      hoursVal,
      '',
      startDate,
      endDate,
      nameDate,
      photoLink,
    ]);
  }

  const lvSh = getOrCreateTab(T.LEAVE);
  const id   = 'LV' + Date.now();
  lvSh.appendRow([
    id, now, empId, cleanName_(target.name),
    p.type || '', typeLabelVal,
    startDate, endDate,
    parseFloat(hoursVal) || 8, p.unit || 'full_day',   // v4.4: ใช้ค่าเดียวกับการลาApp
    reasonVal, '',
    'pending', '', '', '', user.email,
  ]);

  return jsonOut({ ok:true, msg:'ยื่นคำขอแล้ว', id });
  } finally { if (_lk) { try { _lk.releaseLock(); } catch (e) {} } }   // v5.9
}

/* v5.9: แปลง "dd/MM/yyyy HH:mm:ss" (คอลัมน์ H) เป็น Date — ใช้ตรวจคำขอซ้ำภายใน 5 นาที */
function parseDDMMYYYYHHmm_(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
  return isNaN(d.getTime()) ? null : d;
}

/* v5.9: ล้างคำขอซ้ำที่ลงไปแล้ว (รันครั้งเดียวจาก editor)
   ซ้ำ = รหัสพนักงาน+วันที่+ประเภท+รายละเอียด เหมือนกัน และยื่นห่างกันไม่เกิน 5 นาที
   เก็บใบแรกไว้ · ใบซ้ำเปลี่ยนสถานะเป็น cancelled (ไม่ลบแถว — ตรวจย้อนได้) เฉพาะใบที่ยัง pending */
function cleanDuplicateLeaveRows() {
  const sh = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName('การลาApp');
  if (!sh || !leaveSheetIsNew_(sh)) throw new Error('ไม่พบชีทการลาApp (โครงใหม่)');
  const last = sh.getLastRow();
  if (last < 3) return 'ไม่มีข้อมูลพอให้ตรวจ';
  const data = sh.getRange(2, 1, last - 1, 14).getValues();
  const seen = {}, dupRows = [];
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!String(r[1] || '').trim()) continue;
    const key = [String(r[1]).trim(), String(r[0]).trim(), String(r[5]).trim(), String(r[11]).trim()].join('|');
    const ts = parseDDMMYYYYHHmm_(String(r[7] || ''));
    const prev = seen[key];
    if (prev && ts && prev.ts && Math.abs(ts.getTime() - prev.ts.getTime()) <= 5 * 60 * 1000) {
      if (String(r[8] || '').toLowerCase().trim() === 'pending') dupRows.push(i + 2);
      continue;   // ยึดใบแรกเป็นหลัก ไม่เลื่อน anchor
    }
    seen[key] = { ts: ts, row: i + 2 };
  }
  dupRows.forEach(rw => {
    sh.getRange(rw, 9).setValue('cancelled');
    sh.getRange(rw, 10).setValue('ระบบ: คำขอซ้ำ');
    sh.getRange(rw, 11).setValue(new Date());
  });
  const msg = 'ยกเลิกคำขอซ้ำ ' + dupRows.length + ' แถว' + (dupRows.length ? ' (แถว ' + dupRows.join(', ') + ')' : '');
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'ล้างคำขอซ้ำ', 10); } catch (e) {}
  return msg;
}

function actionSubmitLeave(p, user) {
  const empId = String(p.empId || user.empId);
  if (empId !== user.empId && !isSupervisor(user)) {
    return jsonOut({ ok:false, error:'ไม่มีสิทธิ์ยื่นลาแทนคนอื่น' });
  }
  const target = findUserByEmpId(empId);
  if (!target) return jsonOut({ ok:false, error:'ไม่พบพนักงาน' });
  const sh = getOrCreateTab(T.LEAVE);
  const id = 'LV' + Date.now();
  sh.appendRow([
    id, new Date(),
    empId, cleanName_(target.name),
    p.type || '', p.typeLabel || '',
    p.startDate || '', p.endDate || p.startDate || '',
    parseFloat(p.hours) || 8, p.unit || 'full_day',
    p.reason || '', p.attachment || '',
    'pending', '', '', '', user.email,
  ]);
  return jsonOut({ ok:true, msg:'ยื่นคำขอลาแล้ว', id });
}

/* v5.0: การลาApp เก็บ typeLabel ภาษาไทย — แปลงกลับเป็นโค้ดให้แอปกรองประเภทได้ */
function leaveCodeFromLabel_(lb) {
  lb = String(lb || '');
  if (lb.indexOf('เปลี่ยนวันหยุด') >= 0) return 'change_offday';
  if (lb.indexOf('แก้เวลา') >= 0) return 'time_adjust';
  if (lb.indexOf('ฝึกอบรม') >= 0 || lb.indexOf('อบรม') >= 0) return 'training';   // v6.4
  if (lb.indexOf('คลอด') >= 0) return lb.indexOf('ไม่รับ') >= 0 ? 'maternity_unpaid' : 'maternity_paid';
  if (lb.indexOf('พักร้อน') >= 0) return 'vacation';
  if (lb.indexOf('ไม่มีใบ') >= 0) return 'sick_no_cert';
  if (lb.indexOf('ป่วย') >= 0) return 'sick_with_cert';
  if (lb.indexOf('เพิ่มชั่วโมง') >= 0) return 'extra_hours';
  if (lb.indexOf('OT') >= 0 || lb.indexOf('ล่วงเวลา') >= 0) return lb.indexOf('หยุด') >= 0 ? 'ot_holiday' : 'ot_normal';
  if (lb.indexOf('ไม่รับค่าจ้าง') >= 0) return 'unpaid_personal';
  if (lb.indexOf('กิจ') >= 0) return 'personal';
  return lb || 'other';
}

function actionGetMyLeaves(p, user) {
  const empId = String(p.empId || user.empId);
  if (!canSeeUser(user, empId)) return jsonOut({ ok:false, error:'ไม่มีสิทธิ์' });
  // v5.0: อ่านจาก "การลาApp" ที่เดียว (source of truth) — HR ลบ/แก้/อนุมัติในชีทแล้วแอปเห็นตรงกันทันที
  // (เดิมอ่านแท็บ log ภายในที่เขียนคู่ตอนยื่น — ลบในชีทแล้วรายการค้างในแอป และสถานะอนุมัติไม่อัปเดต)
  const la = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName('การลาApp');
  if (la && leaveSheetIsNew_(la)) {
    const data = la.getDataRange().getValues();
    const out = [];
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[1] || '').trim() !== empId) continue;
      out.push({
        id: 'LA' + (i + 1), submittedAt: r[7],
        empId: empId, name: r[2],
        type: leaveCodeFromLabel_(r[5]), typeLabel: r[5],
        startDate: formatDate(r[0]), endDate: formatDate(r[13]),
        hours: r[12], unit: '',
        reason: r[11], attachment: r[14] || '',
        status: r[8], approver: r[9],
        approvedAt: r[10], approveNote: '',
      });
    }
    out.reverse();   // ใหม่สุดก่อน
    return jsonOut({ ok:true, leaves: out });
  }
  // ยังไม่ migrate — อ่านแท็บ log เดิมตามเดิม
  const sh = getOrCreateTab(T.LEAVE);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) !== empId) continue;
    out.push(leaveRowToObj(data[i]));
  }
  return jsonOut({ ok:true, leaves: out });
}

function leaveRowToObj(r) {
  return {
    id: r[0], submittedAt: r[1],
    empId: String(r[2]), name: r[3],
    type: r[4], typeLabel: r[5],
    startDate: r[6], endDate: r[7],
    hours: r[8], unit: r[9],
    reason: r[10], attachment: r[11],
    status: r[12], approver: r[13],
    approvedAt: r[14], approveNote: r[15],
  };
}

function getApprovedLeaveForDate(empId, dateStr) {
  const sh = getTab(T.LEAVE);
  if (!sh) return null;
  const data = sh.getDataRange().getValues();
  const target = parseDDMMYYYY(dateStr) || new Date(dateStr);
  if (!target || isNaN(target.getTime())) return null;
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[2]) !== String(empId)) continue;
    if (String(r[12]).toLowerCase() !== 'approved') continue;
    const sd = r[6] instanceof Date ? r[6] : (parseDDMMYYYY(r[6]) || new Date(r[6]));
    const ed = r[7] instanceof Date ? r[7] : (parseDDMMYYYY(r[7]) || new Date(r[7]));
    if (!sd || isNaN(sd.getTime())) continue;
    const sdN = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
    const edN = ed && !isNaN(ed.getTime()) ? new Date(ed.getFullYear(), ed.getMonth(), ed.getDate()) : sdN;
    const tN  = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    if (tN >= sdN && tN <= edN) {
      return { type: r[4], typeLabel: r[5], hours: r[8] };
    }
  }
  return null;
}

/* ==================== โควต้าลา ====================
   v5.3: ค่าอัตโนมัติตามอายุงาน (ค่าตั้งต้นกลาง) — HR ปรับรายคนได้ที่แท็บ "โควต้าลา" */
function autoQuotaByTenure_(sd, now) {
  const probationEnd = new Date(sd); probationEnd.setMonth(probationEnd.getMonth() + 3);
  const oneYear      = new Date(sd); oneYear.setFullYear(oneYear.getFullYear() + 1);
  if (now < probationEnd) {
    return { stage:'probation', stageLabel:'ทดลองงาน (0-3 เดือนแรก)',
             personal:0, sickWithCert:0, sickNoCert:0, vacation:0, unpaidPersonal:3, training:null };
  }
  if (now < oneYear) {
    return { stage:'passed', stageLabel:'ผ่านงาน (ยังไม่ครบ 1 ปี)',
             personal:3, sickWithCert:30, sickNoCert:12, vacation:0, unpaidPersonal:null, training:null };
  }
  return { stage:'fullYear', stageLabel:'ครบ 1 ปีขึ้นไป',
           personal:6, sickWithCert:30, sickNoCert:12, vacation:6, unpaidPersonal:null, training:null };
}

/* v5.3: อ่านโควต้าที่ HR กรอกเองจากแท็บ "โควต้าลา"
   เว้นว่าง = ใช้ค่าอัตโนมัติ · ตัวเลข = ใช้ตัวเลขนั้น · "ไม่จำกัด"/"-" = ไม่จำกัด */
const LQ_TAB = 'โควต้าลา';        // v5.4: ชื่อ QUOTA_TAB ถูกใช้แล้วโดยโควต้ากะ (บรรทัด ~3475)
const LQ_COLS = [   // ลำดับคอลัมน์ F..K ในแท็บ
  { key:'personal',       head:'ลากิจ' },
  { key:'sickWithCert',   head:'ลาป่วย (มีใบ)' },
  { key:'sickNoCert',     head:'ลาป่วย (ไม่มีใบ)' },
  { key:'vacation',       head:'ลาพักร้อน' },
  { key:'unpaidPersonal', head:'ลากิจไม่รับค่าจ้าง' },
  { key:'maternity',      head:'ลาคลอด' },
  { key:'training',       head:'ลาฝึกอบรม' },   // v6.4
];
/* v6.3: อ่านคอลัมน์โควต้าตาม "ชื่อหัวคอลัมน์" ไม่ใช่ตำแหน่ง
   — HR จัดเรียง/เพิ่มคอลัมน์เองได้ (เช่นแยก ลาคลอด กับ ลาคลอดไม่รับค่าจ้าง, เพิ่ม ลาฝึกอบรม)
   — เดิมอ่านตายตัว F..K พอ HR สลับคอลัมน์ ตัวเลขเข้าผิดประเภททั้งแถว */
function lqHeaderMap_(head) {
  const map = {};
  (head || []).forEach((h, i) => {
    if (i < 5) return;                                   // A–E = ข้อมูลอ้างอิง ไม่ใช่ช่องกรอก
    const s = String(h || '').replace(/\s+/g, '');
    if (!s || /หมายเหตุ/.test(s)) return;
    if (/ฝึกอบรม|อบรม/.test(s)) map[i] = 'training';      // v6.4: ลาเพื่อฝึกอบรม/พัฒนาความรู้
    else if (/คลอด/.test(s))   map[i] = 'maternity';     // ลาคลอด + ลาคลอดไม่รับค่าจ้าง = รวมเป็นเพดานเดียว
    else if (/ป่วย/.test(s))   map[i] = /ไม่มีใบ|ไม่มีบ|ไม่มี/.test(s) ? 'sickNoCert' : 'sickWithCert';
    else if (/พักร้อน/.test(s)) map[i] = 'vacation';
    else if (/กิจ/.test(s))    map[i] = /ไม่รับค่าจ้าง|ไม่จ่าย/.test(s) ? 'unpaidPersonal' : 'personal';
    // คอลัมน์อื่นที่ระบบยังไม่รองรับ (เช่น ลาฝึกอบรม/ลาบวช) — ข้ามไป ไม่กระทบของเดิม
  });
  return map;
}
let _quotaOverrideCache = null;
function quotaOverrideMap_() {
  if (_quotaOverrideCache) return _quotaOverrideCache;
  const m = {};
  try {
    const sh = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName(LQ_TAB);
    if (sh) {
      const data = sh.getDataRange().getValues();
      const hmap = lqHeaderMap_(data[0] || []);
      const cols = Object.keys(hmap);
      for (let i = 1; i < data.length; i++) {
        const id = String(data[i][0] || '').trim();
        if (!id) continue;
        const acc = {};                                   // key → [ค่าที่กรอกไว้] (null = ไม่จำกัด)
        const push = (key, raw) => {
          const s = String(raw == null ? '' : raw).trim();
          if (s === '') return;                           // เว้นว่าง = ใช้ค่าอัตโนมัติ
          if (/ไม่จำกัด|^-$|^∞$/.test(s)) { (acc[key] = acc[key] || []).push(null); return; }
          const n = parseFloat(s.replace(/,/g, ''));
          if (!isNaN(n)) (acc[key] = acc[key] || []).push(n);
        };
        if (cols.length) cols.forEach(idx => push(hmap[idx], data[i][idx]));
        else LQ_COLS.forEach((c, j) => push(c.key, data[i][5 + j]));   // สำรอง: หัวตารางอ่านไม่ออก → ใช้ตำแหน่งเดิม
        const o = {};
        Object.keys(acc).forEach(k => {
          const arr = acc[k];
          o[k] = arr.some(v => v === null) ? null : arr.reduce((a, b) => a + b, 0);   // หลายคอลัมน์ประเภทเดียวกัน = รวมกัน
        });
        if (Object.keys(o).length) m[id] = o;
      }
    }
  } catch (e) { console.error('quotaOverrideMap_', e); }
  _quotaOverrideCache = m;
  return m;
}

/* ── v7.0: แท็บ "ใช้ก่อนใช้แอป" — วันลาที่ใช้ไปแล้วก่อนย้ายมาใช้แอป (จาก HumanSoft/กระดาษ) ──
   เดิมยัด "ยอดคงเหลือ" ลงช่องเพดานในแท็บโควต้าลา → หน้าจอโชว์เพดานเพี้ยน
   (พิชชาพร พักร้อนขึ้น 2/1 ทั้งที่จริงคือ 6 ใช้ไป 5) — แยกออกมาเป็นแท็บนี้แทน
   เพดาน = สิทธิเต็มจริง · ใช้ไป = (แท็บนี้) + (ใบลาที่อนุมัติในแอป) · คงเหลือ = เพดาน − ใช้ไป */
const CARRY_TAB = 'ใช้ก่อนใช้แอป';
let _carryCache = null;
function carriedUsedMap_() {
  if (_carryCache) return _carryCache;
  const m = {};
  try {
    const sh = getTab(CARRY_TAB);
    if (sh && sh.getLastRow() > 1) {
      const data = sh.getDataRange().getValues();
      const hmap = lqHeaderMap_(data[0] || []);
      for (let i = 1; i < data.length; i++) {
        const id = String(data[i][0] || '').trim();
        if (!id) continue;
        const o = {};
        Object.keys(hmap).forEach(idx => {
          const n = parseFloat(String(data[i][idx] == null ? '' : data[i][idx]).replace(/,/g, ''));
          if (!isNaN(n) && n) o[hmap[idx]] = (o[hmap[idx]] || 0) + n;
        });
        if (Object.keys(o).length) m[id] = o;
      }
    }
  } catch (e) {}
  _carryCache = m;
  return m;
}
/* สร้างแท็บ (หัวคอลัมน์เหมือนแท็บโควต้าลา เพื่อให้ HR อ่านคู่กันง่าย) — รันซ้ำได้ ไม่ทับค่าที่กรอก */
function setupCarryOver() {
  const ss = getSS();
  const lq = ss.getSheetByName(LQ_TAB);
  if (!lq || lq.getLastRow() < 2) throw new Error('ไม่พบแท็บ "' + LQ_TAB + '" — รัน setupLeaveQuota ก่อน');
  const lqHead = lq.getRange(1, 1, 1, Math.max(lq.getLastColumn(), 6)).getValues()[0];
  let sh = ss.getSheetByName(CARRY_TAB);
  if (!sh) {
    sh = ss.insertSheet(CARRY_TAB);
    sh.getRange(1, 1, 1, lqHead.length).setValues([lqHead])
      .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidth(2, 190); sh.setColumnWidth(5, 300);
    try { sh.getRange(1, 5).setValue('หมายเหตุ (ยอดที่ใช้ไปก่อนย้ายมาใช้แอป)'); } catch (e) {}
  }
  // เติมรายชื่อจากแท็บโควต้าลาให้ครบ (ไม่ทับค่าที่กรอกไว้)
  const have = {};
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .forEach(r => { const id = String(r[0] || '').trim(); if (id) have[id] = true; });
  const src = lq.getRange(2, 1, lq.getLastRow() - 1, 2).getValues();
  const add = src.filter(r => String(r[0] || '').trim() && !have[String(r[0]).trim()])
                 .map(r => [String(r[0]).trim(), String(r[1] || '')]);
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 2).setValues(add);
  const msg = 'แท็บ "' + CARRY_TAB + '" พร้อมใช้ · เพิ่มรายชื่อใหม่ ' + add.length + ' คน';
  Logger.log(msg);
  try { ss.toast(msg, CARRY_TAB, 8); } catch (e) {}
  return msg;
}

/* v6.3: วันเริ่มงานที่ HR พิมพ์เองในแท็บโควต้าลา (คอลัมน์ D)
   — ใช้เมื่อชีท Users/ทะเบียน PTT ไม่มีวันเริ่มงาน (เดิมคนกลุ่มนี้ไม่มีโควต้าเลย) */
let _lqStartCache = null;
function lqStartDateMap_() {
  if (_lqStartCache) return _lqStartCache;
  const m = {};
  try {
    const sh = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName(LQ_TAB);
    if (sh && sh.getLastRow() > 1) {
      const d = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
      d.forEach(r => {
        const id = String(r[0] || '').trim();
        if (!id || !r[3]) return;
        const sd = (r[3] instanceof Date) ? r[3] : parseDDMMYYYY(String(r[3]).trim());
        if (sd && !isNaN(sd.getTime())) m[id] = sd;
      });
    }
  } catch (e) {}
  _lqStartCache = m;
  return m;
}

/* v5.1: แกนคำนวณโควต้า — คืน null ถ้าหาวันเริ่มงานไม่ได้ (ใช้ทั้งหน้าโควต้าและด่านตอนยื่นลา)
   วันเริ่มงาน: RATTANA จากชีท Users · PTT จากทะเบียน PTT (คอลัมน์ "เข้า") */
function leaveQuotaFor_(empId) {
  const target = findUserByEmpId(empId);
  let sd = null, startSource = 'Users';
  if (target && target.startDate) {
    const d0 = (target.startDate instanceof Date) ? target.startDate : new Date(target.startDate);
    if (d0 && !isNaN(d0.getTime())) sd = d0;
  }
  if (!sd) {
    const pt = pttMap_()[String(empId).trim()];
    if (pt && pt.startDate) {
      const d1 = parseDDMMYYYY(pt.startDate);
      if (d1) { sd = d1; startSource = 'ทะเบียน PTT'; }
    }
  }
  if (!sd) {
    // v6.3: HR พิมพ์วันเริ่มงานเองในแท็บโควต้าลา (คอลัมน์ D) — กันเคสไม่มีวันเริ่มงานแล้วโควต้าไม่ทำงานทั้งคน
    const d2 = lqStartDateMap_()[String(empId).trim()];
    if (d2) { sd = d2; startSource = 'แท็บโควต้าลา'; }
  }
  if (!sd) return null;

  const now = new Date();
  const probationEnd = new Date(sd); probationEnd.setMonth(probationEnd.getMonth() + 3);
  const oneYear      = new Date(sd); oneYear.setFullYear(oneYear.getFullYear() + 1);

  const quota = autoQuotaByTenure_(sd, now);

  let cycleStart;
  if (now < probationEnd)      cycleStart = sd;
  else if (now < oneYear)      cycleStart = sd;
  else {
    cycleStart = new Date(sd);
    while (true) {
      const next = new Date(cycleStart); next.setFullYear(next.getFullYear() + 1);
      if (next > now) break;
      cycleStart = next;
    }
  }
  const used = countUsedLeave(empId, cycleStart, now);
  // v7.0: บวกวันลาที่ใช้ไปก่อนย้ายมาใช้แอป (แท็บ "ใช้ก่อนใช้แอป") — ทำให้ยอด "ใช้ไป" ตรงกับ HumanSoft
  const carried = carriedUsedMap_()[String(empId).trim()] || {};
  Object.keys(carried).forEach(k => { if (used[k] !== undefined) used[k] += (parseFloat(carried[k]) || 0); });
  quota.maternity = 98;   // v5.1: ลาคลอดตามกฎหมาย 98 วัน (ทุกช่วงอายุงาน)

  // v5.3: ทับด้วยค่าที่ HR กรอกเองในแท็บ "โควต้าลา" (เฉพาะช่องที่กรอก)
  const ov = quotaOverrideMap_()[String(empId).trim()];
  let overridden = [];
  if (ov) {
    Object.keys(ov).forEach(k => {
      if (quota[k] !== ov[k]) overridden.push(k);
      quota[k] = ov[k];
    });
    if (overridden.length) quota.stageLabel += ' · HR ปรับโควต้าเอง';
  }

  return {
    startDate: sd, startSource: startSource, probationEnd, oneYear, overridden,
    cycleStart, cycleEnd: new Date(cycleStart.getFullYear()+1, cycleStart.getMonth(), cycleStart.getDate()),
    quota, used,
    // v5.3: null = ไม่จำกัด (ทุกประเภทตั้งเป็นไม่จำกัดได้ ถ้า HR กรอก "ไม่จำกัด")
    remaining: {
      personal:        quotaRemain_(quota.personal,       used.personal),
      sickWithCert:    quotaRemain_(quota.sickWithCert,   used.sickWithCert),
      sickNoCert:      quotaRemain_(quota.sickNoCert,     used.sickNoCert),
      vacation:        quotaRemain_(quota.vacation,       used.vacation),
      unpaidPersonal:  quotaRemain_(quota.unpaidPersonal, used.unpaidPersonal),
      maternity:       quotaRemain_(quota.maternity,      used.maternity),
      training:        quotaRemain_(quota.training,       used.training),   // v6.4
    },
  };
}

/* v5.3: ตัวติดตั้งแท็บ "โควต้าลา" ให้ HR กรอกเอง — รันจาก editor (ไม่ต้อง Deploy)
   รันซ้ำได้ปลอดภัย: ค่าที่ HR กรอกไว้ไม่หาย · เติมพนักงานใหม่ · รีเฟรชคอลัมน์ข้อมูล/ค่าอ้างอิง */
function setupLeaveQuota() {
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
  let sh = ss.getSheetByName(LQ_TAB);
  const HEAD = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'คลัง', 'วันเริ่มงาน', 'โควต้าอัตโนมัติ (อ้างอิง)']
    .concat(LQ_COLS.map(c => c.head)).concat(['หมายเหตุ']);
  const NCOL = HEAD.length;   // 12
  if (!sh) sh = ss.insertSheet(LQ_TAB);

  // ── รวบรวมพนักงานที่ยังทำงานอยู่ (RATTANA จากชีท Users + PTT จากทะเบียน) ──
  const now = new Date();
  const people = {};
  try {
    usersData_().slice(1).forEach(r => {
      if (String(r[U_COL.status] || '').trim().toLowerCase() !== 'active') return;
      const id = String(r[U_COL.empId] || '').trim(); if (!id) return;
      people[id] = { id: id, name: cleanName_(r[U_COL.name]), start: r[U_COL.startDate] };
    });
  } catch (e) {}
  const pm = pttMap_();
  Object.keys(pm).forEach(id => {
    if (people[id]) return;
    people[id] = { id: id, name: pm[id].name, start: pm[id].startDate, khlang: pm[id].khlang };
  });

  const infoOf = (p) => {
    const sd = (p.start instanceof Date) ? p.start : parseDDMMYYYY(String(p.start || '').trim());
    let ref = '— ไม่มีวันเริ่มงาน —';
    if (sd && !isNaN(sd.getTime())) {
      const q = autoQuotaByTenure_(sd, now);
      const nz = (v) => v == null ? 'ไม่จำกัด' : v;
      ref = q.stageLabel + ' · กิจ ' + nz(q.personal) + ' · ป่วย ' + nz(q.sickWithCert) + '/' + nz(q.sickNoCert) +
            ' · พักร้อน ' + nz(q.vacation) + ' · กิจไม่รับค่าจ้าง ' + nz(q.unpaidPersonal) + ' · คลอด 98 · ฝึกอบรม ' + nz(q.training);
    }
    return [p.name || '', khlangOf_(p.id) || p.khlang || '', sd ? formatDate(sd) : '', ref];
  };

  // ── มีแท็บอยู่แล้ว: รีเฟรชข้อมูล + เติมคนใหม่ (ไม่แตะค่าที่กรอก) ──
  const existing = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  const seen = {};
  existing.forEach((r, i) => {
    const id = String(r[0] || '').trim();
    if (!id) return;
    seen[id] = true;
    if (!people[id]) return;
    const info = infoOf(people[id]);
    // v6.3: ระบบไม่มีวันเริ่มงาน แต่ HR พิมพ์ไว้เองในคอลัมน์ D → เก็บของ HR ไว้ + คิดโควต้าอ้างอิงจากวันนั้น
    if (!info[2]) {
      const cur = sh.getRange(i + 2, 4).getValue();
      const sdM = (cur instanceof Date) ? cur : parseDDMMYYYY(String(cur || '').trim());
      if (sdM && !isNaN(sdM.getTime())) {
        info[2] = formatDate(sdM);
        info[3] = infoOf({ id: id, name: people[id].name, start: sdM })[3] + ' · วันเริ่มงานจากแท็บนี้';
      }
    }
    sh.getRange(i + 2, 2, 1, 4).setValues([info]);
  });

  // v6.3: ★ ไม่เขียนทับหัวคอลัมน์ที่มีอยู่แล้ว — HR จัดเรียง/เพิ่มคอลัมน์เองไว้ (โค้ดอ่านตามชื่อหัว)
  //        เขียนหัวเฉพาะตอนแท็บยังว่าง (สร้างใหม่ครั้งแรก) เท่านั้น
  const wide    = Math.max(NCOL, sh.getLastColumn());
  const headRow = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, wide).getValues()[0] : [];
  const hasHead = headRow.some(h => String(h || '').trim() !== '');
  if (!hasHead) {
    sh.getRange(1, 1, 1, NCOL).setValues([HEAD])
      .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  }
  sh.setFrozenRows(1);

  const width = hasHead ? wide : NCOL;
  const add = Object.keys(people).filter(id => !seen[id]).sort()
    .map(id => {
      const row = [id].concat(infoOf(people[id]));           // A–E
      while (row.length < width) row.push('');               // ที่เหลือเว้นว่าง = ใช้โควต้าอัตโนมัติ
      return row;
    });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, width).setValues(add);

  // ── หน้าตา + คำอธิบาย (ระบายเฉพาะคอลัมน์โควต้าที่ระบบอ่านออกจากหัวจริง) ──
  const qCols = Object.keys(hasHead ? lqHeaderMap_(headRow) : lqHeaderMap_(HEAD)).map(Number);
  const lastR = Math.max(1, sh.getLastRow() - 1);
  qCols.forEach(ci => {
    sh.getRange(1, ci + 1, sh.getMaxRows(), 1).setHorizontalAlignment('center');
    sh.getRange(2, ci + 1, lastR, 1).setBackground('#fff8e1')
      .setNote('เว้นว่าง = ใช้โควต้าอัตโนมัติตามอายุงาน\nใส่ตัวเลข = ใช้ตัวเลขนี้แทน (เช่น พักร้อนยกยอด ใส่ยอดรวม)\nใส่ "ไม่จำกัด" = ไม่จำกัดจำนวนวัน');
  });
  sh.setColumnWidth(2, 190); sh.setColumnWidth(5, 430);
  try { sh.autoResizeColumns(1, 1); } catch (e) {}
  ss.setActiveSheet(sh);
  Logger.log('✅ แท็บ "' + LQ_TAB + '" พร้อมใช้ · พนักงานทั้งหมด ' + Object.keys(people).length +
             ' คน (เพิ่มใหม่รอบนี้ ' + add.length + ') — กรอกเฉพาะช่องสีเหลืองของคนที่ต้องการปรับ');
}

/* v6.4: ปรับลาคลอดในแท็บโควต้าลาให้รวมกันได้ 98 วันตามกฎหมาย (รันครั้งเดียวจาก editor)
   คอลัมน์ "ลาคลอด" (รับค่าจ้าง) คงไว้ตามที่ HR กรอก · คอลัมน์ "ลาคลอดไม่รับค่าจ้าง" ปรับให้ผลรวม = 98
   แถวที่ยังไม่ได้กรอกลาคลอด = ไม่แตะ (ใช้ค่าอัตโนมัติ 98 อยู่แล้ว) */
function fixMaternityQuota98() {
  const sh = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName(LQ_TAB);
  if (!sh || sh.getLastRow() < 2) throw new Error('ไม่พบแท็บ "' + LQ_TAB + '"');
  const lastC = Math.max(sh.getLastColumn(), 6);
  const head  = sh.getRange(1, 1, 1, lastC).getValues()[0];
  const hmap  = lqHeaderMap_(head);
  const matCols = Object.keys(hmap).filter(i => hmap[i] === 'maternity').map(Number);
  if (!matCols.length) throw new Error('ไม่พบคอลัมน์ลาคลอดในแท็บนี้');
  // คอลัมน์ "ไม่รับค่าจ้าง" = ตัวปรับยอด · ถ้ามีคอลัมน์เดียวก็ปรับคอลัมน์นั้นเป็น 98
  const unpaidCol = matCols.find(i => /ไม่รับค่าจ้าง|ไม่จ่าย/.test(String(head[i]).replace(/\s+/g, '')));
  const adjCol = (unpaidCol != null) ? unpaidCol : matCols[0];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, lastC).getValues();
  let changed = 0;
  rows.forEach((r, i) => {
    const vals = matCols.map(c => String(r[c] == null ? '' : r[c]).trim());
    if (vals.every(v => v === '')) return;                          // ยังไม่กรอก = ปล่อยใช้อัตโนมัติ 98
    if (vals.some(v => /ไม่จำกัด|^-$|^∞$/.test(v))) return;          // ตั้งไม่จำกัดไว้ = เคารพค่าเดิม
    const others = matCols.filter(c => c !== adjCol)
      .reduce((s, c) => s + (parseFloat(String(r[c]).replace(/,/g, '')) || 0), 0);
    const need = 98 - others;
    if (need < 0) return;                                            // กรอกเกิน 98 ในช่องอื่นแล้ว — ไม่แตะ ให้ HR ดูเอง
    const cur = parseFloat(String(r[adjCol]).replace(/,/g, ''));
    if (cur === need) return;
    sh.getRange(i + 2, adjCol + 1).setValue(need);
    changed++;
  });
  const msg = 'ปรับลาคลอดให้รวม 98 วัน · แก้ไป ' + changed + ' แถว (คอลัมน์ "' + head[adjCol] + '")';
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'ลาคลอด 98 วัน', 8); } catch (e) {}
  return msg;
}

/* v6.5: ตัวตรวจโควต้า — รันจาก editor แล้วได้แท็บ "ตรวจโควต้า" เทียบรายคน
   โควต้า(เพดาน) / ใช้ไปแล้ว(นับจากใบที่อนุมัติในแอป) / คงเหลือ / ที่มาของเพดาน
   ใช้ตรวจว่า "ตัดโควต้าตรงจริง" · แถวที่ยังไม่มีการใช้และไม่ได้ตั้งค่าเอง จะไม่แสดง (ลดความรก) */
function auditLeaveQuota() {
  const ss = getSS();
  const src = ss.getSheetByName(LQ_TAB);
  if (!src || src.getLastRow() < 2) throw new Error('ไม่พบแท็บ "' + LQ_TAB + '"');
  const ids = src.getRange(2, 1, src.getLastRow() - 1, 2).getValues();
  const ovr = quotaOverrideMap_();
  const TYPES = [
    ['personal', 'ลากิจ'], ['unpaidPersonal', 'ลากิจไม่รับค่าจ้าง'],
    ['sickWithCert', 'ลาป่วย (มีใบ)'], ['sickNoCert', 'ลาป่วย (ไม่มีใบ)'],
    ['vacation', 'ลาพักร้อน'], ['maternity', 'ลาคลอด'], ['training', 'ลาฝึกอบรม'],
  ];
  const out = [];
  ids.forEach(row => {
    const id = String(row[0] || '').trim();
    if (!id) return;
    let q = null;
    try { q = leaveQuotaFor_(id); } catch (e) {}
    if (!q) { out.push([id, String(row[1] || ''), '— ไม่มีวันเริ่มงาน —']); return; }
    const o = ovr[id] || {};
    const carry = carriedUsedMap_()[id] || {};   // v7.0: วันที่ใช้ก่อนย้ายมาใช้แอป
    const cyc = formatDate(q.cycleStart) + ' – ' + formatDate(q.cycleEnd);
    TYPES.forEach(([k, label]) => {
      const used = Math.round((q.used[k] || 0) * 100) / 100;
      const cap  = q.quota[k];
      const rem  = q.remaining[k];
      if (!used && !(k in o)) return;                      // ไม่เคยใช้ + ไม่ได้ตั้งเอง = ไม่ต้องโชว์
      const before = Math.round(((carry[k] || 0)) * 100) / 100;      // v7.0: ใช้ก่อนย้ายมาใช้แอป
      out.push([id, String(row[1] || ''), (q.quota.stageLabel || ''), cyc, label,
                cap == null ? 'ไม่จำกัด' : cap, before || '', Math.round((used - before) * 100) / 100, used,
                rem == null ? 'ไม่จำกัด' : Math.round(rem * 100) / 100,
                (k in o) ? 'กรอกในชีท' : 'อัตโนมัติตามอายุงาน']);
    });
  });
  const HEAD = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'ช่วงอายุงาน', 'รอบโควต้า', 'ประเภทลา',
                'โควต้า (เพดาน)', 'ใช้ก่อนใช้แอป', 'ใช้ในแอป', 'ใช้ไปรวม', 'คงเหลือ', 'ที่มาของเพดาน'];
  let sh = ss.getSheetByName('ตรวจโควต้า');
  if (!sh) sh = ss.insertSheet('ตรวจโควต้า');
  sh.clear();
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD])
    .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (out.length) sh.getRange(2, 1, out.length, HEAD.length).setValues(out.map(r => {
    while (r.length < HEAD.length) r.push('');
    return r;
  }));
  sh.setColumnWidth(2, 190); sh.setColumnWidth(3, 190); sh.setColumnWidth(4, 190); sh.setColumnWidth(5, 150);
  ss.setActiveSheet(sh);
  const msg = 'ตรวจโควต้าเสร็จ · ' + out.length + ' รายการ (เฉพาะคนที่มีการใช้ หรือ HR ตั้งค่าเอง)';
  Logger.log(msg);
  try { ss.toast(msg, 'ตรวจโควต้า', 10); } catch (e) {}
  return msg;
}

/* ── v7.0: นำเข้าจากรายงาน HumanSoft "โควตาการลาประจำปี 2026" (ข้อมูล ณ 26/08/2026) ──
   เขียน 2 ที่: แท็บโควต้าลา = "สิทธิเต็ม" · แท็บใช้ก่อนใช้แอป = "วันที่ใช้ไปแล้วแต่ไม่ได้อยู่ในแอป"
   (= ที่ HumanSoft นับ − ที่แอปนับได้เอง) → หน้าจอโชว์ เพดาน/ใช้ไป/คงเหลือ ตรงกับ HumanSoft ทุกช่อง
   ► รัน importQuotaHumanSoft2026() · รันซ้ำได้ ค่าถูกตั้งใหม่จากรายงานเดิมทุกครั้ง */
const HS_QUOTA_2026 = [
  // [รหัส, กิจ:สิทธิ,ใช้, กิจไม่รับ:สิทธิ,ใช้, ป่วยมีใบ:สิทธิ,ใช้, ป่วยไม่มีใบ:สิทธิ,ใช้,
  //        คลอด:สิทธิ,ใช้, พักร้อน:สิทธิ,ใช้, ฝึกอบรม:สิทธิ,ใช้]   ('' = HumanSoft ไม่ได้ตั้งโควต้า → ไม่เขียนทับ)
  ['11202', 6,0, '',0, 30,17, '',0, 98,0, 6,2.5, 30,0],  // จิรวรรณ พวงแก้ว
  ['11203', 6,0, '',0, 30,0, '',0, 98,0, 6,3, 30,0],  // รวิวรรณ เสือประดิษฐ์
  ['11304', 6,0, '',0, 30,0, '',0, 0,0, 6,3, 30,0],  // สงัด หนอคำ
  ['11310', 6,0, '',0, 30,0, '',0, 0,0, 6,4, 30,0],  // เทอดศักดิ์ หลำเจริญ
  ['11346', 6,0, '',0, 30,0, '',0, 0,0, 6,3, 30,0],  // สมพงษ์ จันทรมณี
  ['11373', 6,0, '',0, 30,0, '',0, 0,0, 6,3, 30,0],  // ปราเมศ มาหา
  ['12011', 6,1, '',0, 30,0, '',0, 98,0, 6,6, 30,0],  // ดุจเดือน จิ๋วโคราช
  ['12023', 6,1, '',0, 30,0, '',0, 98,0, 6,5, 30,0],  // พิชชาพร ภู่สกุล
  ['12024', 6,0, '',0, 30,0, '',0, 98,0, 6,4, 30,0],  // พิมพ์ชนก พราหมณ์รักษา
  ['13026', 6,0, '',0, 30,1, '',0, 98,0, 6,3, 30,0],  // วาสนา หลุยใจบุญ
  ['13100', 6,0, '',0, 30,0, '',0, 98,0, 6,4, 30,0],  // ฤทัยวัล สังข์โกมล
  ['13111', 6,0, '',0, 30,1, '',0, 98,0, 6,4, 30,0],  // ปาริชาติ วิริยะพันธ์
  ['13116', 6,0, '',0, 30,0, '',0, 98,0, 6,3, 30,0],  // นีรชา คงแก้ว
  ['650008', 6,0, '',0, 30,0, '',0, 98,0, 6,1.75, 30,0],  // อรวรรณ อยู่กำเนิด
  ['650020', 6,0, '',0, 30,2, '',0, 98,0, 6,3.75, 30,0],  // ศิวณา สวัสดิ์วงษ์
  ['650022', 6,0, '',0, 30,0, '',0, 98,0, 6,4, 30,0],  // ฐิตารีย์ หนูเปีย
  ['650029', 6,0, '',0, 30,0, '',0, 0,0, 6,4, 30,0],  // เอกลักษณ์ แซ่ทั้ม
  ['650080', 6,0, '',0, 30,2, '',0, 98,0, 6,4, 30,0],  // ภัสสร เสือเจริญ
  ['65131', 6,0, '',0, 30,0, '',0, 98,0, 6,4, 30,0],  // CHIT SNOW OO
  ['660023', 6,0, '',0, 30,0, '',0, 98,0, 6,3, 30,0],  // ระพี สัมพันธารักษ์
  ['660034', 6,0, '',0, 30,0, '',0, 0,0, 6,3, 30,0],  // ปกรณ์ พิมเกิด
  ['660044', 6,0, '',0, 30,0, '',0, 98,0, 6,3, 30,0],  // นภัสสร เสาวสาร
  ['660057', 6,0, '',0, 30,0, '',0, 98,0, 6,5, 30,0],  // สมพร ไชยเขตต์
  ['660058', 6,0, '',0, 30,0, '',0, 98,0, 6,4, 30,0],  // สุธิดา เฮงนิรันดร์
  ['660067', 6,0, '',0, 30,0, '',0, 98,0, 6,6, 30,0],  // วลัย สกุลแพทย์
  ['660071', 6,0, '',0, 30,0, '',0, 98,0, 6,5, 30,0],  // กชกร รักสนอง
  ['660073', 6,0, '',0, 30,0, '',0, 98,0, 6,5, 30,0],  // กัญญารัตน์ สัมพันธารักษ์
  ['660084', 6,0, '',0, 30,0, '',0, 0,0, 6,4, 30,0],  // ภูฉาย บุญพุ่ม
  ['670003', '',0, '',0, 30,0, '',0, 98,0, 6,5, 30,0],  // ภคพร นาคอนุเคราะห์
  ['670026', 6,0, '',0, 30,0, '',0, 98,0, 6,3, 30,0],  // สุดารัตน์ กิจจามาตรกุล
  ['670030', '',0, '',0, 30,0, '',0, 98,0, 6,3, 30,0],  // ทิพวัลย์ เสือสมิง
  ['680009', 6,2, '',0, '',0, '',0, 98,8.95, 4,3, '',0],  // อนุสรา ขันทอง
  ['680012', '',0, 3,1, '',0, '',0, 0,0, '',0, '',0],  // ทรงพร จอมผา
  ['680016', '',0, '',0, '',0, '',0, 0,0, 4,1, '',0],  // อำพร ฉันทพจน์
  ['680021', '',0, '',0, '',0, '',0, 98,0, '',0, '',0],  // อรุณทิพย์ รอดสุธา
  ['690015', '',0, '',0, '',0, '',0, 0,0, '',0, 3,1],  // อารีรัฐ เสือเจริญ
  ['690027', '',0, 6,0, '',0, '',0, 0,0, '',0, '',0],  // สายจิต เจนกล้า
];
const HS_KEYS = ['personal', 'unpaidPersonal', 'sickWithCert', 'sickNoCert', 'maternity', 'vacation', 'training'];
function importQuotaHumanSoft2026() {
  const ss = getSS();
  const lq = ss.getSheetByName(LQ_TAB);
  if (!lq || lq.getLastRow() < 2) throw new Error('ไม่พบแท็บ "' + LQ_TAB + '" — รัน setupLeaveQuota ก่อน');
  setupCarryOver();                     // สร้าง/เติมรายชื่อแท็บ "ใช้ก่อนใช้แอป" ให้ครบก่อน
  _carryCache = null; _quotaOverrideCache = null;
  const cy = ss.getSheetByName(CARRY_TAB);

  const colsOf = (sh) => {
    const head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 6)).getValues()[0];
    const hmap = lqHeaderMap_(head);
    const mat  = Object.keys(hmap).filter(i => hmap[i] === 'maternity').map(Number);
    const c = { matPaid: null, matUnpaid: null };
    HS_KEYS.forEach(k => { if (k !== 'maternity') c[k] = null; });
    Object.keys(hmap).forEach(i => { const k = hmap[i]; if (k !== 'maternity' && c[k] === null) c[k] = Number(i); });
    c.matUnpaid = mat.find(i => /ไม่รับค่าจ้าง|ไม่จ่าย/.test(String(head[i]).replace(/\s+/g, '')));
    c.matPaid   = mat.find(i => i !== c.matUnpaid);
    c.matAll    = mat;
    return c;
  };
  const cQ = colsOf(lq), cC = colsOf(cy);
  const rowsOf = (sh) => {
    const o = {};
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
      .forEach((r, i) => { const id = String(r[0] || '').trim(); if (id) o[id] = i + 2; });
    return o;
  };
  const rQ = rowsOf(lq), rC = rowsOf(cy);
  const rnd = v => Math.round(v * 100) / 100;

  let done = 0; const missing = [];
  HS_QUOTA_2026.forEach(d => {
    const id = String(d[0]).trim();
    if (!rQ[id]) { missing.push(id); return; }
    // วันลาที่ "แอปนับได้เอง" ในรอบปีนี้ — ต้องหักออก ไม่งั้นนับซ้ำกับที่ HumanSoft นับไว้
    let app = {};
    try { const qq = leaveQuotaFor_(id); if (qq && qq.used) app = qq.used; } catch (e) {}
    const carriedBefore = carriedUsedMap_()[id] || {};
    HS_KEYS.forEach((key, n) => {
      const cap = d[1 + n * 2], usedHS = parseFloat(d[2 + n * 2]) || 0;
      // แอปนับได้เท่าไหร่ (หักส่วนที่มาจากแท็บใช้ก่อนใช้แอปรอบก่อนออก กันบวกซ้ำตอนรันซ้ำ)
      const appOnly = Math.max(0, (parseFloat(app[key]) || 0) - (parseFloat(carriedBefore[key]) || 0));
      const before  = rnd(Math.max(0, usedHS - appOnly));
      if (key === 'maternity') {
        if (cap !== '' && cap > 0) {
          const paid = Math.min(45, cap), unpaid = rnd(cap - paid);
          if (cQ.matPaid != null && cQ.matUnpaid != null) {
            lq.getRange(rQ[id], cQ.matPaid + 1).setValue(paid);
            lq.getRange(rQ[id], cQ.matUnpaid + 1).setValue(unpaid);
          } else if (cQ.matAll.length === 1) lq.getRange(rQ[id], cQ.matAll[0] + 1).setValue(cap);
        } else if (cQ.matPaid != null && cQ.matUnpaid != null) {
          lq.getRange(rQ[id], cQ.matPaid + 1).setValue(0);
          lq.getRange(rQ[id], cQ.matUnpaid + 1).setValue(0);
        }
        if (rC[id] && cC.matPaid != null) lq.getRange(1, 1);   // no-op guard
        if (rC[id]) {
          const cc = (cC.matPaid != null) ? cC.matPaid : (cC.matAll.length ? cC.matAll[0] : null);
          if (cc != null) cy.getRange(rC[id], cc + 1).setValue(before || '');
          if (cC.matUnpaid != null) cy.getRange(rC[id], cC.matUnpaid + 1).setValue('');
        }
        return;
      }
      if (cap !== '' && cQ[key] != null) lq.getRange(rQ[id], cQ[key] + 1).setValue(cap);
      if (rC[id] && cC[key] != null) cy.getRange(rC[id], cC[key] + 1).setValue(before || '');
    });
    done++;
  });
  _carryCache = null; _quotaOverrideCache = null;
  const msg = 'นำเข้าโควต้า HumanSoft 2026 · สำเร็จ ' + done + ' คน (เขียนสิทธิเต็มในแท็บโควต้าลา + วันที่ใช้ก่อนใช้แอปในแท็บ "' +
              CARRY_TAB + '")' + (missing.length ? ' · ไม่พบรหัส: ' + missing.join(', ') : '');
  Logger.log(msg);
  try { ss.toast(msg, 'นำเข้าโควต้า', 12); } catch (e) {}
  return msg;
}

function quotaRemain_(q, u) {
  if (q == null) return null;                       // ไม่จำกัด
  return Math.max(0, (parseFloat(q) || 0) - (parseFloat(u) || 0));
}

function actionGetLeaveQuota(p, user) {
  const empId = String(p.empId || user.empId);
  if (!canSeeUser(user, empId)) return jsonOut({ ok:false, error:'ไม่มีสิทธิ์' });
  const q = leaveQuotaFor_(empId);
  if (!q) return jsonOut({ ok:false, error:'ไม่พบวันเริ่มงาน (ชีท Users / ทะเบียน PTT) — แจ้ง HR' });
  return jsonOut(Object.assign({ ok:true }, q));
}

/* v6.5: อ่านชีทการลาApp ครั้งเดียวต่อการรัน — เดิมทุกครั้งที่คิดโควต้าเปิดชีทใหม่ (ตัวตรวจ 100 คน = เปิด 100 รอบ) */
let _leaveRowsCache = null;
function leaveRowsAll_() {
  if (_leaveRowsCache) return _leaveRowsCache;
  const la = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName('การลาApp');
  _leaveRowsCache = (la && leaveSheetIsNew_(la)) ? la.getDataRange().getValues() : [];
  return _leaveRowsCache;
}
/* ── v7.3: กติกาหักโควต้า (surat เคาะ 27/08) ──────────────────────────
   ลาไม่เต็มวัน: ไม่เกิน 4 ชม. = หัก 0.5 วัน · เกิน 4 ชม. = หัก 1 วัน
   (เช่น 08:00–10:00 = 0.5 · 08:00–15:00 = 1) · ลาหลายวัน = นับตามจำนวนวันจริง
   หมายเหตุ: คอลัมน์ M ในชีทยังเก็บ "ชั่วโมงจริง" ตามเดิม (สรุปวันใช้คิดลาบางส่วน) */
function leaveQuotaDays_(hours, startDate, endDate) {
  const h = parseFloat(hours) || 0;
  if (h <= 0) return 0;
  let days = 1;
  try {
    const sd = (startDate instanceof Date) ? startDate : parseDDMMYYYY(formatDate(startDate));
    const ed = (endDate instanceof Date)   ? endDate   : parseDDMMYYYY(formatDate(endDate || startDate));
    if (sd && ed && !isNaN(sd.getTime()) && !isNaN(ed.getTime())) {
      days = Math.max(1, Math.round((ed - sd) / 86400000) + 1);
    }
  } catch (e) {}
  if (days > 1) return days;              // ลาข้ามวัน = นับเป็นวันเต็มตามจำนวนวัน
  return h <= 4 ? 0.5 : 1;                // ลาวันเดียว = ครึ่งวัน หรือ เต็มวัน
}

function countUsedLeave(empId, from, to) {
  const c = { personal:0, sickWithCert:0, sickNoCert:0, vacation:0, unpaidPersonal:0, maternity:0, training:0 };
  // v5.0: นับจาก การลาApp — approveAny อนุมัติที่ชีทนี้ (แท็บ log เดิมสถานะค้าง pending ตลอด
  // ทำให้หน้าโควต้าเคยนับวันลาที่ใช้ไปได้ 0 เสมอ)
  if (leaveRowsAll_().length) {
    const data = leaveRowsAll_();
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[1] || '').trim() !== String(empId)) continue;
      if (String(r[8] || '').toLowerCase() !== 'approved') continue;
      const sd = r[0] instanceof Date ? r[0] : parseDDMMYYYY(formatDate(r[0]));
      if (!sd || isNaN(sd.getTime())) continue;
      if (sd < from || sd > to) continue;
      const days = leaveQuotaDays_(r[12], r[0], r[13]);   // v7.3: ≤4 ชม.=0.5 · >4 ชม.=1 · หลายวัน=ตามวัน
      const t = leaveCodeFromLabel_(r[5]);
      if (t === 'personal') c.personal += days;
      else if (t === 'sick_with_cert') c.sickWithCert += days;
      else if (t === 'sick_no_cert')   c.sickNoCert += days;
      else if (t === 'vacation')       c.vacation += days;
      else if (t === 'unpaid_personal') c.unpaidPersonal += days;
      else if (t === 'maternity_paid' || t === 'maternity_unpaid') c.maternity += days;   // v5.1
      else if (t === 'training')       c.training += days;   // v6.4
    }
    return c;
  }
  const sh = getTab(T.LEAVE);
  if (!sh) return c;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[2]) !== String(empId)) continue;
    if (String(r[12]).toLowerCase() !== 'approved') continue;
    const sd = r[6] instanceof Date ? r[6] : (parseDDMMYYYY(r[6]) || new Date(r[6]));
    if (!sd || isNaN(sd.getTime())) continue;
    if (sd < from || sd > to) continue;
    const hours = parseFloat(r[8]) || 0;
    const days = leaveQuotaDays_(hours, r[6], r[7]);   // v7.5: กติกาเดียวกับชีทใหม่ (ขั้นบันได 0.5/1)
    const t = String(r[4] || '');
    if (t === 'personal') c.personal += days;
    else if (t === 'sick_with_cert' || t === 'sick_cert') c.sickWithCert += days;
    else if (t === 'sick' || t === 'sick_no_cert')        c.sickNoCert += days;
    else if (t === 'vacation')                            c.vacation += days;
    else if (t === 'unpaid_personal' || t === 'unpaid')   c.unpaidPersonal += days;
    else if (t === 'maternity_paid' || t === 'maternity_unpaid') c.maternity += days;   // v5.1
  }
  return c;
}

/* ============================================================
   TIME ADJUST
   ============================================================ */

function actionSubmitTimeAdjust(p, user) {
  const empId = String(p.empId || user.empId);
  if (empId !== user.empId && !isSupervisor(user)) {
    return jsonOut({ ok:false, error:'ไม่มีสิทธิ์' });
  }
  const target = findUserByEmpId(empId);
  const sh = getOrCreateTab(T.TADJ);
  const id = 'TA' + Date.now();
  sh.appendRow([
    id, new Date(), empId, target ? cleanName_(target.name) : '',
    p.date || '', p.type || '', p.correctTime || '',
    p.branch || '', p.reason || '',
    'pending', '', '', '', user.email,
  ]);
  return jsonOut({ ok:true, msg:'ยื่นคำขอแก้เวลาแล้ว', id });
}

function actionGetMyTimeAdjusts(p, user) {
  const empId = String(p.empId || user.empId);
  if (!canSeeUser(user, empId)) return jsonOut({ ok:false, error:'ไม่มีสิทธิ์' });
  const sh = getOrCreateTab(T.TADJ);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) !== empId) continue;
    out.push({
      id: data[i][0], submittedAt: data[i][1],
      empId: String(data[i][2]), name: data[i][3],
      date: data[i][4], type: data[i][5], correctTime: data[i][6],
      branch: data[i][7], reason: data[i][8],
      status: data[i][9], approver: data[i][10], approvedAt: data[i][11], approveNote: data[i][12],
    });
  }
  return jsonOut({ ok:true, items: out });
}

/* ============================================================
   WARNING
   ============================================================ */

function actionSubmitWarning(p, user) {
  if (!isSupervisor(user)) return jsonOut({ ok:false, error:'เฉพาะหัวหน้า/HR' });
  if (!canSeeUser(user, p.empId)) return jsonOut({ ok:false, error:'นอกขอบเขตทีม' });
  const target = findUserByEmpId(p.empId);
  if (!target) return jsonOut({ ok:false, error:'ไม่พบพนักงาน' });
  const sh = getOrCreateTab(T.WARN);
  const id = 'WN' + Date.now();
  sh.appendRow([
    id, new Date(), String(p.empId), cleanName_(target.name),
    p.level || 'verbal', p.category || 'other', p.detail || '',
    p.incidentDate || '', cleanName_(user.name), 'issued',
  ]);
  return jsonOut({ ok:true, msg:'บันทึกใบเตือนแล้ว', id });
}

function actionGetMyWarnings(p, user) {
  const empId = String(p.empId || user.empId);
  if (!canSeeUser(user, empId)) return jsonOut({ ok:false, error:'ไม่มีสิทธิ์' });
  const sh = getOrCreateTab(T.WARN);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) !== empId) continue;
    out.push({
      id: data[i][0], issuedAt: data[i][1], empId: String(data[i][2]), name: data[i][3],
      level: data[i][4], category: data[i][5], detail: data[i][6],
      incidentDate: data[i][7], issuedBy: data[i][8], status: data[i][9],
    });
  }
  return jsonOut({ ok:true, items: out });
}

/* ============================================================
   APPROVALS (supervisor)
   ============================================================ */

function actionGetApprovals(user) {
  if (!isSupervisor(user)) return jsonOut({ ok:false, error:'เฉพาะหัวหน้า/HR' });
  const leaves = [];
  const tadj = [];

  const lSh = getTab(T.LEAVE);
  if (lSh) {
    const data = lSh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[12]).toLowerCase() !== 'pending') continue;
      if (!canSeeUser(user, r[2])) continue;
      leaves.push(leaveRowToObj(r));
    }
  }
  const tSh = getTab(T.TADJ);
  if (tSh) {
    const data = tSh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[9]).toLowerCase() !== 'pending') continue;
      if (!canSeeUser(user, r[2])) continue;
      tadj.push({
        id: r[0], submittedAt: r[1], empId: String(r[2]), name: r[3],
        date: r[4], type: r[5], correctTime: r[6], branch: r[7], reason: r[8],
        status: r[9],
      });
    }
  }
  return jsonOut({ ok:true, leaves, timeAdjusts: tadj });
}

function actionApproveRequest(p, user) {
  if (!isSupervisor(user)) return jsonOut({ ok:false, error:'เฉพาะหัวหน้า/HR' });
  const tab = (p.kind === 'leave') ? T.LEAVE : T.TADJ;
  const statusCol = (p.kind === 'leave') ? 12 : 9;
  const approverCol = statusCol + 1;
  const approvedAtCol = statusCol + 2;
  const noteCol = statusCol + 3;

  const sh = getTab(tab);
  if (!sh) return jsonOut({ ok:false, error:'ไม่พบ tab ' + tab });
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      if (!canSeeUser(user, data[i][2])) return jsonOut({ ok:false, error:'นอกขอบเขตทีม' });
      sh.getRange(i + 1, statusCol + 1).setValue(p.decision || 'approved');
      sh.getRange(i + 1, approverCol + 1).setValue(user.empId + ' ' + user.name);
      sh.getRange(i + 1, approvedAtCol + 1).setValue(new Date());
      sh.getRange(i + 1, noteCol + 1).setValue(p.note || '');

      if (p.kind === 'leave' && (p.decision || 'approved').toLowerCase() === 'approved') {
        recomputeAttendanceRange(data[i][2], data[i][6], data[i][7]);
      }
      if (p.kind === 'timeadjust' && (p.decision || 'approved').toLowerCase() === 'approved') {
        applyTimeAdjust(data[i]);
      }
      return jsonOut({ ok:true });
    }
  }
  return jsonOut({ ok:false, error:'ไม่พบ id ' + p.id });
}

function recomputeAttendanceRange(empId, sd, ed) {
  const start = sd instanceof Date ? sd : (parseDDMMYYYY(sd) || new Date(sd));
  const end   = ed instanceof Date ? ed : (parseDDMMYYYY(ed) || new Date(ed));
  if (!start || !end) return;
  const sh = getTab(T.ATT);
  if (!sh) return;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][ATT_COL.empId]) !== String(empId)) continue;
    const d = parseDDMMYYYY(formatDate(data[i][ATT_COL.date]));
    if (!d) continue;
    if (d >= start && d <= end) {
      const row = data[i].slice();
      recomputeRow(row, formatDate(data[i][ATT_COL.date]), empId);
      sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
    }
  }
}

function applyTimeAdjust(taRow) {
  if (!WRITE_ATT_SHEET) return;   // v3.3: เลิกเขียน ลงเวลาApp — TimeAdjustLog ยังบันทึกคำขอครบเหมือนเดิม
  const empId   = String(taRow[2]);
  const name    = taRow[3];
  const dateStr = formatDate(taRow[4]);
  const type    = taRow[5];
  const time    = taRow[6];
  const branch  = taRow[7];
  upsertAttendance({
    empId, name, dateStr, timeStr: time, type, branch, bu: '',
    note: 'แก้เวลาย้อนหลัง (อนุมัติ)',
  });
}

/* ============================================================
   INCOMPLETE PAIRS
   ============================================================ */

function actionGetIncompletePairs(p, user) {
  const days = parseInt(p.days, 10) || 14;
  const scope = p.scope || 'self';
  const sh = getTab(T.ATT);
  if (!sh) return jsonOut({ ok:true, pairs: [] });
  const data = sh.getDataRange().getValues();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days); cutoff.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);

  const out = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const empId = String(r[ATT_COL.empId]);
    if (scope === 'self' && empId !== user.empId) continue;
    if (scope === 'team' && !canSeeUser(user, empId)) continue;

    const dateStr = formatDate(r[ATT_COL.date]);
    const d = parseDDMMYYYY(dateStr);
    if (!d || d < cutoff || d >= today) continue;

    const status = String(r[ATT_COL.status] || '');
    if (status === 'วันอาทิตย์' || status === 'วันนักขัตฯ' || status.startsWith('ลา')) continue;

    const hasIn  = !!r[ATT_COL.firstIn];
    const hasOut = !!r[ATT_COL.lastOut];
    if (hasIn && !hasOut) {
      out.push({ empId, name: r[ATT_COL.name], date: dateStr, missing: 'OUT', firstIn: r[ATT_COL.firstIn], branch: r[ATT_COL.branch] });
    } else if (!hasIn && hasOut) {
      out.push({ empId, name: r[ATT_COL.name], date: dateStr, missing: 'IN',  lastOut: r[ATT_COL.lastOut], branch: r[ATT_COL.branch] });
    }
  }
  out.sort((a, b) => (parseDDMMYYYY(b.date) - parseDDMMYYYY(a.date)));
  return jsonOut({ ok:true, pairs: out });
}

/* ============================================================
   LOCATIONS / SETTINGS / HOLIDAYS
   ============================================================ */

function actionGetLocations(user) {
  const sh = getOrCreateTab(T.LOC);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    out.push({
      code: String(data[i][0]), name: String(data[i][1]),
      lat: parseFloat(data[i][2]) || 0, lng: parseFloat(data[i][3]) || 0,
      radius: parseFloat(data[i][4]) || 50,
      active: String(data[i][5] || 'Y').toUpperCase() !== 'N',
      qr: String(data[i][6] || '').trim() !== '',   // v5.5: จุดนี้มี QR ประจำจุดแล้ว (ส่งแค่ธง — ไม่ส่ง secret)
    });
  }
  return jsonOut({ ok:true, locations: out });
}

/* ==================== v5.5: QR ประจำจุดสแกน ====================
   หลักฐานสำรองเมื่อระบบใบหน้าไม่พร้อม: HR พิมพ์ QR ไปติดแต่ละจุด
   QR = "RTQR|<code>|<secret>" · secret เก็บใน Locations คอลัมน์ G เท่านั้น (ไม่ออกไปกับ getLocations) */
function setupLocationQR() {
  const sh = getOrCreateTab(T.LOC);
  const data = sh.getDataRange().getValues();
  sh.getRange(1, 7).setValue('QR Secret').setFontWeight('bold');
  const rnd = () => {
    const CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 12; i++) s += CH.charAt(Math.floor(Math.random() * CH.length));
    return s;
  };
  let made = 0;
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    if (String(data[i][6] || '').trim() !== '') continue;   // มีแล้ว — ไม่ทับ (QR ที่พิมพ์ไปแล้วยังใช้ได้)
    sh.getRange(i + 1, 7).setValue(rnd());
    made++;
  }
  Logger.log('✅ QR Secret พร้อม (สร้างใหม่ ' + made + ' จุด) — พิมพ์ QR ได้ที่แอป: ตั้งค่า → พิมพ์ QR ประจำจุดสแกน');
}

/* HR/ผู้จัดการ ดึงข้อมูลไปพิมพ์ QR (ต้องผ่านสิทธิ์ — secret ไม่หลุดถึงพนักงานทั่วไป) */
function getLocationQR(p, user) {
  if (!isHR(user) && !isManager(user)) return { ok:false, error:'เฉพาะผู้จัดการ/HR' };
  const sh = getTab(T.LOC);
  if (!sh) return { ok:true, rows: [] };
  const data = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    const token = String(data[i][6] || '').trim();
    if (!token) continue;
    rows.push({ code: String(data[i][0]), name: String(data[i][1] || ''), token: token });
  }
  return { ok:true, rows };
}

function actionSaveLocation(p, user) {
  if (!isManager(user)) return jsonOut({ ok:false, error:'เฉพาะผู้จัดการ/HR' });
  const sh = getOrCreateTab(T.LOC);
  const data = sh.getDataRange().getValues();
  const row = [String(p.code), p.name, p.lat, p.lng, p.radius || 50, p.active === false ? 'N' : 'Y'];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.code)) {
      sh.getRange(i + 1, 1, 1, 6).setValues([row]);
      return jsonOut({ ok:true });
    }
  }
  sh.appendRow(row);
  return jsonOut({ ok:true });
}

function actionDeleteLocation(p, user) {
  if (!isManager(user)) return jsonOut({ ok:false, error:'เฉพาะผู้จัดการ/HR' });
  const sh = getTab(T.LOC);
  if (!sh) return jsonOut({ ok:true });
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.code)) { sh.deleteRow(i + 1); return jsonOut({ ok:true }); }
  }
  return jsonOut({ ok:true });
}

function actionGetPersonalLocations(p, user) {
  const sh = getOrCreateTab(T.PLOC);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    if (p.empId && String(data[i][0]) !== String(p.empId)) continue;
    if (!p.empId && !canSeeUser(user, data[i][0])) continue;
    out.push({
      empId: String(data[i][0]), name: String(data[i][1]),
      locName: String(data[i][2]),
      lat: parseFloat(data[i][3]) || 0, lng: parseFloat(data[i][4]) || 0,
      radius: parseFloat(data[i][5]) || 50, note: String(data[i][6] || ''),
    });
  }
  return jsonOut({ ok:true, personalLocations: out });
}

function actionSavePersonalLocation(p, user) {
  if (!isManager(user) && p.empId !== user.empId) return jsonOut({ ok:false, error:'ไม่มีสิทธิ์' });
  const sh = getOrCreateTab(T.PLOC);
  sh.appendRow([
    String(p.empId), p.name || '', p.locName || '',
    p.lat || 0, p.lng || 0, p.radius || 50, p.note || '',
  ]);
  return jsonOut({ ok:true });
}

function actionGetSettings(user) {
  const sh = getOrCreateTab(T.SET);
  const data = sh.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) out[String(data[i][0])] = data[i][1];
  }
  return jsonOut({ ok:true, settings: out });
}

function actionSaveSettings(p, user) {
  if (!isHR(user)) return jsonOut({ ok:false, error:'เฉพาะ HR' });
  const sh = getOrCreateTab(T.SET);
  const data = sh.getDataRange().getValues();
  const updates = p.settings || {};
  Object.keys(updates).forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sh.getRange(i + 1, 2).setValue(updates[key]);
        found = true; break;
      }
    }
    if (!found) sh.appendRow([key, updates[key], '']);
  });
  return jsonOut({ ok:true });
}

function actionGetHolidays(user) {
  const sh = getOrCreateTab(T.HOL);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    out.push({ date: formatDate(data[i][0]), name: String(data[i][1] || ''), type: String(data[i][2] || '') });
  }
  return jsonOut({ ok:true, holidays: out });
}

/* v7.6: ตรวจแท็บ Holidays ว่าใช้งานได้จริง (รันจาก editor)
   สูตรในสรุปวันใช้ VLOOKUP(INT(วันที่), Holidays!A:B, 2) → คอลัมน์ A ต้องเป็น "วันที่จริง" ไม่ใช่ข้อความ
   ถ้าเป็นข้อความ ระบบจะหาไม่เจอเงียบๆ = วันหยุดไม่ถูกนำไปคิดเลย */
/* ── v7.8: ตรวจสแกนซ้ำใน CheckinLog (รันจาก editor) ────────────────────
   ซ้ำ = คนเดียวกัน ชนิดเดียวกัน (เข้า/ออก) ห่างกันไม่เกิน 2 นาที
   รายงานลง แท็บ "ตรวจสแกนซ้ำ" พร้อม clientId ของแต่ละแถว เพื่อชี้ว่าเกิดจากอะไร:
     · clientId เหมือนกัน  → ตัวกันซ้ำฝั่งเซิร์ฟเวอร์ไม่ทำงาน (บั๊กระบบ)
     · clientId ต่างกัน    → แอปส่งคนละครั้ง (กดซ้ำ/หลายเครื่อง/แอปเวอร์ชันเก่า)
     · ไม่มี clientId       → แถวเก่าก่อนมีระบบกันซ้ำ หรือมาจากทางอื่น (kiosk/ย้อนหลัง)  */
function auditDuplicateScans(daysBack) {
  const ss = getSS();
  const sh = getTab(T.LOG);
  if (!sh || sh.getLastRow() < 2) throw new Error('ไม่พบข้อมูลใน ' + T.LOG);
  const back = parseInt(daysBack, 10) || 60;
  const since = new Date(Date.now() - back * 86400000);
  const last = sh.getLastRow();
  const data = sh.getRange(2, 1, last - 1, 17).getValues();
  const rows = [];
  data.forEach((r, i) => {
    const t = (r[0] instanceof Date) ? r[0] : new Date(r[0]);
    if (!t || isNaN(t.getTime()) || t < since) return;
    rows.push({ row: i + 2, ts: t, empId: String(r[1] || '').trim(), name: String(r[2] || ''),
                date: String(r[3] || ''), time: String(r[4] || ''),
                type: String(r[5] || '').toLowerCase() === 'out' ? 'out' : 'in',
                by: String(r[11] || ''), retro: String(r[12] || ''), cid: String(r[16] || '') });
  });
  rows.sort((a, b) => a.empId.localeCompare(b.empId) || a.ts - b.ts);
  const out = [];
  let dupRows = 0, sameCid = 0, diffCid = 0, noCid = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (a.empId !== b.empId || a.type !== b.type) continue;
    if (Math.abs(b.ts - a.ts) > 2 * 60 * 1000) continue;
    dupRows++;
    let cause;
    if (!a.cid || !b.cid) { cause = 'ไม่มี clientId (แถวเก่า/ทางอื่น)'; noCid++; }
    else if (a.cid === b.cid) { cause = '⚠ clientId เหมือนกัน — ตัวกันซ้ำไม่ทำงาน'; sameCid++; }
    else { cause = 'clientId ต่างกัน — ส่งมาคนละครั้ง'; diffCid++; }
    out.push([b.empId, b.name, b.date, a.time + ' / ' + b.time, b.type === 'in' ? 'เข้า' : 'ออก',
              'แถว ' + a.row + ' , ' + b.row, a.cid || '(ว่าง)', b.cid || '(ว่าง)',
              (b.by || '') + (b.retro ? ' · ย้อนหลัง' : ''), cause]);
  }
  const HEAD = ['รหัสพนักงาน', 'ชื่อ', 'วันที่', 'เวลา (คู่ที่ซ้ำ)', 'ชนิด', 'แถวในชีท',
                'clientId แถวแรก', 'clientId แถวซ้ำ', 'ช่องทาง', 'สาเหตุ'];
  let rp = ss.getSheetByName('ตรวจสแกนซ้ำ');
  if (!rp) rp = ss.insertSheet('ตรวจสแกนซ้ำ');
  rp.clear();
  rp.getRange(1, 1, 1, HEAD.length).setValues([HEAD])
    .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
  rp.setFrozenRows(1);
  if (out.length) rp.getRange(2, 1, out.length, HEAD.length).setValues(out);
  rp.setColumnWidth(2, 170); rp.setColumnWidth(7, 150); rp.setColumnWidth(8, 150); rp.setColumnWidth(10, 260);
  ss.setActiveSheet(rp);
  const msg = 'ตรวจย้อนหลัง ' + back + ' วัน · พบสแกนซ้ำ ' + dupRows + ' คู่ · ' +
              'clientId เหมือนกัน ' + sameCid + ' (บั๊กระบบ) · ต่างกัน ' + diffCid + ' (ส่งคนละครั้ง) · ไม่มี clientId ' + noCid;
  Logger.log(msg);
  try { ss.toast(msg, 'ตรวจสแกนซ้ำ', 15); } catch (e) {}
  return msg;
}

/* v7.9: ล้างแถวสแกนซ้ำใน CheckinLog — เก็บแถวแรกของแต่ละคู่ ลบแถวที่ซ้ำ
   นิยามซ้ำ = คนเดียวกัน ชนิดเดียวกัน ห่างกันไม่เกิน 2 นาที (เหมือน auditDuplicateScans)
   ► รัน auditDuplicateScans() ดูก่อนเสมอ · ค่าเริ่มต้นเป็นโหมด "ดูเฉยๆ" ไม่ลบจริง
   ► ลบจริงต้องเรียก cleanDuplicateScans(60, true)  (ลบจากล่างขึ้นบน เลขแถวจึงไม่เลื่อน) */
function cleanDuplicateScans(daysBack, apply) {
  const sh = getTab(T.LOG);
  if (!sh || sh.getLastRow() < 2) throw new Error('ไม่พบข้อมูลใน ' + T.LOG);
  const back = parseInt(daysBack, 10) || 60;
  const since = new Date(Date.now() - back * 86400000);
  const last = sh.getLastRow();
  const data = sh.getRange(2, 1, last - 1, 17).getValues();
  const rows = [];
  data.forEach((r, i) => {
    const t = (r[0] instanceof Date) ? r[0] : new Date(r[0]);
    if (!t || isNaN(t.getTime()) || t < since) return;
    rows.push({ row: i + 2, ts: t, empId: String(r[1] || '').trim(),
                type: String(r[5] || '').toLowerCase() === 'out' ? 'out' : 'in',
                photo: String(r[14] || '').trim() });
  });
  rows.sort((a, b) => a.empId.localeCompare(b.empId) || a.ts - b.ts || a.row - b.row);
  const del = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (a.empId !== b.empId || a.type !== b.type) continue;
    if (Math.abs(b.ts - a.ts) > 2 * 60 * 1000) continue;
    // เก็บแถวที่ "มีรูป" ไว้ก่อน — ถ้าแถวแรกไม่มีรูปแต่แถวซ้ำมี ให้ลบแถวแรกแทน
    del.push((!a.photo && b.photo) ? a.row : b.row);
  }
  const uniq = [...new Set(del)].sort((x, y) => y - x);   // ลบจากล่างขึ้นบน
  // v8.0: ลบเป็นก้อน (แถวติดกันรวบเป็นครั้งเดียว) — 730 แถวเรียกทีละแถวช้าและเสี่ยงหมดเวลา 6 นาที
  if (apply === true) {
    let i = 0;
    while (i < uniq.length) {
      let j = i;
      while (j + 1 < uniq.length && uniq[j + 1] === uniq[j] - 1) j++;   // uniq เรียงมาก→น้อย
      const start = uniq[j], count = j - i + 1;
      sh.deleteRows(start, count);
      i = j + 1;
    }
  }
  const msg = (apply === true ? '🧹 ลบแถวซ้ำแล้ว ' : '🔎 โหมดดูเฉยๆ — พบแถวที่จะลบ ') + uniq.length + ' แถว' +
              ' (ย้อนหลัง ' + back + ' วัน)' + (apply === true ? '' : ' · ลบจริงให้รัน cleanDuplicateScans(60, true)');
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'ล้างสแกนซ้ำ', 15); } catch (e) {}
  return msg;
}

/* ── v8.1: ตรวจสุขภาพระบบรวบยอด (รันจาก editor ครั้งเดียว เห็นครบทุกจุด) ──
   ใช้ยืนยันว่า "รันครบแล้วจริงมั้ย" หลังตั้งค่า/ล้างข้อมูล — ไม่แก้ไขอะไรทั้งสิ้น อ่านอย่างเดียว */
function systemHealthCheck() {
  const ss = getSS();
  const L = [];
  const tab = n => ss.getSheetByName(n);
  const rowsOf = n => { const s = tab(n); return s ? Math.max(0, s.getLastRow() - 1) : -1; };
  const ok = (c, t) => (c ? '✅ ' : '⚠ ') + t;

  L.push('── ระบบลงเวลา Rattana · ตรวจสุขภาพ ──');

  // 1) สแกนซ้ำใน CheckinLog (60 วัน)
  try {
    const sh = tab(T.LOG);
    const last = sh ? sh.getLastRow() : 0;
    let dup = 0, scanned = 0;
    if (last > 1) {
      const since = new Date(Date.now() - 60 * 86400000);
      const d = sh.getRange(2, 1, last - 1, 6).getValues();
      const rows = [];
      d.forEach(r => {
        const t = (r[0] instanceof Date) ? r[0] : new Date(r[0]);
        if (!t || isNaN(t.getTime()) || t < since) return;
        rows.push({ ts: t, empId: String(r[1] || '').trim(), type: String(r[5] || '').toLowerCase() === 'out' ? 'out' : 'in' });
      });
      scanned = rows.length;
      rows.sort((a, b) => a.empId.localeCompare(b.empId) || a.ts - b.ts);
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1], b = rows[i];
        if (a.empId === b.empId && a.type === b.type && Math.abs(b.ts - a.ts) <= 120000) dup++;
      }
    }
    L.push(ok(dup === 0, 'สแกนซ้ำ 60 วัน: ' + dup + ' คู่ (จาก ' + scanned + ' แถว) · ทั้งชีท ' + (last - 1) + ' แถว'));
  } catch (e) { L.push('⚠ ตรวจ CheckinLog ไม่ได้: ' + e.message); }

  // 2) แท็บ Holidays — ต้องเป็นวันที่จริง
  try {
    const sh = tab(T.HOL);
    if (!sh || sh.getLastRow() < 2) L.push('⚠ Holidays: ยังไม่มีข้อมูล');
    else {
      const d = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      const dates = d.filter(r => r[0] instanceof Date).length;
      const texts = d.filter(r => r[0] && !(r[0] instanceof Date)).length;
      L.push(ok(texts === 0 && dates > 0, 'Holidays: ' + dates + ' วันที่จริง' + (texts ? ' · ⚠ เป็นข้อความ ' + texts + ' (รัน fixHolidayDates)' : '')));
    }
  } catch (e) { L.push('⚠ ตรวจ Holidays ไม่ได้: ' + e.message); }

  // 3) สูตรสรุปวัน — รัน setupDailySummary รุ่นใหม่หรือยัง (ดูจากคำว่า "ทำงานวันหยุด" ในสูตร F4)
  try {
    const sh = tab('สรุปวัน');
    const f = sh ? String(sh.getRange('F4').getFormula() || '') : '';
    const isNew = f.indexOf('ทำงานวันหยุด') >= 0;
    L.push(ok(isNew, 'สรุปวัน: ' + (f ? (isNew ? 'ใช้กติกาใหม่ (วันหยุดที่มีสแกน = นับเป็นวันทำงาน)'
        : 'ยังเป็นสูตรเดิม — ต้องรัน setupDailySummary') : 'ไม่พบสูตรในช่อง F4')));
  } catch (e) { L.push('⚠ ตรวจสรุปวันไม่ได้: ' + e.message); }

  // 4) โควต้าลา + ยอดใช้ก่อนใช้แอป + ผู้อนุมัติเฉพาะ
  try {
    const q = rowsOf(LQ_TAB), c = rowsOf(CARRY_TAB), a = rowsOf(APPROVER_TAB);
    const ovr = Object.keys(quotaOverrideMap_()).length;
    L.push(ok(q > 0, 'โควต้าลา: ' + q + ' คน · ตั้งค่าเองแล้ว ' + ovr + ' คน'));
    L.push(ok(c >= 0, 'ใช้ก่อนใช้แอป: ' + (c < 0 ? 'ยังไม่มีแท็บ (รัน importQuotaHumanSoft2026)' : c + ' คน')));
    L.push(ok(a > 0, 'ผู้อนุมัติเฉพาะ: ' + (a < 0 ? 'ยังไม่มีแท็บ' : a + ' รายการ')));
  } catch (e) { L.push('⚠ ตรวจโควต้าไม่ได้: ' + e.message); }

  // 5) การลาApp + ทะเบียนกันคำขอซ้ำ
  try {
    const sh = tab('การลาApp');
    const newLayout = sh ? leaveSheetIsNew_(sh) : false;
    let pend = 0;
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 9, sh.getLastRow() - 1, 1).getValues()
        .forEach(r => { const s = String(r[0] || '').toLowerCase().trim(); if (!s || s === 'pending') pend++; });
    }
    L.push(ok(newLayout, 'การลาApp: ' + (sh ? (sh.getLastRow() - 1) + ' แถว · รออนุมัติ ' + pend : 'ไม่พบ') + (newLayout ? '' : ' · ⚠ ยังเป็นโครงเก่า')));
    const _dt = sh ? sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues().filter(r => r[0] !== '' && r[0] != null && !(r[0] instanceof Date)).length : 0;
    L.push(ok(_dt === 0, 'รูปแบบวันที่การลาApp: ' + (_dt ? _dt + ' ช่องเป็นข้อความ — รัน fixLeaveDatesApply' : 'เป็นวันที่จริงทุกช่อง')));
    L.push('ℹ ทะเบียนกันคำขอซ้ำ (_reqLog): ' + rowsOf('_reqLog') + ' รายการ');
  } catch (e) { L.push('⚠ ตรวจการลาApp ไม่ได้: ' + e.message); }

  const msg = L.join('\n');
  Logger.log(msg);
  try { ss.toast('ตรวจเสร็จ — ดูผลใน "บันทึกการดำเนินการ"', 'ตรวจสุขภาพระบบ', 10); } catch (e) {}
  return msg;
}

function checkHolidays() {
  const sh = getTab(T.HOL);
  if (!sh) return '❌ ไม่พบแท็บ Holidays';
  const last = sh.getLastRow();
  if (last < 2) return '⚠ แท็บ Holidays ยังไม่มีข้อมูล';
  const data = sh.getRange(2, 1, last - 1, 3).getValues();
  let dates = 0, texts = 0, blanks = 0;
  const bad = [];
  data.forEach((r, i) => {
    if (!r[0]) { blanks++; return; }
    if (r[0] instanceof Date) dates++;
    else { texts++; bad.push('แถว ' + (i + 2) + ': "' + r[0] + '"'); }
  });
  const head = sh.getRange(1, 1, 1, 3).getValues()[0].map(h => String(h || '').trim());
  const msg = 'Holidays: ' + (last - 1) + ' แถว · เป็นวันที่จริง ' + dates + ' · เป็นข้อความ ' + texts +
              (blanks ? ' · ว่าง ' + blanks : '') + ' · หัวตาราง [' + head.join(' | ') + ']' +
              (texts ? '\n⚠ ต้องแก้เป็นวันที่จริง ไม่งั้นสูตรสรุปวันหาไม่เจอ → ' + bad.slice(0, 5).join(' , ') : '\n✅ พร้อมใช้งาน');
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg.replace(/\n/g, ' '), 'ตรวจ Holidays', 12); } catch (e) {}
  return msg;
}

/* v7.6: แปลงคอลัมน์ A ในแท็บ Holidays จาก "ข้อความ" เป็น "วันที่จริง" (รันเมื่อ checkHolidays แจ้งว่าเป็นข้อความ) */
function fixHolidayDates() {
  const sh = getTab(T.HOL);
  if (!sh || sh.getLastRow() < 2) throw new Error('ไม่พบข้อมูลในแท็บ Holidays');
  const n = sh.getLastRow() - 1;
  const vals = sh.getRange(2, 1, n, 1).getValues();
  let fixed = 0;
  const out = vals.map(r => {
    const v = r[0];
    if (!v || v instanceof Date) return [v];
    const d = parseDDMMYYYY(String(v).trim());
    if (d) { fixed++; return [d]; }
    return [v];
  });
  sh.getRange(2, 1, n, 1).setValues(out);
  sh.getRange(2, 1, n, 1).setNumberFormat('dd/MM/yyyy');
  const msg = 'แปลงวันที่เป็นรูปแบบวันที่จริงแล้ว ' + fixed + ' แถว';
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Holidays', 8); } catch (e) {}
  return msg;
}

function actionSaveHoliday(p, user) {
  if (!isHR(user)) return jsonOut({ ok:false, error:'เฉพาะ HR' });
  const sh = getOrCreateTab(T.HOL);
  sh.appendRow([p.date, p.name || '', p.type || 'public']);
  return jsonOut({ ok:true });
}

function actionDeleteHoliday(p, user) {
  if (!isHR(user)) return jsonOut({ ok:false, error:'เฉพาะ HR' });
  const sh = getTab(T.HOL);
  if (!sh) return jsonOut({ ok:true });
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (formatDate(data[i][0]) === p.date) { sh.deleteRow(i + 1); return jsonOut({ ok:true }); }
  }
  return jsonOut({ ok:true });
}

function isHoliday(dateStr) {
  const sh = getTab(T.HOL);
  if (!sh) return '';
  const data = sh.getDataRange().getValues();
  const target = parseDDMMYYYY(dateStr);
  if (!target) return '';
  const tStr = formatDate(target);
  for (let i = 1; i < data.length; i++) {
    if (formatDate(data[i][0]) === tStr) return String(data[i][1] || 'วันหยุด');
  }
  return '';
}

/* ============================================================
   READ — Attendance + CheckinLog + Users
   ============================================================ */

function actionGetAttendance(p, user) {
  const sh = getTab(T.ATT);
  if (!sh) return jsonOut({ ok:true, rows: [] });
  const data = sh.getDataRange().getValues();
  const out = [];
  const fromD = p.from ? new Date(p.from) : null;
  const toD   = p.to   ? new Date(p.to)   : null;
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const empId = String(r[ATT_COL.empId]);
    if (!empId) continue;
    if (!canSeeUser(user, empId)) continue;
    if (p.empId && empId !== String(p.empId)) continue;
    const d = parseDDMMYYYY(formatDate(r[ATT_COL.date]));
    if (fromD && d < fromD) continue;
    if (toD && d > toD) continue;
    out.push({
      empId, name: r[ATT_COL.name], date: formatDate(r[ATT_COL.date]),
      in1: r[ATT_COL.in1], out1: r[ATT_COL.out1], in2: r[ATT_COL.in2], out2: r[ATT_COL.out2],
      note: r[ATT_COL.note],
      firstIn: r[ATT_COL.firstIn], lastOut: r[ATT_COL.lastOut],
      status: r[ATT_COL.status], lateMin: r[ATT_COL.lateMin],
      statusLate: r[ATT_COL.statusLate], lateText: r[ATT_COL.lateText],
      branch: r[ATT_COL.branch], bu: r[ATT_COL.bu],
      leaveType: r[ATT_COL.leaveType], leaveHours: r[ATT_COL.leaveHours],
      holiday: r[ATT_COL.holiday], missedTime: r[ATT_COL.missedTime],
    });
  }
  return jsonOut({ ok:true, rows: out });
}

function actionGetCheckinLog(p, user) {
  const sh = getTab(T.LOG);
  if (!sh) return jsonOut({ ok:true, logs: [] });
  const data = sh.getDataRange().getValues();
  const out = [];
  const limit = parseInt(p.limit, 10) || 500;
  for (let i = data.length - 1; i > 0 && out.length < limit; i--) {
    const r = data[i];
    const empId = String(r[1]);
    if (!canSeeUser(user, empId)) continue;
    if (p.empId && empId !== String(p.empId)) continue;
    if (p.date && formatDate(r[3]) !== p.date) continue;
    if (p.month && formatDate(r[3]).slice(3) !== String(p.month)) continue;   // v4.1: 'MM/yyyy' ทั้งเดือน (ปฏิทินแอป)
    out.push({
      timestamp: r[0], empId, name: r[2], date: formatDate(r[3]),
      time: r[4] instanceof Date
            ? Utilities.formatDate(r[4], 'Asia/Bangkok', 'HH:mm:ss')
            : String(r[4] || ''),
      type: r[5], branch: r[6], lat: r[7], lng: r[8], distance: r[9],
      faceDist: r[10], scannedBy: r[11], retroactive: r[12], reason: r[13],
    });
  }
  return jsonOut({ ok:true, logs: out });
}

function actionGetAllUsers(user) {
  if (!isSupervisor(user)) return jsonOut({ ok:false, error:'เฉพาะหัวหน้า/HR' });
  const sh = SpreadsheetApp.openById(CFG.usersSheetId).getSheetByName(CFG.usersTab);
  const data = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[U_COL.status] || '').trim().toLowerCase() !== 'active') continue;
    const empId = String(r[U_COL.empId]);
    if (!canSeeUser(user, empId)) continue;
    out.push({
      empId, name: String(r[U_COL.name]), nickname: String(r[U_COL.nickname]),
      email: String(r[U_COL.email] || '').toLowerCase(),
      role: parseInt(r[U_COL.userRole], 10) || 1,
      branch: String(r[U_COL.branch]),
      department: String(r[U_COL.department]),
      startDate: r[U_COL.startDate],
      supervisorName: String(r[U_COL.supervisorName]),
    });
  }
  return jsonOut({ ok:true, users: out });
}

function getSlipDataPTT(p, user) {
  const empId = p.empId || (user && user.empId);
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('Slip PTT');
    if (!sh) return { ok: false, error: 'ไม่พบ Slip PTT' };
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, rows: [] };

    const matched = data.slice(1).filter(r =>
      String(r[4]).trim() === String(empId).trim()
    );

    const rows = matched.map(r => ({
      empId:          r[4],
      name:           r[8],
      nickname:       r[9],
      position:       r[3],
      khlang:         String(r[2] || '').trim(),
      workDays:       r[11],
      period:         r[32],
      company:        'บริษัท รัตนไพบูลย์ ' + String(r[2] || '').trim() + ' จำกัด',
      fullSalary:     r[15],
      weeksalary:     r[16],
      posAllowance:   r[17],
      diligenceBonus: r[18],
      ot:             r[19],
      commission:     r[20],
      dailyAllowance: r[21],
      shiftFee:       r[22],
      othersIncome:   r[23],
      holidayPay:     r[24],
      totalIncome:    r[25],
      socialSecurity: r[26],
      lateDeduct:     r[27],
      withholdingTax: r[28],
      otherDeduct:    r[29],
      totalDeduct:    r[30],
      netPay:         r[31],
    }));

    return { ok: true, rows };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

/* ══════════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════════ */
function getAnnouncements(p, user) {
  const ss = SpreadsheetApp.openById('1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ');
  const sh = ss.getSheetByName('Announcements');
  if (!sh) return { ok: true, items: [] };
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { ok: true, items: [] };
  const items = data.slice(1).reverse().slice(0, 50).map(r => ({
    timestamp:  r[0] ? new Date(r[0]).toISOString() : '',
    authorId:   String(r[1] || ''),
    authorName: String(r[2] || ''),
    type:       String(r[3] || 'news'),
    title:      String(r[4] || ''),
    content:    String(r[5] || ''),
    imageUrl:   String(r[6] || ''),
  }));
  return { ok: true, items };
}

function postAnnouncement(p, user) {
  // v2.7: เดิม user.role < 5 กับ role สตริง ('hr'/'supervisor') = NaN เทียบเป็น false เสมอ → ใครก็โพสต์ได้
  if (!isSupervisor(user)) return { ok: false, error: 'ไม่มีสิทธิ์โพสต์ประกาศ' };
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
  let sh = ss.getSheetByName('Announcements');
  if (!sh) {
    sh = ss.insertSheet('Announcements');
    sh.appendRow(['timestamp','authorId','authorName','type','title','content','imageUrl']);
  }
  sh.appendRow([
    new Date(),
    user.empId,
    p.authorName || user.name,
    p.type    || 'news',
    p.title   || '',
    p.content || '',
    p.imageUrl|| '',
  ]);
  return { ok: true };
}

function verifySlipPin(p, user) {
  try {
    const ss   = SpreadsheetApp.openById('1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ');
    const sh   = ss.getSheetByName('Sheet1');
    const data = sh.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[2]).trim() !== String(p.empId).trim()) continue;

      const dobRaw = r[9];
      if (!dobRaw) return { ok: false };

      let d;
      if (dobRaw instanceof Date) {
        d = dobRaw;
      } else {
        const parts = String(dobRaw).split('/');
        if (parts.length === 3)
          d = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
      }
      if (!d || isNaN(d.getTime())) return { ok: false };

      const pin = String(d.getDate()).padStart(2,'0')
                + String(d.getMonth()+1).padStart(2,'0')
                + String(d.getFullYear());

      return { ok: pin === String(p.pin) };
    }
    return { ok: false };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function actionSubmitOfficeEquip(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('อุปกรณ์App');
    if (!sh) {
      sh = ss.insertSheet('อุปกรณ์App');
      sh.getRange(1,1,1,16).setValues([[
        'วันที่','รหัสพนักงาน','ชื่อ-สกุล','ชื่อเล่น','ประเภทการเบิก',
        'รายการ/ทรัพย์สิน','จำนวน','สาเหตุ','รายละเอียด(size/shape/link)',
        'ผู้รับผิดชอบ/ให้กับ','ทะเบียนรถ','เลขไมล์','ตำแหน่งทรัพย์สิน',
        'แนบไฟล์','สถานะ','อัพเดทเมื่อ'
      ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const now = new Date(), tz = 'Asia/Bangkok';
    const nowDate = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const nowFull = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');
    sh.appendRow([
      nowDate, p.empId, cleanName_(p.name), p.nickname || '', p.category || '',
      p.item || '', p.quantity || '', p.reason || '', p.detail || '',
      cleanName_(p.assignee), p.licensePlate || '', p.mileage || '', p.assetLocation || '',
      p.attachment ? saveDataUrlToDrive(p.attachment, 'office_' + p.empId + '_' + new Date().getTime()) : '', 'pending', nowFull
    ]);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionGetMyOfficeEquip(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('อุปกรณ์App');
    if (!sh) return { ok: true, items: [] };
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, items: [] };
    const items = data.slice(1).reverse()
      .filter(r => String(r[1]).trim() === String(p.empId).trim())
      .map(r => ({
        date: r[0], empId: r[1], name: r[2], category: r[4],
        item: r[5], quantity: r[6], reason: r[7], detail: r[8],
        assignee: r[9], licensePlate: r[10], mileage: r[11],
        assetLocation: r[12], status: r[14], updatedAt: r[15],
      }));
    return { ok: true, items };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionSubmitDocRequest(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('เอกสารApp');
    if (!sh) {
      sh = ss.insertSheet('เอกสารApp');
      sh.getRange(1,1,1,9).setValues([[
        'วันที่','รหัสพนักงาน','ชื่อ-สกุล','ชื่อเล่น',
        'ประเภทเอกสาร','ใช้สำหรับ','สถานะ','ผู้อนุมัติ','อัพเดทเมื่อ'
      ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const now = new Date(), tz = 'Asia/Bangkok';
    const nowDate = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const nowFull = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');
    sh.appendRow([
      nowDate, p.empId, cleanName_(p.name), p.nickname || '',
      p.docType || '', p.purpose || '', 'pending', '', nowFull
    ]);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionGetMyDocRequests(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('เอกสารApp');
    if (!sh) return { ok: true, items: [] };
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, items: [] };
    const items = data.slice(1).reverse()
      .filter(r => String(r[1]).trim() === String(p.empId).trim())
      .map(r => ({
        date: r[0], empId: r[1], name: r[2], nickname: r[3],
        docType: r[4], purpose: r[5], status: r[6],
        approver: r[7], updatedAt: r[8],
      }));
    return { ok: true, items };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* ── v7.2: คิดยอดตกเบิกจากชีทเงินเดือน ──────────────────────────────────
   ยอด = ค่าแรงรายวัน (+ เบี้ยเลี้ยงต่อวัน เฉพาะ "ปรับปรุงเวลา") แล้วปัดเศษตามหลักคณิตศาสตร์
   หาคอลัมน์จาก "ชื่อหัวคอลัมน์" ก่อนเสมอ — ชีทสลับคอลัมน์แล้วยังทำงานถูก
   หาไม่เจอ/ไม่มีข้อมูล = คืน '' (ปล่อยว่างให้ HR กรอกเอง ดีกว่าใส่เลขมั่ว) */
function reimburseAmount_(empId, includeAllowance) {
  const id = String(empId || '').trim();
  if (!id) return '';
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; };

  const pick = (sheetName, idIdxFallback, dailyIdxFallback, allowIdxFallback) => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return null;
    const data = sh.getDataRange().getValues();
    const head = data[0].map(h => String(h || '').replace(/\s+/g, ''));
    const findCol = (re, fallback) => {
      const i = head.findIndex(h => re.test(h));
      return i >= 0 ? i : fallback;
    };
    const idCol    = findCol(/^รหัสพนักงาน/, idIdxFallback);
    // v7.5: ชื่อเป๊ะก่อน แล้วค่อยเดา — กันไปโดนคอลัมน์อื่นที่บังเอิญมีคำว่า "รายวัน"
    let dailyCol = head.indexOf('ค่าแรงต่อวัน');
    if (dailyCol < 0) dailyCol = findCol(/ค่าแรงต่อวัน|ค่าจ้างต่อวัน|^รายวัน|เรทรายวัน/, dailyIdxFallback);
    // เบี้ยเลี้ยง "ต่อวัน" — ชีท Slip ใช้หัว "สูตรเบี้ยเลี้ยง" (คอลัมน์ V) ไม่ใช่ยอดรวมทั้งงวด
    let allowCol = head.findIndex(h => /เบี้ยเลี้ยง/.test(h) && /สูตร|ต่อวัน|\/วัน/.test(h));
    if (allowCol < 0 && allowIdxFallback != null && /เบี้ยเลี้ยง/.test(head[allowIdxFallback] || '')) allowCol = allowIdxFallback;
    if (dailyCol == null || dailyCol < 0 || idCol == null || idCol < 0) return null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]).trim() !== id) continue;
      const daily = num(data[i][dailyCol]);
      if (!daily) continue;                       // แถวไม่มีค่าแรง → ลองแถว/ชีทถัดไป
      const allow = (allowCol >= 0) ? num(data[i][allowCol]) : 0;
      return { daily: daily, allow: allow };
    }
    return null;
  };

  // RATTANA = ชีท "Slip" (รหัสคอลัมน์ P=15, สูตรเบี้ยเลี้ยง V=21) · PTT = ชีท "Slip PTT" (รหัส E=4)
  const hit = pick('Slip', 15, null, 21) || pick('Slip PTT', 4, null, 21);
  if (!hit) return '';
  const total = hit.daily + (includeAllowance ? hit.allow : 0);
  return Math.round(total);                       // ปัดตามหลักคณิตศาสตร์ (.5 ขึ้น)
}

function actionSubmitReimburse(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('ขอตกเบิก');
    if (!sh) {
      sh = ss.insertSheet('ขอตกเบิก');
      sh.getRange(1,1,1,18).setValues([[
        'วันที่','รหัสพนักงาน','ชื่อ-นามสกุล','ชื่อเล่น','ตำแหน่ง','สำนักงานสาขา',
        'ประเภท','ขอโดย','วันที่ตกเบิก','สถานะ','ผู้อนุมัติ','อัพเดทเมื่อ',
        'รายละเอียด','ชั่วโมง','ย้อนหลัง/ล่วงหน้า','งวดที่โดนหัก','งวดที่ขออนุมัติจ่าย','ชื่อ+วันที่','แนบเอกสาร','จำนวนเงิน(รายวัน)'
      ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const now = new Date(), tz = 'Asia/Bangkok';
    let _nick = p.nickname || '';
    if (!_nick) { try { const _i = lookupEmpInfo(p.empId); if (_i && _i.nickname) _nick = _i.nickname; } catch(_) {} }
    const _cn = cleanName_(p.name);
    const nowDate = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const nowFull = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');
    let attachUrl = '';
    if (p.attachment) {
      const pts  = p.attachment.split(',');
      const blob = Utilities.newBlob(Utilities.base64Decode(pts[1]), pts[0].match(/:(.*?);/)[1], 'reimburse_'+p.empId+'.jpg');
      const f    = DriveApp.createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      attachUrl  = f.getDownloadUrl();
    }
    // v7.2 (surat สั่งใหม่ 27/08): เติมช่อง "จำนวนเงิน" (คอลัมน์ T) ให้อีกครั้ง ตามกติกา
    //   · ปรับปรุงเวลา  = ค่าแรงรายวัน + เบี้ยเลี้ยงต่อวัน (เช่น 400 + 100 = 500)
    //   · ลาย้อนหลัง    = ค่าแรงรายวันอย่างเดียว (ไม่บวกเบี้ยเลี้ยงทุกกรณี)
    //   · ปัดเศษตามหลักคณิตศาสตร์ (383.33 → 383 · 471.67 → 472)
    const _withAllow = String(p.type || '') !== 'reimburse_leave';
    const _amount = reimburseAmount_(p.empId, _withAllow);
    const _rowData = [
      nowDate,                             // A วันที่
      p.empId,                             // B รหัสพนักงาน
      _cn,                                 // C ชื่อ-นามสกุล
      _nick,                               // D ชื่อเล่น
      p.position || '',                    // E ตำแหน่ง
      p.branch || 'HQ',                    // F สำนักงานสาขา
      p.typeLabel || '',                   // G ประเภท
      _cn,                                 // H ขอโดย
      p.deductDate || '',                  // I วันที่ตกเบิก
      'pending',                           // J สถานะ
      '',                                  // K ผู้อนุมัติ
      nowFull,                             // L อัพเดทเมื่อ
      p.reason || '',                      // M รายละเอียด
      '',                                  // N ชั่วโมง
      '',                                  // O ย้อนหลัง/ล่วงหน้า
      p.deductPeriod || '',                // P งวดที่โดนหัก
      p.approvePeriod || '',               // Q งวดที่ขออนุมัติจ่าย
      `${_cn} ${p.deductDate || ''}`,      // R
      attachUrl,                           // S แนบเอกสาร
      _amount,                             // T จำนวนเงิน (v7.2 — รายวัน [+ เบี้ยเลี้ยง] ปัดเศษแล้ว)
    ];
    const _colB = sh.getRange(2, 2, Math.max(sh.getMaxRows() - 1, 1), 1).getValues();
    let _lastIdx = -1;
    for (let i = 0; i < _colB.length; i++) if (String(_colB[i][0]).trim() !== '') _lastIdx = i;
    const _targetRow = _lastIdx + 3;
    sh.getRange(_targetRow, 1, 1, _rowData.length).setValues([_rowData]);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionGetMyReimburse(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('ขอตกเบิก');
    if (!sh) return { ok: true, items: [] };
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, items: [] };
    const items = data.slice(1).reverse()
      .filter(r => String(r[1]).trim() === String(p.empId).trim())
      .map(r => ({
        date: r[0], empId: r[1], name: r[2], nickname: r[3],
        position: r[4], branch: r[5], type: r[6], requestedBy: r[7],
        deductDate: r[8], status: r[9], approver: r[10], updatedAt: r[11],
        reason: r[12], deductPeriod: r[15], approvePeriod: r[16],
      }));
    return { ok: true, items };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionGetOfficeRefData(p, user) {
  try {
    const EMP_SHEET_ID = '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ';
    const VEH_SHEET_ID = '1nCkPfEAlULYB9Rf3OMcq4n2r3lV2ZWAHL5UvZbyD73I';

    const empSh   = SpreadsheetApp.openById(EMP_SHEET_ID).getSheetByName('Sheet1');
    const empData = empSh.getDataRange().getValues();
    const head    = empData[0].map(h => String(h).trim());

    let cEmp  = head.findIndex(h => h.indexOf('รหัสพนักงาน') >= 0);
    let cName = head.findIndex(h => h.indexOf('ชื่อ') >= 0 && h.indexOf('สกุล') >= 0);
    let cWh   = head.findIndex(h => h.indexOf('คลังส่ง') >= 0);
    if (cEmp  < 0) cEmp  = 2;
    if (cName < 0) cName = 4;
    if (cWh   < 0) cWh   = 31;

    let myWh = '';
    for (let i = 1; i < empData.length; i++) {
      if (String(empData[i][cEmp]).trim() === String(p.empId).trim()) {
        myWh = String(empData[i][cWh] || '').trim();
        break;
      }
    }

    const seen = {}, colleagues = [];
    for (let i = 1; i < empData.length; i++) {
      const wh   = String(empData[i][cWh]   || '').trim();
      const name = String(empData[i][cName] || '').trim();
      if (myWh && wh === myWh && name && !seen[name]) {
        seen[name] = 1;
        colleagues.push({ empId: String(empData[i][cEmp] || ''), name: name });
      }
    }

    const vehicles = [], vseen = {};
    try {
      const vehSh   = SpreadsheetApp.openById(VEH_SHEET_ID).getSheetByName('Data รถ final');
      const vehData = vehSh.getDataRange().getValues();
      const vhead   = vehData[0].map(h => String(h).trim());
      let cPlate = vhead.findIndex(h => h.indexOf('ทะเบียน') >= 0);
      let cVWh   = vhead.findIndex(h => h.indexOf('คลัง')   >= 0);
      if (cPlate < 0) cPlate = 13;
      if (cVWh   < 0) cVWh   = 14;
      for (let i = 1; i < vehData.length; i++) {
        const plate = String(vehData[i][cPlate] || '').trim();
        const vwh   = String(vehData[i][cVWh]   || '').trim();
        if (plate && (!myWh || vwh === myWh) && !vseen[plate]) {
          vseen[plate] = 1;
          vehicles.push(plate);
        }
      }
    } catch(ex) {}

    return { ok: true, warehouse: myWh, colleagues: colleagues, vehicles: vehicles };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* แปลง base64 dataURL → ไฟล์ใน Drive แล้วคืนลิงก์ */
function saveDataUrlToDrive(dataUrl, namePrefix) {
  try {
    if (!dataUrl || dataUrl.indexOf('base64,') < 0) return '';
    const parts = dataUrl.split(',');
    const mime  = (parts[0].match(/data:(.*?);/) || [])[1] || 'image/jpeg';
    const ext   = (mime.split('/')[1] || 'jpg').split('+')[0];
    const blob  = Utilities.newBlob(Utilities.base64Decode(parts[1]), mime, namePrefix + '.' + ext);

    const folders = DriveApp.getFoldersByName('RattanaUploads');
    const folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder('RattanaUploads');
    const file    = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch(e) { return 'อัปโหลดผิดพลาด: ' + e.message; }
}

function authorizeDrive() {
  const folders = DriveApp.getFoldersByName('RattanaUploads');
  const folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder('RattanaUploads');
  Logger.log('OK: ' + folder.getName());
}

function actionSubmitFoodOrder(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('สั่งข้าว');
    if (!sh) {
      sh = ss.insertSheet('สั่งข้าว');
      sh.getRange(1,1,1,7).setValues([[
        'วันที่','รหัสพนักงาน','ชื่อ-สกุล','ชื่อเล่น','เมนู','สถานะ','อัพเดทเมื่อ'
      ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const now = new Date(), tz = 'Asia/Bangkok';
    sh.appendRow([
      Utilities.formatDate(now, tz, 'dd/MM/yyyy'),
      p.empId, cleanName_(p.name), p.nickname || '', p.menu || '',
      'pending', Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss')
    ]);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionGetMyFoodOrders(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('สั่งข้าว');
    if (!sh) return { ok: true, items: [] };
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, items: [] };
    const items = data.slice(1).reverse()
      .filter(r => String(r[1]).trim() === String(p.empId).trim())
      .map(r => ({
        date: r[0], empId: r[1], name: r[2], nickname: r[3],
        menu: r[4], status: r[5], updatedAt: r[6],
      }));
    return { ok: true, items };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* v8.9: แปลงค่าคอลัมน์ "รูปแนบ" ให้เป็น URL รูปตรงๆ ที่ <img src> ใช้ได้
   ในชีทเก็บได้ 2 แบบ — ลิงก์ photoView (…?action=photoView&k=…&p=<path>) หรือ path ดิบ
   photoView คืนค่าเป็น "หน้าเว็บที่มีรูป" ไม่ใช่ไฟล์รูป → ใส่ใน <img> แล้วไม่ขึ้น
   ตรงนี้จึงดึง path ออกมาเซ็นใหม่เป็นลิงก์ Supabase ตรง (อายุ 1 ชม. พอสำหรับการอนุมัติ 1 รอบ) */
function photoDirectUrl_(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try {
    let path = '';
    const m = s.match(/[?&]p=([^&]+)/);
    if (m) path = decodeURIComponent(m[1]);
    else if (s.indexOf('http') !== 0) path = s;        // เก็บเป็น path ดิบ (ตอนยังไม่ได้ตั้ง PHOTO_KEY)
    if (path) { const u = sbSignedUrl_(path, 3600); if (u) return u; }
  } catch (_) {}
  return s;   // แปลงไม่ได้ ก็ส่งของเดิมไป (อย่างน้อยกดเปิดแท็บใหม่ได้)
}

const APPROVE_CFG = {
  // v4.3: โครงใหม่ — I สถานะ, J ผู้อนุมัติ, K อนุมัติเมื่อ (stampAt), F ประเภทเอกสาร, L รายละเอียด
  // v8.9: photo = คอลัมน์ "รูปแนบ" (O = 14) — ส่งให้หน้าอนุมัติโชว์ใบรับรองแพทย์/หลักฐาน
  'การลาApp':   { status: 8,  approver: 9, stampAt: 10, name: 2, info: [5, 11], photo: 14 },
  'ขอตกเบิก':   { status: 9,  approver: 10, name: 2, info: [6, 12] },
  'อุปกรณ์App': { status: 14, approver: null, name: 2, info: [4, 5, 7] },
  'เอกสารApp':  { status: 6,  approver: 7,  name: 2, info: [4, 5] },
  'สั่งข้าว':    { status: 5,  approver: null, name: 2, info: [4] },
  'สวัสดิการApp': { status: 8,  approver: null, name: 2, info: [4, 6] },
  'โอนย้ายApp':     { status: 7, approver: 8, name: 2, info: [4, 5] },
  'ผ่านทดลองApp':   { status: 7, approver: 8, name: 2, info: [4, 5] },
  'ปรับเงินเดือนApp':{ status: 7, approver: 8, name: 2, info: [4, 5] },
  'ขอกำลังคนApp':   { status: 7, approver: 8, name: 2, info: [4, 5] },
};

/* ── v6.2: ตารางผู้อนุมัติเฉพาะของแอปนี้ (ไม่แตะชีท Users ที่แอปอื่นใช้ร่วม) ──
   แท็บ "ผู้อนุมัติเฉพาะ" ในชีท HR Rattana App 2 · HR แก้เองได้ในชีท
   ว่าง = ใช้ "ชื่อหัวหน้างาน" จาก Users ตามเดิม · มีชื่อ = คำขอของคนนั้นเข้าคิวคนนี้เท่านั้น */
const APPROVER_TAB  = 'ผู้อนุมัติเฉพาะ';
const APPROVER_SEED = [
  // รหัสพนักงาน, ชื่อพนักงาน, ชื่อผู้อนุมัติ (พิมพ์ให้ตรงชื่อในระบบ), หมายเหตุ
  ['11202', 'จิรวรรณ พวงแก้ว', 'ธนภรณ์ รัตนไพบูลย์', 'surat แจ้ง 24/08/2026 — ไม่แก้ชีท Users เพราะกระทบแอปอื่น'],
];
function normNameTh_(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
let _ovrMapCache = null;
function approverOverrideMap_() {
  if (_ovrMapCache) return _ovrMapCache;
  const map = {};
  try {
    const sh = getTab(APPROVER_TAB);
    if (sh && sh.getLastRow() > 1) {
      const d = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
      d.forEach(r => {
        const id = String(r[0] || '').trim(), nm = normNameTh_(r[2]);
        if (id && nm) map[id] = nm;
      });
    }
  } catch (e) {}
  _ovrMapCache = map;
  return map;
}
/* รันครั้งเดียวจาก editor — สร้างแท็บ + ใส่รายการที่ตกลงกันไว้ (รันซ้ำได้ ไม่ทับของที่มีอยู่) */
function setupApproverOverride() {
  const ss = getSS();
  let sh = ss.getSheetByName(APPROVER_TAB);
  if (!sh) {
    sh = ss.insertSheet(APPROVER_TAB);
    sh.getRange(1, 1, 1, 4).setValues([['รหัสพนักงาน', 'ชื่อพนักงาน', 'ชื่อผู้อนุมัติ', 'หมายเหตุ']])
      .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, 4, 180);
  }
  const have = {};
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(r => { have[String(r[0] || '').trim()] = true; });
  }
  let added = 0;
  APPROVER_SEED.forEach(row => { if (!have[String(row[0]).trim()]) { sh.appendRow(row); added++; } });
  const msg = 'แท็บ "' + APPROVER_TAB + '" พร้อมใช้งาน · เพิ่มรายการใหม่ ' + added + ' รายการ';
  Logger.log(msg);
  try { ss.toast(msg, 'ผู้อนุมัติเฉพาะ', 8); } catch (e) {}
  return msg;
}

/* ── v8.7: ข้อมูลลงเวลาที่ต้องตรวจของ "ลูกทีมเรา" ย้อนหลัง N วัน ───────────────
   surat เคาะ (2/9): แจ้งในแอปให้หัวหน้าเห็น แทนการส่งอีเมล — เตือนคนที่แก้ได้ ข้างปุ่มที่ใช้แก้
   ขอบเขตทีม = กติกาเดียวกับคิวอนุมัติ (ชีท Users คอลัมน์ N + แท็บผู้อนุมัติเฉพาะ) + ตัวเราเอง
   ไม่นับ "วันนี้" เพราะยังทำงานไม่จบ ทุกคนจะขึ้นว่าไม่มีเวลาออกหมด */
function getTimeIssues(p, user) {
  try {
    const supId = String(p.supervisorId || (user && user.empId) || '').trim();
    if (!supId) return { ok: true, items: [] };

    const team = new Set([supId]);
    let myName = '';
    try {
      const uSh = SpreadsheetApp.openById(CFG.usersSheetId).getSheetByName(CFG.usersTab);
      if (uSh) {
        const u = uSh.getDataRange().getValues();
        for (let i = 1; i < u.length; i++) if (String(u[i][2]).trim() === supId) { myName = String(u[i][4]).trim(); break; }
        if (myName) for (let i = 1; i < u.length; i++) if (String(u[i][13]).trim() === myName) team.add(String(u[i][2]).trim());
      }
    } catch (_) {}
    if (!myName) myName = cleanName_(String((user && user.name) || ''));
    const ovr = approverOverrideMap_();
    Object.keys(ovr).forEach(id => { if (normNameTh_(ovr[id]) === normNameTh_(myName)) team.add(String(id).trim()); });
    // v8.8: หัวหน้า PTT เต็มระบบ (เช่น 11202 จิรวรรณ) ไม่มีลูกน้องในชีท Users เลย — ทีมจริงอยู่ทะเบียน PTT
    //       เดิมจึงได้ team.size = 1 แล้วคืนค่าว่าง = การ์ดไม่ขึ้นทั้งที่มีข้อมูลต้องตรวจ (บั๊กเดียวกับคิวอนุมัติ v6.1)
    if (PTT_ALL_SUPERVISORS.indexOf(supId) >= 0) {
      try { Object.keys(pttMap_()).forEach(id => team.add(String(id).trim())); } catch (_) {}
    }
    if (team.size <= 1) return { ok: true, items: [] };   // ไม่มีลูกทีม = ไม่ต้องเตือน

    const tz = 'Asia/Bangkok';
    const days = Math.min(30, parseInt(p.days, 10) || 7);
    const sh = getTab(T.LOG);
    if (!sh || sh.getLastRow() < 2) return { ok: true, items: [] };
    const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const since = new Date(Date.now() - days * 86400000);
    const last = sh.getLastRow();
    const from = Math.max(2, last - 2999);
    const d = sh.getRange(from, 1, last - from + 1, 6).getValues();

    const byDay = {};
    d.forEach(r => {
      const ts = (r[0] instanceof Date) ? r[0] : new Date(r[0]);
      if (!ts || isNaN(ts.getTime()) || ts < since) return;
      const id = String(r[1] || '').trim();
      if (!team.has(id)) return;
      const day = Utilities.formatDate(ts, tz, 'yyyy-MM-dd');
      if (day >= today) return;                       // วันนี้ยังไม่จบ
      const k = id + '|' + day;
      if (!byDay[k]) byDay[k] = { empId: id, name: String(r[2] || '').trim(), day: day, list: [] };
      byDay[k].list.push({ ms: ts.getTime(), type: String(r[5] || '').trim().toLowerCase() === 'out' ? 'out' : 'in',
                           time: Utilities.formatDate(ts, tz, 'HH:mm') });
    });

    const items = [];
    Object.keys(byDay).forEach(k => {
      const g = byDay[k];
      const L = g.list.sort((a, b) => a.ms - b.ms);
      // สแกนชนิดเดียวกันติดกันภายใน 60 นาที = สแกนซ้ำ (คนละเรื่องกับลืมสแกน)
      let dup = null;
      for (let i = 1; i < L.length; i++) {
        if (L[i].type === L[i - 1].type && (L[i].ms - L[i - 1].ms) <= 3600000) { dup = [L[i - 1], L[i]]; break; }
      }
      let alt = L[0].type === 'in';
      for (let i = 1; i < L.length && alt; i++) if (L[i].type === L[i - 1].type) alt = false;
      if (!dup && alt && L.length % 2 === 0) return;   // เข้า-ออก ครบคู่ = ปกติ

      let kind, label, need = '';
      if (dup)                            { kind = 'dup';    label = 'สแกนซ้ำ ' + (dup[0].type === 'in' ? 'เข้า' : 'ออก') + ' ' + dup[0].time + ' และ ' + dup[1].time; }
      else if (L[0].type === 'out')       { kind = 'no_in';  label = 'ไม่มีเวลาเข้า (มีแต่ออก ' + L[0].time + ')'; need = 'in'; }
      else if (alt && L.length % 2 === 1) { kind = 'no_out'; label = 'เข้า ' + L[0].time + ' แล้วไม่มีเวลาออก'; need = 'out'; }
      else                                { kind = 'mixed';  label = 'เข้า-ออก ไม่เรียงกัน'; }

      const dp = g.day.split('-');
      items.push({ empId: g.empId, name: g.name, iso: g.day, date: dp[2] + '/' + dp[1] + '/' + dp[0],
                   kind: kind, label: label, need: need,
                   scans: L.map(x => ({ type: x.type, time: x.time })) });
    });

    items.sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0));   // ล่าสุดบนสุด
    return { ok: true, items: items.slice(0, 40), total: items.length, days: days };
  } catch (e) { return { ok: false, error: e.message }; }
}

function getPendingAll(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const items = [];
    const teamEmpIds = new Set();
    let mySupName = '';                          // v6.2: ชื่อของ "ผู้เปิดหน้าอนุมัติ" (ใช้เทียบกับตารางผู้อนุมัติเฉพาะ)
    const ovrMap = approverOverrideMap_();       // v6.2: {รหัสพนักงาน: ชื่อผู้อนุมัติเฉพาะ}
    const iAmHR = isHR(user);
    if (p.supervisorId) {
      try {
        const uSS  = SpreadsheetApp.openById(CFG.usersSheetId);
        const uSh  = uSS.getSheetByName('Sheet1');
        if (uSh) {
          const uData = uSh.getDataRange().getValues();
          let supName = '';
          for (let i = 1; i < uData.length; i++) {
            if (String(uData[i][2]).trim() === String(p.supervisorId).trim()) {
              supName = String(uData[i][4]).trim();
              break;
            }
          }
          if (supName) {
            for (let i = 1; i < uData.length; i++) {
              if (String(uData[i][13]).trim() === supName)
                teamEmpIds.add(String(uData[i][2]).trim());
            }
          }
          mySupName = supName;
        }
      } catch(_) {}
      // ชื่อจาก session (เผื่อผู้อนุมัติไม่มีแถวในชีท Users เช่นบัญชี PTT)
      if (!mySupName) mySupName = cleanName_(String(user.name || ''));
      // v6.2: คนที่ถูกกำหนดให้ "เรา" เป็นผู้อนุมัติเฉพาะ → ใส่เข้าทีมที่เราเห็น
      Object.keys(ovrMap).forEach(id => {
        if (normNameTh_(ovrMap[id]) === normNameTh_(mySupName)) teamEmpIds.add(String(id).trim());
      });
    }
    Object.keys(APPROVE_CFG).forEach(name => {
      let cfg = APPROVE_CFG[name];
      const sh = ss.getSheetByName(name);
      if (!sh) return;
      // v4.3: การลาApp ที่ยังไม่ migrate → ใช้ index โครงเก่า
      if (name === 'การลาApp' && !leaveSheetIsNew_(sh)) {
        cfg = { status: 9, approver: 10, name: 2, info: [6, 12] };
      }
      const data = sh.getDataRange().getValues();
      const doneRows = [];   // v5.7: ประวัติที่ตัดสินแล้ว — เก็บแยกเพื่อจำกัดจำนวนท้ายสุด
      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        const raw = String(r[cfg.status] || '').toLowerCase().trim();
        const stKey = (!raw || raw === 'pending') ? 'pending'
                    : (raw.indexOf('approve') === 0 ? 'approved'
                    : (raw.indexOf('reject') === 0 ? 'rejected' : 'other'));
        if (stKey !== 'pending' && !p.withDone) continue;
        if (stKey === 'other') continue;   // สถานะแปลกๆ ที่กรอกมือ — ไม่เอาเข้าแท็บ
        if (teamEmpIds.size > 0 && !teamEmpIds.has(String(r[1]).trim())) continue;
        // v6.2: คนที่มี "ผู้อนุมัติเฉพาะ" — คำขอไปเข้าคิวของคนนั้นเท่านั้น (HR ยังเห็นทุกใบตามปกติ)
        const ovrName = ovrMap[String(r[1]).trim()] || '';
        const assigned = !!(ovrName && normNameTh_(ovrName) === normNameTh_(mySupName));
        if (ovrName && !assigned && !iAmHR) continue;
        // v6.1: ห้ามเห็น/อนุมัติคำขอของตัวเอง — ต้องให้หัวหน้าของคนนั้นอนุมัติ
        // (เคสจริง: จิรวรรณ หัวหน้า PTT เห็นคำขอเปลี่ยนวันหยุดของตัวเองในคิวตัวเอง เพราะทีม PTT รวมตัวเธอด้วย)
        // คนอื่นที่มีสิทธิ์อนุมัติ (หัวหน้าของเธอ / HR) ยังเห็นตามปกติ — ไม่มีคำขอตกหล่น
        if (p.supervisorId && String(r[1]).trim() === String(p.supervisorId).trim()) continue;
        const info = cfg.info.map(ci => String(r[ci] || '')).filter(Boolean).join(' · ');
        const it = {
          sheet: name, row: i + 1,
          date: r[0], empId: r[1],
          name: String(r[cfg.name] || ''), info: info,
          status: stKey,
          approver: (cfg.approver != null) ? String(r[cfg.approver] || '') : '',
          assigned: assigned,   // v6.2: ใบนี้ถูกกำหนดให้เราเป็นผู้อนุมัติเฉพาะ (แอปข้ามการกรองทีม)
          photo: (cfg.photo != null) ? photoDirectUrl_(r[cfg.photo]) : '',   // v8.9: รูปแนบ (ลิงก์รูปตรง ใส่ <img> ได้เลย)
        };
        // v7.4: ส่งช่วงวันลา + ชั่วโมง มาด้วย เพื่อให้หน้าอนุมัติโชว์ "ลาตั้งแต่–ถึง กี่วัน"
        if (name === 'การลาApp' && leaveSheetIsNew_(sh)) {
          it.endDate  = r[13] || r[0];                              // N ถึงวันที่
          it.hours    = r[12];                                      // M จำนวนชั่วโมง
          it.quotaDays = leaveQuotaDays_(r[12], r[0], r[13]);        // จำนวนวันที่หักโควต้าจริง
        }
        if (stKey === 'pending') items.push(it);
        else doneRows.push(it);
      }
      doneRows.slice(-60).forEach(it => items.push(it));   // v5.7: ประวัติเอาท้ายสุด 60 รายการ/ชีท
    });
    return { ok: true, items: items };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* v5.8: พนักงานยกเลิกคำขอของตัวเอง (การลาApp — ครอบ ขอลา/เปลี่ยนวันหยุด/แก้เวลาย้อนหลัง)
   ได้เฉพาะสถานะยังรอ · ไม่ลบแถว แค่เปลี่ยนสถานะ cancelled (โควต้า/สรุปวัน/แท็บนับเฉพาะ approved อยู่แล้ว) */
function cancelMyLeave(p, user) {
  try {
    const la = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName('การลาApp');
    if (!la || !leaveSheetIsNew_(la)) return { ok:false, error:'ชีทการลาApp ยังไม่พร้อม' };
    const row = parseInt(p.row, 10) || 0;
    if (row < 2 || row > la.getLastRow()) return { ok:false, error:'ไม่พบรายการ' };
    const r = la.getRange(row, 1, 1, 15).getValues()[0];
    const rowEmp = String(r[1] || '').trim();
    if (rowEmp !== String(user.empId || '').trim() && !isHR(user)) {
      return { ok:false, error:'ยกเลิกได้เฉพาะคำขอของตัวเอง' };
    }
    // กันแถวขยับ (เคย HR ลบแถวมือแล้วเลขแถวเลื่อน): เทียบเวลา "ขอวันที่" ที่แอปเห็นตอนโหลด
    if (p.submittedAt) {
      const sheetTs = (r[7] instanceof Date) ? r[7].getTime() : new Date(r[7]).getTime();
      const cliTs = new Date(p.submittedAt).getTime();
      if (!sheetTs || !cliTs || Math.abs(sheetTs - cliTs) > 60000) {
        return { ok:false, error:'รายการนี้มีการเปลี่ยนแปลง — ปิด-เปิดหน้าใหม่แล้วลองอีกครั้ง' };
      }
    }
    const st = String(r[8] || '').toLowerCase().trim();
    if (st && st !== 'pending') return { ok:false, error:'คำขอนี้ถูกพิจารณาไปแล้ว — ยกเลิกไม่ได้ (ติดต่อหัวหน้า/HR)' };
    la.getRange(row, 9).setValue('cancelled');
    la.getRange(row, 10).setValue('ยกเลิกโดย ' + (user.name || rowEmp));
    la.getRange(row, 11).setValue(new Date());
    return { ok:true };
  } catch (e) { return { ok:false, error:e.message }; }
}

function approveAny(p, user) {
  try {
    // v2.7: เดิมไม่เช็คสิทธิ์เลย — พนักงานยิง API ตรงอนุมัติคำขอตัวเองได้
    if (!isSupervisor(user) && !isHR(user)) return { ok: false, error: 'ไม่มีสิทธิ์อนุมัติ' };
    let cfg = APPROVE_CFG[p.sheet];
    if (!cfg) return { ok: false, error: 'unknown sheet' };
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName(p.sheet);
    if (!sh) return { ok: false, error: 'no sheet' };
    // v4.3: การลาApp ที่ยังไม่ migrate → ใช้ index โครงเก่า
    if (p.sheet === 'การลาApp' && !leaveSheetIsNew_(sh)) {
      cfg = { status: 9, approver: 10, name: 2, info: [6, 12] };
    }
    const row = parseInt(p.row, 10);
    const status = p.decision === 'approved' ? 'approved' : 'rejected';
    sh.getRange(row, cfg.status + 1).setValue(status);
    // v4.3: ประทับเวลา "อนุมัติเมื่อ" (เฉพาะชีทที่ประกาศ stampAt)
    if (cfg.stampAt != null) {
      sh.getRange(row, cfg.stampAt + 1).setValue(Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'));
    }
    // v4.8: อนุมัติ "แก้เวลาย้อนหลัง" → เติมสแกน retroactive ลง CheckinLog + Supabase จริง
    // (เดิมได้แค่ตราประทับ — เวลาไม่เข้าระบบ สรุปวัน/ลงเวลาAuto ไม่ขยับ)
    if (p.sheet === 'การลาApp' && status === 'approved') {
      try { applyLeaveAppTimeAdjust_(sh, row, user); } catch (e) { console.error('applyLeaveAppTimeAdjust_', e); }
    }
    if (cfg.approver != null) {
      const who = p.approverName || (user && user.name) || 'อนุมัติ';
      sh.getRange(row, cfg.approver + 1).setValue(who);
      if (p.note) {
        const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        let noteCol   = headers.indexOf('หมายเหตุ') + 1;
        if (noteCol === 0) {
          noteCol = sh.getLastColumn() + 1;
          sh.getRange(1, noteCol).setValue('หมายเหตุ');
        }
        sh.getRange(row, noteCol).setValue(p.note);
      }
    }
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* v4.8: แตกคำขอ "แก้เวลาย้อนหลัง" (การลาApp) ที่เพิ่งอนุมัติ → สแกนย้อนหลังเข้าระบบ
   รายละเอียดต้องมีรูปแบบ "เข้า HH:MM" หรือ "ออก HH:MM" (ฟอร์มแอปสร้างให้อยู่แล้ว)
   idempotent ด้วย clientId TA-<รหัส>-<วันที่>-<ชนิด> — วันเดียวชนิดเดียวเติมได้ครั้งเดียว */
function applyLeaveAppTimeAdjust_(sh, rowNum, approver) {
  const isNew = leaveSheetIsNew_(sh);
  const r = sh.getRange(rowNum, 1, 1, isNew ? 15 : 19).getValues()[0];
  const typeLabel = String((isNew ? r[5] : r[6]) || '');
  if (typeLabel.indexOf('แก้เวลา') < 0) return;
  const empId = String(r[1] || '').trim();
  const name = String(r[2] || '');
  const dateStr = formatDate(isNew ? r[0] : r[15]);
  const detail = String((isNew ? r[11] : r[12]) || '');
  const m = detail.match(/(เข้า|ออก)\s*(\d{1,2}):(\d{2})/);
  const dp = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m || !dp || !empId) return;
  const type = m[1] === 'ออก' ? 'out' : 'in';
  // v4.9: สร้าง instant เวลาไทยด้วย +07:00 ตรงๆ — ไม่พึ่ง timezone ของโปรเจกต์สคริปต์ (กันเวลาเพี้ยน 7 ชม.)
  const pad2 = (n) => ('0' + n).slice(-2);
  const d = new Date(dp[3] + '-' + pad2(dp[2]) + '-' + pad2(dp[1]) + 'T' + pad2(m[2]) + ':' + m[3] + ':00+07:00');
  if (isNaN(d.getTime())) return;
  const timeStr = pad2(m[2]) + ':' + m[3] + ':00';
  const cid = 'TA-' + empId + '-' + dateStr.replace(/\//g, '') + '-' + type;
  const logSh = getOrCreateTab(T.LOG);
  try { if (logSh.createTextFinder(cid).matchEntireCell(true).findNext()) return; } catch (e) {}
  const target = findUserByEmpId(empId) || {};
  const branch = target.branch || ((pttMap_()[empId] || {}).saka) || '';
  const who = 'timeadjust:' + ((approver && approver.empId) || '');
  if (sbReady_()) {
    try {
      sbUpsert_('checkin_log', {
        client_id: cid, emp_id: empId, name: name,
        scan_at: d.toISOString(), type: type,
        branch: branch, lat: null, lng: null, distance: null, face_dist: null,
        scanned_by: who, photo_path: '',
        retroactive: 'Y', reason: detail,
      }, 'client_id');
    } catch (e) { console.error('sb timeadjust', e); }
  }
  logSh.appendRow([
    d, empId, name, dateStr, timeStr,
    type, branch,
    '', '', '', '',
    who, 'Y',
    detail,
    '', (approver && approver.email) || '', cid,
  ]);
}

function actionSubmitWelfare(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('สวัสดิการApp');
    if (!sh) {
      sh = ss.insertSheet('สวัสดิการApp');
      sh.getRange(1,1,1,10).setValues([[
        'วันที่','รหัสพนักงาน','ชื่อ-สกุล','ชื่อเล่น','หัวข้อ',
        'ที่เกี่ยวข้อง','ชื่อผู้เกี่ยวข้อง','วันที่งาน','สถานะ','อัพเดทเมื่อ'
      ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const now = new Date(), tz = 'Asia/Bangkok';
    const fileUrl = p.attachment ? saveDataUrlToDrive(p.attachment, 'welfare_' + p.empId + '_' + now.getTime()) : '';
    sh.appendRow([
      Utilities.formatDate(now, tz, 'dd/MM/yyyy'),
      p.empId, cleanName_(p.name), p.nickname || '', p.topic || '',
      p.related || '', cleanName_(p.personName), p.eventDate || '',
      'pending', Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss')
    ]);
    if (fileUrl) sh.getRange(sh.getLastRow(), 11).setValue(fileUrl);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionGetMyWelfare(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('สวัสดิการApp');
    if (!sh) return { ok: true, items: [] };
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok: true, items: [] };
    const items = data.slice(1).reverse()
      .filter(r => String(r[1]).trim() === String(p.empId).trim())
      .map(r => ({
        date: r[0], empId: r[1], name: r[2], nickname: r[3],
        topic: r[4], related: r[5], personName: r[6],
        eventDate: r[7], status: r[8], updatedAt: r[9],
      }));
    return { ok: true, items };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionSubmitHrApp(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sheetName = p.sheet;
    if (!sheetName) return { ok: false, error: 'no sheet' };
    let sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.getRange(1,1,1,10).setValues([[
        'วันที่','รหัสพนักงาน','ชื่อ-สกุล','ชื่อเล่น','ประเภท',
        'รายละเอียด','วันที่มีผล','สถานะ','ผู้อนุมัติ','อัพเดทเมื่อ'
      ]]).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const now = new Date(), tz = 'Asia/Bangkok';

    let nick = p.nickname || '';
    if (!nick) { try { const _i = lookupEmpInfo(p.empId); if (_i && _i.nickname) nick = _i.nickname; } catch(_) {} }

    const isProbation = (sheetName === 'ผ่านทดลองApp');
    const status   = isProbation ? '' : 'pending';
    const approver = isProbation ? (cleanName_(p.pressedBy) || (user && cleanName_(user.name)) || '') : '';

    const rowData = [
      Utilities.formatDate(now, tz, 'dd/MM/yyyy'),
      p.empId, cleanName_(p.name), nick, p.typeLabel || '',
      p.reason || '', p.startDate || '', status, approver,
      Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss')
    ];

    const last = sh.getLastRow();
    const colB = last > 1 ? sh.getRange(2, 2, last - 1, 1).getValues() : [];
    let lastIdx = -1;
    for (let i = 0; i < colB.length; i++) if (String(colB[i][0]).trim() !== '') lastIdx = i;
    const targetRow = lastIdx + 3;

    if (isProbation) {
      sh.getRange(targetRow, 1, 1, 7).setValues([rowData.slice(0, 7)]);
      sh.getRange(targetRow, 9, 1, 2).setValues([rowData.slice(8, 10)]);
    } else {
      sh.getRange(targetRow, 1, 1, 10).setValues([rowData]);
    }
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function actionLoginByUser(p) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('User slip');
    if (!sh) return { ok:false, error:'ไม่พบชีต User slip' };
    const data = sh.getDataRange().getValues();
    const uname = String(p.username||'').trim();
    const pass  = String(p.password||'').trim();
    let foundUser = false;
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[1]||'').trim() === uname) {
        foundUser = true;
        const pwd    = String(r[2]||'').trim();
        const status = String(r[4]||'').trim();
        if (pwd === pass) {
          if (!status || (status.toLowerCase() !== 'active' && status !== 'ใช้งาน')) {
            // v2.8: พนักงานใหม่สมัครเองผ่านแอพ — ระบบสมัครไม่เติมคอลัมน์สถานะ (E) ให้ → login ตันงงๆ
            // ถ้าช่องว่าง + มีตัวตนจริงในทะเบียน (Users active หรือ PTT "อยู่") → เปิดใช้งานให้อัตโนมัติ
            // (ค่าที่ถูกกรอกไว้ชัดเจน เช่น "ลาออก" ยังบล็อกตามเดิม)
            const inUsers = usersData_().some(u2 =>
              String(u2[U_COL.empId] || '').trim() === uname &&
              String(u2[U_COL.status] || '').trim().toLowerCase() === 'active');
            const inPtt = !!pttMap_()[uname];
            if (!status && (inUsers || inPtt)) {
              sh.getRange(i + 1, 5).setValue('ใช้งาน');
            } else {
              return { ok:false, code:'inactive', error: !status
                ? 'บัญชียังไม่เปิดใช้งาน — แจ้ง HR เติมสถานะ "ใช้งาน" ในชีท User slip'
                : 'ไม่พบสิทธิ์เข้าใช้งาน — โปรดติดต่อ HR' };
            }
          }
          // v3.7: คลัง จาก User slip คอลัมน์ D (HQ/W1-W4)
          const userObj = Object.assign({ empId:uname, username:uname, name:String(r[0]||''), khlang:String(r[3]||'').trim() }, lookupEmpInfo(uname));
          try {
            const pttSS = SpreadsheetApp.openById('1lnIVDnPe1g8UYwAAtbE1bddWsq_sAGiVWmbnuBr5VBM');
            const pttSh = pttSS.getSheetByName('ข้อมูลพนักงาน PTT') || pttSS.getSheets()[0];
            if (pttSh) {
              const pd = pttSh.getDataRange().getValues();
              const pr = pd.find(r =>
                (r[0]==='บายพาส' || r[0]==='ลาดใหญ่') &&
                String(r[2]).trim() === String(uname).trim() &&
                String(r[10]).trim() === 'อยู่'
              );
              if (pr) {
                userObj.slipSheet = 'Slip PTT';
                userObj.company   = 'บริษัท รัตนไพบูลย์ ' + String(pr[1]).trim() + ' จำกัด';
              }
            }
          } catch(e) {}
          return { ok:true, user: userObj };
        }
      }
    }
    if (foundUser) return { ok:false, code:'wrong_password', error:'รหัสผ่านไม่ถูกต้อง' };
    return { ok:false, code:'not_found', error:'ไม่พบชื่อผู้ใช้' };
  } catch(e) { return { ok:false, error:e.message }; }
}

/* ดึง user จาก session แบบชีท (หลัง login ด้วยรหัส/รหัสผ่าน) */
function sheetSessionUser(username) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('User slip');
    if (!sh) return null;
    const data = sh.getDataRange().getValues();
    const uname = String(username || '').trim();
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      const user = String(r[1] || '').trim();
      if (user === uname) {
        const status = String(r[4] || '').trim().toLowerCase();
        if (status && status !== 'active' && status !== 'ใช้งาน') return null;
        return Object.assign({ empId: user, name: String(r[0] || ''), email: '', khlang: String(r[3] || '').trim() }, lookupEmpInfo(user));
      }
    }
    return null;
  } catch(e) { return null; }
}

/* ดึง role/แผนก จากชีตพนักงาน (1M6Hd) ตามรหัสพนักงาน */
function lookupEmpInfo(empId) {
  try {
    const sh = SpreadsheetApp.openById('1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ').getSheetByName('Sheet1');
    if (!sh) return { role:'employee', userRole:'1', department:'' };
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (String(r[2]).trim() === String(empId).trim()) {
        const userRole = String(r[15]||'').trim();
        const stage    = String(r[16]||'').trim().toLowerCase();
        const dept     = String(r[17]||'');
        const name     = String(r[4]||'');
        let role = 'employee';
        if (dept.indexOf('ทรัพยากรบุคคล') >= 0 || userRole === '7' || stage === 'all') role = 'hr';
        else if (userRole === '6') role = 'manager';                                    // v2.7: ให้ตรงกับ login Google
        else if (stage === 'mgt' || userRole === '5' || isSupervisorOfName(name, data)) role = 'supervisor';
        return { role:role, userRole:userRole||'1', department:dept, name:name, supervisorName:String(r[13]||''), nickname:String(r[6]||'').trim(), branch: String(r[1]||'').trim() };
      }
    }
    return { role:'employee', userRole:'1', department:'' };
  } catch(e) { return { role:'employee', userRole:'1', department:'' }; }
}

function isSupervisorOfName(name, data) {
  if (!name) return false;
  const n = String(name).trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][13]||'').trim() === n) return true;
  }
  return false;
}

function actionRegisterUserSlip(p) {
  try {
    const sh = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName('User slip');
    if (!sh) return { ok:false, error:'ไม่พบชีต User slip' };
    const name = String(p.name||'').trim();
    const user = String(p.username||'').trim();
    const pass = String(p.password||'').trim();
    if (!name || !user || !pass) return { ok:false, error:'กรอกข้อมูลให้ครบ' };

    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const exName = String(data[i][0]||'').trim();
      const exUser = String(data[i][1]||'').trim();
      if (exUser === user) return { ok:false, error:'รหัสพนักงานนี้มีในระบบแล้ว — โปรดติดต่อ HR' };
      if (exName && exName === name) return { ok:false, error:'ชื่อ-สกุลนี้มีในระบบแล้ว — โปรดติดต่อ HR' };
    }

    sh.appendRow([ name, user, pass]);
    return { ok:true };
  } catch(e) { return { ok:false, error:e.message }; }
}

function actionSubmitSalaryAdjust(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('ปรับเงินเดือนApp');
    if (!sh) return { ok:false, error:'ไม่พบชีท ปรับเงินเดือนApp' };

    const now = new Date(), tz = 'Asia/Bangkok';
    const nowDate = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
    const nowFull = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');

    let _nick = p.nickname || '';
    let _name = p.name || '';
    try {
      const _i = lookupEmpInfo(p.empId);
      if (_i) {
        if (_i.name)     _name = _i.name;
        if (!_nick && _i.nickname) _nick = _i.nickname;
      }
    } catch(_) {}
    _name = cleanName_(_name);

    const _rowData = [
      nowDate,                              // A  วันที่
      p.empId,                              // B  รหัสพนักงาน
      _name,                                // C  ชื่อ-สกุล
      _nick,                                // D  ชื่อเล่น
      p.typeLabel || 'ขอปรับเงินเดือน',     // E  ประเภท
      p.salaryType || '',                   // F  ประเภท (รายเดือน/รายวัน)
      Number(p.salary)    || 0,             // G  เงินเดือน
      Number(p.diligence) || 0,             // H  เบี้ยขยันพิเศษ
      Number(p.phone)     || 0,             // I  ค่าโทร
      Number(p.daily)     || 0,             // J  เบี้ยเลี้ยง
      Number(p.incentive) || 0,             // K  Incentive
      Number(p.other)     || 0,             // L  อื่นๆ
      p.startDate || nowDate,               // M  วันที่มีผล
      '',                                   // N  สถานะ
      cleanName_(p.pressedBy) || '',        // O  ผู้อนุมัติ (ชื่อผู้กด)
      nowFull,                              // P  อัพเดทเมื่อ
    ];

    const _colB = sh.getRange(2, 2, Math.max(sh.getMaxRows() - 1, 1), 1).getValues();
    let _lastIdx = -1;
    for (let i = 0; i < _colB.length; i++) if (String(_colB[i][0]).trim() !== '') _lastIdx = i;
    const _targetRow = _lastIdx + 3;
    sh.getRange(_targetRow, 1, 1, 13).setValues([_rowData.slice(0, 13)]);
    sh.getRange(_targetRow, 15, 1, _rowData.length - 14).setValues([_rowData.slice(14)]);

    return { ok:true };
  } catch(e) { return { ok:false, error:e.message }; }
}

function getSlipData(p, user) {
  const empId = p.empId || (user && user.empId);
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('Slip');
    if (!sh) return { ok:false, error:'ไม่พบชีท Slip' };
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return { ok:true, rows:[] };

    const matched = data.slice(1).filter(r =>
      String(r[15]).trim() === String(empId).trim()
    );

    const rows = matched.map(r => ({
      empId:          r[15],
      name:           r[13],
      nickname:       r[14],
      position:       r[6],
      workDays:       r[27],
      adjBaseR:       r[17],
      adjPosT:        r[19],
      adjPhoneU:      r[20],
      adjDailyV:      r[21],
      adjIncAI:       r[34],
      fullSalary:     r[17],
      weeksalary:     r[28],
      posAllowance:   r[29],
      phoneAllowance: r[30],
      dailyAllowance: r[31],
      ot:             r[32],
      diligenceBonus: r[33],
      incentive:      r[34],
      othersIncome:   r[35],
      totalIncome:    r[36],
      socialSecurity: r[37],
      damageDeduct:    r[38],
      totalExpenseAY: r[50],
      insuranceDeduct: r[39],
      uniformDeduct:   r[40],
      loanGov:         r[41],
      absenceDeduct:   r[42],
      loanBorrow:      r[43],
      otherDeduct:    r[44],
      withholdingTax: r[45],
      totalDeduct:    r[46],
      netPay:         r[47],
      period:         r[48],
      totalIncomeAX:  r[49],
    }));

    return { ok:true, rows };
  } catch(e) { return { ok:false, error:e.message }; }
}

/* อ่านเมนู Café Amazon */
function getAmazonMenu(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('เมนู Amazon');
    if (!sh) {
      sh = ss.insertSheet('เมนู Amazon');
      sh.getRange(1, 1, 1, 2).setValues([['ชื่อเมนู', 'ราคา']])
        .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const data = sh.getDataRange().getValues();
    const items = data.slice(1)
      .filter(r => String(r[0]).trim() !== '')
      .map(r => ({ name: String(r[0]).trim(), price: Number(r[1]) || 0 }));
    return { ok: true, items };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* v8.5: ประวัติที่ "ผู้กด" คนนี้คีย์ไว้ — ล่าสุดอยู่บนสุด
   ชีท Amazon: A ชื่อ สกุล · B ชื่อเมนู+ชนิด · C ราคา · D วันที่ · E ผู้กด (ไม่มีคอลัมน์รหัส จึงเทียบด้วยชื่อ)
   HR ส่ง all:1 มาได้ = เห็นของทุกคน (ไว้กระทบยอดสิ้นเดือน) */
function getAmazonOrders(p, user) {
  try {
    const sh = SpreadsheetApp.openById(CFG.attendanceSheetId).getSheetByName('Amazon');
    if (!sh || sh.getLastRow() < 2) return { ok: true, items: [], total: 0 };
    const wantAll = String(p.all || '') === '1' && isHR(user);
    const me = cleanName_((user && user.name) || '').trim();
    const limit = Math.min(200, parseInt(p.limit, 10) || 60);
    const d = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues();

    const items = [];
    for (let i = d.length - 1; i >= 0 && items.length < limit; i--) {   // ไล่จากท้ายชีท = ใหม่สุดก่อน
      const r = d[i];
      if (String(r[0] || '').trim() === '' && String(r[1] || '').trim() === '') continue;
      const by = cleanName_(String(r[4] || '')).trim();
      if (!wantAll && by !== me) continue;
      const raw = r[3];
      items.push({
        buyer: String(r[0] || '').trim(),
        menu:  String(r[1] || '').trim(),
        price: Number(r[2]) || 0,
        date:  (raw instanceof Date) ? Utilities.formatDate(raw, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') : String(raw || ''),
        by:    by,
        row:   i + 2,
      });
    }
    let total = 0;
    items.forEach(x => { total += x.price; });
    return { ok: true, items: items, total: Math.round(total * 100) / 100, all: wantAll };
  } catch (e) { return { ok: false, error: e.message }; }
}

/* บันทึกการสั่ง Café Amazon */
function actionSubmitAmazonOrder(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('Amazon');
    if (!sh) {
      sh = ss.insertSheet('Amazon');
      sh.getRange(1, 1, 1, 5).setValues([['ชื่อ สกุล', 'ชื่อเมนู+ชนิด', 'ราคา', 'วันที่', 'ผู้กด']])
        .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const now = new Date(), tz = 'Asia/Bangkok';
    const nowFull = Utilities.formatDate(now, tz, 'dd/MM/yyyy HH:mm:ss');

    const _rowData = [
      cleanName_(p.buyer),        // A  ชื่อ สกุล
      p.menu || '',               // B  ชื่อเมนู+ชนิด
      Number(p.price) || 0,       // C  ราคา
      nowFull,                    // D  วันที่
      cleanName_(p.pressedBy),    // E  ผู้กด
    ];
    const colA = sh.getRange(1, 1, Math.max(sh.getMaxRows(), 1), 1).getValues();
    let lastIdx = 0;
    for (let i = 0; i < colA.length; i++) if (String(colA[i][0]).trim() !== '') lastIdx = i;
    sh.getRange(lastIdx + 2, 1, 1, _rowData.length).setValues([_rowData]);

    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* v1.9: หัวหน้า PTT เต็มระบบ — รหัสในลิสต์นี้ ลูกทีม = พนักงาน PTT ทุกคน (ทุกสาขาทุกคลัง)
   ใช้เฉพาะตอน client ส่ง all:1 (ฟอร์ม/ทีม/kiosk) — หน้า "จัดกะ" ไม่ส่ง all จึงกรองตามคลังเดิม */
const PTT_ALL_SUPERVISORS = ['11202'];   // จิรวรรณ พวงแก้ว

/* รายชื่อพนักงาน PTT สาขา+คลังเดียวกับผู้ login (หรือทั้งหมด ถ้าเป็นหัวหน้า PTT เต็มระบบ + all:1) */
function getPTTStaff(p, user) {
  // v2.0: ยึดตัวตนจาก session ก่อน — p.empId เป็นค่าที่ client อ้างเอง ห้ามใช้ตัดสินสิทธิ์
  const empId = String((user && user.empId) || p.empId || '').trim();
  try {
    const ss = SpreadsheetApp.openById('1lnIVDnPe1g8UYwAAtbE1bddWsq_sAGiVWmbnuBr5VBM');
    const sheets = ss.getSheets();
    let data = null;
    for (let i = 0; i < sheets.length; i++) {
      const d = sheets[i].getDataRange().getValues();
      if (d.some(r => r[0] === 'บายพาส' || r[0] === 'ลาดใหญ่')) { data = d; break; }
    }
    if (!data) return { ok: false, error: 'ไม่พบตารางพนักงาน PTT' };

    // v2.0: สิทธิ์เห็นทุกสาขาตัดสินจาก user.empId (session จริง) เท่านั้น
    // v2.5: HR ก็ขอโหมดทุกสาขาได้ (หน้า "ทีม" ของ HR เลือกดูทีม PTT ของจิรวรรณ)
    const authedId = String((user && user.empId) || '').trim();
    const wantAll = String(p.all || '') === '1' && (PTT_ALL_SUPERVISORS.indexOf(authedId) >= 0 || isHR(user));
    const me = data.find(r => (r[0] === 'บายพาส' || r[0] === 'ลาดใหญ่') && String(r[2]).trim() === empId);
    if (!me && !wantAll) return { ok: false, error: 'ไม่พบพนักงาน PTT รหัส ' + empId };
    const mySaka = me ? String(me[0]).trim() : '', myKhlang = me ? String(me[1]).trim() : '';

    const staff = [];
    data.forEach(r => {
      if (r[0] !== 'บายพาส' && r[0] !== 'ลาดใหญ่') return;
      if (String(r[9]).trim() !== 'อยู่') return;
      if (!wantAll) {
        if (String(r[0]).trim() !== mySaka) return;
        if (String(r[1]).trim() !== myKhlang) return;
      }
      const id = String(r[2] || '').trim(); if (!id) return;
      staff.push({ empId: id, name: String(r[6] || '').trim(), dept: String(r[20] || '').trim(),
                   saka: String(r[0]).trim(), khlang: String(r[1]).trim() });
    });
    return { ok: true, staff, saka: wantAll ? 'ทั้งหมด' : mySaka, khlang: wantAll ? '' : myKhlang,
             myPosition: me ? String(me[20] || '').trim() : (wantAll ? 'หัวหน้า PTT' : '') };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* บันทึกตารางกะ */
function actionSubmitShift(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    let sh = ss.getSheetByName('จัดกะ');
    if (!sh) {
      sh = ss.insertSheet('จัดกะ');
      sh.getRange(1, 1, 1, 8).setValues([['สาขา','บริษัท','ชื่อ-สกุล','เวลาเข้า','เวลาออก','วันหยุด','วันที่','โอที']])
        .setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    const _nm = cleanName_(p.name);
    const row = [
      p.saka || '',
      p.company || '',
      _nm,
      p.start || '',
      p.end || '',
      p.holiday || '',
      p.date || '',
      p.ot || '',
    ];
    const data = sh.getDataRange().getValues();
    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]).trim() === _nm.trim() &&
          String(data[i][6]).trim() === String(p.date).trim()) { found = i + 1; break; }
    }
    if (found > 0) {
      sh.getRange(found, 1, 1, 8).setValues([row]);
    } else {
      const colC = sh.getRange(1, 3, Math.max(sh.getMaxRows(), 1), 1).getValues();
      let last = 0;
      for (let i = 0; i < colC.length; i++) if (String(colC[i][0]).trim() !== '') last = i;
      sh.getRange(last + 2, 1, 1, 8).setValues([row]);
    }
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* อ่านตารางกะ */
function getShifts(p, user) {
  try {
    const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
    const sh = ss.getSheetByName('จัดกะ');
    if (!sh) return { ok: true, rows: [] };
    const data = sh.getDataRange().getValues();
    const saka = String(p.saka || '').trim(), khlang = String(p.khlang || '').trim();
    const tstr = v => {
      if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'HH:mm');
      const s = String(v || '').trim(), m = s.match(/^(\d{1,2}):(\d{2})/);
      return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : s;
    };
    const rows = data.slice(1)
      .filter(r => String(r[2]).trim() !== '' &&
        (!saka   || String(r[0]).trim() === saka) &&
        (!khlang || String(r[1]).trim() === khlang))
      .map(r => ({
        name:    String(r[2] || '').trim(),
        start:   tstr(r[3]),
        end:     tstr(r[4]),
        holiday: String(r[5] || '').trim(),
        date:    (r[6] instanceof Date) ? Utilities.formatDate(r[6], 'Asia/Bangkok', 'dd/MM/yyyy') : String(r[6] || '').trim(),
        ot:      r[7],
      }));
    return { ok: true, rows };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* รายชื่อพนักงาน PTT ทั้งหมด — สำหรับ dropdown ผู้ซื้อ Amazon */
function getPTTBuyers(p, user) {
  try {
    const ss = SpreadsheetApp.openById('1lnIVDnPe1g8UYwAAtbE1bddWsq_sAGiVWmbnuBr5VBM');
    const sheets = ss.getSheets();
    let data = null;
    for (let i = 0; i < sheets.length; i++) {
      const d = sheets[i].getDataRange().getValues();
      if (d.some(r => r[0] === 'บายพาส' || r[0] === 'ลาดใหญ่')) { data = d; break; }
    }
    if (!data) return { ok: true, staff: [] };
    const staff = [];
    data.forEach(r => {
      if (r[0] !== 'บายพาส' && r[0] !== 'ลาดใหญ่') return;
      if (String(r[9]).trim() !== 'อยู่') return;   // v8.6: คอลัมน์ J = "สถานะทำงาน" (เดิมอ่าน K ซึ่งเป็นช่องหัวว่าง มีคน "ออก" ปน)
      const id = String(r[2] || '').trim(); if (!id) return;
      staff.push({ empId: id, name: String(r[6] || '').trim(), nickname: String(r[7] || '').trim() });
    });
    return { ok: true, staff };
  } catch(e) { return { ok: false, error: e.message }; }
}

/* ==================== จัดกะ + โควต้า (v2) ==================== */
const JADKA_SS_ID = '1aywVdJ5-zw70__3BHjE3itjZotiubaRUAMjWOzgCAts';
const JADKA_TAB   = 'จัดกะ';
const QUOTA_TAB   = 'โควต้ากะ';

function jk_ss_(){ return SpreadsheetApp.openById(JADKA_SS_ID); }
function jk_sheet_(name, headers){
  const ss = jk_ss_(); let sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); if(headers && headers.length) sh.getRange(1,1,1,headers.length).setValues([headers]); }
  return sh;
}
function jk_str_(v){ return String(v==null?'':v).trim(); }
function jk_normDate_(v){
  let s = (v instanceof Date) ? Utilities.formatDate(v,'Asia/Bangkok','dd/MM/yyyy') : jk_str_(v);
  const p = s.split('/');
  if (p.length === 3) {
    let y = parseInt(p[2], 10);
    if (y > 2400) y -= 543;
    s = ('0'+p[0]).slice(-2)+'/'+('0'+p[1]).slice(-2)+'/'+y;
  }
  return s;
}
function jk_normTime_(v){ return (v instanceof Date) ? Utilities.formatDate(v,'Asia/Bangkok','HH:mm') : jk_str_(v); }

function getQuota(p){
  const saka = jk_str_(p.saka), khlang = jk_str_(p.khlang);
  const quota = {}, booked = {};
  const qs = jk_sheet_(QUOTA_TAB, ['สาขา','คลัง','วันที่','เวลาเข้า','โควต้า']);
  const qv = qs.getLastRow() > 1 ? qs.getRange(2,1,qs.getLastRow()-1,5).getValues() : [];
  qv.forEach(function(r){
    if(jk_str_(r[0]) !== saka || jk_str_(r[1]) !== khlang) return;
    const lim = parseInt(r[4],10); if(isNaN(lim)) return;
    quota[jk_normDate_(r[2]) + '|' + jk_normTime_(r[3])] = lim;
  });
  const js = jk_sheet_(JADKA_TAB, ['สาขา','บริษัท','ชื่อ-สกุล','เวลาเข้า','เวลาออก','วันหยุด','วันที่','โอที']);
  const jv = js.getLastRow() > 1 ? js.getRange(2,1,js.getLastRow()-1,8).getValues() : [];
  jv.forEach(function(r){
    if(jk_str_(r[0]) !== saka || jk_str_(r[1]) !== khlang) return;
    const start = jk_normTime_(r[3]); if(!start || jk_str_(r[5])) return;
    const k = jk_normDate_(r[6]) + '|' + start;
    booked[k] = (booked[k]||0) + 1;
  });
  return { ok:true, quota: quota, booked: booked };
}

function submitQuota(p){
  const saka = jk_str_(p.saka), khlang = jk_str_(p.khlang), date = jk_str_(p.date);
  const items = Array.isArray(p.items) ? p.items : [];
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try{
    const qs = jk_sheet_(QUOTA_TAB, ['สาขา','คลัง','วันที่','เวลาเข้า','โควต้า']);
    const last = qs.getLastRow();
    const rows = last > 1 ? qs.getRange(2,1,last-1,5).getValues() : [];
    const idx = {};
    rows.forEach(function(r,i){
      if(jk_str_(r[0])===saka && jk_str_(r[1])===khlang && jk_normDate_(r[2])===date)
        idx[jk_normTime_(r[3])] = i + 2;
    });
    items.forEach(function(it){
      const start = jk_str_(it.start);
      const lim = (it.limit==null || it.limit==='') ? null : parseInt(it.limit,10);
      const row = idx[start];
      if(lim==null){ if(row) qs.getRange(row,5).setValue(''); }
      else if(row){ qs.getRange(row,5).setValue(lim); }
      else{
        const w = qs.getLastRow() + 1;
        qs.getRange(w,3).setNumberFormat('@');
        qs.getRange(w,1,1,5).setValues([[saka, khlang, date, start, lim]]);
      }
    });
    return { ok:true };
  } finally { lock.releaseLock(); }
}

function submitShift(p){
  const saka = jk_str_(p.saka), khlang = jk_str_(p.company), name = cleanName_(p.name);
  const date = jk_str_(p.date), start = jk_str_(p.start), end = jk_str_(p.end);
  const holiday = jk_str_(p.holiday), ot = (p.ot===''||p.ot==null) ? '' : p.ot;
  const bypass = p.bypassQuota===true || p.bypassQuota==='true';
  const isWork = !!start && !holiday;
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try{
    const js = jk_sheet_(JADKA_TAB, ['สาขา','บริษัท','ชื่อ-สกุล','เวลาเข้า','เวลาออก','วันหยุด','วันที่','โอที']);
    const last = js.getLastRow();
    const rows = last > 1 ? js.getRange(2,1,last-1,8).getValues() : [];
    if(isWork && !bypass){
      const qs = jk_sheet_(QUOTA_TAB, ['สาขา','คลัง','วันที่','เวลาเข้า','โควต้า']);
      const qlast = qs.getLastRow();
      const qrows = qlast > 1 ? qs.getRange(2,1,qlast-1,5).getValues() : [];
      let limit = null;
      qrows.forEach(function(r){
        if(jk_str_(r[0])===saka && jk_str_(r[1])===khlang && jk_normDate_(r[2])===date && jk_normTime_(r[3])===start){
          const l = parseInt(r[4],10); if(!isNaN(l)) limit = l;
        }
      });
      if(limit==null){ throw new Error('เวลานี้ยังไม่เปิดให้จอง'); }
      if(limit!=null){
        let cnt = 0;
        rows.forEach(function(r){
          if(jk_str_(r[0])!==saka || jk_str_(r[1])!==khlang) return;
          if(jk_normDate_(r[6])!==date || jk_normTime_(r[3])!==start) return;
          if(jk_str_(r[5])) return;
          if(cleanName_(r[2])===name) return;
          cnt++;
        });
        if(cnt >= limit){ throw new Error('กะนี้เต็มแล้ว เลือกเวลาอื่น'); }
      }
    }
    let target = 0;
    for(let i=0;i<rows.length;i++){
      const r = rows[i];
      if(jk_str_(r[0])===saka && jk_str_(r[1])===khlang && cleanName_(r[2])===name && jk_normDate_(r[6])===date){ target = i + 2; break; }
    }
    const w = target || (js.getLastRow() + 1);
    js.getRange(w,7).setNumberFormat('@');
    js.getRange(w,1,1,8).setValues([[saka, khlang, name, start, end, holiday, date, ot]]);
    return { ok:true };
  } finally { lock.releaseLock(); }
}

function emailSlip(p, user){
  const to = (user && user.email) ? user.email : (p && p.toEmail || '');
  if(!to) throw new Error('ไม่พบอีเมลผู้รับ');
  const h   = (p && p.header)  || {};
  const inc = (p && Array.isArray(p.income)) ? p.income : [];
  const ded = (p && Array.isArray(p.deduct)) ? p.deduct : [];
  const t   = (p && p.totals)  || {};
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const rowsHtml = arr => arr.map(r =>
    '<tr><td style="padding:3px 0">'+esc(r.label)+'</td><td style="padding:3px 0;text-align:right">'+esc(r.v)+'</td></tr>').join('');
  const html =
    '<div style="font-family:sans-serif;max-width:640px;margin:auto;color:#1a2230;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">'
    + '<div style="background:#0d1b3e;color:#fff;padding:16px 20px"><div style="font-size:15px;font-weight:700">'+esc(h.company)+'</div>'
    +   '<div style="font-size:13px;opacity:.85;margin-top:2px">สลิปเงินเดือน · งวด '+esc(h.periodDate)+'</div></div>'
    + '<div style="padding:16px 20px"><table style="width:100%;font-size:13px;margin-bottom:14px">'
    +   '<tr><td style="color:#667085">รหัสพนักงาน</td><td style="text-align:right;font-weight:600">'+esc(h.empId)+'</td></tr>'
    +   '<tr><td style="color:#667085">ชื่อ-สกุล</td><td style="text-align:right;font-weight:600">'+esc(h.name)+'</td></tr>'
    +   '<tr><td style="color:#667085">ตำแหน่ง</td><td style="text-align:right">'+esc(h.position)+'</td></tr>'
    +   '<tr><td style="color:#667085">วันทำงาน</td><td style="text-align:right">'+esc(h.workDays)+'</td></tr></table>'
    +   '<div style="display:flex;gap:16px">'
    +     '<div style="flex:1"><div style="font-weight:700;color:#0a7c3c;border-bottom:2px solid #0a7c3c;padding-bottom:4px;margin-bottom:6px">รายได้</div><table style="width:100%;font-size:13px">'+rowsHtml(inc)+'<tr style="border-top:1px solid #ccc"><td style="padding-top:6px;font-weight:700">รวมรายได้</td><td style="padding-top:6px;text-align:right;font-weight:700">'+esc(t.totalIncome)+'</td></tr></table></div>'
    +     '<div style="flex:1"><div style="font-weight:700;color:#c0392b;border-bottom:2px solid #c0392b;padding-bottom:4px;margin-bottom:6px">รายหัก</div><table style="width:100%;font-size:13px">'+rowsHtml(ded)+'<tr style="border-top:1px solid #ccc"><td style="padding-top:6px;font-weight:700">รวมหัก</td><td style="padding-top:6px;text-align:right;font-weight:700">'+esc(t.totalDeduct)+'</td></tr></table></div></div>'
    +   '<div style="margin-top:18px;background:#0d1b3e;color:#fff;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center"><div style="font-size:13px">สุทธิที่ได้รับ (NET PAY)</div><div style="font-size:22px;font-weight:800">฿'+esc(t.netPay)+'</div></div>'
    + '</div></div>';
  const fname = 'สลิปเงินเดือน_'+String(h.periodDate||'').replace(/[\/\\:]/g,'-')+'.pdf';
  const pdf = Utilities.newBlob(html, 'text/html', 'slip.html').getAs('application/pdf').setName(fname);
  MailApp.sendEmail({
    to: to,
    subject: 'สลิปเงินเดือน งวด '+(h.periodDate||'')+' - '+(h.name||''),
    htmlBody: 'เรียน คุณ'+esc(h.name)+'<br><br>แนบสลิปเงินเดือนงวด <b>'+esc(h.periodDate)+'</b> มาพร้อมอีเมลนี้ (ไฟล์ PDF)<br><br>ฝ่ายบุคคล<br>'+esc(h.company),
    attachments: [pdf],
    name: 'ฝ่ายบุคคล รัตนไพบูลย์'
  });
  return { ok:true, to: to };
}

function _authGmail() {
  const me = Session.getActiveUser().getEmail();
  MailApp.sendEmail(me, 'ทดสอบสิทธิ์ส่งเมล HR', 'ระบบส่งอีเมลพร้อมใช้งานแล้ว ✓');
}

function saveDayFix(p, user) {
  // v2.7: แก้ได้เฉพาะของตัวเอง หรือหัวหน้า/HR (เดิมไม่เช็ค — แก้ log แทนใครก็ได้)
  const fixEmp = String(p.empId || '');
  if (fixEmp !== String(user.empId) && !isSupervisor(user) && !isHR(user)) {
    return { ok: false, error: 'ไม่มีสิทธิ์แก้ไขเวลาของคนอื่น' };
  }
  const ss = SpreadsheetApp.openById(CFG.attendanceSheetId);
  let sh = ss.getSheetByName('DayFixLog');
  if (!sh) { sh = ss.insertSheet('DayFixLog');
    sh.appendRow(['เวลาแก้','รหัส','ชื่อ','วันที่','เข้า','ออก','สแกนที่ไม่นับ','แก้โดย']); }
  sh.appendRow([new Date(), String(p.empId||''), cleanName_(p.name), p.date||'',
    p.inTime||'', p.outTime||'', p.skip||'', p.by||p.empId||'']);
  return { ok:true };
}

/* ── v8.2: ตรวจ/แก้รูปแบบวันที่ในชีทการลาApp (A วันที่ · N ถึงวันที่) ─────────────
   แอปเขียนลงเหมือนกันทุกใบ เป็นข้อความ "dd/MM/yyyy" แล้วชีทแปลงเป็นวันที่จริงให้เอง
   แถวที่หน้าตาต่าง (เช่น "26 สิงหาคม 2026") = มีคนแก้เซลล์นั้นเองในชีท → รูปแบบเซลล์เปลี่ยนตามที่พิมพ์
   ▸ ถ้ายังเป็น "วันที่จริง" = แค่หน้าตาต่าง ระบบยังนับถูกทุกอย่าง
   ▸ ถ้ากลายเป็น "ข้อความ" = พังเงียบ 3 จุด — สูตรลาในแท็บสรุปวัน · ยอดใช้ไปของโควต้า · ช่วงวันที่หน้าอนุมัติ
   ► auditLeaveDates() ดูเฉยๆ · fixLeaveDatesApply() แก้จริง (ข้อความ→วันที่ + จัดรูปแบบทั้งคอลัมน์) */
const LV_DATE_COLS = [{ c: 1, name: 'A วันที่' }, { c: 14, name: 'N ถึงวันที่' }];
const TH_MON_FULL = ['มกรา','กุมภา','มีนา','เมษา','พฤษภา','มิถุนา','กรกฎา','สิงหา','กันยา','ตุลา','พฤศจิกา','ธันวา'];
const TH_MON_ABBR = ['ม.ค','ก.พ','มี.ค','เม.ย','พ.ค','มิ.ย','ก.ค','ส.ค','ก.ย','ต.ค','พ.ย','ธ.ค'];

function ymd_(y, mo, d) {
  if (y > 2400) y -= 543;                       // พ.ศ. → ค.ศ.
  const dt = new Date(y, mo - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}
function thaiTextToDate_(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);            // 26/08/2026
  if (m) return ymd_(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);                  // 2026-08-26
  if (m) return ymd_(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);                  // 26 สิงหาคม 2026 · 26 ส.ค. 2026
  if (m) {
    let i = TH_MON_FULL.findIndex(x => m[2].indexOf(x) === 0);
    if (i < 0) i = TH_MON_ABBR.findIndex(x => m[2].indexOf(x) === 0);
    if (i >= 0) return ymd_(+m[3], i + 1, +m[1]);
  }
  return null;
}

function auditLeaveDates()    { return leaveDateTool_(false); }
function fixLeaveDatesApply() { return leaveDateTool_(true); }

function leaveDateTool_(apply) {
  const sh = getSS().getSheetByName('การลาApp');
  if (!sh || !leaveSheetIsNew_(sh)) throw new Error('ไม่พบชีทการลาApp (โครงใหม่)');
  const last = sh.getLastRow();
  if (last < 2) return 'ยังไม่มีข้อมูล';
  const n = last - 1;
  const L = ['── รูปแบบวันที่ในชีทการลาApp · ' + n + ' แถว ' + (apply ? '(แก้จริง)' : '(ดูเฉยๆ)') + ' ──'];
  let fixable = 0, unreadable = 0;

  LV_DATE_COLS.forEach(col => {
    const rng  = sh.getRange(2, col.c, n, 1);
    const vals = rng.getValues();
    const fmts = rng.getNumberFormats();
    let real = 0, blank = 0, text = 0;
    const fixes = [], bad = [], seenFmt = {};
    vals.forEach((r, i) => {
      const v = r[0];
      if (v === '' || v == null) { blank++; return; }
      if (v instanceof Date) {
        real++;
        const f = String(fmts[i][0] || '');
        seenFmt[f] = (seenFmt[f] || 0) + 1;
        return;
      }
      text++;
      const d = thaiTextToDate_(v);
      if (d) fixes.push({ row: i + 2, from: String(v), to: d });
      else   bad.push({ row: i + 2, from: String(v) });
    });

    L.push('');
    L.push('▸ ' + col.name + ' — วันที่จริง ' + real + ' · ข้อความ ' + text + ' · ว่าง ' + blank);
    const fl = Object.keys(seenFmt);
    if (fl.length > 1) {
      L.push('  หน้าตาต่างกัน ' + fl.length + ' แบบ: ' + fl.map(f => (f || '(อัตโนมัติ)') + ' ×' + seenFmt[f]).join(' · '));
    }
    if (text) {
      L.push('  ⚠ ที่เป็นข้อความ ระบบมองไม่เห็น (สูตรลาในสรุปวัน + ยอดใช้ไปของโควต้า ตกหล่น)');
      fixes.slice(0, 12).forEach(f => L.push('    แถว ' + f.row + ': "' + f.from + '"' + (apply ? ' → แก้แล้ว' : ' → แปลงได้')));
      if (fixes.length > 12) L.push('    … และอีก ' + (fixes.length - 12) + ' แถว');
      bad.forEach(b => L.push('    ✗ แถว ' + b.row + ': "' + b.from + '" — อ่านไม่ออก ต้องแก้เอง'));
    }
    fixable += fixes.length;
    unreadable += bad.length;

    if (apply) {
      fixes.forEach(f => sh.getRange(f.row, col.c).setValue(f.to));
      // จัดรูปแบบทั้งคอลัมน์ (รวมแถวที่ยังว่าง) — แถวใหม่ที่แอปเขียนมาจะหน้าตาเหมือนกันหมด
      sh.getRange(2, col.c, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('dd/MM/yyyy');
    }
  });

  L.push('');
  if (apply) L.push('✅ แก้ ' + fixable + ' ช่อง + ตั้งรูปแบบ dd/MM/yyyy ทั้ง 2 คอลัมน์' +
                    (unreadable ? ' · เหลือ ' + unreadable + ' ช่องที่ต้องแก้เอง' : ''));
  else if (fixable || unreadable) L.push('► เจอ ' + fixable + ' ช่องที่แก้อัตโนมัติได้ — รัน fixLeaveDatesApply() เพื่อแก้จริง' +
                    (unreadable ? ' (อีก ' + unreadable + ' ช่องอ่านไม่ออก ต้องแก้เอง)' : ''));
  else L.push('✅ วันที่เป็นวันที่จริงทุกช่อง — ไม่มีอะไรต้องแก้');

  const msg = L.join('\n');
  Logger.log(msg);
  try { getSS().toast(apply ? 'แก้วันที่เรียบร้อย' : 'ตรวจเสร็จ — ดูผลใน "บันทึกการดำเนินการ"', 'รูปแบบวันที่การลาApp', 10); } catch (e) {}
  return msg;
}

/* ── v8.3: ตรวจ/ซ่อม "เข้า-ออก" ที่จับคู่ไม่ครบในอดีต ───────────────────────────
   ต้นเหตุเดิม (แก้ที่ actionCheckin แล้ว): แอปเป็นคนเดาชนิด → log ในเครื่องว่างเมื่อไหร่ก็เดา "เข้า"
   → ได้ เข้า+เข้า ในวันเดียว ไม่มีเวลาออก → หน้าประวัติขึ้น "ลงเวลาไม่ครบ" ทั้งที่คนสแกนครบ 2 ครั้ง
   ► auditInOutPairs() ดูเฉยๆ · fixInOutPairsApply() ซ่อมจริง
   ซ่อมเฉพาะเคสที่ชัดเจน: วันนั้นมี 2 สแกน เป็น "เข้า" ทั้งคู่ และห่างกัน ≥ 4 ชม. → ตัวหลังเป็น "ออก"
   เคสอื่น (สแกน 3 ครั้งขึ้นไป / ห่างกันน้อย / มีแต่ออก) รายงานอย่างเดียว ไม่แตะ — ต้องดูเป็นราย ๆ */
function auditInOutPairs()    { return inOutPairs_(90, false); }
function fixInOutPairsApply() { return inOutPairs_(90, true); }

function inOutPairs_(daysBack, apply) {
  const sh = getTab(T.LOG);
  if (!sh || sh.getLastRow() < 2) throw new Error('ไม่พบข้อมูลใน ' + T.LOG);
  const tz = 'Asia/Bangkok';
  const since = new Date(Date.now() - (parseInt(daysBack, 10) || 90) * 86400000);
  const last = sh.getLastRow();
  const d = sh.getRange(2, 1, last - 1, 6).getValues();

  const days = {};   // empId|yyyy-MM-dd → [{row, ms, type, name}]
  d.forEach((r, i) => {
    const ts = (r[0] instanceof Date) ? r[0] : new Date(r[0]);
    if (!ts || isNaN(ts.getTime()) || ts < since) return;
    const id = String(r[1] || '').trim();
    if (!id) return;
    const k = id + '|' + Utilities.formatDate(ts, tz, 'yyyy-MM-dd');
    (days[k] = days[k] || []).push({
      row: i + 2, ms: ts.getTime(), name: String(r[2] || '').trim(),
      type: String(r[5] || '').trim().toLowerCase() === 'out' ? 'out' : 'in',
    });
  });

  const fixes = [], review = [];
  Object.keys(days).forEach(k => {
    const list = days[k].sort((a, b) => a.ms - b.ms);
    const ins = list.filter(x => x.type === 'in').length;
    const outs = list.length - ins;
    // ปกติ: สลับ เข้า-ออก-เข้า-ออก … เริ่มด้วยเข้า
    let okPattern = list[0].type === 'in';
    for (let i = 1; i < list.length && okPattern; i++) if (list[i].type === list[i - 1].type) okPattern = false;
    if (okPattern) return;

    const id = k.split('|')[0], day = k.split('|')[1];
    const hh = ms => Utilities.formatDate(new Date(ms), tz, 'HH:mm');
    const label = day + ' · ' + id + ' ' + (list[0].name || '') + ' · ' +
                  list.map(x => (x.type === 'in' ? 'เข้า' : 'ออก') + ' ' + hh(x.ms)).join(' → ');

    if (list.length === 2 && ins === 2 && outs === 0 && (list[1].ms - list[0].ms) >= 4 * 3600000) {
      fixes.push({ row: list[1].row, label: label });
    } else {
      // v8.4: เคสที่ต้องแก้เอง — บอกเลขแถวใน CheckinLog ไปเลย จะได้ไม่ต้องนั่งหาในพันกว่าแถว
      review.push(label + '  (แถว ' + list.map(x => x.row).join(', ') + ')');
    }
  });

  const L = ['── ตรวจคู่ เข้า-ออก ย้อนหลัง ' + (parseInt(daysBack, 10) || 90) + ' วัน ' + (apply ? '(ซ่อมจริง)' : '(ดูเฉยๆ)') + ' ──'];
  L.push('');
  L.push('▸ ซ่อมได้เอง (เข้า+เข้า ห่าง ≥ 4 ชม. → ตัวหลังเป็น "ออก"): ' + fixes.length + ' วัน');
  fixes.slice(0, 25).forEach(f => L.push('   ' + f.label + (apply ? '  → แก้เป็น ออก แล้ว' : '')));
  if (fixes.length > 25) L.push('   … และอีก ' + (fixes.length - 25) + ' วัน');
  L.push('');
  L.push('▸ ต้องดูเอง (รูปแบบไม่ชัด ระบบไม่แตะ): ' + review.length + ' วัน');
  review.slice(0, 25).forEach(x => L.push('   ' + x));
  if (review.length > 25) L.push('   … และอีก ' + (review.length - 25) + ' วัน');

  if (apply && fixes.length) {
    fixes.forEach(f => sh.getRange(f.row, 6).setValue('out'));
    L.push('');
    L.push('✅ ซ่อมแล้ว ' + fixes.length + ' แถว — เปิดหน้าประวัติในแอปดูได้เลย');
  } else if (!apply && fixes.length) {
    L.push('');
    L.push('► รัน fixInOutPairsApply() เพื่อซ่อมจริง');
  } else if (!fixes.length && !review.length) {
    L.push('');
    L.push('✅ เข้า-ออก จับคู่ครบทุกวัน ไม่มีอะไรต้องแก้');
  }

  const msg = L.join('\n');
  Logger.log(msg);
  try { getSS().toast((apply ? 'ซ่อม ' + fixes.length + ' แถว' : 'ซ่อมได้ ' + fixes.length + ' · ต้องดูเอง ' + review.length) + ' — ดูผลใน "บันทึกการดำเนินการ"', 'คู่ เข้า-ออก', 12); } catch (e) {}
  return msg;
}

/* v8.8: ดูว่าการ์ด "ข้อมูลลงเวลาต้องตรวจ" ของคนนี้จะได้อะไรบ้าง (รันจาก editor · อ่านอย่างเดียว)
   ใช้ตอบว่า "การ์ดไม่ขึ้นเพราะไม่มีลูกทีม หรือเพราะไม่มีปัญหาจริง"
   ► เปลี่ยนรหัสในบรรทัดล่างเป็นคนที่อยากตรวจ แล้วกด Run */
const PREVIEW_EMP_ID = '11202';   // จิรวรรณ พวงแก้ว
function previewTimeIssues() {
  const id = String(PREVIEW_EMP_ID).trim();
  const u = findUserByEmpId(id) || (pttMap_()[id] ? { empId:id, name:pttMap_()[id].name, role:5 } : null);
  const L = ['── ทดลองดึงการ์ด "ข้อมูลลงเวลาต้องตรวจ" ของ ' + id + ' ' + ((u && u.name) || '(ไม่พบชื่อ)') + ' ──'];
  [7, 30].forEach(days => {
    const res = getTimeIssues({ supervisorId: id, days: days }, u || { empId:id, name:'' });
    if (!res.ok) { L.push('⚠ ' + days + ' วัน: ' + res.error); return; }
    const items = res.items || [];
    L.push('');
    L.push('▸ ย้อนหลัง ' + days + ' วัน — พบ ' + (res.total || 0) + ' รายการ');
    items.slice(0, 15).forEach(it => L.push('   ' + it.date + ' · ' + it.empId + ' ' + it.name + ' · ' + it.label));
    if (!items.length) L.push('   (ไม่มี — ลูกทีมสแกนครบทุกคน)');
  });
  const msg = L.join('\n');
  Logger.log(msg);
  return msg;
}
