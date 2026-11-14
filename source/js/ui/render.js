/* =========================================================
   DOTest — UI rendering (device info, results, history)
   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.render = (function () {
  var u = DOT.u, t = function (k, v) { return DOT.t(k, v); }, cfg = DOT.config;

  /* Value → localized text */
  function val(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'object' && v.k) return t(v.k, v.a ? { n: v.a[0], os: v.a[0] } : null);
    return String(v);
  }
  function deviceName(I) { return I.name || t('pcName', { os: I.os || '' }); }

  /* ---------- Device / specs ---------- */
  function device(I) {
    var A = DOT.agent && DOT.agent.summary();
    u.$('#exactLink').hidden = !!A || I.isMobile; u.$('#specsCta').hidden = !!A || I.isMobile;
    if (A) I = Object.assign({}, I, { chip: A.cpu || I.chip, chipEst: false, cores: A.threads || I.cores, memExact: A.ramBytes, gpuName: A.gpu || I.gpuName, name: (!I.isMobile && A.model) ? A.model : I.name });
    u.$('#devName').textContent = deviceName(I);
    u.$('#devSub').textContent = [t(I.type), I.os ? I.os + (I.osv ? ' ' + I.osv : '') : null, I.browser ? I.browser + (I.browserV ? ' ' + I.browserV.split('.')[0] : '') : null].filter(Boolean).join(' · ');
    var chips = [
      ['cpu', I.chip ? I.chip : null],
      ['cores', I.cores ? t('chipCores', { n: I.cores }) : null],
      ['ram', I.memExact ? u.GB(I.memExact) + ' RAM' : I.mem ? (I.mem >= 8 && !I.isMobile ? '8GB+ RAM' : I.mem + 'GB RAM') : null],
      ['gpu', I.gpuName || null],
      ['screen', I.physW + '×' + I.physH],
      ['refresh', I.hz + 'Hz']
    ].filter(function (c) { return c[1]; });
    u.$('#chips').innerHTML = chips.map(function (c) { return '<div class="chip">' + DOT.icon(c[0], 16) + '<b class="ltr">' + u.esc(c[1]) + '</b></div>'; }).join('');
    var groups = I.groups;
    if (A) groups = groups.map(function (g) {
      return Object.assign({}, g, { rows: g.rows.map(function (r) {
        if (r.k === 'r_chip' && A.cpu) return { k: r.k, v: A.cpu, ag: true };
        if (r.k === 'r_threads' && A.threads) return { k: r.k, v: (A.cores ? A.cores + ' Cores / ' : '') + A.threads + ' Threads', ag: true };
        if (r.k === 'r_ram' && A.ramBytes) return { k: r.k, v: u.GB(A.ramBytes), ag: true };
        if (r.k === 'r_gpu' && A.gpu) return { k: r.k, v: A.gpu + (A.vram ? ' · ' + u.GB(A.vram) + ' VRAM' : ''), ag: true };
        if (r.k === 'r_name' && A.model && !I.isMobile) return { k: r.k, v: A.model, ag: true };
        return r;
      }) });
    });
    u.$('#info').innerHTML = groups.map(function (g) {
      return '<div class="card ig"><h4><span class="ic">' + DOT.icon(g.ic) + '</span>' + t(g.t) + '</h4>' + g.rows.map(function (r) {
        var v = val(r.v), na = v == null;
        var tag = !na && r.ag ? '<span class="tag ok">' + t('ag_tag') + '</span>' : !na && r.est ? '<span class="tag">' + t('estimated') + '</span>' : !na && r.live ? '<span class="tag ok">' + t('measured') + '</span>' : '';
        return '<div class="row"><span class="k">' + t(r.k) + '</span><span class="v' + (na ? ' na' : '') + '"><bdi>' + (na ? t('NA') : u.esc(v)) + '</bdi>' + tag + '</span></div>';
      }).join('') + '</div>';
    }).join('');
  }

  /* ---------- Score helpers ---------- */
  function total(r) {
    var W = cfg.weights, parts = [];
    if (r.stress) {
      var s = r.stress;
      if (s.cpu.avg > 0) parts.push([s.cpu.avg, W.cpuM]);
      if (!s.gpuFailed && s.gpu.avg > 0) parts.push([s.gpu.avg, W.gpu]);
      if (s.ram.avg > 0) parts.push([DOT.ram.score(s.ram.avg, cfg.score.ramLatRef), W.ram]);
    } else {
      if (r.cpuS) parts.push([r.cpuS.score, W.cpuS]);
      if (r.cpuM) parts.push([r.cpuM.score, W.cpuM]);
      if (r.gpu) parts.push([r.gpu.score, W.gpu]);
      if (r.ram) parts.push([r.ram.score, W.ram]);
    }
    parts = parts.filter(function (p) { return p[0] > 0; });
    if (!parts.length) return 0;
    var ws = u.sum(parts.map(function (p) { return p[1]; }));
    return Math.exp(u.sum(parts.map(function (p) { return p[1] * Math.log(p[0]); })) / ws);
  }
  function tier(score) { for (var i = 0; i < cfg.tiers.length; i++) if (score < cfg.tiers[i][0]) return cfg.tiers[i]; return cfg.tiers[cfg.tiers.length - 1]; }
  function countUp(el, to, ms, dec) {
    var t0 = performance.now(); ms = ms || 1400;
    (function f(now) { var k = Math.min(1, (now - t0) / ms); el.textContent = u.fmt(to * (1 - Math.pow(1 - k, 3)), dec); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function fg(label, value, color) { return '<div class="fg"><div class="v en"' + (color ? ' style="color:' + color + '"' : '') + '>' + value + '</div><div class="l">' + label + '</div></div>'; }
  function verdict(p) { return p >= 90 ? ['sv_excellent', '#22e58a'] : p >= 75 ? ['sv_good', '#00e5ff'] : ['sv_bad', '#ff4d5e']; }

  /* ---------- Results ---------- */
  var subIc = { sub_cpuS: 'cpu', sub_cpuM: 'cores', sub_gpu: 'gpu', sub_ram: 'ram' };
  function results(r, I, animate) {
    var tot = r.total, T = tier(tot), lvlName = t('lv_' + r.level);
    u.$('#results').classList.add('show');
    var sc = u.$('#totScore'); animate ? countUp(sc, tot) : (sc.textContent = u.fmt(tot));
    var ring = u.$('#ringC');
    ring.setAttribute('stroke', r.level === 'extreme' || r.mode === 'stress' ? 'url(#rg2)' : 'url(#rg1)');
    ring.style.strokeDashoffset = 540.35;
    requestAnimationFrame(function () { requestAnimationFrame(function () { ring.style.strokeDashoffset = 540.35 * (1 - Math.min(1, tot / cfg.score.ringMax)); }); });
    var te = u.$('#tier'); te.textContent = t('tierLabel', { t: t(T[1]) }); te.style.background = T[2] + '22'; te.style.color = T[2]; te.style.border = '1px solid ' + T[2] + '66';
    u.$('#resMeta').innerHTML = u.esc(I ? deviceName(I) : '') + '<br>' + t('mode_' + r.mode) + ' · ' + lvlName + ' · <span class="ltr">' + new Date(r.date).toLocaleString(DOT.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US') + '</span>';

    // compare with your best previous run of the same level & mode
    var hist = u.store.get('hist', []).filter(function (x) { return x.l === r.level && x.m === r.mode && x.d !== r.date; });
    var best = hist.reduce(function (m, x) { return Math.max(m, x.t); }, 0);
    u.$('#cmp').innerHTML = best ? (tot >= best ? t('cmp_best') : t('cmp_vs', { p: ((tot / best - 1) * 100).toFixed(0) })) : '';

    // advice
    var adv = DOT.advice(r, I, DOT.netUI && DOT.netUI.last());
    u.$('#advPanel').style.display = adv.length ? '' : 'none';
    u.$('#adv').innerHTML = adv.map(function (a) { return '<div class="ad ' + a.lvl + '"><span class="ad-ic">' + DOT.icon(a.lvl) + '</span><span>' + u.esc(t(a.key, a.vars)) + '</span></div>'; }).join('');

    // sub cards
    var subs = [];
    function sub(key, score, max, desc, grad) {
      subs.push('<div class="card sub"><div class="h">' + DOT.icon(subIc[key] || 'cpu') + t(key) + '</div><div class="v en">' + (score ? u.fmt(score) : '—') + '</div><div class="d">' + (score ? desc : t('notTested')) + '</div><div class="bar"><i data-w="' + (score ? Math.min(100, score / max * 100) : 0) + '" style="background:' + grad + '"></i></div></div>');
    }
    if (r.stress) {
      var s = r.stress;
      sub('sub_cpuM', s.cpu.avg, 120000, t('d_cpuM', { n: s.cores, x: '—' }).split('·')[0], 'linear-gradient(90deg,#a855f7,#00e5ff)');
      sub('sub_gpu', s.gpuFailed ? 0 : s.gpu.avg, 60000, u.fmt(s.fps.avg, 1) + ' FPS', 'linear-gradient(90deg,#ff3d81,#ffc93c)');
      sub('sub_ram', s.ram.avg ? DOT.ram.score(s.ram.avg, cfg.score.ramLatRef) : 0, 20000, u.fmt(s.ram.avg, 1) + ' GB/s', 'linear-gradient(90deg,#22e58a,#00e5ff)');
      var V = verdict(s.stability);
      subs.push('<div class="card sub"><div class="h">' + DOT.icon('activity') + t('sx_stab') + '</div><div class="v en" style="color:' + V[1] + '">' + u.fmt(s.stability) + '%</div><div class="d">' + t(V[0]) + ' · ' + t('sx_throttle') + ' ' + u.fmt(s.throttle) + '%</div><div class="bar"><i data-w="' + s.stability + '" style="background:' + V[1] + '"></i></div></div>');
    } else {
      sub('sub_cpuS', r.cpuS && r.cpuS.score, 12000, t('d_cpuS'), 'linear-gradient(90deg,#00e5ff,#22e58a)');
      sub('sub_cpuM', r.cpuM && r.cpuM.score, 120000, r.cpuM ? t('d_cpuM', { n: r.cpuM.threads, x: r.cpuS ? (r.cpuM.score / r.cpuS.score).toFixed(1) : '—' }) : '', 'linear-gradient(90deg,#a855f7,#00e5ff)');
      sub('sub_gpu', r.gpu && r.gpu.score, 60000, r.gpu ? t('d_gpu_fps', { avg: u.fmt(r.gpu.avg, 1), min: u.fmt(r.gpu.min, 1), max: u.fmt(r.gpu.max, 1) }) : '', 'linear-gradient(90deg,#ff3d81,#ffc93c)');
      sub('sub_ram', r.ram && r.ram.score, 20000, r.ram ? t('d_ram', { bw: r.ram.bw.toFixed(1), lat: r.ram.lat.toFixed(0) }) : '', 'linear-gradient(90deg,#22e58a,#00e5ff)');
    }
    u.$('#subs').innerHTML = subs.join('');
    setTimeout(function () { u.$$('#subs .bar i').forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); }, 80);

    // CPU categories
    var cats = r.cpuS && r.cpuS.cats;
    u.$('#cpuPanel').style.display = cats ? '' : 'none';
    if (cats) {
      var mx = Math.max.apply(null, DOT.kernels.list.map(function (k) { return cats[k] || 0; }).concat([1]));
      u.$('#cats').innerHTML = DOT.kernels.list.map(function (k) {
        return '<div class="cat"><div class="l"><span>' + t('cat_' + k) + '</span></div><div class="v en">' + u.fmt(cats[k]) + '</div><div class="bar"><i style="width:' + ((cats[k] || 0) / mx * 100) + '%;background:linear-gradient(90deg,#00e5ff,#a855f7)"></i></div></div>';
      }).join('');
    }

    // GPU
    var g = r.gpu;
    u.$('#fpsPanel').style.display = g ? '' : 'none';
    if (g) {
      var comp = g.compute ? (g.compute.best >= 1000 ? (g.compute.best / 1000).toFixed(2) + ' TFLOPS' : u.fmt(g.compute.best) + ' GFLOPS') : '—';
      u.$('#fpsgrid').innerHTML = fg(t('f_avg'), u.fmt(g.avg, 1), '#00e5ff') + fg(t('f_max'), u.fmt(g.max)) + fg(t('f_min'), u.fmt(g.min, 1)) + fg(t('f_low'), u.fmt(g.low, 1)) +
        fg(t('f_stab'), u.fmt(g.stab) + '%') + fg(t('f_tflops'), '<span style="font-size:15px">' + comp + '</span>', '#ffc93c') + fg(t('f_res'), '<span style="font-size:14px">' + g.w + '×' + g.h + '</span>') + fg(t('f_frames'), u.fmt(g.frames));
      u.$('#fpsNote').textContent = t('sc_' + (g.scene || 'mandelbulb')) + ' · ' + t('fpsNote', { hz: r.refresh || 60, k: Math.round(g.avgK) }) + (g.compute ? '' : ' · ' + t('noCompute'));
      setTimeout(function () {
        var sw = g.series.filter(function (p) { return p.p === 2; })[0];
        DOT.charts.lines(u.$('#fpschart'), [{ data: g.series.map(function (p) { return { t: p.t, v: p.f }; }), color: '#00e5ff', fill: true }], { yMax: Math.max((r.refresh || 60) * 1.1, Math.max.apply(null, g.series.map(function (p) { return p.f; }))), yLabel: 'FPS', shadeFrom: sw ? sw.t : null, shadeLabel: t('maxLoad') });
      }, 60);
    }

    // RAM
    var m = r.ram;
    u.$('#ramPanel').style.display = m ? '' : 'none';
    if (m) {
      u.$('#ramgrid').innerHTML = fg(t('rr_alloc'), u.MB(m.allocMB * 1048576), '#22e58a') + fg(t('rr_write'), m.write.toFixed(1) + ' GB/s') + fg(t('rr_read'), m.read.toFixed(1) + ' GB/s') +
        fg(t('rr_copy'), m.copy.toFixed(1) + ' GB/s') + fg(t('rr_bw'), m.bw.toFixed(1) + ' GB/s', '#00e5ff') + fg(t('rr_lat'), m.lat.toFixed(1) + ' ns') + fg(t('rr_threads'), m.threads);
      u.$('#ramNote').textContent = t('ramNote') + (m.failed ? ' ' + t('ramFailed') : m.targetMB < cfg.levels[r.level].ramMB ? ' ' + t('ramCapped') : '');
    }

    // Stress
    var st = r.stress;
    u.$('#stressPanel').style.display = st ? '' : 'none';
    if (st) {
      var V2 = verdict(st.stability), thrC = st.throttle < 10 ? '#22e58a' : st.throttle < 25 ? '#ffc93c' : '#ff4d5e';
      u.$('#stressgrid').innerHTML = fg(t('sx_stab'), u.fmt(st.stability) + '%', V2[1]) + fg(t('sx_throttle'), u.fmt(st.throttle) + '%', thrC) + fg(t('sx_cpu'), u.fmt(st.cpu.avg)) +
        fg(t('sx_gpu'), st.gpuFailed ? '—' : u.fmt(st.gpu.avg)) + fg(t('sx_fps'), st.gpuFailed ? '—' : u.fmt(st.fps.avg, 1)) + fg(t('sx_ram'), st.ram.avg.toFixed(1) + ' GB/s') + fg(t('sx_dur'), st.dur + 's');
      u.$('#stressNote').textContent = t('stressNote');
      var norm = function (arr) { var mx = Math.max.apply(null, arr.map(function (p) { return p.v; }).concat([1e-9])); return arr.map(function (p) { return { t: p.t, v: p.v / mx * 100 }; }); };
      var lines = [{ data: norm(st.series.cpu), color: '#a855f7', k: 'lg_cpu' }];
      if (!st.gpuFailed) lines.push({ data: norm(st.series.gpu), color: '#ff3d81', k: 'lg_gpu' });
      lines.push({ data: norm(st.series.ram), color: '#22e58a', k: 'lg_ram' });
      u.$('#stressLegend').innerHTML = lines.map(function (l) { return '<span><i style="background:' + l.color + '"></i>' + t(l.k) + '</span>'; }).join('');
      setTimeout(function () { DOT.charts.lines(u.$('#stresschart'), lines, { yMax: 110, percent: true, yLabel: '%' }); }, 60);
    }
  }

  /* ---------- History ---------- */
  function history() {
    var h = u.store.get('hist', []);
    var bestBy = {};
    h.forEach(function (x) { var k = x.m; if (!bestBy[k] || x.t > bestBy[k].t) bestBy[k] = x; });
    u.$('#best').innerHTML = Object.keys(bestBy).length ? Object.keys(bestBy).map(function (k) {
      var x = bestBy[k]; return '<div class="fg"><div class="v en">' + u.fmt(x.t) + '</div><div class="l">' + t('mode_' + k) + ' · ' + t('lv_' + x.l) + '</div></div>';
    }).join('') : '<div class="empty">' + t('histEmpty') + '</div>';
    if (!h.length) { u.$('#hist').innerHTML = '<div class="empty">' + t('histEmpty') + '</div>'; u.$('#histChart').style.display = 'none'; return; }
    u.$('#hist').innerHTML = h.map(function (x) {
      var extra = [x.f ? x.f + ' FPS' : '', x.rb ? x.rb + ' GB/s' : '', x.st ? x.st + '%' : ''].filter(Boolean).join(' · ');
      return '<div class="hi"><div><b>' + t('lv_' + x.l) + '</b> · ' + t('mode_' + x.m) + (x.sc ? ' · ' + t('sc_' + x.sc) : '') + '<div class="mu"><span class="ltr">' + new Date(x.d).toLocaleString(DOT.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US') + '</span>' + (extra ? ' · <span class="ltr">' + extra + '</span>' : '') + '</div></div><div class="s en">' + u.fmt(x.t) + '</div></div>';
    }).join('');
    var c = u.$('#histChart');
    if (h.length > 1 && c.offsetParent !== null) { c.style.display = ''; var pts = h.slice().reverse().map(function (x, i) { return { t: i + 1, v: x.t }; }); DOT.charts.lines(c, [{ data: pts, color: '#00e5ff', fill: true }], { yLabel: 'Score' }); }
    else c.style.display = h.length > 1 ? '' : 'none';
  }

  /* ---------- Shareable text ---------- */
  function summary(r, I) {
    if (!r) return '';
    var L = [];
    L.push('DOTest — ' + t('shareTitle'));
    L.push('');
    L.push(t('sh_device') + ': ' + deviceName(I));
    if (I.chip) L.push(t('sh_cpu') + ': ' + I.chip + (I.cores ? ' (' + t('chipCores', { n: I.cores }) + ')' : ''));
    if (I.gpuName) L.push(t('sh_gpu') + ': ' + I.gpuName);
    L.push(t('sh_level') + ': ' + t('lv_' + r.level) + ' / ' + t('mode_' + r.mode));
    L.push('');
    L.push(t('sh_total') + ': ' + u.fmt(r.total) + '  (' + t(tier(r.total)[1]) + ')');
    if (r.cpuS) L.push(t('st_cs') + ': ' + u.fmt(r.cpuS.score));
    if (r.cpuM) L.push(t('st_cm') + ': ' + u.fmt(r.cpuM.score));
    if (r.gpu) L.push(t('sub_gpu') + ': ' + u.fmt(r.gpu.score) + ' / ' + u.fmt(r.gpu.avg, 1) + ' FPS (min ' + u.fmt(r.gpu.min, 1) + ', max ' + u.fmt(r.gpu.max, 1) + ', 1% low ' + u.fmt(r.gpu.low, 1) + ')' + (r.gpu.compute ? ' / ' + u.fmt(r.gpu.compute.best) + ' GFLOPS' : ''));
    if (r.ram) L.push('RAM: ' + u.fmt(r.ram.score) + ' / ' + r.ram.bw.toFixed(1) + ' GB/s, ' + r.ram.lat.toFixed(0) + ' ns');
    if (r.stress) L.push(t('sx_stab') + ': ' + u.fmt(r.stress.stability) + '% / ' + t('sx_throttle') + ': ' + u.fmt(r.stress.throttle) + '%');
    L.push('');
    L.push('\u00A9 Ahmed Al-Zahrani' + (u.siteURL() ? '  |  ' + u.siteURL() : ''));
    return L.join('\n');
  }

  /* ---------- Result image (PNG card) ---------- */
  function image(r, I) {
    var W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), rtl = DOT.lang === 'ar', A0 = DOT.agent && DOT.agent.summary();
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b0e24'); g.addColorStop(1, '#05060d'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var rg = x.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 700); rg.addColorStop(0, 'rgba(0,229,255,.22)'); rg.addColorStop(1, 'rgba(0,229,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
    var gr = x.createLinearGradient(0, 0, 200, 200); gr.addColorStop(0, '#00e5ff'); gr.addColorStop(1, '#a855f7');
    // logo
    x.save(); x.translate(70, 60); x.scale(1.6, 1.6); x.strokeStyle = gr; x.lineWidth = 3.5; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(32, 4); x.lineTo(56, 18); x.lineTo(56, 46); x.lineTo(32, 60); x.lineTo(8, 46); x.lineTo(8, 18); x.closePath(); x.stroke();
    x.lineWidth = 4.5; x.beginPath(); x.moveTo(23, 19.5); x.lineTo(31, 19.5); x.arc(31, 32, 12.5, -Math.PI / 2, Math.PI / 2); x.lineTo(23, 44.5); x.closePath(); x.stroke();
    x.fillStyle = '#00e5ff'; x.beginPath(); x.arc(31, 32, 4.2, 0, Math.PI * 2); x.fill(); x.restore();
    x.fillStyle = '#e9edff'; x.font = '900 54px Orbitron, sans-serif'; x.textAlign = 'left'; x.direction = 'ltr'; x.fillText('DOTest', 190, 135);
    x.fillStyle = '#8f97bd'; x.font = '500 26px Tajawal, sans-serif'; x.fillText('CPU · GPU · RAM Benchmark', 192, 175);
    x.textAlign = 'center'; x.direction = rtl ? 'rtl' : 'ltr';
    x.fillStyle = '#e9edff'; x.font = '800 44px Tajawal, sans-serif'; x.fillText(((A0 && !I.isMobile && A0.model) || deviceName(I)).slice(0, 40), W / 2, 300);
    var A = DOT.agent && DOT.agent.summary(); x.fillStyle = '#8f97bd'; x.font = '500 28px Tajawal, sans-serif'; x.fillText([(A && A.cpu) || I.chip, (A && A.gpu) || I.gpuName].filter(Boolean).join(' · ').slice(0, 64), W / 2, 350);
    // ring
    x.lineWidth = 26; x.strokeStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(W / 2, 600, 190, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = gr; x.lineCap = 'round'; x.beginPath(); x.arc(W / 2, 600, 190, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, r.total / cfg.score.ringMax)); x.stroke();
    x.fillStyle = '#ffffff'; x.font = '900 96px Orbitron, sans-serif'; x.direction = 'ltr'; x.fillText(u.fmt(r.total), W / 2, 625);
    x.fillStyle = '#8f97bd'; x.font = '500 26px Orbitron, sans-serif'; x.fillText('DOTest Score', W / 2, 675);
    var T = tier(r.total); x.direction = rtl ? 'rtl' : 'ltr'; x.fillStyle = T[2]; x.font = '900 40px Tajawal, sans-serif'; x.fillText(t('tierLabel', { t: t(T[1]) }), W / 2, 870);
    // rows
    var rows = [];
    if (r.cpuS) rows.push([t('st_cs'), u.fmt(r.cpuS.score)]);
    if (r.cpuM) rows.push([t('st_cm'), u.fmt(r.cpuM.score)]);
    if (r.gpu) rows.push([t('sub_gpu'), u.fmt(r.gpu.score) + '  ·  ' + u.fmt(r.gpu.avg, 1) + ' FPS']);
    if (r.ram) rows.push(['RAM', u.fmt(r.ram.score) + '  ·  ' + r.ram.bw.toFixed(1) + ' GB/s']);
    if (r.stress) rows.push([t('sx_stab'), u.fmt(r.stress.stability) + '%'], [t('sx_throttle'), u.fmt(r.stress.throttle) + '%']);
    rows.slice(0, 4).forEach(function (row, i) {
      var y = 950 + i * 78;
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(80, y - 48, W - 160, 64);
      x.font = '700 30px Tajawal, sans-serif'; x.fillStyle = '#8f97bd'; x.direction = rtl ? 'rtl' : 'ltr';
      x.textAlign = rtl ? 'right' : 'left'; x.fillText(row[0], rtl ? W - 110 : 110, y);
      x.textAlign = rtl ? 'left' : 'right'; x.direction = 'ltr'; x.fillStyle = '#00e5ff'; x.font = '900 30px Orbitron, sans-serif'; x.fillText(row[1], rtl ? 110 : W - 110, y);
    });
    // footer: level/date, site link, QR, rights
    var url = u.siteURL(), host = u.siteHost();
    x.textAlign = 'center'; x.direction = 'ltr'; x.fillStyle = '#8f97bd'; x.font = '600 24px Tajawal, sans-serif';
    var cx = url ? W / 2 - 80 : W / 2;
    x.fillText(t('lv_' + r.level) + ' · ' + t('mode_' + r.mode) + ' · ' + new Date(r.date).toLocaleDateString('en-GB'), cx, H - 120);
    if (host) { x.fillStyle = '#e9edff'; x.font = '800 28px Orbitron, sans-serif'; x.fillText(host.slice(0, 38), cx, H - 78); }
    x.fillStyle = gr; x.font = '900 28px Orbitron, sans-serif'; x.fillText('© Ahmed Al-Zahrani', cx, H - 36);
    if (url && window.qrcode) {
      try {
        var q = qrcode(0, 'M'); q.addData(url); q.make();
        var n = q.getModuleCount(), size = 150, cell = size / (n + 2), qx = W - 80 - size, qy = H - 30 - size;
        x.fillStyle = '#ffffff'; x.fillRect(qx, qy, size, size); x.fillStyle = '#05060d';
        for (var rr = 0; rr < n; rr++) for (var cc = 0; cc < n; cc++) if (q.isDark(rr, cc)) x.fillRect(qx + (cc + 1) * cell, qy + (rr + 1) * cell, Math.ceil(cell), Math.ceil(cell));
      } catch (e) { }
    }
    return c.toDataURL('image/png');
  }

  return { device: device, results: results, history: history, summary: summary, image: image, total: total, tier: tier, deviceName: deviceName };
})();
