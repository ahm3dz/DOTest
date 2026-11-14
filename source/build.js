/* DOTest production build — bundles, minifies and obfuscates the source
   into /dist (upload-ready). Run: node build.js
   The readable source stays untouched. */
'use strict';
const fs = require('fs'), path = require('path');
const { minify } = require('terser');
const Obfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');

const ROOT = __dirname, DIST = path.join(ROOT, 'dist');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rmrf = p => fs.existsSync(p) && fs.rmSync(p, { recursive: true, force: true });
const mkdirp = p => fs.mkdirSync(p, { recursive: true });
const copy = (a, b) => { mkdirp(path.dirname(b)); fs.copyFileSync(a, b); };

/* Hot-path files that are stringified into Web Workers — keep them
   self-contained (terser only, no obfuscator helper references). */
const CORE = ['js/bench/kernels.js'];

/* Everything else, in load order. */
const APP = [
  'js/config.js', 'js/i18n.js', 'js/utils.js', 'js/data/devices.js', 'js/detect.js',
  'js/bench/workers.js', 'js/bench/cpu.js', 'js/bench/ram.js', 'js/bench/shaders.js',
  'js/bench/gpu.js', 'js/bench/stress.js', 'js/net/speedtest.js', 'js/agent/agent.js',
  'js/tools/tools.js', 'js/ui/settings.js', 'js/ui/charts.js', 'js/ui/hero3d.js',
  'js/ui/advice.js', 'js/ui/render.js', 'js/ui/network.js', 'js/app.js'
];

const OBF = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,          // DOT is a shared global — must stay
  stringArray: true,
  stringArrayThreshold: 0.8,
  stringArrayEncoding: ['base64'],
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',
  splitStrings: true,
  splitStringsChunkLength: 8,
  numbersToExpressions: true,
  simplify: true,
  transformObjectKeys: false,    // keep DOT.* property names working
  deadCodeInjection: false,      // avoid bloat / timing skew
  controlFlowFlattening: false,  // avoid slowing measured code
  selfDefending: false,
  unicodeEscapeSequence: false,
  disableConsoleOutput: false,
  target: 'browser'
};

(async () => {
  rmrf(DIST); mkdirp(DIST);

  /* ---- JS: core (terser, keep top-level names for worker toString) ---- */
  const coreSrc = CORE.map(read).join('\n;\n');
  const core = await minify(coreSrc, { compress: { passes: 2 }, mangle: { toplevel: false }, format: { comments: false } });
  if (core.error) throw core.error;
  mkdirp(path.join(DIST, 'js'));
  fs.writeFileSync(path.join(DIST, 'js/core.min.js'), core.code);

  /* ---- JS: app (terser → obfuscator) ---- */
  const appSrc = APP.map(read).join('\n;\n');
  const pre = await minify(appSrc, { compress: { passes: 2 }, mangle: true, format: { comments: false } });
  if (pre.error) throw pre.error;
  const obf = Obfuscator.obfuscate(pre.code, OBF).getObfuscatedCode();
  fs.writeFileSync(path.join(DIST, 'js/app.min.js'), obf);

  /* ---- vendor (already minified) ---- */
  copy(path.join(ROOT, 'js/vendor/qrcode.min.js'), path.join(DIST, 'js/vendor/qrcode.min.js'));

  /* ---- CSS ---- */
  const css = new CleanCSS({ level: 2 }).minify(read('css/style.css')).styles;
  mkdirp(path.join(DIST, 'css'));
  fs.writeFileSync(path.join(DIST, 'css/app.min.css'), css);

  /* ---- HTML: rewrite to the two bundles + minified css, strip comments ---- */
  let html = read('index.html');
  html = html.replace('<link rel="stylesheet" href="css/style.css">', '<link rel="stylesheet" href="css/app.min.css">');
  // drop every source <script> then inject three tags before </body>
  html = html.replace(/\n<!-- Scripts[\s\S]*?<\/body>/, '\n<script src="js/vendor/qrcode.min.js"></script>\n<script src="js/core.min.js"></script>\n<script src="js/app.min.js"></script>\n</body>');
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*\n/g, '\n');
  fs.writeFileSync(path.join(DIST, 'index.html'), html);

  copy(path.join(ROOT, 'manifest.json'), path.join(DIST, 'manifest.json'));

  /* ---- static assets + agent ---- */
  for (const dir of ['assets', 'agent']) {
    for (const f of walk(path.join(ROOT, dir))) copy(f, path.join(DIST, path.relative(ROOT, f)));
  }

  const kb = n => (n / 1024).toFixed(1) + ' KB';
  console.log('core.min.js  ', kb(core.code.length));
  console.log('app.min.js   ', kb(obf.length));
  console.log('app.min.css  ', kb(css.length));
  console.log('dist ready ->', DIST);
})().catch(e => { console.error('BUILD FAILED:', e.message); process.exit(1); });

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
