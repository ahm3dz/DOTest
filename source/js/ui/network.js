/* =========================================================
   DOTest — Network tab UI (gauge, results, IP)   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.netUI = (function () {
  var u = DOT.u, $ = u.$, t = function (k, v) { return DOT.t(k, v); };
  var ctl = null, last = u.store.get('netLast', null), ipData = null;
  var MARKS = [0, 5, 10, 25, 50, 100, 250, 500, 1000];
  var A0 = 150, A1 = 390; // gauge sweep in degrees (SVG, 0° = right, clockwise)

  function unit() { return DOT.settings.get('netUnit') === 'mbs' ? 'MB/s' : 'Mbps'; }
  function sp(mbps) { if (mbps == null) return '—'; var v = DOT.settings.get('netUnit') === 'mbs' ? mbps / 8 : mbps; return v >= 100 ? v.toFixed(0) : v.toFixed(v >= 10 ? 1 : 2); }
  function frac(v) {
    v = Math.max(0, v || 0); if (v >= 1000) return 1;
    for (var i = 1; i < MARKS.length; i++) if (v <= MARKS[i]) return (i - 1 + (v - MARKS[i - 1]) / (MARKS[i] - MARKS[i - 1])) / (MARKS.length - 1);
    return 1;
  }
  function pt(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arc(cx, cy, r, a, b) { var p = pt(cx, cy, r, a), q = pt(cx, cy, r, b); return 'M' + p[0] + ' ' + p[1] + ' A' + r + ' ' + r + ' 0 ' + (b - a > 180 ? 1 : 0) + ' 1 ' + q[0] + ' ' + q[1]; }

  function drawGauge(v, color) {
    var cx = 150, cy = 118, r = 100, f = frac(v), end = A0 + (A1 - A0) * f;
    var ticks = MARKS.map(function (m, i) {
      var d = A0 + (A1 - A0) * i / (MARKS.length - 1), p = pt(cx, cy, r - 24, d);
      return '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" text-anchor="middle" class="gt">' + m + '</text>';
    }).join('');
    var np = pt(cx, cy, r - 30, end);
    $('#gauge').innerHTML = '<defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--cy)"/><stop offset="1" stop-color="var(--pu)"/></linearGradient></defs>' +
      '<path d="' + arc(cx, cy, r, A0, A1) + '" stroke="rgba(255,255,255,.08)" stroke-width="16" fill="none" stroke-linecap="round"/>' +
      (f > 0.001 ? '<path d="' + arc(cx, cy, r, A0, end) + '" stroke="' + (color || 'url(#gg)') + '" stroke-width="16" fill="none" stroke-linecap="round" class="garc"/>' : '') +
      ticks + '<line x1="' + cx + '" y1="' + cy + '" x2="' + np[0] + '" y2="' + np[1] + '" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#fff"/>';
    $('#gVal').textContent = sp(v); $('#gUnit').textContent = unit();
  }

  function setLive(r) {
    $('#nPing').textContent = r.ping ? r.ping.med.toFixed(0) + ' ms' : '—';
    $('#nJit').textContent = r.ping ? r.ping.jitter.toFixed(1) + ' ms' : '—';
    $('#nDown').textContent = r.down ? sp(r.down.mbps) + ' ' + unit() : '—';
    $('#nUp').textContent = r.up ? sp(r.up.mbps) + ' ' + unit() : '—';
    $('#nLoaded').textContent = r.down && r.down.loaded != null ? r.down.loaded.toFixed(0) + ' ms' : '—';
    var g = $('#nGrade'); g.textContent = r.grade || '—'; g.className = 'en grade g' + String(r.grade || '').replace('+', 'p');
  }

  function results(r) {
    setLive(r); drawGauge(r.down ? r.down.mbps : 0);
    $('#gStage').textContent = t('n_download');
    var ser = [];
    if (r.down && r.down.series) ser.push({ data: r.down.series, color: '#00e5ff', fill: true });
    if (r.up && r.up.series) { var off = r.down && r.down.series.length ? r.down.series[r.down.series.length - 1].t + 0.5 : 0; ser.push({ data: r.up.series.map(function (p) { return { t: p.t + off, v: p.v }; }), color: '#a855f7', fill: true }); }
    if (ser.length) DOT.charts.lines($('#netChart'), ser, { yLabel: 'Mbps' });
    $('#netUsagePanel').hidden = false;
    $('#netUsage').innerHTML = DOT.net.usage(r).map(function (x) { return '<span class="uchip ' + (x[1] ? 'ok' : 'no') + '">' + DOT.icon(x[1] ? 'check' : 'close', 14) + ' ' + t(x[0]) + '</span>'; }).join('');
    if (r.ip) showIP(r.ip);
  }

  function showIP(ip) {
    ipData = ip;
    var hide = DOT.settings.get('hideIP');
    var cell = function (l, v, cls) { return v ? '<div class="fg"><div class="v ' + (cls || '') + '">' + u.esc(v) + '</div><div class="l">' + l + '</div></div>' : ''; };
    $('#ipBox').innerHTML = cell(t('ip_public'), ip.ip, 'en serial' + (hide ? '' : ' show')) + cell(t('ip_type'), ip.type, 'en') + cell(t('ip_isp'), ip.isp) + cell('ASN', ip.asn ? 'AS' + String(ip.asn).replace(/^AS/i, '') : null, 'en') +
      cell(t('ip_loc'), [ip.flag, ip.city, ip.region, ip.country].filter(Boolean).join(' · ')) + cell(t('ip_tz'), ip.tz, 'en') + cell(t('ip_src'), ip.src, 'en');
  }

  function history() {
    var h = u.store.get('netHist', []);
    $('#netHist').innerHTML = h.length ? h.map(function (x) {
      return '<div class="hi"><div><b class="en">\u2193 ' + sp(x.d) + ' / \u2191 ' + sp(x.u) + ' ' + unit() + '</b><div class="mu"><span class="ltr">' + new Date(x.t).toLocaleString(DOT.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US') + '</span> · <span class="en">' + (x.p != null ? x.p.toFixed(0) + ' ms' : '') + (x.isp ? ' · ' + u.esc(x.isp) : '') + '</span></div></div><div class="s en">' + (x.g || '') + '</div></div>';
    }).join('') : '<div class="empty">' + t('histEmpty') + '</div>';
  }

  function run() {
    if (ctl) return;
    ctl = { abort: false };
    $('#netGo').hidden = true; $('#netStop').hidden = false; $('#netMsg').textContent = '';
    var live = { };
    setLive(live); drawGauge(0);
    var stageKey = { ping: 'n_pinging', down: 'n_download', up: 'n_upload' };
    var chartD = [], chartU = [], t0 = performance.now();
    DOT.net.run(function (p) {
      $('#gStage').textContent = t(stageKey[p.stage]);
      if (p.stage === 'ping' && p.value != null) { $('#nPing').textContent = p.value.toFixed(0) + ' ms'; drawGauge(0); }
      if (p.stage === 'down' && p.value != null) { drawGauge(p.value); $('#nDown').textContent = sp(p.value) + ' ' + unit(); chartD.push({ t: (performance.now() - t0) / 1000, v: p.value }); }
      if (p.stage === 'up' && p.value != null) { drawGauge(p.value, '#a855f7'); $('#nUp').textContent = sp(p.value) + ' ' + unit(); chartU.push({ t: (performance.now() - t0) / 1000, v: p.value }); }
      if (chartD.length > 1) DOT.charts.lines($('#netChart'), [{ data: chartD, color: '#00e5ff', fill: true }].concat(chartU.length > 1 ? [{ data: chartU, color: '#a855f7', fill: true }] : []), { yLabel: 'Mbps' });
    }, ctl).then(function (r) {
      last = r; u.store.set('netLast', strip(r));
      results(r);
      var h = u.store.get('netHist', []);
      h.unshift({ t: r.date, d: r.down && r.down.mbps, u: r.up && r.up.mbps, p: r.ping && r.ping.med, g: r.grade, isp: r.ip && r.ip.isp });
      u.store.set('netHist', h.slice(0, 20)); history();
      u.notify();
      document.dispatchEvent(new CustomEvent('dot:net'));
    }).catch(function (e) {
      if (e === 'abort') { u.toast(t('stopped')); return; }
      $('#netMsg').textContent = '' + t('netErr'); $('#gStage').textContent = '';
    }).then(function () { ctl = null; $('#netGo').hidden = false; $('#netStop').hidden = true; });
  }
  function strip(r) { var c = JSON.parse(JSON.stringify(r)); if (c.ping) delete c.ping.samples; return c; }

  function bind() {
    drawGauge(0);
    $('#netGo').onclick = run;
    $('#netStop').onclick = function () { if (ctl) ctl.abort = true; };
    $('#ipBtn').onclick = function () {
      $('#ipBox').innerHTML = '<div class="mu">…</div>';
      DOT.net.ipInfo().then(showIP, function () { $('#ipBox').innerHTML = '<div class="mu">' + t('netErr') + '</div>'; });
    };
    $('#ipBox').addEventListener('click', function (e) { var s = e.target.closest('.serial'); if (s) s.classList.toggle('show'); });
    document.addEventListener('dot:settings', function () { if (last) results(last); else drawGauge(0); history(); if (ipData) showIP(ipData); });
    if (last) results(last);
    history();
  }

  return { bind: bind, last: function () { return last; }, refresh: function () { if (last) results(last); history(); } };
})();
