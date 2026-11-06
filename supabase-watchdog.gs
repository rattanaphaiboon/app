/**
 * Supabase Watchdog — เฝ้าฐาน Rattana Base แล้วแจ้ง Discord เมื่อล่ม
 * สร้าง 6 พ.ย. 2026 · หลังเหตุ DB ค้างไม่ตอบ 5 พ.ย. 17:25-17:40 (แอปใช้ไม่ได้ทุกตัว)
 *
 * ★ ตั้งใจให้อยู่ "นอก" Supabase — ถ้า Supabase ล่ม ตัวแจ้งเตือนต้องไม่ล่มตาม
 *   Apps Script รันบนเครื่อง Google แยกขาดจากกัน
 *
 * วิธีติดตั้ง (ทำครั้งเดียว)
 *   1. script.google.com → New project → วางไฟล์นี้ทั้งไฟล์ทับ Code.gs
 *   2. ⚙️ Project Settings → Script Properties → Add
 *        ชื่อ  DISCORD_WEBHOOK
 *        ค่า   https://discord.com/api/webhooks/....   (เว็บฮุคห้องที่จะให้เตือน)
 *   3. กลับมาหน้าโค้ด → เลือกฟังก์ชัน setup → Run (อนุญาตสิทธิ์ครั้งแรก)
 *   4. เลือกฟังก์ชัน testAlert → Run  เพื่อดูว่าข้อความเข้า Discord จริง
 *
 * ฟังก์ชัน
 *   setup()      ตั้ง trigger ทุก 5 นาที (ลบของเก่าก่อน ไม่ซ้อน)
 *   check()      ตัวที่ trigger เรียก — ping แล้วตัดสินใจแจ้งเตือน
 *   testAlert()  ยิงข้อความทดสอบเข้า Discord
 *   status()     ดูสถานะล่าสุดใน Log (ไม่ยิง Discord)
 *   stop()       ปิดการเฝ้า (ลบ trigger)
 */

var SUPA   = 'https://uytzsuwapwkqkougorvb.supabase.co';
var APIKEY = 'sb_publishable_2iDqojkyM2pqJxQJfvnxyg_Y6WMQ6Q8';   // คีย์ publishable ตัวเดียวกับที่ฝังในเว็บแอป
var TABLE  = 'checkout_log';
var FAIL_N = 2;        // ไม่ตอบกี่รอบติดถึงจะเตือน (2 รอบ = ~10 นาที)
var SLOW_MS = 6000;    // ตอบช้ากว่านี้ = นับว่าผิดปกติ (เตือนอย่างมากชั่วโมงละครั้ง)
var RESTART_URL = 'https://supabase.com/dashboard/project/uytzsuwapwkqkougorvb/settings/general';

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'check') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('check').timeBased().everyMinutes(5).create();
  Logger.log('ตั้ง trigger ทุก 5 นาทีแล้ว');
}

function stop() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'check') ScriptApp.deleteTrigger(t);
  });
  Logger.log('ปิดการเฝ้าแล้ว');
}

function ping_() {
  var url = SUPA + '/rest/v1/' + TABLE + '?select=id&limit=1&apikey=' + APIKEY;
  var t0 = Date.now(), code = 0, err = '';
  try {
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, validateHttpsCertificates: true });
    code = r.getResponseCode();
  } catch (e) {
    err = String(e && e.message || e);
  }
  return { ok: code === 200, code: code, ms: Date.now() - t0, err: err };
}

function check() {
  var P = PropertiesService.getScriptProperties();
  var r = ping_();
  var fails = parseInt(P.getProperty('FAILS') || '0', 10) || 0;
  var down  = P.getProperty('DOWN') === '1';

  if (!r.ok) {
    fails++;
    P.setProperty('FAILS', String(fails));
    P.setProperty('LAST', fmt_(new Date()) + ' ไม่ตอบ (' + (r.code || r.err) + ')');
    if (fails >= FAIL_N && !down) {
      P.setProperty('DOWN', '1');
      notify_('🔴 ฐานข้อมูลไม่ตอบ',
        'Supabase **Rattana Base** ไม่ตอบ ' + fails + ' รอบติด (รอบละ 5 นาที)\n' +
        'สถานะล่าสุด: `' + (r.code || r.err || 'timeout') + '` · ใช้เวลา ' + r.ms + ' ms\n\n' +
        '**แอปที่ใช้ไม่ได้:** เช็คออก · เช็คสต็อก · D-MAN\n' +
        '**วิธีแก้เร็วสุด:** เปิดลิงก์ข้างล่าง → Restart project (ใช้เวลา ~5 นาที ข้อมูลไม่หาย)\n' +
        RESTART_URL, 0xdc2626);
    }
    return;
  }

  /* ตอบได้ */
  P.setProperty('FAILS', '0');
  P.setProperty('LAST', fmt_(new Date()) + ' ปกติ ' + r.ms + ' ms');
  if (down) {
    P.setProperty('DOWN', '0');
    notify_('✅ ฐานข้อมูลกลับมาแล้ว',
      'Supabase **Rattana Base** ตอบปกติแล้ว (' + r.ms + ' ms)\nใช้แอปต่อได้เลย', 0x16a34a);
    return;
  }
  /* ตอบได้แต่ช้าผิดปกติ — เตือนอย่างมากชั่วโมงละครั้ง */
  if (r.ms >= SLOW_MS) {
    var last = parseInt(P.getProperty('SLOW_AT') || '0', 10) || 0;
    if (Date.now() - last > 3600000) {
      P.setProperty('SLOW_AT', String(Date.now()));
      notify_('🟡 ฐานข้อมูลตอบช้า',
        'Supabase **Rattana Base** ตอบใน **' + r.ms + ' ms** (ปกติ 100-400 ms)\n' +
        'ยังใช้งานได้ แต่ถ้าช้าแบบนี้ต่อเนื่อง มักจะค้างตามมา — ดูแรม/Disk IO ใน Dashboard', 0xd97706);
    }
  }
}

function status() {
  var P = PropertiesService.getScriptProperties();
  var r = ping_();
  Logger.log('ตอนนี้: ' + (r.ok ? 'ปกติ' : 'ไม่ตอบ') + ' ' + (r.code || r.err) + ' · ' + r.ms + ' ms');
  Logger.log('บันทึกล่าสุด: ' + (P.getProperty('LAST') || '-'));
  Logger.log('สถานะเตือนค้าง: ' + (P.getProperty('DOWN') === '1' ? 'กำลังเตือนว่าล่ม' : 'ปกติ'));
  Logger.log('trigger: ' + ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'check'; }).length + ' ตัว');
}

function testAlert() {
  notify_('🧪 ทดสอบ', 'ตัวเฝ้า Supabase ต่อกับห้องนี้เรียบร้อย · ' + fmt_(new Date()), 0x2563eb);
  Logger.log('ส่งแล้ว — ไปดูใน Discord');
}

function notify_(title, desc, color) {
  var hook = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK');
  if (!hook) { Logger.log('⚠️ ยังไม่ได้ตั้ง Script Property ชื่อ DISCORD_WEBHOOK'); return; }
  var body = { username: 'Supabase Watchdog',
    embeds: [{ title: title, description: desc, color: color,
      footer: { text: 'Rattana Base · ' + fmt_(new Date()) } }] };
  try {
    UrlFetchApp.fetch(hook, { method: 'post', contentType: 'application/json',
      payload: JSON.stringify(body), muteHttpExceptions: true });
  } catch (e) { Logger.log('ส่ง Discord ไม่สำเร็จ: ' + e); }
}

function fmt_(d) {
  return Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM HH:mm:ss');
}
