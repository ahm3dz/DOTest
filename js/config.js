/* =========================================================
   DOTest — Main configuration (edit freely)
   كل الإعدادات القابلة للتعديل هنا
   © Ahmed Al-Zahrani
   ========================================================= */
var DOT = window.DOT = window.DOT || {};

DOT.config = {
  appName: 'DOTest',
  author: 'Ahmed Al-Zahrani',
  version: '2.0.0',
  defaultLang: 'ar',          // 'ar' | 'en'

  /* Test levels — durations in seconds
     cpu: per CPU phase (single + multi)
     gpu: GPU render test, compute: WebGPU compute test
     ram: RAM bandwidth test, ramMB: memory to allocate & stress
     res: render-resolution multiplier, iter: ray-march steps
     stress: duration of the combined stress test             */
  levels: {
    light:   { cpu: 3,  gpu: 9,  compute: 3, ram: 4,  ramMB: 256,  res: 0.5,  iter: 48,  stress: 30  },
    medium:  { cpu: 5,  gpu: 13, compute: 4, ram: 6,  ramMB: 512,  res: 0.75, iter: 96,  stress: 60  },
    heavy:   { cpu: 8,  gpu: 17, compute: 5, ram: 8,  ramMB: 1024, res: 1.0,  iter: 160, stress: 120 },
    extreme: { cpu: 12, gpu: 24, compute: 7, ram: 12, ramMB: 3072, res: 1.35, iter: 256, stress: 300 }
  },
  levelOrder: ['light', 'medium', 'heavy', 'extreme'],

  /* Memory safety caps (browser tabs get killed if they use too much) */
  ram: {
    iosCapMB: 768,            // iPhone / iPad Safari
    mobileCapMB: 1536,        // Android phones & tablets
    deviceFraction: 0.4,      // max fraction of reported RAM to use
    latencyMB: 64,            // latency-test buffer (desktop)
    latencyMBMobile: 32,
    latencySteps: 4000000
  },

  /* Score constants — calibrated so a mid-range cloud CPU core ≈ 2000 */
  score: {
    cpuRound: 4,              // rounds/s × this = CPU score
    cpuCat: { int: 0.29, float: 0.08, prime: 0.17, sort: 0.26, matrix: 0.16, hash: 0.19, cache: 0.38 }, // calls/s × this
    gpuDiv: 5e6,              // ray-march steps per second ÷ this = GPU score
    ramBW: 250,               // GB/s × this
    ramLatRef: 90,            // reference latency (ns)
    ringMax: 30000            // score that fills the circle
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

  historyMax: 15,
  storageKey: 'dotest_v2'
};
