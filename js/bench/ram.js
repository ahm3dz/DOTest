/* =========================================================
   DOTest — RAM benchmark   © Ahmed Al-Zahrani
   Allocates real memory, stresses it with write / read / copy
   across several threads, then measures random-access latency.
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.ram = (function () {
  var cfg = DOT.config, u = DOT.u;

  /* How many MB we can safely use on this device */
  function targetMB(levelMB, info) {
    var mb = levelMB, R = cfg.ram;
    if (info) {
      if (info.isIOS) mb = Math.min(mb, R.iosCapMB);
      else if (info.isMobile) mb = Math.min(mb, R.mobileCapMB);
      if (info.mem) mb = Math.min(mb, info.mem * 1024 * R.deviceFraction * (info.mem >= 8 && !info.isMobile ? 2 : 1));
    }
    return Math.max(64, Math.floor(mb / 16) * 16);
  }

  /* run(level, info, onProgress({phase, allocMB, bw}), ctl) */
  function run(L, info, onP, ctl) {
    var mb = targetMB(L.ramMB, info);
    var n = Math.max(1, Math.min(info && info.cores ? info.cores : 4, info && info.isMobile ? 4 : 8));
    var per = Math.floor(mb / n / 16) * 16 * 1048576 || 16 * 1048576;
    var bwDur = L.ram * 0.75;
    var alloc = new Array(n).fill(0), stats = new Array(n).fill(null), failed = false, t0 = performance.now();

    if (!DOT.pool.supported()) return Promise.reject(new Error('Workers not supported'));

    var job = DOT.pool.run(n, function (i) { return { cmd: 'ram', bytes: per, dur: bwDur, id: i }; }, function (i, d) {
      if (d.alloc != null) alloc[i] = d.alloc;
      if (d.failed) failed = true;
      if (d.type === 'p' || d.type === 'done') stats[i] = d;
      var bw = 0;
      stats.forEach(function (s) { if (s && s.t > 0) bw += (s.w + s.r + s.c) / (s.tw + s.tr + s.tc) * 1000 / 1e9; });
      onP && onP({ phase: 'bw', allocMB: u.sum(alloc) / 1048576, bw: bw, frac: Math.min(1, (performance.now() - t0) / 1000 / L.ram) });
    });
    ctl.kill = function () { job.kill('abort'); };

    return job.done.then(function (out) {
      var w = 0, r = 0, c = 0, allocB = 0;
      out.forEach(function (d) {
        allocB += d.alloc || 0; if (d.failed) failed = true;
        if (d.tw > 0) w += d.w / d.tw * 1000 / 1e9;
        if (d.tr > 0) r += d.r / d.tr * 1000 / 1e9;
        if (d.tc > 0) c += d.c / d.tc * 1000 / 1e9;
      });
      onP && onP({ phase: 'lat', allocMB: allocB / 1048576, frac: 0.8 });
      // Latency (single thread, pointer chasing)
      var latMB = info && info.isMobile ? cfg.ram.latencyMBMobile : cfg.ram.latencyMB;
      var lj = DOT.pool.run(1, function () { return { cmd: 'lat', mb: latMB, steps: cfg.ram.latencySteps }; });
      ctl.kill = function () { lj.kill('abort'); };
      return lj.done.then(function (lo) {
        var lat = lo[0].ns;
        var bw = (w + r + c) / 3;
        return {
          allocMB: allocB / 1048576, targetMB: mb, threads: n, failed: failed,
          write: w, read: r, copy: c, bw: bw, lat: lat,
          score: score(bw, lat)
        };
      });
    });
  }

  function score(bw, lat) {
    var S = cfg.score;
    return bw * S.ramBW * Math.pow(S.ramLatRef / Math.max(1, lat || S.ramLatRef), 0.25);
  }

  return { run: run, targetMB: targetMB, score: score };
})();
