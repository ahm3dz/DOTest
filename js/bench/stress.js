/* =========================================================
   DOTest — Stress test   © Ahmed Al-Zahrani
   Loads ALL CPU cores + GPU + RAM at the same time for a long
   period, then reports stability and thermal throttling.
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.stress = (function () {
  var u = DOT.u;

  function stats(arr, warm) {
    var a = arr.filter(function (p) { return p.t >= warm; }).map(function (p) { return p.v; });
    if (a.length < 3) return { avg: u.avg(a), stab: 100, throttle: 0, min: Math.min.apply(null, a), max: Math.max.apply(null, a) };
    var n = Math.max(1, Math.floor(a.length * 0.2));
    var first = u.avg(a.slice(0, n)), last = u.avg(a.slice(-n));
    var s = a.slice().sort(function (x, y) { return x - y; });
    var p10 = s[Math.floor(s.length * 0.1)], p90 = s[Math.floor(s.length * 0.9)] || s[s.length - 1];
    return {
      avg: u.avg(a), min: s[0], max: s[s.length - 1], first: first, last: last,
      stab: p90 > 0 ? Math.min(100, p10 / p90 * 100) : 100,
      throttle: first > 0 ? Math.max(0, (1 - last / first) * 100) : 0
    };
  }

  /* run({L, info, refresh, ctl, onTick}) */
  function run(o) {
    var L = o.L, info = o.info || {}, ctl = o.ctl;
    var dur = L.stress, cores = Math.max(1, info.cores || 4);
    var cpuState = new Array(cores).fill(0), ramState = {}, t0 = performance.now();
    var series = { cpu: [], gpu: [], fps: [], ram: [] }, lastCpu = 0, lastRam = 0, lastT = t0, gpuNow = { fps: 0, thr: 0 };

    var cpuJob = DOT.pool.run(cores, function (i) { return { cmd: 'cpu', dur: 0, id: i }; }, function (i, d) { if (d.rounds != null) cpuState[i] = d.rounds; });
    var ramMB = Math.max(64, Math.floor(DOT.ram.targetMB(L.ramMB, info) / 2));
    var ramN = 2, ramJob = DOT.pool.run(ramN, function (i) { return { cmd: 'ram', bytes: Math.floor(ramMB / ramN / 16) * 16 * 1048576 || 16777216, dur: 0, id: i }; }, function (i, d) {
      if (d.w != null) ramState[i] = d.w + d.r + d.c;
    });
    cpuJob.done.catch(function () { }); ramJob.done.catch(function () { });
    var killAll = function () { cpuJob.kill(); ramJob.kill(); };
    ctl.kill = killAll;

    var sampler = setInterval(function () {
      var now = performance.now(), dt = (now - lastT) / 1000, t = (now - t0) / 1000;
      var c = u.sum(cpuState), r = 0; for (var k in ramState) r += ramState[k];
      var cpuRate = (c - lastCpu) / dt, ramBW = (r - lastRam) / dt / 1e9;
      lastCpu = c; lastRam = r; lastT = now;
      series.cpu.push({ t: t, v: cpuRate * DOT.config.score.cpuRound });
      series.ram.push({ t: t, v: ramBW });
      series.gpu.push({ t: t, v: gpuNow.thr / DOT.config.score.gpuDiv });
      series.fps.push({ t: t, v: gpuNow.fps });
      o.onSample && o.onSample({ t: t, cpu: cpuRate * DOT.config.score.cpuRound, ram: ramBW, gpu: gpuNow.thr / DOT.config.score.gpuDiv, fps: gpuNow.fps, frac: Math.min(1, t / dur) });
    }, 1000);

    var gpuP = DOT.gpu.render({
      L: L, dur: dur, fixedFrac: 0, refresh: o.refresh, ctl: ctl, maxFrameMs: 40,
      onTick: function (tk) { gpuNow = tk; o.onTick && o.onTick(tk); }
    }).catch(function (e) {
      if (e === 'abort') throw e;
      // GPU failed (no WebGL / context lost) → keep CPU+RAM stress for the full duration
      return new Promise(function (res, rej) {
        var iv = setInterval(function () {
          if (ctl.abort) { clearInterval(iv); return rej('abort'); }
          var t = (performance.now() - t0) / 1000;
          o.onTick && o.onTick({ frac: Math.min(1, t / dur), fps: 0, K: 0, ft: [] });
          if (t >= dur) { clearInterval(iv); res({ failed: true }); }
        }, 400);
      });
    });

    return gpuP.then(function (g) {
      clearInterval(sampler); killAll();
      var warm = Math.min(5, dur * 0.1);
      var cpu = stats(series.cpu, warm), gpu = stats(series.gpu, warm), ram = stats(series.ram, warm), fps = stats(series.fps, warm);
      var parts = [cpu.stab]; if (!g.failed) parts.push(gpu.stab); if (ram.avg > 0) parts.push(ram.stab);
      return {
        dur: dur, cores: cores, ramMB: ramMB, series: series, gpuFailed: !!g.failed,
        cpu: cpu, gpu: gpu, ram: ram, fps: fps,
        stability: u.avg(parts),
        throttle: Math.max(cpu.throttle, g.failed ? 0 : gpu.throttle)
      };
    }, function (e) { clearInterval(sampler); killAll(); throw e; });
  }

  return { run: run };
})();
