DOTest v3.1 — by Ahmed Al-Zahrani
=================================

THIS FOLDER = ready to upload.
Upload everything here to your domain (root), keep the structure:
  index.html, manifest.json, css/, js/, assets/, agent/

The JavaScript is minified and obfuscated on purpose — "Inspect / View Source"
will not reveal the real code. To edit the project later, use the "source/"
folder (readable code) and rebuild:  node build.js   -> regenerates this folder.

Requirements: serve over HTTPS (any static host: your domain, Netlify,
Vercel, Cloudflare Pages, GitHub Pages). The internet speed test and the
PowerShell one-liner need a real https URL.
