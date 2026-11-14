/* =========================================================
   DOTest — Internet speed test   © Ahmed Al-Zahrani
   Ping · Jitter · Download · Upload · Loaded latency (bufferbloat)
   + Public IP / ISP / location
   Servers are configured in DOT.config.net
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.net = (function () {
  var u = DOT.u, C = function () { return DOT.config.net; };
  var bust = function (url) { return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'r=' + Math.random().toString(36).slice(2); };

  function timedFetch(url, opt, ms) {
    var ac = new AbortController(), t = setTimeout(function () { ac.abort(); }, ms || 8000);
    opt = opt || {}; opt.signal = ac.signal; opt.cache = 'no-store';
    return fetch(url, opt).finally(function () { clearTimeout(t); });
  }

  /* ---------- Ping & jitter ---------- */
  function ping(n, onP, ctl) {
    var samples = [], meta = {};
    function one(i) {
      if (ctl && ctl.abort) return Promise.reject('abort');
      if (i >= n) return Promise.resolve();
      var s = performance.now();
      return timedFetch(bust(C().ping), {}, 5000).then(function (r) {
        var dt = performance.now() - s;
        if (i === 0) { ['cf-meta-colo', 'cf-meta-city', 'cf-meta-country', 'cf-meta-ip'].forEach(function (h) { var v = r.headers.get(h); if (v) meta[h.replace('cf-meta-', '')] = v; }); }
        return r.arrayBuffer().then(function () {
          if (i > 0) samples.push(dt);        // first request includes connection setup
          onP && onP({ ping: dt, i: i, n: n });
          return one(i + 1);
        });
      });
    }
    return one(0).then(function () {
      if (!samples.length) throw new Error('nonet');
      var jit = 0; for (var i = 1; i < samples.length; i++) jit += Math.abs(samples[i] - samples[i - 1]);
      var s = samples.slice().sort(function (a, b) { return a - b; });
      return { min: s[0], avg: u.avg(samples), med: s[Math.floor(s.length / 2)], jitter: samples.length > 1 ? jit / (samples.length - 1) : 0, samples: samples, meta: meta };
    });
  }

  /* ---------- Download (parallel streams, live byte counting) ---------- */
  function download(sec, onP, ctl) {
    return new Promise(function (resolve, reject) {
      var bytes = 0, stop = false, aborts = [], t0 = performance.now(), last = t0, lastB = 0, series = [], warmB = 0, warmT = 0, errors = 0, loaded = [];
      var warm = Math.min(2000, sec * 200);
      function stream() {
        if (stop) return;
        var ac = new AbortController(); aborts.push(ac);
        fetch(bust(C().down + C().downChunk), { cache: 'no-store', signal: ac.signal }).then(function (r) {
          if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
          var rd = r.body.getReader();
          function pump() { return rd.read().then(function (x) { if (x.done || stop) return; bytes += x.value.length; return pump(); }); }
          return pump();
        }).then(stream, function (e) { if (!stop && ++errors > C().streams * 2) finish(new Error('nonet')); else if (!stop) setTimeout(stream, 200); });
      }
      // loaded latency: ping while downloading
      function loadedPing() {
        if (stop) return;
        var s = performance.now();
        timedFetch(bust(C().ping), {}, 3000).then(function (r) { return r.arrayBuffer(); }).then(function () { if (!stop) loaded.push(performance.now() - s); setTimeout(loadedPing, 250); }, function () { setTimeout(loadedPing, 250); });
      }
      for (var i = 0; i < C().streams; i++) setTimeout(stream, i * 120);
      setTimeout(loadedPing, 800);
      var iv = setInterval(function () {
        if (ctl && ctl.abort) return finish('abort');
        var now = performance.now(), dt = (now - last) / 1000, el = now - t0;
        var mbps = (bytes - lastB) * 8 / dt / 1e6; last = now; lastB = bytes;
        series.push({ t: el / 1000, v: mbps });
        if (!warmT && el >= warm) { warmT = now; warmB = bytes; }
        onP && onP({ mbps: mbps, frac: Math.min(1, el / (sec * 1000)), bytes: bytes });
        if (el >= sec * 1000) finish();
      }, 200);
      function finish(err) {
        if (stop) return; stop = true; clearInterval(iv);
        aborts.forEach(function (a) { try { a.abort(); } catch (e) { } });
        if (err) return reject(err);
        var now = performance.now();
        var avg = warmT ? (bytes - warmB) * 8 / ((now - warmT) / 1000) / 1e6 : bytes * 8 / ((now - t0) / 1000) / 1e6;
        var sorted = series.map(function (p) { return p.v; }).sort(function (a, b) { return a - b; });
        resolve({ mbps: avg, peak: sorted[Math.floor(sorted.length * 0.95)] || avg, bytes: bytes, series: series, loaded: loaded.length ? u.avg(loaded.slice().sort(function (a, b) { return a - b; }).slice(0, Math.ceil(loaded.length * 0.8))) : null });
      }
    });
  }

  /* ---------- Upload (parallel POSTs, chunk size grows with speed) ---------- */
  function upload(sec, onP, ctl) {
    return new Promise(function (resolve, reject) {
      var MAX = 32e6, src = new Uint8Array(MAX);
      for (var o = 0; o < MAX; o += 65536) crypto.getRandomValues(src.subarray(o, Math.min(MAX, o + 65536)));
      var bytes = 0, stop = false, aborts = [], t0 = performance.now(), last = t0, lastB = 0, series = [], size = C().upChunkStart, errors = 0, warmT = 0, warmB = 0;
      var warm = Math.min(2000, sec * 200);
      function stream() {
        if (stop) return;
        var ac = new AbortController(); aborts.push(ac);
        var n = size, s = performance.now();
        fetch(bust(C().up), { method: 'POST', body: new Blob([src.subarray(0, n)]), cache: 'no-store', signal: ac.signal }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          bytes += n;
          var took = performance.now() - s;
          if (took < 600 && size < MAX) size = Math.min(MAX, size * 2);
          return r.arrayBuffer();
        }).then(stream, function () { if (!stop && ++errors > C().streams * 2) finish(new Error('nonet')); else if (!stop) setTimeout(stream, 200); });
      }
      for (var i = 0; i < C().streams; i++) setTimeout(stream, i * 120);
      var iv = setInterval(function () {
        if (ctl && ctl.abort) return finish('abort');
        var now = performance.now(), el = now - t0;
        var mbps = el > 0 ? bytes * 8 / (el / 1000) / 1e6 : 0;     // cumulative (chunks complete in bursts)
        series.push({ t: el / 1000, v: mbps }); last = now; lastB = bytes;
        if (!warmT && el >= warm) { warmT = now; warmB = bytes; }
        onP && onP({ mbps: mbps, frac: Math.min(1, el / (sec * 1000)), bytes: bytes });
        if (el >= sec * 1000) finish();
      }, 200);
      function finish(err) {
        if (stop) return; stop = true; clearInterval(iv);
        aborts.forEach(function (a) { try { a.abort(); } catch (e) { } });
        if (err) return reject(err);
        var now = performance.now();
        var avg = warmT && bytes > warmB ? (bytes - warmB) * 8 / ((now - warmT) / 1000) / 1e6 : bytes * 8 / ((now - t0) / 1000) / 1e6;
        resolve({ mbps: avg, bytes: bytes, series: series });
      }
    });
  }

  /* ---------- Public IP / ISP / location ---------- */
  function ipInfo() {
    var apis = C().ipApis.slice();
    function norm(d) {
      if (!d || d.success === false || d.error) return null;
      return {
        ip: d.ip, type: d.type || (d.ip && d.ip.indexOf(':') >= 0 ? 'IPv6' : 'IPv4'),
        isp: (d.connection && (d.connection.isp || d.connection.org)) || d.org || d.isp || null,
        asn: (d.connection && d.connection.asn) || d.asn || null,
        city: d.city || null, region: d.region || null, country: d.country || d.country_name || null,
        cc: d.country_code || null, flag: d.flag && d.flag.emoji ? d.flag.emoji : null,
        tz: (d.timezone && (d.timezone.id || d.timezone)) || null
      };
    }
    function next() {
      if (!apis.length) return Promise.reject(new Error('noip'));
      var url = apis.shift();
      return timedFetch(url, {}, 5000).then(function (r) { return r.json(); }).then(function (d) { var n = norm(d); if (!n || !n.ip) throw 0; n.src = url.split('/')[2]; return n; }).catch(next);
    }
    return next();
  }

  /* ---------- Full run ---------- */
  function run(onP, ctl) {
    var cfg = C(), res = { date: Date.now() };
    onP({ stage: 'ping', frac: 0 });
    return ping(cfg.pingCount, function (p) { onP({ stage: 'ping', value: p.ping, frac: p.i / p.n }); }, ctl).then(function (p) {
      res.ping = p;
      onP({ stage: 'down', frac: 0 });
      return download(cfg.downSec, function (d) { onP({ stage: 'down', value: d.mbps, frac: d.frac }); }, ctl);
    }).then(function (d) {
      res.down = d;
      onP({ stage: 'up', frac: 0 });
      return upload(cfg.upSec, function (x) { onP({ stage: 'up', value: x.mbps, frac: x.frac }); }, ctl).catch(function (e) { if (e === 'abort') throw e; return null; });
    }).then(function (up) {
      res.up = up;
      res.bloat = res.down.loaded != null ? Math.max(0, res.down.loaded - res.ping.med) : null;
      res.grade = grade(res.bloat);
      return ipInfo().then(function (ip) { res.ip = ip; return res; }, function () { return res; });
    });
  }

  function grade(b) { if (b == null) return null; return b < 5 ? 'A+' : b < 30 ? 'A' : b < 60 ? 'B' : b < 200 ? 'C' : b < 400 ? 'D' : 'F'; }

  /* What can you do with this connection? */
  function usage(r) {
    var d = r.down ? r.down.mbps : 0, up = r.up ? r.up.mbps : 0, p = r.ping ? r.ping.med : 999, j = r.ping ? r.ping.jitter : 99;
    return [
      ['u_web', d >= 5], ['u_hd', d >= 8], ['u_4k', d >= 25], ['u_8k', d >= 80],
      ['u_gaming', p < 50 && j < 15], ['u_comp', p < 25 && j < 5], ['u_call', d >= 4 && up >= 3 && p < 120],
      ['u_stream', up >= 10 && p < 80], ['u_cloud', d >= 35 && p < 40 && j < 10], ['u_big', d >= 100]
    ];
  }

  return { run: run, ping: ping, download: download, upload: upload, ipInfo: ipInfo, usage: usage, grade: grade };
})();
