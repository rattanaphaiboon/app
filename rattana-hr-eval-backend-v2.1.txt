/* ========================================================================
   Rattana HR Eval — Backend (Apps Script Web App)
   v2.1 — 2026-07-17
   ========================================================================
   v2.1 = fix "Users tab not found": ชีท Users ไม่มีแท็บ "Rattana Users for apps"
          ข้อมูลจริงอยู่แท็บ "Sheet1" (gviz เดิมส่งแท็บแรกให้เงียบๆ เวลาชื่อไม่ตรง)
          → ชี้ Sheet1 ตรงๆ + เพิ่ม sheetByName_ หาแบบ normalize + fallback แท็บแรก
   v1.x = Calibration save/latest/history (ชีทยังเปิด public ให้ gviz)
   v2.0 = ล็อคชีทหลังบ้าน:
     - เพิ่ม action=login   : verify Google ID token → เช็ค Users sheet → ออก session token (30 วัน)
     - เพิ่ม action=getData : ส่งข้อมูล V.1 + New salary แบบกรองสิทธิ์ฝั่ง server
     - Calibration ทุก endpoint ต้องแนบ token
     - Script รันด้วยสิทธิ์เจ้าของ → อ่านชีทที่ล็อคแล้วได้ (แอพไม่ต้องใช้ gviz อีก)

   วิธี DEPLOY (สำคัญ — ต้องคง URL เดิม):
   1. เปิดโปรเจกต์ Apps Script ตัวเดิม (ตัวที่ deploy AKfycbxch8rw... อยู่)
   2. ลบโค้ดเก่าทั้งหมด วางไฟล์นี้แทน → Save
   3. Deploy → Manage deployments → ✏️ Edit ตัวเดิม → Version: "New version" → Deploy
      (ห้ามกด "New deployment" — URL จะเปลี่ยน!)
   4. Execute as: Me · Who has access: Anyone (เหมือนเดิม)
   5. รัน function `setupCheck` หนึ่งครั้งจาก editor (สร้าง secret + ขอ permission UrlFetchApp)
   6. หลังแอพ v4.0 ขึ้นแล้วค่อยล็อคชีท: Share → เอา "Anyone with the link" ออก
   ======================================================================== */

const CFG = {
  EVAL_SHEET_ID:  '1LCruX-0Du0cndCFrCbUdsYPxxFXuxJx34TJ44kFshe0',
  USERS_SHEET_ID: '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ',
  EVAL_TAB:       'V.1',
  SALARY_TAB:     'New salary',
  CAL_TAB:        'Calibration',
  USERS_TAB:      'Sheet1',   // v2.1: ชื่อแท็บจริงของข้อมูลพนักงาน (ไม่ใช่ "Rattana Users for apps")
  CLIENT_ID:      '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com',
  SESSION_TTL_DAYS: 30,
};

/* HR override ฝั่ง server (เทียบเท่า HR_EMAILS ในแอพ — แต่ตัวนี้คือของจริงที่คุมข้อมูล)
   แนะนำ: จัดการสิทธิ์ผ่านคอลัมน์ EvalAccess ใน Users sheet แทน จะได้ไม่ต้องแก้โค้ด */
const SERVER_HR_EMAILS = [
  // 'surat.rat@rattanaphaiboon.com',
];

/* ── Entry points ─────────────────────────────────────────────────── */

function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    if (action === 'latest' || action === 'history') {
      const email = verifyToken_(e.parameter.token || '');
      if (!email) return json_({ ok: false, error: 'UNAUTHORIZED', code: 401 });
      return action === 'latest' ? calLatest_() : calHistory_();
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents || '{}');
    const action = (body.action || '').toLowerCase();

    if (action === 'login') return login_(body);

    // ทุก action อื่นต้องมี token
    const email = verifyToken_(body.token || '');
    if (!email) return json_({ ok: false, error: 'UNAUTHORIZED', code: 401 });

    if (action === 'getdata') return getData_(email);
    if (action === 'save')    return calSave_(body, email);
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* รันมือหนึ่งครั้งหลังวางโค้ด — สร้าง secret + trigger permission prompt */
function setupCheck() {
  getSecret_();
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=x', { muteHttpExceptions: true });
  Logger.log('secret OK, tokeninfo reachable (%s), eval tab rows: %s',
    r.getResponseCode(),
    SpreadsheetApp.openById(CFG.EVAL_SHEET_ID).getSheetByName(CFG.EVAL_TAB).getLastRow());
}

/* ── Auth: Google ID token → session token ────────────────────────── */

function login_(body) {
  const credential = String(body.credential || '');
  if (!credential) return json_({ ok: false, error: 'missing credential' });

  // 1) verify กับ Google
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return json_({ ok: false, error: 'INVALID_CREDENTIAL' });
  const info = JSON.parse(res.getContentText());
  if (info.aud !== CFG.CLIENT_ID)            return json_({ ok: false, error: 'WRONG_AUDIENCE' });
  if (String(info.email_verified) !== 'true') return json_({ ok: false, error: 'EMAIL_NOT_VERIFIED' });
  if (Number(info.exp) * 1000 < Date.now())   return json_({ ok: false, error: 'CREDENTIAL_EXPIRED' });

  const email = normEmail_(info.email);

  // 2) เช็ค Users sheet
  const profile = loadProfile_(email);
  if (!profile)          return json_({ ok: false, error: 'EMAIL_NOT_FOUND' });
  if (!profile.active)   return json_({ ok: false, error: 'ACCOUNT_SUSPENDED' });

  // 3) ออก session token (HMAC, stateless, 30 วัน)
  const exp = Date.now() + CFG.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const token = signToken_(email, exp);
  profile.picture = String(info.picture || '');

  return json_({ ok: true, token: token, exp: exp, user: profile, scope: computeScope_(profile) });
}

function getSecret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('HREVAL_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('HREVAL_SECRET', s); }
  return s;
}

function signToken_(email, exp) {
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify({ e: email, x: exp }));
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, getSecret_()));
  return payload + '.' + sig;
}

/* คืน email ถ้า token ถูกต้องและยังไม่หมดอายุ — null ถ้าไม่ผ่าน */
function verifyToken_(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const expect = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(parts[0], getSecret_()));
    if (expect !== parts[1]) return null;
    const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    if (!p.e || !p.x || Date.now() > p.x) return null;
    return p.e;
  } catch (e) { return null; }
}

/* ── Users sheet → profile + scope ────────────────────────────────── */

function loadProfile_(email) {
  const sh = sheetByName_(SpreadsheetApp.openById(CFG.USERS_SHEET_ID), CFG.USERS_TAB, true);
  if (!sh) throw new Error('Users tab not found');
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return null;
  const idx = headerIndex_(values[0]);
  const col = function (names) {
    for (var i = 0; i < names.length; i++) { const c = idx[normKey_(names[i])]; if (c !== undefined) return c; }
    return -1;
  };
  const cEmail = col(['E-mail', 'Email', 'อีเมล']);
  if (cEmail < 0) throw new Error('E-mail column not found in Users sheet');
  const cStatus = col(['Status', 'สถานะ']), cName = col(['ชื่อ - สกุล', 'ชื่อ-สกุล', 'ชื่อสกุล']),
        cNick = col(['ชื่อเล่น', 'Nickname']), cRole = col(['User Role', 'Role']),
        cDept = col(['แผนก', 'Dept']), cComp = col(['บริษัท', 'Company']),
        cW = col(['W', 'สาขา']), cEmp = col(['รหัสพนักงาน', 'Emp ID', 'EmpID']),
        cEval = col(['EvalAccess', 'Eval Access']);

  for (var r = 1; r < values.length; r++) {
    if (normEmail_(values[r][cEmail]) !== email) continue;
    return {
      email: email,
      active: String(cStatus >= 0 ? values[r][cStatus] : '').trim().toLowerCase() === 'active',
      name: cName >= 0 ? values[r][cName] : '',
      nickname: cNick >= 0 ? values[r][cNick] : '',
      role: parseInt(cRole >= 0 ? values[r][cRole] : '1', 10) || 1,
      dept: cDept >= 0 ? values[r][cDept] : '',
      company: cComp >= 0 ? values[r][cComp] : '',
      warehouse: String(cW >= 0 ? values[r][cW] : '').trim(),
      empId: String(cEmp >= 0 ? values[r][cEmp] : '').trim(),
      evalAccess: normEvalAccess_(cEval >= 0 ? values[r][cEval] : ''),
    };
  }
  return null;
}

/* Priority เดียวกับแอพ: SERVER_HR_EMAILS → EvalAccess → role (≥7 all, 4-6 warehouse, <4 self) */
function computeScope_(p) {
  if (SERVER_HR_EMAILS.map(normEmail_).indexOf(p.email) >= 0) return 'all';
  if (p.evalAccess) return p.evalAccess;
  if (p.role >= 7) return 'all';
  if (p.role >= 4) return 'warehouse';
  return 'self';
}

function normEvalAccess_(v) {
  const s = String(v || '').replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim().toLowerCase();
  if (!s) return null;
  if (['all', 'ทั้งหมด', 'admin', 'full', 'any'].indexOf(s) >= 0) return 'all';
  if (['warehouse', 'w', 'สาขา', 'own_warehouse', 'dept', 'own warehouse'].indexOf(s) >= 0) return 'warehouse';
  if (['self', 'own', 'ตัวเอง', 'me', 'own_self'].indexOf(s) >= 0) return 'self';
  return null;
}

/* ── getData: V.1 + New salary กรองสิทธิ์ฝั่ง server ──────────────── */

function getData_(email) {
  const profile = loadProfile_(email);
  if (!profile || !profile.active) return json_({ ok: false, error: 'ACCOUNT_SUSPENDED', code: 401 });
  const scope = computeScope_(profile);

  const ss = SpreadsheetApp.openById(CFG.EVAL_SHEET_ID);

  // — V.1: auto-detect header row (แถวที่มี expected headers ≥3 ตัว ใน 10 แถวแรก) —
  const evalSheet = sheetByName_(ss, CFG.EVAL_TAB, false);
  if (!evalSheet) return json_({ ok: false, error: 'tab not found: ' + CFG.EVAL_TAB });
  const evalValues = evalSheet.getDataRange().getDisplayValues();
  const expected = ['w', 'position', 'dep.', 'name', 'nickname', 'id', 'kpi', 'rtn/way', 'วินัย', 'จิตพิสัย', 'ใบเตือน', 'หมายเหตุ'];
  var headerIdx = 0;
  for (var i = 0; i < Math.min(evalValues.length, 10); i++) {
    const norm = evalValues[i].map(normKey_);
    var hits = 0;
    expected.forEach(function (h) { if (norm.indexOf(h) >= 0) hits++; });
    if (hits >= 3) { headerIdx = i; break; }
  }
  const evalHeaders = evalValues[headerIdx].map(clean_);
  var evalRows = evalValues.slice(headerIdx + 1)
    .filter(function (r) { return r.some(function (c) { return clean_(c); }); })
    .map(function (r) { return rowToObj_(evalHeaders, r); });

  // — scope V.1 —
  const cleanId = function (v) { return String(v || '').trim(); };
  if (scope === 'warehouse') {
    evalRows = evalRows.filter(function (o) { return String(o['W'] || '').trim() === profile.warehouse; });
  } else if (scope === 'self') {
    evalRows = evalRows.filter(function (o) { return cleanId(o['ID']) === profile.empId; });
  }

  // — New salary: header แถว 1 + suffix ชื่อคอลัมน์ซ้ำด้วย column letter (adjust → adjust_M) —
  const salSheet = sheetByName_(ss, CFG.SALARY_TAB, false);
  if (!salSheet) return json_({ ok: false, error: 'tab not found: ' + CFG.SALARY_TAB });
  const salValues = salSheet.getDataRange().getDisplayValues();
  const seen = {};
  const salHeaders = (salValues[0] || []).map(function (h, i) {
    var label = clean_(h) || ('col_' + i);
    seen[label] = (seen[label] || 0) + 1;
    if (seen[label] > 1) label = label + '_' + colLetter_(i);
    return label;
  });
  var salRows = salValues.slice(1)
    .filter(function (r) { return r.some(function (c) { return clean_(c); }); })
    .map(function (r) { return rowToObj_(salHeaders, r); });

  // — scope salary ด้วย allowed IDs จาก V.1 ที่กรองแล้ว (mirror logic ฝั่งแอพ) —
  if (scope !== 'all') {
    const allowed = {};
    evalRows.forEach(function (o) { allowed[cleanId(o['ID'])] = true; });
    // หา key คอลัมน์รหัสในชีทเงินเดือน (B = Emp ID)
    const idKey = salHeaders.filter(function (h) {
      const n = normKey_(h);
      return n === 'emp id' || n === 'id' || n === 'รหัสพนักงาน' || n === 'รหัส' || n === 'empid';
    })[0];
    salRows = idKey ? salRows.filter(function (o) { return allowed[cleanId(o[idKey])]; }) : [];
  }

  return json_({ ok: true, scope: scope, user: profile, eval: evalRows, salary: salRows });
}

/* ── Calibration (contract เดิมจาก v1.x + token) ──────────────────────
   Layout แท็บ Calibration คอลัมน์ A..R:
   A Timestamp | B Round ID | C Saved By Email | D Saved By Name | E Tier
   F Tier Label | G W Filter | H Emp ID | I Name | J Nickname | K W
   L Position | M Department | N Score | O เก่า | P ใหม่ | Q ปรับ(ใช่/ไม่) | R Note
   (คอลัมน์ T ขึ้นไปมีสูตรของผู้ใช้ — ห้ามแตะ) */

function calSheet_() {
  const ss = SpreadsheetApp.openById(CFG.EVAL_SHEET_ID);
  var sh = sheetByName_(ss, CFG.CAL_TAB, false);
  if (!sh) {
    sh = ss.insertSheet(CFG.CAL_TAB);
    sh.appendRow(['Timestamp', 'Round ID', 'Saved By Email', 'Saved By Name', 'Tier', 'Tier Label', 'W Filter',
      'Emp ID', 'Name', 'Nickname', 'W', 'Position', 'Department', 'Score', 'เก่า', 'ใหม่', 'ปรับ', 'Note']);
  }
  return sh;
}

function calSave_(body, email) {
  const rows = body.rows || [];
  if (!rows.length) return json_({ ok: false, error: 'no rows' });

  const sh = calSheet_();
  const now = new Date();
  const ts = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
  const roundId = 'R-' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMdd-HHmmss');

  const out = rows.map(function (r) {
    return [ts, roundId,
      email,                                 // ใช้ email จาก token — ไม่เชื่อ client
      String(body.savedByName || ''),
      String(body.tier || ''), String(body.tierLabel || ''), String(body.wFilter || ''),
      String(r.empId || ''), String(r.name || ''), String(r.nickname || ''), String(r.w || ''),
      String(r.position || ''), String(r.dep || ''), String(r.score != null ? r.score : ''),
      String(r.autoGrade || ''), String(r.finalGrade || ''),
      r.manualOverride ? 'ใช่' : 'ไม่', String(body.note || '')];
  });
  sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);

  return json_({ ok: true, timestamp: ts, roundId: roundId, rowsSaved: out.length });
}

function calRounds_() {
  const sh = calSheet_();
  const values = sh.getDataRange().getDisplayValues();
  const rounds = {};   // roundId → round object
  for (var i = 1; i < values.length; i++) {
    const v = values[i];
    const roundId = String(v[1] || '').trim();
    if (!roundId) continue;
    if (!rounds[roundId]) {
      rounds[roundId] = {
        roundId: roundId, timestamp: v[0], savedByEmail: v[2], savedByName: v[3],
        tier: v[4], tierLabel: v[5], wFilter: v[6], note: v[17] || '', rows: []
      };
    }
    if (!rounds[roundId].note && v[17]) rounds[roundId].note = v[17];
    rounds[roundId].rows.push({
      empId: String(v[7] || ''), name: v[8], nickname: v[9], w: v[10], position: v[11], dep: v[12],
      score: v[13], autoGrade: v[14], finalGrade: v[15],
      manualOverride: String(v[16] || '').trim() === 'ใช่'
    });
  }
  return Object.keys(rounds).map(function (k) { return rounds[k]; })
    .sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); });
}

function calLatest_() {
  const list = calRounds_();
  const data = {};   // tier → round ล่าสุด
  list.forEach(function (r) { if (!data[r.tier]) data[r.tier] = r; });
  return json_({ ok: true, data: data });
}

function calHistory_() {
  const list = calRounds_().map(function (r) {
    r.count = r.rows.length;
    return r;
  });
  return json_({ ok: true, data: list });
}

/* ── Utils ────────────────────────────────────────────────────────── */

/* v2.1: หาแท็บแบบทนทาน — exact → เทียบแบบ normalize (trim/case-insensitive) →
   ถ้า fallbackFirst=true คืนแท็บแรก (เลียนแบบพฤติกรรม gviz ที่แอพพึ่งพามาตลอด) */
function sheetByName_(ss, name, fallbackFirst) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  const want = normKey_(name);
  const all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (normKey_(all[i].getName()) === want) return all[i];
  }
  return fallbackFirst ? all[0] : null;
}

function clean_(s) {
  return String(s == null ? '' : s).replace(/[\u200B\u200C\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ').trim();
}
function normKey_(s) { return clean_(s).toLowerCase().replace(/\s+/g, ' '); }
function normEmail_(s) { return String(s || '').replace(/[\u200B\u200C\u200D\uFEFF]/g, '').replace(/\s+/g, '').toLowerCase(); }
function headerIndex_(row) {
  const idx = {};
  row.forEach(function (h, i) { const k = normKey_(h); if (k && idx[k] === undefined) idx[k] = i; });
  return idx;
}
function rowToObj_(headers, r) {
  const o = {};
  headers.forEach(function (h, i) { if (h) o[h] = clean_(r[i]); });
  return o;
}
function colLetter_(i) {
  var s = '';
  i = i + 1;
  while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
