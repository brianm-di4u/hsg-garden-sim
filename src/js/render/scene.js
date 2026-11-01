// Frame rendering: chunk-cached ground and buildings, ground clutter, a y-sorted dynamic layer (plants, trees,
// display pieces, people, visitors, peafowl), particles, weather and night lighting (with Holiday Lights).
import { W, H, G, isWalkway } from '../sim/world.js';
import * as sim from '../sim/sim.js';
import { PEOPLE, ITEMS, PLANTS, TULIP_COLORS } from '../sim/data.js';
import { palette, LIGHT, NIGHT, SIGN_FONT, rgba, mix, shade } from './palette.js';
import { cached, drawGround, drawBuilding, signText, personSprite, treeSprite, objSprite, iconCanvas, clearArt } from './art.js';
import { ART, img as artImg } from './assets.js';
import { bakeTerrain, terrainReady } from './terrain.js';
import * as PA from './painted.js';
import * as GA from './garden.js';
import { noise } from '../sim/rng.js';

const CHUNK = 16;
export const R = { signs: [],
  canvas: null, ctx: null, dpr: 1, cssW: 0, cssH: 0, ts: 40, u: 40, cam: { x: 0, y: 0 }, chunks: new Map(),
  cu: 40, fallback: new Set(), particles: [], pops: [], night: null, useT: -1e9, artFlushT: 0, reduced: false, mobile: false, offsetY: 0, frames: 0, chunkBakes: 0, lastT: 0, hover: null,
};
const CHUNK_CACHE = 24;

export function setup(canvas) {
  R.canvas = canvas; R.ctx = canvas.getContext('2d');
  R.nightEl = document.getElementById('nightfx');
  resize();
}
export function resize() {
  const c = R.canvas;
  R.cssW = c.clientWidth || window.innerWidth; R.cssH = c.clientHeight || window.innerHeight;
  R.dpr = Math.min(R.cssW < 700 ? 1.5 : 2, window.devicePixelRatio || 1);
  c.width = Math.round(R.cssW * R.dpr); c.height = Math.round(R.cssH * R.dpr);
  R.mobile = R.cssW < 700;
  const ts = R.mobile ? 38 : (R.cssW >= 1100 ? 60 : 54);
  if (ts !== R.ts || Math.round(ts * R.dpr) !== R.u) {
    R.ts = ts; R.u = Math.round(ts * R.dpr);
    R.cu = Math.min(R.u, Math.round(ts * 1.5));
    R.chunks.clear(); clearArt();
  }
  R.offsetY = R.mobile ? -R.cssH * 0.1 : 0;
  R.night = null;
}

function chunkCanvas(gm, cx, cy, P) {
  const S = gm.S;
  const painted = terrainReady();
  const snow = painted && S.weather === 'snow';
  const k = `${P.sea}|${cx},${cy}|${R.cu}|${painted ? 1 : 0}|${snow ? 1 : 0}`;
  let c = R.chunks.get(k);
  if (c) { R.chunks.delete(k); R.chunks.set(k, c); return c; }
  if (R.chunks.size > CHUNK_CACHE) { const first = R.chunks.keys().next().value; R.chunks.delete(first); }
  const u = R.cu;
  const t0 = performance.now();
  c = document.createElement('canvas');
  c.width = CHUNK * u; c.height = CHUNK * u;
  const ctx = c.getContext('2d');
  ctx.translate(-cx * CHUNK * u, -cy * CHUNK * u);
  const g = gm.world.g;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? G.DEEP : g[y * W + x]);
  if (painted) bakeTerrain(ctx, gm.world, cx * CHUNK, cy * CHUNK, CHUNK, u, P, { snow });
  else for (let y = cy * CHUNK; y < Math.min(H, (cy + 1) * CHUNK); y++) for (let x = cx * CHUNK; x < Math.min(W, (cx + 1) * CHUNK); x++) {
    drawGround(ctx, at(x, y), x, y, u, P, { n: at(x, y - 1), s: at(x, y + 1), w: at(x - 1, y), e: at(x + 1, y) });
  }
  // Bridges, the canopy walk and the model-train rails over the ground.
  for (let y = cy * CHUNK - 1; y < Math.min(H, (cy + 1) * CHUNK + 1); y++) for (let x = cx * CHUNK - 1; x < Math.min(W, (cx + 1) * CHUNK + 1); x++) {
    const v = at(x, y);
    if (v === G.BRIDGE || v === G.BOARDWALK || v === G.RAIL) tileOverlay(ctx, v, x, y, u, at, gm);
  }
  // Buildings that overlap this chunk (clipped to it).
  ctx.save();
  ctx.beginPath(); ctx.rect(cx * CHUNK * u, cy * CHUNK * u, CHUNK * u, CHUNK * u); ctx.clip();
  for (const b of gm.world.buildings) {
    if (b.x + b.w + 2 < cx * CHUNK || b.x - 2 > (cx + 1) * CHUNK || b.y + b.h + 1 < cy * CHUNK || b.y - 3 > (cy + 1) * CHUNK) continue;
    if (PA.buildingSprite(b, u)) footing(ctx, b, u);
    else drawBuilding(ctx, b, u, P);
  }
  ctx.restore();
  R.chunks.set(k, c);
  R.chunkBakes++; R.bakedFrame = R.frames;
  R.bakeMs = Math.max(R.bakeMs || 0, performance.now() - t0);
  (R.bakeLog || (R.bakeLog = [])).push(Math.round(performance.now() - t0)); if (R.bakeLog.length > 20) R.bakeLog.shift();
  return c;
}
export function invalidateChunks() { R.chunks.clear(); }

export function camera(gm) {
  const p = gm.S.player;
  const vw = R.cssW / R.ts, vh = R.cssH / R.ts;
  let cx = p.x - vw / 2, cy = p.y - 0.75 - vh / 2 - R.offsetY / R.ts;
  cx = vw >= W ? (W - vw) / 2 : Math.max(0, Math.min(W - vw, cx));
  cy = vh >= H ? (H - vh) / 2 : Math.max(0, Math.min(H - vh, cy));
  if (!R.reduced && R.camInit) { R.cam.x += (cx - R.cam.x) * 0.25; R.cam.y += (cy - R.cam.y) * 0.25; if (Math.abs(cx - R.cam.x) < 0.01) R.cam.x = cx; if (Math.abs(cy - R.cam.y) < 0.01) R.cam.y = cy; }
  else { R.cam.x = cx; R.cam.y = cy; R.camInit = true; }
  return R.cam;
}
export const snapCamera = (gm) => { R.camInit = false; camera(gm); };
export function screenToTile(sx, sy) { return { x: Math.floor(R.cam.x + sx / R.ts), y: Math.floor(R.cam.y + sy / R.ts) }; }
export function tileToScreen(x, y) { return { x: (x - R.cam.x) * R.ts, y: (y - R.cam.y) * R.ts }; }

// ---------- particles ----------
export function addPop(x, y, item, n) { R.pops.push({ x: x + 0.5, y: y + 0.2, item, n, t: 0 }); }
// Tool feedback: soil for the trowel, splashes for the can, chips for the saw, leaves for the rake and pruners,
// sparks for the lights. Reduced motion keeps a single short ring and no flying particles.
export function addFx(kind, x, y) {
  const cx = x + 0.5, cy = y + 0.62, P = R.particles;
  if (kind === 'water' || kind === 'dirt') P.push({ ring: true, x: cx, y: cy, life: 22, max: 22, col: kind === 'water' ? '#d8f0ff' : '#c8a87a' });
  if (R.reduced) return;
  const spec = { dirt: [['#6a4a2e', '#8a6a48', '#4a3422'], 9, 0.07, 0.065], water: [['#bfe4fa', '#8cc8ec', '#ffffff'], 10, 0.05, 0.07], chip: [['#d8b07a', '#a87a48', '#f0d8a8'], 8, 0.08, 0.07],
    spark: [['#ffffff', '#ffe6a0', '#ff8ae0'], 9, 0.06, 0.09], leaf: [['#c8642a', '#d8a040', '#5a8a3a'], 8, 0.08, 0.06], grass: [['#6aa84a', '#8ac85a', '#4a8a3a'], 10, 0.06, 0.06],
    straw: [['#c88a3a', '#d8a050', '#a8642a'], 8, 0.08, 0.05], pick: [['#e8e4dc', '#c83a3a'], 4, 0.06, 0.05] }[kind] || [['#fff'], 6, 0.06, 0.06];
  const [cols, n, s, v] = spec;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = v * (0.4 + Math.random() * 0.8);
    P.push({ x: cx, y: cy - 0.1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 26 + Math.random() * 10, col: cols[i % cols.length], s: s * (0.6 + Math.random() * 0.8), round: kind !== 'chip' && kind !== 'straw', ground: cy + 0.1 + Math.random() * 0.2, spark: kind === 'spark' });
  }
}
export function addHearts(x, y) {
  const n = R.reduced ? 1 : 5;
  for (let i = 0; i < n; i++) R.particles.push({ x: x + (Math.random() - 0.5) * 0.5, y: y - 1.6, vx: (Math.random() - 0.5) * 0.01, vy: -0.016 - Math.random() * 0.01, life: 60 + i * 6, max: 60 + i * 6, heart: true, s: 0.2 + Math.random() * 0.08 });
}

// ---------- the frame ----------
export function draw(gm, ui) {
  const S = gm.S, ctx = R.ctx, ts = R.ts, u = R.u;
  const now = performance.now();
  const dt = Math.min(3, R.lastT ? (now - R.lastT) / 16.67 : 1); R.lastT = now;
  R.frames++;
  const sea = sim.season(S), d = sim.doy(S), yr = sim.yearNo(S);
  const P = palette(sea);
  const cam = camera(gm);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = P.deep; ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);
  const sx0 = Math.floor(cam.x), sy0 = Math.floor(cam.y), sx1 = Math.ceil(cam.x + R.cssW / ts), sy1 = Math.ceil(cam.y + R.cssH / ts);
  const ox = -cam.x * u, oy = -cam.y * u;
  if (ART.dirty && (ART.pending === 0 || now - R.artFlushT > 600)) {
    ART.dirty = false; R.artFlushT = now;
    if (ART.fresh.some((n) => n.startsWith('tex-') || n.startsWith('bld-'))) R.chunks.clear();
    ART.fresh.length = 0;
  }
  const cs = CHUNK * u;
  for (let cy = Math.max(0, Math.floor(sy0 / CHUNK)); cy <= Math.min(Math.floor((H - 1) / CHUNK), Math.floor(sy1 / CHUNK)); cy++)
    for (let cx = Math.max(0, Math.floor(sx0 / CHUNK)); cx <= Math.min(Math.floor((W - 1) / CHUNK), Math.floor(sx1 / CHUNK)); cx++)
      ctx.drawImage(chunkCanvas(gm, cx, cy, P), Math.round(ox + cx * cs), Math.round(oy + cy * cs), cs, cs);
  ctx.setTransform(1, 0, 0, 1, Math.round(ox), Math.round(oy));
  const inView = (x, y) => x >= sx0 - 3 && x <= sx1 + 2 && y >= sy0 - 1 && y <= sy1 + 4;
  // Ground clutter: grass to mow, weeds, leaves, litter, frost cloth, bed plantings (flat ones).
  groundLayer(ctx, gm, P, sx0, sy0, sx1, sy1, u, d);
  waterFx(ctx, gm, sx0, sy0, sx1, sy1, u, now);
  const night = sim.darkness(S) > 0.3;
  // Dynamic layer.
  const list = [];
  const pl = S.player;
  for (const [k, o] of Object.entries(S.objs)) { const [x, y] = k.split(',').map(Number); if (inView(x, y)) list.push(objEntry(ctx, gm, o, x, y, P, u, pl, d, yr, now, night)); }
  for (const f of gm.world.fixed) if (inView(f.x, f.y)) list.push(fixedEntry(ctx, gm, f, P, u));
  for (const l of gm.world.lamps) if (l.post && inView(Math.floor(l.x), Math.floor(l.y))) {
    const sp = PA.lampSprite('led', u);
    if (sp) list.push({ y: l.y + 0.05, d: () => ctx.drawImage(sp.c, l.x * u + sp.ox, (l.y + 0.05) * u + sp.oy) });
    else list.push({ y: l.y, d: () => ctx.drawImage(objSprite({ t: 'lamp' }, P, u), (l.x - 0.8) * u, (l.y - 1.55) * u) });
  }
  // Display pieces and their stakes.
  for (const m of gm.world.markers) {
    if (!inView(m.x, m.y) || m.wrap) continue;
    const st = S.disp[m.id], ph = sim.phase(m.show, d);
    if (!st) { if (ph === 'install' || (ph === 'live' && m.show === 'fall')) list.push({ y: m.y + 0.5, d: () => GA.drawStake(ctx, m.x, m.y, u, m.show === 'hl' ? '#4ac8f0' : '#e8a020') }); continue; }
    const lit = m.show === 'hl' && night && st.st === 'ok';
    const sp = GA.pieceSprite(m.item, u, lit, st.st === 'dark', R.reduced ? 0 : now);
    list.push({ y: m.y + 0.92, d: () => { ctx.drawImage(sp.c, (m.x + 0.5) * u + sp.ox, (m.y + 0.95) * u + sp.oy); if (st.st === 'set') bubble(ctx, (m.x + 0.8) * u, (m.y - 0.6) * u, '?', u * 0.8, '#f4c542'); if (st.st === 'dark') bubble(ctx, (m.x + 0.8) * u, (m.y - 0.6) * u, '!', u * 0.8, '#ff7a6a'); } });
  }
  for (const b of gm.world.buildings) {
    if (b.x + b.w < sx0 - 1 || b.x > sx1 + 1 || b.y > sy1 + 1 || b.y + b.h < sy0 - 3) continue;
    const sp = PA.buildingSprite(b, u, S.weather === 'snow');
    if (sp) list.push({ y: b.y + b.h - 0.02, d: () => { ctx.drawImage(sp.c, sp.x, sp.y); if (b.label) buildingLabel(ctx, b, sp, u); } });
  }
  // Wedding setups.
  if (S.wedding && S.wedding.setup && !S.wedding.struck) { const f = gm.world.fixed.find((x) => x.t === 'venue' && x.k === S.wedding.venue); if (f && inView(f.x, f.y)) list.push({ y: f.y + 1.2, d: () => weddingSetup(ctx, f, u) }); }
  const walkFrame = (t) => 'walk' + (Math.floor(t) % 4);
  // Visitors.
  for (const v of S.visitors) {
    if (!inView(Math.floor(v.x), Math.floor(v.y))) continue;
    const look = sim.visitorLook(v.id);
    list.push({ y: v.y, sh: [v.x, v.y, 0.28], d: () => {
      const moving = v.moving && !R.reduced;
      const id = 'v' + (v.id % 40);
      const sp = PA.personSprite(id, look, v.face || 'down', moving ? walkFrame(now / 150 + v.id) : 'idle', u);
      if (sp) ctx.drawImage(sp.c, v.x * u + sp.ox, v.y * u + sp.oy);
      else ctx.drawImage(personSprite(id, look, v.face || 'down', moving ? (Math.floor(now / 160) % 2) : 0, u), (v.x - 0.5) * u, (v.y - 1.5) * u);
      if (v.dog) dog(ctx, v, u, now);
      if (v.emoteT > 0 && v.emote) bubble(ctx, v.x * u + u * 0.4, (v.y - 1.7) * u, v.emote, u * 0.85, v.emote === '…' ? '#d8d0c0' : '#f8e8f0');
    } });
  }
  // Staff.
  for (const [id, n] of Object.entries(S.npcs)) {
    if (n.hidden || !inView(Math.floor(n.x), Math.floor(n.y))) continue;
    const p = PEOPLE[id];
    list.push({ y: n.y, sh: [n.x, n.y, 0.3], d: () => {
      const moving = n.moving && !R.reduced;
      const sp = PA.personSprite(id, p.look, n.face || 'down', moving ? walkFrame(now / 140) : 'idle', u);
      if (sp) ctx.drawImage(sp.c, n.x * u + sp.ox, n.y * u + sp.oy);
      else ctx.drawImage(personSprite(id, p.look, n.face || 'down', moving ? (Math.floor(now / 160) % 2) : 0, u), (n.x - 0.5) * u, (n.y - 1.5) * u);
    } });
  }
  // Peafowl.
  for (const b of S.peafowl) {
    if (!inView(Math.floor(b.x), Math.floor(b.y))) continue;
    if (b.mode === 'roost') { list.push({ y: b.ry + 1.2, d: () => { const sp = GA.peafowlSprite({ ...b, mode: 'peck' }, u * 0.8, 0); ctx.drawImage(sp.c, (b.rx + 0.5) * u + sp.ox, (b.ry - 0.7) * u + sp.oy); } }); continue; }
    const frame = R.reduced ? 0 : Math.floor(now / (b.mode === 'peck' ? 380 : 180)) % 2;
    list.push({ y: b.y, sh: [b.x, b.y, b.mode === 'fan' ? 0.6 : 0.3], d: () => {
      const art = PA.animalSprite(b.sex === 'm' ? (b.mode === 'fan' ? 'peacock-fan' : 'peacock') : 'peahen', b.face, u);
      if (art) ctx.drawImage(art.c, b.x * u + art.ox, b.y * u + art.oy);
      else { const sp = GA.peafowlSprite(b, u, frame); ctx.drawImage(sp.c, b.x * u + sp.ox, b.y * u + sp.oy); }
      if (S.peafowlInBeds && S.peafowlInBeds[b.id]) bubble(ctx, b.x * u + u * 0.3, (b.y - 1.3) * u, '!', u * 0.8, '#f4c542');
    } });
  }
  // The player.
  const look = { shirt: '#3a6a3a', pants: '#4a4238', hair: '#3b2a1c', skin: 2, hat: pl.hat || 'cap', hatColor: pl.hatColor };
  list.push({ y: pl.y + 0.001, sh: [pl.x, pl.y, 0.3], d: () => {
    const since = now - R.useT;
    const frame = since < 110 ? 'use0' : since < 300 ? 'use1' : pl.moving && !R.reduced ? walkFrame(pl.walk / 7) : 'idle';
    const pid = 'player|' + look.hat + look.hatColor;
    const sp = PA.personSprite(pid, look, pl.face, frame, u);
    const swing = since < 300 && !R.reduced && sim.selected(S);
    const behind = pl.face === 'up';
    if (swing && behind) toolSwing(ctx, S, pl, since, u);
    if (sp) ctx.drawImage(sp.c, pl.x * u + sp.ox, pl.y * u + sp.oy);
    else ctx.drawImage(personSprite(pid, look, pl.face, pl.moving && !R.reduced ? (Math.floor(pl.walk / 8) % 2) : 0, u), (pl.x - 0.5) * u, (pl.y - 1.5) * u);
    if (swing && !behind) toolSwing(ctx, S, pl, since, u);
  } });
  // Shadows first, then the sorted layer.
  const sun = sunShadow(S);
  if (sun.a > 0.01) {
    ctx.save();
    for (const it of list) if (it.sh) blobShadow(ctx, it.sh[0], it.sh[1], it.sh[2], u, sun);
    for (const it of list) if (it.sil) silShadow(ctx, it.sil, u, sun);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, Math.round(ox), Math.round(oy));
  }
  list.sort((a, b) => a.y - b.y);
  if (ui.showTarget) {
    const t = ui.targetOverride || sim.target(gm);
    ctx.lineWidth = Math.max(2, u * 0.06);
    ctx.strokeStyle = 'rgba(20,16,12,0.85)'; ctx.strokeRect(t.x * u + u * 0.06, t.y * u + u * 0.06, u * 0.88, u * 0.88);
    ctx.strokeStyle = 'rgba(255,250,235,0.95)'; ctx.lineWidth = Math.max(1, u * 0.03); ctx.strokeRect(t.x * u + u * 0.06, t.y * u + u * 0.06, u * 0.88, u * 0.88);
  }
  R.signs = [];
  for (const it of list) it.d();
  // Name tags for staff near the player, and George.
  ctx.font = `bold ${Math.round(u * 0.3)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tags = [];
  const hit = (x, y, w, h) => [...R.signs, ...tags].find((t) => x < t.x + t.w && t.x < x + w && y < t.y + t.h && t.y < y + h);
  const tag = (name, x0, y0) => {
    const w = ctx.measureText(name).width + u * 0.3, h = u * 0.38;
    let x = x0 - w / 2, y = y0;
    for (let k = 0, o; k < 4 && (o = hit(x, y, w, h)); k++) y = o.y - h - u * 0.06;
    tags.push({ x, y, w, h });
    ctx.fillStyle = 'rgba(16,14,12,0.82)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff'; ctx.fillText(name, x + w / 2, y + h / 2 + u * 0.01);
  };
  for (const [id, n] of Object.entries(S.npcs)) if (!n.hidden && Math.hypot(n.x - pl.x, n.y - pl.y) < 3.2) tag(PEOPLE[id].name.split(' ')[0], n.x * u, (n.y - 2.38) * u);
  for (const b of S.peafowl) if (b.id === 'george' && b.mode !== 'roost' && Math.hypot(b.x - pl.x, b.y - pl.y) < 3) tag('George', b.x * u, (b.y - 1.6) * u);
  // Particles and pops.
  drawParticles(ctx, u, dt);
  R.pops = R.pops.filter((p) => (p.t += dt) < 50);
  for (const p of R.pops) {
    const a = Math.min(1, (50 - p.t) / 15), lift = R.reduced ? 0.5 : 0.45 + p.t * 0.012;
    ctx.globalAlpha = a;
    ctx.drawImage(iconCanvas(p.item, Math.round(u * 0.6)), (p.x - 0.3) * u, (p.y - 1.2 - lift) * u);
    ctx.globalAlpha = 1;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  weather(ctx, S, now, dt);
  nightPass(gm, P, cam, now);
  prefetch(gm, P, sx0, sy0, sx1, sy1);
}

// Flat things on the ground, in view.
function groundLayer(ctx, gm, P, sx0, sy0, sx1, sy1, u, d) {
  const S = gm.S;
  const vis = (k) => { const i = k.indexOf(','), x = +k.slice(0, i), y = +k.slice(i + 1); return x >= sx0 - 1 && x <= sx1 && y >= sy0 - 1 && y <= sy1 ? [x, y] : null; };
  for (const [k, v] of Object.entries(S.grass)) { const p = vis(k); if (p && v >= 2) GA.drawTallGrass(ctx, p[0], p[1], v, u, P.lawn); }
  for (const [k, b] of Object.entries(S.beds)) {
    const p = vis(k); if (!p) continue;
    const L = sim.bedLook(S, b, d); if (!L) continue;
    if (b.p === 'annual') { const sp = GA.annualSprite(L, u, p[0], p[1]); ctx.drawImage(sp.c, p[0] * u, p[1] * u); }
    else { const sp = GA.bedSprite(L, u, p[0], p[1]); ctx.drawImage(sp.c, p[0] * u + sp.ox, p[1] * u + sp.oy); }
  }
  for (const [k, v] of Object.entries(S.weeds)) { const p = vis(k); if (p) GA.drawWeeds(ctx, p[0], p[1], v, u); }
  for (const [k, v] of Object.entries(S.leaves)) { const p = vis(k); if (p) GA.drawLeaves(ctx, p[0], p[1], v, u, P.sea); }
  for (const [k, kind] of Object.entries(S.litter)) { const p = vis(k); if (p) GA.drawLitter(ctx, p[0], p[1], kind, u); }
  for (const k of Object.keys(S.covered)) { const p = vis(k); if (p) GA.drawCloth(ctx, p[0], p[1], u); }
  // The day's tulip design during planting: faint coloured string-line marks on the empty bed tiles.
  if (d >= 84 && d <= 102) for (const k of gm.tulipTiles) {
    if (S.beds[k]) continue;
    const p = vis(k); if (!p) continue;
    const bed = gm.bedMap[k];
    const c = TULIP_COLORS[sim.tulipDesign(bed, p[0], p[1], sim.yearNo(S))];
    ctx.fillStyle = rgba(c, 0.35); ctx.fillRect(p[0] * u + u * 0.3, p[1] * u + u * 0.3, u * 0.4, u * 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, u * 0.015); ctx.strokeRect(p[0] * u + 0.5, p[1] * u + 0.5, u - 1, u - 1);
  }
}

function objEntry(ctx, gm, o, x, y, P, u, pl, d, yr, now, night) {
  const S = gm.S;
  if (o.t === 'tree') {
    const L = sim.plantLook(o, d, yr);
    const wrap = gm.markerMap[x + ',' + y];
    const st = wrap && wrap.wrap ? S.disp[wrap.id] : null;
    const bx = (x + 0.5) * u, by = (y + 0.92) * u;
    const behind = (sp) => { const px = pl.x * u, py = (pl.y - 0.6) * u; return pl.y < y + 0.92 && px > bx + sp.ox + u * 0.2 && px < bx + sp.ox + sp.c.width - u * 0.2 && py > by + sp.oy && py < by; };
    // Painted trees: seasonal art where it exists (it carries its own blossom); otherwise only when not in bloom.
    const art = PA.treeArt(o.k, P.sea);
    const painted = art && (!L.bloom || art.endsWith('-' + P.sea)) ? PA.treeSprite(o.k, P.sea, u, x, y) : null;
    const sp = painted || (() => { const c = treeSprite(o.k, P, u, L); return { c, ox: -u * 0.8, oy: -u * 2.35 }; })();
    const wrapDraw = st ? () => GA.drawWrap(ctx, x, y, u, night && st.st === 'ok', st.st === 'dark', R.reduced ? 0 : now) : null;
    return { y: y + 0.95, sil: { c: sp.c, bx, by, ox: sp.ox, oy: sp.oy }, d: () => { const b = behind(sp); if (b) ctx.globalAlpha = 0.45; ctx.drawImage(sp.c, bx + sp.ox, by + sp.oy); ctx.globalAlpha = 1; if (wrapDraw) wrapDraw(); if (st && st.st !== 'ok') bubble(ctx, bx + u * 0.3, by - u * 2.2, st.st === 'dark' ? '!' : '?', u * 0.8, st.st === 'dark' ? '#ff7a6a' : '#f4c542'); } };
  }
  if (o.t === 'plant') {
    const L = sim.plantLook(o, d, yr);
    if (L.hidden) return { y: y, d: () => {} };
    const sp = GA.plantSprite(o, L, u, x, y);
    const bx = (x + 0.5) * u, by = (y + 0.95) * u;
    const low = PLANTS[o.k] && PLANTS[o.k].size === 'low';
    return { y: y + (low ? 0.5 : 0.95), d: () => { ctx.drawImage(sp.c, bx + sp.ox, by + sp.oy); if ((o.hp ?? 100) < 40 && !low) bubble(ctx, bx + u * 0.3, by - u * 1.2, '💧', u * 0.7, '#cfe8f8'); } };
  }
  const sp = PA.propSprite(o.t, u, x, y);
  if (sp) { const bx = (x + 0.5) * u, by = (y + 0.9) * u; return { y: y + 0.95, sil: { c: sp.c, bx, by, ox: sp.ox, oy: sp.oy }, d: () => ctx.drawImage(sp.c, bx + sp.ox, by + sp.oy) }; }
  return { y: y + 0.95, d: () => ctx.drawImage(objSprite(o, P, u), (x - 0.3) * u, (y - 0.6) * u) };
}
function fixedEntry(ctx, gm, f, P, u) {
  const sp = PA.propSprite(f.t, u, f.x, f.y);
  if (sp) { const bx = (f.x + 0.5) * u, by = (f.y + 0.9) * u; return { y: f.y + 0.95, d: () => ctx.drawImage(sp.c, bx + sp.ox, by + sp.oy) }; }
  return { y: f.y + 0.95, d: () => ctx.drawImage(objSprite(f, P, u), (f.x - 0.3) * u, (f.y - 0.6) * u) };
}
function weddingSetup(ctx, f, u) {
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const cx = (f.x - 1 + i * 0.9) * u, cy = (f.y + 1.6 + r * 0.6) * u; ctx.fillStyle = '#f4f0ea'; ctx.fillRect(cx, cy - u * 0.3, u * 0.3, u * 0.3); ctx.fillStyle = '#c8c0b0'; ctx.fillRect(cx, cy - u * 0.42, u * 0.3, u * 0.12); }
  ctx.strokeStyle = '#f4f0ea'; ctx.lineWidth = u * 0.1; ctx.beginPath(); ctx.arc((f.x + 0.5) * u, (f.y + 0.2) * u, u * 0.6, Math.PI, 0); ctx.stroke();
  for (let i = 0; i < 7; i++) { const a = Math.PI + i / 6 * Math.PI; ctx.fillStyle = i % 2 ? '#f2c4cc' : '#ffffff'; ctx.beginPath(); ctx.arc((f.x + 0.5) * u + Math.cos(a) * u * 0.6, (f.y + 0.2) * u + Math.sin(a) * u * 0.6, u * 0.1, 0, 7); ctx.fill(); }
}
function dog(ctx, v, u, now) {
  const dx = v.face === 'left' ? 0.6 : v.face === 'right' ? -0.6 : 0.5, x = (v.x + dx) * u, y = (v.y + 0.05) * u, bob = R.reduced ? 0 : Math.sin(now / 90 + v.id) * u * 0.02;
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(1, u * 0.015); ctx.beginPath(); ctx.moveTo(v.x * u, (v.y - 0.6) * u); ctx.lineTo(x, y - u * 0.25); ctx.stroke();
  ctx.fillStyle = ['#8a5a2a', '#e8d8b8', '#2a2420'][v.id % 3];
  ctx.beginPath(); ctx.ellipse(x, y - u * 0.18 + bob, u * 0.2, u * 0.1, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + (v.face === 'left' ? -1 : 1) * u * 0.18, y - u * 0.28 + bob, u * 0.08, u * 0.07, 0, 0, 7); ctx.fill();
  ctx.fillRect(x - u * 0.12, y - u * 0.1, u * 0.04, u * 0.1); ctx.fillRect(x + u * 0.08, y - u * 0.1, u * 0.04, u * 0.1);
}

// Chunks just outside the view are baked ahead on quiet frames.
let pre = null;
function prefetch(gm, P, sx0, sy0, sx1, sy1) {
  if (R.bakedFrame === R.frames || R.frames % 3) return;
  const m = 6, out = [];
  for (let cy = Math.max(0, Math.floor((sy0 - m) / CHUNK)); cy <= Math.min(Math.floor((H - 1) / CHUNK), Math.floor((sy1 + m) / CHUNK)); cy++)
    for (let cx = Math.max(0, Math.floor((sx0 - m) / CHUNK)); cx <= Math.min(Math.floor((W - 1) / CHUNK), Math.floor((sx1 + m) / CHUNK)); cx++) out.push([cx, cy]);
  if (out.length > CHUNK_CACHE) return;
  const k0 = R.chunkBakes;
  for (const [cx, cy] of out) {
    const c = chunkCanvas(gm, cx, cy, P);
    if (R.chunkBakes !== k0) { if (!pre) { pre = document.createElement('canvas'); pre.width = pre.height = 1; } pre.getContext('2d').drawImage(c, 0, 0, 1, 1); return; }
  }
}

// ---------- helpers ----------
function toolSwing(ctx, S, pl, since, u) {
  const it = sim.selected(S); if (!it || !ITEMS[it.id] || ITEMS[it.id].kind !== 'tool') return;
  const t = Math.min(1, since / 260), e = t < 0.35 ? t / 0.35 : 1, side = pl.face === 'left' ? -1 : 1;
  const a = (-2.3 + e * 2.5) * side, s = u * 0.62;
  const hx = pl.x * u + (pl.face === 'left' ? -0.28 : pl.face === 'right' ? 0.28 : 0.18) * u, hy = (pl.y - 0.72 + (pl.face === 'up' ? -0.1 : 0)) * u;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); if (side < 0) ctx.scale(-1, 1);
  ctx.globalAlpha = Math.min(1, (1 - t) * 4);
  ctx.drawImage(iconCanvas(it.id, Math.round(s)), -s * 0.2, -s * 0.85, s, s);
  ctx.restore();
}
function buildingLabel(ctx, b, sp, u) {
  const cy = sp.y + sp.h * 0.56;
  const mw = Math.min(sp.w * 0.62, u * 4.2), lh = Math.ceil(u * 0.82 * 0.6);
  const c = cached(`lbl|${b.label}|${u}`, mw + 4, lh + 4, (g) => signText(g, b.label, (mw + 4) / 2, (lh + 4) / 2, mw, u * 0.82, '#f6efd8', '#2f4a34', SIGN_FONT));
  const lx = Math.round(sp.x + sp.w / 2 - c.width / 2), ly = Math.round(cy - c.height / 2);
  ctx.drawImage(c, lx, ly);
  R.signs.push({ x: lx, y: ly, w: c.width, h: c.height });
}
function sunShadow(S) {
  const h = S.time / 60, f = Math.max(0, Math.min(1, (h - 6) / 14));
  const sx = (f - 0.5) * 1.8, sy = 0.34 + Math.abs(sx) * 0.12;
  const day = 1 - sim.darkness(S);
  const wx = S.weather === 'rain' || S.weather === 'snow' || S.weather === 'storm' || S.weather === 'ice' ? 0.3 : S.weather === 'fog' ? 0.45 : 1;
  return { sx, sy, a: 0.26 * day * day * wx };
}
const sils = new WeakMap();
function silhouette(c) {
  let s = sils.get(c);
  if (!s) { s = document.createElement('canvas'); s.width = c.width; s.height = c.height; const g = s.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#0c1410'; g.fillRect(0, 0, s.width, s.height); sils.set(c, s); }
  return s;
}
function silShadow(ctx, it, u, sun) {
  const m = ctx.getTransform();
  ctx.setTransform(1, 0, -sun.sx * 0.85, -sun.sy * 0.85, m.e + it.bx, m.f + it.by);
  ctx.globalAlpha = sun.a;
  ctx.drawImage(silhouette(it.c), it.ox, it.oy);
  ctx.globalAlpha = 1;
  ctx.setTransform(m);
}
function blobShadow(ctx, x, y, r, u, sun) {
  ctx.globalAlpha = Math.min(0.5, sun.a * 1.6);
  ctx.fillStyle = '#0c1410';
  ctx.beginPath(); ctx.ellipse((x + sun.sx * 0.12) * u, (y - 0.04) * u, r * u, r * u * 0.38, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}
function footing(ctx, b, u) {
  ctx.fillStyle = 'rgba(12,16,10,0.12)';
  for (let i = 0; i < 3; i++) ctx.fillRect((b.x + 0.02 + i * 0.06) * u, (b.y + b.h - 0.6 + i * 0.04) * u, (b.w - 0.04 - i * 0.12) * u, (0.74 - i * 0.08) * u);
}
// Bridges (stone in the Japanese garden, timber elsewhere), the Millsap Canopy Bridge and the model-train rails.
function tileOverlay(ctx, v, x, y, u, at, gm) {
  const px = x * u, py = y * u;
  if (v === G.RAIL) {
    const h = at(x - 1, y) === G.RAIL || at(x + 1, y) === G.RAIL;
    ctx.fillStyle = '#4a3424';
    for (let i = 0; i < 3; i++) h ? ctx.fillRect(px + (i + 0.15) * u / 3, py + u * 0.3, u * 0.1, u * 0.4) : ctx.fillRect(px + u * 0.3, py + (i + 0.15) * u / 3, u * 0.4, u * 0.1);
    ctx.fillStyle = '#b8bcc4';
    if (h) { ctx.fillRect(px, py + u * 0.38, u, u * 0.05); ctx.fillRect(px, py + u * 0.58, u, u * 0.05); } else { ctx.fillRect(px + u * 0.38, py, u * 0.05, u); ctx.fillRect(px + u * 0.58, py, u * 0.05, u); }
    return;
  }
  const zone = gm.world.zoneId(x, y);
  const stone = v === G.BRIDGE && zone === 'pinewind';
  const deck = v === G.BOARDWALK ? '#a8845c' : stone ? '#b8b0a0' : '#9a7a52';
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, py + u * 0.86, u, u * 0.16);
  ctx.fillStyle = deck; ctx.fillRect(px, py, u, u);
  if (stone) { ctx.strokeStyle = 'rgba(60,52,40,0.4)'; ctx.lineWidth = Math.max(1, u * 0.02); ctx.strokeRect(px + 1, py + 1, u * 0.5, u * 0.5); ctx.strokeRect(px + u * 0.5, py + u * 0.5, u * 0.48, u * 0.48); }
  else { ctx.fillStyle = shade(deck, -0.28); const vert = at(x, y - 1) === v || at(x, y + 1) === v; for (let i = 0; i < 6; i++) vert ? ctx.fillRect(px, py + i * u / 6, u, Math.max(1, u * 0.025)) : ctx.fillRect(px + i * u / 6, py, Math.max(1, u * 0.025), u); }
  // Rails on the open sides.
  ctx.fillStyle = v === G.BOARDWALK ? '#5a5e62' : stone ? '#8a8476' : '#5a4028';
  if (at(x, y - 1) !== v && at(x, y - 1) !== G.PATH && at(x, y - 1) !== G.STONE) ctx.fillRect(px, py, u, u * 0.1);
  if (at(x, y + 1) !== v && at(x, y + 1) !== G.PATH && at(x, y + 1) !== G.STONE) ctx.fillRect(px, py + u * 0.9, u, u * 0.1);
  if (at(x - 1, y) !== v && at(x - 1, y) !== G.PATH && at(x - 1, y) !== G.STONE) ctx.fillRect(px, py, u * 0.1, u);
  if (at(x + 1, y) !== v && at(x + 1, y) !== G.PATH && at(x + 1, y) !== G.STONE) ctx.fillRect(px + u * 0.9, py, u * 0.1, u);
}
function bubble(ctx, x, y, text, u, col) {
  ctx.fillStyle = col; ctx.strokeStyle = '#1a1612'; ctx.lineWidth = Math.max(2, u * 0.05);
  ctx.beginPath(); ctx.arc(x, y, u * 0.22, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1612'; ctx.font = `bold ${Math.round(u * 0.3)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + u * 0.02);
}

// Rain, storm and snow at full resolution; the colour of the weather goes in the atmosphere pass.
function weather(ctx, S, now, dt) {
  const w = R.canvas.width, h = R.canvas.height;
  const wx = S.weather;
  if (wx === 'rain' || wx === 'storm' || wx === 'snow' || wx === 'ice') {
    const rain = wx !== 'snow';
    const n = R.reduced ? 40 : wx === 'storm' ? 200 : rain ? 140 : 110;
    if (rain) { ctx.strokeStyle = 'rgba(215,230,255,0.62)'; ctx.lineWidth = 1.4 * R.dpr; ctx.beginPath(); }
    else ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const slant = wx === 'storm' ? 9 : 4;
    for (let i = 0; i < n; i++) {
      const x = (noise(i, 1) * w + (R.reduced ? 0 : now * 0.05 * (rain ? 0.3 : 0.4) + (rain ? 0 : Math.sin(now / 900 + i) * 12 * R.dpr))) % w;
      const y = (noise(i, 2) * h + (R.reduced ? 0 : now * (rain ? 0.9 : 0.1))) % h;
      if (rain) { ctx.moveTo(x, y); ctx.lineTo(x - slant * R.dpr, y + 18 * R.dpr); }
      else { const r = (1.4 + noise(i, 3) * 1.6) * R.dpr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    }
    if (rain) ctx.stroke();
  }
}

// Sparkles on open water and slow flow lines down the streams.
function waterFx(ctx, gm, sx0, sy0, sx1, sy1, u, now) {
  const g = gm.world.g;
  ctx.save();
  for (let y = Math.max(0, sy0); y <= Math.min(H - 1, sy1); y++) for (let x = Math.max(0, sx0); x <= Math.min(W - 1, sx1); x++) {
    const v = g[y * W + x];
    if (v !== G.WATER && v !== G.DEEP && v !== G.POND && v !== G.STREAM) continue;
    const n = noise(x, y, 77);
    if (v === G.STREAM && !R.reduced) {
      const ph = (now / 1200 + n) % 1;
      ctx.globalAlpha = 0.35 * Math.sin(ph * Math.PI); ctx.fillStyle = '#e8f6f2';
      ctx.fillRect((x + 0.15 + noise(x, y, 78) * 0.6) * u, (y + ph) * u, Math.max(1, u * 0.04), u * 0.26);
    }
    if (v === G.POND && n < 0.18) { // koi
      const t = R.reduced ? 0 : now / 3000 + n * 30, kx = (x + 0.5 + Math.cos(t) * 0.3) * u, ky = (y + 0.5 + Math.sin(t * 1.3) * 0.25) * u;
      ctx.globalAlpha = 0.85; ctx.fillStyle = n < 0.06 ? '#f4f0ea' : n < 0.12 ? '#e8702a' : '#f0b030';
      ctx.beginPath(); ctx.ellipse(kx, ky, u * 0.12, u * 0.045, t + Math.PI / 2, 0, 7); ctx.fill();
      continue;
    }
    if (n < 0.45) {
      const tw = R.reduced ? 0.5 : Math.max(0, Math.sin(now / 520 + n * 40));
      if (tw < 0.05) continue;
      ctx.globalAlpha = 0.75 * tw * tw;
      ctx.fillStyle = '#ffffff';
      const gx = (x + 0.15 + noise(x, y, 79) * 0.7) * u, gy = (y + 0.15 + noise(x, y, 80) * 0.7) * u, r = u * (0.05 + 0.05 * tw);
      ctx.beginPath(); ctx.moveTo(gx - r * 2.2, gy); ctx.lineTo(gx, gy - r * 0.7); ctx.lineTo(gx + r * 2.2, gy); ctx.lineTo(gx, gy + r * 0.7); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
function drawParticles(ctx, u, dt) {
  R.particles = R.particles.filter((p) => (p.life -= dt) > 0);
  for (const p of R.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.ring) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1, u * 0.04 * (1 - t));
      ctx.beginPath(); ctx.ellipse(p.x * u, p.y * u, u * (0.15 + t * 0.45), u * (0.06 + t * 0.18), 0, 0, 7); ctx.stroke();
    } else if (p.heart) {
      const t = 1 - p.life / p.max, s = p.s * u, hx = (p.x + Math.sin(t * 9 + p.s * 40) * 0.08) * u, hy = p.y * u;
      ctx.globalAlpha = Math.min(1, (1 - t) * 2.5); ctx.fillStyle = '#e8506a'; ctx.strokeStyle = '#5a1a26'; ctx.lineWidth = Math.max(1, u * 0.025);
      ctx.beginPath(); ctx.moveTo(hx, hy + s * 0.35); ctx.bezierCurveTo(hx - s * 0.9, hy - s * 0.25, hx - s * 0.35, hy - s * 0.85, hx, hy - s * 0.3); ctx.bezierCurveTo(hx + s * 0.35, hy - s * 0.85, hx + s * 0.9, hy - s * 0.25, hx, hy + s * 0.35); ctx.fill(); ctx.stroke();
    } else {
      p.vy += 0.0055 * dt;
      if (p.ground && p.y > p.ground && p.vy > 0) { p.y = p.ground; p.vy *= -0.35; p.vx *= 0.6; }
      ctx.globalAlpha = Math.min(1, p.life / 10); ctx.fillStyle = p.col;
      if (p.round) { ctx.beginPath(); ctx.arc(p.x * u, p.y * u, p.s * u * 0.5, 0, 7); ctx.fill(); } else { ctx.save(); ctx.translate(p.x * u, p.y * u); ctx.rotate(p.life * 0.3); ctx.fillRect(-p.s * u / 2, -p.s * u / 4, p.s * u, p.s * u / 2); ctx.restore(); }
      if (p.spark) { ctx.globalAlpha *= 0.4; ctx.beginPath(); ctx.arc(p.x * u, p.y * u, p.s * u * 1.3, 0, 7); ctx.fill(); }
    }
  }
  ctx.globalAlpha = 1;
}

// Atmosphere: one quarter-resolution overlay with the time-of-day colour, weather colour and fog, and at night the
// darkness with soft holes for each light: path lamps, lit windows, and the Holiday Lights pieces in colour.
const NS = 4;
const gradSprites = new Map();
function gradSprite(col) {
  let c = gradSprites.get(col);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, col === 'hole' ? 'rgba(0,0,0,0.95)' : rgba(col, 1)); gr.addColorStop(1, col === 'hole' ? 'rgba(0,0,0,0)' : rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  gradSprites.set(col, c);
  return c;
}
let fogC = null;
function fogSprite() {
  if (fogC) return fogC;
  fogC = document.createElement('canvas'); fogC.width = fogC.height = 256;
  const g = fogC.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = noise(i, 11) * 256, y = noise(i, 12) * 256, r = 40 + noise(i, 13) * 70;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256], [256, 256], [-256, -256], [256, -256], [-256, 256]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, 'rgba(240,244,246,0.5)'); gr.addColorStop(1, 'rgba(240,244,246,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
  }
  return fogC;
}
function todTint(t) {
  if (t < 450) return ['#ff9a7a', 0.2 * (450 - t) / 90];
  if (t < 960) return null;
  if (t < 1110) return ['#ffa848', 0.3 * (t - 960) / 150];
  if (t < 1220) return [t < 1160 ? '#e8806a' : '#9a5a9a', 0.15];
  return null;
}
const HL_GLOW = ['#ff5a6a', '#ffd860', '#6ae0ff', '#8aff8a', '#ff8ae0', '#ffffff'];
function nightPass(gm, P, cam, now) {
  const S = gm.S;
  const d = sim.darkness(S);
  const el = R.nightEl;
  const fog = S.weather === 'fog' && S.time < 720 ? Math.min(1, (720 - S.time) / 200) : 0;
  const W2 = R.canvas.width, H2 = R.canvas.height, u = R.u;
  const w = Math.ceil(W2 / NS), h = Math.ceil(H2 / NS);
  if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
  const n = el.getContext('2d');
  n.globalCompositeOperation = 'source-over'; n.globalAlpha = 1;
  n.clearRect(0, 0, w, h);
  R.nightOn = true;
  const tt = todTint(S.time);
  if (tt) { n.fillStyle = rgba(tt[0], tt[1]); n.fillRect(0, 0, w, h); }
  if (S.weather === 'rain' || S.weather === 'storm') { n.fillStyle = 'rgba(40,52,72,0.22)'; n.fillRect(0, 0, w, h); }
  if (S.weather === 'snow' || S.weather === 'ice') { n.fillStyle = 'rgba(214,226,240,0.14)'; n.fillRect(0, 0, w, h); }
  if (S.weather === 'heat') { n.fillStyle = 'rgba(255,220,150,0.08)'; n.fillRect(0, 0, w, h); }
  if (fog) {
    const f = fogSprite(), fs = 256 * u / 64 / NS;
    for (const [sp, a, k] of [[0.006, 0.55, 0], [0.011, 0.4, 1]]) {
      n.globalAlpha = a * fog;
      const ox = -(((cam.x * u / NS) * (1 + k * 0.3) + (R.reduced ? 0 : now * sp)) % fs) - fs, oy = -(((cam.y * u / NS) * (1 + k * 0.3)) % fs) - fs;
      for (let y = oy; y < h; y += fs) for (let x = ox; x < w; x += fs) n.drawImage(f, x, y, fs, fs);
    }
    n.globalAlpha = 1;
    n.fillStyle = `rgba(232,238,240,${0.22 * fog})`; n.fillRect(0, 0, w, h);
  }
  if (d <= 0.01) return;
  n.fillStyle = rgba(NIGHT, S.time < 480 ? d * 0.55 : d); n.fillRect(0, 0, w, h);
  n.globalCompositeOperation = 'destination-out';
  const hole = gradSprite('hole');
  const glows = [];
  const cut = (wx, wy, rx, ry, col, ga) => {
    const sx = (wx - cam.x) * u, sy = (wy - cam.y) * u;
    if (sx < -rx * u || sy < -ry * u || sx > W2 + rx * u || sy > H2 + ry * u) return;
    n.drawImage(hole, (sx - rx * u) / NS, (sy - ry * u) / NS, 2 * rx * u / NS, 2 * ry * u / NS);
    if (col) glows.push([sx, sy, rx, ry, col, ga]);
  };
  for (const l of gm.world.lamps) {
    const L = LIGHT.led;
    if (l.post) { cut(l.x, l.y + 0.15, L.r * 0.8, L.r * 0.5, L.col, 0.3); cut(l.x, l.y - 0.9, 0.4, 0.4, L.col, 0.5); }
    else cut(l.x, l.y + 0.5, L.r * 0.7, L.r * 0.45, L.col, 0.28);
  }
  if (S.time > 1050 && S.time < 1440) for (const b of gm.world.buildings) {
    if (b.id === 'carillon' || b.id === 'restroom') continue;
    const late = S.time > 1350 ? (1440 - S.time) / 90 : 1;
    const wy = b.y + b.h - 1.5, k = Math.max(2, Math.floor(b.w / 2));
    for (let i = 0; i < k; i++) if (noise(b.x + i, b.y, 92) < 0.8) cut(b.x + b.w * (i + 0.5) / k, wy, 0.45, 0.36, b.id === 'chapel' ? '#ffe8b8' : '#ffcf7a', 0.55 * late);
  }
  // Holiday Lights: every working piece glows in colour, cycling.
  const dd = sim.doy(S), phaseShift = R.reduced ? 0 : Math.floor(now / 400);
  for (const m of gm.world.markers) {
    if (m.show !== 'hl') continue;
    const st = S.disp[m.id];
    if (!st || st.st !== 'ok') continue;
    const col = HL_GLOW[(phaseShift + m.x + m.y) % HL_GLOW.length];
    const big = m.item === 'hl:rose' ? 2.6 : m.wrap ? 1.8 : m.item === 'hl:pole' ? 1.6 : m.item === 'hl:arch' ? 1.3 : 1.1;
    cut(m.x + 0.5, m.y + (m.wrap || m.item === 'hl:rose' || m.item === 'hl:pole' ? -0.6 : 0.3), big, big * 0.9, col, 0.6);
  }
  if (d > 0.45) cut(S.player.x, S.player.y - 0.4, 1.9, 1.4, '#ffd8a0', 0.12);
  n.globalCompositeOperation = 'source-over';
  for (const [sx, sy, rx, ry, col, ga] of glows) {
    n.globalAlpha = ga * d;
    n.drawImage(gradSprite(col), (sx - rx * u * 0.8) / NS, (sy - ry * u * 0.8) / NS, 1.6 * rx * u / NS, 1.6 * ry * u / NS);
  }
  n.globalAlpha = 1;
}

// ---------- title vista ----------
// A painted panorama when one exists (vista-garvan); otherwise a drawn one: Lake Hamilton, pine ridges, the chapel's
// steep glass gable among the trees, and a peacock on the lawn.
export function vista(ctx, w, h, sea = 'sp') {
  const im = artImg('vista-garvan');
  if (im) {
    const k = Math.max(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return;
  }
  const P = palette(sea);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#7ab0d8'); sky.addColorStop(1, '#f4e8d0');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const ridge = (y0, amp, col, k) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += w / 40) ctx.lineTo(x, y0 + Math.sin(x / w * 6 + k) * amp + Math.sin(x / w * 17 + k * 2) * amp * 0.3); ctx.lineTo(w, h); ctx.fill(); };
  ridge(h * 0.4, h * 0.035, mix(P.forest, '#a8c0d0', 0.6), 1);
  ridge(h * 0.46, h * 0.04, mix(P.forest, '#a8c0d0', 0.35), 2.2);
  // The lake.
  ctx.fillStyle = '#3a7aa0'; ctx.fillRect(0, h * 0.52, w, h * 0.14);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 30; i++) ctx.fillRect(noise(i, 5) * w, h * (0.53 + noise(i, 6) * 0.12), w * 0.03, 2);
  // Near shore: woods and lawn.
  ridge(h * 0.62, h * 0.03, P.forest, 3.1);
  ctx.fillStyle = P.lawn; ctx.fillRect(0, h * 0.78, w, h * 0.22);
  // Pines.
  for (let i = 0; i < 26; i++) { const x = noise(i, 7) * w, s = h * (0.12 + noise(i, 8) * 0.1), by = h * (0.66 + noise(i, 9) * 0.12); ctx.fillStyle = shade(P.pine, (noise(i, 10) - 0.5) * 0.2); ctx.beginPath(); ctx.moveTo(x - s * 0.25, by); ctx.lineTo(x, by - s); ctx.lineTo(x + s * 0.25, by); ctx.fill(); }
  // The chapel: a steep gable of glass and pale pine.
  const cx = w * 0.68, cb = h * 0.76, cw = w * 0.1, chh = h * 0.3;
  ctx.fillStyle = '#9ab8c8'; ctx.fillRect(cx - cw / 2, cb - chh * 0.55, cw, chh * 0.55);
  ctx.strokeStyle = '#e8c890'; ctx.lineWidth = Math.max(2, w * 0.003); for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(cx - cw / 2 + i * cw / 6, cb); ctx.lineTo(cx - cw / 2 + i * cw / 6, cb - chh * 0.55); ctx.stroke(); }
  ctx.fillStyle = '#5a5a56'; ctx.beginPath(); ctx.moveTo(cx - cw * 0.65, cb - chh * 0.5); ctx.lineTo(cx, cb - chh); ctx.lineTo(cx + cw * 0.65, cb - chh * 0.5); ctx.fill();
  // Azaleas and tulips in the foreground.
  for (let i = 0; i < 60; i++) { ctx.fillStyle = ['#e85a8a', '#f4f0f2', '#d8283a', '#f6cc2a', '#c84a9a'][i % 5]; ctx.beginPath(); ctx.arc(noise(i, 11) * w, h * (0.84 + noise(i, 12) * 0.14), h * 0.012, 0, 7); ctx.fill(); }
}
