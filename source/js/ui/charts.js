/* =========================================================
   DOTest — Canvas charts   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.charts = (function () {
  function prep(c) {
    var dpr = window.devicePixelRatio || 1, w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    var x = c.getContext('2d'); x.direction = 'ltr'; x.clearRect(0, 0, w, h);
    return { x: x, w: w, h: h, dpr: dpr };
  }

  /* Live frame-time graph */
  function frameTimes(c, buf, refresh) {
    if (!c.clientWidth) return;
    var P = prep(c), x = P.x, w = P.w, h = P.h, d = P.dpr;
    var tgt = 1000 / (refresh || 60), mx = Math.max(tgt * 2.2, Math.max.apply(null, buf.concat([1])));
    var ty = h - tgt / mx * h;
    x.strokeStyle = 'rgba(34,229,138,.35)'; x.setLineDash([4 * d, 4 * d]); x.beginPath(); x.moveTo(0, ty); x.lineTo(w, ty); x.stroke(); x.setLineDash([]);
    x.fillStyle = 'rgba(143,151,189,.8)'; x.font = (10 * d) + 'px Orbitron, monospace'; x.fillText('frame time (ms)', 6 * d, 12 * d);
    if (buf.length < 2) return;
    var step = w / 159; x.beginPath();
    buf.forEach(function (v, i) { var px = w - (buf.length - 1 - i) * step, py = h - v / mx * h; i ? x.lineTo(px, py) : x.moveTo(px, py); });
    var g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#a855f7'); g.addColorStop(1, '#00e5ff');
    x.strokeStyle = g; x.lineWidth = 2 * d; x.stroke();
  }

  /* Live sparkline (generic, last N values) */
  function spark(c, vals, color, label) {
    if (!c.clientWidth) return;
    var P = prep(c), x = P.x, w = P.w, h = P.h, d = P.dpr, mx = Math.max.apply(null, vals.concat([1e-9])) * 1.1;
    x.fillStyle = 'rgba(143,151,189,.8)'; x.font = (10 * d) + 'px Orbitron, monospace'; x.fillText(label || '', 6 * d, 12 * d);
    if (vals.length < 2) return;
    var step = w / Math.max(1, vals.length - 1); x.beginPath();
    vals.forEach(function (v, i) { var px = i * step, py = h - v / mx * (h - 16 * d); i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = color || '#00e5ff'; x.lineWidth = 2 * d; x.stroke();
  }

  /* Multi-series line chart. series: [{data:[{t,v}], color, fill}] opts: {yMax, yLabel, shadeFrom, shadeLabel, percent} */
  function lines(c, series, opts) {
    opts = opts || {};
    var P = prep(c), x = P.x, w = P.w, h = P.h, d = P.dpr, pad = 34 * d, top = 10 * d, bot = 20 * d;
    var all = []; series.forEach(function (s) { s.data.forEach(function (p) { all.push(p); }); });
    if (!all.length) return;
    var tmax = Math.max.apply(null, all.map(function (p) { return p.t; })) || 1;
    var ymax = opts.yMax || Math.max.apply(null, all.map(function (p) { return p.v; })) * 1.1 || 1;
    x.font = (10 * d) + 'px Orbitron, monospace'; x.strokeStyle = 'rgba(255,255,255,.06)'; x.fillStyle = 'rgba(143,151,189,.8)';
    for (var i = 0; i <= 4; i++) {
      var y = top + (h - top - bot) * (i / 4);
      x.beginPath(); x.moveTo(pad, y); x.lineTo(w - 6 * d, y); x.stroke();
      var lab = ymax * (1 - i / 4); x.fillText(opts.percent ? Math.round(lab) + '%' : (lab >= 100 ? Math.round(lab) : lab.toFixed(1)), 2 * d, y + 4 * d);
    }
    x.fillText((opts.yLabel || '') + '  /  time (s)', pad, h - 5 * d);
    x.fillText(Math.round(tmax) + 's', w - 30 * d, h - 5 * d);
    var X = function (t) { return pad + (w - pad - 6 * d) * (t / tmax); }, Y = function (v) { return top + (h - top - bot) * (1 - Math.min(v, ymax) / ymax); };
    if (opts.shadeFrom != null) {
      x.fillStyle = 'rgba(255,61,129,.06)'; x.fillRect(X(opts.shadeFrom), top, w - X(opts.shadeFrom), h - top - bot);
      x.fillStyle = 'rgba(255,61,129,.85)'; x.fillText(opts.shadeLabel || '', X(opts.shadeFrom) + 4 * d, top + 12 * d);
    }
    series.forEach(function (s) {
      if (s.data.length < 2) return;
      if (s.fill) {
        var g = x.createLinearGradient(0, top, 0, h); g.addColorStop(0, s.color + '55'); g.addColorStop(1, s.color + '00');
        x.beginPath(); s.data.forEach(function (p, i) { i ? x.lineTo(X(p.t), Y(p.v)) : x.moveTo(X(p.t), Y(p.v)); });
        x.lineTo(X(s.data[s.data.length - 1].t), h - bot); x.lineTo(X(s.data[0].t), h - bot); x.closePath(); x.fillStyle = g; x.fill();
      }
      x.beginPath(); s.data.forEach(function (p, i) { i ? x.lineTo(X(p.t), Y(p.v)) : x.moveTo(X(p.t), Y(p.v)); });
      x.strokeStyle = s.color; x.lineWidth = 2.2 * d; x.stroke();
    });
  }

  return { frameTimes: frameTimes, spark: spark, lines: lines };
})();
