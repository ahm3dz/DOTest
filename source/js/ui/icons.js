/* Line-icon set. DOT.icon(name) -> inline SVG string (inherits currentColor). */
var DOT = window.DOT = window.DOT || {};

DOT.icon = (function () {
  var P = {
    tests: 'M9 3v4l-5 9a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-5-9V3M8 3h8M8 14h8',
    specs: 'M6 3h9l4 4v14H6zM14 3v4h4M9 12h7M9 16h7',
    network: 'M12 20v-4M5 20h14M12 4a8 8 0 0 1 8 8M12 8a4 4 0 0 1 4 4M12 12h.01',
    hardware: 'M7 8h10v8H7zM9 2v3M12 2v3M15 2v3M9 19v3M12 19v3M15 19v3M2 9h3M2 12h3M2 15h3M19 9h3M19 12h3M19 15h3',
    tools: 'M14 7a4 4 0 0 1-5 5l-5 5 2 2 5-5a4 4 0 0 0 5-5l-2 2-2-2 2-2z',
    history: 'M12 7v5l3 2M4 12a8 8 0 1 0 2-5M4 4v4h4',
    about: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
    device: 'M4 5h16v11H4zM2 20h20M10 16h4',
    cpu: 'M8 8h8v8H8zM9 2v3M12 2v3M15 2v3M9 19v3M12 19v3M15 19v3M2 9h3M2 12h3M2 15h3M19 9h3M19 12h3M19 15h3',
    gpu: 'M3 6h18v10H7l-2 3v-3H3zM8 10h5M8 13h3M17 9v4',
    screen: 'M3 4h18v12H3zM8 20h8M12 16v4',
    system: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2',
    power: 'M15 3H9l-1 7h3l-1 11 7-13h-4z',
    features: 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z',
    ram: 'M3 8h18v8H3zM6 16v2M10 16v2M14 16v2M18 16v2M7 11h3M14 11h3',
    board: 'M4 4h16v16H4zM8 8h3v3H8zM14 8h2M14 11h2M8 15h8',
    disks: 'M4 5h16v14H4zM8 9h8M8 13h5M16.5 16.5h.01',
    monitors: 'M3 4h18v12H3zM8 20h8M12 16v4M6 8h6',
    battery: 'M3 8h15v8H3zM21 11v2M6 11v2',
    audio: 'M4 9v6h3l5 4V5L7 9zM16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10',
    os: 'M4 5h16v11H4zM2 20h20M10 16h4M8 8l2 2-2 2',
    phone: 'M7 2h10v20H7zM10 19h4',
    tablet: 'M5 3h14v18H5zM10 18h4',
    laptop: 'M5 5h14v10H5zM2 19h20l-1-4H3z',
    desktop: 'M4 4h16v11H4zM8 20h8M12 15v5',
    tv: 'M3 5h18v12H3zM8 21h8M9 2l3 3 3-3',
    console: 'M7 8h10a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8zM9 10v4M7 12h4M15 11h.01M17 13h.01',
    vr: 'M3 8h18v7a2 2 0 0 1-2 2h-3l-3-3h-2l-3 3H5a2 2 0 0 1-2-2z',
    cores: 'M8 8h8v8H8zM12 2v3M12 19v3M2 12h3M19 12h3',
    refresh: 'M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4',
    deadpixel: 'M4 4h16v16H4zM9 9h6v6H9z',
    gradient: 'M4 4h16v16H4zM4 4l16 16',
    motion: 'M4 12h10M4 7h7M4 17h7M17 7l4 5-4 5',
    touch: 'M9 11V5a2 2 0 0 1 4 0v6M13 7a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6l-3-1-4-5 2-2 3 2',
    keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M8 14h8',
    mouse: 'M12 3a5 5 0 0 1 5 5v8a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5zM12 7v3',
    gamepad: 'M7 9h10a4 4 0 0 1 0 8c-2 0-2-2-4-2h-2c-2 0-2 2-4 2a4 4 0 0 1 0-8zM8 12h3M9.5 10.5v3',
    speakers: 'M8 3h8v18H8zM12 7h.01M12 14a2 2 0 1 0 0-.01',
    sensors: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12l4-5M12 12l-3 4',
    vibration: 'M8 5h8v14H8zM3 9v6M21 9v6',
    settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1-1-3-2 .5M5 12l-2-1 1-3 2 .5M12 5V2M12 22v-3',
    play: 'M8 5l11 7-11 7z',
    stop: 'M6 6h12v12H6z',
    fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    image: 'M4 5h16v14H4zM8 11l2 2 3-4 5 6H6z',
    download: 'M12 4v10M8 11l4 4 4-4M5 19h14',
    reveal: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    trash: 'M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13',
    check: 'M5 12l4 4 10-11',
    close: 'M6 6l12 12M18 6L6 18',
    gauge: 'M5 18a8 8 0 1 1 14 0M12 13l4-3M12 13a1.5 1.5 0 1 0 0 .01',
    flame: 'M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.3.6-2.4 1.2-3.3.4 1 1.3 1.6 2 1.1.2-1.9-.9-3.8 1.8-6.8z',
    burst: 'M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19',
    signal: 'M4 20v-3M9 20v-7M14 20v-11M19 20V5',
    wave: 'M2 12c2-5 4-5 5 0M7 12c2 5 4 5 5 0M12 12c2-5 4-5 5 0M17 12c1.5 3 3 3 4 0',
    upload: 'M12 20V9M8 12l4-4 4 4M5 5h14',
    clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    award: 'M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM9.5 12.5L8 21l4-2.5L16 21l-1.5-8.5',
    alert: 'M12 3l9.5 17H2.5zM12 10v4M12 17.5v.01',
    activity: 'M3 12h4l2.5-6 4 13 2.5-7h4',
    windows: 'M3.5 6l7.5-1v6.5H3.5zM12.5 4.7L21 3.5v8.5h-8.5zM3.5 13h7.5v6l-7.5-1zM12.5 13H21v7.5l-8.5-1z',
    apple: 'M15.5 3.2c.2 1.4-.8 2.8-2.3 2.7-.2-1.3.9-2.7 2.3-2.7zM17.8 9.3c-1.6-.9-4-.8-5 .2-1.3.1-2.6-.1-3.6.9-1.6 1.7-1.3 5 .4 7.6.7 1.1 1.6 2.3 2.8 2.2.9 0 1.2-.6 2.3-.6s1.4.6 2.3.6c1.2 0 2-1.1 2.7-2.2-1.9-1-2.3-3.9-.6-5.2-.4-.6-1-1.1-1.7-1.3',
    linux: 'M10 3.5c-1.2.6-1.5 2.2-1.3 3.6.2 1.3-.4 2-1.1 3-1 1.5-1.8 3.3-1.4 5.3.5 2.4 2.8 4.1 5.3 4.1s4.8-1.7 5.3-4.1c.4-2-.4-3.8-1.4-5.3-.7-1-1.3-1.7-1.1-3 .2-1.4-.1-3-1.3-3.6a2 2 0 0 0-1.5 0zM10.5 8h.01M13.5 8h.01'
  };
  var alias = { full: 'tests', lv_light: 'power', lv_medium: 'gauge', lv_heavy: 'flame', lv_extreme: 'burst', stress: 'activity', ping: 'signal', jitter: 'wave', down: 'download', up: 'upload', loaded: 'clock', grade: 'award', info: 'about', good: 'check', warn: 'alert', bad: 'close', pc: 'desktop', dt_phone: 'phone', dt_tablet: 'tablet', dt_laptop: 'laptop', dt_desktop: 'desktop', dt_mac: 'laptop', dt_pc: 'desktop', dt_tv: 'tv', dt_console: 'console', dt_vr: 'vr' };
  return function (name, size) {
    var key = alias[name] || name, d = P[key];
    if (!d) d = P.features;
    var s = size || 20;
    return '<svg class="ic-svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      d.split('M').filter(Boolean).map(function (seg) { return '<path d="M' + seg + '"/>'; }).join('') + '</svg>';
  };
})();
