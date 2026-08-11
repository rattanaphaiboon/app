/******************************************************************
 * Rattana Attendance backend — PATCH v2.9 "ด่านเว้นช่วงสแกน 60 นาที"
 * ใช้คู่กับแอป rattana-attendance.html v12.0 (กันลงเวลาซ้อน)
 *
 * ── ปัญหาเดิม ──
 * ด่าน v10.8 กันสแกนซ้ำเฉพาะ "ชนิดเดียวกัน" ภายใน 1 ชม.
 * แต่แอปสลับชนิดให้อัตโนมัติ (เข้า→ออก) เวลาพนักงานสแกนซ้ำ
 * → เข้า 07:40 แล้วสแกนซ้ำ 07:50 กลายเป็น "ออก 07:50" หลุดด่าน
 * → ชีทมี เข้า-ออก ซ้อนตอนเช้า HR งงตอนทำเงินเดือน
 *
 * แพตช์นี้เพิ่มชั้นที่สอง: บล็อกสแกน "ทุกชนิด" ของคนเดิมภายใน 60 นาที
 * ด้วย CacheService (กันข้ามเครื่องด้วย เช่น สแกนที่ kiosk หัวหน้า
 * แล้วมาสแกนซ้ำที่มือถือตัวเอง — ฝั่งแอปมองไม่เห็นกันและกัน)
 *
 * ── วิธีติดตั้ง (Apps Script editor ของ backend ลงเวลา) ──
 * 1) ก๊อปทั้งไฟล์นี้ไปวาง "ท้ายไฟล์" rattana-backend.gs
 * 2) ในฟังก์ชัน actionCheckin: หลังอ่านค่า empId / type / clientTs จาก payload
 *    และ "หลัง" ด่าน clientId dedupe เดิม (เพื่อไม่บล็อกการ re-sync แถวเดิม)
 *    เพิ่ม 2 บรรทัดนี้:
 *
 *      var gapG = scanGapGuard_(empId, clientTs);
 *      if (gapG) return {ตอบแบบเดียวกับด่าน guard v10.8 เดิม แต่ msg = gapG.msg};
 *
 *    (ด่าน v10.8 เดิมใน actionCheckin ตอบ JSON ที่มี ok:true, guard:true, msg
 *     — ให้ตอบรูปแบบเดียวกันเป๊ะ ฝั่งแอปเช็ค syncRes.guard อยู่แล้ว)
 * 3) ก่อนจุด "return สำเร็จ" ของ actionCheckin (หลังเขียนแถวลงชีทแล้ว) เพิ่ม:
 *
 *      scanGapStamp_(empId, type);
 *
 * 4) Deploy → Manage deployments → แก้ deployment เดิม → Version: New
 *    (อย่าสร้าง deployment ใหม่ ไม่งั้น URL เปลี่ยน แอปเรียกไม่เจอ)
 *
 * หมายเหตุสำคัญ: แพตช์นี้ "ไม่บล็อก re-sync ของเก่า" — สแกนออฟไลน์ที่เพิ่งตามมาส่ง
 * (clientTs เก่ากว่า 10 นาที) ผ่านตามปกติ กันเฉพาะสแกนสดที่ยิงซ้ำภายใน 60 นาที
 ******************************************************************/

var SCAN_GAP_MIN_SRV = 60;   // นาที — ให้ตรงกับ SCAN_GAP_MIN ฝั่งแอป (v12.0 = 60)

/** คืน {msg:...} ถ้าควรบล็อกสแกนนี้ / null ถ้าให้ผ่าน */
function scanGapGuard_(empId, clientTs) {
  try {
    // สแกนย้อนหลัง/re-sync (เวลาสแกนจริงเก่ากว่า 10 นาที) — ปล่อยผ่าน ไม่งั้นสแกนออฟไลน์หาย
    if (clientTs) {
      var ts = new Date(clientTs).getTime();
      if (ts && (Date.now() - ts) > 10 * 60 * 1000) return null;
    }
    var raw = CacheService.getScriptCache().get('scanGap_' + String(empId));
    if (!raw) return null;
    var prev = JSON.parse(raw);
    var mins = Math.max(0, Math.round((Date.now() - prev.ts) / 60000));
    var label = prev.type === 'out' ? 'ออกงาน' : 'เข้างาน';
    return { msg: 'สแกน' + label + 'ไปแล้วเมื่อ ' + prev.time + ' น. (' + mins +
                  ' นาทีก่อน) — ไม่บันทึกซ้ำ เว้นระยะ ' + SCAN_GAP_MIN_SRV + ' นาที' };
  } catch (e) { return null; }   // cache มีปัญหา → ปล่อยผ่าน (ยังมีด่านฝั่งแอปอยู่)
}

/** ประทับเวลาสแกนล่าสุดของ emp — เรียกหลังบันทึกลงชีทสำเร็จ */
function scanGapStamp_(empId, type) {
  try {
    CacheService.getScriptCache().put(
      'scanGap_' + String(empId),
      JSON.stringify({
        ts: Date.now(),
        type: String(type || 'in'),
        time: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'HH:mm'),
      }),
      SCAN_GAP_MIN_SRV * 60   // TTL วินาที = หมดอายุพอดีกับหน้าต่างกันซ้ำ
    );
  } catch (e) {}
}
