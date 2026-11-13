/* =========================================================
   DOTest — Worker pool   © Ahmed Al-Zahrani
   Creates workers from a Blob so it works anywhere (even file://)
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.pool = (function () {
  var url = null, live = [];

  function getURL() {
    if (!url) url = URL.createObjectURL(new Blob([DOT.kernels.source()], { type: 'text/javascript' }));
    return url;
  }

  /* Start n workers, each receives msg(i). onMsg(i, data) for every message.
     Returns { done: Promise<array of final messages>, kill() } */
  function run(n, msgFn, onMsg) {
    var ws = [], out = new Array(n), finished = 0, rejectFn, killed = false;
    var done = new Promise(function (resolve, reject) {
      rejectFn = reject;
      var u;
      try { u = getURL(); } catch (e) { return reject(e); }
      for (var i = 0; i < n; i++) {
        (function (i) {
          var w;
          try { w = new Worker(u); } catch (e) { kill(); return reject(e); }
          ws.push(w); live.push(w);
          w.onmessage = function (e) {
            var d = e.data; onMsg && onMsg(i, d);
            if (d.type === 'done') { out[i] = d; w.terminate(); if (++finished === n) { cleanup(); resolve(out); } }
          };
          w.onerror = function (err) { err.preventDefault && err.preventDefault(); kill(); reject(new Error(err.message || 'Worker error')); };
          w.postMessage(msgFn(i));
        })(i);
      }
    });
    function cleanup() { ws.forEach(function (w) { var k = live.indexOf(w); if (k >= 0) live.splice(k, 1); }); }
    function kill(reason) { if (killed) return; killed = true; ws.forEach(function (w) { w.terminate(); }); cleanup(); if (reason) rejectFn(reason); }
    return { done: done, kill: kill };
  }

  function killAll() { live.forEach(function (w) { w.terminate(); }); live = []; }
  function supported() { try { return !!window.Worker && !!getURL(); } catch (e) { return false; } }

  return { run: run, killAll: killAll, supported: supported };
})();
