/* =========================================================
   DOTest — GPU benchmark   © Ahmed Al-Zahrani
   1) WebGL render test: real FPS + adaptive max-load throughput
   2) WebGPU compute test: raw GFLOPS / TFLOPS (when available)
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.gpu = (function () {
  var u = DOT.u, S = { gl: null, prog: null, loc: null, lost: false, listen: false, progs: {}, scene: null };

  function canvas() { return u.$('#gl'); }

  function scene() { return (DOT.settings && DOT.settings.get('scene')) || 'mandelbulb'; }

  /* Compile (and cache) the program for a scene */
  function useScene(gl, name) {
    if (S.progs[name]) { S.prog = S.progs[name].p; S.loc = S.progs[name].loc; S.scene = name; return; }
    function sh(t, src) {
      var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, DOT.shaders.vertex));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, DOT.shaders.fragment(name)));
    gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program: ' + gl.getProgramInfoLog(p));
    var loc = { res: gl.getUniformLocation(p, 'uRes'), time: gl.getUniformLocation(p, 'uTime'), iter: gl.getUniformLocation(p, 'uIter'), k: gl.getUniformLocation(p, 'uK') };
    S.progs[name] = { p: p, loc: loc }; S.prog = p; S.loc = loc; S.scene = name;
  }

  function init(name) {
    name = name || scene();
    if (S.gl && !S.gl.isContextLost()) { useScene(S.gl, name); return S.gl; }
    S.progs = {};
    var c = canvas();
    if (!S.listen) {
      S.listen = true;
      c.addEventListener('webglcontextlost', function (e) { e.preventDefault(); S.lost = true; });
      c.addEventListener('webglcontextrestored', function () { S.lost = false; S.gl = null; });
    }
    var o = { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false };
    var gl = c.getContext('webgl2', o) || c.getContext('webgl', o) || c.getContext('experimental-webgl', o);
    if (!gl) throw new Error('nogl');
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    useScene(gl, name);
    S.gl = gl; S.lost = false;
    return gl;
  }

  function size(scale) {
    var c = canvas(), r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = Math.max(64, Math.round((r.width || 640) * dpr * scale)), h = Math.max(36, Math.round((r.height || 360) * dpr * scale));
    var maxPx = 8.3e6;
    if (w * h > maxPx) { var k = Math.sqrt(maxPx / (w * h)); w = Math.round(w * k); h = Math.round(h * k); }
    c.width = w; c.height = h;
    return [c.width, c.height];
  }

  /* K = number of full-screen passes per frame (additively blended, can't be skipped by the GPU) */
  function draw(gl, t, iter, K) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(S.prog);
    gl.uniform2f(S.loc.res, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1i(S.loc.iter, iter); gl.uniform1f(S.loc.k, K);
    if (K > 1) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); } else gl.disable(gl.BLEND);
    for (var k = 0; k < K; k++) { gl.uniform1f(S.loc.time, t + k * 0.0004); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  }

  function gpuDiv(name) { var d = DOT.config.score.gpuDiv; return typeof d === 'object' ? (d[name] || d.mandelbulb) : d; }
  function preview() { try { var gl = init(); size(0.6); draw(gl, 3.0, 96, 1); } catch (e) { } }

  /* render({L, dur(s), fixedFrac, refresh, ctl, onTick(t)})
     Phase 1 (fixedFrac): K=1 → real FPS. Phase 2: K adapts upward until the GPU is saturated. */
  function render(o) {
    return new Promise(function (resolve, reject) {
      var gl; try { gl = init(o.scene); } catch (e) { return reject(e); }
      var L = o.L, wh = size(L.res * (o.resMul || 1)), px = wh[0] * wh[1];
      var dur = o.dur * 1000, fixedDur = dur * o.fixedFrac, t0 = 0, prev = 0, K = 1;
      var frames = [], series = [], recent = [], work = 0, wStart = 0, measuring = false;
      var winN = 0, winT = 0, winWork = 0, kSum = 0, kN = 0, ft = [];
      var tgt = 1000 / (o.refresh || 60), maxFT = o.maxFrameMs || 36;
      function loop(now) {
        if (o.ctl.abort) return reject('abort');
        if (S.lost || gl.isContextLost()) return reject(new Error('ctxlost'));
        var el = now - t0, dt = now - prev; prev = now;
        var phase = el < fixedDur ? 1 : 2;
        if (el > 150) { ft.push(dt); if (ft.length > 160) ft.shift(); }
        if (phase === 1) { if (el > 700) frames.push(dt); }
        else {
          recent.push(dt);
          if (recent.length >= 8) {
            var a = u.avg(recent); recent = [];
            if (a < tgt * 1.3 && a < maxFT) K = Math.min(500, Math.ceil(K * 1.3));
            else if (a > maxFT * 1.6) K = Math.max(1, Math.floor(K * 0.7));
          }
          if (el > fixedDur + 1500) {
            if (!measuring) { measuring = true; wStart = now; }
            else { work += px * L.iter * K; kSum += K; kN++; }
          }
        }
        var fw = px * L.iter * (phase === 1 ? 1 : K);
        winN++; winWork += fw;
        if (now - winT >= 400) {
          var secs = (now - winT) / 1000, fps = winN / secs;
          series.push({ t: el / 1000, f: fps, p: phase, thr: winWork / secs });
          o.onTick && o.onTick({ fps: fps, K: phase === 1 ? 1 : K, phase: phase, w: wh[0], h: wh[1], frac: Math.min(1, el / dur), ft: ft, thr: winWork / secs, el: el / 1000 });
          winN = 0; winWork = 0; winT = now;
        }
        draw(gl, el / 1000, L.iter, phase === 1 ? 1 : K);
        if (el >= dur) return finish(now);
        requestAnimationFrame(loop);
      }
      function finish(now) {
        try { gl.finish(); } catch (e) { }
        var fr = frames.length ? frames : [1000 / Math.max(1, series.length ? series[series.length - 1].f : 1)];
        var sorted = fr.slice().sort(function (a, b) { return a - b; });
        var avg = 1000 / u.avg(fr);
        var worstN = Math.max(1, Math.floor(sorted.length * 0.01));
        var low = 1000 / u.avg(sorted.slice(-worstN));
        var mx = 1000 / sorted[Math.floor(sorted.length * 0.02)], mn = 1000 / sorted[sorted.length - 1];
        var el2 = (now - wStart) / 1000;
        var thr = measuring && el2 > 0 ? work / el2 : px * L.iter * avg;
        resolve({
          avg: avg, low: low, max: Math.min(mx, (o.refresh || 60) * 1.05), min: mn, stab: Math.min(100, low / avg * 100),
          thr: thr, score: thr / gpuDiv(S.scene), scene: S.scene, series: series, w: wh[0], h: wh[1], avgK: kN ? kSum / kN : 1, frames: fr.length
        });
      }
      requestAnimationFrame(function (t) { t0 = t; prev = t; winT = t; requestAnimationFrame(loop); });
    });
  }

  /* WebGPU compute — returns {gflops, best} or null when not available */
  function compute(sec, ctl, onP) {
    if (!navigator.gpu) return Promise.resolve(null);
    var device;
    return u.timeout(navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }), 3000, null).then(function (adapter) {
      if (!adapter) return null;
      return adapter.requestDevice().then(function (dev) {
        device = dev;
        var ITERS = 256, FLOPS_PER_THREAD = ITERS * 64;
        var module = device.createShaderModule({ code: DOT.shaders.compute(ITERS) });
        var pipeP = device.createComputePipelineAsync ? device.createComputePipelineAsync({ layout: 'auto', compute: { module: module, entryPoint: 'main' } }) : Promise.resolve(device.createComputePipeline({ layout: 'auto', compute: { module: module, entryPoint: 'main' } }));
        return pipeP.then(function (pipe) {
          var buf = device.createBuffer({ size: 262144 * 4, usage: GPUBufferUsage.STORAGE });
          var bg = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: buf } }] });
          var gx = 64, gy = 1, best = 0, total = 0, totalT = 0, t0 = performance.now();
          function once() {
            var enc = device.createCommandEncoder(), pass = enc.beginComputePass();
            pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.dispatchWorkgroups(gx, gy); pass.end();
            var s = performance.now();
            device.queue.submit([enc.finish()]);
            return device.queue.onSubmittedWorkDone().then(function () { return performance.now() - s; });
          }
          function step() {
            if (ctl.abort) throw 'abort';
            var el = (performance.now() - t0) / 1000;
            if (el >= sec) return;
            return once().then(function (ms) {
              var flops = gx * gy * 256 * FLOPS_PER_THREAD, g = flops / (ms / 1000) / 1e9;
              if (ms < 40) { if (gx < 65535) gx = Math.min(65535, gx * 2); else gy = Math.min(256, gy * 2); }
              else if (ms > 200 && gx > 64) { gx = Math.max(64, gx >> 1); }
              if (ms > 8) { best = Math.max(best, g); total += flops; totalT += ms; }
              onP && onP({ gflops: g, frac: Math.min(1, el / sec) });
              return step();
            });
          }
          return Promise.resolve(step()).then(function () {
            buf.destroy && buf.destroy();
            return { best: best, avg: totalT ? total / (totalT / 1000) / 1e9 : best };
          });
        });
      });
    }).then(function (r) { try { device && device.destroy(); } catch (e) { } return r; },
      function (e) { try { device && device.destroy(); } catch (x) { } if (e === 'abort') throw e; return null; });
  }

  return { init: init, preview: preview, render: render, compute: compute, gpuDiv: gpuDiv, scene: scene };
})();
