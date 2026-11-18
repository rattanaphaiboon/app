/* RATTANA UI — behaviour helpers (no dependencies). window.RattanaUI */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var KEY_THEME = 'rattana-ui-theme', KEY_LANG = 'rattana-ui-lang';
  var ICON = {
    check: 'M20 6 9 17l-5-5',
    x: 'M18 6 6 18M6 6l12 12',
    info: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M12 16v-4M12 8h.01',
    warn: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01',
    sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
    moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'
  };
  var TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  var EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function svg(d, size) {
    var ns = 'http://www.w3.org/2000/svg', s = doc.createElementNS(ns, 'svg'), p = doc.createElementNS(ns, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); if (size) { s.setAttribute('width', size); s.setAttribute('height', size); }
    p.setAttribute('d', d); s.appendChild(p); return s;
  }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  var UI = {
    version: '1.0.0',
    icons: ICON,

    /* ---------- Theme ---------- */
    getTheme: function () { return root.getAttribute('data-theme') || 'light'; },
    setTheme: function (t) {
      t = t === 'dark' ? 'dark' : 'light';
      root.setAttribute('data-theme', t); store(KEY_THEME, t);
      doc.querySelectorAll('[data-rt-theme-toggle]').forEach(function (b) {
        b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
        var p = b.querySelector('path[data-rt-theme-icon]'); if (p) p.setAttribute('d', t === 'dark' ? ICON.moon : ICON.sun);
        var lab = b.querySelector('[data-rt-theme-label]'); if (lab) lab.textContent = t === 'dark' ? (UI.getLang() === 'en' ? 'Dark' : 'มืด') : (UI.getLang() === 'en' ? 'Light' : 'สว่าง');
      });
      root.dispatchEvent(new CustomEvent('rt:theme', { detail: t }));
      return t;
    },
    toggleTheme: function () { return UI.setTheme(UI.getTheme() === 'dark' ? 'light' : 'dark'); },

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
      UI.setTheme(UI.getTheme());
      root.dispatchEvent(new CustomEvent('rt:lang', { detail: l }));
      return l;
    },

    /* ---------- Formatting ---------- */
    formatDate: function (d, style, lang) {
      d = d instanceof Date ? d : new Date(d); lang = lang || UI.getLang();
      var day = d.getDate(), m = d.getMonth(), y = d.getFullYear();
      if (lang === 'en') {
        if (style === 'short') return day + ' ' + EN_MONTHS[m] + ' ' + y;
        return EN_DAYS[d.getDay()] + ', ' + day + ' ' + EN_MONTHS[m] + ' ' + y;
      }
      var be = y + 543;
      if (style === 'short') return day + ' ' + TH_MONTHS_SHORT[m] + ' ' + be;
      return TH_DAYS[d.getDay()] + ' ' + day + ' ' + TH_MONTHS[m] + ' ' + be;
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

    /* ---------- Toast ---------- */
    toast: function (message, opts) {
      opts = opts || {};
      var type = opts.type || 'success';
      var stack = doc.querySelector('.rt-toast-stack');
      if (!stack) { stack = el('div', 'rt-toast-stack'); stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite'); doc.body.appendChild(stack); }
      var t = el('div', 'rt-toast rt-glass' + (type !== 'success' ? ' is-' + type : ''));
      var mark = el('span', 'rt-toast-mark');
      mark.appendChild(svg(type === 'error' ? ICON.x : type === 'info' ? ICON.info : type === 'warning' ? ICON.warn : ICON.check));
      t.appendChild(mark); t.appendChild(el('span', null, message));
      stack.appendChild(t);
      setTimeout(function () { t.classList.add('is-leaving'); setTimeout(function () { t.remove(); }, 300); }, opts.duration || 2600);
      return t;
    },

    /* ---------- Confirm dialog → Promise<boolean> ---------- */
    confirm: function (o) {
      o = o || {};
      var variant = o.variant || 'approve';
      return new Promise(function (resolve) {
        var prev = doc.activeElement;
        var ov = el('div', 'rt-overlay' + (o.sheet ? ' is-sheet' : ''));
        var scrim = el('div', 'rt-scrim');
        var box = el('div', 'rt-modal rt-glass'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
        var id = 'rt-m-' + Date.now(); box.setAttribute('aria-labelledby', id);
        var head = el('div', 'rt-modal-head');
        var tile = el('span', 'rt-tile rt-tile-lg ' + (variant === 'reject' ? 'rt-tile-red' : variant === 'gold' ? 'rt-tile-gold' : 'rt-tile-green'));
        tile.appendChild(svg(variant === 'reject' ? ICON.x : ICON.check, 24));
        var txt = el('div'); var h = el('h2', 'rt-h3', o.title || ''); h.id = id; txt.appendChild(h);
        if (o.message) txt.appendChild(el('p', null, o.message));
        head.appendChild(tile); head.appendChild(txt); box.appendChild(head);
        var acts = el('div', 'rt-btn-group rt-btn-group-end');
        var no = el('button', 'rt-btn rt-btn-glass', o.cancelText || (UI.getLang() === 'en' ? 'Cancel' : 'ยกเลิก')); no.type = 'button';
        var yes = el('button', 'rt-btn ' + (variant === 'reject' ? 'rt-btn-reject' : variant === 'gold' ? 'rt-btn-gold' : 'rt-btn-approve'), o.confirmText || (UI.getLang() === 'en' ? 'Confirm' : 'ยืนยัน')); yes.type = 'button';
        acts.appendChild(no); acts.appendChild(yes); box.appendChild(acts);
        ov.appendChild(scrim); ov.appendChild(box); doc.body.appendChild(ov);
        function close(v) { doc.removeEventListener('keydown', onKey, true); ov.remove(); if (prev && prev.focus) prev.focus(); resolve(v); }
        function onKey(e) {
          if (e.key === 'Escape') { e.preventDefault(); close(false); }
          if (e.key === 'Tab') { var f = [no, yes], i = f.indexOf(doc.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); yes.focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); no.focus(); } }
        }
        doc.addEventListener('keydown', onKey, true);
        scrim.addEventListener('click', function () { close(false); });
        no.addEventListener('click', function () { close(false); });
        yes.addEventListener('click', function () { close(true); });
        yes.focus();
      });
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
        if (fire) seg.dispatchEvent(new CustomEvent('rt:change', { detail: { index: i, value: btns[i].value || btns[i].textContent.trim() }, bubbles: true }));
      }
      var cur = btns.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; });
      pick(cur < 0 ? 0 : cur, false);
      btns.forEach(function (b, i) { b.addEventListener('click', function () { pick(i, true); }); });
    },

    /* ---------- Count-up numbers ---------- */
    countUp: function (node, to, o) {
      o = o || {}; var dec = o.decimals || 0, pre = o.prefix || '', suf = o.suffix || '';
      var fmt = function (v) { return pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
      if (reducedMotion()) { node.textContent = fmt(to); return; }
      var t0 = performance.now(), dur = o.duration || 1100;
      (function step(t) { var x = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - x, 3); node.textContent = fmt(to * e); if (x < 1) requestAnimationFrame(step); })(t0);
    },

    /* ---------- Auto-wire markup ---------- */
    init: function (scope) {
      scope = scope || doc;
      if (!root.getAttribute('data-theme')) UI.setTheme(store(KEY_THEME) || 'light');
      scope.querySelectorAll('[data-rt-theme-toggle]').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', UI.toggleTheme); });
      scope.querySelectorAll('[data-rt-lang]').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', function () { UI.setLang(b.getAttribute('data-rt-lang')); }); });
      scope.querySelectorAll('.rt-seg').forEach(function (s) { if (s._rt) return; s._rt = 1; UI.segmented(s); });
      scope.querySelectorAll('[data-rt-count]').forEach(function (n) { if (n._rt) return; n._rt = 1; UI.countUp(n, parseFloat(n.getAttribute('data-rt-count')), { decimals: +(n.getAttribute('data-decimals') || 0), prefix: n.getAttribute('data-prefix') || '' }); });
      scope.querySelectorAll('.rt-wish').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); });
      scope.querySelectorAll('.rt-chip[aria-pressed]').forEach(function (b) { if (b._rt) return; b._rt = 1; b.addEventListener('click', function () { var g = b.parentElement; g.querySelectorAll('.rt-chip[aria-pressed]').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); }); });
      var saved = store(KEY_LANG); if (saved && saved !== UI.getLang()) UI.setLang(saved);
      else scope.querySelectorAll('[data-rt-date]').forEach(function (n) { n.textContent = UI.formatDate(new Date(), n.getAttribute('data-rt-date') || 'long'); });
      UI.setTheme(UI.getTheme());
    }
  };

  window.RattanaUI = UI;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { UI.init(); });
  else UI.init();
})();
