/* =========================================================
   DOTest — Device detection engine
   يقرأ كل مواصفات الجهاز اللي يسمح فيها المتصفح
   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.detect = (function () {
  var u = DOT.u, db = DOT.db;

  /* ---------- GPU via WebGL ---------- */
  function webglInfo() {
    var r = {};
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2'); r.webgl2 = !!gl;
      if (!gl) gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return r;
      r.webgl = true;
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      r.vendorRaw = (ext && gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) || gl.getParameter(gl.VENDOR);
      r.renderer = (ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER);
      r.version = gl.getParameter(gl.VERSION);
      r.glsl = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
      r.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      r.maxRB = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      var vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS); r.maxVP = vp ? vp[0] + ' × ' + vp[1] : null;
      r.ext = (gl.getSupportedExtensions() || []).length;
      r.texUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
      r.vAttr = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      r.fragUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
      if (r.webgl2) { r.samples = gl.getParameter(gl.MAX_SAMPLES); r.drawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS); r.max3D = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE); }
      var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) r.aniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      var p = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT); r.highp = !!(p && p.precision > 0);
      r.float32 = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('OES_texture_float'));
      var lose = gl.getExtension('WEBGL_lose_context'); lose && lose.loseContext();
    } catch (e) { }
    return r;
  }

  /* Clean renderer strings like "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x2503) Direct3D11 vs_5_0 ps_5_0, D3D11)" */
  function cleanGPU(s) {
    if (!s) return '';
    var m = s.match(/^ANGLE \((.*)\)$/);
    if (m) { var p = m[1].split(', '); s = p.length >= 2 ? p[1] : p[0]; }
    var vk = s.match(/^Vulkan [\d.]+ \((.*)\)$/); if (vk) s = vk[1];
    s = s.replace(/^ANGLE Metal Renderer:\s*/i, '')
      .replace(/\(0x[0-9a-f]+\)/gi, '')
      .replace(/\s*Direct3D.*$/i, '').replace(/\s*\bOpenGL.*$/i, '').replace(/\s*vs_\d.*$/i, '')
      .replace(/\/PCIe\/SSE2|\/SSE2/gi, '').replace(/, or similar/i, '')
      .replace(/\((TM|R)\)/gi, '').replace(/Adreno\s*\(TM\)/i, 'Adreno')
      .replace(/Mesa\s+/i, '').replace(/\s*\(.*?LLVM.*?\)/i, '')
      .replace(/\s+/g, ' ').trim();
    return s;
  }

  function gpuVendor(name, raw) {
    var s = (name + ' ' + (raw || '')).toLowerCase();
    if (/nvidia|geforce|rtx|gtx|quadro|tegra/.test(s)) return 'NVIDIA';
    if (/amd|radeon|ati /.test(s)) return 'AMD';
    if (/intel|iris|uhd|arc/.test(s)) return 'Intel';
    if (/apple/.test(s)) return 'Apple';
    if (/adreno|qualcomm/.test(s)) return 'Qualcomm';
    if (/mali|immortalis|arm/.test(s)) return 'ARM';
    if (/xclipse/.test(s)) return 'Samsung (AMD RDNA)';
    if (/powervr|imagination|img /.test(s)) return 'Imagination';
    if (/maleoon/.test(s)) return 'Huawei';
    if (/swiftshader|llvmpipe|software|basic render/.test(s)) return 'Software';
    return raw ? cleanGPU(raw) : null;
  }

  function gpuKind(name) {
    var s = name || '';
    if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(s)) return 'gk_soft';
    if (/GeForce|RTX|GTX|Quadro|Radeon (RX|Pro|R9|R7|HD \d{4})|Arc\s*\(?.*?A\d{3}|Arc A\d{3}|Radeon\s+\d{3,4}\s?XT/i.test(s) && !/Graphics$|\d{3}M$/i.test(s)) return 'gk_dedicated';
    if (/Adreno|Mali|Immortalis|Xclipse|PowerVR|Apple|Maleoon|Tegra/i.test(s)) return 'gk_soc';
    if (/Intel|Radeon.*Graphics|Radeon\s*\d{3}M|Vega/i.test(s)) return 'gk_integrated';
    return null;
  }

  /* ---------- WebGPU adapter ---------- */
  function webgpuInfo() {
    var r = { supported: !!navigator.gpu };
    if (!navigator.gpu) return Promise.resolve(r);
    return u.timeout(navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }), 2500, null).then(function (a) {
      if (!a) { r.adapter = false; return r; }
      r.adapter = true; r.fallback = !!a.isFallbackAdapter;
      r.features = a.features ? a.features.size : 0;
      r.f16 = a.features && a.features.has && a.features.has('shader-f16');
      if (a.limits) { r.maxTex = a.limits.maxTextureDimension2D; r.maxWG = a.limits.maxComputeInvocationsPerWorkgroup; r.maxBuf = a.limits.maxBufferSize; r.maxStorage = a.limits.maxStorageBufferBindingSize; }
      var info = a.info;
      var p = info ? Promise.resolve(info) : (a.requestAdapterInfo ? u.timeout(a.requestAdapterInfo(), 1500, null) : Promise.resolve(null));
      return p.then(function (i) { if (i) { r.vendor = i.vendor; r.arch = i.architecture; r.desc = i.description; r.device = i.device; r.subgroup = i.subgroupMaxSize; } return r; }).catch(function () { return r; });
    }).catch(function () { return r; });
  }

  /* ---------- Refresh rate (requestAnimationFrame) ---------- */
  function refreshRate() {
    return new Promise(function (res) {
      var ts = [], done = false;
      function fin(v) { if (!done) { done = true; res(v); } }
      setTimeout(function () { fin(60); }, 3500);
      function f(t) {
        ts.push(t);
        if (ts.length < 100) return requestAnimationFrame(f);
        var d = []; for (var i = 15; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
        d.sort(function (a, b) { return a - b; });
        var mid = d.slice(Math.floor(d.length * 0.3), Math.floor(d.length * 0.7));
        var hz = 1000 / u.avg(mid);
        fin(db.refreshRates.reduce(function (a, b) { return Math.abs(b - hz) < Math.abs(a - hz) ? b : a; }));
      }
      requestAnimationFrame(f);
    });
  }

  /* ---------- Hardware video decoding ---------- */
  function codecs() {
    var list = [['H.264', 'video/mp4; codecs="avc1.640028"'], ['HEVC', 'video/mp4; codecs="hvc1.1.6.L120.90"'], ['VP9', 'video/webm; codecs="vp09.00.40.08"'], ['AV1', 'video/mp4; codecs="av01.0.08M.08"']];
    var v = document.createElement('video');
    return Promise.all(list.map(function (c) {
      var can = false;
      try { can = (window.MediaSource && MediaSource.isTypeSupported(c[1])) || !!v.canPlayType(c[1]); } catch (e) { }
      if (!can) return { n: c[0], ok: false };
      if (!navigator.mediaCapabilities) return { n: c[0], ok: true };
      return u.timeout(navigator.mediaCapabilities.decodingInfo({ type: 'media-source', video: { contentType: c[1], width: 1920, height: 1080, bitrate: 8e6, framerate: 30 } }).then(function (i) { return { n: c[0], ok: i.supported, hw: i.powerEfficient }; }).catch(function () { return { n: c[0], ok: true }; }), 1500, { n: c[0], ok: true });
    }));
  }

  function wasmSimd() {
    try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { return false; }
  }

  /* ---------- OS ---------- */
  function osInfo(ua, ch, isIPhone, isIPad) {
    var os = null, v = '', est = false;
    var safV = (ua.match(/Version\/(\d+(?:\.\d+)?)/) || [])[1];
    if (/HarmonyOS|OpenHarmony/i.test(ua)) { os = 'HarmonyOS'; v = (ua.match(/(?:HarmonyOS|OpenHarmony)[ \/]?([\d.]+)/i) || [])[1] || ''; }
    else if (isIPhone || isIPad) {
      os = isIPad ? 'iPadOS' : 'iOS';
      var m = ua.match(/OS (\d+)_(\d+)(?:_(\d+))?/); v = m ? m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '') : '';
      // iOS 26+ freezes the OS token at 18.x — Safari version is more accurate
      if (safV && parseFloat(safV) >= 26 && parseFloat(safV) > parseFloat(v || 0)) v = safV;
    }
    else if (/Android/i.test(ua) || ch.platform === 'Android') { os = 'Android'; v = ch.platformVersion || (ua.match(/Android ([\d.]+)/) || [])[1] || ''; }
    else if (/Windows/.test(ua) || ch.platform === 'Windows') {
      os = 'Windows';
      if (ch.platformVersion) { var pv = parseInt(ch.platformVersion, 10); v = pv >= 13 ? '11' : pv > 0 ? '10' : '7 / 8.1'; }
      else { var nt = (ua.match(/Windows NT ([\d.]+)/) || [])[1]; v = { '10.0': '10 / 11', '6.3': '8.1', '6.2': '8', '6.1': '7' }[nt] || nt || ''; est = nt === '10.0'; }
      if (/ARM|aarch64/i.test(ua) || ch.architecture === 'arm') v += ' (ARM)';
    }
    else if (/CrOS/.test(ua) || ch.platform === 'Chrome OS') { os = 'ChromeOS'; v = ch.platformVersion || ''; }
    else if (/Macintosh|Mac OS X/.test(ua) || ch.platform === 'macOS') {
      os = 'macOS';
      if (ch.platformVersion) v = ch.platformVersion.split('.').slice(0, 2).join('.');
      else { v = '10.15+'; est = true; } // Safari & Firefox freeze this value
    }
    else if (/PlayStation/i.test(ua)) os = 'PlayStation';
    else if (/Xbox/i.test(ua)) os = 'Xbox';
    else if (/Tizen/i.test(ua)) { os = 'Tizen'; v = (ua.match(/Tizen ([\d.]+)/) || [])[1] || ''; }
    else if (/Web0S|webOS/i.test(ua)) os = 'webOS';
    else if (/Linux/.test(ua) || ch.platform === 'Linux') { os = 'Linux'; var d = ua.match(/(Ubuntu|Fedora|Debian|Arch|Manjaro|Mint)/i); if (d) v = d[1]; }
    return { os: os, v: v, est: est };
  }

  /* ---------- Browser ---------- */
  function browserInfo(ua, ch) {
    var b = null, v = '';
    if (navigator.brave) b = 'Brave';
    var fl = (ch.fullVersionList || []).filter(function (x) { return !/Not.?A.?Brand|Chromium/i.test(x.brand); });
    var pref = ['Microsoft Edge', 'Opera', 'Opera GX', 'Samsung Internet', 'Brave', 'Vivaldi', 'YaBrowser', 'Google Chrome'];
    fl.sort(function (a, c) { return ((pref.indexOf(a.brand) + 99) % 99) - ((pref.indexOf(c.brand) + 99) % 99); });
    if (fl[0]) { b = b || fl[0].brand.replace('Google ', '').replace('Microsoft ', ''); v = fl[0].version; }
    if (!b || !v) {
      var R = [[/EdgA?\/([\d.]+)|EdgiOS\/([\d.]+)/, 'Edge'], [/OPR\/([\d.]+)|OPX\/([\d.]+)/, 'Opera'], [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
        [/YaBrowser\/([\d.]+)/, 'Yandex'], [/Vivaldi\/([\d.]+)/, 'Vivaldi'], [/UCBrowser\/([\d.]+)/, 'UC Browser'], [/HuaweiBrowser\/([\d.]+)/, 'Huawei Browser'],
        [/MiuiBrowser\/([\d.]+)/, 'Mi Browser'], [/DuckDuckGo\/([\d.]+)|Ddg\/([\d.]+)/, 'DuckDuckGo'], [/OculusBrowser\/([\d.]+)/, 'Meta Quest Browser'],
        [/(?:Firefox|FxiOS)\/([\d.]+)/, 'Firefox'], [/CriOS\/([\d.]+)/, 'Chrome'], [/Chrome\/([\d.]+)/, 'Chrome'], [/Version\/([\d.]+).*Safari/, 'Safari']];
      for (var i = 0; i < R.length; i++) { var m = ua.match(R[i][0]); if (m) { b = b || R[i][1]; v = v || m[1] || m[2]; break; } }
    }
    var inApp = (ua.match(/(Instagram|FBAN|FBAV|Snapchat|TikTok|musical_ly|Twitter|LinkedInApp|Line\/)/i) || [])[1];
    var engine = /Firefox|FxiOS/.test(ua) && !/iPhone|iPad|iPod/.test(ua) ? 'Gecko' : (/iPhone|iPad|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua))) ? 'WebKit' : 'Blink';
    var webview = /; wv\)/.test(ua) || (/iPhone|iPad/.test(ua) && !/Safari/.test(ua));
    return { b: b, v: v, engine: engine, inApp: inApp, webview: webview };
  }

  function chipFromGPU(g) {
    if (!g) return null;
    var m = g.match(/Adreno.*?(\d{3}L?)/i);
    if (m) return db.adreno[m[1]] || ('Qualcomm Snapdragon (Adreno ' + m[1] + ')');
    var lists = [db.armGpus, db.pcGpus];
    for (var l = 0; l < lists.length; l++) for (var i = 0; i < lists[l].length; i++) {
      var r = lists[l][i], mm = g.match(r[0]);
      if (mm) return typeof r[1] === 'function' ? r[1](mm) : r[1];
    }
    return null;
  }

  function samsungName(model) {
    for (var i = 0; i < db.samsung.length; i++) {
      var e = db.samsung[i], m = model.match(e[0]);
      if (!m) continue;
      if (typeof e[1] === 'function') return e[1](m);
      var suf = e[2] ? e[2][model.charAt(6)] : '';
      return e[1] + (suf || '');
    }
    return null;
  }
  function brandOf(model) {
    for (var i = 0; i < db.brands.length; i++) if (db.brands[i][0].test(model)) return db.brands[i][1];
    return '';
  }

  /* =================== MAIN =================== */
  function collect() {
    var ua = navigator.userAgent, nav = navigator, ch = {};
    var chP = nav.userAgentData && nav.userAgentData.getHighEntropyValues
      ? u.timeout(nav.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'architecture', 'bitness', 'fullVersionList', 'formFactors', 'wow64']), 1500, {}).catch(function () { return {}; })
      : Promise.resolve({});

    var batP = nav.getBattery ? u.timeout(nav.getBattery(), 1200, null).catch(function () { return null; }) : Promise.resolve(null);
    var storP = nav.storage && nav.storage.estimate ? u.timeout(nav.storage.estimate(), 1200, null).catch(function () { return null; }) : Promise.resolve(null);

    return Promise.all([chP, webgpuInfo(), refreshRate(), batP, storP, codecs()]).then(function (R) {
      ch = R[0] || {}; var wg = R[1], hz = R[2], bat = R[3], stor = R[4], cods = R[5];
      if (nav.userAgentData) { ch.platform = nav.userAgentData.platform; ch.mobile = nav.userAgentData.mobile; }
      var gi = webglInfo();
      var touch = nav.maxTouchPoints || 0;
      var isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
      var isIPhone = /iPhone|iPod/.test(ua);
      var isAndroid = /Android/i.test(ua) || ch.platform === 'Android';
      var sw = screen.width, sh = screen.height, dpr = window.devicePixelRatio || 1;
      var minS = Math.min(sw, sh), maxS = Math.max(sw, sh);
      var O = osInfo(ua, ch, isIPhone, isIPad), B = browserInfo(ua, ch);

      /* ---- GPU name: prefer WebGL unmasked, enrich with WebGPU ---- */
      var gpuName = cleanGPU(gi.renderer);
      if ((!gpuName || /^(Apple GPU|Mali-?G?|Adreno|WebKit WebGL|ANGLE)$/i.test(gpuName)) && wg.desc) gpuName = wg.desc;
      var gpuV = gpuVendor(gpuName, wg.vendor || gi.vendorRaw);
      var gpuK = gpuKind(gpuName);

      /* ---- Device type ---- */
      var type = 'dt_desktop', typeIc = 'desktop';
      var isTablet = isIPad || (ch.formFactors || []).indexOf('Tablet') >= 0 || (isAndroid && (!/Mobile/i.test(ua) || minS >= 600)) || /Tablet|Kindle|Silk|PlayBook/i.test(ua);
      if (isTablet) { type = 'dt_tablet'; typeIc = 'tablet'; }
      else if (isIPhone || isAndroid || ch.mobile || /Mobi|Phone/i.test(ua)) { type = 'dt_phone'; typeIc = 'phone'; }
      else if (bat && (bat.charging === false || bat.level < 1 || (isFinite(bat.dischargingTime) && bat.dischargingTime > 0) || (bat.chargingTime > 0 && isFinite(bat.chargingTime)))) { type = 'dt_laptop'; typeIc = 'laptop'; }
      else if (/Macintosh/.test(ua) && !isIPad) { type = 'dt_mac'; typeIc = 'laptop'; }
      else if (gpuK === 'gk_integrated') { type = 'dt_pc'; typeIc = 'laptop'; }
      if (/SMART-TV|SmartTV|Tizen|Web0S|webOS|AFT[A-Z]|BRAVIA|CrKey|GoogleTV|Android TV|HbbTV/i.test(ua)) { type = 'dt_tv'; typeIc = 'tv'; }
      if (/PlayStation|Xbox|Nintendo/i.test(ua)) { type = 'dt_console'; typeIc = 'console'; }
      if (/OculusBrowser|Quest|Pico|Vision/i.test(ua) && !isIPhone) { if (/OculusBrowser|Quest|Pico/i.test(ua)) { type = 'dt_vr'; typeIc = 'vr'; } }

      /* ---- Brand / model / chip ---- */
      var brand = '', model = '', name = '', est = false, chip = chipFromGPU(gpuName), chipEst = true;
      if (isIPhone) {
        brand = 'Apple';
        var key = minS + 'x' + maxS + '@' + Math.round(dpr), e = db.iphones[key];
        if (e) { model = e[0]; chip = e[1]; est = true; }
        name = model || 'iPhone';
      } else if (isIPad) {
        brand = 'Apple'; name = 'iPad';
        for (var i = 0; i < db.ipads.length; i++) if (minS >= db.ipads[i][0]) { model = db.ipads[i][1]; chip = db.ipads[i][2]; break; }
        est = true;
      } else if (isAndroid || /HarmonyOS/i.test(ua)) {
        model = (ch.model || (ua.match(/Android [\d.]+;(?: [a-z]{2}[-_][a-z]{2};)? ([^;)]+?)(?: Build|\)|;)/i) || [])[1] || '').trim();
        if (model === 'K' || model === 'Mobile') model = '';
        brand = brandOf(model);
        var friendly = brand === 'Samsung' ? samsungName(model) : null;
        if (model) name = (brand && model.toLowerCase().indexOf(brand.toLowerCase()) < 0 ? brand + ' ' : '') + (friendly ? friendly + ' (' + model + ')' : model);
        else name = (O.os || 'Android') + ' ' + (isTablet ? 'Tablet' : 'Phone');
      } else if (/Macintosh/.test(ua)) {
        brand = 'Apple';
        if (chip && /^Apple M/.test(chip)) { name = 'Mac · ' + chip; chipEst = false; }
        else if (/Intel/i.test(gpuName)) { name = 'Mac (Intel)'; }
        else name = 'Mac';
      } else {
        name = null; // localized later: "Windows PC" etc.
      }
      if (chip && /^Apple M/.test(chip) && /Macintosh/.test(ua)) chipEst = false;

      /* ---- CPU ---- */
      var cores = nav.hardwareConcurrency || 0;
      var arch = null;
      if (ch.architecture) arch = (ch.architecture === 'arm' ? 'ARM' : ch.architecture === 'x86' ? 'x86' : ch.architecture) + (ch.bitness ? ' ' + ch.bitness + '-bit' : '');
      else if (isIPhone || isIPad || isAndroid) arch = 'ARM 64-bit';
      else if (/Macintosh/.test(ua) && chip && /^Apple/.test(chip)) arch = 'ARM 64-bit (Apple Silicon)';
      else if (/Win64|x64|x86_64|amd64|WOW64/i.test(ua)) arch = 'x86-64';
      else if (/aarch64|arm64/i.test(ua)) arch = 'ARM 64-bit';
      else if (/Linux/.test(ua) && /x86_64/.test(ua)) arch = 'x86-64';

      var mem = nav.deviceMemory || null;
      var heap = (performance && performance.memory) ? performance.memory.jsHeapSizeLimit : null;

      /* ---- extras ---- */
      var con = nav.connection || nav.mozConnection || nav.webkitConnection;
      var gamut = u.mq('(color-gamut: rec2020)') ? 'Rec.2020' : u.mq('(color-gamut: p3)') ? 'Display P3' : 'sRGB';
      var hdr = u.mq('(dynamic-range: high)');
      var codecStr = cods.filter(function (c) { return c.ok; }).map(function (c) { return c.n + (c.hw ? ' (HW)' : ''); }).join(' · ');

      var info = {
        ua: ua, name: name, brand: brand, model: model, est: est, type: type, typeIc: typeIc,
        os: O.os, osv: O.v, osEst: O.est, browser: B.b, browserV: B.v, engine: B.engine,
        cores: cores, arch: arch, mem: mem, heap: heap, chip: chip, chipEst: chipEst,
        gpuName: gpuName, gpuVendor: gpuV, gpuKind: gpuK, gl: gi, wg: wg,
        hz: hz, dpr: dpr, sw: sw, sh: sh, physW: Math.round(sw * dpr), physH: Math.round(sh * dpr),
        isMobile: isIPhone || isIPad || isAndroid || type === 'dt_phone' || type === 'dt_tablet', isIOS: isIPhone || isIPad,
        touch: touch, bat: bat ? { level: Math.round(bat.level * 100), charging: bat.charging } : null
      };

      var Y = function (b) { return { k: b ? 'yes' : 'no' }; };
      var S = function (b) { return { k: b ? 'supported' : 'notSupported' }; };

      info.groups = [
        { t: 'g_device', ic: typeIc, rows: [
          { k: 'r_name', v: name || { k: 'pcName', a: [O.os || ''] }, est: est },
          { k: 'r_type', v: { k: type } },
          { k: 'r_brand', v: brand || null },
          { k: 'r_model', v: model || null, est: est && !!model },
          { k: 'r_touch', v: touch > 0 ? { k: 'touchYes', a: [touch] } : { k: 'no' } },
          { k: 'r_pointer', v: u.mq('(pointer: coarse)') ? { k: 'ptTouch' } : u.mq('(pointer: fine)') ? { k: 'ptMouse' } : null }
        ]},
        { t: 'g_cpu', ic: 'cpu', rows: [
          { k: 'r_chip', v: chip, est: chip && chipEst },
          { k: 'r_threads', v: cores ? cores + ' Threads' : null },
          { k: 'r_arch', v: arch },
          { k: 'r_ram', v: mem ? (mem >= 8 && !info.isMobile ? { k: 'ramMore', a: [mem] } : mem + ' GB') : null, est: mem >= 8 },
          { k: 'r_heap', v: heap ? u.GB(heap) : null },
          { k: 'r_workers', v: S(!!window.Worker) },
          { k: 'r_wasm', v: typeof WebAssembly === 'object' ? (wasmSimd() ? 'WASM + SIMD' : 'WASM') : { k: 'notSupported' } },
          { k: 'r_sab', v: S(typeof SharedArrayBuffer !== 'undefined') }
        ]},
        { t: 'g_gpu', ic: 'gpu', rows: [
          { k: 'r_gpu', v: gpuName || null },
          { k: 'r_gpuVendor', v: gpuV },
          { k: 'r_gpuKind', v: gpuK ? { k: gpuK } : null },
          { k: 'r_gpuArch', v: wg.arch || null },
          { k: 'r_gpuRaw', v: gi.renderer || null },
          { k: 'r_webgl', v: gi.webgl2 ? 'WebGL 2.0' : gi.webgl ? 'WebGL 1.0' : { k: 'notSupported' } },
          { k: 'r_webgpu', v: wg.adapter ? { k: wg.fallback ? 'wgSoft' : 'supported' } : wg.supported ? { k: 'wgNoAdapter' } : { k: 'notSupported' } },
          { k: 'r_glsl', v: gi.glsl || null },
          { k: 'r_maxTex', v: gi.maxTex ? gi.maxTex + ' px' : null },
          { k: 'r_maxVP', v: gi.maxVP || null },
          { k: 'r_msaa', v: gi.samples ? gi.samples + '×' : null },
          { k: 'r_aniso', v: gi.aniso ? gi.aniso + '×' : null },
          { k: 'r_texUnits', v: gi.texUnits || null },
          { k: 'r_glExt', v: gi.ext || null },
          { k: 'r_f16', v: wg.adapter ? S(!!wg.f16) : null },
          { k: 'r_wgInv', v: wg.maxWG || null },
          { k: 'r_wgBuf', v: wg.maxBuf ? u.GB(wg.maxBuf) || u.MB(wg.maxBuf) : null }
        ]},
        { t: 'g_screen', ic: 'screen', rows: [
          { k: 'r_physRes', v: info.physW + ' × ' + info.physH },
          { k: 'r_cssRes', v: sw + ' × ' + sh },
          { k: 'r_dpr', v: dpr.toFixed(2) + '×' },
          { k: 'r_hz', v: hz + ' Hz', live: true },
          { k: 'r_depth', v: screen.colorDepth + '-bit' },
          { k: 'r_gamut', v: gamut },
          { k: 'r_hdr', v: S(hdr) },
          { k: 'r_orient', v: { k: ((screen.orientation && screen.orientation.type) || (sh > sw ? 'portrait' : 'landscape')).indexOf('portrait') >= 0 ? 'portrait' : 'landscape' } },
          { k: 'r_window', v: innerWidth + ' × ' + innerHeight },
          { k: 'r_multi', v: screen.isExtended != null ? Y(screen.isExtended) : null }
        ]},
        { t: 'g_system', ic: 'system', rows: [
          { k: 'r_os', v: O.os ? O.os + (O.v ? ' ' + O.v : '') : null, est: O.est },
          { k: 'r_browser', v: B.b ? B.b + (B.v ? ' ' + B.v : '') : null },
          { k: 'r_engine', v: B.engine },
          { k: 'r_inapp', v: B.inApp ? B.inApp : B.webview ? 'WebView' : null },
          { k: 'r_lang', v: (nav.languages && nav.languages.length ? nav.languages.slice(0, 3).join(', ') : nav.language) || null },
          { k: 'r_tz', v: (Intl.DateTimeFormat().resolvedOptions().timeZone) || null },
          { k: 'r_dark', v: Y(u.mq('(prefers-color-scheme: dark)')) },
          { k: 'r_pwa', v: Y(u.mq('(display-mode: standalone)') || nav.standalone === true) }
        ]},
        { t: 'g_power', ic: 'power', rows: [
          { k: 'r_battery', v: bat ? { k: bat.charging ? 'batCharging' : 'batLevel', a: [Math.round(bat.level * 100)] } : null, live: !!bat },
          { k: 'r_net', v: con && con.effectiveType ? con.effectiveType.toUpperCase() + (con.type && con.type !== 'unknown' ? ' · ' + con.type : '') : null },
          { k: 'r_down', v: con && con.downlink ? con.downlink + ' Mbps' : null, est: true },
          { k: 'r_rtt', v: con && con.rtt != null ? con.rtt + ' ms' : null },
          { k: 'r_saver', v: con && con.saveData != null ? Y(con.saveData) : null },
          { k: 'r_storage', v: stor && stor.quota ? u.GB(stor.quota) : null },
          { k: 'r_codecs', v: codecStr || null }
        ]},
        { t: 'g_features', ic: 'features', rows: [
          { k: 'r_webxr', v: S(!!nav.xr) },
          { k: 'r_webcodecs', v: S(!!window.VideoDecoder) },
          { k: 'r_offscreen', v: S(typeof OffscreenCanvas !== 'undefined') },
          { k: 'r_gamepad', v: S(!!nav.getGamepads) },
          { k: 'r_bt', v: S(!!nav.bluetooth) },
          { k: 'r_usb', v: S(!!nav.usb) },
          { k: 'r_vibrate', v: S(!!nav.vibrate) },
          { k: 'r_wakelock', v: S(!!nav.wakeLock) }
        ]}
      ];
      return info;
    });
  }

  return { collect: collect, cleanGPU: cleanGPU, chipFromGPU: chipFromGPU };
})();
