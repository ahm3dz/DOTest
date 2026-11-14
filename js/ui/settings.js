/* =========================================================
   DOTest — Settings panel   © Ahmed Al-Zahrani
   Every option is a row of buttons. Saved in the browser.
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.settings = (function () {
  var u = DOT.u, t = function (k, v) { return DOT.t(k, v); };
  var S = Object.assign({}, DOT.config.settingsDefaults, u.store.get('settings', {}));

  /* [key, label, options[[value, labelKey|text]]] */
  function schema() {
    var cores = navigator.hardwareConcurrency || 4;
    var thr = [[0, 'auto']]; [1, 2, 4, 8, 16, 32].forEach(function (n) { if (n < cores) thr.push([n, String(n)]); }); thr.push([cores, String(cores)]); thr.push([cores * 2, String(cores * 2) + ' ×2']);
    return [
      { sec: 'set_sec_test' },
      ['scene', 'set_scene', [['mandelbulb', 'sc_mandelbulb'], ['menger', 'sc_menger']]],
      ['resMul', 'set_res', [[0.5, '50%'], [0.75, '75%'], [1, '100%'], [1.5, '150%'], [2, '200%']]],
      ['durMul', 'set_dur', [[0.5, '×0.5'], [1, '×1'], [2, '×2'], [3, '×3']]],
      ['threads', 'set_threads', thr],
      ['ramMB', 'set_ram', [[0, 'auto'], [256, '256MB'], [512, '512MB'], [1024, '1GB'], [2048, '2GB'], [4096, '4GB']]],
      { sec: 'set_sec_ui' },
      ['accent', 'set_accent', Object.keys(DOT.config.accents).map(function (k) { return [k, 'ac_' + k]; })],
      ['hero3d', 'set_hero', [[true, 'on'], [false, 'off']]],
      ['hud', 'set_hud', [[true, 'on'], [false, 'off']]],
      ['netUnit', 'set_unit', [['mbps', 'Mbps'], ['mbs', 'MB/s']]],
      ['hideIP', 'set_hideip', [[true, 'on'], [false, 'off']]],
      { sec: 'set_sec_alerts' },
      ['sound', 'set_sound', [[true, 'on'], [false, 'off']]],
      ['vibrate', 'set_vibrate', [[true, 'on'], [false, 'off']]],
      ['wakeLock', 'set_wake', [[true, 'on'], [false, 'off']]]
    ];
  }

  function get(k) { return S[k]; }
  function set(k, v) { S[k] = v; u.store.set('settings', S); apply(); }
  function reset() { S = Object.assign({}, DOT.config.settingsDefaults); u.store.set('settings', S); apply(); render(); }

  function apply() {
    var a = DOT.config.accents[S.accent] || DOT.config.accents.cyan, r = document.documentElement.style;
    r.setProperty('--cy', a[0]); r.setProperty('--pu', a[1]);
    var hud = document.getElementById('hud'); if (hud) hud.classList.toggle('hud-off', !S.hud);
    DOT.hero3d && DOT.hero3d.refresh();
    document.dispatchEvent(new CustomEvent('dot:settings'));
  }

  function label(x) { var s = DOT.t(x); return s === x ? x : s; }

  function render() {
    var box = u.$('#settingsBody'); if (!box) return;
    box.innerHTML = schema().map(function (row) {
      if (row.sec) return '<div class="set-sec">' + t(row.sec) + '</div>';
      return '<div class="set-row"><div class="set-l">' + t(row[1]) + '</div><div class="seg">' + row[2].map(function (o) {
        var on = String(S[row[0]]) === String(o[0]);
        var sw = row[0] === 'accent' ? '<i class="sw" style="background:linear-gradient(135deg,' + DOT.config.accents[o[0]][0] + ',' + DOT.config.accents[o[0]][1] + ')"></i>' : '';
        return '<button class="' + (on ? 'on' : '') + '" data-k="' + row[0] + '" data-v="' + o[0] + '">' + sw + u.esc(label(o[1])) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
  }

  function open() { render(); u.$('#settingsModal').hidden = false; document.body.classList.add('noscroll'); }
  function close() { u.$('#settingsModal').hidden = true; document.body.classList.remove('noscroll'); }

  function bind() {
    u.$('#settingsBtn').onclick = open;
    u.$('#settingsClose').onclick = close;
    u.$('#settingsReset').onclick = reset;
    u.$('#settingsModal').addEventListener('click', function (e) {
      if (e.target.id === 'settingsModal') return close();
      var b = e.target.closest('button[data-k]'); if (!b) return;
      var k = b.dataset.k, raw = b.dataset.v, cur = S[k];
      var v = typeof cur === 'boolean' ? raw === 'true' : typeof cur === 'number' ? parseFloat(raw) : raw;
      set(k, v); render();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !u.$('#settingsModal').hidden) close(); });
  }

  return { get: get, set: set, apply: apply, bind: bind, open: open, render: render, all: function () { return S; } };
})();
