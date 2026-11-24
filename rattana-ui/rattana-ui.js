/* Rattana CI v1.7.0 — behaviour helpers (no dependencies). window.RattanaUI */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, win = window;
  var KEY_THEME = 'rattana-ui-theme', KEY_LANG = 'rattana-ui-lang';
  var ICON = {
    check: 'M20 6 9 17l-5-5',
    x: 'M18 6 6 18M6 6l12 12',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
    info: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M12 16v-4M12 8h.01',
    warn: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01',
    sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
    moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
    help: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01'
  };
  var TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  var EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var uid = 0;
  /* switch automatic features off: <html data-rt-off="totop select search lightbox ripple"> (or on <body>) */
  function off(name) { var v = ((root.getAttribute('data-rt-off') || '') + ' ' + ((doc.body && doc.body.getAttribute('data-rt-off')) || '')).toLowerCase(); return new RegExp('(^|[\\s,])' + name + '($|[\\s,])').test(v); }
  var ICON_SCAN = 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M14 8v8M17 8v8';
  /* where rattana-ui.js was loaded from — the scanner engine, service worker and logo sit next to it */
  var BASE = (function () { try { var c = doc.currentScript && doc.currentScript.src; if (c && /rattana-ui(\.min)?\.js/.test(c)) return c.replace(/[^/]*$/, ''); } catch (e) {} return 'https://rattanaphaiboon.github.io/app/rattana-ui/'; })();
  var zxP = null;
  function loadZXing() {
    if (win.ZXingWASM && win.ZXingWASM.readBarcodes && zxP) return zxP;
    if (zxP) return zxP;
    zxP = new Promise(function (resolve, reject) {
      function ready() {
        var Z = win.ZXingWASM; if (!Z) return reject(new Error('zxing'));
        Z.prepareZXingModule({ overrides: { locateFile: function (path, prefix) { return /\.wasm$/.test(path) ? BASE + 'vendor/zxing_reader.wasm' : prefix + path; } }, fireImmediately: true });
        resolve(Z);
      }
      if (win.ZXingWASM) return ready();
      var sc = doc.createElement('script'); sc.src = BASE + 'vendor/zxing-reader.js'; sc.async = true;
      sc.onload = ready; sc.onerror = function () { zxP = null; reject(new Error('zxing load')); };
      doc.head.appendChild(sc);
    });
    return zxP;
  }
  var AC = null;
  function beep() {
    try { AC = AC || new (win.AudioContext || win.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = 1760; g.gain.setValueAtTime(0.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.18, AC.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.14);
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.15); } catch (e) {}
  }

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function mq(q) { return !!(win.matchMedia && win.matchMedia(q).matches); }
  function reducedMotion() { return mq('(prefers-reduced-motion: reduce)'); }
  function finePointer() { return mq('(hover: hover) and (pointer: fine)'); }
  function isPhone() { return mq('(max-width: 639px)') || (mq('(pointer: coarse)') && Math.min(screen.width, screen.height) < 600); }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(d, size, draw) {
    var ns = 'http://www.w3.org/2000/svg', s = doc.createElementNS(ns, 'svg'), p = doc.createElementNS(ns, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); if (size) { s.setAttribute('width', size); s.setAttribute('height', size); }
    p.setAttribute('d', d); if (draw) { p.setAttribute('pathLength', '1'); s.setAttribute('class', 'rt-draw'); }
    s.appendChild(p); return s;
  }
  function iconNode(icon) { if (!icon) return null; if (typeof icon === 'string') return svg(ICON[icon] || icon, 18); return icon; }

  /* ---------- Platform detection ---------- */
  var ua = navigator.userAgent || '';
  var IOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var ANDROID = /Android/i.test(ua);
  var platform = { os: IOS ? 'ios' : ANDROID ? 'android' : 'desktop', standalone: mq('(display-mode: standalone)') || navigator.standalone === true, touch: mq('(pointer: coarse)') };
  root.classList.add('rt-js');
  root.setAttribute('data-platform', platform.os);
  root.setAttribute('data-standalone', platform.standalone ? 'true' : 'false');
  function setInput() { platform.touch = mq('(pointer: coarse)'); root.setAttribute('data-input', platform.touch ? 'touch' : 'mouse'); }
  setInput();
  if (win.matchMedia) { try { win.matchMedia('(pointer: coarse)').addEventListener('change', setInput); } catch (e) {} }
  /* on-screen keyboard height → --rt-kb (keeps sheets above the keyboard on iOS/Android) */
  if (win.visualViewport) {
    var vv = win.visualViewport;
    var onVV = function () { var kb = Math.max(0, win.innerHeight - vv.height - vv.offsetTop); root.style.setProperty('--rt-kb', (kb > 80 ? Math.round(kb) : 0) + 'px'); };
    vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV);
  }
  /* remember where the user last pressed: popups grow from there, theme reveal starts there */
  var lastPointer = { x: win.innerWidth / 2, y: win.innerHeight / 2, t: 0 };
  doc.addEventListener('pointerdown', function (e) { lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);

  /* ---------- Scroll lock & focus trap ---------- */
  var locks = 0;
  function lockScroll() { if (locks++ === 0) { root.style.setProperty('--rt-sbw', Math.max(0, win.innerWidth - root.clientWidth) + 'px'); root.classList.add('rt-locked'); } }
  function unlockScroll() { locks = Math.max(0, locks - 1); if (!locks) root.classList.remove('rt-locked'); }
  function focusables(box) {
    return [].slice.call(box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (n) { return n.offsetWidth || n.offsetHeight || n === doc.activeElement; });
  }
  function trapTab(e, box) {
    if (e.key !== 'Tab') return;
    var f = focusables(box); if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function btnClass(v) { return { gold: 'rt-btn-gold', primary: 'rt-btn-gold', approve: 'rt-btn-approve', ok: 'rt-btn-approve', reject: 'rt-btn-reject', danger: 'rt-btn-reject', glass: 'rt-btn-glass', cancel: 'rt-btn-glass', ghost: 'rt-btn-ghost' }[v] || 'rt-btn-gold'; }
  function settle(node) { node.addEventListener('animationend', function h(e) { if (e.target === node) { node.classList.add('is-settled'); node.removeEventListener('animationend', h); } }); }

  /* swipe a bottom sheet down to close (from its handle, header or icon) */
  function dragToClose(box, onClose) {
    var y0 = 0, dy = 0, t0 = 0, active = false;
    box.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('.rt-sheet-handle, .rt-popup-head, .rt-popup-icon')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      active = true; y0 = e.clientY; dy = 0; t0 = Date.now();
      box.classList.add('is-settled', 'is-dragging');
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
    });
    box.addEventListener('pointermove', function (e) {
      if (!active) return;
      var d = e.clientY - y0; dy = d > 0 ? d : d / 6; /* rubber-band upward */
      box.style.transform = 'translateY(' + dy + 'px)';
    });
    function end() {
      if (!active) return; active = false; box.classList.remove('is-dragging');
      var speed = dy / Math.max(1, Date.now() - t0);
      if (dy > 110 || speed > 0.65) {
        box.style.transition = 'transform .26s cubic-bezier(.4,0,1,1)'; box.style.transform = 'translateY(115%)';
        UI.haptic('light'); setTimeout(function () { onClose(true); }, 240);
      } else {
        box.style.transition = 'transform .5s var(--rt-ease-spring)'; box.style.transform = '';
        setTimeout(function () { box.style.transition = ''; }, 520);
      }
    }
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  }

  function popupIcon(kind) {
    var map = { success: ['rt-tile-green', ICON.check, 1], approve: ['rt-tile-green', ICON.check], error: ['rt-tile-red', ICON.x], reject: ['rt-tile-red', ICON.x], warning: ['rt-tile-amber', ICON.warn], info: ['rt-tile-blue', ICON.info], question: ['rt-tile-gold', ICON.help], gold: ['rt-tile-gold', ICON.check], bell: ['rt-tile-gold', ICON.bell], scan: ['rt-tile-navy', ICON_SCAN] };
    var m = map[kind] || (typeof kind === 'string' && /[0-9]/.test(kind) ? ['rt-tile-gold', kind] : map.info);
    var w = el('div', 'rt-popup-icon rt-tile ' + m[0]);
    w.appendChild(svg(m[1], 30, true));
    if (m[2]) { var b = el('span', 'rt-burst'); for (var i = 0; i < 12; i++) { var d = el('i'); d.style.setProperty('--a', (i * 30) + 'deg'); b.appendChild(d); } w.appendChild(b); }
    return w;
  }

  var UI = {
    version: '1.7.0',
    icons: ICON,
    platform: platform,

    /* ---------- Theme ---------- */
    getTheme: function () { return root.getAttribute('data-theme') || 'light'; },
    setTheme: function (t) {
      t = t === 'dark' ? 'dark' : 'light';
      root.setAttribute('data-theme', t); store(KEY_THEME, t);
      var meta = doc.querySelector('meta[name="theme-color"]:not([media])');
      if (meta) meta.setAttribute('content', t === 'dark' ? '#06172b' : '#eef3f9');
      doc.querySelectorAll('[data-rt-theme-toggle]').forEach(function (b) {
        b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
        var p = b.querySelector('path[data-rt-theme-icon]'); if (p) p.setAttribute('d', t === 'dark' ? ICON.moon : ICON.sun);
        var lab = b.querySelector('[data-rt-theme-label]'); if (lab) lab.textContent = t === 'dark' ? (UI.getLang() === 'en' ? 'Dark' : 'มืด') : (UI.getLang() === 'en' ? 'Light' : 'สว่าง');
      });
      root.dispatchEvent(new CustomEvent('rt:theme', { detail: t }));
      return t;
    },
    /* switches theme with a circle that grows from the button (View Transitions, where supported) */
    toggleTheme: function () {
      var next = UI.getTheme() === 'dark' ? 'light' : 'dark';
      if (!doc.startViewTransition || reducedMotion()) return UI.setTheme(next);
      var x = lastPointer.x, y = lastPointer.y;
      root.style.setProperty('--rt-vt-x', x + 'px'); root.style.setProperty('--rt-vt-y', y + 'px');
      root.style.setProperty('--rt-vt-r', Math.ceil(Math.hypot(Math.max(x, win.innerWidth - x), Math.max(y, win.innerHeight - y))) + 'px');
      root.classList.add('rt-vt-theme');
      function done() { root.classList.remove('rt-vt-theme'); }
      try {
        var vt = doc.startViewTransition(function () { UI.setTheme(next); });
        vt.finished.then(done, done);
      } catch (e) { UI.setTheme(next); done(); }
      return next;
    },

    /* ---------- Language: elements carry data-th / data-en ---------- */
    getLang: function () { return root.getAttribute('lang') === 'en' ? 'en' : 'th'; },
    setLang: function (l) {
      l = l === 'en' ? 'en' : 'th';
      root.setAttribute('lang', l); store(KEY_LANG, l);
      doc.querySelectorAll('[data-th]').forEach(function (n) { var v = n.getAttribute('data-' + l); if (v != null) n.textContent = v; });
      doc.querySelectorAll('[data-th-placeholder]').forEach(function (n) { var v = n.getAttribute('data-' + l + '-placeholder'); if (v != null) n.setAttribute('placeholder', v); });
      doc.querySelectorAll('[data-th-aria]').forEach(function (n) { var v = n.getAttribute('data-' + l + '-aria'); if (v != null) n.setAttribute('aria-label', v); });
      doc.querySelectorAll('[data-rt-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-rt-lang') === l ? 'true' : 'false'); });
      doc.querySelectorAll('[data-rt-date]').forEach(function (n) { n.textContent = UI.formatDate(new Date(), n.getAttribute('data-rt-date') || 'long'); });
      doc.querySelectorAll('.rt-seg').forEach(function (s) { if (s._rtPick) s._rtPick(); });
      UI.setTheme(UI.getTheme());
      root.dispatchEvent(new CustomEvent('rt:lang', { detail: l }));
      return l;
    },

    /* ---------- Formatting ---------- */
    formatDate: function (d, style, lang) {
      d = d instanceof Date ? d : new Date(d); lang = lang || UI.getLang();
      var day = d.getDate(), m = d.getMonth(), y = d.getFullYear();
      if (lang === 'en') return style === 'short' ? day + ' ' + EN_MONTHS[m] + ' ' + y : EN_DAYS[d.getDay()] + ', ' + day + ' ' + EN_MONTHS[m] + ' ' + y;
      var be = y + 543;
      return style === 'short' ? day + ' ' + TH_MONTHS_SHORT[m] + ' ' + be : TH_DAYS[d.getDay()] + ' ' + day + ' ' + TH_MONTHS[m] + ' ' + be;
    },
    formatTime: function (d, lang) {
      d = d instanceof Date ? d : new Date(d);
      var t = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      return (lang || UI.getLang()) === 'en' ? t : t + ' น.';
    },
    formatMoney: function (n, decimals) {
      var d = decimals == null ? (n % 1 ? 2 : 0) : decimals;
      return '฿' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },

    /* ---------- Haptics (Android; silently ignored on iOS/desktop) ---------- */
    haptic: function (kind) {
      if (!navigator.vibrate || reducedMotion()) return;
      var p = { light: 8, medium: 16, success: [10, 40, 18], warning: [22, 60, 22], error: [28, 50, 28, 50, 28] }[kind || 'light'];
      try { navigator.vibrate(p); } catch (e) {}
    },

    /* ---------- Popup: centered modal on laptops, swipe-able bottom sheet on phones ---------- */
    popup: function (o) {
      o = o || {};
      return new Promise(function (resolve) {
        var drawer = o.drawer && !isPhone() ? o.drawer : null;
        var asSheet = !drawer && (o.sheet === true || (o.sheet !== false && isPhone()));
        var prev = doc.activeElement;
        var ov = el('div', 'rt-overlay' + (asSheet ? ' is-sheet' : '') + (drawer ? ' is-drawer' + (drawer === 'left' ? ' is-left' : '') : ''));
        var scrim = el('div', 'rt-scrim');
        var box = el('div', 'rt-modal rt-glass rt-popup' + (o.center ? ' is-center' : '') + (o.className ? ' ' + o.className : ''));
        box.setAttribute('role', o.role || (o.icon === 'error' || o.icon === 'warning' ? 'alertdialog' : 'dialog'));
        box.setAttribute('aria-modal', 'true');
        if (o.size) box.style.maxWidth = { sm: '400px', md: '520px', lg: '720px', xl: '960px' }[o.size] || o.size;
        var id = 'rt-p-' + (++uid);
        if (asSheet) { var hd = el('div', 'rt-sheet-handle'); hd.setAttribute('aria-hidden', 'true'); box.appendChild(hd); }
        if (o.icon) box.appendChild(popupIcon(o.icon));
        if (o.title || o.message) {
          var head = el('div', 'rt-popup-head');
          if (o.title) { var h = el('h2', 'rt-h3', o.title); h.id = id; head.appendChild(h); box.setAttribute('aria-labelledby', id); }
          if (o.message) { var p = el('p', 'rt-popup-msg', o.message); p.id = id + '-d'; head.appendChild(p); box.setAttribute('aria-describedby', p.id); }
          box.appendChild(head);
        }
        if (o.content) { var body = el('div', 'rt-popup-body'); if (typeof o.content === 'string') body.innerHTML = o.content; else body.appendChild(o.content); box.appendChild(body); }
        var buttons = [];
        var api = { el: box, close: function (v) { close(v); } };
        var acts = o.actions || [];
        if (acts.length) {
          var row = el('div', 'rt-popup-actions' + (acts.length > 2 ? ' is-stacked' : ''));
          acts.forEach(function (a) {
            var b = el('button', 'rt-btn ' + btnClass(a.variant) + (asSheet ? ' rt-btn-lg' : ''));
            b.type = 'button'; if (a.icon) b.appendChild(iconNode(a.icon)); b.appendChild(el('span', null, a.label));
            b.addEventListener('click', function () {
              var val = a.value !== undefined ? a.value : a.label;
              if (a.onClick) {
                var r = a.onClick(api, b);
                if (r === false) return;
                if (r && typeof r.then === 'function') {
                  UI.setLoading(b, true);
                  r.then(function (v) { UI.setLoading(b, false); if (v !== false) close(val); }, function () { UI.setLoading(b, false); });
                  return;
                }
              }
              close(val);
            });
            row.appendChild(b); buttons.push(b);
          });
          box.appendChild(row);
        }
        [].forEach.call(box.children, function (c, i) { c.style.setProperty('--i', i); });
        if (!asSheet && !drawer && Date.now() - lastPointer.t < 1500) {
          box.style.setProperty('--rt-from-x', Math.round((lastPointer.x - win.innerWidth / 2) * 0.3) + 'px');
          box.style.setProperty('--rt-from-y', Math.round((lastPointer.y - win.innerHeight / 2) * 0.3) + 'px');
        }
        ov.appendChild(scrim); ov.appendChild(box); doc.body.appendChild(ov);
        settle(box); lockScroll(); UI.haptic('light'); UI.init(box);
        var closed = false;
        function close(v, instant) {
          if (closed) return; closed = true;
          doc.removeEventListener('keydown', onKey, true);
          function done() { ov.remove(); unlockScroll(); if (prev && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e) {} } if (o.onClose) o.onClose(v); resolve(v); }
          if (instant === true) { ov.classList.add('is-closing'); setTimeout(done, 160); return; }
          if (reducedMotion()) { done(); return; }
          ov.classList.add('is-closing'); setTimeout(done, asSheet || drawer ? 330 : 210);
        }
        function onKey(e) {
          if (e.key === 'Escape' && o.dismissible !== false) { e.preventDefault(); close(o.cancelValue); }
          trapTab(e, box);
        }
        doc.addEventListener('keydown', onKey, true);
        if (o.dismissible !== false) {
          scrim.addEventListener('click', function () { close(o.cancelValue); });
          if (asSheet) dragToClose(box, function () { close(o.cancelValue, true); });
        }
        setTimeout(function () {
          var f = box.querySelector('[autofocus]') || (platform.touch ? null : buttons[buttons.length - 1]) || box;
          if (f === box) box.setAttribute('tabindex', '-1');
          try { f.focus({ preventScroll: true }); } catch (e) {}
        }, 40);
        if (o.onOpen) o.onOpen(api);
      });
    },
    sheet: function (o) { o = o || {}; o.sheet = true; return UI.popup(o); },
    drawer: function (o) { o = o || {}; o.drawer = o.side || 'right'; return UI.popup(o); },

    /* ---------- Confirm → Promise<boolean> ---------- */
    confirm: function (o) {
      o = o || {};
      var v = o.variant || 'approve', en = UI.getLang() === 'en';
      return UI.popup({
        title: o.title, message: o.message, content: o.content,
        icon: o.icon || (v === 'reject' ? 'reject' : v === 'gold' ? 'question' : 'approve'),
        center: o.center !== false, sheet: o.sheet, cancelValue: false, size: o.size,
        actions: [
          { label: o.cancelText || (en ? 'Cancel' : 'ยกเลิก'), variant: 'glass', value: false },
          { label: o.confirmText || (en ? 'Confirm' : 'ยืนยัน'), variant: v === 'reject' ? 'reject' : v === 'gold' ? 'gold' : 'approve', value: true, onClick: o.onConfirm }
        ]
      }).then(function (r) { if (r === true) UI.haptic(v === 'reject' ? 'warning' : 'success'); return r === true; });
    },

    /* ---------- Alert with animated icon (success / error / warning / info) ---------- */
    alert: function (o) {
      if (typeof o === 'string') o = { title: o };
      o = o || {};
      var type = o.type || 'success', en = UI.getLang() === 'en';
      UI.haptic(type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success');
      return UI.popup({ icon: type, title: o.title, message: o.message, content: o.content, center: true, sheet: o.sheet, size: o.size || 'sm', cancelValue: true,
        actions: [{ label: o.okText || (en ? 'OK' : 'ตกลง'), variant: 'approve', value: true }] });
    },

    /* ---------- Menu: popover under the trigger on laptops, action sheet on phones ---------- */
    menu: function (anchor, items, o) {
      o = o || {}; items = items || [];
      var en = UI.getLang() === 'en';
      function list(pick) {
        var wrap = el('div', 'rt-menu-list'); wrap.setAttribute('role', 'menu');
        if (o.label) wrap.appendChild(el('div', 'rt-menu-label', o.label));
        var i = 0;
        items.forEach(function (it) {
          if (it === '-' || it === 'separator') { wrap.appendChild(el('div', 'rt-menu-sep')); return; }
          var b = el('button', 'rt-menu-item' + (it.danger ? ' is-danger' : '')); b.type = 'button'; b.setAttribute('role', 'menuitem');
          if (it.disabled) b.disabled = true;
          if (it.icon) b.appendChild(iconNode(it.icon));
          b.appendChild(el('span', null, it.label)); b.style.setProperty('--i', i++);
          b.addEventListener('click', function () { if (it.onClick) it.onClick(); pick(it.value !== undefined ? it.value : it.label); });
          wrap.appendChild(b);
        });
        return wrap;
      }
      if (isPhone() || o.sheet === true || !anchor) {
        var ref = {};
        return UI.popup({ title: o.title, message: o.message, sheet: true, cancelValue: null,
          onOpen: function (api) { ref.api = api; },
          content: list(function (v) { ref.api.close(v); }),
          actions: [{ label: en ? 'Cancel' : 'ยกเลิก', variant: 'glass', value: null }] });
      }
      return new Promise(function (resolve) {
        var pop = el('div', 'rt-popover rt-glass'); var prev = doc.activeElement; var closed = false;
        pop.appendChild(list(close));
        doc.body.appendChild(pop);
        var r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 8;
        var left = o.align === 'end' ? r.right - pw : r.left, top = r.bottom + gap, ox = o.align === 'end' ? 'right' : 'left', oy = 'top';
        if (left + pw > win.innerWidth - 12) { left = win.innerWidth - 12 - pw; ox = 'right'; }
        if (left < 12) left = 12;
        if (top + ph > win.innerHeight - 12 && r.top - gap - ph > 12) { top = r.top - gap - ph; oy = 'bottom'; }
        pop.style.left = Math.round(left) + 'px'; pop.style.top = Math.round(top) + 'px';
        pop.style.setProperty('--rt-origin', oy + ' ' + ox);
        anchor.setAttribute('aria-expanded', 'true');
        var its = [].slice.call(pop.querySelectorAll('.rt-menu-item:not(:disabled)'));
        if (its[0]) its[0].focus({ preventScroll: true });
        function close(v) {
          if (closed) return; closed = true;
          doc.removeEventListener('pointerdown', outside, true); doc.removeEventListener('keydown', key, true); win.removeEventListener('resize', dismiss); win.removeEventListener('scroll', dismiss, true);
          anchor.setAttribute('aria-expanded', 'false');
          pop.classList.add('is-closing'); setTimeout(function () { pop.remove(); }, reducedMotion() ? 0 : 150);
          if (v !== null && v !== undefined) UI.haptic('light'); else if (prev && prev.focus) prev.focus({ preventScroll: true });
          resolve(v === undefined ? null : v);
        }
        function dismiss() { close(null); }
        function outside(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(null); }
        function key(e) {
          var i = its.indexOf(doc.activeElement);
          if (e.key === 'Escape') { e.preventDefault(); close(null); anchor.focus(); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); (its[i + 1] || its[0]).focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); (its[i - 1] || its[its.length - 1]).focus(); }
          else if (e.key === 'Tab') close(null);
        }
        setTimeout(function () { doc.addEventListener('pointerdown', outside, true); }, 0);
        doc.addEventListener('keydown', key, true); win.addEventListener('resize', dismiss); win.addEventListener('scroll', dismiss, true);
      });
    },

    /* ---------- Premium dropdown for <select class="rt-select"> (laptops; phones keep the OS picker) ---------- */
    selectMenu: function (sel) {
      if (!sel || sel.disabled || sel._rtOpen) return null;
      var en = UI.getLang() === 'en', opener = sel, closed = false;
      sel._rtOpen = true; sel.setAttribute('data-rt-open', ''); sel.setAttribute('aria-expanded', 'true');
      var pop = el('div', 'rt-popover rt-glass rt-select-pop'), list = el('div', 'rt-menu-list'), rows = [], q = null, empty = null;
      list.setAttribute('role', 'listbox'); if (sel.id) list.setAttribute('aria-labelledby', sel.id);
      var all = [].slice.call(sel.options).filter(function (o) { return !o.hidden; });
      if (all.length > 10) {
        var sb = el('label', 'rt-select-search'); sb.appendChild(svg('M11 3a8 8 0 1 0 0 16a8 8 0 1 0 0-16M21 21l-4.3-4.3', 16));
        q = el('input'); q.type = 'search'; q.autocomplete = 'off'; q.placeholder = en ? 'Search…' : 'พิมพ์เพื่อค้นหา…'; sb.appendChild(q); pop.appendChild(sb);
      }
      var n = 0;
      function addOpt(o, grp) {
        if (o.hidden) return;
        var b = el('button', 'rt-menu-item rt-option'); b.type = 'button'; b.setAttribute('role', 'option');
        var on = o.selected && (o.value !== '' || sel.selectedIndex === o.index);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        if (o.disabled || (grp && grp.disabled)) b.disabled = true;
        b.appendChild(el('span', null, o.label || o.text)); var ck = svg(ICON.check, 18); ck.setAttribute('class', 'rt-option-check'); b.appendChild(ck);
        b.style.setProperty('--i', Math.min(n++, 14));
        b.addEventListener('click', function () { choose(o); });
        b._opt = o; b._grp = grp || null; rows.push(b); list.appendChild(b);
      }
      [].forEach.call(sel.children, function (c) {
        if (c.tagName === 'OPTGROUP') { var lab = el('div', 'rt-menu-label', c.label); lab._isGroup = c; list.appendChild(lab); [].forEach.call(c.children, function (o) { addOpt(o, c); }); }
        else if (c.tagName === 'OPTION') addOpt(c);
      });
      empty = el('div', 'rt-select-empty', en ? 'No matches' : 'ไม่พบรายการ'); empty.hidden = true; list.appendChild(empty);
      pop.appendChild(list); doc.body.appendChild(pop);
      /* position under (or above) the select, as wide as it */
      var r = sel.getBoundingClientRect(), gap = 6, vw = win.innerWidth, vh = win.innerHeight;
      var w = Math.min(Math.max(r.width, 220), vw - 24); pop.style.width = w + 'px'; pop.style.maxWidth = 'calc(100vw - 24px)';
      var below = vh - r.bottom - gap - 12, above = r.top - gap - 12, up = below < 240 && above > below;
      pop.style.maxHeight = Math.max(160, Math.min(380, up ? above : below)) + 'px';
      var left = Math.min(Math.max(12, r.left), vw - 12 - w);
      pop.style.left = Math.round(left) + 'px';
      if (up) { pop.style.top = 'auto'; pop.style.bottom = Math.round(vh - r.top + gap) + 'px'; } else pop.style.top = Math.round(r.bottom + gap) + 'px';
      pop.style.setProperty('--rt-origin', (up ? 'bottom' : 'top') + ' center');
      function visible() { return rows.filter(function (b) { return !b.hidden && !b.disabled; }); }
      var cur = rows.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0];
      if (cur) cur.scrollIntoView({ block: 'center' });
      setTimeout(function () { try { (q || cur || visible()[0] || pop).focus({ preventScroll: true }); } catch (e) {} }, 0);
      function choose(o) {
        if (sel.value !== o.value || sel.selectedIndex !== o.index) {
          sel.selectedIndex = o.index;
          sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        UI.haptic('light'); close(true);
      }
      function close(picked) {
        if (closed) return; closed = true; sel._rtOpen = false;
        sel.removeAttribute('data-rt-open'); sel.setAttribute('aria-expanded', 'false');
        win.removeEventListener('pointerdown', outside, true); win.removeEventListener('keydown', key, true);
        win.removeEventListener('resize', dismiss); win.removeEventListener('scroll', onScroll, true);
        pop.classList.add('is-closing'); setTimeout(function () { pop.remove(); }, reducedMotion() ? 0 : 150);
        try { opener.focus({ preventScroll: true }); } catch (e) {}
        void picked;
      }
      function dismiss() { close(false); }
      sel._rtClose = dismiss;
      function onScroll(e) { if (!pop.contains(e.target)) close(false); }
      function outside(e) { if (!pop.contains(e.target) && e.target !== sel) close(false); }
      function filter() {
        var t = q.value.trim().toLowerCase(), any = false;
        rows.forEach(function (b) { var hit = !t || (b._opt.label || b._opt.text).toLowerCase().indexOf(t) > -1 || String(b._opt.value).toLowerCase().indexOf(t) > -1; b.hidden = !hit; if (hit) any = true; });
        [].forEach.call(list.querySelectorAll('.rt-menu-label'), function (lab) { lab.hidden = !rows.some(function (b) { return b._grp === lab._isGroup && !b.hidden; }); });
        empty.hidden = any;
      }
      if (q) q.addEventListener('input', filter);
      function key(e) {
        var v = visible(), i = v.indexOf(doc.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
        else if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); close(false); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); (v[i + 1] || v[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0 && q) q.focus(); else (v[i - 1] || v[v.length - 1]).focus(); }
        else if (e.key === 'Home' && i > -1) { e.preventDefault(); v[0].focus(); }
        else if (e.key === 'End' && i > -1) { e.preventDefault(); v[v.length - 1].focus(); }
        else if (e.key === 'Enter' && doc.activeElement === q) { e.preventDefault(); if (v[0]) choose(v[0]._opt); }
        else if (!q && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          var k = e.key.toLowerCase(), start = i + 1;
          for (var j = 0; j < v.length; j++) { var b = v[(start + j) % v.length]; if (b.textContent.trim().toLowerCase().indexOf(k) === 0) { b.focus(); break; } }
        }
      }
      /* window-level capture so a dropdown inside a popup handles Esc/Tab before the popup does */
      setTimeout(function () { win.addEventListener('pointerdown', outside, true); }, 0);
      win.addEventListener('keydown', key, true); win.addEventListener('resize', dismiss); win.addEventListener('scroll', onScroll, true);
      return { close: dismiss, el: pop };
    },

    /* ---------- Notification count: bell badge + app icon badge + tab title ---------- */
    /* RattanaUI.setBadge(n) — updates every .rt-count inside [data-rt-bell] (or the elements you pass) */
    setBadge: function (n, targets) {
      n = Math.max(0, parseInt(n, 10) || 0);
      var list = targets ? [].concat(typeof targets === 'string' ? [].slice.call(doc.querySelectorAll(targets)) : targets) : [].slice.call(doc.querySelectorAll('[data-rt-bell]'));
      list.forEach(function (host) {
        if (!host) return;
        var c = host.classList && host.classList.contains('rt-count') ? host : host.querySelector('.rt-count');
        if (!c) { c = el('span', 'rt-count'); c.setAttribute('aria-hidden', 'true'); host.appendChild(c); }
        var prev = parseInt(c.getAttribute('data-n') || '0', 10);
        c.setAttribute('data-n', String(n)); c.textContent = n ? (n > 99 ? '99+' : String(n)) : '';
        if (host !== c) { var lab = host.getAttribute('data-rt-bell-label') || host.getAttribute('aria-label') || ''; lab = lab.replace(/\s*\(\d+\+?\)$/, ''); if (lab) host.setAttribute('aria-label', n ? lab + ' (' + n + ')' : lab); if (!host.getAttribute('data-rt-bell-label') && lab) host.setAttribute('data-rt-bell-label', lab); }
        if (n > prev) {
          c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump');
          if (host !== c && !reducedMotion()) { host.classList.remove('is-ringing'); void host.offsetWidth; host.classList.add('is-ringing'); setTimeout(function () { host.classList.remove('is-ringing'); }, 950); }
        }
      });
      try { if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) {}
      if (UI._titleBadge !== false) { var t = doc.title.replace(/^\(\d+\+?\)\s+/, ''); doc.title = n ? '(' + (n > 99 ? '99+' : n) + ') ' + t : t; }
      return n;
    },

    /* ---------- Notifications outside the app (system notifications) ---------- */
    notifySupport: function () {
      var P = UI.platform || {};
      if (!('Notification' in win)) return P.os === 'ios' && !P.standalone ? 'ios-install' : 'unsupported';
      if (!win.isSecureContext) return 'insecure';
      return 'ok';
    },
    /* Ask once, with a Rattana prompt first (the browser only asks after a tap). → Promise<'granted'|'denied'|'default'|'unsupported'> */
    notifyPermission: function (o) {
      o = o || {};
      var sup = UI.notifySupport(), en = UI.getLang() === 'en';
      if (sup === 'ios-install') {
        return UI.popup({ icon: 'info', title: en ? 'Add to Home Screen first' : 'เพิ่มแอปไว้ที่หน้าจอโฮมก่อน',
          message: en ? 'On iPhone, notifications work once the app is on your Home Screen.' : 'บน iPhone/iPad ต้องเพิ่มแอปไว้ที่หน้าจอโฮมก่อน ถึงจะแจ้งเตือนได้',
          content: '<ol class="rt-notify-steps"><li>' + (en ? 'Tap Share in Safari' : 'แตะปุ่ม "แชร์" ใน Safari') + '</li><li>' + (en ? 'Choose “Add to Home Screen”' : 'เลือก "เพิ่มไปยังหน้าจอโฮม"') + '</li><li>' + (en ? 'Open the app from the Home Screen and turn notifications on' : 'เปิดแอปจากหน้าจอโฮม แล้วกดเปิดการแจ้งเตือน') + '</li></ol>',
          actions: [{ label: en ? 'OK' : 'เข้าใจแล้ว', variant: 'gold', value: 'unsupported' }] }).then(function () { return 'unsupported'; });
      }
      if (sup !== 'ok') return Promise.resolve('unsupported');
      if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
      return UI.popup({ icon: 'bell', title: o.title || (en ? 'Turn on notifications?' : 'เปิดการแจ้งเตือนไหม?'),
        message: o.message || (en ? 'Get alerts even when the app is in the background.' : 'รับแจ้งเตือนงานใหม่ แม้ไม่ได้เปิดหน้าแอปอยู่'),
        actions: [{ label: en ? 'Not now' : 'ไว้ทีหลัง', variant: 'glass', value: 'default' },
                  { label: en ? 'Turn on' : 'เปิดแจ้งเตือน', variant: 'gold', value: 'ask', onClick: function () { return Notification.requestPermission().then(function (p) { UI._perm = p; }); } }]
      }).then(function (v) { if (v === 'ask') { var p = UI._perm || Notification.permission; if (p === 'granted') UI.toast(en ? 'Notifications on' : 'เปิดการแจ้งเตือนแล้ว'); else if (p === 'denied') UI.toast(en ? 'Notifications are blocked in browser settings' : 'เบราว์เซอร์บล็อกการแจ้งเตือนไว้ — เปิดได้ที่การตั้งค่าเว็บไซต์', { type: 'warning', duration: 6000 }); return p; } return 'default'; });
    },
    _sw: function () {
      if (UI._swP) return UI._swP;
      UI._swP = new Promise(function (resolve) {
        try {
          if (!('serviceWorker' in navigator) || !win.isSecureContext) return resolve(null);
          var swUrl = new URL('rattana-sw.js', BASE);
          if (swUrl.origin !== location.origin) return resolve(null);
          navigator.serviceWorker.register(swUrl.href, { scope: new URL('./', swUrl).pathname }).then(function (reg) {
            if (reg.active) return resolve(reg);
            var w = reg.installing || reg.waiting; if (!w) return resolve(reg);
            w.addEventListener('statechange', function () { if (w.state === 'activated') resolve(reg); });
            setTimeout(function () { resolve(reg); }, 4000);
          }, function () { resolve(null); });
        } catch (e) { resolve(null); }
      });
      return UI._swP;
    },
    /* RattanaUI.notify('มีคำขอใหม่', { body, url, tag, icon, badge: n, force }) — system notification when the app is in the background
       (or always with force:true); in-app toast while the user is looking at it. → Promise<boolean shown as system notification> */
    notify: function (title, o) {
      o = o || {};
      if (o.badge != null) UI.setBadge(o.badge);
      var visible = doc.visibilityState === 'visible' && doc.hasFocus && doc.hasFocus();
      if (visible && !o.force) { UI.toast((title || '') + (o.body ? ' — ' + o.body : ''), { type: o.type || 'info', duration: o.duration || 5000, action: o.url ? { label: UI.getLang() === 'en' ? 'Open' : 'เปิด', onClick: function () { location.href = o.url; } } : undefined }); UI.haptic('light'); return Promise.resolve(false); }
      if (UI.notifySupport() !== 'ok' || Notification.permission !== 'granted') {
        if (visible || o.force) UI.toast(title + (o.body ? ' — ' + o.body : ''), { type: o.type || 'info' });
        return Promise.resolve(false);
      }
      var ai = appLogo({}); var opts = { body: o.body || '', icon: o.icon || (ai && ai !== 'rattana' ? ai : (ai === 'rattana' ? BASE + 'rattana-logo-navy.png' : undefined)), tag: o.tag || undefined, renotify: !!o.tag, silent: !!o.silent,
        requireInteraction: !!o.requireInteraction, data: { url: o.url || location.href }, vibrate: [80, 40, 80], lang: UI.getLang(), timestamp: Date.now() };
      if (o.badgeIcon) opts.badge = o.badgeIcon;
      return UI._sw().then(function (reg) {
        if (reg && reg.showNotification) return reg.showNotification(title, opts).then(function () { return true; });
        var n = new Notification(title, opts);
        n.onclick = function () { try { win.focus(); } catch (e) {} if (o.url && o.url !== location.href) location.href = o.url; n.close(); };
        return true;
      }).catch(function () { return false; });
    },

    /* ---------- Barcode / QR scanner ---------- */
    /* RattanaUI.scan({ title, hint, formats }) → Promise<string | null>
       Native BarcodeDetector when the device has it; otherwise the bundled ZXing (WebAssembly) engine. */
    scan: function (o) {
      o = o || {};
      var en = UI.getLang() === 'en', done = false, stream = null, track = null, raf = 0, busy = false, last = '', lastAt = 0, hits = 0;
      var ov = el('div', 'rt-scan'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', o.title || (en ? 'Scan barcode / QR' : 'สแกนบาร์โค้ด / QR'));
      var video = el('video'); video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true; video.autoplay = true;
      var mask = el('div', 'rt-scan-mask'), frame = el('div', 'rt-scan-frame'); for (var k = 0; k < 4; k++) frame.appendChild(el('i')); frame.appendChild(el('div', 'rt-scan-laser')); mask.appendChild(frame);
      var top = el('div', 'rt-scan-top'), ttl = el('div', 'rt-scan-title', o.title || (en ? 'Scan barcode / QR' : 'สแกนบาร์โค้ด / QR'));
      var x = el('button', 'rt-scan-btn is-icon'); x.type = 'button'; x.setAttribute('aria-label', en ? 'Close' : 'ปิด'); x.appendChild(svg(ICON.x, 22));
      top.appendChild(ttl); top.appendChild(x);
      var bottom = el('div', 'rt-scan-bottom'), hint = el('p', 'rt-scan-hint', o.hint || (en ? 'Point the camera at a barcode or QR code' : 'เล็งกล้องให้บาร์โค้ดหรือ QR อยู่ในกรอบ'));
      var row = el('div', 'rt-scan-row');
      var torch = el('button', 'rt-scan-btn is-icon'); torch.type = 'button'; torch.hidden = true; torch.setAttribute('aria-pressed', 'false'); torch.setAttribute('aria-label', en ? 'Flashlight' : 'ไฟฉาย'); torch.appendChild(svg('M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12zM6 6h12M12 12v.01', 20));
      var manual = el('button', 'rt-scan-btn'); manual.type = 'button'; manual.appendChild(svg('M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10', 20)); manual.appendChild(el('span', null, en ? 'Type the code' : 'พิมพ์รหัสเอง'));
      row.appendChild(torch); row.appendChild(manual); bottom.appendChild(hint); bottom.appendChild(row);
      ov.appendChild(video); ov.appendChild(mask); ov.appendChild(top); ov.appendChild(bottom);
      var opener = doc.activeElement; lockScroll(); doc.body.appendChild(ov);
      setTimeout(function () { try { x.focus({ preventScroll: true }); } catch (e) {} }, 50);
      var resolveP; var P = new Promise(function (r) { resolveP = r; });
      function stop() { cancelAnimationFrame(raf); raf = 0; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      function finish(v) {
        if (done) return; done = true; stop(); doc.removeEventListener('keydown', key, true);
        ov.classList.add('is-closing'); setTimeout(function () { ov.remove(); unlockScroll(); try { opener && opener.focus && opener.focus({ preventScroll: true }); } catch (e) {} }, reducedMotion() ? 0 : 200);
        resolveP(v == null ? null : String(v));
      }
      function key(e) { if (ov._paused) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); } else if (e.key === 'Tab') trapTab(e, ov); }
      doc.addEventListener('keydown', key, true);
      x.addEventListener('click', function () { finish(null); });
      manual.addEventListener('click', function () {
        stop(); ov._paused = true; ov.style.visibility = 'hidden';
        UI.popup({ icon: 'scan', title: en ? 'Type the code' : 'พิมพ์รหัสสินค้า / บาร์โค้ด', content: '<div class="rt-field"><label for="rt-scan-code">' + (en ? 'Code' : 'รหัส') + '</label><input class="rt-input" id="rt-scan-code" inputmode="text" autocomplete="off" enterkeyhint="done"></div>',
          actions: [{ label: en ? 'Back to camera' : 'กลับไปสแกน', variant: 'glass', value: null }, { label: en ? 'Use code' : 'ใช้รหัสนี้', variant: 'gold', value: 'ok', onClick: function (api) { var i = api.el.querySelector('#rt-scan-code'); if (!i.value.trim()) { i.focus(); return false; } api._code = i.value.trim(); P._code = i.value.trim(); } }],
          onOpen: function (api) { var i = api.el.querySelector('#rt-scan-code'); if (i) { setTimeout(function () { i.focus(); }, 80); i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var b = api.el.querySelector('.rt-btn-gold'); if (b) b.click(); } }); } }
        }).then(function (v) { ov._paused = false; ov.style.visibility = ''; if (v === 'ok' && P._code) finish(P._code); else if (!done) start(); });
      });
      torch.addEventListener('click', function () {
        if (!track) return; var on = torch.getAttribute('aria-pressed') !== 'true';
        track.applyConstraints({ advanced: [{ torch: on }] }).then(function () { torch.setAttribute('aria-pressed', on ? 'true' : 'false'); }, function () {});
      });
      function fail(title, msg) {
        stop(); frame.style.display = 'none';
        var m = el('div', 'rt-scan-msg'); m.appendChild(el('b', null, title)); m.appendChild(el('p', null, msg)); mask.appendChild(m); hint.hidden = true;
      }
      function found(v) {
        if (done) return;
        ov.classList.add('is-found'); var r = el('div', 'rt-scan-result', v); ov.appendChild(r);
        UI.haptic('success'); beep(); stop();
        setTimeout(function () { finish(v); }, 420);
      }
      function accept(v, fmt) {
        if (!v) return;
        var linear = !/qr|aztec|data.?matrix|pdf|maxi/i.test(fmt || '');
        var now = Date.now();
        /* 1D barcodes must read the same twice in a row — stops misreads */
        if (linear) { if (v === last && now - lastAt < 1500) hits++; else hits = 1; last = v; lastAt = now; if (hits < 2) return; }
        found(v);
      }
      /* crop the frame area of the video into a canvas (smaller = faster + steadier reads) */
      var cv = doc.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      function grab() {
        var vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) return null;
        var fr = frame.getBoundingClientRect(), vr = video.getBoundingClientRect();
        var sc = Math.max(vr.width / vw, vr.height / vh), ox = (vr.width - vw * sc) / 2, oy = (vr.height - vh * sc) / 2;
        /* full camera width (long barcodes often stick out of the frame) × the frame's band plus a margin */
        var padY = fr.height * 0.35, sx = 0, sw = vw;
        var sy = Math.max(0, ((fr.top - vr.top - padY) - oy) / sc), sh = Math.min(vh - sy, (fr.height + padY * 2) / sc);
        var tw = Math.min(1280, Math.round(sw)), th = Math.round(sh * tw / sw);
        if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
        cx.drawImage(video, sx, sy, sw, sh, 0, 0, tw, th);
        return cv;
      }
      var engine = null, nextAt = 0;
      function loop(t) {
        if (done || !stream) return;
        raf = requestAnimationFrame(loop);
        if (busy || t < nextAt || video.readyState < 2) return;
        nextAt = t + 90; busy = true;
        var c = grab(); if (!c) { busy = false; return; }
        engine(c).then(function (r) { busy = false; if (r) accept(r.v, r.f); }, function () { busy = false; });
      }
      function pickEngine() {
        if ('BarcodeDetector' in win) {
          return BarcodeDetector.getSupportedFormats().then(function (fm) {
            var want = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar', 'data_matrix', 'code_93', 'pdf417'].filter(function (f) { return fm.indexOf(f) > -1; });
            if (want.indexOf('qr_code') < 0 || want.indexOf('ean_13') < 0) throw new Error('weak');
            var det = new BarcodeDetector({ formats: want });
            return function (c) { return det.detect(c).then(function (a) { return a && a[0] ? { v: a[0].rawValue, f: a[0].format } : null; }); };
          }).catch(zxing);
        }
        return zxing();
      }
      function zxing() {
        return loadZXing().then(function (Z) {
          /* cycle binarizers frame by frame: sharp codes, uneven light and faded/low-contrast labels each read best with a different one */
          var bins = ['LocalAverage', 'FixedThreshold', 'GlobalHistogram'], bi = 0;
          return function (c) {
            var img = cx.getImageData(0, 0, c.width, c.height), opt = { tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1, formats: o.formats || [], binarizer: bins[bi++ % bins.length] };
            return Z.readBarcodes(img, opt).then(function (a) { var r = a && a.filter(function (b) { return b.isValid; })[0]; return r ? { v: r.text, f: r.format } : null; });
          };
        });
      }
      function start() {
        if (done) return;
        var oldMsg = mask.querySelector('.rt-scan-msg'); if (oldMsg) oldMsg.remove(); frame.style.display = ''; hint.hidden = false;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return fail(en ? 'Camera not available' : 'ใช้กล้องไม่ได้', win.isSecureContext ? (en ? 'This browser cannot open the camera. Type the code instead.' : 'เบราว์เซอร์นี้เปิดกล้องไม่ได้ กด "พิมพ์รหัสเอง" แทน') : (en ? 'The page must be opened over https.' : 'ต้องเปิดหน้าเว็บผ่าน https ถึงจะใช้กล้องได้'));
        navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }).then(function (s) {
          if (done) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          stream = s; track = s.getVideoTracks()[0]; video.srcObject = s;
          var cap = track.getCapabilities ? track.getCapabilities() : {};
          if (cap.torch) torch.hidden = false;
          var adv = []; if (cap.focusMode && cap.focusMode.indexOf('continuous') > -1) adv.push({ focusMode: 'continuous' });
          if (adv.length) track.applyConstraints({ advanced: adv }).catch(function () {});
          var pv = video.play(); if (pv && pv.catch) pv.catch(function () {});
          return (engine ? Promise.resolve(engine) : pickEngine()).then(function (e) { engine = e; if (!done && stream) raf = requestAnimationFrame(loop); });
        }).catch(function (err) {
          var nm = err && err.name;
          if (nm === 'NotAllowedError' || nm === 'SecurityError') fail(en ? 'Camera permission needed' : 'ยังไม่ได้อนุญาตให้ใช้กล้อง', en ? 'Allow camera access in the browser settings, or type the code.' : 'อนุญาตกล้องในการตั้งค่าเบราว์เซอร์ (รูปแม่กุญแจข้างที่อยู่เว็บ) หรือกด "พิมพ์รหัสเอง"');
          else if (nm === 'NotFoundError' || nm === 'OverconstrainedError') fail(en ? 'No camera found' : 'ไม่พบกล้องในเครื่องนี้', en ? 'Type the code instead.' : 'กด "พิมพ์รหัสเอง" แทน');
          else if (nm === 'NotReadableError') fail(en ? 'Camera is busy' : 'กล้องถูกใช้งานอยู่', en ? 'Close other apps using the camera and try again.' : 'ปิดแอปอื่นที่ใช้กล้องอยู่ แล้วลองใหม่');
          else fail(en ? 'Could not start scanning' : 'เริ่มสแกนไม่ได้', en ? 'Type the code instead.' : 'กด "พิมพ์รหัสเอง" แทน');
        });
      }
      start();
      return P;
    },

    /* put a scanned code into an input as if the user typed it (fires input + change + rt:scan) */
    fillScan: function (inp, v) {
      if (!inp) return; inp.value = v;
      inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.dispatchEvent(new CustomEvent('rt:scan', { bubbles: true, detail: { value: v } }));
      if (inp.form && inp.hasAttribute('data-rt-scan-submit')) { if (inp.form.requestSubmit) inp.form.requestSubmit(); else inp.form.submit(); }
    },

    /* scroll the page (or the app's main scroller) back to the top */
    scrollTop: function () {
      var s = UI._scroller && UI._scroller.isConnected ? UI._scroller : null, b = reducedMotion() ? 'auto' : 'smooth';
      if (s) s.scrollTo({ top: 0, behavior: b }); else win.scrollTo({ top: 0, behavior: b });
    },

    /* ---------- Toast: spring in, progress bar, pause on hover, swipe away, optional action ---------- */
    toast: function (message, opts) {
      opts = opts || {};
      var type = opts.type || 'success';
      var stack = doc.querySelector('.rt-toast-stack');
      if (!stack) { stack = el('div', 'rt-toast-stack'); stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite'); doc.body.appendChild(stack); }
      var dur = opts.duration || (opts.action ? 5000 : 2800);
      var t = el('div', 'rt-toast rt-glass' + (type !== 'success' ? ' is-' + type : ''));
      t.style.setProperty('--rt-toast-dur', dur + 'ms');
      var mark = el('span', 'rt-toast-mark');
      mark.appendChild(svg(type === 'error' ? ICON.x : type === 'info' ? ICON.info : type === 'warning' ? ICON.warn : ICON.check, null, true));
      t.appendChild(mark); t.appendChild(el('span', null, message));
      if (opts.action) {
        var ab = el('button', 'rt-toast-action', opts.action.label); ab.type = 'button';
        ab.addEventListener('click', function (e) { e.stopPropagation(); if (opts.action.onClick) opts.action.onClick(); dismiss(); });
        t.appendChild(ab);
      }
      t.appendChild(el('span', 'rt-toast-bar'));
      stack.appendChild(t);
      UI.haptic(type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'light');
      var timer, left = dur, started, gone = false;
      function run() { started = Date.now(); clearTimeout(timer); timer = setTimeout(dismiss, left); t.classList.remove('is-paused'); }
      function pause() { clearTimeout(timer); left -= Date.now() - started; t.classList.add('is-paused'); }
      function dismiss() { if (gone) return; gone = true; clearTimeout(timer); t.classList.add('is-leaving'); setTimeout(function () { t.remove(); }, 240); }
      t.addEventListener('mouseenter', pause); t.addEventListener('mouseleave', run);
      var x0 = 0, y0 = 0, dx = 0, dy = 0, drag = false;
      t.addEventListener('pointerdown', function (e) { if (e.target.closest('.rt-toast-action')) return; drag = true; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; pause(); t.classList.add('is-dragging'); try { t.setPointerCapture(e.pointerId); } catch (err) {} });
      t.addEventListener('pointermove', function (e) { if (!drag) return; dx = e.clientX - x0; dy = Math.min(0, e.clientY - y0); t.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; t.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 260)); });
      function up() {
        if (!drag) return; drag = false; t.classList.remove('is-dragging');
        if (Math.abs(dx) > 80 || dy < -30) { gone = true; clearTimeout(timer); t.style.transform = dy < -30 ? 'translateY(-120%)' : 'translateX(' + (dx > 0 ? 120 : -120) + '%)'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }
        else { t.style.transform = ''; t.style.opacity = ''; run(); }
      }
      t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
      run();
      return { close: dismiss, el: t };
    },

    /* ---------- Buttons ---------- */
    setLoading: function (btn, on) {
      if (!btn) return;
      if (on) { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
      else { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); btn.disabled = false; }
    },

    /* ---------- Segmented control ---------- */
    segmented: function (seg) {
      var btns = Array.prototype.slice.call(seg.querySelectorAll(':scope > button'));
      seg.style.setProperty('--n', btns.length);
      function pick(i, fire) {
        btns.forEach(function (b, j) { b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); });
        seg.style.setProperty('--i', i);
        if (fire) { UI.haptic('light'); seg.dispatchEvent(new CustomEvent('rt:change', { detail: { index: i, value: btns[i].value || btns[i].textContent.trim() }, bubbles: true })); }
      }
      seg._rtPick = function () { var c = btns.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; }); pick(c < 0 ? 0 : c, false); };
      seg._rtPick();
      btns.forEach(function (b, i) { b.addEventListener('click', function () { pick(i, true); }); });
    },

    /* ---------- Count-up numbers (start when visible) ---------- */
    countUp: function (node, to, o) {
      o = o || {}; var dec = o.decimals || 0, pre = o.prefix || '', suf = o.suffix || '';
      var fmt = function (v) { return pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
      if (reducedMotion()) { node.textContent = fmt(to); return; }
      var t0 = performance.now(), dur = o.duration || 1200;
      (function step(t) { var x = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - x, 4); node.textContent = fmt(to * e); if (x < 1) requestAnimationFrame(step); })(t0);
    },

    /* ---------- View transitions for in-page changes ---------- */
    transition: function (fn) {
      if (!doc.startViewTransition || reducedMotion()) { fn(); return Promise.resolve(); }
      try { return doc.startViewTransition(fn).finished.catch(function () {}); } catch (e) { fn(); return Promise.resolve(); }
    },

    /* ---------- Shell menu (phones/tablets) ---------- */
    menuOpen: function (open, shell) {
      shell = shell || doc.querySelector('.rt-shell'); if (!shell) return;
      var was = shell.classList.contains('is-menu-open');
      var on = open === undefined ? !was : !!open;
      if (on === was) return;
      shell.classList.toggle('is-menu-open', on);
      doc.querySelectorAll('[data-rt-menu-toggle]').forEach(function (b) { b.setAttribute('aria-expanded', on ? 'true' : 'false'); });
      if (on) { lockScroll(); UI.haptic('light'); var first = shell.querySelector('.rt-sidebar a, .rt-sidebar button'); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60); }
      else unlockScroll();
    },

    /* ---------- Image lightbox: tap a picture → it springs up from where it sits ---------- */
    /* RattanaUI.lightbox(items, index?) — items: 'url' | <img> | { src, thumb: <img>, caption, sub } (or an array of them) */
    lightbox: function (items, index) {
      items = [].concat(items || []).map(function (it) {
        if (typeof it === 'string') return { src: it };
        if (it && it.nodeType === 1) return zoomItem(it);
        return it || {};
      }).filter(function (it) { return it.src; });
      if (!items.length) return null;
      var i = Math.max(0, Math.min(items.length - 1, index || 0)), many = items.length > 1;
      var opener = doc.activeElement, closed = false, rm = reducedMotion();
      var lb = el('div', 'rt-lightbox'); lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', UI.getLang() === 'en' ? 'Image viewer' : 'ดูรูปภาพ');
      var scrim = el('div', 'rt-lb-scrim'), fig = el('figure', 'rt-lb-figure'), frame = el('div', 'rt-lb-frame'), img = el('img', 'rt-lb-img');
      img.alt = ''; img.draggable = false; frame.appendChild(img); fig.appendChild(frame);
      var cap = el('figcaption', 'rt-lb-cap'), dots = null; fig.appendChild(cap);
      var close = el('button', 'rt-lb-btn rt-lb-close'); close.type = 'button'; close.setAttribute('aria-label', UI.getLang() === 'en' ? 'Close' : 'ปิด'); close.appendChild(svg('M18 6 6 18M6 6l12 12', 22));
      lb.appendChild(scrim); lb.appendChild(fig); lb.appendChild(close);
      var count = null, prev = null, next = null;
      if (many) {
        count = el('div', 'rt-lb-count'); lb.appendChild(count);
        prev = el('button', 'rt-lb-btn rt-lb-prev'); prev.type = 'button'; prev.setAttribute('aria-label', UI.getLang() === 'en' ? 'Previous' : 'รูปก่อนหน้า'); prev.appendChild(svg('m15 18-6-6 6-6', 22));
        next = el('button', 'rt-lb-btn rt-lb-next'); next.type = 'button'; next.setAttribute('aria-label', UI.getLang() === 'en' ? 'Next' : 'รูปถัดไป'); next.appendChild(svg('m9 18 6-6-6-6', 22));
        lb.appendChild(prev); lb.appendChild(next);
        dots = el('div', 'rt-lb-dots'); items.forEach(function () { dots.appendChild(el('i')); }); fig.appendChild(dots);
      }
      function fit() {
        var it = items[i], t = it.thumb, nw = img.naturalWidth || (t && t.naturalWidth) || 0, nh = img.naturalHeight || (t && t.naturalHeight) || 0;
        var ratio = nw && nh ? nw / nh : 1, maxW = Math.min(win.innerWidth * 0.94, 1000), maxH = Math.max(160, win.innerHeight - (win.innerWidth < 640 ? 260 : 250));
        img.style.width = Math.round(Math.min(maxW, maxH * ratio)) + 'px';
      }
      function fill() {
        var it = items[i];
        img.classList.remove('is-zoomed');
        img.src = it.src; img.alt = it.alt || it.caption || ''; fit();
        if (it.big && it.big !== it.src) { var hi = new Image(); hi.onload = function () { if (items[i] === it) img.src = it.big; }; hi.src = it.big; }
        cap.innerHTML = ''; cap.hidden = !(it.caption || it.sub);
        if (it.caption) cap.appendChild(el('b', '', it.caption));
        if (it.sub) cap.appendChild(el('span', '', it.sub));
        if (count) count.textContent = (i + 1) + ' / ' + items.length;
        if (dots) [].forEach.call(dots.children, function (d, k) { d.classList.toggle('is-on', k === i); });
      }
      function srcRect(it) {
        var t = it && it.thumb; if (!t || !t.isConnected) return null;
        var r = t.getBoundingClientRect();
        if (r.width < 4 || r.bottom < 0 || r.top > win.innerHeight || r.right < 0 || r.left > win.innerWidth) return null;
        return r;
      }
      function flip(from, to, dir) {
        var dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
        var s = Math.max(from.width / to.width, from.height / to.height);
        var a = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
        return dir === 'in' ? [{ transform: a, borderRadius: '18px', opacity: 0.6 }, { transform: 'none', borderRadius: '22px', opacity: 1 }]
                            : [{ transform: 'none', opacity: 1 }, { transform: a, opacity: 0.4 }];
      }
      function hideThumb(on) { var t = items[i].thumb; if (t && t.classList) t.classList.toggle('rt-lb-source', on); }
      function animateIn() {
        var r = srcRect(items[i]);
        if (rm || !frame.animate) return;
        if (r) {
          hideThumb(true);
          frame.animate(flip(r, frame.getBoundingClientRect(), 'in'), { duration: 560, easing: 'cubic-bezier(.2,1.32,.32,1)', fill: 'backwards' })
            .finished.then(function () { hideThumb(false); }, function () { hideThumb(false); });
        } else {
          frame.animate([{ transform: 'scale(.6) translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,1.32,.32,1)' });
        }
      }
      function go(step) {
        if (!many) return;
        var n = (i + step + items.length) % items.length;
        if (rm || !frame.animate) { i = n; fill(); return; }
        var x = step > 0 ? -60 : 60;
        frame.animate([{ transform: fig._dx ? 'translateX(' + fig._dx + 'px)' : 'none', opacity: 1 }, { transform: 'translateX(' + x + 'px) scale(.94)', opacity: 0 }], { duration: 150, easing: 'ease-in', fill: 'forwards' })
          .finished.then(function () {
            i = n; fill();
            frame.animate([{ transform: 'translateX(' + (-x) + 'px) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1.3,.32,1)', fill: 'forwards' })
              .finished.then(function () { frame.getAnimations().forEach(function (a) { a.cancel(); }); });
            cap.style.animation = 'none'; void cap.offsetWidth; cap.style.animation = '';
          });
        UI.haptic('light');
      }
      function finish() { lb.remove(); unlockScroll(); win.removeEventListener('resize', fit); doc.removeEventListener('keydown', onKey, true); hideThumb(false); if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) {} }
      function shut() {
        if (closed) return; closed = true;
        lb.classList.add('is-closing'); img.classList.remove('is-zoomed');
        var r = srcRect(items[i]);
        if (rm || !frame.animate) { setTimeout(finish, 120); return; }
        frame.getAnimations().forEach(function (a) { a.cancel(); });
        var cur = frame.getBoundingClientRect(), base = fig._dy ? 'translateY(' + fig._dy + 'px)' : 'none';
        var kf = r ? flip(r, cur, 'out') : [{ transform: base, opacity: 1 }, { transform: 'scale(.7) translateY(40px)', opacity: 0 }];
        if (r) { hideThumb(true); kf[0].transform = base; }
        frame.animate(kf, { duration: r ? 380 : 260, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.then(finish, finish);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'Tab') trapTab(e, lb);
      }
      /* tap image to zoom ×2.2 at that point; while zoomed, moving the pointer pans */
      function zoomAt(e) {
        var r = img.getBoundingClientRect();
        img.style.setProperty('--rt-zx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        img.style.setProperty('--rt-zy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      }
      /* swipe: down = close, left/right = next/previous */
      var p0 = null, moved = false, axis = '';
      fig.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        p0 = { x: e.clientX, y: e.clientY, t: Date.now(), target: e.target }; moved = false; axis = '';
        try { fig.setPointerCapture(e.pointerId); } catch (err) {}
      });
      fig.addEventListener('pointermove', function (e) {
        if (img.classList.contains('is-zoomed') && (e.pointerType === 'mouse' || p0)) { img.classList.add('is-panning'); zoomAt(e); if (p0) moved = true; return; }
        if (!p0) return;
        var dx = e.clientX - p0.x, dy = e.clientY - p0.y;
        if (!axis && Math.abs(dx) + Math.abs(dy) > 8) axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
        if (!axis) return; moved = true;
        if (axis === 'y') { fig._dy = Math.max(-40, dy); frame.style.transform = 'translateY(' + fig._dy + 'px) scale(' + Math.max(0.82, 1 - Math.abs(dy) / 900) + ')'; scrim.style.opacity = Math.max(0.25, 1 - Math.abs(dy) / 420); }
        else if (many) { fig._dx = dx; frame.style.transform = 'translateX(' + dx + 'px)'; }
      });
      function endDrag(e) {
        if (!p0) return;
        var dx = e.clientX - p0.x, dy = e.clientY - p0.y, dt = Math.max(1, Date.now() - p0.t), was = p0; p0 = null;
        img.classList.remove('is-panning');
        if (axis === 'y' && (dy > 110 || dy / dt > 0.6)) { scrim.style.opacity = ''; shut(); return; }
        if (axis === 'x' && many && (Math.abs(dx) > 70 || Math.abs(dx) / dt > 0.5)) { frame.style.transform = ''; go(dx < 0 ? 1 : -1); fig._dx = 0; return; }
        if (axis) {
          frame.style.transition = 'transform .5s cubic-bezier(.2,1.32,.32,1)'; frame.style.transform = ''; scrim.style.transition = 'opacity .3s'; scrim.style.opacity = '';
          setTimeout(function () { frame.style.transition = ''; scrim.style.transition = ''; }, 520);
          fig._dx = fig._dy = 0; return;
        }
        if (!moved && was.target === img) { zoomAt(e); img.classList.toggle('is-zoomed'); UI.haptic('light'); }
        else if (!moved && !was.target.closest('.rt-lb-frame, .rt-lb-cap')) shut();
      }
      fig.addEventListener('pointerup', endDrag);
      fig.addEventListener('pointercancel', function () { p0 = null; frame.style.transform = ''; scrim.style.opacity = ''; });
      scrim.addEventListener('click', shut);
      lb.addEventListener('click', function (e) { if (e.target === lb) shut(); });
      close.addEventListener('click', shut);
      if (prev) { prev.addEventListener('click', function () { go(-1); }); next.addEventListener('click', function () { go(1); }); }
      img.addEventListener('load', fit); win.addEventListener('resize', fit);
      fill(); lockScroll(); doc.body.appendChild(lb); doc.addEventListener('keydown', onKey, true);
      animateIn(); UI.haptic('light');
      lb.tabIndex = -1; setTimeout(function () { try { lb.focus({ preventScroll: true }); } catch (e) {} }, 60);
      return { close: shut, el: lb, go: go };
    },

    /* ---------- Auto-wire markup (runs on load and on every element added later) ---------- */
    init: function (scope) {
      scope = scope || doc;
      var q = function (s) { var a = [].slice.call(scope.querySelectorAll(s)); if (scope.matches && scope.matches(s)) a.unshift(scope); return a; };
      q('[data-rt-theme-toggle]').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', function () { UI.toggleTheme(); }); });
      q('[data-rt-lang]').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', function () { UI.setLang(b.getAttribute('data-rt-lang')); }); });
      q('.rt-seg').forEach(function (s) { if (s._rt) return; s._rt = 1; UI.segmented(s); });
      if (!off('search')) q('.rt-search').forEach(enhanceSearch);
      q('.rt-app-brand').forEach(paintBrand);
      q('[data-rt-user]').forEach(function (b) { if (b._rtUserPaint) return; b._rtUserPaint = 1; paintUserChip(b); });
      q('[data-rt-scan]:not(.rt-search)').forEach(function (b) {
        if (b._rtScan || b.tagName === 'INPUT') return; b._rtScan = 1;
        if (b.tagName !== 'BUTTON') return;
        b.addEventListener('click', function (e) {
          e.preventDefault(); var sel = b.getAttribute('data-rt-scan'), t = sel ? doc.querySelector(sel) : null;
          UI.scan().then(function (v) { if (v == null) return; if (t) UI.fillScan(t, v); b.dispatchEvent(new CustomEvent('rt:scan', { bubbles: true, detail: { value: v } })); });
        });
      });
      q('.rt-wish').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (on) UI.haptic('light'); }); });
      q('.rt-chip[aria-pressed]').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', function () { var g = b.parentElement; g.querySelectorAll('.rt-chip[aria-pressed]').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); UI.haptic('light'); }); });
      q('[data-rt-menu-toggle]').forEach(function (b) { if (b._rt) return; b._rt = 1; b.setAttribute('aria-expanded', 'false'); b.addEventListener('click', function () { UI.menuOpen(undefined, b.closest('.rt-shell') || undefined); }); });
      q('.rt-shell').forEach(function (s) {
        if (s._rt) return; s._rt = 1;
        var sc = s.querySelector(':scope > .rt-shell-scrim'); if (!sc) { sc = el('div', 'rt-shell-scrim'); s.appendChild(sc); }
        sc.addEventListener('click', function () { UI.menuOpen(false, s); });
        s.addEventListener('click', function (e) { if (s.classList.contains('is-menu-open') && e.target.closest('.rt-sidebar a[href]')) UI.menuOpen(false, s); });
      });
      /* stagger: children of [data-rt-stagger] reveal one after another */
      q('[data-rt-stagger]').forEach(function (p) {
        if (p._rt) return; p._rt = 1;
        var step = +(p.getAttribute('data-rt-stagger') || 70), type = p.getAttribute('data-rt-stagger-type') || '';
        [].forEach.call(p.children, function (c, i) { c.style.setProperty('--rt-delay', Math.min(i * step, 900) + 'ms'); if (!c.hasAttribute('data-rt-reveal')) c.setAttribute('data-rt-reveal', type); });
      });
      q('[data-rt-reveal]').forEach(function (n) {
        if (n._rt) return; n._rt = 1;
        if (!revealIO) { n.classList.add('is-in'); return; }
        revealIO.observe(n);
      });
      q('[data-rt-count]').forEach(function (n) {
        if (n._rtc) return; n._rtc = 1;
        var go = function () { UI.countUp(n, parseFloat(n.getAttribute('data-rt-count')), { decimals: +(n.getAttribute('data-decimals') || 0), prefix: n.getAttribute('data-prefix') || '', suffix: n.getAttribute('data-suffix') || '' }); };
        if (countIO) { n._rtgo = go; countIO.observe(n); } else go();
      });
      if (finePointer() && !reducedMotion()) q('[data-rt-tilt]').forEach(function (n) {
        if (n._rt) return; n._rt = 1;
        var max = +(n.getAttribute('data-rt-tilt') || 8), raf = 0, ev = null;
        if (getComputedStyle(n).position === 'static') n.style.position = 'relative';
        n.addEventListener('pointermove', function (e) {
          ev = e; if (raf) return;
          raf = requestAnimationFrame(function () {
            raf = 0; var r = n.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
            n.style.setProperty('--rt-rx', ((0.5 - py) * max).toFixed(2) + 'deg'); n.style.setProperty('--rt-ry', ((px - 0.5) * max).toFixed(2) + 'deg');
            n.style.setProperty('--rt-gx', (px * 100).toFixed(1) + '%'); n.style.setProperty('--rt-gy', (py * 100).toFixed(1) + '%');
            n.classList.add('is-tilting');
          });
        });
        n.addEventListener('pointerleave', function () { n.classList.remove('is-tilting'); n.style.setProperty('--rt-rx', '0deg'); n.style.setProperty('--rt-ry', '0deg'); });
      });
      q('[data-rt-date]').forEach(function (n) { if (!n.textContent.trim()) n.textContent = UI.formatDate(new Date(), n.getAttribute('data-rt-date') || 'long'); });
    }
  };

  /* reveal + count observers */
  var revealIO = null, countIO = null;
  if ('IntersectionObserver' in win && !reducedMotion()) {
    revealIO = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); } }); }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  }
  if ('IntersectionObserver' in win) {
    countIO = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { countIO.unobserve(en.target); if (en.target._rtgo) en.target._rtgo(); } }); }, { threshold: 0.4 });
  }

  /* <select class="rt-select">: on laptops open the Rattana dropdown instead of the plain OS list (data-rt-native keeps the OS list) */
  /* any <select> inside .rt-app (or with class rt-select) gets the Rattana dropdown */
  function rtSelect(n) { return !off('select') && n && n.tagName === 'SELECT' && (n.classList.contains('rt-select') || !!n.closest('.rt-app')) && !n.multiple && !(n.size > 1) && !n.hasAttribute('data-rt-native') && !n.closest('[data-rt-native]') && mq('(pointer: fine)'); }
  doc.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || !rtSelect(e.target)) return;
    e.preventDefault(); var s = e.target;
    if (s._rtOpen) { if (s._rtClose) s._rtClose(); return; } s.focus({ preventScroll: true }); UI.selectMenu(s);
  }, true);
  doc.addEventListener('keydown', function (e) {
    var s = e.target; if (!rtSelect(s) || s._rtOpen) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'F4' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) { e.preventDefault(); UI.selectMenu(s); }
  }, true);

  /* lightbox: what to show for a zoomable <img> — full name from data-rt-caption or the product card, price as the sub line */
  var ZOOM_SEL = 'img[data-rt-zoom], [data-rt-zoom] img, .rt-product-media img';
  function zoomable(n) { return n && n.matches && n.matches(ZOOM_SEL) && !n.closest('[data-rt-zoom="false"]') && n.getAttribute('data-rt-zoom') !== 'false'; }
  function zoomItem(img) {
    var card = img.closest('.rt-product, [data-rt-zoom-item]');
    var nameEl = card && card.querySelector('.rt-product-name, [data-rt-zoom-caption]');
    var priceEl = card && card.querySelector('.rt-price');
    return { src: img.currentSrc || img.src, big: img.getAttribute('data-rt-src') || '', thumb: img,
      alt: img.alt, caption: img.getAttribute('data-rt-caption') || (nameEl ? nameEl.textContent.trim() : img.alt || ''),
      sub: img.getAttribute('data-rt-sub') || (priceEl ? priceEl.textContent.trim() : '') };
  }
  doc.addEventListener('click', function (e) {
    if (off('lightbox')) return;
    var img = e.target.closest && e.target.closest('img');
    if (!zoomable(img) || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); e.stopPropagation();
    var group = img.closest('[data-rt-zoom-group]') || img.closest('.rt-grid-products');
    var list = group ? [].filter.call(group.querySelectorAll(ZOOM_SEL), zoomable) : [img];
    UI.lightbox(list, Math.max(0, list.indexOf(img)));
  }, true);

  /* press ripple on buttons, chips, nav and menu items */
  doc.addEventListener('pointerdown', function (e) {
    if (off('ripple') || reducedMotion() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var b = e.target.closest && e.target.closest('.rt-btn, .rt-chip, .rt-nav-item, .rt-menu-item, .rt-bottom-nav a, [data-rt-ripple]');
    if (!b || b.disabled || b.classList.contains('is-loading')) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.4, s = el('span', 'rt-ripple');
    s.style.width = s.style.height = d + 'px'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    var fx = null; for (var k = 0; k < b.children.length; k++) if (b.children[k].classList.contains('rt-fx')) { fx = b.children[k]; break; }
    if (!fx) { fx = el('span', 'rt-fx'); fx.setAttribute('aria-hidden', 'true'); b.appendChild(fx); }
    fx.appendChild(s); setTimeout(function () { s.remove(); if (fx.isConnected && !fx.children.length) fx.remove(); }, 750);
  }, { passive: true });

  /* Esc closes the shell menu */
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var s = doc.querySelector('.rt-shell.is-menu-open'); if (s) UI.menuOpen(false, s); } });

  /* ==========================================================================
     Users for apps (v1.6) — sign in with a company Google account, then look the
     person up in "Rattana Users for apps" › Sheet1. Only the signed-in person's
     row (and only the columns an app needs) is downloaded.
     ========================================================================== */
  var USER_DEFAULTS = {
    clientId: '615875645128-gasjjvkt6lu8g449cbnhl40k1pu25r0b.apps.googleusercontent.com',
    sheetId: '1M6HdISsLN684qRWyQ73CA4AmUzmYtZaOlffDJXZZIXQ',
    tab: 'Sheet1',
    holidayTab: 'วันหยุดนขัต',
    appName: '',
    minRole: 0,            /* 0 = anyone in the sheet */
    defaultRole: null,     /* role to use when the User Role cell is blank (Sales uses 3) */
    sessionDays: 30,       /* stay signed in this long; the row is re-checked on every visit */
    fields: [],            /* extra sheet columns an app wants (header names) */
    logo: ''               /* sign-in screen logo; empty = the app's own icon if it has one, else the Rattana CI logo */
  };
  /* sheet header → field name (headers are matched without spaces/new lines) */
  var USER_COLS = {
    email: ['E-mail', 'Email', 'อีเมล'],
    name: ['ชื่อ - สกุล', 'ชื่อ-สกุล', 'ชื่อสกุล'],
    title: ['คำนำหน้าชื่อ'],
    nickname: ['ชื่อเล่น'],
    displayName: ['ชื่อ - สกุล (ชื่อเล่น)'],
    empId: ['รหัสพนักงาน'],
    w: ['W', 'คลัง'],
    shipW: ['คลังส่ง'],
    role: ['User Role', 'Role'],
    lineUserId: ['LINE userId'],
    photo: ['รูป', 'รูปภาพ'],
    department: ['แผนก'],
    company: ['บริษัท'],
    status: ['Status'],
    resigned: ['วัน/เดือน/ปี ลาออก', 'วันลาออก', 'ลาออก'],
    salesCode: ['รหัสเซลล์', 'รหัสเซล']
  };
  function normHead(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase(); }
  var userCfg = {}; Object.keys(USER_DEFAULTS).forEach(function (k) { userCfg[k] = USER_DEFAULTS[k]; });
  var gvizN = 0;
  /* Google Sheets query (JSONP: works on GitHub Pages, any origin and file://) */
  function gviz(sheetId, tab, tq, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = '__rtGviz' + (++gvizN) + '_' + Date.now().toString(36), s = doc.createElement('script'), done = false;
      var t = setTimeout(function () { fin(); reject(new Error('timeout')); }, timeoutMs || 20000);
      function fin() { done = true; clearTimeout(t); try { delete win[cb]; } catch (e) { win[cb] = undefined; } s.remove(); }
      win[cb] = function (res) {
        if (done) return; fin();
        if (!res || res.status === 'error') return reject(new Error((res && res.errors && res.errors[0] && (res.errors[0].detailed_message || res.errors[0].message)) || 'sheet error'));
        resolve(res.table || { cols: [], rows: [] });
      };
      s.onerror = function () { if (!done) { fin(); reject(new Error('network')); } };
      s.src = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(sheetId) + '/gviz/tq?tqx=responseHandler:' + cb +
        '&sheet=' + encodeURIComponent(tab) + '&headers=1' + (tq ? '&tq=' + encodeURIComponent(tq) : '');
      doc.head.appendChild(s);
    });
  }
  function cellVal(c) { if (!c) return ''; if (c.f != null && typeof c.v !== 'string') return String(c.f); return c.v == null ? '' : String(c.v); }
  function driveImg(u, size) {
    var m = String(u || '').match(/(?:\/d\/|[?&]id=)([A-Za-z0-9_-]{20,})/);
    return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w' + (size || 400) : (/^https?:\/\//.test(u || '') ? u : '');
  }
  function jwtPayload(t) {
    try { var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while (p.length % 4) p += '=';
      var bin = atob(p), bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { return null; }
  }
  var headCache = {};
  function sheetHeads(cfg) {
    var k = cfg.sheetId + '|' + cfg.tab;
    if (!headCache[k]) headCache[k] = gviz(cfg.sheetId, cfg.tab, 'select * limit 0').then(function (tb) {
      var map = {}; (tb.cols || []).forEach(function (c) { if (c.label != null && c.label !== '') { var n = normHead(c.label); if (!(n in map)) map[n] = { id: c.id, label: String(c.label) }; } });
      return map;
    }, function (e) { delete headCache[k]; throw e; });
    return headCache[k];
  }
  function findCol(map, names) { for (var i = 0; i < names.length; i++) { var n = normHead(names[i]); if (map[n]) return map[n]; } for (var j = 0; j < names.length; j++) { var nn = normHead(names[j]); for (var key in map) if (key.indexOf(nn) > -1 && nn.length > 2) return map[key]; } return null; }
  /* look up one email → user object (or a reason why not) */
  function lookupUser(email, cfg) {
    email = String(email || '').trim().toLowerCase();
    if (!email) return Promise.reject(new Error('no-email'));
    return sheetHeads(cfg).then(function (map) {
      var cols = {}, picks = [], seen = {};
      Object.keys(USER_COLS).forEach(function (f) { var c = findCol(map, USER_COLS[f]); if (c) { cols[f] = c; if (!seen[c.id]) { seen[c.id] = 1; picks.push(c); } } });
      (cfg.fields || []).forEach(function (h) { var c = findCol(map, [h]); if (c && !seen[c.id]) { seen[c.id] = 1; picks.push(c); } });
      if (!cols.email) throw new Error('no-email-column');
      var safe = email.replace(/'/g, '');
      var tq = 'select ' + picks.map(function (c) { return c.id; }).join(',') + " where lower(" + cols.email.id + ") contains '" + safe + "'";
      return gviz(cfg.sheetId, cfg.tab, tq).then(function (tb) {
        var ids = (tb.cols || []).map(function (c) { return c.id; });
        var rows = (tb.rows || []).map(function (r) { var o = {}; ids.forEach(function (id, i) { o[id] = cellVal(r.c && r.c[i]); }); return o; })
          .filter(function (o) { return String(o[cols.email.id] || '').trim().toLowerCase() === email; });
        if (!rows.length) return { ok: false, reason: 'not-found' };
        function get(o, f) { return cols[f] ? String(o[cols[f].id] || '').trim() : ''; }
        var active = rows.filter(function (o) { var st = get(o, 'status'); return (!st || /^active$/i.test(st)) && !get(o, 'resigned'); });
        if (!active.length) return { ok: false, reason: 'inactive' };
        active.sort(function (a, b) { return (parseInt(get(b, 'role'), 10) || 0) - (parseInt(get(a, 'role'), 10) || 0); });
        var o = active[0], raw = {};
        picks.forEach(function (c) { raw[c.label] = String(o[c.id] == null ? '' : o[c.id]).trim(); });
        var roleN = parseInt(get(o, 'role'), 10);
        var u = {
          email: email, name: get(o, 'name'), title: get(o, 'title'), nickname: get(o, 'nickname'),
          empId: get(o, 'empId'), w: get(o, 'w').toUpperCase(), shipW: (get(o, 'shipW') || get(o, 'w')).toUpperCase(),
          role: isNaN(roleN) ? (cfg.defaultRole == null ? null : cfg.defaultRole) : roleN,
          lineUserId: get(o, 'lineUserId'), photoUrl: get(o, 'photo'), photo: driveImg(get(o, 'photo')),
          department: get(o, 'department'), company: get(o, 'company'), salesCode: get(o, 'salesCode'),
          raw: raw, rows: active.length
        };
        u.displayName = get(o, 'displayName') || (u.name + (u.nickname ? ' (' + u.nickname + ')' : '')) || email;
        return { ok: true, user: u };
      });
    });
  }
  function userKey() { return 'rattana-user:' + userCfg.sheetId; }
  function saveSession(u, google) { store(userKey(), JSON.stringify({ u: u, g: google || null, at: Date.now() })); }
  function readSession() { try { var s = JSON.parse(store(userKey()) || 'null'); if (!s || !s.u || Date.now() - s.at > userCfg.sessionDays * 864e5) return null; return s; } catch (e) { return null; } }
  var gsiP = null;
  function loadGSI() {
    if (win.google && win.google.accounts && win.google.accounts.id) return Promise.resolve(win.google);
    if (gsiP) return gsiP;
    gsiP = new Promise(function (resolve, reject) {
      var s = doc.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { if (win.google && win.google.accounts) resolve(win.google); else { gsiP = null; reject(new Error('gsi')); } };
      s.onerror = function () { gsiP = null; reject(new Error('gsi')); };
      doc.head.appendChild(s);
    });
    return gsiP;
  }
  function initials(u) { var n = (u && (u.nickname || u.name || u.email)) || '?'; return n.replace(/^(นาย|นางสาว|นาง|น\.ส\.)\s*/, '').trim().replace(/^[เแโใไ]+/, '').slice(0, 1).toUpperCase() || '?'; }
  function avatarNode(u, size) {
    var a = el('span', 'rt-avatar'); a.style.setProperty('--rt-av', (size || 36) + 'px');
    var ini = el('span', 'rt-avatar-ini', initials(u)); a.appendChild(ini);
    var srcs = [u && u.photo, u && u.googlePicture].filter(Boolean);
    (function next() {
      if (!srcs.length) return; var im = new Image(); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.decoding = 'async';
      im.onload = function () { a.classList.add('has-img'); a.appendChild(im); }; im.onerror = next; im.src = srcs.shift();
    })();
    return a;
  }
  var ROLE_HINT = { 7: 'ผู้บริหาร', 6: 'สำนักงานใหญ่', 5: 'หัวหน้า' };
  var userState = { user: null, ready: null, readyResolve: null };
  userState.ready = new Promise(function (r) { userState.readyResolve = r; });
  function setUser(u) {
    userState.user = u;
    root.classList.toggle('rt-signed-in', !!u);
    if (u) userState.readyResolve(u);
    [].forEach.call(doc.querySelectorAll('[data-rt-user]'), paintUserChip);
    root.dispatchEvent(new CustomEvent('rt:user', { detail: u }));
    doc.dispatchEvent(new CustomEvent('rt:user', { detail: u }));
  }
  function paintUserChip(b) {
    var u = userState.user; if (!b) return;
    b.innerHTML = ''; b.classList.add('rt-user-chip'); if (b.tagName === 'BUTTON' && !b.type) b.type = 'button';
    if (!u) { b.hidden = true; return; }
    b.hidden = false; b.appendChild(avatarNode(u, 34));
    if (!b.hasAttribute('data-rt-user-compact')) { var t = el('span', 'rt-user-chip-text'); t.appendChild(el('b', null, u.nickname || u.name || u.email)); t.appendChild(el('small', null, [u.w, u.empId].filter(Boolean).join(' · '))); b.appendChild(t); }
    b.setAttribute('aria-label', (UI.getLang() === 'en' ? 'Account: ' : 'บัญชีผู้ใช้: ') + u.displayName);
    if (!b._rtUser) { b._rtUser = 1; b.addEventListener('click', function () { UI.user.menu(b); }); }
  }
  function loginScreen(cfg) {
    var en = UI.getLang() === 'en';
    var wrap = el('div', 'rt-login'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'rt-login-title');
    var bg = el('div', 'rt-bg'); bg.appendChild(el('div', 'rt-bg-arc')); bg.appendChild(el('div', 'rt-bg-arc')); wrap.appendChild(bg);
    var card = el('div', 'rt-glass rt-login-card');
    var logo = el('div', 'rt-login-logo');
    function ciLogo() { logo.innerHTML = ''; logo.classList.remove('is-app'); var l1 = el('img', 'rt-logo-light'), l2 = el('img', 'rt-logo-dark'); l1.src = BASE + 'rattana-logo-navy.png'; l2.src = BASE + 'rattana-logo-transparent.png'; l1.alt = l2.alt = 'RATTANA'; logo.appendChild(l1); logo.appendChild(l2); }
    function mono() { logo.innerHTML = ''; logo.classList.add('is-app'); logo.appendChild(appMonogram(cfg.appName || doc.title, 88)); }
    var own = appLogo(cfg);
    if (own === 'rattana') ciLogo();
    else if (own) { var im = el('img', 'rt-login-applogo'); im.alt = cfg.appName || doc.title || ''; im.onerror = mono; im.src = own; logo.classList.add('is-app'); logo.appendChild(im); }
    else mono();
    var h = el('h1', 'rt-login-title', cfg.appName || (en ? 'Sign in' : 'เข้าสู่ระบบ')); h.id = 'rt-login-title';
    var sub = el('p', 'rt-login-sub', en ? 'Sign in with your company Google account' : 'เข้าสู่ระบบด้วยอีเมลบริษัท (บัญชี Google)');
    var slot = el('div', 'rt-login-gbtn'), msg = el('div', 'rt-login-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    var foot = el('p', 'rt-login-foot', en ? 'For RATTANA staff only' : 'สำหรับพนักงาน RATTANA เท่านั้น');
    [logo, h, sub, slot, msg, foot].forEach(function (n) { card.appendChild(n); });
    wrap.appendChild(card);
    return { el: wrap, card: card, slot: slot, msg: msg, sub: sub };
  }
  /* the app's own logo if it has one, else none (→ Rattana CI logo):
     config({ logo }) / <body data-rt-login-logo="url"> → [data-rt-app-logo] → apple-touch-icon → a large <link rel="icon"> */
  /* the app's own icon: config({ logo }) / data-rt-login-logo / [data-rt-app-logo] / apple-touch-icon / big link rel=icon.
     'rattana' = use the RATTANA logo (only when an app asks for it). '' = none found → monogram of the app name */
  function appLogo(cfg) {
    var b = doc.body, u = (cfg && cfg.logo) || (b && b.getAttribute('data-rt-login-logo')) || '';
    if (/^rattana$/i.test(u)) return 'rattana';
    if (!u) { var n = doc.querySelector('[data-rt-app-logo]'); if (n) u = n.getAttribute('data-rt-app-logo') || n.currentSrc || n.src || ''; }
    if (!u) {
      var best = null, bs = -1;
      [].forEach.call(doc.querySelectorAll('link[rel~="apple-touch-icon"], link[rel~="apple-touch-icon-precomposed"], link[rel~="icon"]'), function (l) {
        var apple = /apple/.test(l.rel), m = (l.getAttribute('sizes') || '').match(/(\d+)x/), sz = m ? +m[1] : (apple ? 180 : 0);
        if (!apple && sz < 96) return; if (/\.ico(\?|$)/i.test(l.href)) return;
        if (sz > bs) { bs = sz; best = l.href; }
      });
      u = best || '';
    }
    try { return u ? new URL(u, location.href).href : ''; } catch (e) { return ''; }
  }
  /* letter tile for apps without an icon: 'Rattana Pre-Book' → PB, 'Rattana Online Order' → OO, Thai → first consonant */
  function appInitials(name) {
    var n = String(name || '').replace(/\bv?\d+(\.\d+)*\b/g, '').replace(/^\s*(rattana|รัตนะ?|รัตน)\s*/i, '').trim();
    var words = n.split(/[\s\-–—·|/]+/).filter(Boolean);
    if (!words.length) return 'R';
    if (/^[A-Za-z]/.test(words[0])) return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
    return words[0].replace(/^[เแโใไ]+/, '').slice(0, 1);
  }
  function appMonogram(name, size) {
    var t = el('span', 'rt-app-icon'), ini = (doc.body && doc.body.getAttribute('data-rt-app-initials')) || appInitials(name);
    t.textContent = ini; t.setAttribute('aria-hidden', 'true'); t.style.setProperty('--rt-ai', (size || 40) + 'px'); if (ini.length > 1) t.classList.add('is-2');
    return t;
  }
  function loginMsg(L, kind, title, text, actions) {
    L.msg.innerHTML = ''; L.msg.className = 'rt-login-msg is-' + kind;
    if (kind === 'busy') { L.msg.appendChild(el('span', 'rt-login-spin')); L.msg.appendChild(el('span', null, title)); return; }
    var b = el('div', 'rt-login-note'); b.appendChild(el('b', null, title)); if (text) b.appendChild(el('span', null, text)); L.msg.appendChild(b);
    (actions || []).forEach(function (a) { var x = el('button', 'rt-btn rt-btn-glass rt-btn-sm', a.label); x.type = 'button'; x.addEventListener('click', a.onClick); L.msg.appendChild(x); });
  }

  UI.user = {
    /* RattanaUI.user.config({ appName, minRole, defaultRole, fields, sessionDays, clientId, sheetId, tab }) */
    config: function (o) { Object.keys(o || {}).forEach(function (k) { if (k in USER_DEFAULTS && o[k] !== undefined) userCfg[k] = o[k]; }); return userCfg; },
    current: function () { return userState.user; },
    get ready() { return userState.ready; },
    /* true when the signed-in person's User Role is at least `min` */
    can: function (min) { var u = userState.user; return !!u && (u.role || 0) >= (min || 0); },
    /* look someone up without signing in (admin tools) → Promise<{ok, user|reason}> */
    lookup: function (email, o) { var c = {}; Object.keys(userCfg).forEach(function (k) { c[k] = userCfg[k]; }); Object.keys(o || {}).forEach(function (k) { c[k] = o[k]; }); return lookupUser(email, c); },
    /* sign in (shows the Rattana sign-in screen when needed) → Promise<user> */
    signIn: function (o) {
      if (o) UI.user.config(o);
      var cfg = userCfg, en = UI.getLang() === 'en';
      if (userState.user) return Promise.resolve(userState.user);
      if (UI.user._p) return UI.user._p;
      var sess = readSession();
      if (sess && (!cfg.minRole || (sess.u.role || 0) >= cfg.minRole)) {
        var u0 = sess.u; if (sess.g && sess.g.picture) u0.googlePicture = sess.g.picture;
        setUser(u0);
        /* re-check the row quietly: removed, resigned or role changed → act on it */
        lookupUser(u0.email, cfg).then(function (r) {
          if (!r.ok) { UI.user.signOut({ reason: r.reason }); return; }
          r.user.googlePicture = u0.googlePicture; saveSession(r.user, sess.g);
          if (JSON.stringify(r.user) !== JSON.stringify(u0)) setUser(r.user);
        }, function () {});
        return Promise.resolve(u0);
      }
      root.classList.add('rt-auth-wait');
      var L = loginScreen(cfg); doc.body.appendChild(L.el); lockScroll();
      UI.user._p = new Promise(function (resolve) {
        function finishOk(u, g) {
          if (g && g.picture) u.googlePicture = g.picture;
          saveSession(u, g); setUser(u); UI.haptic('success');
          L.card.innerHTML = ''; L.card.classList.add('is-welcome');
          L.card.appendChild(avatarNode(u, 84)); L.card.appendChild(el('h1', 'rt-login-title', (en ? 'Welcome, ' : 'สวัสดี ') + (u.nickname || u.name)));
          L.card.appendChild(el('p', 'rt-login-sub', [u.w, u.empId ? (en ? 'ID ' : 'รหัส ') + u.empId : '', u.role != null ? 'Role ' + u.role : ''].filter(Boolean).join(' · ')));
          setTimeout(function () { L.el.classList.add('is-closing'); root.classList.remove('rt-auth-wait'); setTimeout(function () { L.el.remove(); unlockScroll(); }, 420); }, 900);
          UI.user._p = null; resolve(u);
        }
        function onCredential(resp) {
          var g = jwtPayload(resp && resp.credential);
          if (!g || !g.email) return loginMsg(L, 'error', en ? 'Could not read the Google account' : 'อ่านข้อมูลบัญชี Google ไม่ได้', en ? 'Please try again.' : 'ลองกดเข้าสู่ระบบอีกครั้ง');
          if (g.email_verified === false) return loginMsg(L, 'error', en ? 'Email not verified' : 'อีเมลนี้ยังไม่ได้ยืนยันกับ Google', '');
          loginMsg(L, 'busy', en ? 'Checking your account…' : 'กำลังตรวจสอบรายชื่อผู้ใช้…');
          var gg = { email: g.email, name: g.name, picture: g.picture };
          lookupUser(g.email, cfg).then(function (r) {
            if (!r.ok) {
              var t = r.reason === 'inactive' ? (en ? 'This account is no longer active' : 'บัญชีนี้ไม่ได้ใช้งานแล้ว') : (en ? 'This email is not in the user list' : 'ยังไม่มีอีเมลนี้ในรายชื่อผู้ใช้');
              return loginMsg(L, 'error', t, (en ? 'Signed in as ' : 'อีเมลที่ใช้: ') + g.email + (en ? ' — ask HR/admin to add it to “Rattana Users for apps”, or use another account.' : ' — แจ้ง HR/แอดมินให้เพิ่มในชีท "Rattana Users for apps" หรือใช้บัญชีอื่น'));
            }
            if (cfg.minRole && (r.user.role || 0) < cfg.minRole) return loginMsg(L, 'error', en ? 'No access to this app' : 'บัญชีนี้ไม่มีสิทธิ์ใช้แอปนี้', (en ? 'Needs User Role ' : 'ต้องมี User Role ') + cfg.minRole + (en ? ' or higher (yours: ' : ' ขึ้นไป (ของคุณ: ') + (r.user.role == null ? '-' : r.user.role) + ')');
            finishOk(r.user, gg);
          }, function (e) {
            loginMsg(L, 'error', en ? 'Could not reach the user list' : 'เชื่อมต่อรายชื่อผู้ใช้ไม่ได้', (en ? 'Check the internet connection. ' : 'ตรวจอินเทอร์เน็ตแล้วลองใหม่ ') + '(' + (e && e.message) + ')', [{ label: en ? 'Try again' : 'ลองใหม่', onClick: function () { onCredential(resp); } }]);
          });
        }
        UI.user._onCredential = onCredential; /* for tests and custom sign-in buttons */
        loginMsg(L, 'busy', en ? 'Loading Google sign-in…' : 'กำลังโหลดปุ่มเข้าสู่ระบบ…');
        loadGSI().then(function (google) {
          google.accounts.id.initialize({ client_id: cfg.clientId, callback: onCredential, auto_select: true, cancel_on_tap_outside: false, use_fedcm_for_prompt: true, itp_support: true, context: 'signin' });
          L.msg.innerHTML = ''; L.msg.className = 'rt-login-msg';
          var w = Math.min(320, Math.max(220, L.slot.clientWidth || 300));
          google.accounts.id.renderButton(L.slot, { type: 'standard', theme: UI.getTheme() === 'dark' ? 'filled_black' : 'outline', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: w, locale: UI.getLang() === 'en' ? 'en' : 'th' });
          try { google.accounts.id.prompt(); } catch (e) {}
          setTimeout(function () { if (!L.slot.querySelector('iframe, div[role=button]') && !userState.user) loginMsg(L, 'error', en ? 'Google sign-in did not load' : 'ปุ่ม Google ไม่ขึ้น', en ? 'This web address may need to be added to the company Google sign-in settings.' : 'เว็บนี้อาจยังไม่ได้รับอนุญาตในระบบเข้าสู่ระบบของบริษัท (ต้องเพิ่มที่อยู่เว็บใน Google Cloud) — แจ้งแอดมิน'); }, 8000);
        }, function () {
          loginMsg(L, 'error', en ? 'Google sign-in did not load' : 'โหลดระบบเข้าสู่ระบบ Google ไม่ได้', en ? 'Check the internet connection.' : 'ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า', [{ label: en ? 'Reload' : 'รีเฟรช', onClick: function () { location.reload(); } }]);
        });
      });
      return UI.user._p;
    },
    /* sign out → clears the session and (by default) shows the sign-in screen again */
    signOut: function (o) {
      o = o || {};
      var u = userState.user; store(userKey(), '');
      try { localStorage.removeItem(userKey()); } catch (e) {}
      try { if (win.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
      setUser(null);
      userState.ready = new Promise(function (r) { userState.readyResolve = r; });
      if (o.reason && u) UI.toast(o.reason === 'inactive' ? 'บัญชีนี้ไม่ได้ใช้งานแล้ว — ออกจากระบบ' : 'ไม่พบบัญชีในรายชื่อผู้ใช้แล้ว — ออกจากระบบ', { type: 'warning', duration: 6000 });
      if (o.reload) { location.reload(); return; }
      if (o.signIn !== false && (doc.body.hasAttribute('data-rt-login') || o.signIn)) UI.user.signIn();
    },
    /* account menu (opened by the avatar chip) */
    menu: function (anchor) {
      var u = userState.user, en = UI.getLang() === 'en'; if (!u) return;
      var box = el('div', 'rt-user-card'); box.appendChild(avatarNode(u, 64));
      var t = el('div', 'rt-user-card-text'); t.appendChild(el('b', null, u.displayName));
      t.appendChild(el('span', null, u.email));
      var chips = el('div', 'rt-user-card-chips');
      [[en ? 'ID' : 'รหัส', u.empId], ['W', u.w], [en ? 'Ships from' : 'คลังส่ง', u.shipW], ['Role', u.role == null ? '' : u.role + (ROLE_HINT[u.role] && !en ? ' · ' + ROLE_HINT[u.role] : '')], [en ? 'Dept' : 'แผนก', u.department]].forEach(function (c) { if (c[1] !== '' && c[1] != null) { var s = el('span', 'rt-badge rt-badge-neutral'); s.textContent = c[0] + ' ' + c[1]; chips.appendChild(s); } });
      t.appendChild(chips); box.appendChild(t);
      return UI.popup({ title: en ? 'Account' : 'บัญชีผู้ใช้', content: box, size: 'sm',
        actions: [{ label: en ? 'Close' : 'ปิด', variant: 'glass', value: null }, { label: en ? 'Sign out' : 'ออกจากระบบ', variant: 'reject', value: 'out' }] })
        .then(function (v) { if (v === 'out') UI.user.signOut({ signIn: true }); });
    },
    avatar: function (u, size) { return avatarNode(u || userState.user, size); },
    photoUrl: driveImg
  };

  /* ---------- Company holidays ("วันหยุดนขัต") ---------- */
  var holP = null, holSet = null;
  function ymd(d) { d = d instanceof Date ? d : new Date(d); var b = new Date(d.getTime() + 7 * 3600e3); return b.toISOString().slice(0, 10); }
  UI.holidays = {
    /* → Promise<[{ date: 'YYYY-MM-DD', name }]> — live from the sheet, falls back to the copy bundled with Rattana CI */
    list: function (force) {
      if (holP && !force) return holP;
      holP = gviz(userCfg.sheetId, userCfg.holidayTab, 'select *', 15000).then(function (tb) {
        var out = []; (tb.rows || []).forEach(function (r) {
          var c0 = r.c && r.c[0], c1 = r.c && r.c[1], d = '';
          if (c0 && typeof c0.v === 'string' && /^Date\(/.test(c0.v)) { var m = c0.v.match(/Date\((\d+),(\d+),(\d+)/); if (m) d = m[1] + '-' + ('0' + (+m[2] + 1)).slice(-2) + '-' + ('0' + m[3]).slice(-2); }
          else if (c0 && c0.v) { var s = String(c0.f || c0.v).replace(/\//g, '-'); if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) { var p = s.split('-'); d = p[0] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[2]).slice(-2); } }
          if (d) out.push({ date: d, name: cellVal(c1) });
        });
        if (!out.length) throw new Error('empty');
        return out;
      }).catch(function () {
        return fetch(BASE + 'holidays.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { return j.holidays || j; });
      }).then(function (list) { list.sort(function (a, b) { return a.date < b.date ? -1 : 1; }); holSet = {}; list.forEach(function (h) { holSet[h.date] = h.name; }); return list; },
        function (e) { holP = null; throw e; });
      return holP;
    },
    /* after list() has loaded: holiday name for a date, or '' */
    is: function (d) { return (holSet && holSet[ymd(d)]) || ''; },
    /* the next holiday on/after a date → Promise<{date,name}|null> */
    next: function (d) { var from = ymd(d || new Date()); return UI.holidays.list().then(function (l) { for (var i = 0; i < l.length; i++) if (l[i].date >= from) return l[i]; return null; }); },
    /* working day = not Sunday (and not Saturday when opts.saturday === false) and not a company holiday */
    isWorkday: function (d, o) { var x = d instanceof Date ? d : new Date(d), wd = new Date(x.getTime() + 7 * 3600e3).getUTCDay(); if (wd === 0) return false; if (wd === 6 && o && o.saturday === false) return false; return !UI.holidays.is(x); },
    /* add N working days → Promise<Date> */
    addWorkdays: function (d, n, o) { return UI.holidays.list().then(function () { var x = new Date(d instanceof Date ? d.getTime() : d), k = 0; while (k < n) { x = new Date(x.getTime() + 864e5); if (UI.holidays.isWorkday(x, o)) k++; } return x; }); }
  };

  /* <a class="rt-app-brand"><b>ชื่อแอป</b><small>v1.0</small></a> → adds the app's own icon (or a letter tile) in front */
  function paintBrand(b) {
    if (b._rtBrand) return; b._rtBrand = 1;
    if (b.querySelector('img, .rt-app-icon')) return;
    var name = (b.querySelector('b, strong') || b).textContent.trim() || doc.title, u = appLogo({});
    var node;
    if (u === 'rattana') { node = el('img'); node.src = BASE + 'rattana-logo-navy.png'; node.alt = ''; }
    else if (u) { node = el('img'); node.src = u; node.alt = ''; node.onerror = function () { node.replaceWith(appMonogram(name, 40)); }; }
    else node = appMonogram(name, 40);
    b.insertBefore(node, b.firstChild);
  }

  /* hide a sign-in-only app until someone is signed in (no flash of the app behind the sign-in screen) */
  if (doc.body && doc.body.hasAttribute('data-rt-login') && !readSession()) root.classList.add('rt-auth-wait');

  /* search box: X that clears everything (+ optional barcode/QR button) */
  function enhanceSearch(box) {
    if (box._rtSearch) return;
    var inp = box.querySelector('input'); if (!inp) return; box._rtSearch = 1;
    var en = UI.getLang() === 'en';
    var clr = el('button', 'rt-search-clear'); clr.type = 'button'; clr.setAttribute('aria-label', en ? 'Clear search' : 'ล้างคำค้นหา'); clr.tabIndex = -1; clr.appendChild(svg(ICON.x, 14));
    inp.insertAdjacentElement('afterend', clr);
    function sync() { box.classList.toggle('has-value', !!inp.value); }
    ['input', 'change', 'search', 'focus', 'blur'].forEach(function (t) { inp.addEventListener(t, sync); });
    try { /* also notice when the app sets .value from code */
      var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      Object.defineProperty(inp, 'value', { configurable: true, get: function () { return d.get.call(this); }, set: function (v) { d.set.call(this, v); sync(); } });
    } catch (e) {}
    clr.addEventListener('mousedown', function (e) { e.preventDefault(); });
    clr.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      inp.value = ''; sync();
      inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); inp.dispatchEvent(new Event('search', { bubbles: true }));
      inp.focus(); UI.haptic('light');
    });
    if (box.hasAttribute('data-rt-scan') || inp.hasAttribute('data-rt-scan')) {
      var sb = el('button', 'rt-search-scan'); sb.type = 'button'; sb.setAttribute('aria-label', en ? 'Scan barcode or QR' : 'สแกนบาร์โค้ด / QR'); sb.title = sb.getAttribute('aria-label'); sb.appendChild(svg(ICON_SCAN, 18));
      clr.insertAdjacentElement('afterend', sb);
      sb.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        UI.scan({ title: box.getAttribute('data-rt-scan-title') || undefined }).then(function (v) { if (v != null) UI.fillScan(inp, v); });
      });
    }
    sync();
  }

  /* back-to-top floating button on every Rattana page */
  function setupToTop() {
    if (!doc.body || doc.body.hasAttribute('data-rt-no-top') || root.hasAttribute('data-rt-no-top') || off('totop') || doc.querySelector('.rt-totop')) return;
    /* full Rattana pages (body.rt-app) get it automatically; pages that only borrow parts ask for it with <body data-rt-totop> */
    if (!doc.body.classList.contains('rt-app') && !doc.body.hasAttribute('data-rt-totop')) return;
    /* the app already has its own back-to-top button → don't add a second one */
    var OWN = '[id*="backtotop" i],[id*="back-to-top" i],[id*="totop" i],[id*="to-top" i],[id*="scrolltop" i],[id*="gotop" i],[class*="back-to-top" i],[class*="backtotop" i],[class*="scroll-top" i],[class*="gotop" i],[class*="go-top" i],[class*="to-top" i]';
    function hasOwn() { var n = doc.querySelectorAll(OWN); for (var i = 0; i < n.length; i++) if (!n[i].classList.contains('rt-totop') && !n[i].closest('.rt-totop')) return true; return false; }
    if (hasOwn()) return;
    var en = UI.getLang() === 'en', b = el('button', 'rt-totop'); b.type = 'button'; b.setAttribute('aria-label', en ? 'Back to top' : 'กลับขึ้นบนสุด'); b.title = b.getAttribute('aria-label');
    var ns = 'http://www.w3.org/2000/svg', ring = doc.createElementNS(ns, 'svg'); ring.setAttribute('class', 'rt-totop-ring'); ring.setAttribute('viewBox', '0 0 54 54'); ring.setAttribute('aria-hidden', 'true');
    var c1 = doc.createElementNS(ns, 'circle'), c2 = doc.createElementNS(ns, 'circle'), C = 2 * Math.PI * 25;
    [c1, c2].forEach(function (c) { c.setAttribute('cx', '27'); c.setAttribute('cy', '27'); c.setAttribute('r', '25'); ring.appendChild(c); });
    c1.setAttribute('class', 'rt-ring-bg'); c2.setAttribute('class', 'rt-ring-fg'); c2.style.strokeDasharray = C; c2.style.strokeDashoffset = C;
    var ar = svg('M12 19V5M5 12l7-7 7 7', 22); ar.setAttribute('class', 'rt-totop-arrow'); ar.setAttribute('stroke-width', '2.4');
    b.appendChild(ring); b.appendChild(ar); doc.body.appendChild(b);
    var ticking = false;
    function metrics() {
      var s = UI._scroller && UI._scroller.isConnected ? UI._scroller : null;
      var top = s ? s.scrollTop : (win.scrollY || root.scrollTop), max = s ? s.scrollHeight - s.clientHeight : Math.max(root.scrollHeight, doc.body.scrollHeight) - win.innerHeight;
      return { top: top, max: Math.max(1, max) };
    }
    function update() {
      ticking = false; var m = metrics(), show = m.top > Math.max(320, win.innerHeight * 0.6) && !root.classList.contains('rt-locked');
      b.classList.toggle('is-on', show);
      c2.style.strokeDashoffset = String(C * (1 - Math.min(1, m.top / m.max)));
      /* sit above a visible bottom nav */
      var lift = 0;
      [].forEach.call(doc.querySelectorAll('.rt-bottom-nav'), function (nav) { var r = nav.getBoundingClientRect(), cs = getComputedStyle(nav); if (cs.position === 'fixed' && cs.display !== 'none' && cs.visibility !== 'hidden' && r.height && r.bottom > win.innerHeight - 60 && r.top < win.innerHeight) lift = Math.max(lift, win.innerHeight - r.top + 4 - 16); });
      /* never sit on top of the app's own floating buttons (cart, add, chat…) */
      if (show) {
        var x = win.innerWidth - 42, guard = 0;
        while (guard++ < 4) {
          var y = win.innerHeight - 42 - lift, hit = null, list = doc.elementsFromPoint ? doc.elementsFromPoint(x, y) : [];
          for (var i = 0; i < list.length; i++) { var n = list[i]; if (n === b || b.contains(n) || n === doc.body || n === root) continue; var f = n; while (f && f !== doc.body) { var p = getComputedStyle(f).position; if (p === 'fixed' || p === 'sticky') break; f = f.parentElement; } if (f && f !== doc.body && !f.classList.contains('rt-toast-stack') && !f.closest('.rt-toast-stack')) { hit = f; break; } }
          if (!hit) break; var hr = hit.getBoundingClientRect(); if (hr.height > win.innerHeight * 0.5) break; lift = Math.max(lift, win.innerHeight - hr.top + 8 - 16);
        }
      }
      lift = Math.max(0, Math.min(lift, win.innerHeight * 0.45));
      b.style.setProperty('--rt-totop-lift', lift + 'px');
      if (show && hasOwn()) { b.remove(); doc.removeEventListener('scroll', onScroll, true); }
    }
    function onScroll(e) {
      var t = e && e.target;
      if (t && t.nodeType === 1 && t !== doc.documentElement && t !== doc.body && !t.closest('.rt-overlay, .rt-popover, .rt-lightbox, .rt-scan') && t.clientHeight > win.innerHeight * 0.5 && t.scrollHeight > t.clientHeight + 200) UI._scroller = t;
      else if (t === doc || t === doc.documentElement || t === doc.body) { if ((win.scrollY || root.scrollTop) > 0) UI._scroller = null; }
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
    win.addEventListener('resize', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } });
    b.addEventListener('click', function () { b.classList.remove('is-flying'); void b.offsetWidth; b.classList.add('is-flying'); UI.haptic('light'); UI.scrollTop(); });
    update();
  }

  function boot() {
    if (!root.getAttribute('data-theme')) UI.setTheme(store(KEY_THEME) || 'light');
    UI.init();
    var saved = store(KEY_LANG); if (saved && saved !== UI.getLang()) UI.setLang(saved);
    UI.setTheme(UI.getTheme());
    setupToTop();
    /* <body data-rt-login="ชื่อแอป" data-rt-login-role="5"> → sign-in screen before the app shows */
    if (doc.body && doc.body.hasAttribute('data-rt-login')) { /* (early hide happens at load, below) */
      var b = doc.body, mr = parseInt(b.getAttribute('data-rt-login-role'), 10), dr = parseInt(b.getAttribute('data-rt-login-default-role'), 10);
      UI.user.config({ appName: b.getAttribute('data-rt-login') || doc.title, minRole: isNaN(mr) ? 0 : mr, defaultRole: isNaN(dr) ? null : dr });
      UI.user.signIn();
    }
    /* pick up anything an app renders later */
    if ('MutationObserver' in win && doc.body) {
      var pending = [], scheduled = false;
      new MutationObserver(function (ms) {
        ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && !(n.classList && (n.classList.contains('rt-ripple') || n.classList.contains('rt-fx')))) pending.push(n); }); });
        if (pending.length && !scheduled) { scheduled = true; requestAnimationFrame(function () { scheduled = false; var list = pending; pending = []; list.forEach(function (n) { if (n.isConnected) UI.init(n); }); }); }
      }).observe(doc.body, { childList: true, subtree: true });
    }
  }

  window.RattanaUI = UI;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
