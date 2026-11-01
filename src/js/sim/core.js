// Shared sim helpers: events to the UI, inventory, map queries. No DOM. Every other sim module imports this;
// it imports nothing from them (the bundler orders modules by dependency and does not allow cycles).
import * as D from './data.js';
import { W, H, G, groundBlocks, ZONES } from './world.js';

export const key = (x, y) => x + ',' + y;
export const unkey = (k) => k.split(',').map(Number);
export const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const INV_SIZE = 24;
export const HOTBAR = 8;

export const emit = (gm, type, data = {}) => { gm.events.push({ type, ...data }); };
export const toast = (gm, text, kind = 'info') => emit(gm, 'toast', { text, kind });
export const sound = (gm, id) => emit(gm, 'sound', { id });

// ---------- inventory ----------
export function matches(itemId, want) {
  if (want.startsWith('kind:')) return D.ITEMS[itemId] && D.ITEMS[itemId].kind === want.slice(5);
  return itemId === want;
}
export function count(S, id) { let n = 0; for (const it of S.inv) if (it && matches(it.id, id)) n += it.n; return n; }
export function addItem(S, id, n = 1) {
  const def = D.ITEMS[id];
  const max = def && def.kind === 'tool' ? 1 : 99;
  for (const it of S.inv) if (it && it.id === id && it.n < max) { const k = Math.min(n, max - it.n); it.n += k; n -= k; if (!n) return 0; }
  for (let i = 0; i < S.inv.length && n > 0; i++) if (!S.inv[i]) { const k = Math.min(n, max); S.inv[i] = { id, n: k }; n -= k; }
  return n; // leftover that didn't fit
}
export function removeItem(S, id, n = 1) {
  for (let i = S.inv.length - 1; i >= 0 && n > 0; i--) {
    const it = S.inv[i];
    if (it && matches(it.id, id)) { const k = Math.min(n, it.n); it.n -= k; n -= k; if (!it.n) S.inv[i] = null; }
  }
  return n === 0;
}
export const selected = (S) => S.inv[S.sel] || null;
export function swapSlots(S, a, b) { const t = S.inv[a]; S.inv[a] = S.inv[b]; S.inv[b] = t; }

// ---------- map ----------
export const ground = (gm, x, y) => (x < 0 || y < 0 || x >= W || y >= H ? G.DEEP : gm.world.g[y * W + x]);
export const zoneAt = (gm, x, y) => (x < 0 || y < 0 || x >= W || y >= H ? ZONES[ZONES.length - 1] : ZONES[gm.world.zone[y * W + x]]);
// Objects that stop the player: trees, shrubs, rocks, fallen limbs, fixed furniture.
const BLOCK_FIXED = new Set(['sign', 'feeder', 'pergola', 'fairy', 'falls', 'bench']);
export function objAt(gm, x, y) { return gm.S.objs[key(x, y)] || gm.fixed[key(x, y)] || null; }
export function objBlocks(o) {
  if (!o) return false;
  if (o.t === 'tree' || o.t === 'rock' || o.t === 'limb') return true;
  if (o.t === 'plant') return D.PLANTS[o.k] && D.PLANTS[o.k].size !== 'low';
  return BLOCK_FIXED.has(o.t);
}
export function blocked(gm, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  if (groundBlocks(gm.world.g[y * W + x])) return true;
  if (gm.bmap[y * W + x] >= 0) return true;
  return objBlocks(objAt(gm, x, y));
}
export const placeOf = (gm, name) => gm.world.places[name] || gm.world.places.gate;
export function target(gm) {
  const p = gm.S.player;
  const tx = Math.floor(p.x), ty = Math.floor(p.y - 0.1);
  const [dx, dy] = DIR[p.face];
  return { x: tx + dx, y: ty + dy, px: tx, py: ty };
}
export const markerAt = (gm, x, y) => gm.markerMap[key(x, y)] || null;
export const tulipBedAt = (gm, x, y) => gm.bedMap[key(x, y)] || null;

// Energy spend; false (with a toast) when too tired.
export function spend(gm, what) {
  const S = gm.S, c = D.ENERGY[what] || 0;
  if (S.energy < c) { toast(gm, 'Too tired. Grab something at the Chipmunk Café, or clock out.', 'warn'); sound(gm, 'nope'); return false; }
  S.energy -= c;
  return true;
}
