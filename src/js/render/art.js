// Procedural art: ground tiles, buildings, people, plants, objects and item icons.
// Everything is drawn with Canvas 2D paths into cached canvases. `u` = one tile in device pixels.
import { G } from '../sim/world.js';
import { noise } from '../sim/rng.js';
import { mix, shade, rgba } from './palette.js';
import { SKINS, ITEMS } from '../sim/data.js';

const cache = new Map();
export function clearArt() { cache.clear(); }
export function cached(k, w, h, draw) {
  let c = cache.get(k);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  draw(c.getContext('2d'));
  cache.set(k, c);
  return c;
}
export const artCacheSize = () => cache.size;

const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function ell(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fill(); }
function poly(ctx, pts, c, stroke, lw) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (c) { ctx.fillStyle = c; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
const OUT = '#1a1612';

// ---------- ground ----------
export function drawGround(ctx, gv, x, y, u, P, nb) {
  const px = x * u, py = y * u;
  const n = (k) => noise(x, y, k);
  switch (gv) {
    case G.GRASS: case G.FOREST: case G.LAWN: {
      const base = gv === G.GRASS ? P.grass : gv === G.LAWN ? P.lawn : P.forest;
      R(ctx, px, py, u, u, base);
      if (gv === G.LAWN) R(ctx, px, py, u, u, rgba(x % 2 ? '#ffffff' : '#000000', 0.04));
      for (let i = 0; i < 6; i++) R(ctx, px + n(i) * u, py + n(i + 9) * u, u * 0.06, u * 0.12, shade(base, i % 2 ? -0.18 : 0.12));
      if (gv === G.FOREST) for (let i = 0; i < 3; i++) R(ctx, px + n(i + 30) * u, py + n(i + 40) * u, u * 0.14, u * 0.04, shade(base, -0.3));
      break;
    }
    case G.PATH: case G.GRAVEL: case G.RAIL: {
      const base = gv === G.RAIL ? '#8a8070' : gv === G.GRAVEL ? P.gravel : P.path;
      R(ctx, px, py, u, u, base);
      for (let i = 0; i < 6; i++) ell(ctx, px + n(i) * u, py + n(i + 5) * u, u * 0.05, u * 0.035, shade(base, i % 2 ? -0.15 : 0.15));
      edges(ctx, px, py, u, nb, (g) => g === G.GRASS || g === G.FOREST || g === G.LAWN, P.grass);
      break;
    }
    case G.STONE: {
      R(ctx, px, py, u, u, P.stone);
      ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = Math.max(1, u * 0.03);
      ctx.strokeRect(px + 0.5, py + 0.5, u * 0.55, u * 0.45); ctx.strokeRect(px + u * 0.55, py + u * 0.45, u * 0.45, u * 0.55);
      break;
    }
    case G.PARKING: case G.ROAD: R(ctx, px, py, u, u, P.street); if (n(1) < 0.2) R(ctx, px + u * 0.2, py + u * 0.4, u * 0.3, u * 0.02, shade(P.street, 0.15)); break;
    case G.BED: {
      R(ctx, px, py, u, u, P.bed);
      ctx.lineWidth = Math.max(1, u * 0.025);
      for (let i = 0; i < 8; i++) { const a = n(i + 50) * Math.PI, sx = px + n(i) * u, sy = py + n(i + 20) * u; ctx.strokeStyle = ['#c88a3a', '#a8642a', '#d8a050'][i % 3]; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * u * 0.2, sy + Math.sin(a) * u * 0.2); ctx.stroke(); }
      break;
    }
    case G.WATER: case G.DEEP: case G.POND: case G.STREAM: case G.BRIDGE: case G.BOARDWALK: {
      const base = gv === G.DEEP ? P.deep : gv === G.POND || gv === G.STREAM ? P.pond : P.water;
      R(ctx, px, py, u, u, gv === G.BOARDWALK ? '#3a3830' : base);
      ctx.strokeStyle = rgba('#ffffff', 0.16); ctx.lineWidth = Math.max(1, u * 0.04);
      for (let i = 0; i < 2; i++) { const yy = py + (0.3 + i * 0.4) * u + n(i) * u * 0.1, xx = px + n(i + 3) * u * 0.5; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + u * 0.15, yy - u * 0.06, xx + u * 0.3, yy); ctx.stroke(); }
      break;
    }
    case G.GORGE: R(ctx, px, py, u, u, '#3a3630'); poly(ctx, [[px, py + u], [px + u * 0.3, py + u * 0.4], [px + u * 0.7, py + u * 0.7], [px + u, py + u * 0.3], [px + u, py + u]], '#4e4a42'); break;
    case G.ROCK: R(ctx, px, py, u, u, P.grass); ell(ctx, px + u / 2, py + u * 0.55, u * 0.48, u * 0.4, '#8a867c'); ell(ctx, px + u * 0.4, py + u * 0.45, u * 0.2, u * 0.1, '#aaa69c'); break;
    case G.SAND: R(ctx, px, py, u, u, P.sand); for (let i = 0; i < 4; i++) R(ctx, px + n(i) * u, py + n(i + 3) * u, u * 0.04, u * 0.04, shade(P.sand, -0.15)); break;
    default: R(ctx, px, py, u, u, P.grass);
  }
}
function edges(ctx, px, py, u, nb, isOther, col) {
  const e = u * 0.1;
  ctx.fillStyle = rgba(col, 0.55);
  if (isOther(nb.n)) ctx.fillRect(px, py, u, e);
  if (isOther(nb.s)) ctx.fillRect(px, py + u - e, u, e);
  if (isOther(nb.w)) ctx.fillRect(px, py, e, u);
  if (isOther(nb.e)) ctx.fillRect(px + u - e, py, e, u);
}
// ---------- buildings ----------
// The facade faces south; roof fills the upper part of the footprint.
export function drawBuilding(ctx, b, u, P) {
  const x = b.x * u, y = b.y * u, w = b.w * u, h = b.h * u;
  const dx = (b.door.x - b.x) * u;
  const f = BUILD[b.type] || BUILD.brides;
  ctx.save();
  f(ctx, x, y, w, h, u, P, dx, b);
  ctx.restore();
}
function door(ctx, x, y, u, col, frame) { R(ctx, x + u * 0.22, y + u * 0.15, u * 0.56, u * 0.85, frame || OUT); R(ctx, x + u * 0.28, y + u * 0.2, u * 0.44, u * 0.8, col); ell(ctx, x + u * 0.62, y + u * 0.6, u * 0.035, u * 0.035, '#d9a23a'); }
function windows(ctx, x, y, w, rows, cols, u, glass, frame, skipX) {
  const ww = u * 0.42, wh = u * 0.5;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = x + (c + 0.5) * w / cols - ww / 2;
    if (skipX != null && Math.abs(cx + ww / 2 - skipX) < u * 0.6 && r === rows - 1) continue;
    const cy = y + r * u * 0.85;
    R(ctx, cx - u * 0.05, cy - u * 0.05, ww + u * 0.1, wh + u * 0.1, frame);
    R(ctx, cx, cy, ww, wh, glass);
    R(ctx, cx + ww / 2 - u * 0.02, cy, u * 0.04, wh, frame);
    R(ctx, cx + u * 0.05, cy + u * 0.05, ww * 0.3, wh * 0.25, rgba('#ffffff', 0.25));
  }
}
export function signText(ctx, text, cx, cy, maxW, u, fg, bg, style) {
  if (!text) return;
  const fs = Math.round(u * 0.36);
  ctx.font = `bold ${fs}px ${style === 'deco' ? '"Century Gothic", Futura, "Trebuchet MS", sans-serif' : style === 'neon' ? '"Arial Black", Impact, sans-serif' : style || 'Georgia, "Times New Roman", serif'}`;
  let tw = ctx.measureText(text).width;
  const scale = Math.min(1, (maxW - u * 0.3) / tw);
  const bw = tw * scale + u * 0.3, bh = fs * 1.35;
  if (bg) { R(ctx, cx - bw / 2 - u * 0.04, cy - bh / 2 - u * 0.04, bw + u * 0.08, bh + u * 0.08, OUT); R(ctx, cx - bw / 2, cy - bh / 2, bw, bh, bg); }
  ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, 1);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (style === 'neon') { ctx.shadowColor = fg; ctx.shadowBlur = u * 0.25; }
  ctx.fillText(text, 0, fs * 0.05);
  ctx.restore();
}
function gable(ctx, x, y, w, rh, col, u, overhang = 0.15) {
  const o = u * overhang;
  poly(ctx, [[x - o, y + rh], [x + w / 2, y], [x + w + o, y + rh]], col, OUT, Math.max(1, u * 0.05));
  ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = Math.max(1, u * 0.03);
  for (let i = 1; i < 5; i++) { const yy = y + rh * i / 5; const half = (w / 2 + o) * i / 5; ctx.beginPath(); ctx.moveTo(x + w / 2 - half, yy); ctx.lineTo(x + w / 2 + half, yy); ctx.stroke(); }
}
function hip(ctx, x, y, w, rh, col, u) {
  poly(ctx, [[x - u * 0.15, y + rh], [x + u * 0.6, y], [x + w - u * 0.6, y], [x + w + u * 0.15, y + rh]], col, OUT, Math.max(1, u * 0.05));
  ctx.fillStyle = shade(col, -0.2);
  for (let i = 0; i < w / (u * 0.3); i++) ctx.fillRect(x + i * u * 0.3, y + rh * 0.55, Math.max(1, u * 0.04), rh * 0.4);
}
function wallFill(ctx, x, y, w, h, u, style, col) {
  R(ctx, x, y, w, h, col);
  ctx.fillStyle = shade(col, -0.18);
  if (style === 'log') for (let i = 0; i < h / (u * 0.25); i++) { ctx.fillRect(x, y + i * u * 0.25, w, Math.max(1, u * 0.04)); ell(ctx, x + u * 0.06, y + i * u * 0.25 + u * 0.12, u * 0.08, u * 0.1, shade(col, 0.15)); ell(ctx, x + w - u * 0.06, y + i * u * 0.25 + u * 0.12, u * 0.08, u * 0.1, shade(col, 0.15)); ctx.fillStyle = shade(col, -0.18); }
  else if (style === 'plank') for (let i = 0; i < w / (u * 0.22); i++) ctx.fillRect(x + i * u * 0.22, y, Math.max(1, u * 0.03), h);
  else if (style === 'clap') for (let i = 0; i < h / (u * 0.18); i++) ctx.fillRect(x, y + i * u * 0.18, w, Math.max(1, u * 0.03));
  else if (style === 'brick') { for (let r = 0; r < h / (u * 0.14); r++) { ctx.fillRect(x, y + r * u * 0.14, w, Math.max(1, u * 0.02)); for (let c = 0; c < w / (u * 0.3); c++) ctx.fillRect(x + (c + (r % 2) * 0.5) * u * 0.3, y + r * u * 0.14, Math.max(1, u * 0.02), u * 0.14); } }
  else if (style === 'stone') for (let r = 0; r < h / (u * 0.3); r++) for (let c = 0; c < w / (u * 0.45); c++) { ctx.fillStyle = shade(col, ((r * 7 + c * 3) % 5 - 2) * 0.06); ctx.fillRect(x + (c + (r % 2) * 0.5) * u * 0.45 + 1, y + r * u * 0.3 + 1, u * 0.42, u * 0.27); }
  ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, u * 0.05); ctx.strokeRect(x, y, w, h);
}
function yard(ctx, x, y, w, h, u, P) {
  // Small buildings sit in a fenced yard that fills the rest of their plot.
  ctx.strokeStyle = shade(P.wood, -0.2); ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.beginPath(); ctx.moveTo(x + u * 0.2, y + h - u * 0.15); ctx.lineTo(x + u * 0.2, y + u * 0.4); ctx.lineTo(x + w - u * 0.2, y + u * 0.4); ctx.lineTo(x + w - u * 0.2, y + h - u * 0.15); ctx.stroke();
  for (let i = 0; i <= 8; i++) R(ctx, x + u * 0.15 + i * (w - u * 0.3) / 8, y + u * 0.3, u * 0.1, u * 0.25, P.woodDark);
}
// Code-drawn stand-ins for the garden's buildings, used until (or instead of) the painted art.
const BUILD = {
  welcome: (ctx, x, y, w, h, u, P, dx, b) => { const rh = h * 0.36; wallFill(ctx, x + u * 0.1, y + rh, w - u * 0.2, h - rh, u, 'stone', '#9a8a72'); hip(ctx, x - u * 0.1, y, w + u * 0.2, rh, '#5a4a3a', u); windows(ctx, x + u * 0.4, y + rh + u * 0.5, w - u * 0.8, 1, 5, u, P.glass, '#5e4b3c', x + dx + u / 2); door(ctx, x + dx, y + h - u, u, '#6a4a2a'); if (b.label) signText(ctx, b.label, x + w / 2, y + rh + u * 0.15, w * 0.7, u, '#f6efd8', '#2f4a34', SIGN_FONT_ART); },
  cafe: (ctx, x, y, w, h, u, P, dx, b) => { const rh = h * 0.4; wallFill(ctx, x + u * 0.1, y + rh, w - u * 0.2, h - rh, u, 'plank', '#a8845c'); gable(ctx, x + u * 0.1, y, w - u * 0.2, rh, '#4a5a3a', u); windows(ctx, x + u * 0.3, y + rh + u * 0.4, w - u * 0.6, 1, 3, u, P.glass, '#5e4b3c', x + dx + u / 2); door(ctx, x + dx, y + h - u, u, '#7a5a3a'); if (b.label) signText(ctx, b.label, x + w / 2, y + rh + u * 0.1, w * 0.8, u, '#f6efd8', '#7a3a2a', SIGN_FONT_ART); },
  chapel: (ctx, x, y, w, h, u, P, dx) => {
    // Tall glass walls in a frame of yellow-pine posts and beams under a steep gable.
    const rh = h * 0.45, bx = x + u * 0.5, bw = w - u;
    R(ctx, bx, y + rh, bw, h - rh, '#9ab8c0'); ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.05; ctx.strokeRect(bx, y + rh, bw, h - rh);
    for (let i = 0; i <= 6; i++) R(ctx, bx + i * bw / 6 - u * 0.05, y + rh, u * 0.1, h - rh, '#d8b070');
    for (let j = 1; j < 4; j++) R(ctx, bx, y + rh + j * (h - rh) / 4, bw, u * 0.06, '#c89a5a');
    poly(ctx, [[bx - u * 0.4, y + rh], [x + w / 2, y - u * 0.4], [bx + bw + u * 0.4, y + rh]], '#6a6a62', OUT, u * 0.05);
    ctx.strokeStyle = '#d8b070'; ctx.lineWidth = u * 0.08; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + w / 2, y - u * 0.3); ctx.lineTo(bx + i * bw / 4, y + rh); ctx.stroke(); }
    door(ctx, x + dx, y + h - u, u, '#8a6a3a');
  },
  carillon: (ctx, x, y, w, h, u) => { for (let i = 0; i < 4; i++) { R(ctx, x + u * (0.1 + i * 0.2), y - u * 1.6, u * 0.14, h + u * 1.6, i % 2 ? '#b0703a' : '#c8884a'); } R(ctx, x, y - u * 1.7, w, u * 0.15, '#8a5a2a'); },
  brides: (ctx, x, y, w, h, u, P, dx) => { const rh = h * 0.45; wallFill(ctx, x + u * 0.1, y + rh, w - u * 0.2, h - rh, u, 'stone', '#b8a888'); gable(ctx, x + u * 0.1, y, w - u * 0.2, rh, '#5a5a52', u); door(ctx, x + dx, y + h - u, u, '#6a4a2a'); },
  grooms: (ctx, x, y, w, h, u, P, dx) => BUILD.brides(ctx, x, y, w, h, u, P, dx),
  pavilion: (ctx, x, y, w, h, u, P) => {
    // Open-air: sandstone piers and redwood beams under a faceted glass roof with a flower-shaped oculus.
    R(ctx, x + u * 0.3, y + h * 0.55, w - u * 0.6, h * 0.45 - u * 0.2, '#c4b49a');
    for (const px of [0.4, w / u / 2 - 0.25, w / u - 0.9]) R(ctx, x + px * u, y + h * 0.45, u * 0.5, h * 0.55 - u * 0.2, '#b89a72');
    poly(ctx, [[x, y + h * 0.5], [x + w * 0.2, y + u * 0.3], [x + w * 0.8, y + u * 0.3], [x + w, y + h * 0.5]], '#7a4a32', OUT, u * 0.05);
    poly(ctx, [[x + w * 0.25, y + h * 0.42], [x + w * 0.35, y + u * 0.5], [x + w * 0.65, y + u * 0.5], [x + w * 0.75, y + h * 0.42]], rgba('#bfe0e8', 0.85), OUT, u * 0.03);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ell(ctx, x + w / 2 + Math.cos(a) * u * 0.35, y + h * 0.3 + Math.sin(a) * u * 0.18, u * 0.18, u * 0.1, rgba('#f8f4ea', 0.7)); }
  },
  treehouse: (ctx, x, y, w, h, u) => {
    for (const px of [0.6, w / u - 0.9]) R(ctx, x + px * u, y + u, u * 0.25, h - u, '#5a5e62');
    R(ctx, x + u * 0.2, y + u * 0.6, w - u * 0.4, u * 1.6, '#b08a5a'); ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.05; ctx.strokeRect(x + u * 0.2, y + u * 0.6, w - u * 0.4, u * 1.6);
    for (let i = 0; i < 9; i++) R(ctx, x + u * 0.3 + i * (w - u * 0.6) / 9, y + u * 0.6, u * 0.06, u * 1.6, '#8a6a3a');
    poly(ctx, [[x, y + u * 0.7], [x + w / 2, y - u * 0.6], [x + w, y + u * 0.7]], '#4a4e52', OUT, u * 0.05);
  },
  restroom: (ctx, x, y, w, h, u, P, dx) => { wallFill(ctx, x + u * 0.1, y + u * 0.6, w - u * 0.2, h - u * 0.6, u, 'stone', '#a89878'); gable(ctx, x, y, w, u * 0.7, '#5a4a3a', u); },
  barn: (ctx, x, y, w, h, u, P, dx, b) => { const rh = h * 0.42; wallFill(ctx, x + u * 0.2, y + rh, w - u * 0.4, h - rh, u, 'plank', '#6a7a5a'); gable(ctx, x + u * 0.1, y, w - u * 0.2, rh, '#5a5e62', u); R(ctx, x + dx - u * 0.5, y + h - u * 1.5, u * 2, u * 1.5, '#3a3a3a'); if (b.label) signText(ctx, b.label, x + w / 2, y + rh + u * 0.2, w * 0.8, u, '#f6efd8', '#2f4a34', SIGN_FONT_ART); },
  greenhouse: (ctx, x, y, w, h, u, P, dx, b) => { R(ctx, x + u * 0.1, y + u * 0.8, w - u * 0.2, h - u * 0.8, rgba('#cfe8e0', 0.85)); ctx.strokeStyle = '#e8ece8'; ctx.lineWidth = u * 0.06; for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(x + u * 0.1 + i * (w - u * 0.2) / 6, y + u * 0.3); ctx.lineTo(x + u * 0.1 + i * (w - u * 0.2) / 6, y + h); ctx.stroke(); } poly(ctx, [[x, y + u * 0.9], [x + w / 2, y], [x + w, y + u * 0.9]], rgba('#dff0ea', 0.9), OUT, u * 0.04); for (let i = 0; i < 6; i++) ell(ctx, x + u * (0.6 + i * 0.7), y + h - u * 0.8, u * 0.22, u * 0.18, '#4a8a3a'); },
  storage: (ctx, x, y, w, h, u, P, dx, b) => { wallFill(ctx, x + u * 0.1, y + u * 0.7, w - u * 0.2, h - u * 0.7, u, 'clap', '#8a8a82'); R(ctx, x, y + u * 0.4, w, u * 0.4, '#5a5a62'); R(ctx, x + dx - u * 0.6, y + h - u * 1.3, u * 2.2, u * 1.3, '#4a4a4a'); if (b.label) signText(ctx, b.label, x + w / 2, y + u * 0.6, w * 0.85, u, '#f6efd8', '#2a3a5a', SIGN_FONT_ART); },
};
const SIGN_FONT_ART = 'Outfit, system-ui, sans-serif';


// ---------- people ----------
export function drawPerson(ctx, look, face, frame, u) {
  const cx = u / 2, by = u * 1.5;
  const skin = SKINS[look.skin ?? 1];
  const lw = Math.max(1, u * 0.05);
  ell(ctx, cx, by - u * 0.06, u * 0.3, u * 0.09, 'rgba(0,0,0,0.28)');
  const step = frame ? u * 0.07 : 0;
  ctx.lineWidth = lw; ctx.strokeStyle = OUT;
  // legs
  for (const [lx, off] of [[-0.14, step], [0.04, -step]]) { ctx.fillStyle = look.pants; ctx.fillRect(cx + lx * u, by - u * 0.42 + Math.max(0, off), u * 0.12, u * 0.36 - Math.abs(off)); ctx.strokeRect(cx + lx * u, by - u * 0.42 + Math.max(0, off), u * 0.12, u * 0.36 - Math.abs(off)); }
  // body
  ctx.fillStyle = look.shirt; rr(ctx, cx - u * 0.24, by - u * 0.86, u * 0.48, u * 0.5, u * 0.1); ctx.fill(); ctx.stroke();
  // arms
  ctx.fillStyle = look.shirt;
  const sw = frame ? u * 0.05 : 0;
  rr(ctx, cx - u * 0.33, by - u * 0.82 - sw, u * 0.11, u * 0.36, u * 0.05); ctx.fill(); ctx.stroke();
  rr(ctx, cx + u * 0.22, by - u * 0.82 + sw, u * 0.11, u * 0.36, u * 0.05); ctx.fill(); ctx.stroke();
  ell(ctx, cx - u * 0.275, by - u * 0.44 - sw, u * 0.055, u * 0.055, skin); ell(ctx, cx + u * 0.275, by - u * 0.44 + sw, u * 0.055, u * 0.055, skin);
  // head
  const hy = by - u * 1.08;
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx, hy, u * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hair
  ctx.fillStyle = look.hair;
  if (face === 'up') { ctx.beginPath(); ctx.arc(cx, hy, u * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(cx, hy - u * 0.02, u * 0.22, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); }
  if (look.beard && face !== 'up') { ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(cx, hy + u * 0.07, u * 0.16, 0.1, Math.PI - 0.1); ctx.fill(); }
  // face
  if (face !== 'up') {
    ctx.fillStyle = OUT;
    const ex = face === 'left' ? -0.08 : face === 'right' ? 0.08 : 0;
    if (face === 'down') { ell(ctx, cx - u * 0.08, hy + u * 0.02, u * 0.03, u * 0.035, OUT); ell(ctx, cx + u * 0.08, hy + u * 0.02, u * 0.03, u * 0.035, OUT); }
    else ell(ctx, cx + ex * u * 1.3, hy + u * 0.02, u * 0.03, u * 0.035, OUT);
    if (look.glasses) { ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = Math.max(1, u * 0.025); if (face === 'down') { ctx.strokeRect(cx - u * 0.14, hy - u * 0.02, u * 0.11, u * 0.08); ctx.strokeRect(cx + u * 0.03, hy - u * 0.02, u * 0.11, u * 0.08); } else ctx.strokeRect(cx + ex * u * 1.3 - u * 0.06, hy - u * 0.02, u * 0.11, u * 0.08); }
  }
  hat(ctx, look.hat, cx, hy, u, look);
}
function hat(ctx, kind, cx, hy, u) {
  ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, u * 0.04);
  const C = { brim: '#5a4430', cap: '#2b4c9b', fedora: '#3a3434', bonnet: '#e8dcc8', toque: '#ffffff', scarf: '#a9432c', 'cap-fur': '#6a5038', helmet: '#f2a541' };
  if (kind === 'none' || !kind) return;
  ctx.fillStyle = C[kind];
  if (kind === 'brim' || kind === 'fedora') { ell(ctx, cx, hy - u * 0.12, u * 0.33, u * 0.08, C[kind]); ctx.fillStyle = C[kind]; rr(ctx, cx - u * 0.17, hy - u * 0.36, u * 0.34, u * 0.24, u * 0.06); ctx.fill(); ctx.stroke(); if (kind === 'fedora') R(ctx, cx - u * 0.17, hy - u * 0.2, u * 0.34, u * 0.05, '#8a2a2a'); }
  else if (kind === 'cap' || kind === 'helmet') { ctx.beginPath(); ctx.arc(cx, hy - u * 0.06, u * 0.23, Math.PI, 0); ctx.fill(); ctx.stroke(); ell(ctx, cx + u * 0.12, hy - u * 0.06, u * 0.16, u * 0.05, shade(C[kind], -0.2)); }
  else if (kind === 'bonnet' || kind === 'scarf') { ctx.beginPath(); ctx.arc(cx, hy - u * 0.02, u * 0.26, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.stroke(); }
  else if (kind === 'toque') { rr(ctx, cx - u * 0.17, hy - u * 0.5, u * 0.34, u * 0.36, u * 0.12); ctx.fill(); ctx.stroke(); }
  else if (kind === 'cap-fur') { rr(ctx, cx - u * 0.22, hy - u * 0.32, u * 0.44, u * 0.24, u * 0.1); ctx.fill(); ctx.stroke(); R(ctx, cx + u * 0.15, hy - u * 0.15, u * 0.1, u * 0.25, '#8a6a48'); }
}
export function personSprite(id, look, face, frame, u) {
  return cached(`p|${id}|${face}|${frame}|${u}`, u, u * 1.5, (ctx) => drawPerson(ctx, look, face, frame, u));
}

export function animalSprite(kind, face, u) {
  return cached(`a|${kind}|${face}|${u}`, u, u, (ctx) => {
    ctx.save(); if (face === 'left') { ctx.translate(u, 0); ctx.scale(-1, 1); }
    ctx.lineWidth = Math.max(1, u * 0.04); ctx.strokeStyle = OUT;
    ell(ctx, u * 0.5, u * 0.92, u * 0.32, u * 0.07, 'rgba(0,0,0,0.25)');
    if (kind === 'hen') { ell(ctx, u * 0.45, u * 0.62, u * 0.24, u * 0.2, '#f8f4ec'); ctx.stroke(); ell(ctx, u * 0.68, u * 0.42, u * 0.12, u * 0.12, '#f8f4ec'); ctx.stroke(); poly(ctx, [[u * 0.78, u * 0.42], [u * 0.9, u * 0.46], [u * 0.78, u * 0.5]], '#f4c542'); ell(ctx, u * 0.68, u * 0.3, u * 0.05, u * 0.05, '#d8302a'); ell(ctx, u * 0.71, u * 0.4, u * 0.02, u * 0.02, OUT); R(ctx, u * 0.4, u * 0.8, u * 0.03, u * 0.1, '#e09a2a'); R(ctx, u * 0.5, u * 0.8, u * 0.03, u * 0.1, '#e09a2a'); }
    else {
      const body = kind === 'cow' ? '#f4f2ec' : '#d8c0a0';
      for (const lx of [0.25, 0.38, 0.6, 0.72]) R(ctx, u * lx, u * 0.66, u * 0.07, u * 0.24, kind === 'cow' ? '#3a3a3a' : '#8a6a48');
      ell(ctx, u * 0.48, u * 0.56, u * 0.3, u * 0.17, body); ctx.stroke();
      if (kind === 'cow') { ell(ctx, u * 0.4, u * 0.52, u * 0.09, u * 0.07, '#2a2a2a'); ell(ctx, u * 0.58, u * 0.6, u * 0.07, u * 0.05, '#2a2a2a'); }
      ell(ctx, u * 0.8, u * 0.44, u * 0.12, u * 0.1, body); ctx.stroke();
      ell(ctx, u * 0.84, u * 0.42, u * 0.02, u * 0.02, OUT);
      if (kind === 'goat') { ctx.strokeStyle = '#6a5a4a'; ctx.beginPath(); ctx.moveTo(u * 0.76, u * 0.36); ctx.quadraticCurveTo(u * 0.7, u * 0.22, u * 0.64, u * 0.28); ctx.stroke(); }
      else { ell(ctx, u * 0.88, u * 0.5, u * 0.06, u * 0.04, '#e8b0a0'); }
    }
    ctx.restore();
  });
}

// ---------- plants and objects ----------
// Trees: shape by kind, colours from the plant's look today ({ leaf, bloom, bare }).
export function treeSprite(kind, P, u, L = {}) {
  return cached(`t|${kind}|${L.leaf || ''}|${L.bloom || ''}|${L.bare ? 1 : 0}|${P.sea}|${u}`, u * 1.6, u * 2.4, (ctx) => {
    const cx = u * 0.8, by = u * 2.35;
    ell(ctx, cx, by - u * 0.08, u * 0.45, u * 0.12, 'rgba(0,0,0,0.25)');
    R(ctx, cx - u * 0.08, by - u * 0.75, u * 0.16, u * 0.7, '#5a3a22');
    ctx.lineWidth = Math.max(1, u * 0.04); ctx.strokeStyle = OUT;
    const leaf = L.leaf || P.oak;
    if (kind === 'pine') {
      for (let i = 0; i < 3; i++) { const t = by - u * (0.55 + i * 0.45), hw = u * (0.6 - i * 0.14); poly(ctx, [[cx - hw, t], [cx, t - u * 0.75], [cx + hw, t]], i % 2 ? P.pine : shade(P.pine, 0.08), OUT, Math.max(1, u * 0.04)); }
      return;
    }
    if (kind === 'cypress' && !L.bare) { poly(ctx, [[cx - u * 0.35, by - u * 0.5], [cx, by - u * 2.2], [cx + u * 0.35, by - u * 0.5]], leaf, OUT, Math.max(1, u * 0.04)); return; }
    if (L.bare) { ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = u * 0.06; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx, by - u * 0.7); ctx.lineTo(cx + (i - 2) * u * 0.25, by - u * (1.3 + (i % 2) * 0.35)); ctx.stroke(); } return; }
    const small = kind === 'jmaple' || kind === 'dogwood' || kind === 'redbud';
    const blobs = small ? [[-0.25, 1.0, 0.36], [0.25, 1.0, 0.36], [0, 1.3, 0.4]] : kind === 'magnolia' ? [[0, 1.3, 0.62]] : [[-0.28, 1.15, 0.44], [0.28, 1.15, 0.44], [0, 1.55, 0.5]];
    for (const [ox, oy, r] of blobs) { ell(ctx, cx + ox * u, by - oy * u, r * u, r * u * 0.88, leaf); ctx.stroke(); }
    for (let i = 0; i < 4; i++) ell(ctx, cx + (i - 1.5) * u * 0.2, by - u * (1.2 + (i % 2) * 0.2), u * 0.12, u * 0.08, shade(leaf, 0.15));
    if (L.bloom) for (let i = 0; i < 9; i++) ell(ctx, cx + Math.cos(i * 2.3) * u * 0.42, by - u * (1.25 + Math.sin(i * 1.7) * 0.3), u * 0.07, u * 0.06, L.bloom);
  });
}
// Fixed and loose objects: plaques, feeders, venues, the pergola, the Fairy Village, waterfalls, limbs, rocks.
export function objSprite(o, P, u) {
  const k = `o|${o.t}|${o.k || ''}|${u}`;
  return cached(k, u * 1.6, u * 1.6, (ctx) => {
    const by = u * 1.55, cx = u * 0.8;
    ctx.lineWidth = Math.max(1, u * 0.04); ctx.strokeStyle = OUT;
    switch (o.t) {
      case 'rock': ell(ctx, cx, by - u * 0.3, u * 0.42, u * 0.28, '#8a867c'); ctx.stroke(); ell(ctx, cx - u * 0.1, by - u * 0.4, u * 0.16, u * 0.08, '#aaa69c'); break;
      case 'limb': ctx.save(); ctx.translate(cx, by - u * 0.25); ctx.rotate(-0.25); rr(ctx, -u * 0.6, -u * 0.09, u * 1.2, u * 0.18, u * 0.08); ctx.fillStyle = '#6a4a2c'; ctx.fill(); ctx.stroke(); for (const s of [-0.3, 0.2]) { ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.moveTo(s * u, 0); ctx.lineTo(s * u + u * 0.2, -u * 0.3); ctx.stroke(); ell(ctx, s * u + u * 0.22, -u * 0.32, u * 0.12, u * 0.08, '#4a6a2a'); } ctx.restore(); break;
      case 'sign': R(ctx, cx - u * 0.05, by - u * 0.8, u * 0.1, u * 0.75, '#4a3a2a'); rr(ctx, cx - u * 0.42, by - u * 1.12, u * 0.84, u * 0.46, u * 0.05); ctx.fillStyle = '#2f4a34'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ede3c8'; for (let i = 0; i < 3; i++) ctx.fillRect(cx - u * 0.3, by - u * (1.0 - i * 0.11), u * (0.6 - i * 0.12), Math.max(1, u * 0.04)); break;
      case 'feeder': R(ctx, cx - u * 0.04, by - u * 1.0, u * 0.08, u * 0.95, '#3a3a3a'); poly(ctx, [[cx - u * 0.26, by - u * 1.0], [cx, by - u * 1.25], [cx + u * 0.26, by - u * 1.0]], '#7a5a3a', OUT, u * 0.03); R(ctx, cx - u * 0.16, by - u * 1.0, u * 0.32, u * 0.28, rgba('#cfe0e0', 0.9)); R(ctx, cx - u * 0.13, by - u * 0.86, u * 0.26, u * 0.12, '#c8a050'); break;
      case 'venue': for (const s of [-1, 1]) R(ctx, cx + s * u * 0.32 - u * 0.04, by - u * 0.5, u * 0.08, u * 0.45, '#f4f0ea'); R(ctx, cx - u * 0.4, by - u * 0.55, u * 0.8, u * 0.08, '#f4f0ea'); ell(ctx, cx, by - u * 0.6, u * 0.12, u * 0.08, '#f2c4cc'); break;
      case 'pergola': for (const s of [-1, 1]) R(ctx, cx + s * u * 0.6 - u * 0.06, by - u * 1.3, u * 0.12, u * 1.25, '#e8e0d0'); for (let i = 0; i < 5; i++) R(ctx, cx - u * 0.75, by - u * (1.38 - i * 0.04) - i * u * 0.02, u * 1.5, u * 0.07, '#d8d0c0'); for (let i = 0; i < 6; i++) ell(ctx, cx + (i - 2.5) * u * 0.25, by - u * 1.45, u * 0.12, u * 0.08, '#4a7a3a'); break;
      case 'fairy': for (const [ox, s, c] of [[-0.35, 0.3, '#e8c8a0'], [0, 0.4, '#d8a8c8'], [0.32, 0.28, '#c8d8a0']]) { R(ctx, cx + ox * u - s * u / 2, by - u * 0.1 - s * u, s * u, s * u, c); poly(ctx, [[cx + ox * u - s * u * 0.65, by - u * 0.1 - s * u], [cx + ox * u, by - u * 0.15 - s * u * 1.7], [cx + ox * u + s * u * 0.65, by - u * 0.1 - s * u]], '#8a4a3a', OUT, u * 0.02); } break;
      case 'falls': ell(ctx, cx, by - u * 0.3, u * 0.6, u * 0.32, '#7a766c'); ctx.stroke(); R(ctx, cx - u * 0.2, by - u * 0.9, u * 0.4, u * 0.7, rgba('#d8f0f8', 0.85)); for (let i = 0; i < 3; i++) R(ctx, cx - u * 0.16 + i * u * 0.12, by - u * 0.9, u * 0.04, u * 0.7, rgba('#ffffff', 0.7)); ell(ctx, cx, by - u * 0.2, u * 0.4, u * 0.12, rgba('#ffffff', 0.7)); break;
      case 'bench': R(ctx, cx - u * 0.45, by - u * 0.42, u * 0.9, u * 0.12, '#8a6a42'); R(ctx, cx - u * 0.45, by - u * 0.62, u * 0.9, u * 0.1, '#7a5a38'); for (const s of [-0.38, 0.32]) R(ctx, cx + s * u, by - u * 0.42, u * 0.07, u * 0.38, '#3a3a3a'); break;
      case 'lamp': R(ctx, cx - u * 0.04, by - u * 1.0, u * 0.08, u * 0.95, '#2a2a2a'); ell(ctx, cx, by - u * 1.02, u * 0.1, u * 0.08, '#f4e8b0'); break;
    }
  });
}
// ---------- item icons (DOM and canvas) ----------
export function iconCanvas(id, px) {
  const it = ITEMS[id];
  const ic = it ? it.ic : ['bag', '#888', '#555'];
  return cached(`i|${id}|${px}`, px, px, (ctx) => drawIcon(ctx, ic, px, id));
}
const urlCache = new Map();
export function iconURL(id, px = 64) {
  const k = id + '|' + px;
  if (!urlCache.has(k)) urlCache.set(k, iconCanvas(id, px).toDataURL());
  return urlCache.get(k);
}
export function drawIcon(ctx, ic, s, id) {
  const [shape, c1 = '#888', c2 = '#555'] = ic;
  const u = s;
  ctx.lineWidth = Math.max(1, u * 0.05); ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  const handle = (x1, y1, x2, y2) => { ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.13; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = '#a8783a'; ctx.lineWidth = u * 0.08; ctx.stroke(); ctx.lineWidth = Math.max(1, u * 0.05); ctx.strokeStyle = OUT; };
  switch (shape) {
    case 'hoe': handle(u * 0.25, u * 0.85, u * 0.7, u * 0.2); poly(ctx, [[u * 0.6, u * 0.15], [u * 0.88, u * 0.25], [u * 0.85, u * 0.38], [u * 0.65, u * 0.3]], '#9aa0a8', OUT, u * 0.04); break;
    case 'axe': handle(u * 0.25, u * 0.88, u * 0.62, u * 0.2); poly(ctx, [[u * 0.5, u * 0.12], [u * 0.85, u * 0.22], [u * 0.82, u * 0.5], [u * 0.6, u * 0.35]], '#9aa0a8', OUT, u * 0.04); break;
    case 'pick': handle(u * 0.3, u * 0.88, u * 0.6, u * 0.25); ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.12; ctx.beginPath(); ctx.moveTo(u * 0.25, u * 0.28); ctx.quadraticCurveTo(u * 0.6, u * 0.05, u * 0.9, u * 0.35); ctx.stroke(); ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = u * 0.07; ctx.stroke(); break;
    case 'scythe': handle(u * 0.25, u * 0.9, u * 0.55, u * 0.15); ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.1; ctx.beginPath(); ctx.moveTo(u * 0.55, u * 0.15); ctx.quadraticCurveTo(u * 0.95, u * 0.2, u * 0.9, u * 0.55); ctx.stroke(); ctx.strokeStyle = '#c8ccd2'; ctx.lineWidth = u * 0.05; ctx.stroke(); break;
    case 'rod': ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.moveTo(u * 0.15, u * 0.9); ctx.lineTo(u * 0.85, u * 0.12); ctx.stroke(); ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = Math.max(1, u * 0.02); ctx.beginPath(); ctx.moveTo(u * 0.85, u * 0.12); ctx.lineTo(u * 0.82, u * 0.6); ctx.stroke(); ell(ctx, u * 0.82, u * 0.65, u * 0.06, u * 0.06, '#e03a3a'); ell(ctx, u * 0.25, u * 0.78, u * 0.08, u * 0.08, '#5a5a5a'); break;
    case 'jug': rr(ctx, u * 0.2, u * 0.3, u * 0.55, u * 0.55, u * 0.15); ctx.fillStyle = '#9a6a4a'; ctx.fill(); ctx.stroke(); R(ctx, u * 0.38, u * 0.15, u * 0.2, u * 0.18, '#7a4a2a'); ctx.strokeRect(u * 0.38, u * 0.15, u * 0.2, u * 0.18); ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.07; ctx.beginPath(); ctx.arc(u * 0.78, u * 0.55, u * 0.13, -1.4, 1.4); ctx.stroke(); ell(ctx, u * 0.47, u * 0.55, u * 0.1, u * 0.06, '#4fc3ff'); break;
    case 'log': ctx.save(); ctx.translate(u / 2, u / 2); ctx.rotate(-0.3); rr(ctx, -u * 0.38, -u * 0.15, u * 0.7, u * 0.3, u * 0.08); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); ell(ctx, u * 0.32, 0, u * 0.08, u * 0.15, '#d8b080'); ctx.stroke(); ctx.restore(); break;
    case 'stone': ell(ctx, u * 0.5, u * 0.58, u * 0.34, u * 0.26, c1); ctx.stroke(); ell(ctx, u * 0.4, u * 0.5, u * 0.12, u * 0.06, shade(c1, 0.3)); break;
    case 'shard': poly(ctx, [[u * 0.2, u * 0.8], [u * 0.35, u * 0.25], [u * 0.65, u * 0.15], [u * 0.8, u * 0.7]], c1, OUT, u * 0.05); poly(ctx, [[u * 0.4, u * 0.7], [u * 0.5, u * 0.3], [u * 0.62, u * 0.68]], c2); break;
    case 'crystal': for (const [ox, h] of [[-0.15, 0.55], [0.05, 0.75], [0.22, 0.5]]) poly(ctx, [[u * (0.42 + ox), u * 0.88], [u * (0.42 + ox), u * (0.88 - h * 0.8)], [u * (0.5 + ox), u * (0.88 - h)], [u * (0.58 + ox), u * (0.88 - h * 0.8)], [u * (0.58 + ox), u * 0.88]], c1, OUT, u * 0.04); break;
    case 'grain': for (let i = -1; i <= 1; i++) { ctx.strokeStyle = c2; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.moveTo(u * 0.5, u * 0.9); ctx.lineTo(u * (0.5 + i * 0.18), u * 0.35); ctx.stroke(); ell(ctx, u * (0.5 + i * 0.2), u * 0.28, u * 0.08, u * 0.18, c1); } break;
    case 'bag': case 'seed': rr(ctx, u * 0.22, u * 0.25, u * 0.56, u * 0.62, u * 0.08); ctx.fillStyle = shape === 'seed' ? '#e8dcc0' : c1; ctx.fill(); ctx.stroke(); R(ctx, u * 0.28, u * 0.18, u * 0.44, u * 0.12, shape === 'seed' ? '#c8b898' : c2); if (shape === 'seed') { ell(ctx, u * 0.5, u * 0.58, u * 0.16, u * 0.16, c1); ctx.stroke(); ell(ctx, u * 0.5, u * 0.42, u * 0.06, u * 0.1, c2); } break;
    case 'gear': ctx.fillStyle = c1; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? u * 0.28 : u * 0.38; ctx.lineTo(u / 2 + Math.cos(a) * r, u / 2 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ell(ctx, u / 2, u / 2, u * 0.1, u * 0.1, c2); break;
    case 'bottle': rr(ctx, u * 0.3, u * 0.32, u * 0.4, u * 0.56, u * 0.1); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); R(ctx, u * 0.42, u * 0.14, u * 0.16, u * 0.2, c1); ctx.strokeRect(u * 0.42, u * 0.14, u * 0.16, u * 0.2); R(ctx, u * 0.32, u * 0.5, u * 0.36, u * 0.16, c2); break;
    case 'leaf': ctx.save(); ctx.translate(u / 2, u / 2); ctx.rotate(-0.6); ell(ctx, 0, 0, u * 0.18, u * 0.36, c1); ctx.stroke(); ctx.strokeStyle = c2; ctx.beginPath(); ctx.moveTo(0, -u * 0.3); ctx.lineTo(0, u * 0.4); ctx.stroke(); ctx.restore(); break;
    case 'nut': for (const [ox, oy] of [[-0.12, 0.05], [0.14, -0.02], [0.02, 0.18]]) { ell(ctx, u * (0.5 + ox), u * (0.55 + oy), u * 0.15, u * 0.13, c1); ctx.stroke(); ell(ctx, u * (0.5 + ox), u * (0.45 + oy), u * 0.13, u * 0.05, c2); } break;
    case 'berry': for (const [ox, oy] of [[-0.14, 0.05], [0.12, 0.0], [0, 0.18], [0.02, -0.12]]) { ell(ctx, u * (0.5 + ox), u * (0.55 + oy), u * 0.12, u * 0.12, c1); ctx.stroke(); } poly(ctx, [[u * 0.5, u * 0.3], [u * 0.65, u * 0.18], [u * 0.58, u * 0.34]], c2); break;
    case 'mushroom': R(ctx, u * 0.42, u * 0.5, u * 0.16, u * 0.35, '#e8dcc8'); ctx.strokeRect(u * 0.42, u * 0.5, u * 0.16, u * 0.35); ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(u * 0.5, u * 0.52, u * 0.3, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'egg': ell(ctx, u * 0.5, u * 0.55, u * 0.24, u * 0.3, c1); ctx.stroke(); break;
    case 'plank': for (let i = 0; i < 3; i++) { R(ctx, u * 0.15, u * (0.25 + i * 0.2), u * 0.7, u * 0.15, i % 2 ? c2 : c1); ctx.strokeRect(u * 0.15, u * (0.25 + i * 0.2), u * 0.7, u * 0.15); } break;
    case 'cup': rr(ctx, u * 0.25, u * 0.35, u * 0.45, u * 0.45, u * 0.08); ctx.fillStyle = c2; ctx.fill(); ctx.stroke(); ell(ctx, u * 0.47, u * 0.38, u * 0.2, u * 0.05, c1); ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.arc(u * 0.72, u * 0.55, u * 0.1, -1.4, 1.4); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = u * 0.03; ctx.beginPath(); ctx.moveTo(u * 0.4, u * 0.28); ctx.quadraticCurveTo(u * 0.35, u * 0.18, u * 0.45, u * 0.08); ctx.stroke(); break;
    case 'jar': rr(ctx, u * 0.27, u * 0.3, u * 0.46, u * 0.56, u * 0.1); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); R(ctx, u * 0.3, u * 0.2, u * 0.4, u * 0.14, '#d4af37'); ctx.strokeRect(u * 0.3, u * 0.2, u * 0.4, u * 0.14); R(ctx, u * 0.33, u * 0.5, u * 0.34, u * 0.18, c2); break;
    case 'wedge': poly(ctx, [[u * 0.15, u * 0.75], [u * 0.85, u * 0.75], [u * 0.85, u * 0.4], [u * 0.15, u * 0.55]], c1, OUT, u * 0.05); ell(ctx, u * 0.5, u * 0.62, u * 0.05, u * 0.05, c2); break;
    case 'basket': rr(ctx, u * 0.15, u * 0.45, u * 0.7, u * 0.4, u * 0.08); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.arc(u * 0.5, u * 0.45, u * 0.3, Math.PI, 0); ctx.stroke(); ell(ctx, u * 0.4, u * 0.45, u * 0.1, u * 0.08, c2); break;
    case 'fence': R(ctx, u * 0.2, u * 0.25, u * 0.12, u * 0.6, c2); R(ctx, u * 0.68, u * 0.25, u * 0.12, u * 0.6, c2); R(ctx, u * 0.1, u * 0.38, u * 0.8, u * 0.1, c1); R(ctx, u * 0.1, u * 0.62, u * 0.8, u * 0.1, c1); break;
    case 'chest': rr(ctx, u * 0.15, u * 0.3, u * 0.7, u * 0.5, u * 0.08); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); R(ctx, u * 0.15, u * 0.46, u * 0.7, u * 0.06, '#5a3a22'); R(ctx, u * 0.45, u * 0.42, u * 0.1, u * 0.12, c2); break;
    case 'sprinkler': R(ctx, u * 0.45, u * 0.45, u * 0.1, u * 0.4, c1); ell(ctx, u * 0.5, u * 0.42, u * 0.22, u * 0.08, c1); ctx.stroke(); for (let i = -2; i <= 2; i++) ell(ctx, u * (0.5 + i * 0.15), u * (0.25 - Math.abs(i) * 0.03), u * 0.035, u * 0.05, c2); break;
    case 'hut': R(ctx, u * 0.2, u * 0.45, u * 0.6, u * 0.4, c1); ctx.strokeRect(u * 0.2, u * 0.45, u * 0.6, u * 0.4); poly(ctx, [[u * 0.1, u * 0.5], [u * 0.5, u * 0.15], [u * 0.9, u * 0.5]], c2, OUT, u * 0.04); break;
    case 'stand': R(ctx, u * 0.15, u * 0.55, u * 0.7, u * 0.3, '#b0844a'); ctx.strokeRect(u * 0.15, u * 0.55, u * 0.7, u * 0.3); for (let i = 0; i < 4; i++) R(ctx, u * (0.1 + i * 0.2), u * 0.2, u * 0.2, u * 0.15, i % 2 ? '#fff' : c1); R(ctx, u * 0.15, u * 0.35, u * 0.05, u * 0.2, '#6a4a2a'); R(ctx, u * 0.8, u * 0.35, u * 0.05, u * 0.2, '#6a4a2a'); break;
    case 'tub': ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(u * 0.1, u * 0.4); ctx.lineTo(u * 0.9, u * 0.4); ctx.quadraticCurveTo(u * 0.88, u * 0.8, u * 0.5, u * 0.8); ctx.quadraticCurveTo(u * 0.12, u * 0.8, u * 0.1, u * 0.4); ctx.fill(); ctx.stroke(); ell(ctx, u * 0.25, u * 0.85, u * 0.08, u * 0.08, c2); ell(ctx, u * 0.75, u * 0.85, u * 0.08, u * 0.08, c2); break;
    case 'fish': ell(ctx, u * 0.45, u * 0.5, u * 0.3, u * 0.16, c1); ctx.stroke(); poly(ctx, [[u * 0.72, u * 0.5], [u * 0.92, u * 0.32], [u * 0.92, u * 0.68]], c2, OUT, u * 0.04); ell(ctx, u * 0.28, u * 0.46, u * 0.035, u * 0.035, OUT); R(ctx, u * 0.35, u * 0.48, u * 0.25, u * 0.04, rgba(c2, 0.6)); break;
    // crop shapes as icons
    case 'root': ell(ctx, u * 0.5, u * 0.62, u * 0.22, u * 0.26, c1); ctx.stroke(); for (const a of [-0.4, 0, 0.4]) { ctx.save(); ctx.translate(u * 0.5, u * 0.36); ctx.rotate(a); ell(ctx, 0, -u * 0.12, u * 0.06, u * 0.14, c2); ctx.restore(); } break;
    case 'cob': ctx.save(); ctx.translate(u / 2, u / 2); ctx.rotate(0.5); ell(ctx, 0, 0, u * 0.14, u * 0.34, c1); ctx.stroke(); ctx.fillStyle = shade(c1, -0.15); for (let i = -3; i <= 3; i++) ctx.fillRect(-u * 0.12, i * u * 0.08, u * 0.24, Math.max(1, u * 0.02)); poly(ctx, [[-u * 0.14, u * 0.1], [-u * 0.28, u * 0.42], [0, u * 0.3]], c2); ctx.restore(); break;
    case 'pod': for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(u * (0.32 + i * 0.18), u * 0.5); ctx.rotate(0.3); ell(ctx, 0, 0, u * 0.07, u * 0.28, c1); ctx.stroke(); ctx.restore(); } break;
    case 'gourd': ell(ctx, u * 0.5, u * 0.6, u * 0.3, u * 0.24, c1); ctx.stroke(); R(ctx, u * 0.46, u * 0.25, u * 0.08, u * 0.15, c2); break;
    case 'head': ell(ctx, u * 0.5, u * 0.55, u * 0.32, u * 0.28, c1); ctx.stroke(); ell(ctx, u * 0.5, u * 0.52, u * 0.16, u * 0.13, shade(c1, 0.25)); break;
    case 'round': ell(ctx, u * 0.5, u * 0.56, u * 0.3, u * 0.26, c1); ctx.stroke(); poly(ctx, [[u * 0.38, u * 0.32], [u * 0.5, u * 0.38], [u * 0.62, u * 0.32], [u * 0.5, u * 0.28]], c2); ell(ctx, u * 0.4, u * 0.48, u * 0.06, u * 0.04, rgba('#ffffff', 0.5)); break;
    case 'pepper': ctx.save(); ctx.translate(u / 2, u / 2); ctx.rotate(0.4); ell(ctx, 0, u * 0.05, u * 0.15, u * 0.3, c1); ctx.stroke(); R(ctx, -u * 0.04, -u * 0.32, u * 0.08, u * 0.12, c2); ctx.restore(); break;
    case 'melon': ell(ctx, u * 0.5, u * 0.55, u * 0.38, u * 0.28, c1); ctx.stroke(); ctx.strokeStyle = shade(c1, -0.35); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(u * (0.5 + i * 0.13), u * 0.55, u * 0.05, u * 0.26, 0, 0, Math.PI * 2); ctx.stroke(); } break;
    case 'cone': for (const [ox, oy] of [[0, 0], [-0.14, 0.18], [0.14, 0.15]]) { ell(ctx, u * (0.5 + ox), u * (0.45 + oy), u * 0.13, u * 0.2, c1); ctx.stroke(); } break;
    case 'flower': R(ctx, u * 0.47, u * 0.45, u * 0.06, u * 0.45, c2); poly(ctx, [[u * 0.3, u * 0.5], [u * 0.3, u * 0.18], [u * 0.42, u * 0.32], [u * 0.5, u * 0.12], [u * 0.58, u * 0.32], [u * 0.7, u * 0.18], [u * 0.7, u * 0.5]], c1, OUT, u * 0.04); break;
    case 'shears': for (const s of [-1, 1]) { ctx.save(); ctx.translate(u * 0.5, u * 0.55); ctx.rotate(s * 0.35); R(ctx, -u * 0.05, -u * 0.42, u * 0.1, u * 0.42, c2); ctx.strokeRect(-u * 0.05, -u * 0.42, u * 0.1, u * 0.42); rr(ctx, -u * 0.08, 0, u * 0.16, u * 0.36, u * 0.06); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); ctx.restore(); } break;
    case 'trowel': handle(u * 0.2, u * 0.85, u * 0.45, u * 0.6); poly(ctx, [[u * 0.42, u * 0.62], [u * 0.85, u * 0.18], [u * 0.62, u * 0.6]], c2, OUT, u * 0.04); break;
    case 'rake': handle(u * 0.2, u * 0.9, u * 0.62, u * 0.25); ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.05; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(u * 0.62, u * 0.25); ctx.lineTo(u * (0.62 + i * 0.08), u * 0.06); ctx.stroke(); } break;
    case 'can': rr(ctx, u * 0.2, u * 0.38, u * 0.45, u * 0.42, u * 0.08); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); poly(ctx, [[u * 0.62, u * 0.55], [u * 0.92, u * 0.28], [u * 0.95, u * 0.34], [u * 0.66, u * 0.65]], c2, OUT, u * 0.03); ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.arc(u * 0.42, u * 0.38, u * 0.16, Math.PI, 0); ctx.stroke(); break;
    case 'grabber': ctx.strokeStyle = c2; ctx.lineWidth = u * 0.07; ctx.beginPath(); ctx.moveTo(u * 0.2, u * 0.2); ctx.lineTo(u * 0.75, u * 0.8); ctx.stroke(); rr(ctx, u * 0.1, u * 0.12, u * 0.2, u * 0.16, u * 0.05); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); for (const s of [-1, 1]) { ctx.strokeStyle = c1; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.moveTo(u * 0.75, u * 0.8); ctx.lineTo(u * (0.78 + s * 0.08), u * 0.92); ctx.stroke(); } break;
    case 'saw': handle(u * 0.15, u * 0.88, u * 0.35, u * 0.66); poly(ctx, [[u * 0.32, u * 0.62], [u * 0.88, u * 0.12], [u * 0.92, u * 0.24], [u * 0.4, u * 0.72]], c1, OUT, u * 0.03); break;
    case 'mower': rr(ctx, u * 0.18, u * 0.45, u * 0.55, u * 0.3, u * 0.06); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); for (const wx of [0.25, 0.65]) { ell(ctx, u * wx, u * 0.78, u * 0.09, u * 0.09, c2); } ctx.strokeStyle = OUT; ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.moveTo(u * 0.68, u * 0.5); ctx.lineTo(u * 0.88, u * 0.15); ctx.stroke(); break;
    case 'reel': ell(ctx, u * 0.5, u * 0.5, u * 0.34, u * 0.34, c1); ctx.stroke(); ell(ctx, u * 0.5, u * 0.5, u * 0.12, u * 0.12, '#888'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ell(ctx, u * 0.5 + Math.cos(a) * u * 0.25, u * 0.5 + Math.sin(a) * u * 0.25, u * 0.05, u * 0.05, i % 2 ? c2 : '#ff7a6a'); } break;
    case 'bale': rr(ctx, u * 0.15, u * 0.35, u * 0.7, u * 0.45, u * 0.06); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); ctx.strokeStyle = c2; ctx.lineWidth = u * 0.03; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(u * 0.2, u * (0.42 + i * 0.06)); ctx.lineTo(u * 0.8, u * (0.4 + i * 0.065)); ctx.stroke(); } R(ctx, u * 0.35, u * 0.35, u * 0.04, u * 0.45, '#5a3a22'); R(ctx, u * 0.6, u * 0.35, u * 0.04, u * 0.45, '#5a3a22'); break;
    case 'bulb': rr(ctx, u * 0.12, u * 0.5, u * 0.76, u * 0.36, u * 0.05); ctx.fillStyle = '#a8784a'; ctx.fill(); ctx.stroke(); for (const [ox, oy] of [[0.3, 0.5], [0.5, 0.46], [0.7, 0.5]]) { ell(ctx, u * ox, u * oy, u * 0.1, u * 0.12, c2); ctx.stroke(); poly(ctx, [[u * (ox - 0.06), u * (oy - 0.08)], [u * ox, u * (oy - 0.3)], [u * (ox + 0.06), u * (oy - 0.08)]], c1, OUT, u * 0.02); } break;
    case 'cloth': poly(ctx, [[u * 0.15, u * 0.75], [u * 0.3, u * 0.25], [u * 0.7, u * 0.3], [u * 0.85, u * 0.78]], c1, OUT, u * 0.04); ctx.strokeStyle = c2; ctx.lineWidth = u * 0.02; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(u * (0.2 + i * 0.15), u * 0.28); ctx.lineTo(u * (0.2 + i * 0.16), u * 0.76); ctx.stroke(); } break;
    default: ell(ctx, u / 2, u / 2, u * 0.3, u * 0.3, c1); ctx.stroke();
  }
}
