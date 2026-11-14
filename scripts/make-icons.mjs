// Renders the waffle logo (docs/prototype/prototype.html lines 202-207, app/src/ui/Logo.tsx)
// into the app icon set in app/assets/.
//
// Maintainer tool, not a repo dependency: it needs Playwright with Chromium available.
//   NODE_PATH=$(npm root -g) node scripts/make-icons.mjs      (global install)
//   add --web to write only app/public/icons/ (web install icons)
//   npx -y -p playwright@1.63.0 node scripts/make-icons.mjs   (or via npx)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const ASSETS = path.join(APP, 'assets');
const WEB = path.join(APP, 'public', 'icons');
const TABLE = '#e6edf8';

const LOGO = `
<circle cx="20" cy="20" r="18" fill="#e2a23e" stroke="#b87a22" stroke-width="2"/>
<g stroke="#b87a22" stroke-width="2.6" stroke-linecap="round"><path d="M11 5.5v29M20 3v34M29 5.5v29M5.5 11h29M3 20h34M5.5 29h29"/></g>
<path d="M9 17c5-6 16-8 22-1 3 4-1 6-2 9s-3 5-5 2-4 3-7 1-3-4-6-4-5-4-2-7z" fill="#8a4513" opacity=".92"/>
<rect x="15" y="13.5" width="11" height="9" rx="2" fill="#ffe37a" transform="rotate(-10 20 18)"/>`;

// Single-colour silhouette: disc with the grid grooves and butter cut out.
const MONO = `
<mask id="m"><rect width="40" height="40" fill="#000"/><circle cx="20" cy="20" r="19" fill="#fff"/>
<g stroke="#000" stroke-width="2.2" stroke-linecap="round"><path d="M11 5.5v29M20 3v34M29 5.5v29M5.5 11h29M3 20h34M5.5 29h29"/></g>
<rect x="15" y="13.5" width="11" height="9" rx="2" fill="#000" transform="rotate(-10 20 18)"/></mask>
<rect width="40" height="40" fill="#000" mask="url(#m)"/>`;

const GINGHAM = `background-color:${TABLE};
background-image:
 repeating-linear-gradient(0deg, rgba(120,150,210,.10) 0 64px, transparent 64px 128px),
 repeating-linear-gradient(90deg, rgba(120,150,210,.10) 0 64px, transparent 64px 128px);`;

/** `logoPx` is the rendered logo width inside a `size` square. */
function page(size, logoPx, inner, bg) {
  return `<html><body style="margin:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${bg}">
<svg width="${logoPx}" height="${logoPx}" viewBox="0 0 40 40">${inner}</svg></body></html>`;
}

// [file, size, html, transparent, outDir]; outDir defaults to app/assets.
const jobs = [
  ['icon.png', 1024, page(1024, 760, LOGO, GINGHAM), false],
  ['android-icon-foreground.png', 1024, page(1024, 676, LOGO, ''), true],
  ['android-icon-background.png', 1024, page(1024, 1, '', `background:${TABLE};`), false],
  ['android-icon-monochrome.png', 1024, page(1024, 676, MONO, ''), true],
  ['splash-icon.png', 512, page(512, 512, LOGO, ''), true],
  ['favicon.png', 48, page(48, 44, LOGO, ''), true],
  // Web install icons (opaque). Maskable keeps the logo inside the central 80% safe zone.
  ['icon-192.png', 192, page(192, 142, LOGO, GINGHAM), false, WEB],
  ['icon-512.png', 512, page(512, 379, LOGO, GINGHAM), false, WEB],
  ['maskable-512.png', 512, page(512, 300, LOGO, GINGHAM), false, WEB],
  ['apple-touch-icon.png', 180, page(180, 133, LOGO, GINGHAM), false, WEB],
];
// `--web` writes only the web icons, leaving app/assets untouched.
const webOnly = process.argv.includes('--web');

const browser = await chromium.launch();
try {
  for (const [name, size, html, transparent, dir = ASSETS] of jobs) {
    if (webOnly && dir !== WEB) continue;
    const pg = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await pg.setContent(html);
    await pg.screenshot({ path: path.join(dir, name), omitBackground: transparent });
    await pg.close();
    console.log('wrote', name);
  }
} finally {
  await browser.close();
}
