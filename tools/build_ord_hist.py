# -*- coding: utf-8 -*-
"""สร้าง dq-ord-hist.json = ประวัติลำดับร้านที่คนขับวิ่งจริง (delivery-queue-app ใช้เรียงร้านตอนจัดรถ/พรีปลีก)

รันอัตโนมัติทุกสัปดาห์โดย .github/workflows/ord-hist-weekly.yml (หรือรันเองได้: python tools/build_ord_hist.py)
แหล่งข้อมูล (ชีทแชร์ลิงก์ อ่านได้ไม่ต้องล็อกอิน):
  - GPS Cartrack แท็บ "ทริป": เที่ยว = ออกคลัง -> กลับคลัง · ลำดับร้าน = ลำดับกรอบ (geofence) ที่ไปถึง
  - D-MAN บิล: ลำดับตามเวลาส่ง ต่อใบคุม (ตัดคันที่ลำดับ D-MAN ไม่ตรง GPS)
ผล: {v, from, to, codes:[รหัสร้าน], p:[i,j,n,...]} n = จำนวนครั้งที่ร้าน i ไปก่อนร้าน j ในเที่ยวเดียวกัน
ข้อมูลน้อยผิดปกติ (โหลดไม่ครบ) = ไม่เขียนทับไฟล์เดิม แล้วจบด้วย error
"""
import csv, io, json, os, re, sys, collections, datetime, urllib.request, urllib.parse

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dq-ord-hist.json')
CT_URL = 'https://docs.google.com/spreadsheets/d/1mMs07cjO0S6L_7VfC9bDjTqyReFYyj5rYGB2TaFW7N8/export?format=csv&gid=1157696098'
DM_URLS = [
    # D-MAN ปัจจุบัน (แท็บบิล)
    'https://docs.google.com/spreadsheets/d/1HoyuILDm8aOrUaLjo1YFbfZOoEiejaxRhh1ahR79Oeo/export?format=csv&gid=2124504832',
]
DM_BACKUP_IDS = [   # คลังสำรอง D-MAN รายเดือน (โฟลเดอร์ De-man2569) แท็บ "บันทึกบิลและการชำระ" — เดือน 1–7 ใช้ไม่ได้
    '1sPaOLQrfCks8BjtqXjeQqWqtrps5TZtqIT78P_IbD5c',   # 8/69
    '1gDw2kinK1O5qn45HUbBc929lYxwwfvESFiFvoDlSUiM',   # 9/69
]
DM_BAD_PLATES = {'807210', '808425', '807447', '806893', '807181'}   # ลำดับใน D-MAN ไม่ตรง GPS (วัด 9–23 ต.ค. 2026)
WINDOW_DAYS = 180


def fetch_csv(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return list(csv.reader(io.StringIO(r.read().decode('utf-8'))))


def when(s):
    m = re.match(r'(\d+)-(\d+)-(\d+) (\d+):(\d+)', s or '')
    if not m:
        return None, None
    return '%s-%02d-%02d' % (m.group(1), int(m.group(2)), int(m.group(3))), int(m.group(4)) * 60 + int(m.group(5))


def is_wh(name):
    return bool(re.search(u'W\\d|รัตน', name or ''))


def cartrack_trips(rows):
    H = rows[0]; ix = H.index
    by = collections.defaultdict(list)
    for x in rows[1:]:
        if not x or not x[0].strip():
            continue
        d, b = when(x[ix(u'เวลาเริ่มต้น')])
        if not d:
            continue
        by[(x[0].strip(), d)].append((b, x[ix(u'กรอบเริ่มต้น')], x[ix(u'กรอบสิ้นสุด')], x[ix(u'รหัสกรอบสิ้นสุด')].strip()))
    trips = []
    for (pl, d), S in by.items():
        S.sort(); cur = None
        for b, fn, tn, tc in S:
            if is_wh(fn) and not is_wh(tn):
                cur = []; trips.append((d, cur))
            if cur is not None and tc and not is_wh(tn) and tc not in cur:
                cur.append(tc)
    return [t for t in trips if len(t[1]) >= 2]


def dman_trips(rows):
    if not rows:
        return []
    H = rows[0]
    need = [u'วัน+เวลา ที่ส่งสินค้า', u'ทะเบียนรถ', u'เลขใบคุม', u'Customer_Code']
    if not all(h in H for h in need):
        print('  ข้าม: หัวคอลัมน์ไม่ครบ', file=sys.stderr); return []
    ix = H.index
    dm = collections.defaultdict(dict)
    for x in rows[1:]:
        d, t = when(x[ix(u'วัน+เวลา ที่ส่งสินค้า')]); pl = x[ix(u'ทะเบียนรถ')].strip()
        if not d or pl in DM_BAD_PLATES:
            continue
        k = (pl, d, x[ix(u'เลขใบคุม')]); c = x[ix(u'Customer_Code')].strip()
        if c and (c not in dm[k] or t < dm[k][c]):
            dm[k][c] = t
    return [(k[1], [c for c, _ in sorted(v.items(), key=lambda z: z[1])]) for k, v in dm.items() if len(v) >= 2]


def main():
    ct = cartrack_trips(fetch_csv(CT_URL))
    print('Cartrack เที่ยว', len(ct))
    dm = []
    for u in DM_URLS:
        try:
            t = dman_trips(fetch_csv(u)); dm += t; print('D-MAN', len(t), 'ใบคุม')
        except Exception as e:
            print('  D-MAN โหลดไม่ได้', e, file=sys.stderr)
    for sid in DM_BACKUP_IDS:
        u = 'https://docs.google.com/spreadsheets/d/%s/gviz/tq?tqx=out:csv&headers=1&sheet=%s' % (sid, urllib.parse.quote(u'บันทึกบิลและการชำระ'))
        try:
            t = dman_trips(fetch_csv(u)); dm += t; print('D-MAN สำรอง', sid[:8], len(t), 'ใบคุม')
        except Exception as e:
            print('  D-MAN สำรองโหลดไม่ได้', sid[:8], e, file=sys.stderr)
    all_d = [d for d, _ in ct + dm]
    if not all_d:
        sys.exit('ไม่มีข้อมูลเลย — ไม่เขียนทับ')
    to = max(d for d, _ in ct) if ct else max(all_d)
    lo = (datetime.date.fromisoformat(to) - datetime.timedelta(days=WINDOW_DAYS)).isoformat()
    P = collections.Counter(); used = []
    for d, L in ct + dm:
        if d < lo or d > to:
            continue
        used.append(d)
        for i in range(len(L)):
            for j in range(i + 1, len(L)):
                P[(L[i], L[j])] += 1
    codes = sorted({c for k in P for c in k}); ci = {c: i for i, c in enumerate(codes)}
    p = []
    for (a, b), n in sorted(P.items()):
        p += [ci[a], ci[b], n]
    out = {'v': 2, 'from': min(used), 'to': to, 'codes': codes, 'p': p}
    print('ช่วง', out['from'], '→', out['to'], '| ร้าน', len(codes), '| คู่', len(P))
    # กันข้อมูลโหลดไม่ครบแล้วเขียนทับของดี
    old = None
    try:
        old = json.load(open(OUT, encoding='utf-8'))
    except Exception:
        pass
    if len(ct) < 300 or len(codes) < 500:
        sys.exit('ข้อมูลน้อยผิดปกติ (Cartrack %d เที่ยว · %d ร้าน) — ไม่เขียนทับ' % (len(ct), len(codes)))
    if old and len(P) < 0.6 * (len(old.get('p', [])) // 3):
        sys.exit('คู่ร้านลดลงเกิน 40%% (%d -> %d) — ไม่เขียนทับ' % (len(old['p']) // 3, len(P)))
    if old and old.get('to', '') > out['to']:
        sys.exit('ข้อมูลใหม่เก่ากว่าไฟล์เดิม (%s < %s) — ไม่เขียนทับ' % (out['to'], old['to']))
    s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    open(OUT, 'w', encoding='utf-8').write(s)
    print('เขียน', os.path.normpath(OUT), len(s.encode()) // 1024, 'KB')


if __name__ == '__main__':
    main()
