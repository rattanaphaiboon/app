/* RATTANA VOICE v1.0 — frontend. All API keys stay on the server. */
(() => {
  'use strict';
  const UI = window.RattanaUI;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { branch: 'rv-branch', voice: 'rv-voice' };

  // ───────── icons (Lucide style) ─────────
  const P = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    library: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    template: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
    voices: '<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>',
    store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/><path d="M10 21v-5h4v5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    save: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    female: '<circle cx="12" cy="9" r="5"/><path d="M12 14v8M9 19h6"/>',
    male: '<circle cx="10" cy="14" r="5"/><path d="m19 5-5.4 5.4M15 5h4v4"/>',
  };
  const ico = (n, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  const MENU = [
    { page: 'home', label: 'หน้าหลัก', icon: 'home' },
    { page: 'create', label: 'สร้างเสียงประกาศใหม่', short: 'สร้างเสียง', icon: 'mic' },
    { page: 'library', label: 'คลังเสียงของฉัน', short: 'คลังเสียง', icon: 'library' },
    { page: 'history', label: 'ประวัติการสร้างเสียง', short: 'ประวัติ', icon: 'history' },
    { page: 'templates', label: 'แม่แบบประกาศโปรโมชั่น', short: 'แม่แบบ', icon: 'template' },
    { page: 'voices', label: 'จัดการเสียงผู้ประกาศ', icon: 'voices' },
    { page: 'branches', label: 'จัดการสาขา', icon: 'store' },
    { page: 'settings', label: 'ตั้งค่าระบบ', icon: 'settings' },
  ];

  // ───────── state ─────────
  const S = {
    health: null, boot: null,
    form: { announcement_type: 'discount', style: 'sales' },
    pace: 'normal', volumeDb: 0, voiceId: null,
    promotionId: null, scriptId: null, lastGen: null, template: null,
  };

  // ───────── API ─────────
  // API address: <meta name="rv-api"> (Supabase Edge Function when hosted on GitHub Pages), else this server.
  const API = (document.querySelector('meta[name="rv-api"]')?.content || '').trim().replace(/\/+$/, '');
  const TOKEN_KEY = 'rv-token';
  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  /** Audio link for players and downloads (carries the access token, since <audio> cannot send headers). */
  const audioUrl = (id, download = false) => {
    const q = new URLSearchParams();
    if (download) q.set('download', '1');
    if (token()) q.set('t', token());
    const qs = q.toString();
    return `${API}/api/audio/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`;
  };

  async function api(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token()) headers['x-access-token'] = token();
    const admin = sessionStorage.getItem('rv-admin');
    if (admin) headers['x-admin-code'] = admin;
    let res;
    try {
      res = await fetch(API + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error(UI.online() ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่' : 'ไม่มีอินเทอร์เน็ต กรุณาเชื่อมต่อแล้วลองใหม่');
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/session' && await askAccessCode()) return api(path, { method, body });
    if (res.status === 403 && await askAdminCode(data.error)) return api(path, { method, body });
    if (!res.ok) throw Object.assign(new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`), { status: res.status });
    return data;
  }

  function codePopup({ title, message, label, icon }) {
    return UI.popup({
      icon, title, message, size: 'sm',
      content: `<div class="rt-field"><label for="rvCode">${esc(label)}</label><input class="rt-input rv-full" id="rvCode" type="password" autocomplete="current-password"></div>`,
      onOpen: ({ el }) => setTimeout(() => $('#rvCode', el)?.focus(), 80),
      actions: [
        { label: 'ยกเลิก', variant: 'glass', value: null },
        { label: 'ยืนยัน', variant: 'approve', onClick: () => true, value: 'ok' },
      ],
      onClose: () => {},
    }).then((v) => (v === 'ok' ? ($('#rvCode')?.value || S._lastCode || '') : null));
  }
  // keep the typed value even after the popup is removed
  document.addEventListener('input', (e) => { if (e.target.id === 'rvCode') S._lastCode = e.target.value; });

  async function askAccessCode() {
    S._lastCode = '';
    const code = await codePopup({ icon: 'question', title: 'รหัสเข้าใช้งาน', message: 'ใส่รหัสเข้าใช้งาน RATTANA VOICE ของร้าน', label: 'รหัสเข้าใช้งาน' });
    if (!code) return false;
    try {
      const r = await api('/api/session', { method: 'POST', body: { code } });
      if (r.token) localStorage.setItem(TOKEN_KEY, r.token);
      return true;
    }
    catch (e) { UI.toast(e.message, { type: 'error' }); return askAccessCode(); }
  }
  async function askAdminCode(msg) {
    S._lastCode = '';
    const code = await codePopup({ icon: 'warning', title: 'สำหรับผู้ดูแลระบบ', message: msg || 'เมนูนี้ต้องใช้รหัส Admin', label: 'รหัส Admin' });
    if (!code) return false;
    sessionStorage.setItem('rv-admin', code);
    try { await api('/api/admin/check', { method: 'POST', body: {} }); renderAdminState(); return true; }
    catch { sessionStorage.removeItem('rv-admin'); return false; }
  }

  const showError = (e, title = 'ทำรายการไม่สำเร็จ') => UI.alert({ type: 'error', title, message: e.message || String(e) });

  // ───────── formatting ─────────
  const fmtDate = (iso) => { const d = new Date(iso); return `${UI.formatDate(d, 'short')} ${UI.formatTime(d)}`; };
  const fmtDur = (s) => { s = Math.max(0, Math.round(Number(s) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const typeLabel = (k) => S.boot?.types.find((t) => t.key === k)?.label || '';
  const styleLabel = (k) => S.boot?.styles.find((t) => t.key === k)?.label || '';
  const sampleBadge = (on) => (on ? ' <span class="rt-badge rt-badge-sample">ข้อมูลตัวอย่าง</span>' : '');
  const branchLabel = (b) => `${b.name}${b.is_sample ? ' (ข้อมูลตัวอย่าง)' : ''}${b.active === false ? ' — ปิดใช้งาน' : ''}`;

  // ───────── navigation ─────────
  function renderNav() {
    $('#sideNav').innerHTML = MENU.map((m) => `<a class="rt-nav-item" href="#${m.page}" data-nav="${m.page}"><span class="rt-nav-ico">${ico(m.icon, 18)}</span>${m.label}</a>`).join('');
    const bottom = ['home', 'create', 'library', 'history'].map((p) => MENU.find((m) => m.page === p));
    $('#bottomNav').innerHTML = bottom.map((m) => `<a href="#${m.page}" data-nav="${m.page}">${ico(m.icon, 22)}<span>${m.short || m.label}</span></a>`).join('');
    $('#menuGrid').innerHTML = MENU.filter((m) => m.page !== 'home').map((m) => `
      <a class="rv-menu-tile" href="#${m.page}"><span class="rt-tile rt-tile-navy">${ico(m.icon, 22)}</span><span>${m.label}</span></a>`).join('');
    $$('[data-ico]').forEach((el) => el.insertAdjacentHTML('afterbegin', ico(el.dataset.ico, 18)));
  }

  const loaders = {};
  function go() {
    const page = (location.hash.slice(1) || 'home').split('?')[0];
    const target = MENU.some((m) => m.page === page) ? page : 'home';
    $$('[data-page]').forEach((s) => { s.hidden = s.dataset.page !== target; });
    $$('[data-nav]').forEach((a) => (a.dataset.nav === target ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    UI.menuOpen(false);
    document.title = `${MENU.find((m) => m.page === target).label} · RATTANA VOICE v1.0`;
    loaders[target]?.();
    window.scrollTo({ top: 0 });
  }

  // ───────── shared list player ─────────
  const listPlayer = $('#listPlayer');
  let playingId = null;
  function playToggle(gen, btn) {
    if (playingId === gen.id && !listPlayer.paused) { listPlayer.pause(); return; }
    $('#rvAudio')?.pause();
    listPlayer.src = audioUrl(gen.id);
    playingId = gen.id;
    listPlayer.play().catch((e) => UI.toast(`เล่นเสียงไม่ได้: ${e.message}`, { type: 'error' }));
    syncPlayButtons();
  }
  function syncPlayButtons() {
    $$('[data-play]').forEach((b) => {
      const on = b.dataset.play === playingId && !listPlayer.paused;
      b.innerHTML = ico(on ? 'pause' : 'play', 18);
      b.setAttribute('aria-label', on ? 'หยุด' : 'เล่น');
    });
  }
  ['play', 'pause', 'ended'].forEach((ev) => listPlayer.addEventListener(ev, syncPlayButtons));
  listPlayer.addEventListener('error', () => { if (listPlayer.src) UI.toast('โหลดไฟล์เสียงไม่สำเร็จ', { type: 'error' }); });

  const genCache = new Map();
  function genRow(g, { actions = true } = {}) {
    genCache.set(g.id, g);
    return `<div class="rt-list-row rv-gen-row">
      <button class="rt-btn rt-btn-gold rt-btn-icon" data-play="${g.id}" aria-label="เล่น">${ico('play', 18)}</button>
      <div class="rv-grow">
        <span class="rt-cell-main">${esc(g.title || 'ประกาศ')}${g.saved ? ' <span class="rt-badge rt-badge-success">' + ico('check', 13) + 'ในคลัง</span>' : ''}${sampleBadge(g.is_sample)}</span>
        <span class="rt-cell-sub">${esc(g.voice_name || '')}${g.branch_name ? ' · ' + esc(g.branch_name) : ''} · ${fmtDate(g.created_at)} · ${fmtDur(g.duration_sec)}</span>
      </div>
      ${actions ? `<a class="rt-btn rt-btn-glass rt-btn-icon" href="${audioUrl(g.id, true)}" download aria-label="ดาวน์โหลด MP3">${ico('download', 18)}</a>
      <button class="rt-btn rt-btn-glass rt-btn-icon" data-more-gen="${g.id}" aria-label="ตัวเลือกเพิ่มเติม">⋯</button>` : ''}
    </div>`;
  }
  document.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-play]');
    if (p) { const g = genCache.get(p.dataset.play); if (g) playToggle(g, p); return; }
    const m = e.target.closest('[data-more-gen]');
    if (m) genMenu(genCache.get(m.dataset.moreGen), m);
  });

  async function genMenu(g, anchor) {
    if (!g) return;
    const v = await UI.menu(anchor, [
      { label: 'ดูข้อความประกาศ', value: 'text' },
      { label: 'ใช้ข้อความนี้สร้างเสียงใหม่', value: 'reuse' },
      g.saved ? { label: 'นำออกจากคลังเสียง', value: 'unsave' } : { label: 'บันทึกเข้าคลังเสียง', value: 'save' },
      { label: 'เปลี่ยนชื่อไฟล์', value: 'rename' },
      '-',
      { label: 'ลบไฟล์เสียง (Admin)', value: 'delete', danger: true },
    ], { align: 'end' });
    try {
      if (v === 'text') UI.popup({ title: g.title, content: `<p class="rv-script-view">${esc(g.script_text)}</p><p class="rt-help">${esc(g.voice_name)} · ${esc(styleLabel(g.style))} · ความเร็ว ${Number(g.speed || 1).toFixed(2)}× · ความดัง ${g.volume_db > 0 ? '+' : ''}${g.volume_db || 0} dB</p>`, actions: [{ label: 'ปิด', variant: 'glass' }] });
      if (v === 'reuse') { $('#scriptText').value = g.script_text; $('#scriptTitle').value = g.title; unlock(3); updateScriptMeta(); location.hash = '#create'; setTimeout(() => $('#step3').scrollIntoView({ behavior: 'smooth' }), 120); }
      if (v === 'save' || v === 'unsave') { await api(`/api/generations/${g.id}`, { method: 'PATCH', body: { saved: v === 'save' } }); UI.toast(v === 'save' ? 'บันทึกเข้าคลังเสียงแล้ว' : 'นำออกจากคลังเสียงแล้ว'); refreshCurrent(); }
      if (v === 'rename') {
        S._lastCode = g.title;
        const name = await UI.popup({ title: 'เปลี่ยนชื่อไฟล์', size: 'sm', content: `<div class="rt-field"><label for="rvCode">ชื่อไฟล์</label><input class="rt-input rv-full" id="rvCode" maxlength="80" value="${esc(g.title)}"></div>`, actions: [{ label: 'ยกเลิก', variant: 'glass', value: null }, { label: 'บันทึก', variant: 'gold', value: 'ok' }] });
        if (name === 'ok' && S._lastCode.trim()) { await api(`/api/generations/${g.id}`, { method: 'PATCH', body: { title: S._lastCode.trim() } }); UI.toast('เปลี่ยนชื่อแล้ว'); refreshCurrent(); }
      }
      if (v === 'delete') {
        const ok = await UI.confirm({ variant: 'reject', title: 'ลบไฟล์เสียงนี้?', message: `“${g.title}” จะถูกลบออกจากประวัติและที่เก็บไฟล์ ไม่สามารถกู้คืนได้`, confirmText: 'ลบ' });
        if (ok) { await api(`/api/generations/${g.id}`, { method: 'DELETE' }); UI.toast('ลบไฟล์เสียงแล้ว'); refreshCurrent(); }
      }
    } catch (err) { showError(err); }
  }
  const refreshCurrent = () => loaders[(location.hash.slice(1) || 'home')]?.();

  // ───────── 1. home ─────────
  loaders.home = () => {
    UI.load($('#kpis'), () => api('/api/stats'), {
      skeleton: 'kpi',
      isEmpty: () => false,
      render: (s) => {
        UI.load($('#latestList'), () => s.latest, {
          skeleton: 'list',
          empty: { title: 'ยังไม่มีไฟล์เสียง', message: 'เริ่มสร้างเสียงประกาศแรกได้เลย', action: { label: 'สร้างเสียงประกาศ', onClick: () => (location.hash = '#create') } },
          render: (rows) => rows.map((g) => genRow(g)).join(''),
        });
        const kpi = (icon, tone, label, n, sub) => `<div class="rt-glass rt-kpi"><div class="rt-kpi-head"><span class="rt-tile rt-tile-sm rt-tile-${tone}">${ico(icon, 16)}</span>${label}</div><div class="rt-kpi-value"><b data-rt-count="${n}"></b> <small class="rt-subtle">ไฟล์</small></div><div class="rt-kpi-trend"><small>${sub}</small></div></div>`;
        return kpi('mic', 'navy', 'ไฟล์เสียงที่สร้างแล้ว', s.total, 'ทั้งหมดในระบบ')
          + kpi('library', 'gold', 'ในคลังเสียง', s.saved, 'ไฟล์ที่บันทึกไว้ใช้ซ้ำ')
          + kpi('clock', 'blue', 'สร้างเดือนนี้', s.thisMonth, UI.formatDate(new Date(), 'short').replace(/^\d+\s/, ''));
      },
      error: { title: 'โหลดข้อมูลหน้าหลักไม่สำเร็จ' },
    });
    renderSetupNotice();
  };

  function renderSetupNotice() {
    const h = S.health, box = $('#setupNotice');
    if (!h) return;
    const miss = [];
    if (!h.gemini && !h.openai) miss.push('GEMINI_API_KEY (ตอนนี้เขียนสคริปต์จากแม่แบบ ไม่ใช้ AI)');
    if (!h.gemini && !h.azure && !h.elevenlabs) miss.push('GEMINI_API_KEY (ใช้สร้างเสียงด้วย)');
    if (!h.supabase) miss.push('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    box.hidden = !miss.length;
    box.innerHTML = miss.length ? `<div class="rt-card rt-pad-sm rv-notice">${ico('alert', 18)}<div><b>ตั้งค่ายังไม่ครบ:</b> ${miss.map(esc).join(', ')}<br><span class="rt-help">${h.mock ? 'ตอนนี้เปิดโหมดทดลอง ไฟล์เสียงที่ได้เป็นเสียงเงียบ (ข้อมูลตัวอย่าง)' : 'ใส่ค่าในไฟล์ .env ที่เซิร์ฟเวอร์ แล้วรีสตาร์ต'}${!h.supabase ? ' · ไฟล์เสียงเก็บในเครื่องเซิร์ฟเวอร์ชั่วคราว' : ''}</span></div></div>` : '';
  }

  // ───────── 2. create ─────────
  const FIELDS = ['product_name', 'details', 'regular_price', 'promo_price', 'discount', 'start_date', 'end_date', 'conditions', 'extra_message'];

  function chipGroup(el, items, selected, onPick) {
    el.innerHTML = items.map((t) => `<button type="button" class="rt-chip" data-key="${t.key}" aria-pressed="${t.key === selected}">${esc(t.label)}</button>`).join('');
    el.onclick = (e) => {
      const b = e.target.closest('.rt-chip');
      if (!b) return;
      $$('.rt-chip', el).forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      onPick(b.dataset.key);
    };
  }
  function setChip(el, key) { $$('.rt-chip', el).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.key === key))); }

  function segGroup(el, items, selectedKey, onPick) {
    el.innerHTML = items.map((t) => `<button type="button" data-key="${t.key}" aria-pressed="${t.key === selectedKey}">${esc(t.label)}</button>`).join('');
    UI.segmented?.(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) onPick(b.dataset.key);
    });
  }

  function fillBranchSelect(sel, { all = false, value } = {}) {
    const list = (S.boot?.branches || []).filter((b) => all || b.active !== false);
    sel.innerHTML = (all ? '<option value="">ทุกสาขา</option>' : '<option value="">— ไม่ระบุสาขา —</option>')
      + list.map((b) => `<option value="${b.id}">${esc(branchLabel(b))}</option>`).join('');
    sel.value = value ?? '';
  }

  function initCreate() {
    const b = S.boot;
    chipGroup($('#typeChips'), b.types, S.form.announcement_type, (k) => { S.form.announcement_type = k; });
    chipGroup($('#styleChips'), b.styles, S.form.style, (k) => { S.form.style = k; });
    segGroup($('#paceSeg'), b.paces, S.pace, (k) => { S.pace = k; });
    segGroup($('#volumeSeg'), b.volumes.map((v) => ({ key: String(v.db), label: v.label })), String(S.volumeDb), (k) => { S.volumeDb = Number(k); });
    fillBranchSelect($('#f_branch'), { value: localStorage.getItem(LS.branch) || '' });
    $('#f_branch').addEventListener('change', (e) => localStorage.setItem(LS.branch, e.target.value));
    renderVoiceGrid();
    $('#scriptText').maxLength = b.maxTtsChars || 2500;

    $('#speed').addEventListener('input', (e) => { $('#speedOut').textContent = `${Number(e.target.value).toFixed(2)}×`; updateScriptMeta(); });
    $('#scriptText').addEventListener('input', () => { updateScriptMeta(); if ($('#scriptText').value.trim()) unlock(3); });
    $('#step1').addEventListener('submit', (e) => { e.preventDefault(); writeScript($('#btnWrite')); });
    $('#btnRewrite').addEventListener('click', () => writeScript($('#btnRewrite')));
    $('#btnToVoice').addEventListener('click', () => {
      if (!$('#scriptText').value.trim()) return UI.toast('กรุณาใส่ข้อความประกาศก่อน', { type: 'warning' });
      unlock(3); $('#step3').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#btnSpeak').addEventListener('click', () => speak($('#btnSpeak')));
    $('#btnTemplate').addEventListener('click', pickTemplate);
    $('#btnClear').addEventListener('click', async () => {
      if (await UI.confirm({ variant: 'reject', title: 'ล้างข้อมูลที่กรอก?', confirmText: 'ล้างข้อมูล', message: 'ข้อมูลโปรโมชั่นและสคริปต์ในหน้านี้จะถูกล้าง' })) resetCreate();
    });
    updateSteps();
  }

  function resetCreate() {
    FIELDS.forEach((f) => { $(`#f_${f}`).value = ''; $(`#f_${f}`).placeholder = $(`#f_${f}`).dataset.ph || $(`#f_${f}`).placeholder; });
    $('#scriptText').value = ''; $('#scriptTitle').value = ''; $('#scriptWarn').innerHTML = ''; $('#scriptSample').hidden = true;
    S.template = null; $('#templateNote').hidden = true;
    S.promotionId = S.scriptId = S.lastGen = null;
    $('#resultBox').innerHTML = '<div class="rt-empty rv-empty-sm">ยังไม่มีไฟล์เสียง กดปุ่ม “สร้างเสียง” ในขั้นตอนที่ 3</div>';
    ['step2', 'step3', 'step4'].forEach((id) => $(`#${id}`).setAttribute('data-locked', ''));
    updateScriptMeta(); updateSteps();
  }

  function unlock(n) {
    for (let i = 2; i <= n; i++) $(`#step${i}`).removeAttribute('data-locked');
    updateSteps();
  }
  function updateSteps() {
    let current = 1;
    for (let i = 2; i <= 4; i++) if (!$(`#step${i}`).hasAttribute('data-locked')) current = i;
    if (S.lastGen) current = 4;
    $$('#stepBar li').forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-done', n < current);
      li.classList.toggle('is-current', n === current);
    });
  }

  function updateScriptMeta() {
    const t = $('#scriptText').value.trim();
    const speed = Number($('#speed').value) || 1;
    const sec = Math.round(t.replace(/\s+/g, '').length / (13 * speed));
    const max = S.boot?.maxTtsChars || 2500;
    $('#scriptMeta').textContent = `${t.length.toLocaleString('th-TH')} / ${max.toLocaleString('th-TH')} ตัวอักษร · ยาวประมาณ ${sec} วินาที`;
  }

  function formData() {
    const d = { ...S.form };
    FIELDS.forEach((f) => { d[f] = $(`#f_${f}`).value.trim(); });
    d.branch_id = $('#f_branch').value;
    const br = S.boot.branches.find((b) => b.id === d.branch_id);
    d.branch_name = br && !br.is_sample ? br.name : '';
    d.pace = S.pace;
    d.gender = currentVoice()?.gender || 'female';
    return d;
  }

  async function writeScript(btn) {
    const d = formData();
    if (!d.product_name && !d.details && !d.extra_message) {
      UI.toast('กรอกชื่อสินค้า รายละเอียด หรือข้อความเพิ่มเติม อย่างน้อย 1 ช่อง', { type: 'warning' });
      $('#f_product_name').focus();
      return;
    }
    if (d.start_date && d.end_date && d.end_date < d.start_date) return UI.toast('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น', { type: 'warning' });
    if ($('#scriptText').value.trim() && btn.id === 'btnWrite' && !await UI.confirm({ variant: 'gold', title: 'เขียนสคริปต์ใหม่?', message: 'ข้อความเดิมในขั้นตอนที่ 2 จะถูกแทนที่', confirmText: 'เขียนใหม่' })) return;

    UI.setLoading(btn, true);
    const t0 = Date.now();
    const tick = setInterval(() => { $('#scriptMeta').textContent = `AI กำลังเขียนสคริปต์… ${Math.round((Date.now() - t0) / 1000)} วินาที`; }, 500);
    unlock(2);
    $('#scriptText').disabled = true;
    try {
      const r = await api('/api/script', { method: 'POST', body: d });
      $('#scriptText').value = r.script;
      if (r.title) $('#scriptTitle').value = r.title;
      S.promotionId = r.promotionId; S.scriptId = r.scriptId;
      $('#scriptSample').hidden = r.provider !== 'template';
      $('#scriptSample').textContent = 'เขียนจากแม่แบบ (ไม่ใช้ AI)';
      $('#scriptWarn').innerHTML = (r.warnings || []).map((w) => `<div class="rt-card rt-pad-sm rv-notice rv-notice-warn">${ico('alert', 18)}<span>${esc(w)}</span></div>`).join('');
      unlock(3);
      UI.toast('AI เขียนสคริปต์เสร็จแล้ว ตรวจและแก้ไขได้', { type: 'success' });
      $('#step2').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      showError(e, 'AI เขียนสคริปต์ไม่สำเร็จ');
    } finally {
      clearInterval(tick);
      $('#scriptText').disabled = false;
      UI.setLoading(btn, false);
      updateScriptMeta();
    }
  }

  // voices
  const providerOk = (p) => Boolean(S.health?.mock || S.health?.[p || 'gemini']);
  const activeVoices = () => (S.boot?.voices || []).filter((v) => v.active && v.license_confirmed && providerOk(v.provider));
  const currentVoice = () => activeVoices().find((v) => v.id === S.voiceId) || null;

  function renderVoiceGrid() {
    const list = activeVoices();
    if (!list.length) {
      UI.state($('#voiceGrid'), 'empty', { title: 'ยังไม่มีเสียงที่พร้อมใช้', message: 'ต้องตั้งค่า GEMINI_API_KEY ที่เซิร์ฟเวอร์ หรือให้ผู้ดูแลเพิ่ม/เปิดเสียงในหน้า “จัดการเสียงผู้ประกาศ”', action: { label: 'ไปที่จัดการเสียง', onClick: () => (location.hash = '#voices') } });
      return;
    }
    const saved = localStorage.getItem(LS.voice);
    if (!list.some((v) => v.id === S.voiceId)) S.voiceId = list.some((v) => v.id === saved) ? saved : list[0].id;
    $('#voiceGrid').innerHTML = list.map((v) => `
      <button type="button" class="rv-voice" data-voice="${v.id}" aria-pressed="${v.id === S.voiceId}">
        <span class="rt-tile ${v.gender === 'male' ? 'rt-tile-blue' : 'rt-tile-gold'}">${ico(v.gender === 'male' ? 'male' : 'female', 20)}</span>
        <span class="rv-grow"><span class="rt-cell-main">${esc(v.name)}</span><span class="rt-cell-sub">${esc(v.description || (v.gender === 'male' ? 'เสียงผู้ชาย' : 'เสียงผู้หญิง'))}</span></span>
        <span class="rv-voice-check">${ico('check', 16)}</span>
      </button>`).join('');
    $('#voiceGrid').onclick = (e) => {
      const b = e.target.closest('[data-voice]');
      if (!b) return;
      const before = currentVoice();
      S.voiceId = b.dataset.voice;
      $$('[data-voice]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const after = currentVoice();
      if (before && after && before.gender !== after.gender) swapParticles(after.gender);
    };
  }

  // Thai polite particles follow the announcer's gender.
  function swapParticles(gender) {
    const el = $('#scriptText');
    const old = el.value;
    if (!old) return;
    const B = '(?=[\\s.,!?…"”\')]|$)';
    let t = old;
    if (gender === 'male') {
      t = t.replace(new RegExp(`นะคะ${B}`, 'g'), 'นะครับ').replace(new RegExp(`ค่ะ${B}`, 'g'), 'ครับ').replace(new RegExp(`คะ${B}`, 'g'), 'ครับ');
    } else {
      t = t.replace(new RegExp(`นะครับ${B}`, 'g'), 'นะคะ').replace(new RegExp(`ครับ${B}`, 'g'), 'ค่ะ');
    }
    if (t !== old) {
      el.value = t;
      const n = $('#particleNote');
      n.hidden = false;
      n.textContent = `ปรับคำลงท้ายเป็น “${gender === 'male' ? 'ครับ' : 'ค่ะ'}” ให้ตรงกับเสียงผู้ประกาศแล้ว ตรวจข้อความในขั้นตอนที่ 2 ได้`;
      UI.toast(n.textContent, { type: 'info' });
    }
  }

  async function speak(btn) {
    const text = $('#scriptText').value.trim();
    if (!text) { UI.toast('กรุณาใส่ข้อความประกาศก่อน', { type: 'warning' }); unlock(2); return $('#scriptText').focus(); }
    const voice = currentVoice();
    if (!voice) return UI.toast('กรุณาเลือกเสียงผู้ประกาศ', { type: 'warning' });

    UI.setLoading(btn, true);
    unlock(4);
    const t0 = Date.now();
    $('#resultBox').innerHTML = `<div class="rv-progress-box"><div class="rt-progress"><span style="width:8%"></span></div><p class="rt-muted" id="ttsStatus">กำลังสร้างเสียงด้วย “${esc(voice.name)}”…</p></div>`;
    const bar = $('#resultBox .rt-progress span');
    const expected = Math.max(6, text.length / 40);
    const tick = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      bar.style.width = `${Math.min(92, 8 + (s / expected) * 80)}%`;
      const st = $('#ttsStatus'); if (st) st.textContent = `กำลังสร้างเสียงด้วย “${voice.name}”… ${Math.round(s)} วินาที`;
    }, 300);
    $('#step4').scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      const r = await api('/api/tts', {
        method: 'POST',
        body: {
          text, voice_id: voice.id, style: S.form.style, pace: S.pace, speed: Number($('#speed').value), volume_db: S.volumeDb,
          branch_id: $('#f_branch').value, promotion_id: S.promotionId, script_id: S.scriptId,
          title: $('#scriptTitle').value.trim() || $('#f_product_name').value.trim() || typeLabel(S.form.announcement_type),
        },
      });
      S.lastGen = r.generation;
      localStorage.setItem(LS.voice, voice.id);
      renderResult(r.generation, r.warning);
      UI.toast('สร้างเสียงสำเร็จ กดเล่นเพื่อฟังตัวอย่าง', { type: 'success' });
      UI.haptic?.('success');
    } catch (e) {
      $('#resultBox').innerHTML = '';
      UI.state($('#resultBox'), 'error', { title: 'สร้างเสียงไม่สำเร็จ', message: e.message, retry: () => speak(btn), compact: true });
    } finally {
      clearInterval(tick);
      UI.setLoading(btn, false);
      updateSteps();
    }
  }

  function renderResult(g, warning) {
    listPlayer.pause();
    $('#resultBox').innerHTML = `
      ${warning ? `<div class="rt-card rt-pad-sm rv-notice rv-notice-warn">${ico('alert', 18)}<span>${esc(warning)}</span></div>` : ''}
      <div class="rv-player rt-glass">
        <button class="rt-btn rt-btn-gold rv-play" id="rvPlay" aria-label="เล่น">${ico('play', 26)}</button>
        <div class="rv-grow">
          <span class="rt-cell-main">${esc(g.title)}${sampleBadge(g.is_sample)}</span>
          <span class="rt-cell-sub">${esc(g.voice_name)} · ${esc(styleLabel(g.style))} · ${Number(g.speed).toFixed(2)}× · ${g.volume_db > 0 ? '+' : ''}${g.volume_db} dB</span>
          <input type="range" class="rv-range rv-seek" id="rvSeek" min="0" max="1000" value="0" aria-label="ตำแหน่งเสียง">
          <div class="rv-time"><span id="rvCur">0:00</span><span id="rvDur">${fmtDur(g.duration_sec)}</span></div>
        </div>
        <audio id="rvAudio" preload="auto" src="${audioUrl(g.id)}"></audio>
      </div>
      <div class="rv-result-actions">
        <a class="rt-btn rt-btn-gold rt-btn-lg" href="${audioUrl(g.id, true)}" download>${ico('download', 20)}ดาวน์โหลด MP3</a>
        <button class="rt-btn rt-btn-approve rt-btn-lg" id="rvSave" data-rt-save ${g.saved ? 'disabled' : ''}>${ico(g.saved ? 'check' : 'save', 20)}${g.saved ? 'อยู่ในคลังเสียงแล้ว' : 'บันทึกเข้าคลังเสียง'}</button>
        <button class="rt-btn rt-btn-glass" id="rvRegen">${ico('refresh', 18)}สร้างเสียงใหม่</button>
        <button class="rt-btn rt-btn-glass" id="rvEdit">${ico('edit', 18)}แก้ไขข้อความ</button>
      </div>
      <p class="rt-help">ไฟล์ MP3 ${(g.file_size / 1024).toFixed(0)} KB · ความยาว ${fmtDur(g.duration_sec)} · สร้างเมื่อ ${fmtDate(g.created_at)} · บันทึกในประวัติแล้ว</p>`;

    const a = $('#rvAudio'), play = $('#rvPlay'), seek = $('#rvSeek');
    const sync = () => { play.innerHTML = ico(a.paused ? 'play' : 'pause', 26); play.setAttribute('aria-label', a.paused ? 'เล่น' : 'หยุด'); };
    play.onclick = () => { listPlayer.pause(); a.paused ? a.play().catch((e) => UI.toast(`เล่นเสียงไม่ได้: ${e.message}`, { type: 'error' })) : a.pause(); };
    ['play', 'pause', 'ended'].forEach((ev) => a.addEventListener(ev, sync));
    a.addEventListener('loadedmetadata', () => { if (Number.isFinite(a.duration)) $('#rvDur').textContent = fmtDur(a.duration); });
    a.addEventListener('timeupdate', () => {
      if (!a.duration) return;
      if (!seek.matches(':active')) seek.value = Math.round((a.currentTime / a.duration) * 1000);
      seek.style.setProperty('--p', `${(a.currentTime / a.duration) * 100}%`);
      $('#rvCur').textContent = fmtDur(a.currentTime);
    });
    a.addEventListener('ended', () => { seek.value = 0; seek.style.setProperty('--p', '0%'); });
    a.addEventListener('error', () => UI.toast('โหลดไฟล์เสียงไม่สำเร็จ', { type: 'error' }));
    seek.addEventListener('input', () => { if (a.duration) a.currentTime = (seek.value / 1000) * a.duration; });

    $('#rvSave').onclick = async (e) => {
      const btn = e.currentTarget;
      UI.setLoading(btn, true);
      try {
        await api(`/api/generations/${g.id}`, { method: 'PATCH', body: { saved: true, title: $('#scriptTitle').value.trim() || g.title } });
        g.saved = true;
        UI.setLoading(btn, false);
        btn.disabled = true; btn.innerHTML = `${ico('check', 20)}อยู่ในคลังเสียงแล้ว`;
        UI.toast('บันทึกเข้าคลังเสียงแล้ว', { action: { label: 'เปิดคลังเสียง', onClick: () => (location.hash = '#library') } });
      } catch (err) { UI.setLoading(btn, false); showError(err, 'บันทึกไม่สำเร็จ'); }
    };
    $('#rvRegen').onclick = () => { a.pause(); $('#step3').scrollIntoView({ behavior: 'smooth', block: 'start' }); UI.toast('ปรับเสียงหรือค่าต่าง ๆ แล้วกด “สร้างเสียง” อีกครั้ง', { type: 'info' }); };
    $('#rvEdit').onclick = () => { a.pause(); $('#step2').scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => $('#scriptText').focus(), 400); };
  }

  // templates
  function applyTemplate(t) {
    resetCreate();
    S.template = t;
    S.form.announcement_type = t.type; S.form.style = t.style;
    setChip($('#typeChips'), t.type); setChip($('#styleChips'), t.style);
    FIELDS.forEach((f) => {
      const el = $(`#f_${f}`);
      el.dataset.ph ??= el.placeholder;
      el.value = t.fill?.[f] || '';
      el.placeholder = t.hint?.[f] || el.dataset.ph;
    });
    const n = $('#templateNote');
    n.hidden = false;
    n.innerHTML = `<span class="rt-badge rt-badge-gold">${ico('template', 13)}แม่แบบ: ${esc(t.title)}</span>`;
    location.hash = '#create';
    setTimeout(() => $('#f_product_name').focus(), 200);
  }
  async function pickTemplate(e) {
    const v = await UI.menu(e.currentTarget, S.boot.templates.map((t) => ({ label: t.title, value: t.key })), { title: 'เลือกแม่แบบประกาศ' });
    const t = S.boot.templates.find((x) => x.key === v);
    if (t) applyTemplate(t);
  }
  loaders.templates = () => {
    $('#templateGrid').innerHTML = S.boot.templates.map((t) => `
      <button class="rt-card rt-pad-sm rt-lift rv-template" data-tpl="${t.key}">
        <span class="rt-tile rt-tile-gold">${ico(t.icon, 22)}</span>
        <span class="rv-grow"><span class="rt-cell-main">${esc(t.title)}</span><span class="rt-cell-sub">${esc(typeLabel(t.type))} · โทน${esc(styleLabel(t.style))}</span></span>
      </button>`).join('');
    $('#templateGrid').onclick = (e) => { const b = e.target.closest('[data-tpl]'); if (b) applyTemplate(S.boot.templates.find((t) => t.key === b.dataset.tpl)); };
  };

  // ───────── 3. library / 4. history ─────────
  function filterRows(rows, q) {
    q = q.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((g) => [g.title, g.script_text, g.voice_name, g.branch_name].some((s) => String(s || '').toLowerCase().includes(q)));
  }

  let libRows = [];
  function renderLib() {
    const rows = filterRows(libRows, $('#libSearch').value);
    const box = $('#libList');
    if (!libRows.length) return UI.state(box, 'empty', { title: 'คลังเสียงยังว่าง', message: 'สร้างเสียงแล้วกด “บันทึกเข้าคลังเสียง” เพื่อเก็บไว้ใช้ซ้ำ', action: { label: 'สร้างเสียงประกาศ', onClick: () => (location.hash = '#create') } });
    if (!rows.length) return UI.state(box, 'search', { title: 'ไม่พบไฟล์ที่ค้นหา' });
    box.innerHTML = rows.map((g) => genRow(g)).join('');
    syncPlayButtons();
  }
  loaders.library = () => UI.load($('#libList'), () => api(`/api/generations?saved=1&branch=${encodeURIComponent($('#libBranch').value)}`), {
    skeleton: 'list', isEmpty: () => false,
    render: (rows, box) => { libRows = rows; setTimeout(renderLib); return ''; },
    error: { title: 'โหลดคลังเสียงไม่สำเร็จ' },
  });

  let histRows = [];
  const histSort = { key: 'created_at', dir: 'desc' };
  function renderHist() {
    const box = $('#histTable');
    if (!histRows.length) return UI.state(box, 'empty', { title: 'ยังไม่มีประวัติการสร้างเสียง' });
    let rows = filterRows(histRows, $('#histSearch').value);
    if (!rows.length) return UI.state(box, 'search', { title: 'ไม่พบรายการที่ค้นหา' });
    const m = histSort.dir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => String(a[histSort.key] || '').localeCompare(String(b[histSort.key] || ''), 'th') * m);
    if (matchMedia('(max-width: 639px)').matches) {
      box.innerHTML = `<div class="rt-pad-sm">${rows.map((g) => genRow(g)).join('')}</div>`;
      return syncPlayButtons();
    }
    const th = (key, label, cls = '') => `<th class="rv-sort ${cls}" data-sort="${key}" aria-sort="${histSort.key === key ? (histSort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">${label}${histSort.key === key ? (histSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>`;
    box.innerHTML = `<table class="rt-table"><thead><tr>
        <th></th>${th('title', 'ไฟล์เสียง')}${th('voice_name', 'เสียง / สาขา')}${th('created_at', 'วันที่สร้าง')}<th>สถานะ</th><th class="rt-right"></th>
      </tr></thead><tbody>${rows.map((g) => {
        genCache.set(g.id, g);
        return `<tr>
          <td><button class="rt-btn rt-btn-gold rt-btn-icon rt-btn-sm" data-play="${g.id}" aria-label="เล่น">${ico('play', 16)}</button></td>
          <td><span class="rt-cell-main">${esc(g.title)}${sampleBadge(g.is_sample)}</span><span class="rt-cell-sub rv-clip">${esc(g.script_text)}</span></td>
          <td><span class="rt-cell-main">${esc(g.voice_name)}</span><span class="rt-cell-sub">${esc(g.branch_name || 'ไม่ระบุสาขา')}</span></td>
          <td><span class="rt-cell-main">${UI.formatDate(new Date(g.created_at), 'short')}</span><span class="rt-cell-sub">${UI.formatTime(new Date(g.created_at))} · ${fmtDur(g.duration_sec)}</span></td>
          <td>${g.saved ? `<span class="rt-badge rt-badge-success">${ico('check', 13)}ในคลัง</span>` : `<span class="rt-badge rt-badge-neutral">${ico('clock', 13)}ประวัติ</span>`}</td>
          <td class="rt-right rv-nowrap"><a class="rt-btn rt-btn-glass rt-btn-icon rt-btn-sm" href="${audioUrl(g.id, true)}" download aria-label="ดาวน์โหลด MP3">${ico('download', 16)}</a>
            <button class="rt-btn rt-btn-glass rt-btn-icon rt-btn-sm" data-more-gen="${g.id}" aria-label="ตัวเลือกเพิ่มเติม">⋯</button></td>
        </tr>`;
      }).join('')}</tbody></table>`;
    syncPlayButtons();
  }
  $('#histTable').addEventListener('click', (e) => {
    const h = e.target.closest('[data-sort]');
    if (!h) return;
    const k = h.dataset.sort;
    if (histSort.key === k) histSort.dir = histSort.dir === 'asc' ? 'desc' : 'asc';
    else { histSort.key = k; histSort.dir = k === 'created_at' ? 'desc' : 'asc'; }
    renderHist();
  });
  loaders.history = () => UI.load($('#histTable'), () => api(`/api/generations?limit=300&branch=${encodeURIComponent($('#histBranch').value)}`), {
    skeleton: 'table', isEmpty: () => false,
    render: (rows) => { histRows = rows; setTimeout(renderHist); return ''; },
    error: { title: 'โหลดประวัติไม่สำเร็จ' },
  });

  // ───────── 6. voices ─────────
  async function reloadBoot() { S.boot = await api('/api/bootstrap'); renderVoiceGrid(); refreshBranchSelects(); }


  const PROVIDER_LABEL = { gemini: 'Google Gemini (ฟรี)', azure: 'Microsoft Azure (ฟรี)', elevenlabs: 'ElevenLabs (เสียเงิน)' };
  const signed = (n) => `${Number(n) > 0 ? '+' : ''}${Number(n) || 0}%`;

  loaders.voices = () => {
    const list = S.boot.voices;
    const box = $('#voiceAdmin');
    if (!list.length) return UI.state(box, 'empty', { title: 'ยังไม่มีเสียงผู้ประกาศ', action: { label: 'เพิ่มเสียง', onClick: () => editVoice() } });
    box.innerHTML = list.map((v) => {
      const p = v.provider || 'gemini';
      const ready = providerOk(p);
      return `
      <div class="rt-card rt-pad-sm rv-voice-card">
        <div class="rv-row">
          <span class="rt-tile ${v.gender === 'male' ? 'rt-tile-blue' : 'rt-tile-gold'}">${ico(v.gender === 'male' ? 'male' : 'female', 20)}</span>
          <div class="rv-grow"><span class="rt-cell-main">${esc(v.name)}</span><span class="rt-cell-sub">${esc(v.description || '')}</span></div>
        </div>
        <div class="rv-badges">
          ${v.active ? `<span class="rt-badge rt-badge-success">${ico('check', 13)}ใช้งาน</span>` : `<span class="rt-badge rt-badge-neutral">${ico('x', 13)}ปิดใช้งาน</span>`}
          ${v.license_confirmed ? `<span class="rt-badge rt-badge-info">${ico('check', 13)}ยืนยันสิทธิ์แล้ว</span>` : `<span class="rt-badge rt-badge-warning">${ico('alert', 13)}ยังไม่ยืนยันสิทธิ์</span>`}
          <span class="rt-badge ${ready ? 'rt-badge-neutral' : 'rt-badge-warning'}">${ready ? '' : ico('alert', 13)}${esc(PROVIDER_LABEL[p] || p)}${ready ? '' : ' · ยังไม่ได้ตั้งค่า key'}</span>
        </div>
        <span class="rt-cell-sub">เสียง: <code>${esc(v.provider_voice_id)}</code>${p === 'azure' ? ` · ระดับเสียง ${signed(v.pitch_pct)} · ความเร็ว ${signed(v.rate_pct)}` : ''}${p === 'gemini' && v.voice_notes ? ` · ${esc(v.voice_notes)}` : ''}${v.license_note ? ` · ${esc(v.license_note)}` : ''}</span>
        <div class="rt-btn-group rt-btn-group-end">
          <button class="rt-btn rt-btn-glass rt-btn-sm" data-edit-voice="${v.id}">${ico('edit', 16)}แก้ไข</button>
          <button class="rt-btn rt-btn-danger-soft rt-btn-sm" data-del-voice="${v.id}">${ico('trash', 16)}ลบ</button>
        </div>
      </div>`;
    }).join('');
  };
  $('#voiceAdmin').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit-voice]');
    if (ed) return editVoice(S.boot.voices.find((v) => v.id === ed.dataset.editVoice));
    const del = e.target.closest('[data-del-voice]');
    if (!del) return;
    const v = S.boot.voices.find((x) => x.id === del.dataset.delVoice);
    if (!await UI.confirm({ variant: 'reject', title: `ลบเสียง “${v.name}”?`, message: 'ไฟล์เสียงที่สร้างไปแล้วยังอยู่ แต่จะเลือกเสียงนี้ไม่ได้อีก', confirmText: 'ลบ' })) return;
    try { await api(`/api/voices/${v.id}`, { method: 'DELETE' }); await reloadBoot(); loaders.voices(); UI.toast('ลบเสียงแล้ว'); } catch (err) { showError(err); }
  });
  $('#btnAddVoice').addEventListener('click', () => editVoice());

  function editVoice(v = {}) {
    const form = `<form class="rv-form-grid" id="voiceForm" onsubmit="return false">
      <div class="rt-field rv-span2"><label for="vf_name">ชื่อเสียงที่พนักงานเห็น <span class="rt-req">*</span></label><input class="rt-input rv-full" id="vf_name" maxlength="80" value="${esc(v.name || '')}" placeholder="เช่น ผู้หญิงเสียงสดใส"></div>
      <div class="rt-field rv-span2"><label for="vf_desc">คำอธิบาย</label><input class="rt-input rv-full" id="vf_desc" maxlength="200" value="${esc(v.description || '')}"></div>
      <div class="rt-field"><label for="vf_provider">ผู้ให้บริการเสียง</label><select class="rt-select rv-full" id="vf_provider" data-rt-native><option value="gemini">Google Gemini (ฟรี)</option><option value="azure">Microsoft Azure (ฟรี ต้องใช้บัตรสมัคร)</option><option value="elevenlabs">ElevenLabs (เสียเงิน)</option></select></div>
      <div class="rt-field"><label for="vf_gender">เพศผู้ประกาศ</label><select class="rt-select rv-full" id="vf_gender" data-rt-native><option value="female">ผู้หญิง (ค่ะ)</option><option value="male">ผู้ชาย (ครับ)</option></select></div>
      <div class="rt-field rv-span2"><label for="vf_id" id="vf_id_label">ชื่อเสียง <span class="rt-req">*</span></label>
        <div class="rv-row"><input class="rt-input rv-full" id="vf_id" maxlength="80" value="${esc(v.provider_voice_id || '')}">
        <button type="button" class="rt-btn rt-btn-glass" id="vf_pick">เลือกจากบัญชี</button></div></div>
      <div class="rt-field rv-span2" data-gemini-only><label for="vf_notes">ลักษณะเสียง (ภาษาอังกฤษ)</label><input class="rt-input rv-full" id="vf_notes" maxlength="200" value="${esc(v.voice_notes || '')}" placeholder="เช่น soft, sweet and gentle young woman"><span class="rt-help">บอก Gemini ว่าเสียงนี้ควรฟังเป็นแบบไหน</span></div>
      <div class="rt-field" data-azure-only><label for="vf_pitch">ระดับเสียงสูงต่ำ (%)</label><input class="rt-input rv-full" id="vf_pitch" type="number" min="-30" max="30" step="1" value="${Number(v.pitch_pct) || 0}"><span class="rt-help">ติดลบ = ทุ้มลง · บวก = สูงขึ้น</span></div>
      <div class="rt-field" data-azure-only><label for="vf_rate">ความเร็วพื้นฐาน (%)</label><input class="rt-input rv-full" id="vf_rate" type="number" min="-40" max="50" step="1" value="${Number(v.rate_pct) || 0}"><span class="rt-help">ติดลบ = ช้าลง · บวก = เร็วขึ้น</span></div>
      <div class="rt-field"><label for="vf_order">ลำดับ</label><input class="rt-input rv-full" id="vf_order" type="number" min="0" value="${Number(v.sort_order) || 0}"></div>
      <div class="rt-field rv-span2"><label for="vf_note">ที่มาของสิทธิ์การใช้เสียง</label><input class="rt-input rv-full" id="vf_note" maxlength="300" value="${esc(v.license_note || '')}" placeholder="เช่น เสียงมาตรฐานของ Microsoft Azure"></div>
      <label class="rt-switch rv-span2"><input type="checkbox" id="vf_active" ${v.active !== false ? 'checked' : ''}><span class="rt-switch-track"></span>เปิดให้พนักงานเลือกใช้</label>
      <label class="rv-check rv-span2"><input type="checkbox" id="vf_license" ${v.license_confirmed ? 'checked' : ''}> ยืนยันว่าบริษัทมีสิทธิ์ใช้เสียงนี้เพื่อการประกาศเชิงพาณิชย์ในร้าน และไม่ได้โคลนเสียงบุคคลโดยไม่ได้รับความยินยอม</label>
    </form>`;
    UI.popup({
      title: v.id ? 'แก้ไขเสียงผู้ประกาศ' : 'เพิ่มเสียงผู้ประกาศ', size: 'md', content: form,
      onOpen: ({ el }) => {
        $('#vf_gender', el).value = v.gender || 'female';
        $('#vf_provider', el).value = v.provider || 'gemini';
        const syncProvider = () => {
          const p = $('#vf_provider', el).value;
          $$('[data-azure-only]', el).forEach((n) => { n.hidden = p !== 'azure'; });
          $$('[data-gemini-only]', el).forEach((n) => { n.hidden = p !== 'gemini'; });
          $('#vf_id_label', el).innerHTML = `${{ gemini: 'ชื่อเสียง Gemini', azure: 'ชื่อเสียง Azure', elevenlabs: 'ElevenLabs Voice ID' }[p]} <span class="rt-req">*</span>`;
          $('#vf_id', el).placeholder = { gemini: 'เช่น Kore', azure: 'เช่น th-TH-PremwadeeNeural', elevenlabs: 'เช่น EXAVITQu4vr4xnSDxMaL' }[p];
        };
        $('#vf_provider', el).addEventListener('change', syncProvider);
        syncProvider();
        $('#vf_pick', el).onclick = async (e) => {
          const btn = e.currentTarget;
          const provider = $('#vf_provider', el).value;
          UI.setLoading(btn, true);
          try {
            const list = await api(`/api/provider-voices?provider=${provider}`);
            UI.setLoading(btn, false);
            if (!list.length) return UI.toast('ไม่พบเสียงภาษาไทยในบัญชีนี้', { type: 'warning' });
            const id = await UI.menu(btn, list.map((x) => ({ label: `${x.name}${x.gender ? ` · ${x.gender === 'male' ? 'ชาย' : x.gender === 'female' ? 'หญิง' : x.gender}` : ''}`, value: x.id })), { title: { gemini: 'เสียงของ Gemini (พูดไทยได้ทุกเสียง)', azure: 'เสียงภาษาไทยของ Azure', elevenlabs: 'เสียงในบัญชี ElevenLabs' }[provider] });
            if (id) {
              const x = list.find((y) => y.id === id);
              $('#vf_id', el).value = id;
              if (!$('#vf_note', el).value) $('#vf_note', el).value = { gemini: 'เสียงสำเร็จรูปของ Google Gemini (ฟรี)', azure: 'เสียงมาตรฐานของ Microsoft Azure' }[provider] || `ElevenLabs: ${x.name}`;
              if (x.gender === 'male' || x.gender === 'female') $('#vf_gender', el).value = x.gender;
            }
          } catch (err) { UI.setLoading(btn, false); showError(err); }
        };
      },
      actions: [
        { label: 'ยกเลิก', variant: 'glass', value: null },
        {
          label: 'บันทึก', variant: 'gold',
          onClick: async () => {
            const body = {
              id: v.id, name: $('#vf_name').value, description: $('#vf_desc').value, gender: $('#vf_gender').value,
              provider: $('#vf_provider').value, provider_voice_id: $('#vf_id').value.trim(),
              pitch_pct: $('#vf_pitch').value, rate_pct: $('#vf_rate').value, voice_notes: $('#vf_notes').value,
              sort_order: $('#vf_order').value, license_note: $('#vf_note').value,
              active: $('#vf_active').checked, license_confirmed: $('#vf_license').checked,
            };
            if (!body.license_confirmed) { UI.toast('ต้องยืนยันสิทธิ์การใช้เสียงก่อนบันทึก', { type: 'warning' }); return false; }
            try { await api('/api/voices', { method: 'POST', body }); await reloadBoot(); loaders.voices(); UI.toast('บันทึกเสียงผู้ประกาศแล้ว'); return true; }
            catch (err) { UI.toast(err.message, { type: 'error' }); return false; }
          },
        },
      ],
    });
  }


  // ───────── 7. branches ─────────
  function refreshBranchSelects() {
    fillBranchSelect($('#f_branch'), { value: $('#f_branch').value || localStorage.getItem(LS.branch) || '' });
    fillBranchSelect($('#libBranch'), { all: true, value: $('#libBranch').value });
    fillBranchSelect($('#histBranch'), { all: true, value: $('#histBranch').value });
    fillBranchSelect($('#defBranch'), { value: localStorage.getItem(LS.branch) || '' });
  }
  loaders.branches = () => {
    const list = S.boot.branches;
    const box = $('#branchTable');
    if (!list.length) return UI.state(box, 'empty', { title: 'ยังไม่มีสาขา', action: { label: 'เพิ่มสาขา', onClick: () => editBranch() } });
    box.innerHTML = `<table class="rt-table"><thead><tr><th>สาขา</th><th>สถานะ</th><th class="rt-right"></th></tr></thead><tbody>${list.map((b) => `
      <tr><td><span class="rt-cell-main">${esc(b.name)}${sampleBadge(b.is_sample)}</span><span class="rt-cell-sub">รหัส ${esc(b.code || '-')}</span></td>
      <td>${b.active !== false ? `<span class="rt-badge rt-badge-success">${ico('check', 13)}เปิด</span>` : `<span class="rt-badge rt-badge-neutral">${ico('x', 13)}ปิด</span>`}</td>
      <td class="rt-right rv-nowrap"><button class="rt-btn rt-btn-glass rt-btn-sm" data-edit-branch="${b.id}">${ico('edit', 16)}แก้ไข</button>
      <button class="rt-btn rt-btn-danger-soft rt-btn-sm" data-del-branch="${b.id}">${ico('trash', 16)}ลบ</button></td></tr>`).join('')}</tbody></table>`;
  };
  $('#branchTable').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit-branch]');
    if (ed) return editBranch(S.boot.branches.find((b) => b.id === ed.dataset.editBranch));
    const del = e.target.closest('[data-del-branch]');
    if (!del) return;
    const b = S.boot.branches.find((x) => x.id === del.dataset.delBranch);
    if (!await UI.confirm({ variant: 'reject', title: `ลบสาขา “${b.name}”?`, message: 'ไฟล์เสียงของสาขานี้ยังอยู่ในประวัติ แต่จะไม่ผูกกับสาขาแล้ว', confirmText: 'ลบ' })) return;
    try { await api(`/api/branches/${b.id}`, { method: 'DELETE' }); await reloadBoot(); loaders.branches(); UI.toast('ลบสาขาแล้ว'); } catch (err) { showError(err); }
  });
  $('#btnAddBranch').addEventListener('click', () => editBranch());
  function editBranch(b = {}) {
    UI.popup({
      title: b.id ? 'แก้ไขสาขา' : 'เพิ่มสาขา', size: 'sm',
      content: `<div class="rt-field"><label for="bf_name">ชื่อสาขา <span class="rt-req">*</span></label><input class="rt-input rv-full" id="bf_name" maxlength="120" value="${esc(b.is_sample ? '' : b.name || '')}" placeholder="เช่น สาขาแม่กลอง"></div>
        <div class="rt-field"><label for="bf_code">รหัสสาขา</label><input class="rt-input rv-full" id="bf_code" maxlength="20" value="${esc(b.is_sample ? '' : b.code || '')}"></div>
        <label class="rt-switch"><input type="checkbox" id="bf_active" ${b.active !== false ? 'checked' : ''}><span class="rt-switch-track"></span>เปิดใช้งาน</label>`,
      actions: [
        { label: 'ยกเลิก', variant: 'glass', value: null },
        {
          label: 'บันทึก', variant: 'gold',
          onClick: async () => {
            const body = { id: b.id, name: $('#bf_name').value.trim(), code: $('#bf_code').value.trim(), active: $('#bf_active').checked };
            if (!body.name) { UI.toast('กรุณาใส่ชื่อสาขา', { type: 'warning' }); return false; }
            try { await api('/api/branches', { method: 'POST', body }); await reloadBoot(); loaders.branches(); UI.toast('บันทึกสาขาแล้ว'); return true; }
            catch (err) { UI.toast(err.message, { type: 'error' }); return false; }
          },
        },
      ],
    });
  }

  // ───────── 8. settings ─────────
  loaders.settings = async () => {
    try { S.health = await api('/api/health'); } catch { /* keep last */ }
    const h = S.health || {};
    const row = (ok, title, sub) => `<div class="rt-list-row"><span class="rt-tile rt-tile-sm ${ok ? 'rt-tile-green' : 'rt-tile-red'}">${ico(ok ? 'check' : 'x', 16)}</span><div class="rv-grow"><span class="rt-cell-main">${title}</span><span class="rt-cell-sub">${sub}</span></div></div>`;
    $('#statusList').innerHTML = [
      row(h.scriptProvider !== 'template', 'AI เขียนสคริปต์', h.scriptProvider === 'gemini' ? `Google Gemini (ฟรี) · โมเดล ${esc(h.geminiModel)}` : h.scriptProvider === 'openai' ? `OpenAI · โมเดล ${esc(h.openaiModel)}` : 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY · ตอนนี้เขียนจากแม่แบบ (ไม่ใช้ AI)'),
      row(h.gemini, 'สร้างเสียง: Google Gemini TTS (ฟรี)', h.gemini ? `พร้อมใช้งาน · ${esc(h.geminiTtsModel || '')}` : 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY'),
      ...(h.azure ? [row(true, 'Microsoft Azure Speech', `พร้อมใช้งาน · region ${esc(h.azureRegion)}`)] : []),
      ...(h.elevenlabs ? [row(true, 'ElevenLabs (สร้างเสียง เสียเงิน)', `พร้อมใช้งาน · โมเดล ${esc(h.elevenModel)}`)] : []),
      row(h.supabase, 'Supabase Database + Storage', h.supabase ? 'เชื่อมต่อแล้ว · ไฟล์เสียงเก็บใน Storage' : 'ยังไม่ได้ตั้งค่า · ตอนนี้เก็บไฟล์ในเครื่องเซิร์ฟเวอร์'),
      row(!h.mock, 'โหมดใช้งานจริง', h.mock ? 'เปิดโหมดทดลองอยู่ (MOCK_MODE=1) ผลลัพธ์เป็นข้อมูลตัวอย่าง' : 'ปิดโหมดทดลองแล้ว'),
      row(h.adminProtected, 'ป้องกันเมนูผู้ดูแล', h.adminProtected ? 'ตั้งค่า ADMIN_CODE แล้ว' : 'ยังไม่ได้ตั้ง ADMIN_CODE ทุกคนแก้เสียงและสาขาได้'),
      row(h.requireAccessCode, 'รหัสเข้าใช้งานแอป', h.requireAccessCode ? 'ตั้งค่า APP_ACCESS_CODE แล้ว' : 'ไม่ได้ตั้ง APP_ACCESS_CODE ใครมีลิงก์ก็ใช้ได้'),
    ].join('');
    const dv = $('#defVoice');
    dv.innerHTML = activeVoices().map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
    dv.value = localStorage.getItem(LS.voice) || S.voiceId || '';
    renderAdminState();
  };
  function renderAdminState() {
    $('#adminState').textContent = sessionStorage.getItem('rv-admin') ? 'ใส่รหัส Admin ในแท็บนี้แล้ว' : 'ยังไม่ได้ใส่รหัส Admin (ระบบจะถามเมื่อจำเป็น)';
  }
  $('#defBranch').addEventListener('change', (e) => { localStorage.setItem(LS.branch, e.target.value); $('#f_branch').value = e.target.value; UI.toast('ตั้งสาขาเริ่มต้นแล้ว'); });
  $('#defVoice').addEventListener('change', (e) => { localStorage.setItem(LS.voice, e.target.value); S.voiceId = e.target.value; renderVoiceGrid(); UI.toast('ตั้งเสียงเริ่มต้นแล้ว'); });
  $('#btnAdminLogin').addEventListener('click', async () => { if (await askAdminCode('ใส่รหัส Admin เพื่อจัดการเสียงผู้ประกาศและสาขา')) UI.toast('รหัส Admin ถูกต้อง'); renderAdminState(); });
  $('#btnAdminLogout').addEventListener('click', () => { sessionStorage.removeItem('rv-admin'); renderAdminState(); UI.toast('ล้างรหัส Admin แล้ว', { type: 'info' }); });
  $('#libSearch').addEventListener('input', renderLib);
  $('#histSearch').addEventListener('input', renderHist);
  matchMedia('(max-width: 639px)').addEventListener('change', () => { if (histRows.length) renderHist(); });
  $('#libBranch').addEventListener('change', loaders.library);
  $('#histBranch').addEventListener('change', loaders.history);

  // ───────── boot ─────────
  async function boot() {
    renderNav();
    try {
      S.health = await api('/api/health');
      $('#mockBadge').hidden = !S.health.mock;
      S.boot = await api('/api/bootstrap');
    } catch (e) {
      const main = $('.rv-main');
      main.innerHTML = '<div id="bootErr"></div>';
      UI.state($('#bootErr'), 'error', { title: 'เปิดแอปไม่สำเร็จ', message: e.message, retry: () => location.reload() });
      return;
    }
    refreshBranchSelects();
    initCreate();
    window.addEventListener('hashchange', go);
    go();
  }
  boot();
})();
