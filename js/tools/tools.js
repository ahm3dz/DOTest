/* =========================================================
   DOTest — Extra tools   © Ahmed Al-Zahrani
   Screen · Touch · Keyboard · Mouse · Gamepad · Speakers ·
   Storage speed · Battery · Sensors · Vibration
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.tools = (function () {
  var u = DOT.u, $ = u.$, t = function (k, v) { return DOT.t(k, v); };
  var cleanup = null, audioCtx = null;

  var LIST = [
    ['deadpixel', '🟥', 'tl_deadpixel'], ['gradient', '🌈', 'tl_gradient'], ['motion', '🏃', 'tl_motion'], ['touch', '👆', 'tl_touch'],
    ['keyboard', '⌨️', 'tl_keyboard'], ['mouse', '🖱️', 'tl_mouse'], ['gamepad', '🎮', 'tl_gamepad'], ['speakers', '🔊', 'tl_speakers'],
    ['storage', '💽', 'tl_storage'], ['battery', '🔋', 'tl_battery'], ['sensors', '🧭', 'tl_sensors'], ['vibration', '📳', 'tl_vibration']
  ];

  function grid() {
    $('#toolsGrid').innerHTML = LIST.map(function (x) {
      return '<button class="tool card" data-tool="' + x[0] + '"><span class="ti">' + x[1] + '</span><b>' + t(x[2]) + '</b><small>' + t(x[2] + '_d') + '</small></button>';
    }).join('');
  }

  function modal(title, html) {
    stop();
    $('#toolTitle').textContent = title; $('#toolBody').innerHTML = html;
    $('#toolModal').hidden = false; document.body.classList.add('noscroll');
  }
  function stop() { if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; } }
  function close() { stop(); $('#toolModal').hidden = true; document.body.classList.remove('noscroll'); }

  /* ---------- fullscreen color overlay (dead pixels / gradients) ---------- */
  function overlay(steps, hint) {
    var ov = $('#fsOverlay'), i = 0;
    function show() { var s = steps[i]; ov.style.background = s; ov.querySelector('span').textContent = (i + 1) + ' / ' + steps.length + ' — ' + hint; }
    ov.hidden = false; show();
    try { (ov.requestFullscreen || ov.webkitRequestFullscreen || function () { }).call(ov); } catch (e) { }
    function next(e) { e.preventDefault(); i++; if (i >= steps.length) return end(); show(); }
    function key(e) { if (e.key === 'Escape') end(); else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') next(e); }
    function end() {
      ov.hidden = true; ov.removeEventListener('click', next); document.removeEventListener('keydown', key);
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { }
    }
    ov.addEventListener('click', next); document.addEventListener('keydown', key);
  }

  var tools = {
    deadpixel: function () {
      overlay(['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000', '#00ffff', '#ff00ff', '#ffff00', '#808080'], t('tl_tapnext'));
    },
    gradient: function () {
      overlay(['linear-gradient(90deg,#000,#fff)', 'linear-gradient(90deg,#000,#f00)', 'linear-gradient(90deg,#000,#0f0)', 'linear-gradient(90deg,#000,#00f)',
        'linear-gradient(90deg,red,orange,yellow,lime,cyan,blue,magenta,red)', 'repeating-linear-gradient(90deg,#000 0 1px,#fff 1px 2px)', 'repeating-linear-gradient(0deg,#000 0 1px,#fff 1px 2px)'], t('tl_tapnext'));
    },

    motion: function () {
      modal(t('tl_motion'), '<canvas id="mCan" class="tool-can"></canvas><div class="tool-stats"><span>' + t('tl_fps') + ': <b class="en" id="mFps">0</b></span><span>' + t('tl_dropped') + ': <b class="en" id="mDrop">0</b></span><span>' + t('tl_speed') + ': <b class="en" id="mSpd">960</b> px/s</span></div><div class="seg" id="mSeg"><button data-s="480">480</button><button class="on" data-s="960">960</button><button data-s="1920">1920</button></div><p class="mu">' + t('tl_motion_h') + '</p>');
      var c = $('#mCan'), x = c.getContext('2d'), raf, spd = 960, last = 0, pos = 0, n = 0, t0 = 0, drop = 0, hz = DOT.app && DOT.app.refresh() || 60;
      $('#mSeg').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; spd = +b.dataset.s; $('#mSpd').textContent = spd; [].forEach.call(this.children, function (k) { k.classList.toggle('on', k === b); }); };
      function f(now) {
        var dpr = window.devicePixelRatio || 1; c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
        if (last) { var dt = now - last; pos += spd * dt / 1000 * dpr; if (dt > 1000 / hz * 1.5) drop++; }
        last = now; n++; if (!t0) t0 = now;
        if (now - t0 > 500) { $('#mFps').textContent = Math.round(n * 1000 / (now - t0)); $('#mDrop').textContent = drop; n = 0; t0 = now; }
        x.fillStyle = '#0a0c1a'; x.fillRect(0, 0, c.width, c.height);
        var W = c.width, y = c.height / 2, px = pos % (W + 80 * dpr) - 40 * dpr;
        for (var k = 0; k < 3; k++) { x.fillStyle = ['#00e5ff', '#a855f7', '#ff3d81'][k]; x.beginPath(); x.ellipse(px, y - 50 * dpr + k * 50 * dpr, 30 * dpr, 12 * dpr, 0, 0, Math.PI * 2); x.fill(); }
        x.fillStyle = 'rgba(255,255,255,.08)'; for (var g = 0; g < W; g += 40 * dpr) x.fillRect(g, 0, 1, c.height);
        raf = requestAnimationFrame(f);
      }
      raf = requestAnimationFrame(f);
      cleanup = function () { cancelAnimationFrame(raf); };
    },

    touch: function () {
      modal(t('tl_touch'), '<canvas id="tCan" class="tool-can tall"></canvas><div class="tool-stats"><span>' + t('tl_points') + ': <b class="en" id="tN">0</b></span><span>' + t('tl_max') + ': <b class="en" id="tMax">0</b></span><button class="btn-mini" id="tClr">' + t('clear') + '</button></div>');
      var c = $('#tCan'), x = c.getContext('2d'), mx = 0, dpr = window.devicePixelRatio || 1, cols = ['#00e5ff', '#a855f7', '#ff3d81', '#22e58a', '#ffc93c', '#ff6a3d', '#3d8bff', '#fff', '#ff00aa', '#00ffaa'];
      c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
      $('#tClr').onclick = function () { x.clearRect(0, 0, c.width, c.height); mx = 0; $('#tMax').textContent = 0; };
      function h(e) {
        e.preventDefault(); var r = c.getBoundingClientRect(), ts = e.touches;
        $('#tN').textContent = ts.length; mx = Math.max(mx, ts.length); $('#tMax').textContent = mx;
        for (var i = 0; i < ts.length; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); x.arc((ts[i].clientX - r.left) * dpr, (ts[i].clientY - r.top) * dpr, 14 * dpr, 0, Math.PI * 2); x.fill(); }
      }
      function pm(e) { if (e.pointerType === 'touch') return; if (!e.buttons) return; var r = c.getBoundingClientRect(); x.fillStyle = '#00e5ff'; x.beginPath(); x.arc((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, 6 * dpr, 0, Math.PI * 2); x.fill(); }
      c.addEventListener('touchstart', h, { passive: false }); c.addEventListener('touchmove', h, { passive: false });
      c.addEventListener('touchend', function (e) { $('#tN').textContent = e.touches.length; });
      c.addEventListener('pointermove', pm);
    },

    keyboard: function () {
      modal(t('tl_keyboard'), '<div class="kb-now" id="kNow">—</div><div class="tool-stats"><span>code: <b class="en" id="kCode">—</b></span><span>keyCode: <b class="en" id="kKC">—</b></span><span>' + t('tl_pressed') + ': <b class="en" id="kCnt">0</b></span><span>' + t('tl_rollover') + ': <b class="en" id="kRoll">0</b></span></div><div class="kb-log" id="kLog"></div><p class="mu">' + t('tl_keyboard_h') + '</p>');
      var down = {}, cnt = 0, roll = 0, seen = {};
      function kd(e) {
        if (e.key === 'Escape') return; e.preventDefault();
        if (!down[e.code]) { cnt++; down[e.code] = 1; }
        roll = Math.max(roll, Object.keys(down).length);
        $('#kNow').textContent = e.key === ' ' ? 'Space' : e.key; $('#kCode').textContent = e.code; $('#kKC').textContent = e.keyCode;
        $('#kCnt').textContent = cnt; $('#kRoll').textContent = roll;
        if (!seen[e.code]) { seen[e.code] = 1; $('#kLog').insertAdjacentHTML('beforeend', '<span class="en">' + u.esc(e.code) + '</span>'); }
      }
      function ku(e) { delete down[e.code]; }
      document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      cleanup = function () { document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
    },

    mouse: function () {
      modal(t('tl_mouse'), '<div class="mouse-pad" id="mPad">' + t('tl_mouse_h') + '</div><div class="tool-stats"><span>L: <b class="en" id="mL">0</b></span><span>M: <b class="en" id="mM">0</b></span><span>R: <b class="en" id="mR">0</b></span><span>Back/Fwd: <b class="en" id="mX">0</b></span><span>Wheel: <b class="en" id="mW">0</b></span><span>DblClick: <b class="en" id="mD">0</b></span><span>' + t('tl_poll') + ': <b class="en" id="mHz">—</b> Hz</span></div>');
      var p = $('#mPad'), c = { 0: 0, 1: 0, 2: 0, 3: 0 }, w = 0, d = 0, ev = 0, t0 = performance.now(), best = 0;
      p.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      p.addEventListener('mousedown', function (e) { e.preventDefault(); var b = e.button > 2 ? 3 : e.button; c[b]++; $('#mL').textContent = c[0]; $('#mM').textContent = c[1]; $('#mR').textContent = c[2]; $('#mX').textContent = c[3]; });
      p.addEventListener('dblclick', function () { $('#mD').textContent = ++d; });
      p.addEventListener('wheel', function (e) { e.preventDefault(); $('#mW').textContent = ++w; }, { passive: false });
      p.addEventListener('pointermove', function (e) {
        ev += e.getCoalescedEvents ? Math.max(1, e.getCoalescedEvents().length) : 1;
        var now = performance.now(); if (now - t0 >= 500) { var hz = ev * 1000 / (now - t0); if (hz > best) best = hz; $('#mHz').textContent = Math.round(best); ev = 0; t0 = now; }
      });
    },

    gamepad: function () {
      modal(t('tl_gamepad'), '<div id="gpBox" class="mu">' + t('tl_gamepad_h') + '</div>');
      var raf;
      function f() {
        var pads = navigator.getGamepads ? navigator.getGamepads() : [], html = '';
        for (var i = 0; i < pads.length; i++) {
          var g = pads[i]; if (!g) continue;
          html += '<div class="gp"><b class="en">' + u.esc(g.id) + '</b><div class="gp-btns">' + g.buttons.map(function (b, k) { return '<span class="' + (b.pressed ? 'on' : '') + '" style="--v:' + b.value + '">' + k + '</span>'; }).join('') + '</div><div class="gp-axes">' + g.axes.map(function (a, k) { return '<div><small class="en">A' + k + '</small><i style="left:' + ((a + 1) * 50) + '%"></i></div>'; }).join('') + '</div></div>';
        }
        if (html) $('#gpBox').innerHTML = html;
        raf = requestAnimationFrame(f);
      }
      raf = requestAnimationFrame(f);
      cleanup = function () { cancelAnimationFrame(raf); };
    },

    speakers: function () {
      modal(t('tl_speakers'), '<div class="seg big"><button data-p="-1">◀ ' + t('tl_left') + '</button><button data-p="0">● ' + t('tl_both') + '</button><button data-p="1">' + t('tl_right') + ' ▶</button></div><div class="set-row"><div class="set-l">' + t('tl_freq') + ': <b class="en" id="fV">440</b> Hz</div><input type="range" id="fR" min="20" max="20000" value="440" class="range"></div><div class="seg"><button id="sweep">' + t('tl_sweep') + '</button><button id="sStop">■ ' + t('stop') + '</button></div><p class="mu">' + t('tl_speakers_h') + '</p>');
      var osc = null, pan = null, gain = null;
      function ctx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
      function play(p, freq) {
        halt(); var a = ctx(); osc = a.createOscillator(); gain = a.createGain(); gain.gain.value = 0.15;
        osc.frequency.value = freq || +$('#fR').value;
        if (a.createStereoPanner) { pan = a.createStereoPanner(); pan.pan.value = p; osc.connect(gain).connect(pan).connect(a.destination); } else osc.connect(gain).connect(a.destination);
        osc.start();
      }
      function halt() { if (osc) { try { osc.stop(); } catch (e) { } osc = null; } }
      $('#toolBody').querySelector('.seg.big').onclick = function (e) { var b = e.target.closest('button'); if (b) play(+b.dataset.p); };
      $('#fR').oninput = function () { $('#fV').textContent = this.value; if (osc) osc.frequency.value = +this.value; };
      $('#sweep').onclick = function () { play(0, 20); var a = ctx(); osc.frequency.setValueAtTime(20, a.currentTime); osc.frequency.exponentialRampToValueAtTime(20000, a.currentTime + 12); };
      $('#sStop').onclick = halt;
      cleanup = halt;
    },

    storage: function () {
      modal(t('tl_storage'), '<div class="seg" id="dSeg"><button data-m="64">64MB</button><button class="on" data-m="256">256MB</button><button data-m="512">512MB</button><button data-m="1024">1GB</button></div><button class="btn btn-go sm" id="dGo">▶ ' + t('start') .replace('▶ ', '') + '</button><div class="fpsgrid" id="dRes" style="margin-top:14px"></div><p class="mu">' + t('tl_storage_h') + '</p>');
      var mb = 256;
      $('#dSeg').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; mb = +b.dataset.m; [].forEach.call(this.children, function (k) { k.classList.toggle('on', k === b); }); };
      $('#dGo').onclick = function () {
        var btn = this; btn.disabled = true; $('#dRes').innerHTML = '<div class="mu">…</div>';
        storageTest(mb, function (p) { $('#dRes').innerHTML = '<div class="mu">' + p + '</div>'; }).then(function (r) {
          $('#dRes').innerHTML = cell(t('tl_write'), r.write.toFixed(0) + ' MB/s', '#ff3d81') + cell(t('tl_read'), r.read.toFixed(0) + ' MB/s', '#00e5ff') + cell(t('tl_api'), r.api) + cell(t('tl_size'), mb + ' MB');
        }, function (e) { $('#dRes').innerHTML = '<div class="mu">⚠️ ' + t('tl_storage_err') + ' (' + u.esc(e && e.message || e) + ')</div>'; }).finally(function () { btn.disabled = false; });
      };
    },

    battery: function () {
      modal(t('tl_battery'), '<div id="bBox"></div><canvas id="bCan" class="chart-sm"></canvas><p class="mu">' + t('tl_battery_h') + '</p>');
      if (!navigator.getBattery) { $('#bBox').innerHTML = '<div class="mu">' + t('NA') + '</div>'; return; }
      var vals = [], iv, b0 = null, t0 = Date.now();
      navigator.getBattery().then(function (b) {
        function draw() {
          if (b0 == null) b0 = b.level;
          vals.push(b.level * 100); if (vals.length > 300) vals.shift();
          var mins = (Date.now() - t0) / 60000, rate = mins > 0.5 ? (b0 - b.level) * 100 / mins * 60 : null;
          $('#bBox').innerHTML = '<div class="fpsgrid">' + cell(t('tl_level'), Math.round(b.level * 100) + '%', '#22e58a') + cell(t('tl_state'), b.charging ? '⚡ ' + t('tl_charging') : t('tl_discharging')) +
            cell(t('tl_full'), isFinite(b.chargingTime) && b.chargingTime > 0 ? Math.round(b.chargingTime / 60) + ' min' : '—') + cell(t('tl_left_t'), isFinite(b.dischargingTime) ? Math.round(b.dischargingTime / 60) + ' min' : '—') +
            cell(t('tl_rate'), rate != null && !b.charging ? rate.toFixed(1) + '%/h' : '—') + '</div>';
          DOT.charts.spark($('#bCan'), vals, '#22e58a', 'battery %');
        }
        draw(); iv = setInterval(draw, 5000);
        cleanup = function () { clearInterval(iv); };
      }).catch(function () { $('#bBox').innerHTML = '<div class="mu">' + t('NA') + '</div>'; });
    },

    sensors: function () {
      modal(t('tl_sensors'), '<button class="btn btn-ghost" id="sGo">' + t('tl_allow') + '</button><div class="fpsgrid" id="sBox" style="margin-top:12px"></div><div class="bubble"><i id="sDot"></i></div><p class="mu">' + t('tl_sensors_h') + '</p>');
      var o = {}, m = {};
      function draw() {
        $('#sBox').innerHTML = cell('α (compass)', o.a != null ? o.a.toFixed(0) + '°' : '—') + cell('β (tilt)', o.b != null ? o.b.toFixed(1) + '°' : '—') + cell('γ (roll)', o.g != null ? o.g.toFixed(1) + '°' : '—') +
          cell('acc x/y/z', m.x != null ? m.x.toFixed(1) + ' / ' + m.y.toFixed(1) + ' / ' + m.z.toFixed(1) : '—') + cell('G-force', m.x != null ? (Math.sqrt(m.x * m.x + m.y * m.y + m.z * m.z) / 9.81).toFixed(2) + ' g' : '—');
        if (o.b != null) $('#sDot').style.transform = 'translate(' + u.clamp(o.g, -45, 45) * 1.5 + 'px,' + u.clamp(o.b, -45, 45) * 1.5 + 'px)';
      }
      function ori(e) { o = { a: e.alpha, b: e.beta, g: e.gamma }; draw(); }
      function mot(e) { var a = e.accelerationIncludingGravity || {}; m = { x: a.x || 0, y: a.y || 0, z: a.z || 0 }; draw(); }
      function go() { window.addEventListener('deviceorientation', ori); window.addEventListener('devicemotion', mot); draw(); }
      $('#sGo').onclick = function () {
        var P = window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission;
        if (P) DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') go(); else u.toast(t('tl_denied')); }).catch(function () { u.toast(t('tl_denied')); });
        else go();
      };
      draw();
      cleanup = function () { window.removeEventListener('deviceorientation', ori); window.removeEventListener('devicemotion', mot); };
    },

    vibration: function () {
      modal(t('tl_vibration'), '<div class="seg big"><button data-v="200">' + t('tl_short') + '</button><button data-v="800">' + t('tl_long') + '</button><button data-v="pattern">SOS</button></div><p class="mu">' + (navigator.vibrate ? t('tl_vibration_h') : t('NA')) + '</p>');
      $('#toolBody').querySelector('.seg').onclick = function (e) {
        var b = e.target.closest('button'); if (!b || !navigator.vibrate) return;
        navigator.vibrate(b.dataset.v === 'pattern' ? [100, 80, 100, 80, 100, 200, 300, 80, 300, 80, 300, 200, 100, 80, 100, 80, 100] : +b.dataset.v);
      };
    }
  };

  function cell(l, v, c) { return '<div class="fg"><div class="v en"' + (c ? ' style="color:' + c + '"' : '') + '>' + v + '</div><div class="l">' + l + '</div></div>'; }

  /* ---------- Storage speed (OPFS, falls back to IndexedDB) ---------- */
  function storageTest(mb, onP) {
    var CH = 8 * 1048576, n = Math.max(1, Math.round(mb * 1048576 / CH)), buf = new Uint8Array(CH);
    for (var o = 0; o < CH; o += 65536) crypto.getRandomValues(buf.subarray(o, o + 65536));
    function opfs() {
      var dir, fh, name = 'dotest-' + Date.now() + '.bin';
      return navigator.storage.getDirectory().then(function (d) { dir = d; return d.getFileHandle(name, { create: true }); }).then(function (h) {
        fh = h; if (!h.createWritable) throw new Error('no createWritable');
        return h.createWritable();
      }).then(function (w) {
        var t0 = performance.now(), i = 0;
        function wr() { if (i >= n) return w.close(); onP(t('tl_writing') + ' ' + Math.round(i / n * 100) + '%'); i++; return w.write(buf).then(wr); }
        return wr().then(function () { return performance.now() - t0; });
      }).then(function (wt) {
        return fh.getFile().then(function (f) {
          var t0 = performance.now(), off = 0;
          function rd() { if (off >= f.size) return; onP(t('tl_reading') + ' ' + Math.round(off / f.size * 100) + '%'); var s = f.slice(off, off + CH); off += CH; return s.arrayBuffer().then(rd); }
          return rd().then(function () { return { write: mb / (wt / 1000), read: mb / ((performance.now() - t0) / 1000), api: 'OPFS' }; });
        });
      }).finally(function () { if (dir) dir.removeEntry(name).catch(function () { }); });
    }
    function idb() {
      return new Promise(function (res, rej) {
        var name = 'dotest_disk_' + Date.now(), req = indexedDB.open(name, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('b'); };
        req.onerror = function () { rej(req.error); };
        req.onsuccess = function () {
          var db = req.result, t0 = performance.now(), i = 0;
          function put() {
            if (i >= n) return read(performance.now() - t0);
            onP(t('tl_writing') + ' ' + Math.round(i / n * 100) + '%');
            var tx = db.transaction('b', 'readwrite'); tx.objectStore('b').put(new Blob([buf]), i); tx.oncomplete = function () { i++; put(); }; tx.onerror = function () { rej(tx.error); };
          }
          function read(wt) {
            var t1 = performance.now(), k = 0;
            function get() {
              if (k >= n) { db.close(); indexedDB.deleteDatabase(name); return res({ write: mb / (wt / 1000), read: mb / ((performance.now() - t1) / 1000), api: 'IndexedDB' }); }
              onP(t('tl_reading') + ' ' + Math.round(k / n * 100) + '%');
              var tx = db.transaction('b'), g = tx.objectStore('b').get(k);
              g.onsuccess = function () { var v = g.result; (v && v.arrayBuffer ? v.arrayBuffer() : Promise.resolve()).then(function () { k++; get(); }); };
              g.onerror = function () { rej(g.error); };
            }
            get();
          }
          put();
        };
      });
    }
    return (navigator.storage && navigator.storage.getDirectory ? opfs().catch(function () { return idb(); }) : idb());
  }

  function bind() {
    grid();
    $('#toolsGrid').addEventListener('click', function (e) { var b = e.target.closest('[data-tool]'); if (b && tools[b.dataset.tool]) tools[b.dataset.tool](); });
    $('#toolClose').onclick = close;
    $('#toolModal').addEventListener('click', function (e) { if (e.target.id === 'toolModal') close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#toolModal').hidden) close(); });
  }

  return { bind: bind, grid: grid, storageTest: storageTest };
})();
