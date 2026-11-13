/* =========================================================
   DOTest — Benchmark kernels (CPU + RAM)
   These functions run inside Web Workers (and on the main
   thread as a fallback). Edit workloads here.
   © Ahmed Al-Zahrani
   ========================================================= */

/* ---------- CPU kernels (one call = one unit of work) ---------- */

// Integer math: xorshift PRNG + bit ops
function K_int(s) {
  let x = s | 1, a = 0;
  for (let i = 0; i < 120000; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; a = (a + (x & 1023)) | 0; }
  return a;
}

// Floating point: sqrt / sin / log / cos
function K_float(s) {
  let f = 0; const g = s * 1e-9;
  for (let i = 1; i < 1500; i++) f += Math.sqrt(i + g) * Math.sin(i * 0.0007) + Math.log(i + 1) * Math.cos(i * 0.0013);
  return f;
}

// Prime sieve (branches + byte memory)
function K_prime() {
  const N = 40000, sv = new Uint8Array(N + 1); let c = 0;
  for (let i = 2; i <= N; i++) if (!sv[i]) { c++; for (let j = i * i; j <= N; j += i) sv[j] = 1; }
  return c;
}

// Sorting 4000 doubles
function K_sort(s) {
  let x = s | 1; const a = new Float64Array(4000);
  for (let i = 0; i < 4000; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; a[i] = x; }
  a.sort(); return a[2000];
}

// Matrix multiply 48x48 (FMA heavy)
function K_matrix(s) {
  const n = 48, A = new Float64Array(n * n), B = new Float64Array(n * n), C = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) { A[i] = ((i * 7 + s) % 13) * 0.1; B[i] = ((i * 3 + s) % 11) * 0.1; }
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const a = A[i * n + k]; for (let j = 0; j < n; j++) C[i * n + j] += a * B[k * n + j]; }
  return C[n + 1];
}

// CRC32 hashing (table lookups)
function K_hash(s) {
  if (!K_hash.T) { const T = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c; } K_hash.T = T; }
  const T = K_hash.T; let c = ~0;
  for (let r = 0; r < 4; r++) for (let i = 0; i < 16384; i++) c = T[(c ^ ((i * 31 + s + r) & 255)) & 255] ^ (c >>> 8);
  return ~c;
}

// Cache / random memory access (4 MB working set)
function K_cache(s) {
  if (!K_cache.M) { const n = 1 << 20, m = new Int32Array(n); let x = 7; for (let i = 0; i < n; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; m[i] = (x >>> 0) & (n - 1); } K_cache.M = m; }
  const m = K_cache.M; let p = s & 1048575, a = 0;
  for (let i = 0; i < 60000; i++) { p = m[p]; a = (a + p) | 0; }
  return a;
}

/* ---------- Worker entry point ---------- */
function __dotWorker() {
  var K = [['int', K_int], ['float', K_float], ['prime', K_prime], ['sort', K_sort], ['matrix', K_matrix], ['hash', K_hash], ['cache', K_cache]];
  var now = function () { return performance.now(); };

  self.onmessage = function (e) {
    var m = e.data;
    if (m.cmd === 'cpu') cpu(m); else if (m.cmd === 'ram') ram(m); else if (m.cmd === 'lat') lat(m);
  };

  function cpu(m) {
    var t0 = now(), last = t0, rounds = 0, sink = 0, ct = new Float64Array(K.length), cn = new Float64Array(K.length);
    var end = m.dur > 0 ? t0 + m.dur * 1000 : Infinity;
    function post(type) {
      var cat = {}; for (var k = 0; k < K.length; k++) cat[K[k][0]] = [cn[k], ct[k]];
      postMessage({ type: type, rounds: rounds, t: now() - t0, id: m.id, cat: cat, sink: sink });
    }
    while (true) {
      for (var k = 0; k < K.length; k++) { var a = now(); sink ^= K[k][1](rounds + m.id * 7919 + k) | 0; ct[k] += now() - a; cn[k]++; }
      rounds++;
      var t = now();
      if (t - last >= 250) { post('p'); last = t; }
      if (t >= end) break;
    }
    post('done');
  }

  function ram(m) {
    var BLK = 16 * 1024 * 1024, blocks = [], alloc = 0, failed = false;
    try {
      while (alloc < m.bytes) {
        var sz = Math.min(BLK, m.bytes - alloc), b = new Float64Array((sz / 8) | 0);
        b.fill(1); blocks.push(b); alloc += sz;
        if (blocks.length % 4 === 0) postMessage({ type: 'alloc', id: m.id, alloc: alloc });
      }
    } catch (err) { failed = true; }
    postMessage({ type: 'alloc', id: m.id, alloc: alloc, failed: failed });
    var w = 0, r = 0, c = 0, tw = 0, tr = 0, tc = 0, s = 0, v = 0, t1 = now(), last = t1;
    var end = m.dur > 0 ? t1 + m.dur * 1000 : Infinity;
    function post(type) { postMessage({ type: type, id: m.id, alloc: alloc, failed: failed, w: w, r: r, c: c, tw: tw, tr: tr, tc: tc, t: now() - t1, s: s }); }
    if (!blocks.length) { post('done'); return; }
    outer: while (true) {
      for (var i = 0; i < blocks.length; i++) {
        var bl = blocks[i], n = bl.length, a = now();
        bl.fill(v + i); var a2 = now(); tw += a2 - a; w += n * 8;                 // write
        var sum = 0; for (var j = 0; j < n; j++) sum += bl[j];                    // read
        var a3 = now(); tr += a3 - a2; r += n * 8; s += sum;
        bl.copyWithin(0, n >> 1); var a4 = now(); tc += a4 - a3; c += n * 8;      // copy (read+write)
        if (a4 - last >= 250) { post('p'); last = a4; }
        if (a4 >= end) break outer;
      }
      v++;
    }
    post('done');
  }

  function lat(m) {
    var n = (m.mb * 1024 * 1024 / 4) | 0, a = new Int32Array(n), i, x = 12345;
    for (i = 0; i < n; i++) a[i] = i;
    for (i = n - 1; i > 0; i--) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; var j = (x >>> 0) % i, t = a[i]; a[i] = a[j]; a[j] = t; } // Sattolo cycle
    var p = 0, t0 = now();
    for (var k = 0; k < m.steps; k++) p = a[p];
    var dt = now() - t0;
    postMessage({ type: 'done', ns: dt * 1e6 / m.steps, p: p });
  }
}

/* Build the worker source from the functions above (works on file:// too) */
var DOT = window.DOT = window.DOT || {};
DOT.kernels = {
  list: ['int', 'float', 'prime', 'sort', 'matrix', 'hash', 'cache'],
  fns: { int: K_int, float: K_float, prime: K_prime, sort: K_sort, matrix: K_matrix, hash: K_hash, cache: K_cache },
  source: function () {
    return [K_int, K_float, K_prime, K_sort, K_matrix, K_hash, K_cache].map(String).join('\n') + '\n(' + __dotWorker.toString() + ')();';
  }
};
