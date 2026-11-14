/* =========================================================
   DOTest — CPU benchmark   © Ahmed Al-Zahrani
   Single-core + all-cores, 7 workload categories
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.cpu = (function () {
  var C = DOT.config.score, u = DOT.u;

  function catScores(catSum) {
    var r = {};
    DOT.kernels.list.forEach(function (k) {
      var c = catSum[k]; if (!c || !c[1]) return;
      r[k] = (c[0] / (c[1] / 1000)) * C.cpuCat[k]; // calls per second × factor
    });
    return r;
  }

  /* Main-thread fallback (single core only) */
  function mainThread(dur, onP, ctl) {
    var fns = DOT.kernels.list.map(function (k) { return [k, DOT.kernels.fns[k]]; });
    var t0 = performance.now(), rounds = 0, cat = {};
    fns.forEach(function (f) { cat[f[0]] = [0, 0]; });
    return new Promise(function (resolve, reject) {
      (function slice() {
        if (ctl.abort) return reject('abort');
        var s = performance.now();
        while (performance.now() - s < 50) {
          for (var k = 0; k < fns.length; k++) { var a = performance.now(); fns[k][1](rounds + k); cat[fns[k][0]][1] += performance.now() - a; cat[fns[k][0]][0]++; }
          rounds++;
        }
        var t = performance.now() - t0;
        onP && onP(0, rounds / (t / 1000));
        if (t >= dur * 1000) return resolve({ total: rounds / (t / 1000), perThread: [rounds / (t / 1000)], cats: catScores(cat), threads: 1, fallback: true });
        setTimeout(slice, 0);
      })();
    });
  }

  /* run(threads, seconds, onProgress(i, roundsPerSec), ctl) */
  function run(n, dur, onP, ctl) {
    if (!DOT.pool.supported()) return mainThread(dur, onP, ctl);
    var job = DOT.pool.run(n, function (i) { return { cmd: 'cpu', dur: dur, id: i }; }, function (i, d) {
      if (d.t > 0) onP && onP(i, d.rounds / (d.t / 1000));
    });
    ctl.kill = function () { job.kill('abort'); };
    return job.done.then(function (out) {
      var per = out.map(function (d) { return d.rounds / (d.t / 1000); });
      var cat = {};
      out.forEach(function (d) { for (var k in d.cat) { cat[k] = cat[k] || [0, 0]; cat[k][0] += d.cat[k][0]; cat[k][1] += d.cat[k][1] / n; } });
      return { total: u.sum(per), perThread: per, cats: catScores(cat), threads: n };
    }).catch(function (e) {
      if (e === 'abort') throw e;
      if (n === 1) return mainThread(dur, onP, ctl);
      throw e;
    });
  }

  function score(roundsPerSec) { return roundsPerSec * C.cpuRound; }

  return { run: run, score: score };
})();
