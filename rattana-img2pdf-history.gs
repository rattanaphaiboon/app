// Rattana Scanner — หลังบ้านประวัติการสแกน + เก็บไฟล์ใน Google Drive + โฟลเดอร์ของผู้ใช้
// deploy: Deploy → Manage deployments → ✏️ → Version: New version → Deploy
//         (Execute as: Me / Who has access: Anyone)
//
// เช็กว่า deploy เวอร์ชันใหม่แล้วจริงไหม: เปิด URL ต่อท้าย ?action=ping
//   ต้องเห็น {"ok":true,"version":"5.6", ...} ถ้าเห็นเวอร์ชันเก่า/ไม่มี version = ยัง deploy ไม่ติด

var VERSION = '5.6';
var FOLDER_NAME = 'Rattana Scanner Files';
var SHARED_FOLDER_NAME = 'ส่วนกลาง (ทุกคนเห็นได้)';
var RETENTION_DAYS = 90;
var SHEET_NAME = 'Sheet1';
var FOLDER_SHEET_NAME = 'Folders';

// ตำแหน่งคอลัมน์ตายตัว (1-based) — ไม่อ่านจากหัวตารางอีกแล้ว
// เดิมโค้ดใช้ headers.indexOf('fileId') ซึ่งพังถ้าหัวตารางคอลัมน์ G ว่าง/เพี้ยน
// ทำให้ปุ่มดาวน์โหลดในประวัติใช้ไม่ได้ทั้งที่ไฟล์อยู่ใน Drive ครบ
var C_TIMESTAMP = 1, C_EMPID = 2, C_NAME = 3, C_FILENAME = 4, C_PAGES = 5, C_SIZEKB = 6,
    C_FILEID = 7, C_TYPE = 8, C_FOLDERID = 9, C_FOLDERNAME = 10;
var N_COLS = 10;
// หัวตารางเขียนเป็นภาษาคนอ่านได้ เพราะโค้ดอ้างด้วยเลขคอลัมน์ ไม่ได้พึ่งข้อความหัวตาราง
var HEADERS = ['เวลา', 'รหัสพนักงาน', 'ชื่อผู้ทำ', 'ชื่อไฟล์', 'จำนวนหน้า', 'ขนาด (KB)',
               'Drive File ID', 'หมวดงาน', 'รหัสโฟลเดอร์', 'ชื่อโฟลเดอร์'];

// ทะเบียนโฟลเดอร์ (แท็บ Folders) — เก็บว่าใครเป็นเจ้าของ สร้างเมื่อไหร่ ใครเห็นได้บ้าง
var F_ID = 1, F_NAME = 2, F_OWNER_ID = 3, F_OWNER_NAME = 4, F_CREATED = 5, F_VISIBILITY = 6, F_DRIVE_ID = 7, F_LINK = 8, F_LINKED = 9, F_MEMBERS = 10;
var F_COLS = 10;
// หัวตารางเขียนเป็นภาษาคนอ่านได้ เพราะโค้ดอ้างด้วยเลขคอลัมน์ ไม่ได้พึ่งข้อความหัวตาราง
var F_HEADERS = ['รหัสโฟลเดอร์', 'ชื่อโฟลเดอร์', 'รหัสเจ้าของ', 'ชื่อเจ้าของ', 'สร้างเมื่อ',
                 'สิทธิ (private=เฉพาะเจ้าของ / all=ทุกคนเห็น)', 'Drive ID', 'เปิดโฟลเดอร์',
                 'ชนิด (linked = โฟลเดอร์เดิมใน Drive ที่เอามาเชื่อม)',
                 'คนที่เห็นได้ (เฉพาะสิทธิ some — คั่นด้วยจุลภาค)'];

function json_(obj) {
  obj.version = VERSION;
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder_() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
}

// ---------- โครงสร้างใน Drive ----------
//   Rattana Scanner Files /
//     ส่วนกลาง (ทุกคนเห็นได้) /
//        ใบลา /                    <- โฟลเดอร์ที่ตั้งสิทธิเป็น "ทุกคนเห็นได้"
//     12345 - สมชาย ใจดี /          <- โฟลเดอร์ประจำตัว สร้างอัตโนมัติจากรหัสพนักงาน
//        ใบเสร็จของฉัน /            <- โฟลเดอร์ที่ตั้งสิทธิเป็น "เห็นเฉพาะฉัน"
//        (ไฟล์ที่ไม่ได้เลือกโฟลเดอร์ อยู่ชั้นนี้)

// ชื่อโฟลเดอร์ห้ามมีอักขระที่ Drive ใช้ไม่ได้ และห้ามยาวเกินจนอ่านไม่รู้เรื่อง
function safeFolderName_(s) {
  return String(s || '').replace(/[\/\\:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function userFolderName_(empId, name) {
  var id = safeFolderName_(empId);
  var nm = safeFolderName_(name);
  if (id && nm) return id + ' - ' + nm;
  return id || nm || 'ไม่ระบุตัวตน';
}

function childFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// จำ id โฟลเดอร์ประจำตัวไว้ใน Script Properties — ถ้าวันหลังชื่อพนักงานในชีตเปลี่ยน
// จะได้ใช้โฟลเดอร์เดิมต่อ ไม่สร้างโฟลเดอร์ใหม่ทิ้งไฟล์เก่าไว้คนละที่
function getUserFolder_(empId, name) {
  var id = String(empId || '').trim();
  if (!id) throw new Error('empId required');
  var props = PropertiesService.getScriptProperties();
  var key = 'uf_' + id;
  var cached = props.getProperty(key);
  if (cached) {
    try {
      var f = DriveApp.getFolderById(cached);
      if (!f.isTrashed()) return f;
    } catch (e) { /* โฟลเดอร์ถูกลบไปแล้ว ตกไปสร้างใหม่ข้างล่าง */ }
  }
  var folder = childFolder_(getOrCreateFolder_(), userFolderName_(id, name));
  props.setProperty(key, folder.getId());
  return folder;
}

function getSharedRoot_() {
  return childFolder_(getOrCreateFolder_(), SHARED_FOLDER_NAME);
}

// ---------- ทะเบียนโฟลเดอร์ ----------
function getFolderSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FOLDER_SHEET_NAME) || ss.insertSheet(FOLDER_SHEET_NAME);
  var current = sheet.getRange(1, 1, 1, F_COLS).getValues()[0];
  var same = F_HEADERS.every(function (h, i) { return current[i] === h; });
  if (!same) { sheet.getRange(1, 1, 1, F_COLS).setValues([F_HEADERS]); formatFolderSheet_(sheet); }
  return sheet;
}

// จัดหน้าตาแท็บให้อ่านรู้เรื่องตอนเปิดดูในชีต (ทำครั้งเดียวตอนเขียนหัวตาราง)
function formatFolderSheet_(sheet) {
  try {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, F_COLS).setFontWeight('bold').setBackground('#0d1b3e').setFontColor('#ffffff');
    var widths = [150, 200, 180, 170, 160, 250, 190, 110, 260, 300];
    for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
  } catch (e) { /* จัดรูปแบบไม่ได้ก็ไม่เป็นไร ข้อมูลสำคัญกว่า */ }
}

// แถวทะเบียน 1 แถว — คอลัมน์สุดท้ายเป็นลิงก์กดเปิดโฟลเดอร์ใน Drive ได้เลย
function folderRowValues_(id, name, ownerId, ownerName, createdAt, visibility, driveId, linked, members) {
  return [id, name, ownerId, ownerName, createdAt, visibility, driveId,
    // เขียน URL ตรง ๆ ไม่ใช้สูตร HYPERLINK เพราะตัวคั่นอาร์กิวเมนต์ (, หรือ ;) ต่างกันตามภาษาของชีต
    // แล้วจะกลายเป็นสูตรพัง · ชีตแปลง URL เป็นลิงก์กดได้ให้เองอยู่แล้ว
    driveId ? 'https://drive.google.com/drive/folders/' + driveId : '',
    linked ? 'linked' : '',
    membersToText_(members)];
}

function readFolderRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, F_COLS).getValues();
}

function folderRowToObj_(r) {
  return {
    id: String(r[F_ID - 1] || ''),
    name: String(r[F_NAME - 1] || ''),
    ownerEmpId: String(r[F_OWNER_ID - 1] || ''),
    ownerName: String(r[F_OWNER_NAME - 1] || ''),
    createdAt: r[F_CREATED - 1] instanceof Date ? r[F_CREATED - 1].toISOString() : String(r[F_CREATED - 1] || ''),
    visibility: String(r[F_VISIBILITY - 1] || 'private'),
    driveFolderId: String(r[F_DRIVE_ID - 1] || ''),
    linked: String(r[F_LINKED - 1] || '') === 'linked',
    members: textToMembers_(r[F_MEMBERS - 1]),
  };
}

function allFolders_() {
  return readFolderRows_(getFolderSheet_()).map(folderRowToObj_).filter(function (f) { return !!f.id; });
}

// รายชื่อคนที่เห็นได้ เก็บเป็นรหัสพนักงานคั่นด้วยจุลภาค — ตัดซ้ำและตัดช่องว่างให้เรียบร้อย
function textToMembers_(v) {
  return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
}
function membersToText_(list) {
  if (!list) return '';
  var arr = Array.isArray(list) ? list : textToMembers_(list);
  var seen = {}, out = [];
  for (var i = 0; i < arr.length; i++) {
    var v = String(arr[i] || '').trim();
    if (!v || seen[v]) continue;
    seen[v] = true; out.push(v);
  }
  return out.join(',');
}

// สิทธิมี 3 แบบ: private = เฉพาะเจ้าของ · some = เฉพาะคนในรายชื่อ · all = ทุกคน
function normVisibility_(v) {
  return v === 'all' ? 'all' : (v === 'some' ? 'some' : 'private');
}

function folderAllows_(f, empId) {
  if (f.ownerEmpId === empId) return true;
  if (f.visibility === 'all') return true;
  if (f.visibility === 'some') return f.members.indexOf(empId) >= 0;
  return false;
}

// เห็นได้ = โฟลเดอร์ของตัวเอง + ของคนอื่นที่เปิดให้ทุกคน หรือที่ใส่ชื่อเราไว้
function visibleFolders_(empId) {
  return allFolders_().filter(function (f) {
    return folderAllows_(f, empId);
  }).sort(function (a, b) {
    if (a.visibility !== b.visibility) return a.visibility === 'all' ? 1 : -1;
    return a.name.localeCompare(b.name, 'th');
  });
}

function folderById_(id) {
  var list = allFolders_();
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

// ใช้เก็บไฟล์ได้ไหม — กติกาเดียวกับการมองเห็น
function canUseFolder_(f, empId) {
  return !!f && folderAllows_(f, empId);
}

// รับได้ทั้งลิงก์เต็ม (.../folders/XXX?usp=...) ลิงก์แบบ ?id=XXX หรือวาง id มาเปล่า ๆ
function parseDriveFolderId_(s) {
  var t = String(s || '').trim();
  var m = t.match(/\/folders\/([A-Za-z0-9_-]{10,})/) ||
          t.match(/[?&]id=([A-Za-z0-9_-]{10,})/) ||
          t.match(/^([A-Za-z0-9_-]{10,})$/);
  return m ? m[1] : '';
}

// เชื่อมโฟลเดอร์ที่มีอยู่แล้วใน Drive เข้ามาใช้ในแอป (ไม่ได้ย้ายหรือก๊อปอะไร แค่ชี้ไป)
function linkFolder_(empId, ownerName, rawUrl, visibility, members) {
  var driveId = parseDriveFolderId_(rawUrl);
  if (!driveId) return { ok: false, error: 'ลิงก์ไม่ถูกต้อง — ต้องเป็นลิงก์โฟลเดอร์ของ Google Drive' };

  var folder;
  try {
    folder = DriveApp.getFolderById(driveId);
    if (folder.isTrashed()) return { ok: false, error: 'โฟลเดอร์นี้อยู่ในถังขยะ' };
  } catch (e) {
    // สคริปต์ทำงานในนามบัญชีที่ deploy ไว้ ถ้าโฟลเดอร์ไม่ได้แชร์ให้บัญชีนั้นก็เปิดไม่ได้
    var who = '';
    try { who = Session.getEffectiveUser().getEmail(); } catch (e2) {}
    return { ok: false, error: 'เปิดโฟลเดอร์นี้ไม่ได้ — แชร์โฟลเดอร์ให้ ' + (who || 'บัญชีที่ deploy สคริปต์') + ' (สิทธิ Editor) ก่อน แล้วลองใหม่' };
  }

  var dup = allFolders_();
  for (var i = 0; i < dup.length; i++) {
    if (dup[i].driveFolderId === driveId) return { ok: false, error: 'โฟลเดอร์นี้ถูกเพิ่มไว้แล้ว ("' + dup[i].name + '")' };
  }

  var vis = normVisibility_(visibility);
  var mem = vis === 'some' ? membersToText_(members) : '';
  if (vis === 'some' && !mem) return { ok: false, error: 'เลือกคนที่จะให้เห็นอย่างน้อย 1 คน' };
  var id = newFolderId_();
  var created;
  try { created = folder.getDateCreated().toISOString(); } catch (e3) { created = new Date().toISOString(); }
  getFolderSheet_().appendRow(folderRowValues_(id, folder.getName(), empId, String(ownerName || ''), created, vis, driveId, true, mem));
  return { ok: true, folder: { id: id, name: folder.getName(), ownerEmpId: empId, ownerName: String(ownerName || ''),
    createdAt: created, visibility: vis, driveFolderId: driveId, linked: true, members: textToMembers_(mem) } };
}

function newFolderId_() {
  return 'f' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
}

// ---------- ดึงโฟลเดอร์ที่คนไปสร้างเองใน Google Drive เข้าทะเบียน ----------
// ถ้าไม่ทำ คนที่เข้าไปสร้างโฟลเดอร์ใน Drive เองแล้วกลับมาเปิดแอปจะไม่เห็นโฟลเดอร์นั้นเลย
// (เจอปัญหานี้จริงตอนใช้งานรอบแรก) · เรียกทุกครั้งที่ขอรายการโฟลเดอร์
function pruneDeadFolders_(sheet) {
  var rows = readFolderRows_(sheet);
  for (var i = rows.length - 1; i >= 0; i--) {
    var did = String(rows[i][F_DRIVE_ID - 1] || '');
    if (!did) continue;
    var gone = false;
    try { if (DriveApp.getFolderById(did).isTrashed()) gone = true; } catch (e) { gone = true; }
    if (gone) sheet.deleteRow(i + 2);   // โฟลเดอร์ถูกลบใน Drive แล้ว เอาออกจากทะเบียนด้วย
  }
}

function syncDriveFolders_(empId, name) {
  var sheet = getFolderSheet_();
  pruneDeadFolders_(sheet);
  var known = {};
  readFolderRows_(sheet).forEach(function (r) { known[String(r[F_DRIVE_ID - 1])] = true; });
  var added = 0;
  function scan(parent, visibility, ownerId, ownerName) {
    var it = parent.getFolders();
    while (it.hasNext()) {
      var f = it.next();
      if (f.isTrashed() || known[f.getId()]) continue;
      // โฟลเดอร์ส่วนกลางที่สร้างมือไม่รู้ว่าใครทำ จึงไม่ผูกเจ้าของ = ลบจากในแอปไม่ได้ (ลบใน Drive เอา)
      sheet.appendRow(folderRowValues_(newFolderId_(), f.getName(), ownerId, ownerName, f.getDateCreated().toISOString(), visibility, f.getId(), false, ''));
      known[f.getId()] = true;
      added++;
    }
  }
  scan(getUserFolder_(empId, name), 'private', empId, String(name || ''));
  scan(getSharedRoot_(), 'all', '', 'สร้างใน Google Drive');
  return added;
}

function createFolder_(empId, ownerName, rawName, visibility, members) {
  var name = safeFolderName_(rawName);
  if (!name) return { ok: false, error: 'ชื่อโฟลเดอร์ใช้ไม่ได้' };
  var vis = normVisibility_(visibility);
  var mem = vis === 'some' ? membersToText_(members) : '';
  if (vis === 'some' && !mem) return { ok: false, error: 'เลือกคนที่จะให้เห็นอย่างน้อย 1 คน' };

  // ชื่อซ้ำ: ของตัวเองห้ามซ้ำกับของตัวเอง · ส่วนกลางห้ามซ้ำกับส่วนกลาง
  var dup = allFolders_().filter(function (f) {
    if (f.name !== name) return false;
    return vis === 'all' ? f.visibility === 'all' : f.ownerEmpId === empId && f.visibility !== 'all';
  });
  if (dup.length) return { ok: false, error: 'มีโฟลเดอร์ชื่อนี้อยู่แล้ว' };

  var parent = vis === 'all' ? getSharedRoot_() : getUserFolder_(empId, ownerName);
  // ชื่อโฟลเดอร์จริงใน Drive เติมรหัสไว้กันชนกันเมื่อคนละคนตั้งชื่อเดียวกันในส่วนกลาง
  var driveName = vis === 'all' ? name : name;
  var driveFolder = parent.createFolder(driveName);

  var id = newFolderId_();
  getFolderSheet_().appendRow(folderRowValues_(id, name, empId, String(ownerName || ''), new Date().toISOString(), vis, driveFolder.getId(), false, mem));
  return { ok: true, folder: { id: id, name: name, ownerEmpId: empId, ownerName: String(ownerName || ''), createdAt: new Date().toISOString(), visibility: vis, driveFolderId: driveFolder.getId(), linked: false, members: textToMembers_(mem) } };
}

// เปลี่ยนสิทธิ / แก้รายชื่อคนที่เห็นได้ ภายหลัง — เจ้าของเท่านั้น
function setFolderAccess_(id, empId, visibility, members) {
  var sheet = getFolderSheet_();
  var rows = readFolderRows_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][F_ID - 1]) !== id) continue;
    var f = folderRowToObj_(rows[i]);
    if (f.ownerEmpId !== empId) return { ok: false, error: 'not authorized' };
    var vis = normVisibility_(visibility);
    var mem = vis === 'some' ? membersToText_(members) : '';
    if (vis === 'some' && !mem) return { ok: false, error: 'เลือกคนที่จะให้เห็นอย่างน้อย 1 คน' };
    sheet.getRange(i + 2, F_VISIBILITY).setValue(vis);
    sheet.getRange(i + 2, F_MEMBERS).setValue(mem);
    return { ok: true, folderId: id, visibility: vis, members: textToMembers_(mem) };
  }
  return { ok: false, error: 'not found' };
}

// ลบได้เฉพาะเจ้าของ และเฉพาะโฟลเดอร์ที่ว่างเปล่า กันเผลอลบไฟล์ทั้งกอง
function deleteFolder_(id, empId) {
  var sheet = getFolderSheet_();
  var rows = readFolderRows_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][F_ID - 1]) !== id) continue;
    var f = folderRowToObj_(rows[i]);
    if (f.ownerEmpId !== empId) return { ok: false, error: 'not authorized' };
    // โฟลเดอร์ที่เอามาเชื่อมเป็นของเดิมใน Drive ของผู้ใช้ — เอาออกจากทะเบียนเฉย ๆ ห้ามลบไฟล์เด็ดขาด
    if (f.linked) { sheet.deleteRow(i + 2); return { ok: true, deleted: id, unlinked: true }; }
    if (f.driveFolderId) {
      try {
        var df = DriveApp.getFolderById(f.driveFolderId);
        if (df.getFiles().hasNext() || df.getFolders().hasNext()) return { ok: false, error: 'not empty' };
        df.setTrashed(true);
      } catch (e) { /* โฟลเดอร์หายไปแล้ว ลบทะเบียนทิ้งได้เลย */ }
    }
    sheet.deleteRow(i + 2);
    return { ok: true, deleted: id };
  }
  return { ok: false, error: 'not found' };
}

// ไฟล์ในโฟลเดอร์ร่วม ไม่ได้อยู่ในประวัติของคนที่กดดู จึงต้องเช็กสิทธิจาก "โฟลเดอร์แม่" แทน
function fileInAllowedFolder_(fileId, empId) {
  var allowed = {};
  try { allowed[getUserFolder_(empId, '').getId()] = true; } catch (e) {}
  var vis = visibleFolders_(empId);
  for (var i = 0; i < vis.length; i++) if (vis[i].driveFolderId) allowed[vis[i].driveFolderId] = true;
  try {
    var parents = DriveApp.getFileById(fileId).getParents();
    while (parents.hasNext()) if (allowed[parents.next().getId()]) return true;
  } catch (e) {}
  return false;
}

// รายการไฟล์ในโฟลเดอร์ — ใหม่สุดก่อน · folderId ว่าง = โฟลเดอร์หลักของตัวเอง
function listFolderFiles_(empId, ownerName, folderId) {
  var target = null, fname = 'โฟลเดอร์หลักของฉัน';
  if (folderId) {
    var fo = folderById_(folderId);
    if (!canUseFolder_(fo, empId)) return { ok: false, error: 'not allowed' };
    fname = fo.name;
    try { target = DriveApp.getFolderById(fo.driveFolderId); } catch (e) { target = null; }
  } else {
    try { target = getUserFolder_(empId, ownerName); } catch (e) { target = null; }
  }
  if (!target) return { ok: false, error: 'not found' };
  var it = target.getFiles(), out = [];
  while (it.hasNext() && out.length < 150) {
    var f = it.next();
    var size = 0;
    try { size = Math.round(f.getSize() / 1024); } catch (e) {}
    out.push({ id: f.getId(), name: f.getName(), sizeKB: size, createdAt: f.getDateCreated().toISOString() });
  }
  out.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { ok: true, folderName: fname, files: out };
}

// ---------- ประวัติ ----------
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  // เขียนหัวตารางไว้ให้คนอ่านเข้าใจ — โค้ดไม่ได้พึ่งค่านี้แล้ว
  var current = sheet.getRange(1, 1, 1, N_COLS).getValues()[0];
  var same = HEADERS.every(function (h, i) { return current[i] === h; });
  if (!same) sheet.getRange(1, 1, 1, N_COLS).setValues([HEADERS]);
  return sheet;
}

function readRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, N_COLS).getValues();
}

function rowToObj_(r) {
  return {
    timestamp: r[C_TIMESTAMP - 1] instanceof Date ? r[C_TIMESTAMP - 1].toISOString() : String(r[C_TIMESTAMP - 1] || ''),
    empId: String(r[C_EMPID - 1] || ''),
    name: String(r[C_NAME - 1] || ''),
    filename: String(r[C_FILENAME - 1] || ''),
    pages: r[C_PAGES - 1],
    sizeKB: r[C_SIZEKB - 1],
    fileId: String(r[C_FILEID - 1] || ''),
    type: String(r[C_TYPE - 1] || ''),             // หมวดงานที่สร้างไฟล์นี้ (scan / merge / split / watermark)
    folderId: String(r[C_FOLDERID - 1] || ''),
    folderName: String(r[C_FOLDERNAME - 1] || ''), // เก็บชื่อไว้ด้วย ประวัติจะได้ยังอ่านออกแม้โฟลเดอร์ถูกลบไปแล้ว
  };
}

// ลบแถว (พร้อมไฟล์ใน Drive) ที่เก่ากว่า RETENTION_DAYS — เรียกทุกครั้งที่บันทึก
// จะได้ไม่ต้องตั้ง time-driven trigger แยก
function cleanupOldEntries_(sheet) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  var rows = readRows_(sheet);
  for (var i = rows.length - 1; i >= 0; i--) {
    var ts = new Date(rows[i][C_TIMESTAMP - 1]);
    if (!isNaN(ts.getTime()) && ts < cutoff) {
      var fid = rows[i][C_FILEID - 1];
      if (fid) { try { DriveApp.getFileById(String(fid)).setTrashed(true); } catch (e) {} }
      sheet.deleteRow(i + 2); // +2 = ข้ามหัวตาราง + index 0-based
    }
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var empId = String(data.empId || '').trim();
    if (!empId) return json_({ ok: false, error: 'empId required' });

    // ลบรายการเดียวออกจากประวัติ (เจ้าของเท่านั้น)
    if (data.action === 'delete') {
      var sheetD = getSheet_();
      var rowsD = readRows_(sheetD);
      var wantId = String(data.fileId || '');
      for (var i = 0; i < rowsD.length; i++) {
        if (String(rowsD[i][C_FILEID - 1]) === wantId && wantId) {
          if (String(rowsD[i][C_EMPID - 1]) !== empId) return json_({ ok: false, error: 'not authorized' });
          try { DriveApp.getFileById(wantId).setTrashed(true); } catch (err2) {}
          sheetD.deleteRow(i + 2);
          return json_({ ok: true, deleted: wantId });
        }
      }
      return json_({ ok: false, error: 'not found' });
    }

    if (data.action === 'newFolder') {
      var made = createFolder_(empId, data.name, data.folderName, data.visibility, data.members);
      if (!made.ok) return json_(made);
      return json_({ ok: true, folder: made.folder, folders: visibleFolders_(empId) });
    }

    if (data.action === 'linkFolder') {
      var linked = linkFolder_(empId, data.name, data.folderUrl, data.visibility, data.members);
      if (!linked.ok) return json_(linked);
      return json_({ ok: true, folder: linked.folder, folders: visibleFolders_(empId) });
    }

    if (data.action === 'setFolderAccess') {
      var acc = setFolderAccess_(String(data.folderId || ''), empId, data.visibility, data.members);
      if (!acc.ok) return json_(acc);
      return json_({ ok: true, folderId: acc.folderId, folders: visibleFolders_(empId) });
    }

    if (data.action === 'deleteFolder') {
      var del = deleteFolder_(String(data.folderId || ''), empId);
      if (!del.ok) return json_(del);
      return json_({ ok: true, deleted: del.deleted, unlinked: !!del.unlinked, folders: visibleFolders_(empId) });
    }

    // บันทึกไฟล์ + ลงประวัติ
    var sheet = getSheet_();
    var folderId = String(data.folderId || '').trim();
    var target = null, folderName = '';
    if (folderId) {
      var fObj = folderById_(folderId);
      if (!canUseFolder_(fObj, empId)) return json_({ ok: false, error: 'folder not allowed' });
      folderName = fObj.name;
      try { target = DriveApp.getFolderById(fObj.driveFolderId); } catch (e2) { target = null; }
    }
    if (!target) { target = getUserFolder_(empId, data.name); folderId = ''; folderName = ''; }

    var fileId = '';
    if (data.fileBase64) {
      var blob = Utilities.newBlob(Utilities.base64Decode(data.fileBase64), 'application/pdf', data.filename || 'scan.pdf');
      fileId = target.createFile(blob).getId();
    }
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      empId,
      data.name || '',
      data.filename || '',
      data.pages || '',
      data.sizeKB || '',
      fileId,
      String(data.type || ''),
      folderId,
      folderName,
    ]);
    cleanupOldEntries_(sheet);
    return json_({ ok: true, fileId: fileId, folderId: folderId, folderName: folderName });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// GET ?action=ping                        -> เช็กว่า deploy เวอร์ชันไหนอยู่
// GET ?action=folders&empId=123           -> { ok:true, folders:[...] } โฟลเดอร์ที่คนนี้เห็นได้
// GET ?empId=123                          -> { ok:true, rows:[...] } ประวัติของตัวเอง ใหม่สุดก่อน สูงสุด 30
// GET ?action=file&fileId=X&empId=123     -> { ok:true, fileBase64, filename } เฉพาะเมื่อ empId ตรงกับเจ้าของแถวนั้น
//                                            ของคนอื่นดึงไม่ได้แม้จะเดา fileId ถูก
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};

    if (params.action === 'ping') {
      var sheetP = getSheet_();
      return json_({ ok: true, rowCount: Math.max(0, sheetP.getLastRow() - 1), lastColumn: sheetP.getLastColumn(), folders: true });
    }

    // ทุก endpoint ต้องมี empId เสมอ — เปิด URL เปล่า ๆ ต้องไม่เห็นเอกสารของใครเลย
    var empId = String(params.empId || '').trim();
    if (!empId) return json_({ ok: false, error: 'empId required' });

    if (params.action === 'files') {
      return json_(listFolderFiles_(empId, params.name, String(params.folderId || '')));
    }

    if (params.action === 'folders') {
      var added = syncDriveFolders_(empId, params.name);
      return json_({ ok: true, folders: visibleFolders_(empId), picked: added });
    }

    var sheet = getSheet_();
    var rows = readRows_(sheet);

    if (params.action === 'file') {
      var fileId = String(params.fileId || '');
      var hit = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][C_FILEID - 1]) === fileId && fileId) { hit = rows[i]; break; }
      }
      // ไฟล์ของตัวเองในประวัติ → ผ่าน · ไม่ใช่ → ต้องอยู่ในโฟลเดอร์ที่คนนี้เข้าถึงได้
      var mine = hit && String(hit[C_EMPID - 1]) === empId;
      if (!mine && !fileInAllowedFolder_(fileId, empId)) return json_({ ok: false, error: 'not found or not authorized' });
      var file = DriveApp.getFileById(fileId);
      var fname2 = mine ? String(hit[C_FILENAME - 1] || 'scan.pdf') : file.getName();
      return json_({ ok: true, fileBase64: Utilities.base64Encode(file.getBlob().getBytes()), filename: fname2 });
    }

    var out = rows
      .map(rowToObj_)
      .filter(function (r) { return r.empId === empId; })
      .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
      .slice(0, 30);
    return json_({ ok: true, rows: out });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
