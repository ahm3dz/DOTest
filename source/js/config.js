/* =========================================================
   DOTest — Main configuration (edit freely)
   كل الإعدادات القابلة للتعديل هنا
   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.config = {
  appName: 'DOTest',
  author: 'Ahmed Al-Zahrani',
  version: '3.1.0',
  defaultLang: 'ar',          // 'ar' | 'en'

  /* Site link shown on result images & shared text.
     Leave empty ('') to detect it automatically from the address bar. */
  siteURL: '',

  /* Test levels — durations in seconds
     cpu: per CPU phase (single + multi) · gpu: render test · compute: WebGPU test
     ram: RAM test · ramMB: memory to allocate · res: render-resolution multiplier
     iter: ray-march steps · stress: combined stress duration · disk: storage test MB */
  levels: {
    light:   { cpu: 3,  gpu: 9,  compute: 3, ram: 4,  ramMB: 256,  res: 0.5,  iter: 48,  stress: 30,  diskMB: 64  },
    medium:  { cpu: 5,  gpu: 13, compute: 4, ram: 6,  ramMB: 512,  res: 0.75, iter: 96,  stress: 60,  diskMB: 128 },
    heavy:   { cpu: 8,  gpu: 17, compute: 5, ram: 8,  ramMB: 1024, res: 1.0,  iter: 160, stress: 120, diskMB: 256 },
    extreme: { cpu: 12, gpu: 24, compute: 7, ram: 12, ramMB: 3072, res: 1.35, iter: 256, stress: 300, diskMB: 512 }
  },
  levelOrder: ['light', 'medium', 'heavy', 'extreme'],

  /* GPU scenes (see js/bench/shaders.js) */
  scenes: ['mandelbulb', 'menger'],

  /* Memory safety caps (browser tabs get killed if they use too much) */
  ram: {
    iosCapMB: 768,
    mobileCapMB: 1536,
    deviceFraction: 0.4,
    latencyMB: 64,
    latencyMBMobile: 32,
    latencySteps: 4000000
  },

  /* Internet speed test servers (Cloudflare's public speed endpoints by default).
     You can point these at your own server (e.g. LibreSpeed backend). */
  net: {
    down: 'https://speed.cloudflare.com/__down?bytes=',
    up: 'https://speed.cloudflare.com/__up',
    ping: 'https://speed.cloudflare.com/__down?bytes=0',
    ipApis: ['https://ipwho.is/', 'https://ipapi.co/json/', 'https://api.ipify.org?format=json'],
    streams: 6,               // parallel connections
    downSec: 10,
    upSec: 8,
    pingCount: 20,
    downChunk: 25000000,      // bytes per download request
    upChunkStart: 1000000     // first upload chunk size (grows automatically)
  },

  /* Default user settings (users can change them from the ⚙️ panel) */
  settingsDefaults: {
    scene: 'mandelbulb',      // GPU scene
    resMul: 1,                // extra render-resolution multiplier
    durMul: 1,                // test duration multiplier
    threads: 0,               // 0 = auto (all cores)
    ramMB: 0,                 // 0 = auto
    hero3d: true,             // animated fractal at the top
    hud: true,                // FPS overlay during GPU test
    sound: true,              // beep when a test finishes
    vibrate: true,            // vibrate (phones) when a test finishes
    wakeLock: true,           // keep screen awake while testing
    accent: 'cyan',           // cyan | purple | red | green | gold
    netUnit: 'mbps',          // mbps | mbs
    hideIP: true              // blur the IP address until tapped
  },

  /* Score constants */
  score: {
    cpuRound: 4,
    cpuCat: { int: 0.29, float: 0.08, prime: 0.17, sort: 0.26, matrix: 0.16, hash: 0.19, cache: 0.38 },
    gpuDiv: { mandelbulb: 1.25e6, menger: 5e6 },   // ray-march steps/s ÷ this = GPU score
    ramBW: 250,
    ramLatRef: 90,
    diskRef: 10,              // MB/s × this = storage score
    ringMax: 30000
  },

  /* Weights for the total score (geometric mean) */
  weights: { cpuS: 0.2, cpuM: 0.3, gpu: 0.35, ram: 0.15 },

  /* Tiers: [max score, i18n key, color] */
  tiers: [
    [1500, 'tier1', '#8f97bd'],
    [3500, 'tier2', '#22e58a'],
    [7000, 'tier3', '#00e5ff'],
    [12000, 'tier4', '#a855f7'],
    [20000, 'tier5', '#ff3d81'],
    [1e12, 'tier6', '#ffc93c']
  ],

  accents: {
    cyan:   ['#00e5ff', '#a855f7'],
    purple: ['#a855f7', '#ff3d81'],
    red:    ['#ff3d5e', '#ffb03c'],
    green:  ['#22e58a', '#00e5ff'],
    gold:   ['#ffc93c', '#ff6a3d']
  },

  historyMax: 20,
  storageKey: 'dotest_v3'
};
