#!/usr/bin/env node
// Frame-rate and frame-cost survey of the busiest scenes, at both viewports, from file://.
//   node tools/perf-scenes.mjs [--gpu]
// --gpu launches Chromium on the real GPU (ANGLE/D3D11) instead of the harness's software renderer.
// Reports rAF fps while walking, the game's own script time per frame, the worst frame, chunk bakes and heap.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../shared/test-harness/package.json'));
const { chromium } = require('playwright');
const gpu = process.argv.includes('--gpu');
const url = pathToFileURL(path.resolve(HERE, '..', 'index.html')).href;
const browser = await chromium.launch(gpu ? { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } : {});
const SCENES = [
  ['Tulip Extravaganza, Welcome Center', { day: 5, at: 'gate', time: 700 }],
  ['Holiday Lights night, Great Lawn', { day: 86, at: 'lawnEast', time: 1150, lights: true }],
  ['Pine Wind, fall color, rain', { day: 77, at: 'koi', time: 900, weather: 'rain' }],
  ['Woods, snow', { day: 98, at: 'canopy', time: 640, weather: 'snow' }],
];
for (const [vp, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await browser.newContext(opts), page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => !!window.__game);
  const hooks = Date.now() - t0;
  for (const [name, sc] of SCENES) {
    await page.evaluate((sc) => {
      const g = window.__game; g.seed(7); g.scene(sc);
      if (sc.lights) { const disp = {}; g.act('markers').filter((m) => m.show === 'hl').forEach((m) => { disp[m.id] = { st: 'ok' }; }); g.setState({ disp }); g.step(12 * 60); }
      g.resume();
    }, sc);
    await page.waitForFunction(() => { const s = window.__game.getState(); return s.artPending === 0 && s.artLoaded >= s.artTotal; }, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await page.keyboard.down('ArrowRight');
    const r = await page.evaluate(() => new Promise((res) => {
      let n = 0, worst = 0, last = performance.now(); const t0 = last;
      const s0 = window.__game.getState();
      const f = (t) => { worst = Math.max(worst, t - last); last = t; n++; if (t - t0 < 2500) requestAnimationFrame(f); else { const s = window.__game.getState(); res({ fps: n / ((t - t0) / 1000), worst, ms: s.frameMs, bakes: s.chunkBakes - s0.chunkBakes, bakeMs: s.bakeLog.slice(-(s.chunkBakes - s0.chunkBakes)).join("/") || "-", heap: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0 }); } };
      requestAnimationFrame(f);
    }));
    await page.keyboard.up('ArrowRight');
    console.log(`${vp.padEnd(7)} ${name.padEnd(28)} ${r.fps.toFixed(1).padStart(5)} fps  script ${r.ms.toFixed(2)} ms/frame  worst frame ${r.worst.toFixed(0)} ms  bakes ${r.bakes} (${r.bakeMs} ms)  heap ${r.heap.toFixed(1)} MB`);
  }
  console.log(`${vp.padEnd(7)} hooks ready in ${hooks} ms`);
  await ctx.close();
}
await browser.close();
