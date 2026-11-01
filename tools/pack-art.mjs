#!/usr/bin/env node
// Packs art-src/*.png into assets/*.webp for Woodland Gardens Keeper, with the harness's Chromium (no image libraries).
// A game-local cousin of shared/test-harness/art-pack.mjs with what this game needs on top:
//   - "trim": crop to the visible pixels after keying white, then scale to "w" keeping the TRUE aspect, so a
//     building's painted base lands exactly on its footprint (manifest records the real w and h);
//   - "seamless": make a texture tile by cross-fading it with a half-offset copy of itself;
//   - "sheet": [cols, rows] cut a sprite sheet (crop stages) into equal cells, each trimmed, packed into one
//     strip of cells "w" × "h" with every cell bottom-aligned.
//
//   node tools/pack-art.mjs [--only a,b] [--group tex]
//
// art-src/art.json: { "quality": 0.82, "items": [ { "name", "src", "w", "h"?, "keyWhite"?, "trim"?, "seamless"?,
//   "sheet"?, "quality"? } ] }. Writes assets/<name>.webp, assets/manifest.json, art-src/sheet.png (review).
import { chromium } from '../shared/test-harness/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '..');
const srcDir = path.join(GAME, 'art-src'), outDir = path.join(GAME, 'assets');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = opt('--only') ? opt('--only').split(',') : null;
const group = opt('--group');
const spec = JSON.parse(fs.readFileSync(path.join(srcDir, 'art.json'), 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const manPath = path.join(outDir, 'manifest.json');
const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><body></body>');
let failed = 0;
for (const it of spec.items) {
  if (only && !only.includes(it.name)) continue;
  if (group && !it.name.startsWith(group)) continue;
  const file = path.join(srcDir, it.src);
  if (!fs.existsSync(file)) { console.log(`  missing  ${it.name} (${it.src})`); failed++; continue; }
  const url = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  const r = await page.evaluate(async ({ url, it, q }) => {
    const img = new Image(); img.src = url; await img.decode();
    const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    let src = canvasOf(img.naturalWidth, img.naturalHeight);
    if (it.crop) { const [cx, cy, cw, chh] = it.crop; src = canvasOf(cw * img.naturalWidth, chh * img.naturalHeight); src.getContext('2d').drawImage(img, -cx * img.naturalWidth, -cy * img.naturalHeight); }
    else src.getContext('2d').drawImage(img, 0, 0);
    const keyWhite = (c, tol, all) => {
      const g = c.getContext('2d'), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), p = d.data;
      const lim = 255 - tol, seen = new Uint8Array(W * H), stack = [];
      const white = (i) => p[i * 4] >= lim && p[i * 4 + 1] >= lim && p[i * 4 + 2] >= lim;
      for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
      for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
      while (stack.length) {
        const i = stack.pop(); if (seen[i] || !white(i)) continue; seen[i] = 1;
        const x = i % W, y = (i / W) | 0;
        if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
      }
      if (all) for (let i = 0; i < W * H; i++) if (white(i)) seen[i] = 1;
      if (all === 'holes') { // enclosed white regions bigger than 0.3% of the image (gaps, not highlights)
        const lab = new Uint8Array(W * H), min = W * H * 0.003;
        for (let s0 = 0; s0 < W * H; s0++) {
          if (seen[s0] || lab[s0] || !white(s0)) continue;
          const comp = [], st = [s0]; lab[s0] = 1;
          while (st.length) { const i = st.pop(); comp.push(i); const x = i % W, y = (i / W) | 0;
            for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !lab[j] && !seen[j] && white(j)) { lab[j] = 1; st.push(j); } }
          if (comp.length > min) for (const i of comp) seen[i] = 1;
        }
      }
      for (let i = 0; i < W * H; i++) {
        if (seen[i]) { p[i * 4 + 3] = 0; continue; }
        const x = i % W, y = (i / W) | 0;
        const edge = (x > 0 && seen[i - 1]) || (x < W - 1 && seen[i + 1]) || (y > 0 && seen[i - W]) || (y < H - 1 && seen[i + W]);
        if (edge) { const m = Math.min(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]); p[i * 4 + 3] = Math.min(255, Math.round((255 - m) * 255 / (255 - lim + 1))); }
      }
      g.putImageData(d, 0, 0);
    };
    // Keep only the largest opaque blob (plus anything overlapping its box): drops slivers of the next icon.
    const keepMain = (c) => {
      const g = c.getContext('2d'), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), p = d.data;
      const lab = new Int32Array(W * H).fill(-1), boxes = []; let best = -1, bestN = 0;
      for (let s0 = 0; s0 < W * H; s0++) {
        if (lab[s0] >= 0 || p[s0 * 4 + 3] < 40) continue;
        const id = boxes.length, st = [s0]; lab[s0] = id; let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
        while (st.length) { const i = st.pop(); n++; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && lab[j] < 0 && p[j * 4 + 3] >= 40) { lab[j] = id; st.push(j); } }
        boxes.push([x0, y0, x1, y1, n]); if (n > bestN) { bestN = n; best = id; }
      }
      if (best < 0) return;
      const [bx0, by0, bx1, by1] = boxes[best], pad = 6;
      // A small blob touching the cut edge of the cell is a sliver of the neighbouring icon.
      const keep = boxes.map(([x0, y0, x1, y1, n], id) => id === best || n >= bestN * 0.15 || (x0 > 2 && x1 < W - 3));
      for (let i = 0; i < W * H; i++) if (p[i * 4 + 3] > 0) { const l = lab[i]; if (l < 0 ? !(i % W >= bx0 - pad && i % W <= bx1 + pad) : !keep[l]) p[i * 4 + 3] = 0; }
      g.putImageData(d, 0, 0);
    };
    const trim = (c) => {
      const g = c.getContext('2d'), W = c.width, H = c.height, p = g.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0 || y1 <= y0) return c;
      const o = canvasOf(x1 - x0 + 1, y1 - y0 + 1); o.getContext('2d').drawImage(c, -x0, -y0); return o;
    };
    const scaleTo = (c, W, H) => {
      let s = c;
      while (s.width / 2 >= W && s.height / 2 >= H) { const h = canvasOf(s.width / 2, s.height / 2); const g = h.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, h.width, h.height); s = h; }
      const o = canvasOf(W, H); const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, o.width, o.height); return o;
    };
    let out;
    if (it.sheet) {
      const [cols, rows] = it.sheet, cells = [];
      // Find the stages by the transparent gaps between them (generated sheets rarely keep exact columns);
      // merge the narrowest gaps until there are `cols` pieces, or fall back to equal columns.
      if (it.keyWhite) keyWhite(src, it.keyWhite, it.keyAll);
      const g0 = src.getContext('2d'), W0 = src.width, H0 = src.height, px = g0.getImageData(0, 0, W0, H0).data;
      const occ = new Array(W0).fill(0);
      for (let x = 0; x < W0; x++) for (let y = 0; y < H0; y += 2) if (px[(y * W0 + x) * 4 + 3] > 40) occ[x]++;
      let runs = [];
      for (let x = 0; x < W0; x++) if (occ[x] > 1) { const last = runs[runs.length - 1]; if (last && x - last[1] <= 3) last[1] = x; else runs.push([x, x]); }
      runs = runs.filter((r) => r[1] - r[0] > 6 || occ.slice(r[0], r[1] + 1).reduce((a, b) => a + b, 0) > 40);
      while (runs.length > cols) {
        let bi = 0, bg = 1e9;
        for (let i = 0; i + 1 < runs.length; i++) { const gap = runs[i + 1][0] - runs[i][1]; const w = Math.min(runs[i][1] - runs[i][0], runs[i + 1][1] - runs[i + 1][0]); const score = gap + w * 0.5; if (score < bg) { bg = score; bi = i; } }
        runs.splice(bi, 2, [runs[bi][0], runs[bi + 1][1]]);
      }
      while (runs.length < cols && runs.length) {
        // Touching stages: split the widest piece at its thinnest column (away from its edges).
        let wi = 0; runs.forEach((r, i) => { if (r[1] - r[0] > runs[wi][1] - runs[wi][0]) wi = i; });
        const [a, b] = runs[wi], lo = a + Math.round((b - a) * 0.2), hi = b - Math.round((b - a) * 0.2);
        let best = lo; for (let x = lo; x <= hi; x++) if (occ[x] < occ[best]) best = x;
        runs.splice(wi, 1, [a, best - 1], [best + 1, b]);
      }
      for (let [a, b] of runs) {
        if (it.split) { // the widest stretch of occupied columns inside this piece
          let best = [a, b], bw = -1, s0 = -1;
          for (let x = a; x <= b + 1; x++) { const on = x <= b && occ[x] > 1; if (on && s0 < 0) s0 = x; if ((!on || x === b + 1) && s0 >= 0) { const e = x - 1; if (e - s0 > bw) { bw = e - s0; best = [s0, e]; } s0 = -1; } }
          [a, b] = best;
        }
        const cell = canvasOf(b - a + 1, H0); cell.getContext('2d').drawImage(src, -a, 0);
        if (it.split) keepMain(cell);
        cells.push(trim(cell));
      }
      const W = it.w, H = it.h; // per cell
      if (it.split) { // one file per cell, each fitted on its own into W x H (icons)
        return { split: cells.map((c) => { const k = Math.min(W / c.width, H / c.height), s = scaleTo(c, c.width * k, c.height * k), o = canvasOf(W, H); o.getContext('2d').drawImage(s, (W - s.width) / 2, (H - s.height) / 2); return o.toDataURL('image/webp', q).split(',')[1]; }), w: W, h: H };
      }
      out = canvasOf(W * cells.length, H);
      const g = out.getContext('2d'); g.imageSmoothingQuality = 'high';
      const maxH = Math.max(...cells.map((c) => c.height)), maxW = Math.max(...cells.map((c) => c.width));
      const k = Math.min(W / maxW, H / maxH); // one scale for all stages, so growth reads as growth
      cells.forEach((c, i) => { const s = scaleTo(c, c.width * k, c.height * k); g.drawImage(s, i * W + (W - s.width) / 2, H - s.height); });
    } else {
      if (it.keyWhite) keyWhite(src, it.keyWhite, it.keyAll);
      if (it.trim) src = trim(src);
      if (it.seamless) {
        // Flatten: subtract a heavily blurred copy and add back its mean, so only small-scale detail remains.
        {
          const W = src.width, H = src.height, b = canvasOf(W, H), bg = b.getContext('2d');
          bg.filter = `blur(${Math.round(Math.min(W, H) / 10)}px)`;
          for (const [dx, dy] of [[0, 0], [-W, 0], [W, 0], [0, -H], [0, H]]) bg.drawImage(src, dx, dy);
          const sp = src.getContext('2d').getImageData(0, 0, W, H), bp = bg.getImageData(0, 0, W, H), d = sp.data, e = bp.data;
          const mean = [0, 0, 0]; for (let i = 0; i < e.length; i += 4) { mean[0] += e[i]; mean[1] += e[i + 1]; mean[2] += e[i + 2]; }
          for (let c = 0; c < 3; c++) mean[c] /= e.length / 4;
          for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, d[i + c] - e[i + c] + mean[c]));
          const f = canvasOf(W, H); f.getContext('2d').putImageData(sp, 0, 0); src = f;
        }
        // Cross-fade with a half-offset copy: edges come from the copy (whose edges are the image middle).
        const W = src.width, H = src.height, sh = canvasOf(W, H), sg = sh.getContext('2d');
        for (const [dx, dy] of [[0, 0], [-W, 0], [0, -H], [-W, -H]]) sg.drawImage(src, W / 2 + dx, H / 2 + dy);
        const mask = canvasOf(W, H), mg = mask.getContext('2d');
        const gr = mg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.min(W, H) * 0.5);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        mg.fillStyle = gr; mg.fillRect(0, 0, W, H);
        mg.globalCompositeOperation = 'source-in'; mg.drawImage(src, 0, 0);
        sg.drawImage(mask, 0, 0); src = sh;
      }
      const W = it.w, H = it.h || Math.round(it.w * src.height / src.width);
      out = scaleTo(src, W, H);
    }
    return { b64: out.toDataURL('image/webp', q).split(',')[1], w: out.width, h: out.height };
  }, { url, it, q: it.quality || spec.quality || 0.82 });
  if (r.split) {
    r.split.forEach((b64, i) => {
      const n = it.split[i]; if (!n) return;
      const buf = Buffer.from(b64, 'base64');
      fs.writeFileSync(path.join(outDir, n + '.webp'), buf);
      manifest[n] = { file: n + '.webp', w: r.w, h: r.h, bytes: buf.length };
    });
    console.log(`  split    ${it.name.padEnd(24)} ${it.split.length} cells of ${r.w}x${r.h}`);
    continue;
  }
  const buf = Buffer.from(r.b64, 'base64');
  fs.writeFileSync(path.join(outDir, it.name + '.webp'), buf);
  manifest[it.name] = { file: it.name + '.webp', w: r.w, h: r.h, bytes: buf.length, ...(it.sheet ? { cells: it.sheet[0] * it.sheet[1], cw: it.w } : {}) };
  console.log(`  packed   ${it.name.padEnd(24)} ${r.w}x${r.h}  ${(buf.length / 1024).toFixed(1)} KB`);
}
for (const k of Object.keys(manifest)) if (!spec.items.some((i) => i.name === k || (i.split && i.split.includes(k)))) delete manifest[k];
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
fs.writeFileSync(manPath, JSON.stringify(sorted, null, 1) + '\n');
const total = Object.values(sorted).reduce((a, m) => a + m.bytes, 0);
console.log(`  total    ${Object.keys(sorted).length} assets, ${(total / 1024 / 1024).toFixed(2)} MB`);

// Review sheet of this run's group (or everything): each asset on a checkerboard, labelled.
const names = Object.keys(sorted).filter((n) => (!group || n.startsWith(group)) && (!only || only.includes(n) || spec.items.some((i) => only.includes(i.name) && i.split && i.split.includes(n))));
const cells = names.map((n) => ({ n, url: 'data:image/webp;base64,' + fs.readFileSync(path.join(outDir, sorted[n].file)).toString('base64') }));
const sheet = await page.evaluate(async (cells) => {
  const cw = 220, chh = 240, cols = Math.min(7, Math.max(1, cells.length)), rows = Math.ceil(cells.length / cols);
  const c = document.createElement('canvas'); c.width = cols * cw; c.height = Math.max(1, rows) * chh;
  const g = c.getContext('2d');
  for (let y = 0; y < c.height; y += 10) for (let x = 0; x < c.width; x += 10) { g.fillStyle = ((x + y) / 10) % 2 ? '#9fb88a' : '#b5c99f'; g.fillRect(x, y, 10, 10); }
  for (let i = 0; i < cells.length; i++) {
    const img = new Image(); img.src = cells[i].url; await img.decode();
    const x = (i % cols) * cw, y = Math.floor(i / cols) * chh, k = Math.min(210 / img.width, 210 / img.height);
    g.drawImage(img, x + (cw - img.width * k) / 2, y + 5 + (210 - img.height * k), img.width * k, img.height * k);
    g.fillStyle = '#111'; g.font = '13px system-ui'; g.fillText(cells[i].n, x + 6, y + 232);
  }
  return c.toDataURL('image/png').split(',')[1];
}, cells);
fs.writeFileSync(path.join(srcDir, group ? `sheet-${group}.png` : 'sheet.png'), Buffer.from(sheet, 'base64'));
await browser.close();
process.exit(failed ? 1 : 0);
