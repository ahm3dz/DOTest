/* =========================================================
   DOTest — App controller   © Ahmed Al-Zahrani
   Navigation, settings, and running the test plan.
   ========================================================= */
(function () {
  'use strict';
  var u = DOT.u, $ = u.$, t = DOT.t, cfg = DOT.config;
  var S = { level: u.store.get('level', 'medium'), mode: u.store.get('mode', 'full'), running: false, info: null, last: null, ctl: null, refresh: 60 };
  if (!cfg.levels[S.level]) S.level = 'medium';
  DOT.app = { refresh: function () { return S.refresh; }, info: function () { return S.info; } };

  /* ---------- navigation (tabs + #hash) ---------- */
  var VIEWS = ['tests', 'specs', 'network', 'hardware', 'tools', 'history', 'about'];
  function route() {
    var v = (location.hash || '').slice(1);
    if (VIEWS.indexOf(v) < 0) v = 'tests';
    u.$$('.view').forEach(function (s) { s.classList.toggle('on', s.dataset.view === v); });
    u.$$('#tabs a').forEach(function (a) { a.classList.toggle('on', a.dataset.v === v); });
    var on = $('#tabs a.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { }
    if (v === 'history') DOT.render.history();
    DOT.hero3d.pause(v !== 'tests' || S.running);
  }
  window.addEventListener('hashchange', route);
  function go(v) { if (location.hash !== '#' + v) location.hash = v; else route(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /* ---------- language ---------- */
  function setLang(l) {
    DOT.applyLang(l); u.store.set('lang', DOT.lang);
    u.$$('[data-i18n-ph]').forEach(function (e) { e.placeholder = t(e.getAttribute('data-i18n-ph')); });
    updControls(); DOT.tools.grid(); about();
    if (S.info) DOT.render.device(S.info);
    if (S.last && $('#results').classList.contains('show')) DOT.render.results(S.last, S.info, false);
    DOT.render.history(); DOT.agent.render(); DOT.netUI.refresh(); DOT.settings.render();
  }
  $('#langBtn').onclick = function () { setLang(DOT.lang === 'ar' ? 'en' : 'ar'); };

  /* ---------- effective level (settings multipliers applied) ---------- */
  function level() {
    var base = cfg.levels[S.level], m = DOT.settings.get('durMul') || 1, L = {};
    for (var k in base) L[k] = base[k];
    ['cpu', 'gpu', 'compute', 'ram', 'stress'].forEach(function (k) { L[k] = Math.max(2, Math.round(base[k] * m)); });
    if (DOT.settings.get('ramMB')) L.ramMB = DOT.settings.get('ramMB');
    return L;
  }
  function planOf(mode) {
    var hasWG = !!navigator.gpu;
    return { full: ['cs', 'cm', 'gpu'].concat(hasWG ? ['compute'] : []).concat(['ram']), cpu: ['cs', 'cm'], gpu: ['gpu'].concat(hasWG ? ['compute'] : []), ram: ['ram'], stress: ['stress'] }[mode];
  }
  function durOf(p, L) { return { cs: L.cpu, cm: L.cpu, gpu: L.gpu, compute: L.compute, ram: L.ram + 2, stress: L.stress }[p]; }
  function fmtDur(s) { return s >= 90 ? t('min', { n: Math.round(s / 60 * 10) / 10 }) : t('sec', { n: Math.round(s) }); }

  function updControls() {
    var L = level();
    u.$$('.lvl').forEach(function (b) { b.classList.toggle('on', b.dataset.l === S.level); });
    u.$$('.mode').forEach(function (b) { b.classList.toggle('on', b.dataset.m === S.mode); });
    $('#est').textContent = t('estTime', { s: fmtDur(u.sum(planOf(S.mode).map(function (p) { return durOf(p, L); }))), lvl: t('lv_' + S.level) });
    $('#modeDesc').textContent = t('md_' + S.mode);
    var x = S.level === 'extreme' || S.mode === 'stress';
    $('#startBtn').classList.toggle('x', x);
    $('#startBtn').textContent = S.mode === 'stress' ? t('startStress') : S.level === 'extreme' ? t('startX') : t('start');
    $('#warnX').hidden = !x;
    quick();
  }
  /* quick option buttons under the modes (scene / resolution / duration) */
  function quick() {
    var st = DOT.settings.all();
    var seg = function (key, opts) { return '<div class="seg sm">' + opts.map(function (o) { return '<button class="' + (String(st[key]) === String(o[0]) ? 'on' : '') + '" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
    $('#quick').innerHTML =
      '<div class="q"><span class="mu">🎨 ' + t('set_scene') + '</span>' + seg('scene', [['mandelbulb', t('sc_mandelbulb')], ['menger', t('sc_menger')]]) + '</div>' +
      '<div class="q"><span class="mu">🖼️ ' + t('set_res') + '</span>' + seg('resMul', [[0.5, '50%'], [1, '100%'], [1.5, '150%'], [2, '200%']]) + '</div>' +
      '<div class="q"><span class="mu">⏱️ ' + t('set_dur') + '</span>' + seg('durMul', [[0.5, '×0.5'], [1, '×1'], [2, '×2'], [3, '×3']]) + '</div>' +
      '<button class="link-btn" id="moreSet">⚙️ ' + t('moreSettings') + '</button>';
  }
  $('#quick').addEventListener('click', function (e) {
    if (e.target.id === 'moreSet') return DOT.settings.open();
    var b = e.target.closest('button[data-k]'); if (!b || S.running) return;
    var cur = DOT.settings.get(b.dataset.k); DOT.settings.set(b.dataset.k, typeof cur === 'number' ? parseFloat(b.dataset.v) : b.dataset.v);
  });
  document.addEventListener('dot:settings', function () { updControls(); });
  $('#levels').addEventListener('click', function (e) { var b = e.target.closest('.lvl'); if (!b || S.running) return; S.level = b.dataset.l; u.store.set('level', S.level); updControls(); });
  $('#modes').addEventListener('click', function (e) { var b = e.target.closest('.mode'); if (!b || S.running) return; S.mode = b.dataset.m; u.store.set('mode', S.mode); updControls(); });

  /* ---------- live UI helpers ---------- */
  var sparkVals = [];
  function view(which) { $('#cpuview').classList.toggle('show', which === 'panel'); $('#hud').style.display = which === 'panel' ? 'none' : 'flex'; }
  function setPhase(txt) { $('#phase').textContent = txt; }
  function setSteps(plan, cur) {
    $('#steps').innerHTML = plan.map(function (p, i) {
      var key = { cs: 'st_cs', cm: 'st_cm', gpu: 'st_gpu', compute: 'st_compute', ram: 'st_ram', stress: 'st_stress' }[p];
      return '<span class="step ' + (i < cur ? 'ok' : i === cur ? 'act' : '') + '">' + (i < cur ? '✓ ' : '') + t(key) + '</span>';
    }).join('');
  }
  function buildBars(n, labelFn) {
    $('#threads').innerHTML = Array.apply(null, Array(n)).map(function (_, i) {
      return '<div class="th"><div class="n"><span class="en">' + labelFn(i) + '</span><span class="en" id="tr' + i + '">0</span></div><div class="b"><i id="tb' + i + '"></i></div></div>';
    }).join('');
  }
  function setBars(vals, fmtFn) {
    var mx = Math.max.apply(null, vals.concat([1e-9]));
    vals.forEach(function (v, i) { var b = $('#tb' + i), tx = $('#tr' + i); if (b) b.style.width = (v / mx * 100) + '%'; if (tx) tx.textContent = fmtFn(v); });
  }
  function pushSpark(v, label, color) { sparkVals.push(v); if (sparkVals.length > 120) sparkVals.shift(); DOT.charts.spark($('#ft'), sparkVals, color, label); }
  function hud(tk, L) {
    $('#hudFps').textContent = tk.fps ? tk.fps.toFixed(tk.fps < 10 ? 1 : 0) : '--';
    $('#hudInfo').innerHTML = (tk.w ? tk.w + '×' + tk.h + ' px<br>' : '') + t('sc_' + DOT.gpu.scene()) + ' · Steps ' + L.iter + ' · Load ×' + (tk.K || 1) + '<br>' + (tk.phase === 1 ? 'Phase 1 · Real FPS' : 'Phase 2 · Max Throughput');
    if (tk.ft) DOT.charts.frameTimes($('#ft'), tk.ft, S.refresh);
  }

  /* ---------- run ---------- */
  function run() {
    if (S.running) return;
    var L = level(), plan = planOf(S.mode), info = S.info || { cores: navigator.hardwareConcurrency || 4 };
    var resMul = DOT.settings.get('resMul') || 1, scene = DOT.gpu.scene(), thrSet = DOT.settings.get('threads');
    var ctl = S.ctl = { abort: false, kill: null };
    var res = { level: S.level, mode: S.mode, date: Date.now(), refresh: S.refresh, scene: scene, durMul: DOT.settings.get('durMul') };
    S.running = true; $('#startBtn').disabled = true; DOT.hero3d.pause(true);
    $('#results').classList.remove('show'); $('#imgPrev').hidden = true; $('#live').classList.add('show');
    $('#stressLive').hidden = S.mode !== 'stress';
    $('#liveTitle').textContent = t('testing', { lvl: t('lv_' + S.level) });
    $('#hudWm').textContent = 'DOTest · Ahmed Al-Zahrani' + (u.siteHost() ? ' · ' + u.siteHost() : '');
    $('#live').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPhase(t('ph_prep'));

    var wl = null;
    if (DOT.settings.get('wakeLock')) try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wl = w; }).catch(function () { }); } catch (e) { }

    var durs = plan.map(function (p) { return durOf(p, L); }), total = u.sum(durs), doneS = 0, curDur = 0, phaseStart = 0, autoProg = false;
    function setP(frac) { var v = Math.min(100, (doneS + frac * curDur) / total * 100); $('#pbar').style.width = v + '%'; $('#pct').textContent = Math.floor(v) + '%'; }
    var tick = setInterval(function () { if (autoProg) setP(Math.min(1, (performance.now() - phaseStart) / 1000 / curDur)); }, 200);
    var i = 0;

    function next() {
      if (ctl.abort) return Promise.reject('abort');
      if (i >= plan.length) return Promise.resolve();
      var p = plan[i]; setSteps(plan, i); curDur = durs[i]; phaseStart = performance.now(); sparkVals = []; autoProg = false;
      var job;
      if (p === 'cs' || p === 'cm') {
        var n = p === 'cs' ? 1 : Math.min(256, Math.max(1, thrSet || info.cores || 4));
        view('panel'); autoProg = true;
        setPhase(p === 'cs' ? t('ph_cs') : t('ph_cm', { n: n }));
        $('#cpuLbl').textContent = p === 'cs' ? t('cpuLiveS') : t('cpuLiveM');
        $('#cpuUnit').textContent = t('cpuUnit'); $('#cpuThreads').textContent = n + ' thread' + (n > 1 ? 's' : '');
        buildBars(n, function (k) { return 'Thread ' + (k + 1); });
        var rates = new Array(n).fill(0), lastSp = 0;
        job = DOT.cpu.run(n, L.cpu, function (k, r) {
          rates[k] = r; var sc = DOT.cpu.score(u.sum(rates));
          $('#cpuLive').textContent = u.fmt(sc); setBars(rates, function (v) { return u.fmt(DOT.cpu.score(v)); });
          var now = performance.now(); if (now - lastSp > 250) { lastSp = now; pushSpark(sc, 'CPU score', '#a855f7'); }
        }, ctl).then(function (r) {
          var o = { score: DOT.cpu.score(r.total), rate: r.total, cats: r.cats, threads: r.threads, perThread: r.perThread };
          if (p === 'cs') res.cpuS = o; else { res.cpuM = o; if (r.fallback) u.toast(t('err_workers')); }
        });
      } else if (p === 'gpu') {
        view('canvas'); setPhase(t('ph_gpu1'));
        job = DOT.gpu.render({ L: L, dur: L.gpu, fixedFrac: 0.45, refresh: S.refresh, ctl: ctl, scene: scene, resMul: resMul, onTick: function (tk) {
          hud(tk, L); setP(tk.frac); setPhase(tk.phase === 1 ? t('ph_gpu1') : t('ph_gpu2'));
        } }).then(function (g) { res.gpu = g; });
      } else if (p === 'compute') {
        view('panel'); autoProg = true; setPhase(t('ph_compute'));
        $('#cpuLbl').textContent = 'WebGPU Compute'; $('#cpuUnit').textContent = 'GFLOPS'; $('#cpuThreads').textContent = 'FP32 FMA';
        $('#threads').innerHTML = ''; $('#cpuLive').textContent = '…';
        job = DOT.gpu.compute(L.compute, ctl, function (pr) { $('#cpuLive').textContent = u.fmt(pr.gflops); pushSpark(pr.gflops, 'GFLOPS', '#ffc93c'); })
          .then(function (c) { if (res.gpu) res.gpu.compute = c; });
      } else if (p === 'ram') {
        view('panel');
        var mb = DOT.ram.targetMB(L.ramMB, info);
        setPhase(t('ph_ram_bw', { mb: u.MB(mb * 1048576) }));
        $('#cpuLbl').textContent = t('ramLive'); $('#cpuUnit').textContent = t('ramUnit'); $('#cpuThreads').textContent = '';
        $('#threads').innerHTML = ''; $('#cpuLive').textContent = '0';
        var lastR = 0;
        job = DOT.ram.run(L, info, function (pr) {
          setP(pr.frac);
          if (pr.phase === 'lat') { setPhase(t('ph_ram_lat')); return; }
          $('#cpuLive').textContent = (pr.bw || 0).toFixed(1) + ' GB/s';
          $('#cpuThreads').textContent = u.MB(pr.allocMB * 1048576);
          var now = performance.now(); if (pr.bw && now - lastR > 250) { lastR = now; pushSpark(pr.bw, 'RAM GB/s', '#22e58a'); }
        }, ctl).then(function (m) { res.ram = m; });
      } else if (p === 'stress') {
        view('canvas'); setPhase(t('ph_stress'));
        job = DOT.stress.run({ L: L, info: Object.assign({}, info, thrSet ? { cores: thrSet } : {}), refresh: S.refresh, ctl: ctl, scene: scene, resMul: resMul,
          onTick: function (tk) { hud(tk, L); setP(tk.frac); },
          onSample: function (s) {
            $('#slCpu').textContent = u.fmt(s.cpu); $('#slGpu').textContent = s.fps ? u.fmt(s.fps, 0) + ' FPS' : '—';
            $('#slRam').textContent = s.ram.toFixed(1); $('#slTime').textContent = Math.round(s.t) + ' / ' + L.stress + 's';
          }
        }).then(function (st) { res.stress = st; });
      }
      return job.catch(function (e) {
        if (e === 'abort' || ctl.abort) throw 'abort';
        console.error(e);
        var msg = errMsg(e); (res.errors = res.errors || []).push(msg); u.toast(msg);
      }).then(function () { doneS += durs[i]; i++; setP(0); return next(); });
    }

    function finish() {
      clearInterval(tick); autoProg = false;
      try { wl && wl.release(); } catch (e) { }
      S.running = false; $('#startBtn').disabled = false; S.ctl = null;
      DOT.pool.killAll(); route();
    }

    u.sleep(300).then(next).then(function () {
      setSteps(plan, plan.length); setPhase(t('ph_done')); finish(); u.notify();
      setTimeout(function () { $('#live').classList.remove('show'); showResults(res); }, 450);
    }).catch(function (e) {
      finish();
      if (e === 'abort' || ctl.abort) { $('#live').classList.remove('show'); u.toast(S.leftPage ? t('leftPage') : t('stopped')); S.leftPage = false; return; }
      console.error(e); var msg = errMsg(e); setPhase('⚠️ ' + msg); u.toast(msg);
      if (res.cpuS || res.cpuM || res.gpu || res.ram) setTimeout(function () { $('#live').classList.remove('show'); showResults(res); }, 1800);
    });
  }
  function errMsg(e) { return e && e.message === 'nogl' ? t('err_nogl') : e && e.message === 'ctxlost' ? t('err_ctxlost') : t('err_generic') + (e && e.message ? ': ' + e.message : ''); }

  function showResults(res) {
    res.total = DOT.render.total(res); S.last = res;
    DOT.render.results(res, S.info || {}, true);
    var h = u.store.get('hist', []);
    h.unshift({ d: res.date, l: res.level, m: res.mode, sc: res.gpu || res.stress ? res.scene : null, t: Math.round(res.total), f: res.gpu ? +res.gpu.avg.toFixed(1) : (res.stress && !res.stress.gpuFailed ? +res.stress.fps.avg.toFixed(1) : 0), rb: res.ram ? +res.ram.bw.toFixed(1) : 0, st: res.stress ? Math.round(res.stress.stability) : 0 });
    u.store.set('hist', h.slice(0, cfg.historyMax));
    DOT.render.history();
    setTimeout(function () { $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
  }

  function stop(left) { if (!S.ctl) return; S.leftPage = !!left; S.ctl.abort = true; if (S.ctl.kill) S.ctl.kill(); DOT.pool.killAll(); }

  $('#startBtn').onclick = run;
  $('#againBtn').onclick = function () { $('#controls').scrollIntoView({ behavior: 'smooth' }); setTimeout(run, 450); };
  $('#stopBtn').onclick = function () { stop(false); };
  document.addEventListener('visibilitychange', function () { if (document.hidden && S.running) stop(true); });
  $('#fsBtn').onclick = function () {
    var st = $('#stage');
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { var p = (st.requestFullscreen || st.webkitRequestFullscreen).call(st); p && p.catch && p.catch(function () { u.toast(t('fsFail')); }); }
    } catch (e) { u.toast(t('fsFail')); }
  };

  /* ---------- result actions ---------- */
  function copyText(txt) {
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); u.toast(t('copied')); } catch (e) { u.toast(t('copyFail')); } ta.remove();
    };
    try { navigator.clipboard.writeText(txt).then(function () { u.toast(t('copied')); }, fallback); } catch (e) { fallback(); }
  }
  $('#copyBtn').onclick = function () { copyText(DOT.render.summary(S.last, S.info || {})); };
  $('#imgBtn').onclick = function () {
    if (!S.last) return;
    try {
      var url = DOT.render.image(S.last, S.info || {});
      $('#imgOut').src = url; $('#imgPrev').hidden = false;      // preview (long-press / right-click to save on any device)
      if (u.download('DOTest-' + S.last.level + '-' + Math.round(S.last.total) + '.png', url)) u.toast(t('imgSaved'));
      setTimeout(function () { $('#imgPrev').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    } catch (e) { console.error(e); u.toast(t('err_generic')); }
  };
  $('#jsonBtn').onclick = function () {
    if (!S.last) return;
    var I = S.info || {}, data = { app: 'DOTest ' + cfg.version, author: cfg.author, site: u.siteURL(), device: { name: DOT.render.deviceName(I), type: I.type, os: I.os, osVersion: I.osv, browser: I.browser, browserVersion: I.browserV, chip: I.chip, cores: I.cores, ramGB: I.mem, gpu: I.gpuName, gpuVendor: I.gpuVendor, refreshHz: I.hz, resolution: I.physW + 'x' + I.physH }, hardwareAgent: DOT.agent.summary(), result: S.last };
    if (u.download('DOTest-report-' + S.last.date + '.json', JSON.stringify(data, function (k, v) { return k === 'series' || k === 'ft' ? undefined : v; }, 2), 'application/json')) u.toast(t('saved'));
  };
  $('#clearHist').onclick = function () { u.store.set('hist', []); DOT.render.history(); };
  $('#exportHist').onclick = function () {
    var h = u.store.get('hist', []); if (!h.length) return u.toast(t('histEmpty'));
    var head = ['date', 'level', 'mode', 'scene', 'score', 'fps', 'ramBW', 'stability'];
    var rows = h.map(function (x) { return [new Date(x.d).toISOString(), x.l, x.m, x.sc || '', x.t, x.f || '', x.rb || '', x.st || ''].join(','); });
    u.download('DOTest-history-' + Date.now() + '.csv', head.join(',') + '\n' + rows.join('\n'), 'text/csv');
    u.toast(t('saved'));
  };
  $('#agentSample').onclick = function () { fetch('agent/sample-report.json').then(function (r) { return r.text(); }).then(DOT.agent.load).catch(function () { u.toast(t('ag_bad')); }); };
  document.addEventListener('dot:agent', function () { if (S.info) DOT.render.device(S.info); });

  /* ---------- about ---------- */
  function about() {
    $('#featList').innerHTML = ['ft1', 'ft2', 'ft3', 'ft4', 'ft5', 'ft6', 'ft7', 'ft8', 'ft9', 'ft10'].map(function (k) { return '<li>' + t(k) + '</li>'; }).join('');
    var s = u.siteURL(); $('#siteLink').textContent = s || '—'; $('#siteLink').href = s || '#';
    $('#footHost').textContent = u.siteHost();
  }

  /* ---------- init ---------- */
  $('#yr').textContent = new Date().getFullYear();
  $('#ver').textContent = 'v' + cfg.version; $('#ver2').textContent = 'v' + cfg.version;
  DOT.settings.bind(); DOT.settings.apply();
  DOT.tools.bind(); DOT.agent.bind(); DOT.netUI.bind();
  setLang(u.store.get('lang', cfg.defaultLang));
  DOT.hero3d.init();
  route();
  DOT.detect.collect().then(function (I) {
    S.info = I; S.refresh = I.hz || 60; DOT.render.device(I);
  }).catch(function (e) {
    console.error(e); $('#devName').textContent = '—'; $('#devSub').textContent = t('err_generic');
  });
  setTimeout(function () { DOT.gpu.preview(); }, 300);
})();
