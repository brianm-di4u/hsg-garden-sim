// Painted sprites: which image each building, tree, prop and person uses, and pre-scaled cached canvases
// of them at the current tile size. Every function returns null when its art has not loaded (or `?art=0`),
// and the caller falls back to the vector art in art.js.
import { img, hasArt, ART, manifest } from './assets.js';
import { cached } from './art.js';
import { composeCell, CELL_W, CELL_H } from './sprites.js';
import { SKINS } from '../sim/data.js';

// ---------- buildings ----------
// Painted building art, when it exists, is named bld-<building id> (bld-chapel, bld-welcome, ...).
export function buildingArt(b) { const name = 'bld-' + b.id; return hasArt(name) ? { name, flip: false } : null; }
export function buildingNames() { return new Set(Object.keys(manifest()).filter((n) => n.startsWith('bld-'))); }

// A loaded image scaled once to w × h device pixels (optionally mirrored).
export function scaled(name, w, h, flip = false, tint = null) {
  const im = img(name);
  if (!im) return null;
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  return cached(`img|${name}|${w}|${h}|${flip ? 1 : 0}|${tint ? tint.join() : ''}`, w, h, (g) => {
    let src = im, sw = im.naturalWidth, sh = im.naturalHeight;
    while (sw / 2 >= w && sh / 2 >= h) {
      const c = document.createElement('canvas'); c.width = Math.ceil(sw / 2); c.height = Math.ceil(sh / 2);
      const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(src, 0, 0, c.width, c.height); src = c; sw = c.width; sh = c.height;
    }
    g.imageSmoothingQuality = 'high';
    if (flip) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(src, 0, 0, w, h);
    if (tint) { // [colour, strength]: a 'color' blend kept inside the sprite's own alpha
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'color'; g.globalAlpha = tint[1]; g.fillStyle = tint[0]; g.fillRect(0, 0, w, h);
      g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; if (flip) { g.translate(w, 0); g.scale(-1, 1); } g.drawImage(src, 0, 0, w, h);
    }
  });
}
const aspect = (name) => { const im = img(name); return im ? im.naturalHeight / im.naturalWidth : 1; };

// Placement of a building's painted sprite in device pixels (world space): the image spans the footprint's
// width and its base sits on the footprint's south edge, so roofs and chimneys may rise above the footprint.
export function buildingSprite(b, u, snow = false) {
  const a = buildingArt(b);
  if (!a || !img(a.name)) return null;
  const w = b.w * u, h = w * aspect(a.name);
  const c = snow ? snowy(a.name, w, h, a.flip) : scaled(a.name, w, h, a.flip);
  return { c, x: b.x * u, y: (b.y + b.h) * u - h, w, h };
}
// Snow lying on the roof: the roof fills the top of each painting (the three-quarter view), so a white wash that
// fades out down the image, kept inside the building's own outline, reads as a snow-covered roof.
function snowy(name, w, h, flip) {
  const base = scaled(name, w, h, flip);
  return cached(`snow|${name}|${Math.round(w)}|${flip ? 1 : 0}`, base.width, base.height, (g) => {
    g.drawImage(base, 0, 0);
    // Screen keeps the shingles' texture showing through, like a dusting; only the roof band at the top.
    g.globalCompositeOperation = 'screen';
    const gr = g.createLinearGradient(0, 0, 0, base.height * 0.42);
    gr.addColorStop(0, 'rgba(235,240,248,0.85)'); gr.addColorStop(0.7, 'rgba(225,232,242,0.55)'); gr.addColorStop(1, 'rgba(225,232,242,0)');
    g.fillStyle = gr; g.fillRect(0, 0, base.width, base.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(base, 0, 0);
  });
}

// ---------- trees and props ----------
const TREE = { oak: { w: 2.3 }, hickory: { w: 2.2 }, pine: { w: 1.75 }, magnolia: { w: 1.9 }, jmaple: { w: 1.6 }, dogwood: { w: 1.7 }, redbud: { w: 1.7 }, cypress: { w: 1.5 } };
export function treeArt(kind, sea) {
  if (kind === 'oak' || kind === 'hickory') return 'tree-oak-' + (sea || 'su');
  if (kind === 'pine') return 'tree-pine';
  if (kind === 'magnolia') return 'tree-magnolia';
  if (hasArt(`tree-${kind}-${sea}`)) return `tree-${kind}-${sea}`;
  return hasArt('tree-' + kind) ? 'tree-' + kind : null;
}
// Returns { c, ox, oy } with (ox, oy) the offset of the sprite's top-left from the base point, in pixels.
export function treeSprite(kind, sea, u, x = 0, y = 0) {
  const name = treeArt(kind, sea);
  if (!name || !img(name)) return null;
  const vary = 0.88 + ((x * 7 + y * 13) % 9) / 36; // a little size variety
  const w = (TREE[kind] || TREE.oak).w * u * vary, h = w * aspect(name);
  const flip = (x * 5 + y * 3) % 2 === 1;
  // The painted summer oak leans yellow; pull it toward the valley's deep summer green.
  const tint = name === 'tree-oak-su' ? ['#3f7a2a', 0.38] : name === 'tree-oak-sp' ? ['#7cc048', 0.45] : null;
  return { c: scaled(name, w, h, flip, tint), ox: -w / 2, oy: -h };
}
const PROP_IMG = { bench: 'street-bench' };
const PROP = { rock: 0.95, sign: 1.0, bench: 1.1 };
export function propSprite(t, u, x = 0, y = 0) {
  const w0 = PROP[t], name = PROP_IMG[t] || t;
  if (!w0 || !img(name)) return null;
  const w = w0 * u * (t === 'rock' || t === 'tuft' ? 0.9 + ((x * 7 + y * 3) % 5) / 20 : 1), h = w * aspect(name);
  const flip = t !== 'sign' && (x + y) % 2 === 1;
  return { c: scaled(name, w, h, flip), ox: -w / 2, oy: -h };
}

// ---------- animals, lamps ----------
const ANIMAL_W = { peacock: 1.6, 'peacock-fan': 2.2, peahen: 1.2 };
export function animalSprite(kind, face, u) {
  const name = 'animal-' + kind;
  if (!img(name)) return null;
  const w = (ANIMAL_W[kind] || 1) * u, h = w * aspect(name);
  return { c: scaled(name, w, h, face === 'left'), ox: -w / 2, oy: -h };
}
const LAMP = { led: ['lamp-led', 0.5] };
export function lampSprite(kind, u) {
  const e = LAMP[kind];
  if (!e || !img(e[0])) return null;
  const w = e[1] * u, h = w * aspect(e[0]);
  return { c: scaled(e[0], w, h), ox: -w / 2, oy: -h };
}

// ---------- decor ----------
export function decoSprite(name, wTiles, u) {
  if (!img(name)) return null;
  const w = wTiles * u, h = w * aspect(name);
  return { c: scaled(name, w, h), ox: -w / 2, oy: -h };
}

// ---------- item icons ----------
// Painted icon for an item id, or null. Seeds are the plain packet with the crop's produce on its corner.
const seedCrop = (id) => (id.startsWith('seed:') ? id.slice(5) : null);
export function iconSprite(id, px) {
  const crop = seedCrop(id);
  if (crop) {
    if (!img('icon-seedpacket') || !img('icon-' + crop)) return null;
    return cached(`icp|${id}|${px}`, px, px, (g) => { g.drawImage(scaled('icon-seedpacket', px, px), 0, 0); g.drawImage(scaled('icon-' + crop, px * 0.6, px * 0.6), px * 0.42, px * 0.42); });
  }
  return img('icon-' + id) ? scaled('icon-' + id, px, px) : null;
}
// DOM markup for an icon from the packed files (no canvas readback, so file:// works); null when not painted.
export function iconHtml(id, cls = '') {
  if (!ART.on) return null;
  const M = manifest(), crop = seedCrop(id);
  if (crop) return M['icon-seedpacket'] && M['icon-' + crop] ? `<span class="ic-seed ${cls}"><img alt="" src="assets/${M['icon-seedpacket'].file}"><img alt="" class="ic-crop" src="assets/${M['icon-' + crop].file}"></span>` : null;
  return M['icon-' + id] ? `<img alt="" class="${cls}" src="assets/${M['icon-' + id].file}">` : null;
}

// ---------- people ----------
export const peopleReady = () => !!(img('chars-trousers') && img('chars-dress') && img('chars-overlay'));
export const FEET = 164 / 192; // ground point within a character cell
// A person frame at u px per tile: 1.0 tile wide × 1.5 tall cell; returns { c, ox, oy } relative to the feet.
export function personSprite(id, look, face, frame, u) {
  if (!peopleReady()) return null;
  const w = Math.round(u * 1.3), h = Math.round(w * CELL_H / CELL_W);
  const c = cached(`pp|${id}|${face}|${frame}|${w}`, w, h, (g) => {
    const cell = composeCell({ trousers: img('chars-trousers'), dress: img('chars-dress'), overlay: img('chars-overlay') },
      face === 'up' ? { ...look, glasses: false } : look, SKINS[look.skin ?? 1], face, frame);
    let src = cell, sw = CELL_W;
    while (sw / 2 >= w) { const t = document.createElement('canvas'); t.width = Math.ceil(src.width / 2); t.height = Math.ceil(src.height / 2); const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(src, 0, 0, t.width, t.height); src = t; sw = t.width; }
    g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h);
  });
  return { c, ox: -w / 2, oy: -h * FEET };
}
export { hasArt };
