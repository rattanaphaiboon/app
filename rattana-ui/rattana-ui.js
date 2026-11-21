/* Rattana CI v1.4.1 — behaviour helpers (no dependencies). window.RattanaUI */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, win = window;
  var KEY_THEME = 'rattana-ui-theme', KEY_LANG = 'rattana-ui-lang';
  var ICON = {
    check: 'M20 6 9 17l-5-5',
    x: 'M18 6 6 18M6 6l12 12',
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
    var map = { success: ['rt-tile-green', ICON.check, 1], approve: ['rt-tile-green', ICON.check], error: ['rt-tile-red', ICON.x], reject: ['rt-tile-red', ICON.x], warning: ['rt-tile-amber', ICON.warn], info: ['rt-tile-blue', ICON.info], question: ['rt-tile-gold', ICON.help], gold: ['rt-tile-gold', ICON.check] };
    var m = map[kind] || map.info;
    var w = el('div', 'rt-popup-icon rt-tile ' + m[0]);
    w.appendChild(svg(m[1], 30, true));
    if (m[2]) { var b = el('span', 'rt-burst'); for (var i = 0; i < 12; i++) { var d = el('i'); d.style.setProperty('--a', (i * 30) + 'deg'); b.appendChild(d); } w.appendChild(b); }
    return w;
  }

  var UI = {
    version: '1.4.1',
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
  function rtSelect(n) { return n && n.tagName === 'SELECT' && (n.classList.contains('rt-select') || !!n.closest('.rt-app')) && !n.multiple && !(n.size > 1) && !n.hasAttribute('data-rt-native') && !n.closest('[data-rt-native]') && mq('(pointer: fine)'); }
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
    var img = e.target.closest && e.target.closest('img');
    if (!zoomable(img) || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); e.stopPropagation();
    var group = img.closest('[data-rt-zoom-group]') || img.closest('.rt-grid-products');
    var list = group ? [].filter.call(group.querySelectorAll(ZOOM_SEL), zoomable) : [img];
    UI.lightbox(list, Math.max(0, list.indexOf(img)));
  }, true);

  /* press ripple on buttons, chips, nav and menu items */
  doc.addEventListener('pointerdown', function (e) {
    if (reducedMotion() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var b = e.target.closest && e.target.closest('.rt-btn, .rt-chip, .rt-nav-item, .rt-menu-item, .rt-bottom-nav a, [data-rt-ripple]');
    if (!b || b.disabled || b.classList.contains('is-loading')) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.4, s = el('span', 'rt-ripple');
    s.style.width = s.style.height = d + 'px'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 750);
  }, { passive: true });

  /* Esc closes the shell menu */
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var s = doc.querySelector('.rt-shell.is-menu-open'); if (s) UI.menuOpen(false, s); } });

  function boot() {
    if (!root.getAttribute('data-theme')) UI.setTheme(store(KEY_THEME) || 'light');
    UI.init();
    var saved = store(KEY_LANG); if (saved && saved !== UI.getLang()) UI.setLang(saved);
    UI.setTheme(UI.getTheme());
    /* pick up anything an app renders later */
    if ('MutationObserver' in win && doc.body) {
      var pending = [], scheduled = false;
      new MutationObserver(function (ms) {
        ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && !(n.classList && n.classList.contains('rt-ripple'))) pending.push(n); }); });
        if (pending.length && !scheduled) { scheduled = true; requestAnimationFrame(function () { scheduled = false; var list = pending; pending = []; list.forEach(function (n) { if (n.isConnected) UI.init(n); }); }); }
      }).observe(doc.body, { childList: true, subtree: true });
    }
  }

  window.RattanaUI = UI;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
