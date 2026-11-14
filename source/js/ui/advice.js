/* =========================================================
   DOTest — Smart advice   © Ahmed Al-Zahrani
   Turns results + device info into practical tips.
   Each rule: [condition, level(good|warn|bad|info), i18n key, vars]
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.advice = function (r, I, net) {
  var out = [], add = function (lvl, key, vars) { out.push({ lvl: lvl, key: key, vars: vars || {} }); };
  I = I || {};

  /* device / browser */
  if (I.gpuKind === 'gk_soft') add('bad', 'adv_softgpu');
  if (I.wg && !I.wg.adapter && I.engine === 'Blink') add('info', 'adv_webgpu');
  if (I.hz && I.hz <= 30) add('warn', 'adv_lowpower', { hz: I.hz });
  if (I.bat && !I.bat.charging && I.bat.level < 30) add('warn', 'adv_battery', { n: I.bat.level });

  if (r) {
    /* CPU */
    if (r.cpuS && r.cpuM && r.cpuM.threads > 2) {
      var scale = r.cpuM.score / r.cpuS.score, eff = scale / r.cpuM.threads;
      if (eff < 0.35) add('warn', 'adv_cpuscale', { x: scale.toFixed(1), n: r.cpuM.threads });
      else add('good', 'adv_cpuscale_ok', { x: scale.toFixed(1) });
    }
    if (r.cpuM && r.cpuM.perThread && r.cpuM.perThread.length > 1) {
      var pt = r.cpuM.perThread.slice().sort(function (a, b) { return a - b; });
      if (pt[0] / pt[pt.length - 1] < 0.55) add('info', 'adv_hybrid');
    }
    /* GPU */
    if (r.gpu) {
      if (r.gpu.stab < 60) add('warn', 'adv_fpsunstable', { n: Math.round(r.gpu.stab) });
      else if (r.gpu.stab >= 85) add('good', 'adv_fpsstable');
      if (r.refresh && r.gpu.avg >= r.refresh * 0.95 && r.gpu.avgK > 4) add('good', 'adv_gpuheadroom', { k: Math.round(r.gpu.avgK) });
      if (r.gpu.avg < 20) add('warn', 'adv_gpuweak');
    }
    /* RAM */
    if (r.ram) {
      if (r.ram.failed) add('warn', 'adv_ramfail');
      if (r.ram.lat > 150) add('info', 'adv_ramlat', { n: Math.round(r.ram.lat) });
    }
    /* Stress */
    if (r.stress) {
      if (r.stress.throttle >= 25) add('bad', 'adv_throttle', { n: Math.round(r.stress.throttle) });
      else if (r.stress.throttle >= 10) add('warn', 'adv_throttle_mid', { n: Math.round(r.stress.throttle) });
      else add('good', 'adv_cool');
      if (r.stress.stability < 75) add('warn', 'adv_unstable');
    }
  }

  /* Network */
  if (net) {
    if (net.grade && 'CDF'.indexOf(net.grade) >= 0) add('warn', 'adv_bloat', { g: net.grade });
    if (net.ping && net.ping.jitter > 20) add('warn', 'adv_jitter', { n: Math.round(net.ping.jitter) });
    if (net.ping && net.ping.med > 100) add('warn', 'adv_ping', { n: Math.round(net.ping.med) });
    if (net.down && net.up && net.up.mbps < net.down.mbps * 0.1) add('info', 'adv_asym');
  }

  /* Hardware agent */
  var A = DOT.agent && DOT.agent.get();
  if (A && !A.sample) {
    if (A.ram && A.ram.modules && A.ram.modules.length === 1 && A.platform !== 'mac') add('info', 'adv_singlechannel');
    if (A.ram && A.ram.modules && A.ram.modules.some(function (m) { return m.configuredMHz && m.speedMHz && m.configuredMHz < m.speedMHz * 0.85; })) add('info', 'adv_xmp');
    if (A.battery && A.battery.healthPercent != null && A.battery.healthPercent < 80) add('warn', 'adv_bathealth', { n: A.battery.healthPercent });
    (A.volumes || []).forEach(function (v) { if (v.sizeBytes && v.freeBytes / v.sizeBytes < 0.1) add('warn', 'adv_diskfull', { d: v.drive }); });
    (A.disks || []).forEach(function (d) { if (d.health && !/Healthy|OK|Verified/i.test(d.health)) add('bad', 'adv_diskhealth', { d: d.model }); });
    if (A.os && A.os.uptimeHours > 24 * 14) add('info', 'adv_uptime', { n: Math.round(A.os.uptimeHours / 24) });
    (A.gpu || []).forEach(function (g) { if (g.driverDate && (Date.now() - new Date(g.driverDate)) / 864e5 > 365) add('info', 'adv_driver', { g: g.name }); });
  }
  return out;
};
