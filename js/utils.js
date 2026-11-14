/* =========================================================
   DOTest — Helpers   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.u = {
  $: function (s, r) { return (r || document).querySelector(s); },
  $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
  fmt: function (n, d) {
    if (n == null || !isFinite(n)) return '—';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 });
  },
  esc: function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); },
  sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
  timeout: function (p, ms, fallback) { return Promise.race([p, DOT.u.sleep(ms).then(function () { return fallback; })]); },
  mq: function (q) { try { return matchMedia(q).matches; } catch (e) { return false; } },
  avg: function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; },
  sum: function (a) { return a.reduce(function (x, y) { return x + y; }, 0); },
  clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
  GB: function (bytes) { if (!bytes) return null; var g = bytes / 1073741824; return (g >= 10 ? g.toFixed(0) : g.toFixed(1)) + ' GB'; },
  MB: function (bytes) { return bytes >= 1073741824 ? (bytes / 1073741824).toFixed(2) + ' GB' : Math.round(bytes / 1048576) + ' MB'; },

  toast: function (t) {
    var e = DOT.u.$('#toast'); e.textContent = t; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, 2600);
  },

  /* localStorage that never throws */
  store: {
    get: function (k, def) { try { var v = localStorage.getItem(DOT.config.storageKey + '_' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(DOT.config.storageKey + '_' + k, JSON.stringify(v)); } catch (e) { } }
  },

  /* The site's own address — from config, or detected automatically */
  siteURL: function () {
    if (DOT.config.siteURL) return DOT.config.siteURL.replace(/\/?$/, '/');
    try {
      if (!/^https?:$/.test(location.protocol)) return '';
      var p = location.pathname.replace(/[^\/]*\.html?$/i, '');
      return location.origin + (p.charAt(p.length - 1) === '/' ? p : p + '/');
    } catch (e) { return ''; }
  },
  siteHost: function () { var s = DOT.u.siteURL(); return s ? s.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''; },

  /* Short beep + vibration when a test finishes (respects settings) */
  notify: function () {
    var S = DOT.settings;
    if (!S || S.get('sound')) {
      try {
        var A = window.AudioContext || window.webkitAudioContext, a = DOT.u._ac || (DOT.u._ac = new A());
        [880, 1320].forEach(function (f, i) {
          var o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; g.gain.value = 0.0001;
          o.connect(g).connect(a.destination); var t0 = a.currentTime + i * 0.16;
          g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
          o.start(t0); o.stop(t0 + 0.16);
        });
      } catch (e) { }
    }
    if ((!S || S.get('vibrate')) && navigator.vibrate) try { navigator.vibrate([60, 40, 60]); } catch (e) { }
  },

  /* Download a file (works when self-hosted) */
  download: function (name, data, type) {
    try {
      var url = typeof data === 'string' && data.indexOf('data:') === 0 ? data : URL.createObjectURL(new Blob([data], { type: type || 'application/octet-stream' }));
      var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      return true;
    } catch (e) { return false; }
  }
};
