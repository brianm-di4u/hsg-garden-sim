#!/usr/bin/env node
// Opens the built game from file:// (no server) in the harness's Chromium at both viewports, plays into a town
// at night, waits for every painted asset to decode, and fails on console errors, failed art or any request
// that is not a local file or data: URI. Also saves a screenshot per viewport to art-src/ (git-ignored).
//   node tools/check-file-url.mjs
// The test harness cannot do this itself: it blocks every URL that is not its own server.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../shared/test-harness/package.json'));
const { chromium } = require('playwright');
const url = pathToFileURL(path.resolve(HERE, '..', 'index.html')).href;
const browser = await chromium.launch();
let failed = 0;
for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console error: ' + m.text()); });
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) problems.push('network request: ' + r.url()); });
  await page.goto(url);
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => { window.__game.seed(7); window.__game.scene({ day: 5, at: 'gate', time: 700 }); });
  await page.waitForFunction(() => { const s = window.__game.getState(); return s.artPending === 0 && s.artLoaded >= s.artTotal; }, null, { timeout: 30000 }).catch(() => problems.push('art did not finish loading'));
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => window.__game.getState());
  const fonts = await page.evaluate(() => ['IM Fell English', 'Playfair Display', 'Josefin Sans', 'Righteous', 'Outfit', 'Alegreya', 'Nunito Sans'].filter((f) => document.fonts.check(`700 20px "${f}"`)).length);
  if (s.artFailed.length) problems.push('failed art: ' + s.artFailed.join(', '));
  if (!s.painted.terrain || !s.painted.people) problems.push('painted terrain or people not in use');
  if (fonts < 7) problems.push(`only ${fonts} of 7 font families available`);
  await page.screenshot({ path: path.resolve(HERE, '..', 'art-src', `file-url-${name}.png`) });
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  [${name}] file:// · ${s.artLoaded}/${s.artTotal} images · ${fonts}/7 fonts · ${s.painted.buildings} painted buildings`);
  for (const p of problems) console.log('      ✗ ' + p);
  failed += problems.length ? 1 : 0;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
