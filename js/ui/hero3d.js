/* =========================================================
   DOTest — Animated hero fractal (rainbow Mandelbulb)
   Low resolution, ~24 FPS, pauses automatically to save battery.
   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.hero3d = (function () {
  var c, gl, prog, loc, raf = 0, visible = true, paused = false, t0 = 0, last = 0, ok = false;

  function init() {
    c = document.getElementById('heroGL');
    if (!c) return false;
    try {
      gl = c.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' });
      if (!gl) return false;
      var sh = function (t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, DOT.shaders.vertex));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, DOT.shaders.fragment('mandelbulb')));
      gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      loc = { res: gl.getUniformLocation(prog, 'uRes'), time: gl.getUniformLocation(prog, 'uTime'), iter: gl.getUniformLocation(prog, 'uIter'), k: gl.getUniformLocation(prog, 'uK') };
    } catch (e) { return false; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(c);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    c.parentNode.classList.add('live3d');
    ok = true;
    return true;
  }

  function sizeIt() {
    var r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(r.width * dpr * 0.8), h = Math.round(r.height * dpr * 0.8);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  function frame(now) {
    raf = 0;
    if (!ok || paused || !visible || document.hidden || (DOT.settings && !DOT.settings.get('hero3d'))) return;
    if (!t0) t0 = now;
    if (now - last >= 40) {             // ~24 FPS cap
      last = now; sizeIt();
      gl.viewport(0, 0, c.width, c.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(loc.res, c.width, c.height); gl.uniform1f(loc.time, 3 + (now - t0) / 1000);
      gl.uniform1i(loc.iter, 72); gl.uniform1f(loc.k, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
  }

  function start() { if (ok && !raf) raf = requestAnimationFrame(frame); }
  function pause(p) { paused = p; if (!p) start(); }
  function refresh() { var on = DOT.settings ? DOT.settings.get('hero3d') : true; c && c.parentNode.classList.toggle('live3d', ok && on); if (on) start(); }

  return { init: function () { if (init()) start(); }, pause: pause, refresh: refresh };
})();
