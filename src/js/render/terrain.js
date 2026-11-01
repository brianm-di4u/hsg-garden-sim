// Painted terrain. Each material is a tiling painted texture laid down as one smooth region per chunk:
// a field sampled every third of a tile (bilinear over the tile grid plus a little value noise) is
// contoured with marching squares, so creek banks, shorelines, paths and the tufa get natural edges
// while collision stays on whole tiles. The field is defined in world coordinates, so neighbouring
// chunks meet exactly. Used only when the painted textures have loaded; art.js draws the vector tiles
// otherwise.
import { W, H, G } from '../sim/world.js';
import { noise } from '../sim/rng.js';
import { img } from './assets.js';
import { rgba, mix, shade } from './palette.js';
import { cached } from './art.js';

const STEP = 1 / 3;
const lerp = (a, b, t) => a + (b - a) * t;
// Integer lattice hash for the value noise: the field sampling calls it hundreds of thousands of times per chunk
// bake, so it avoids the string-joining hash in rng.js (render-only; nothing in the simulation uses it).
function ih(x, y, k) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(k | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y, k) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(ih(xi, yi, k), ih(xi + 1, yi, k), sx), lerp(ih(xi, yi + 1, k), ih(xi + 1, yi + 1, k), sx), sy);
}

// Texture name and repeat size (tiles) per ground material.
const REPEAT = { 'tex-grass': 5, 'tex-forest': 5, 'tex-path': 3, 'tex-gravel': 3, 'tex-asphalt': 4, 'tex-pavers': 2.5, 'tex-flagstone': 3,
  'tex-sand': 4, 'tex-creek': 3, 'tex-lake': 6, 'tex-soil': 2, 'tex-pinestraw': 2.5, 'tex-snow': 4, 'tex-rock': 4 };
export const TERRAIN_TEX = Object.keys(REPEAT);
export const terrainReady = () => ['tex-grass', 'tex-forest', 'tex-path', 'tex-creek'].every((n) => img(n));

// A texture pre-scaled to its repeat size at this tile size, as a canvas pattern source.
export function texCanvas(name, u) {
  const im = img(name);
  if (!im) return null;
  const px = Math.max(8, Math.round((REPEAT[name] || 4) * u));
  return cached(`tex|${name}|${px}`, px, px, (g) => {
    // Halve in steps so the downscale stays sharp.
    let src = im, w = im.naturalWidth;
    while (w / 2 >= px) {
      const c = document.createElement('canvas'); c.width = c.height = Math.ceil(w / 2);
      const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(src, 0, 0, c.width, c.height); src = c; w = c.width;
    }
    g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, px, px);
  });
}

const patterns = new WeakMap();
export function pattern(ctx, name, u) {
  const c = texCanvas(name, u);
  if (!c) return null;
  let p = patterns.get(c);
  if (!p) { p = ctx.createPattern(c, 'repeat'); patterns.set(c, p); }
  return p;
}

// ---------- marching squares ----------
// mask(tx, ty) -> 0..1 for a tile; the field is bilinear between tile centres, plus noise of amplitude `amp`.
function sampleField(mask, x0, y0, n, amp, k) {
  const F = new Float32Array((n + 1) * (n + 1));
  const memo = new Map();
  const m = (tx, ty) => { const key = tx * 1000 + ty; let v = memo.get(key); if (v === undefined) { v = mask(Math.max(0, Math.min(W - 1, tx)), Math.max(0, Math.min(H - 1, ty))); memo.set(key, v); } return v; };
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const px = x0 + i * STEP, py = y0 + j * STEP;
    const gx = px - 0.5, gy = py - 0.5, xi = Math.floor(gx), yi = Math.floor(gy);
    let fx = gx - xi, fy = gy - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const b = lerp(lerp(m(xi, yi), m(xi + 1, yi), fx), lerp(m(xi, yi + 1), m(xi + 1, yi + 1), fx), fy);
    let v = b - 0.5;
    // Noise only in the transition band, so it bends edges but never spawns islands or holes.
    if (amp) v += ((vnoise(px * 1.1, py * 1.1, k) - 0.5) * amp + (vnoise(px * 2.9, py * 2.9, k + 7) - 0.5) * amp * 0.45 + (vnoise(px * 0.28, py * 0.28, k + 13) - 0.5) * amp * 1.2) * Math.min(1, 6 * b * (1 - b));
    F[j * (n + 1) + i] = v;
  }
  return F;
}
// Returns { fill: Path2D of the inside, edge: Path2D of the iso line } in pixels (tile * u).
function contour(F, x0, y0, n, u) {
  const fill = new Path2D(), edge = new Path2D();
  const N = n + 1;
  const X = (i) => (x0 + i * STEP) * u, Y = (j) => (y0 + j * STEP) * u;
  for (let j = 0; j < n; j++) {
    let runStart = -1;
    for (let i = 0; i <= n; i++) {
      const a = i < n ? F[j * N + i] : -1, b = i < n ? F[j * N + i + 1] : -1, c = i < n ? F[(j + 1) * N + i + 1] : -1, d = i < n ? F[(j + 1) * N + i] : -1;
      const full = a > 0 && b > 0 && c > 0 && d > 0;
      if (full) { if (runStart < 0) runStart = i; continue; }
      if (runStart >= 0) { fill.rect(X(runStart), Y(j), X(i) - X(runStart), Y(j + 1) - Y(j)); runStart = -1; }
      if (i >= n) break;
      if (a <= 0 && b <= 0 && c <= 0 && d <= 0) continue;
      const pts = [], cross = [];
      const corners = [[X(i), Y(j), a], [X(i + 1), Y(j), b], [X(i + 1), Y(j + 1), c], [X(i), Y(j + 1), d]];
      for (let q = 0; q < 4; q++) {
        const [px, py, v] = corners[q], [nx, ny, w] = corners[(q + 1) % 4];
        if (v > 0) pts.push([px, py]);
        if ((v > 0) !== (w > 0)) { const t = v / (v - w); const p = [px + (nx - px) * t, py + (ny - py) * t]; pts.push(p); cross.push(p); }
      }
      if (pts.length > 2) { fill.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < pts.length; q++) fill.lineTo(pts[q][0], pts[q][1]); fill.closePath(); }
      for (let q = 0; q + 1 < cross.length; q += 2) { edge.moveTo(cross[q][0], cross[q][1]); edge.lineTo(cross[q + 1][0], cross[q + 1][1]); }
    }
  }
  return { fill, edge };
}
// A region straight from a continuous field f(px, py) (inside where f > 0), for soft natural patches.
function fieldRegion(x0, y0, n, u, f) {
  const F = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) F[j * (n + 1) + i] = f(x0 + i * STEP, y0 + j * STEP);
  return contour(F, x0, y0, n, u);
}
function region(ctx, x0, y0, n, u, mask, amp, k) {
  return contour(sampleField(mask, x0, y0, n, amp, k), x0, y0, n, u);
}

// ---------- the chunk ----------
// ctx is translated so that world tile (x, y) is at pixel (x*u, y*u). Draws tiles [tx0, tx0+size) x [ty0, ty0+size).
export function bakeTerrain(ctx, world, tx0, ty0, size, u, P, opts = {}) {
  const g = world.g;
  const at = (x, y) => g[y * W + x];
  const M = 1; // margin tiles so strokes cross chunk borders cleanly
  const x0 = tx0 - M, y0 = ty0 - M, n = Math.round((size + 2 * M) / STEP);
  const R = (mask, amp, k) => region(ctx, x0, y0, n, u, mask, amp, k);
  const is = (...vs) => (x, y) => (vs.includes(at(x, y)) ? 1 : 0);
  const fillTex = (path, name, tint, tintA, mode = 'color', fallback) => {
    const p = pattern(ctx, name, u) || (fallback && pattern(ctx, fallback, u));
    if (!p) { if (tint) { ctx.fillStyle = tint; ctx.fill(path); } return false; }
    ctx.fillStyle = p; ctx.fill(path);
    if (tint) { ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = tintA; ctx.fillStyle = tint; ctx.fill(path); ctx.restore(); }
    return true;
  };
  const stroke = (path, col, w, alpha = 1) => { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path); ctx.restore(); };
  const px0 = tx0 * u, py0 = ty0 * u, pw = size * u;
  const winter = P.sea === 'wi';

  // 1. Grass everywhere, tinted to the season, with soft lighter and darker patches.
  ctx.fillStyle = pattern(ctx, 'tex-grass', u); ctx.fillRect(px0, py0, pw, pw);
  ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = winter ? 0.62 : 0.42; ctx.fillStyle = P.grass; ctx.fillRect(px0, py0, pw, pw); ctx.restore();
  {
    const q = 8, span = size + 2 * M, pc = lowres(Math.ceil(span * u / q)), pg = pc.getContext('2d');
    pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, pc.width, pc.height); pg.translate(-x0 * u / q, -y0 * u / q);
    const a = fieldRegion(x0, y0, n, u / q, (px, py) => vnoise(px * 0.23, py * 0.23, 41) * 0.8 + vnoise(px * 0.9, py * 0.9, 42) * 0.2 - 0.6);
    pg.globalAlpha = 0.22; pg.fillStyle = shade(P.grass, -0.4); pg.fill(a.fill);
    const b = fieldRegion(x0, y0, n, u / q, (px, py) => vnoise(px * 0.2 + 9, py * 0.2, 47) * 0.8 + vnoise(px * 0.8, py * 0.8, 48) * 0.2 - 0.62);
    pg.globalAlpha = 0.18; pg.fillStyle = shade(P.grass, 0.4); pg.fill(b.fill);
    ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(pc, x0 * u, y0 * u, pc.width * q, pc.height * q); ctx.restore();
  }
  decals(ctx, world, tx0, ty0, size, u, P);

  // 2. Forest floor: pine straw and leaf litter under the woods.
  const forest = R(is(G.FOREST), 0.7, 3);
  stroke(forest.edge, shade(P.forest, -0.25), u * 0.2, 0.18);
  fillTex(forest.fill, 'tex-forest', P.forest, winter ? 0.45 : 0.28);

  // 3. Mown lawns, with stripes.
  const lawn = R(is(G.LAWN), 0.25, 9);
  fillTex(lawn.fill, 'tex-grass', P.lawn, winter ? 0.6 : 0.55);
  ctx.save(); ctx.clip(lawn.fill);
  for (let x = tx0 - 1; x < tx0 + size + 1; x++) { ctx.globalAlpha = 0.07; ctx.fillStyle = x % 2 ? shade(P.lawn, 0.5) : shade(P.lawn, -0.5); ctx.fillRect(x * u, py0 - u, u, pw + 2 * u); }
  ctx.restore();
  stroke(lawn.edge, shade(P.lawn, -0.35), u * 0.05, 0.4);

  // 4. Shore sand and rock, the gorge.
  fillTex(R(is(G.SAND), 0.8, 23).fill, 'tex-sand', '#c8b490', 0.2);
  const rock = R(is(G.ROCK), 0.6, 5);
  stroke(rock.edge, 'rgba(20,16,12,0.5)', u * 0.12, 0.6);
  fillTex(rock.fill, 'tex-rock', '#8a847a', 0.2);
  const gorge = R(is(G.GORGE), 0.5, 15);
  if (fillTex(gorge.fill, 'tex-rock', '#4a463e', 0.55, 'multiply')) {
    ctx.save(); ctx.clip(gorge.fill); ctx.globalAlpha = 0.35; ctx.fillStyle = '#0e100c'; ctx.fillRect(px0 - u, py0 - u, pw + 2 * u, pw + 2 * u); ctx.restore();
  }
  ctx.save(); ctx.translate(0, u * 0.12); stroke(gorge.edge, 'rgba(20,16,12,0.55)', u * 0.3); ctx.restore();
  stroke(gorge.edge, '#9a9080', u * 0.08, 0.8);

  // 5. Planting beds: pine-straw mulch with a cut edge.
  const bed = R(is(G.BED), 0, 17);
  stroke(bed.edge, '#4a3622', u * 0.16, 0.55);
  if (fillTex(bed.fill, 'tex-pinestraw', null, 0)) { ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = winter ? 0.3 : 0.1; ctx.fillStyle = '#8a5a32'; ctx.fill(bed.fill); ctx.restore(); }
  else { fillTex(bed.fill, 'tex-soil', '#a8642a', 0.45); straw(ctx, world, tx0, ty0, size, u); }

  // 6. Paths: gravel, flagstone, asphalt; the model-train ballast.
  const path = R(is(G.PATH, G.GRAVEL), 0.35, 7);
  stroke(path.edge, shade(P.grass, -0.45), u * 0.09, 0.35);
  fillTex(path.fill, 'tex-gravel', '#c8b48e', 0.3, 'color', 'tex-path');
  stroke(path.edge, '#e8dcc0', u * 0.03, 0.3);
  const stone = R(is(G.STONE), 0, 13);
  stroke(stone.edge, '#5a5246', u * 0.08, 0.5);
  fillTex(stone.fill, 'tex-flagstone', '#c4bcac', 0.15);
  const road = R(is(G.PARKING, G.ROAD), 0, 11);
  stroke(road.edge, '#d8d2c4', u * 0.16);
  fillTex(road.fill, 'tex-asphalt', '#5a5a60', 0.2);
  parkingLines(ctx, world, tx0, ty0, size, u);
  const rail = R(is(G.RAIL), 0, 19);
  fillTex(rail.fill, 'tex-gravel', '#8a8070', 0.4, 'color', 'tex-path');

  // 7. Water: the lake, the koi pond and the streams, with banks and a foam line. Bridges and the canopy walk are
  // drawn over the water by the scene.
  const isW = (x, y) => { const v = at(x, y); return v === G.WATER || v === G.DEEP || v === G.POND || v === G.STREAM || v === G.BRIDGE ? 1 : 0; };
  const water = R(isW, 0.55, 23);
  stroke(water.edge, '#6a5034', u * 0.3, 0.75);
  stroke(water.edge, '#3a2c1e', u * 0.14, 0.5);
  fillTex(water.fill, 'tex-lake', P.water, 0.45);
  const small = R((x, y) => { const v = at(x, y); return v === G.POND || v === G.STREAM || (v === G.BRIDGE && !world.lake[y * W + x]) ? 1 : 0; }, 0.4, 27);
  if (fillTex(small.fill, 'tex-creek', '#3a7a7a', 0.25)) {
    const deep = R(is(G.DEEP), 0.9, 29);
    ctx.save(); ctx.globalAlpha = 0.38; ctx.fillStyle = shade(P.deep, -0.35); ctx.fill(deep.fill); ctx.restore();
    stroke(water.edge, '#cfe8e0', u * 0.22, 0.22);
    stroke(water.edge, '#ffffff', u * 0.035, 0.55);
  }

  // 8. Snow cover on snow days.
  if (opts.snow) {
    const snow = R((x, y) => { const v = at(x, y); return v === G.GRASS || v === G.FOREST || v === G.LAWN || v === G.ROCK || v === G.SAND || v === G.BED ? 1 : 0; }, 0.9, 37);
    ctx.save(); ctx.clip(snow.fill);
    ctx.globalAlpha = 0.95; ctx.fillStyle = pattern(ctx, 'tex-snow', u) || '#f4f6f8'; ctx.fillRect(px0, py0, pw, pw);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.fillRect(px0, py0, pw, pw);
    ctx.restore();
  }
}
// Pine straw drawn as short strokes when the painted straw texture has not loaded.
function straw(ctx, world, tx0, ty0, size, u) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, u * 0.025);
  for (let y = Math.max(0, ty0); y < Math.min(H, ty0 + size); y++) for (let x = Math.max(0, tx0); x < Math.min(W, tx0 + size); x++) {
    if (world.g[y * W + x] !== G.BED) continue;
    for (let i = 0; i < 9; i++) {
      const n = (k) => noise(x, y, 800 + i * 7 + k);
      const sx = (x + n(0)) * u, sy = (y + n(1)) * u, a = n(2) * Math.PI, l = u * (0.14 + n(3) * 0.12);
      ctx.strokeStyle = ['#c88a3a', '#a8642a', '#d8a050'][i % 3]; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); ctx.stroke();
    }
  }
  ctx.restore();
}
function parkingLines(ctx, world, tx0, ty0, size, u) {
  ctx.save(); ctx.fillStyle = '#eeebe2'; ctx.globalAlpha = 0.8;
  for (let y = Math.max(0, ty0); y < Math.min(H, ty0 + size); y++) for (let x = Math.max(0, tx0); x < Math.min(W, tx0 + size); x++) {
    if (world.g[y * W + x] !== G.PARKING) continue;
    if ((y === 44 || y === 53) && x % 2 === 0) ctx.fillRect((x + 0.95) * u, (y - 0.4) * u, u * 0.06, u * 1.2);
  }
  ctx.restore();
}
// Small things in the grass that make it read as a meadow: wildflowers by season, fallen petals in autumn,
// darker clover and the odd pebble. Baked with the chunk; purely visual.
const BLOOM = { sp: ['#f4f0e4', '#f2d24a', '#b67ad8', '#e88aa8'], su: ['#f2d24a', '#f4f0e4', '#e8803a'], fa: ['#d8a040', '#c8642a', '#9a4a2a'], wi: [] };
function decals(ctx, world, tx0, ty0, size, u, P) {
  const g = world.g, cols = BLOOM[P.sea] || [];
  for (let y = Math.max(0, ty0); y < Math.min(H, ty0 + size); y++) for (let x = Math.max(0, tx0); x < Math.min(W, tx0 + size); x++) {
    if (g[y * W + x] !== G.GRASS) continue;
    const n = (k) => noise(x, y, 500 + k);
    if (n(0) < 0.28) {
      ctx.fillStyle = rgba(shade(P.grass, -0.45), 0.35);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse((x + n(i + 1)) * u, (y + n(i + 4)) * u, u * 0.07, u * 0.045, n(i + 7) * 3, 0, 7); ctx.fill(); }
    }
    if (cols.length && n(10) < (P.sea === 'sp' ? 0.14 : 0.08)) {
      const fx = (x + 0.2 + n(11) * 0.6) * u, fy = (y + 0.2 + n(12) * 0.6) * u, col = cols[Math.floor(n(13) * cols.length)];
      for (let i = 0; i < 4; i++) {
        const px = fx + (n(14 + i) - 0.5) * u * 0.4, py = fy + (n(18 + i) - 0.5) * u * 0.3;
        if (P.sea === 'fa') { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(px, py, u * 0.05, u * 0.028, n(22 + i) * 3, 0, 7); ctx.fill(); continue; }
        ctx.fillStyle = rgba('#2a4a1a', 0.5); ctx.beginPath(); ctx.arc(px + u * 0.01, py + u * 0.015, u * 0.04, 0, 7); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, u * 0.035, 0, 7); ctx.fill();
      }
    }
    if (n(30) < 0.05) { ctx.fillStyle = '#9a968c'; ctx.beginPath(); ctx.ellipse((x + n(31)) * u, (y + n(32)) * u, u * 0.06, u * 0.04, 0, 0, 7); ctx.fill(); }
  }
}

let lowC = null;
function lowres(w) { if (!lowC || lowC.width < w) { lowC = document.createElement('canvas'); lowC.width = lowC.height = w; } return lowC; }
export { rgba };
