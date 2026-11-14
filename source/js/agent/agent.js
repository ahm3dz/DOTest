/* =========================================================
   DOTest — Hardware Agent importer   © Ahmed Al-Zahrani
   Reads DOTest-Report.json (Windows / macOS / Linux agents),
   normalizes it, shows every detail incl. serials, MAC & IPs.
   Everything stays in this browser — nothing is uploaded.
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.agent = (function () {
  var u = DOT.u, $ = u.$, t = function (k, v) { return DOT.t(k, v); };
  var data = u.store.get('agent', null), reveal = false;

  /* ---------- macOS system_profiler → common model ---------- */
  function fromMac(r) {
    var sp = r.sp || {}, sc = r.sysctl || {};
    var hw = (sp.SPHardwareDataType || [])[0] || {}, sw = (sp.SPSoftwareDataType || [])[0] || {};
    var memTop = (sp.SPMemoryDataType || [])[0] || {};
    var bytes = function (s) { var m = String(s || '').match(/([\d.]+)\s*(GB|MB|TB)/i); return m ? Math.round(parseFloat(m[1]) * { MB: 1 << 20, GB: 1 << 30, TB: Math.pow(2, 40) }[m[2].toUpperCase()]) : null; };
    var mods = (memTop._items || []).map(function (m) { return { slot: m._name, capacityBytes: bytes(m.dimm_size), speedMHz: parseInt(m.dimm_speed) || null, type: m.dimm_type, manufacturer: m.dimm_manufacturer, partNumber: m.dimm_part_number, serial: m.dimm_serial_number }; });
    if (!mods.length && memTop.dimm_type) mods = [{ slot: 'Unified', capacityBytes: sc.memBytes || bytes(hw.physical_memory), type: memTop.dimm_type, manufacturer: memTop.dimm_manufacturer }];
    var disks = [];
    ['SPNVMeDataType', 'SPSerialATADataType'].forEach(function (k) {
      (sp[k] || []).forEach(function (c) { (c._items || []).forEach(function (d) { disks.push({ model: d.device_model || d._name, sizeBytes: d.size_in_bytes, serial: d.device_serial, firmware: d.device_revision, bus: k === 'SPNVMeDataType' ? 'NVMe' : 'SATA', media: d.spsata_medium_type ? (/solid/i.test(d.spsata_medium_type) ? 'SSD' : 'HDD') : 'SSD', health: d.smart_status }); }); });
    });
    var pw = (sp.SPPowerDataType || []).filter(function (x) { return x.sppower_battery_health_info; })[0];
    var p = function (s) { return String(s || '').split(' @')[0]; };
    return {
      platform: 'mac', generated: r.generated,
      system: { name: sc.host || sw.local_host_name, manufacturer: 'Apple', model: hw.machine_name, family: hw.machine_model || sc.model, sku: hw.model_number, serial: hw.serial_number, uuid: hw.platform_UUID, type: /Book/i.test(hw.machine_name || '') ? 'Laptop' : 'Desktop' },
      os: { name: sw.os_version, build: sw.kernel_version, uptimeHours: sc.bootEpoch ? Math.round((Date.now() / 1000 - sc.bootEpoch) / 360) / 10 : null, user: sw.user_name || sc.user, arch: /Apple/.test(sc.cpu || hw.chip_type || '') ? 'arm64' : 'x86_64' },
      cpu: [{ name: hw.chip_type || sc.cpu || hw.cpu_type, manufacturer: /Apple/.test(hw.chip_type || '') ? 'Apple' : 'Intel', cores: sc.cores || null, threads: sc.threads || null, pcores: sc.pcores || null, ecores: sc.ecores || null, maxClockMHz: sc.freqHz ? Math.round(sc.freqHz / 1e6) : (parseFloat(hw.current_processor_speed) * 1000 || null), l2KB: sc.l2 ? sc.l2 / 1024 : null, l3KB: sc.l3 ? sc.l3 / 1024 : null }],
      ram: { totalBytes: sc.memBytes || bytes(hw.physical_memory), installedBytes: sc.memBytes || bytes(hw.physical_memory), modules: mods },
      gpu: (sp.SPDisplaysDataType || []).map(function (g) { var d = (g.spdisplays_ndrvs || [])[0] || {}; return { name: g.sppci_model || g._name, vendor: String(g.spdisplays_vendor || '').replace('sppci_vendor_', ''), cores: g.sppci_cores, vramBytes: bytes(g.spdisplays_vram || g.spdisplays_vram_shared), resolution: p(d._spdisplays_pixels || d._spdisplays_resolution), refreshHz: parseFloat((String(d._spdisplays_resolution || '').match(/@ ([\d.]+)Hz/) || [])[1]) || null }; }),
      motherboard: { manufacturer: 'Apple', product: sc.model || hw.machine_model, serial: hw.serial_number },
      bios: { vendor: 'Apple', version: hw.os_loader_version || hw.boot_rom_version, mode: 'UEFI / iBoot' },
      disks: disks,
      volumes: (sp.SPStorageDataType || []).map(function (v) { return { drive: v.mount_point, label: v._name, fs: v.file_system, sizeBytes: v.size_in_bytes, freeBytes: v.free_space_in_bytes }; }),
      network: (sp.SPNetworkDataType || []).filter(function (n) { return n.IPv4 || n.ip_address; }).map(function (n) { return { name: n._name + (n.interface ? ' (' + n.interface + ')' : ''), mac: n.Ethernet && (n.Ethernet['MAC Address'] || n.Ethernet.MACAddress), ipv4: (n.IPv4 && n.IPv4.Addresses) || n.ip_address || [], ipv6: (n.IPv6 && n.IPv6.Addresses) || [], gateway: n.IPv4 && n.IPv4.Router ? [n.IPv4.Router] : [], dns: (n.DNS && n.DNS.ServerAddresses) || [] }; }),
      monitors: [].concat.apply([], (sp.SPDisplaysDataType || []).map(function (g) { return (g.spdisplays_ndrvs || []).map(function (d) { return { manufacturer: d._spdisplays_display_vendor || (/built-in/.test(d.spdisplays_display_type || '') ? 'Apple' : null), model: d._name, serial: d['_spdisplays_display-serial-number'] || d.spdisplays_display_serial_number, year: d['_spdisplays_display-year'] }; }); })),
      battery: pw ? { name: pw.sppower_battery_model_info && pw.sppower_battery_model_info.sppower_battery_device_name, chargePercent: pw.sppower_battery_charge_info && pw.sppower_battery_charge_info.sppower_battery_state_of_charge, cycles: pw.sppower_battery_health_info.sppower_battery_cycle_count, healthPercent: parseFloat(pw.sppower_battery_health_info.sppower_battery_health_maximum_capacity) || null, serial: pw.sppower_battery_model_info && pw.sppower_battery_model_info.sppower_battery_serial_number } : null,
      audio: [].concat.apply([], (sp.SPAudioDataType || []).map(function (a) { return (a._items || []).map(function (x) { return x._name; }); }))
    };
  }

  function normalize(r) {
    if (!r || r.agent !== 'DOTest-Agent') throw new Error('bad');
    var n = r.platform === 'mac' ? fromMac(r) : r;
    ['cpu', 'gpu', 'disks', 'volumes', 'network', 'monitors', 'audio'].forEach(function (k) { if (!Array.isArray(n[k])) n[k] = n[k] ? [n[k]] : []; });
    n.ram = n.ram || {}; n.ram.modules = n.ram.modules || [];
    n.system = n.system || {}; n.os = n.os || {}; n.motherboard = n.motherboard || {}; n.bios = n.bios || {};
    n.platform = n.platform || r.platform; n.generated = n.generated || r.generated; n.sample = !!r.sample;
    return n;
  }

  function load(text) {
    var r = JSON.parse(String(text).replace(/^﻿/, ''));
    data = normalize(r);
    try { u.store.set('agent', data); } catch (e) { }
    render(); document.dispatchEvent(new CustomEvent('dot:agent'));
    u.toast(t('ag_loaded'));
  }

  /* ---------- rendering ---------- */
  var B = function (b) { return b ? u.GB(b) || u.MB(b) : null; };
  function sec(v) { return v ? '<span class="serial' + (reveal ? ' show' : '') + '">' + u.esc(v) + '</span>' : null; }
  function rows(list) {
    return list.filter(function (r) { return r[1] != null && r[1] !== '' && !(Array.isArray(r[1]) && !r[1].length); }).map(function (r) {
      var v = Array.isArray(r[1]) ? r[1].join(', ') : r[1];
      return '<div class="row"><span class="k">' + t(r[0]) + '</span><span class="v"><bdi>' + (r[2] ? v : u.esc(v)) + '</bdi></span></div>';
    }).join('');
  }
  function card(ic, title, html) { return html ? '<div class="card ig"><h4><span class="ic">' + ic + '</span>' + title + '</h4>' + html + '</div>' : ''; }

  function render() {
    var box = $('#agentOut'); if (!box) return;
    $('#agentClear').hidden = !data; $('#agentReveal').hidden = !data;
    if (!data) { box.innerHTML = ''; return; }
    var d = data, h = [];
    var s = d.system, o = d.os;
    h.push(card('🖥️', t('ag_system'), rows([['ag_pcname', s.name], ['r_brand', s.manufacturer], ['r_model', s.model], ['ag_family', s.family], ['ag_sku', s.sku], ['r_type', s.type], ['ag_serial', sec(s.serial), 1], ['ag_uuid', sec(s.uuid), 1], ['ag_chassis', sec(s.chassisSerial), 1]])));
    h.push(card('🪟', t('r_os'), rows([['ag_osname', o.name], ['ag_ver', [o.displayVersion, o.version].filter(Boolean).join(' · ')], ['ag_build', o.build ? o.build + (o.ubr ? '.' + o.ubr : '') : null], ['r_arch', o.arch], ['ag_install', o.installDate ? o.installDate.slice(0, 10) : null], ['ag_uptime', o.uptimeHours != null ? o.uptimeHours + ' h' : null], ['ag_user', o.user]])));
    d.cpu.forEach(function (c, i) {
      h.push(card('🧠', t('g_cpu') + (d.cpu.length > 1 ? ' #' + (i + 1) : ''), rows([['ag_cpuname', c.name], ['r_brand', c.manufacturer], ['ag_cores', c.cores], ['ag_threads', c.threads],
        ['ag_pe', c.pcores ? c.pcores + ' P + ' + c.ecores + ' E' : null], ['ag_maxclock', c.maxClockMHz ? (c.maxClockMHz / 1000).toFixed(2) + ' GHz' : null], ['ag_curclock', c.currentClockMHz ? (c.currentClockMHz / 1000).toFixed(2) + ' GHz' : null],
        ['ag_l2', c.l2KB ? u.MB(c.l2KB * 1024) : null], ['ag_l3', c.l3KB ? u.MB(c.l3KB * 1024) : null], ['ag_socket', c.socket], ['ag_virt', c.virtualization != null ? String(c.virtualization) : null], ['ag_load', c.loadPercent != null ? c.loadPercent + '%' : null], ['ag_procid', sec(c.processorId), 1], ['ag_serial', sec(c.serial), 1]])));
    });
    var r = d.ram;
    h.push(card('💾', t('r_ram'), rows([['ag_ramtotal', B(r.installedBytes || r.totalBytes)], ['ag_ramusable', B(r.totalBytes)], ['ag_slots', r.slots ? (r.modules.length + ' / ' + r.slots) : r.modules.length || null], ['ag_rammax', B(r.maxBytes)]]) +
      r.modules.map(function (m) {
        return '<div class="sub-item"><b>' + u.esc(m.slot || 'RAM') + '</b>' + rows([['ag_cap', B(m.capacityBytes)], ['ag_type', [m.type, m.formFactor].filter(Boolean).join(' · ')], ['ag_speed', m.speedMHz ? m.speedMHz + ' MT/s' + (m.configuredMHz && m.configuredMHz !== m.speedMHz ? ' (' + m.configuredMHz + ')' : '') : null], ['r_brand', m.manufacturer], ['ag_part', m.partNumber], ['ag_serial', sec(m.serial), 1], ['ag_volt', m.voltageMV ? (m.voltageMV / 1000).toFixed(2) + ' V' : null]]) + '</div>';
      }).join('')));
    d.gpu.forEach(function (g) {
      h.push(card('🎮', t('r_gpu'), rows([['ag_gpuname', g.name], ['r_gpuVendor', g.vendor], ['ag_vram', B(g.vramBytes)], ['ag_gcores', g.cores], ['ag_driver', g.driver], ['ag_drvdate', g.driverDate ? String(g.driverDate).slice(0, 10) : null], ['ag_res', g.resolution], ['r_hz', g.refreshHz ? g.refreshHz + ' Hz' : null]])));
    });
    var mb = d.motherboard, bi = d.bios;
    h.push(card('🧩', t('ag_board'), rows([['r_brand', mb.manufacturer], ['r_model', mb.product], ['ag_ver', mb.version], ['ag_serial', sec(mb.serial), 1], ['ag_bios', [bi.vendor, bi.version].filter(Boolean).join(' · ')], ['ag_biosdate', bi.date ? String(bi.date).slice(0, 10) : null], ['ag_bootmode', bi.mode], ['ag_secure', bi.secureBoot != null ? String(bi.secureBoot) : null], ['ag_tpm', d.tpm ? 'TPM ' + (d.tpm.version || '').split(',')[0] : null]])));
    if (d.disks.length || d.volumes.length) h.push(card('💽', t('ag_disks'), d.disks.map(function (x) {
      return '<div class="sub-item"><b>' + u.esc(x.model || 'Disk') + '</b>' + rows([['ag_cap', B(x.sizeBytes)], ['ag_type', [x.media, x.bus || x.interface].filter(Boolean).join(' · ')], ['ag_health', x.health], ['ag_fw', x.firmware], ['ag_serial', sec(x.serial), 1]]) + '</div>';
    }).join('') + d.volumes.map(function (v) {
      var used = v.sizeBytes ? (1 - v.freeBytes / v.sizeBytes) * 100 : 0;
      return '<div class="vol"><span class="en">' + u.esc(v.drive || '') + '</span> <small>' + u.esc([v.label, v.fs].filter(Boolean).join(' · ')) + '</small><div class="bar"><i style="width:' + used + '%;background:' + (used > 90 ? '#ff4d5e' : 'var(--cy)') + '"></i></div><small class="en">' + B(v.sizeBytes - v.freeBytes) + ' / ' + B(v.sizeBytes) + '</small></div>';
    }).join('')));
    if (d.network.length) h.push(card('🌐', t('ag_net'), d.network.map(function (n) {
      return '<div class="sub-item"><b>' + u.esc(n.name || '') + (n.conn ? ' · ' + u.esc(n.conn) : '') + '</b>' + rows([['ag_mac', sec(n.mac), 1], ['ag_ipv4', n.ipv4 && n.ipv4.length ? sec(n.ipv4.join(', ')) : null, 1], ['ag_ipv6', n.ipv6 && n.ipv6.length ? sec(n.ipv6.join(', ')) : null, 1], ['ag_mask', n.subnet], ['ag_gw', n.gateway], ['ag_dns', n.dns], ['ag_dhcp', n.dhcp != null ? String(n.dhcp) : null], ['ag_link', n.speedMbps ? n.speedMbps + ' Mbps' : null]]) + '</div>';
    }).join('')));
    if (d.monitors.length) h.push(card('🖼️', t('ag_monitors'), d.monitors.map(function (m) { return '<div class="sub-item"><b>' + u.esc(m.model || m.manufacturer || 'Monitor') + '</b>' + rows([['r_brand', m.manufacturer], ['ag_pcode', m.productCode], ['ag_year', m.year], ['ag_serial', sec(m.serial), 1]]) + '</div>'; }).join('')));
    if (d.battery) { var b = d.battery; h.push(card('🔋', t('r_battery'), rows([['r_model', b.name], ['tl_level', b.chargePercent != null ? b.chargePercent + '%' : null], ['ag_bhealth', b.healthPercent != null ? b.healthPercent + '%' : null], ['ag_design', b.designMWh ? (b.designMWh / 1000).toFixed(1) + ' Wh' : null], ['ag_fullcap', b.fullMWh ? (b.fullMWh / 1000).toFixed(1) + ' Wh' : null], ['ag_cycles', b.cycles], ['r_brand', b.manufacturer], ['ag_serial', sec(b.serial), 1]]))); }
    if (d.audio.length) h.push(card('🔊', t('ag_audio'), rows([['ag_devices', d.audio]])));
    box.innerHTML = (d.sample ? '<div class="warn">' + t('ag_sample') + '</div>' : '') + '<div class="ag-head mu">' + t('ag_from', { p: d.platform, d: (d.generated || '').replace('T', ' ') }) + '</div><div class="info-grid">' + h.join('') + '</div>';
  }

  /* Exact values the rest of the site can use */
  function summary() {
    if (!data || data.sample) return null;
    var c = data.cpu[0] || {}, g = (data.gpu.filter(function (x) { return !/Basic|Virtual|Remote|Meta|Parsec/i.test(x.name || ''); })[0]) || data.gpu[0] || {};
    return { cpu: c.name, cores: c.cores, threads: c.threads, ramBytes: data.ram.installedBytes || data.ram.totalBytes, gpu: g.name, vram: g.vramBytes, model: [data.system.manufacturer, data.system.model].filter(Boolean).join(' ') };
  }

  function bind() {
    $('#agentFile').addEventListener('change', function () { var f = this.files[0]; if (!f) return; f.text().then(function (x) { try { load(x); } catch (e) { u.toast(t('ag_bad')); } }); this.value = ''; });
    $('#agentPasteBtn').onclick = function () { var v = $('#agentPaste').value.trim(); if (!v) return; try { load(v); $('#agentPaste').value = ''; } catch (e) { u.toast(t('ag_bad')); } };
    $('#agentClear').onclick = function () { data = null; u.store.set('agent', null); render(); document.dispatchEvent(new CustomEvent('dot:agent')); };
    $('#agentReveal').onclick = function () { reveal = !reveal; u.$$('.serial').forEach(function (e) { e.classList.toggle('show', reveal); }); this.textContent = reveal ? t('ag_hide') : t('ag_show'); };
    var dz = $('#agentDrop');
    ['dragover', 'dragenter'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) f.text().then(function (x) { try { load(x); } catch (er) { u.toast(t('ag_bad')); } }); });
    // copy PowerShell one-liner (works even without downloading the files)
    $('#agentCopyCmd').onclick = function () {
      var cmd = DOT.agent.oneLiner();
      var done = function () { u.toast(t('copied')); };
      try { navigator.clipboard.writeText(cmd).then(done, function () { fallbackCopy(cmd); }); } catch (e) { fallbackCopy(cmd); }
    };
    render();
  }
  function fallbackCopy(txt) { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); u.toast(t('copied')); } catch (e) { } ta.remove(); }

  return { bind: bind, render: render, load: load, summary: summary, get: function () { return data; }, oneLiner: function () {
    var base = DOT.u.siteURL();
    return base ? "powershell -NoProfile -ExecutionPolicy Bypass -Command \"irm '" + base + "agent/DOTest-Agent.ps1' | iex\"" : 'powershell -NoProfile -ExecutionPolicy Bypass -File .\\DOTest-Agent.ps1';
  } };
})();
