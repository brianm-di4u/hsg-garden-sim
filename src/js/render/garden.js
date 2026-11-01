// Code-drawn garden art: shrubs and small plants by season, bed plantings (tulips, annuals), what piles up on the
// ground (leaves, weeds, litter, long grass), display pieces with their lights, and the peafowl. Painted art, where
// it exists, is chosen in painted.js; these are the stand-ins and the parts that change too often to paint.
import { cached } from './art.js';
import { mix, shade, rgba } from './palette.js';
import { noise } from '../sim/rng.js';

const OUT = '#1a1612';
const ell = (ctx, x, y, rx, ry, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fill(); };
const poly = (ctx, pts, c, stroke, lw) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (c) { ctx.fillStyle = c; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } };

// ---------- shrubs and small plants ----------
// Returns { c, ox, oy } with the sprite's offset from the tile's base point (x + 0.5, y + 0.92).
export function plantSprite(o, L, u, x, y) {
  const k = `pl|${o.k}|${L.leaf}|${L.bloom || ''}|${L.bare ? 1 : 0}|${L.sick ? 1 : 0}|${L.shaggy ? 1 : 0}|${o.cloud ? 1 : 0}|${(x * 3 + y) % 3}|${u}`;
  const w = u * 1.2, h = u * 1.3;
  const c = cached(k, w, h, (ctx) => {
    const cx = w / 2, by = h - u * 0.06, v = (x * 3 + y) % 3;
    ctx.lineWidth = Math.max(1, u * 0.035); ctx.strokeStyle = OUT;
    const leaf = L.sick ? mix(L.leaf, '#9a7a3a', 0.55) : L.leaf;
    switch (o.k) {
      case 'conifer': poly(ctx, [[cx - u * 0.3, by - u * 0.1], [cx, by - u * 1.1], [cx + u * 0.3, by - u * 0.1]], leaf, OUT, u * 0.035); poly(ctx, [[cx - u * 0.12, by - u * 0.45], [cx, by - u * 0.95], [cx + u * 0.04, by - u * 0.5]], shade(leaf, 0.15)); break;
      case 'bonsai': {
        ctx.fillStyle = '#5a4a6a'; ctx.beginPath(); ctx.moveTo(cx - u * 0.28, by - u * 0.22); ctx.lineTo(cx + u * 0.28, by - u * 0.22); ctx.lineTo(cx + u * 0.2, by - u * 0.02); ctx.lineTo(cx - u * 0.2, by - u * 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.moveTo(cx, by - u * 0.22); ctx.quadraticCurveTo(cx - u * 0.2, by - u * 0.4, cx + u * 0.05, by - u * 0.55); ctx.stroke();
        for (const [ox, oy] of [[-0.15, 0.55], [0.12, 0.62], [0.02, 0.72]]) ell(ctx, cx + ox * u, by - oy * u, u * 0.16, u * 0.08, leaf);
        break;
      }
      case 'daylily': case 'fern': case 'daffodil': case 'wildflower': {
        if (L.bare) { for (let i = 0; i < 4; i++) { ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = u * 0.03; ctx.beginPath(); ctx.moveTo(cx + (i - 1.5) * u * 0.08, by); ctx.lineTo(cx + (i - 1.5) * u * 0.14, by - u * 0.18); ctx.stroke(); } break; }
        const n = o.k === 'wildflower' ? 7 : 6;
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i - (n - 1) / 2) * (o.k === 'fern' ? 0.38 : 0.28), len = u * (o.k === 'fern' ? 0.55 : 0.45) * (0.8 + noise(x, y, i) * 0.4);
          const ex = cx + Math.cos(a) * len, ey = by - u * 0.05 + Math.sin(a) * len;
          ctx.strokeStyle = shade(leaf, i % 2 ? -0.15 : 0.08); ctx.lineWidth = u * (o.k === 'fern' ? 0.07 : 0.045);
          ctx.beginPath(); ctx.moveTo(cx, by - u * 0.05); ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.5, by - u * 0.05 + Math.sin(a) * len * 0.7, ex, ey); ctx.stroke();
          if (L.bloom && i % 2 === 0) {
            if (o.k === 'daffodil') { ell(ctx, ex, ey, u * 0.09, u * 0.08, L.bloom); ell(ctx, ex, ey, u * 0.04, u * 0.04, '#f0a020'); }
            else if (o.k === 'daylily') { for (let p = 0; p < 5; p++) { const pa = p / 5 * Math.PI * 2; ell(ctx, ex + Math.cos(pa) * u * 0.06, ey + Math.sin(pa) * u * 0.05, u * 0.05, u * 0.03, L.bloom); } ell(ctx, ex, ey, u * 0.025, u * 0.025, '#f8e070'); }
            else ell(ctx, ex, ey, u * 0.05, u * 0.05, ['#f2d24a', '#b67ad8', '#e8803a', '#f4f0e4'][i % 4]);
          }
        }
        break;
      }
      default: {
        // Shrubs: a mound of leaf clumps; blooms as dots of colour over it; shaggy shoots when overdue for pruning.
        const big = o.k === 'rhododendron' || o.k === 'camellia' || o.k === 'privet';
        const r = u * (big ? 0.48 : 0.42), my = by - r * 0.9;
        if (o.cloud) { for (const [ox, oy, s] of [[-0.22, 0.05, 0.3], [0.2, 0.02, 0.32], [0, -0.18, 0.3]]) { ell(ctx, cx + ox * u, my + oy * u, s * u, s * u * 0.75, leaf); ctx.stroke(); } }
        else { ell(ctx, cx, my, r, r * 0.82, shade(leaf, -0.12)); ctx.stroke(); }
        for (let i = 0; i < 6; i++) ell(ctx, cx + Math.cos(i * 1.1 + v) * r * 0.5, my + Math.sin(i * 1.7 + v) * r * 0.4 - r * 0.1, r * 0.32, r * 0.24, shade(leaf, (i % 3 - 1) * 0.1));
        if (L.bloom) {
          const nb = o.k === 'hydrangea' ? 5 : o.k === 'camellia' || o.k === 'rose' || o.k === 'peony' ? 7 : 16;
          for (let i = 0; i < nb; i++) {
            const bx = cx + (noise(x, y, i + 10) - 0.5) * r * 1.6, byy = my + (noise(x, y, i + 30) - 0.5) * r * 1.2;
            const s = o.k === 'hydrangea' ? 0.13 : o.k === 'azalea' ? 0.06 : 0.08;
            ell(ctx, bx, byy, u * s, u * s * 0.85, o.cloud ? '#ffffff' : L.bloom);
            if (o.k !== 'azalea') ell(ctx, bx - u * s * 0.3, byy - u * s * 0.3, u * s * 0.35, u * s * 0.3, rgba('#ffffff', 0.45));
          }
        }
        if (L.shaggy) { ctx.strokeStyle = shade(leaf, -0.25); ctx.lineWidth = u * 0.03; for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.9 + i * 0.45; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.6, my + Math.sin(a) * r * 0.5); ctx.lineTo(cx + Math.cos(a) * r * 1.35, my + Math.sin(a) * r * 1.2); ctx.stroke(); } }
      }
    }
  });
  return { c, ox: -w / 2, oy: -h };
}

// ---------- bed plantings ----------
export function bedSprite(L, u, x, y) {
  const k = `bd|${L.stage}|${L.col || ''}|${(x + y) % 2}|${u}`;
  const w = u, h = u * 1.05;
  const c = cached(k, w, h, (ctx) => {
    const by = h - u * 0.08;
    const rows = [[0.2, 0.35], [0.55, 0.32], [0.8, 0.38], [0.35, 0.7], [0.7, 0.72]];
    if (L.stage === 'bulb') { for (const [ox, oy] of rows) ell(ctx, ox * w, by - (1 - oy) * u * 0.5, u * 0.04, u * 0.025, '#5a3a22'); return; }
    for (const [ox, oy] of rows) {
      const sx = ox * w, sy = by - (1 - oy) * u * 0.55;
      if (L.stage === 'spent' || L.stage === 'tired') { ctx.strokeStyle = '#8a7a3a'; ctx.lineWidth = u * 0.04; ctx.beginPath(); ctx.moveTo(sx, sy + u * 0.15); ctx.quadraticCurveTo(sx + u * 0.1, sy, sx + u * 0.16, sy + u * 0.08); ctx.stroke(); continue; }
      ctx.strokeStyle = '#4a8a3a'; ctx.lineWidth = u * 0.04;
      ctx.beginPath(); ctx.moveTo(sx, sy + u * 0.18); ctx.lineTo(sx, sy - (L.stage === 'leaf' ? 0 : u * 0.08)); ctx.stroke();
      ell(ctx, sx - u * 0.06, sy + u * 0.08, u * 0.04, u * 0.1, '#5a9a3a');
      if (L.stage === 'bloom' || L.stage === 'burnt' || L.stage === 'dry') {
        const col = L.stage === 'burnt' ? mix(L.col, '#6a4a2a', 0.6) : L.stage === 'dry' ? mix(L.col, '#b8a070', 0.5) : L.col;
        if (L.col && L.stage !== 'dry' && L.stage === 'bloom' && L.tulip !== false) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx - u * 0.07, sy - u * 0.08); ctx.lineTo(sx - u * 0.07, sy - u * 0.2); ctx.lineTo(sx - u * 0.035, sy - u * 0.15); ctx.lineTo(sx, sy - u * 0.22); ctx.lineTo(sx + u * 0.035, sy - u * 0.15); ctx.lineTo(sx + u * 0.07, sy - u * 0.2); ctx.lineTo(sx + u * 0.07, sy - u * 0.08); ctx.quadraticCurveTo(sx, sy - u * 0.02, sx - u * 0.07, sy - u * 0.08); ctx.fill(); ctx.strokeStyle = rgba(OUT, 0.6); ctx.lineWidth = Math.max(1, u * 0.015); ctx.stroke(); }
        else ell(ctx, sx, sy - u * 0.12, u * 0.07, u * 0.06, col);
      }
    }
  });
  return { c, ox: 0, oy: -h + u };
}
// Annual beds: low mounds of colour (drawn differently from tulips).
export function annualSprite(L, u, x, y) {
  const k = `an|${L.stage}|${L.col}|${(x + y) % 2}|${u}`;
  const c = cached(k, u, u, (ctx) => {
    for (let i = 0; i < 4; i++) {
      const cx = u * (0.25 + (i % 2) * 0.5), cy = u * (0.32 + Math.floor(i / 2) * 0.42);
      ell(ctx, cx, cy, u * 0.2, u * 0.15, L.stage === 'tired' ? '#7a7a3a' : L.stage === 'dry' ? '#8a9a4a' : '#3f7a34');
      if (L.stage === 'bloom') for (let j = 0; j < 5; j++) ell(ctx, cx + Math.cos(j * 1.3) * u * 0.1, cy + Math.sin(j * 1.9) * u * 0.07, u * 0.045, u * 0.04, L.col);
    }
  });
  return { c, ox: 0, oy: 0 };
}

// ---------- on the ground ----------
export function drawLeaves(ctx, x, y, v, u, sea) {
  const cols = sea === 'fa' || sea === 'wi' ? ['#c8642a', '#d8a040', '#9a4a2a', '#b8782a'] : ['#8a7a3a', '#6a5a2a'];
  for (let i = 0; i < 4 + v * 4; i++) {
    const n = (k) => noise(x, y, 900 + i * 5 + k);
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.ellipse((x + 0.1 + n(0) * 0.8) * u, (y + 0.15 + n(1) * 0.75) * u, u * 0.07, u * 0.035, n(2) * 3, 0, 7); ctx.fill();
  }
}
export function drawWeeds(ctx, x, y, v, u) {
  ctx.strokeStyle = '#5a8a2a'; ctx.lineWidth = Math.max(1, u * 0.035); ctx.lineCap = 'round';
  for (let i = 0; i < v * 2 + 1; i++) {
    const n = (k) => noise(x, y, 950 + i * 5 + k), bx = (x + 0.15 + n(0) * 0.7) * u, by = (y + 0.35 + n(1) * 0.55) * u;
    for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + j * u * 0.08, by - u * (0.15 + v * 0.05)); ctx.stroke(); }
    if (v >= 2) ell(ctx, bx, by - u * 0.2, u * 0.03, u * 0.03, '#f4e04a');
  }
}
export function drawLitter(ctx, x, y, kind, u) {
  const n = (k) => noise(x, y, 990 + k), px = (x + 0.25 + n(0) * 0.5) * u, py = (y + 0.35 + n(1) * 0.45) * u;
  if (kind === 'dog') { ell(ctx, px, py, u * 0.08, u * 0.05, '#5a3a22'); return; }
  const t = Math.floor(n(2) * 3);
  ctx.save(); ctx.translate(px, py); ctx.rotate(n(3) * 3);
  if (t === 0) { ctx.fillStyle = '#e8e4dc'; ctx.fillRect(-u * 0.1, -u * 0.07, u * 0.2, u * 0.14); ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = Math.max(1, u * 0.015); ctx.strokeRect(-u * 0.1, -u * 0.07, u * 0.2, u * 0.14); }
  else if (t === 1) { ctx.fillStyle = '#c83a3a'; ctx.fillRect(-u * 0.05, -u * 0.1, u * 0.1, u * 0.2); ctx.fillStyle = '#d8d8d8'; ctx.fillRect(-u * 0.05, -u * 0.1, u * 0.1, u * 0.03); }
  else { ctx.fillStyle = '#f4f0a0'; ctx.beginPath(); ctx.moveTo(-u * 0.1, 0); ctx.lineTo(0, -u * 0.08); ctx.lineTo(u * 0.1, u * 0.02); ctx.lineTo(0, u * 0.07); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
export function drawTallGrass(ctx, x, y, v, u, col) {
  ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = Math.max(1, u * 0.025);
  for (let i = 0; i < v * 5; i++) { const n = (k) => noise(x, y, 1100 + i * 3 + k), bx = (x + n(0)) * u, by = (y + 0.2 + n(1) * 0.8) * u; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (n(2) - 0.5) * u * 0.1, by - u * 0.12 * v); ctx.stroke(); }
}
export function drawCloth(ctx, x, y, u) {
  ctx.fillStyle = 'rgba(240,244,246,0.85)'; ctx.fillRect(x * u + u * 0.04, y * u + u * 0.1, u * 0.92, u * 0.8);
  ctx.strokeStyle = 'rgba(150,160,170,0.8)'; ctx.lineWidth = Math.max(1, u * 0.02); ctx.strokeRect(x * u + u * 0.04, y * u + u * 0.1, u * 0.92, u * 0.8);
}
// A marked stake where a display piece goes (shown while that show is being installed).
export function drawStake(ctx, x, y, u, col) {
  const bx = (x + 0.5) * u, by = (y + 0.85) * u;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(bx, by, u * 0.18, u * 0.06, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c8a070'; ctx.fillRect(bx - u * 0.03, by - u * 0.45, u * 0.06, u * 0.45);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx + u * 0.03, by - u * 0.45); ctx.lineTo(bx + u * 0.25, by - u * 0.38); ctx.lineTo(bx + u * 0.03, by - u * 0.31); ctx.fill();
}

// ---------- display pieces ----------
// lit: 0 (day or off) … 1 (night, working). dark: a piece with a dead strand. t: time for animation.
const HL_COLS = ['#ff5a6a', '#ffd860', '#6ae0ff', '#8aff8a', '#ff8ae0', '#ffffff'];
export function pieceSprite(item, u, lit, dark, t = 0) {
  const phase = lit ? Math.floor(t / 400) % 6 : 0;
  const k = `pc|${item}|${lit ? 1 : 0}|${dark ? 1 : 0}|${phase}|${u}`;
  const tall = item === 'hl:rose' ? 3.2 : item === 'hl:pole' ? 2.0 : item === 'hl:arch' ? 1.7 : 1.2;
  const wide = item === 'hl:arch' ? 1.4 : item === 'hl:rose' ? 1.8 : 1.1;
  const w = u * wide, h = u * tall;
  const c = cached(k, w, h, (ctx) => {
    const cx = w / 2, by = h - u * 0.05;
    const bulb = (x, y, i, r = 0.045) => { const col = dark && i % 3 === 0 ? '#3a3a3a' : HL_COLS[(i + phase) % HL_COLS.length]; if (lit && !(dark && i % 3 === 0)) ell(ctx, x, y, u * r * 2.4, u * r * 2.4, rgba(col, 0.25)); ell(ctx, x, y, u * r, u * r, lit ? col : shade(col, -0.35)); };
    ctx.lineWidth = Math.max(1, u * 0.03); ctx.strokeStyle = OUT;
    switch (item) {
      case 'hl:pole': case 'hl:rose': {
        const H = h - u * 0.2, base = item === 'hl:rose' ? u * 0.8 : u * 0.45;
        ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, by - H); ctx.stroke();
        for (let s = 0; s < (item === 'hl:rose' ? 14 : 8); s++) {
          const a = (s / (item === 'hl:rose' ? 14 : 8)) * 2 - 1;
          ctx.strokeStyle = lit ? rgba('#ffe8a0', 0.4) : 'rgba(40,40,40,0.5)'; ctx.lineWidth = Math.max(1, u * 0.015);
          ctx.beginPath(); ctx.moveTo(cx, by - H); ctx.lineTo(cx + a * base, by); ctx.stroke();
          for (let j = 1; j < 7; j++) bulb(cx + a * base * j / 7, by - H + H * j / 7, s + j, item === 'hl:rose' ? 0.05 : 0.04);
        }
        if (item === 'hl:rose') bulb(cx, by - H, 0, 0.12);
        break;
      }
      case 'hl:set': { // a lit gift-box set piece
        ctx.strokeStyle = lit ? '#ffd860' : '#7a6a3a'; ctx.lineWidth = u * 0.05; ctx.strokeRect(cx - u * 0.35, by - u * 0.7, u * 0.7, u * 0.62);
        ctx.beginPath(); ctx.moveTo(cx, by - u * 0.7); ctx.lineTo(cx, by - u * 0.08); ctx.moveTo(cx - u * 0.35, by - u * 0.4); ctx.lineTo(cx + u * 0.35, by - u * 0.4); ctx.stroke();
        for (let i = 0; i < 12; i++) bulb(cx - u * 0.35 + (i % 4) * u * 0.233, by - u * 0.7 + Math.floor(i / 4) * u * 0.31, i);
        ell(ctx, cx - u * 0.12, by - u * 0.8, u * 0.12, u * 0.07, lit ? '#ff5a6a' : '#8a3a3a'); ell(ctx, cx + u * 0.12, by - u * 0.8, u * 0.12, u * 0.07, lit ? '#ff5a6a' : '#8a3a3a');
        break;
      }
      case 'hl:blossom': {
        ctx.strokeStyle = '#3a5a3a'; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, by - u * 0.6); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ell(ctx, cx + Math.cos(a) * u * 0.22, by - u * 0.75 + Math.sin(a) * u * 0.18, u * 0.14, u * 0.1, lit ? HL_COLS[(phase + (i % 2 ? 2 : 4)) % 6] : '#6a5a6a'); }
        ell(ctx, cx, by - u * 0.75, u * 0.1, u * 0.1, lit ? '#ffffff' : '#8a8a7a');
        break;
      }
      case 'hl:arch': {
        ctx.strokeStyle = lit ? '#a8e8ff' : '#6a7a82'; ctx.lineWidth = u * 0.06;
        ctx.beginPath(); ctx.moveTo(u * 0.1, by); ctx.lineTo(u * 0.1, by - u * 0.9); ctx.quadraticCurveTo(cx, by - h * 1.05, w - u * 0.1, by - u * 0.9); ctx.lineTo(w - u * 0.1, by); ctx.stroke();
        for (let i = 0; i < 11; i++) { const tt = i / 10, ax = u * 0.1 + (w - u * 0.2) * tt, ay = by - u * 0.9 - Math.sin(tt * Math.PI) * (h * 0.55 - u * 0.45); bulb(ax, ay, i % 2 ? 2 : 5); }
        break;
      }
      case 'hl:cocoa': {
        ctx.fillStyle = '#8a5a3a'; ctx.fillRect(cx - u * 0.45, by - u * 0.45, u * 0.9, u * 0.42); ctx.strokeRect(cx - u * 0.45, by - u * 0.45, u * 0.9, u * 0.42);
        ctx.fillStyle = '#c83a3a'; for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#f4f0ea' : '#c83a3a'; ctx.fillRect(cx - u * 0.5 + i * u * 0.2, by - u * 0.9, u * 0.2, u * 0.16); }
        for (const s of [-1, 1]) { ctx.fillStyle = '#5a3a2a'; ctx.fillRect(cx + s * u * 0.42 - u * 0.03, by - u * 0.9, u * 0.06, u * 0.48); }
        for (let i = 0; i < 6; i++) bulb(cx - u * 0.45 + i * u * 0.18, by - u * 0.74, i);
        break;
      }
      case 'fd:mums': {
        ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.moveTo(cx - u * 0.3, by - u * 0.32); ctx.lineTo(cx + u * 0.3, by - u * 0.32); ctx.lineTo(cx + u * 0.22, by); ctx.lineTo(cx - u * 0.22, by); ctx.closePath(); ctx.fill(); ctx.stroke();
        ell(ctx, cx, by - u * 0.48, u * 0.42, u * 0.3, '#3a6a2a');
        for (let i = 0; i < 18; i++) ell(ctx, cx + (noise(i, 1) - 0.5) * u * 0.7, by - u * 0.48 + (noise(i, 2) - 0.5) * u * 0.4, u * 0.06, u * 0.06, ['#e8a020', '#c84a2a', '#f4d040'][i % 3]);
        break;
      }
      case 'fd:pumpkins': {
        ell(ctx, cx - u * 0.2, by - u * 0.18, u * 0.26, u * 0.18, '#e87a1a'); ctx.stroke();
        ell(ctx, cx + u * 0.22, by - u * 0.14, u * 0.18, u * 0.13, '#f0a030'); ctx.stroke();
        ell(ctx, cx, by - u * 0.4, u * 0.2, u * 0.15, '#d86a1a'); ctx.stroke();
        ell(ctx, cx + u * 0.3, by - u * 0.32, u * 0.08, u * 0.06, '#e8e0c0');
        for (const [ox, oy] of [[-0.2, 0.34], [0, 0.55], [0.22, 0.27]]) { ctx.fillStyle = '#4a6a2a'; ctx.fillRect(cx + ox * u - u * 0.02, by - oy * u - u * 0.04, u * 0.04, u * 0.07); }
        break;
      }
    }
  });
  return { c, ox: -w / 2, oy: -h };
}
// Lights wrapped round a tree: spirals of bulbs over its canopy, drawn on top of the tree.
export function drawWrap(ctx, x, y, u, lit, dark, t) {
  const cx = (x + 0.5) * u, top = (y - 1.3) * u, bot = (y + 0.7) * u;
  const phase = lit ? Math.floor(t / 400) : 0;
  for (let i = 0; i < 26; i++) {
    const tt = i / 26, yy = top + (bot - top) * tt, r = u * (0.25 + tt * 0.55), xx = cx + Math.sin(tt * 18) * r;
    const col = dark && i % 3 === 0 ? '#3a3a3a' : HL_COLS[(i + phase) % 6];
    if (lit && !(dark && i % 3 === 0)) ell(ctx, xx, yy, u * 0.1, u * 0.1, rgba(col, 0.3));
    ell(ctx, xx, yy, u * 0.04, u * 0.04, lit ? col : shade(col, -0.4));
  }
}

// ---------- peafowl ----------
// George (Indian blue peacock) and the peahens. mode: walk, peck, fan, roost.
export function peafowlSprite(b, u, frame) {
  const fan = b.mode === 'fan', male = b.sex === 'm';
  const k = `pf|${b.sex}|${fan ? 1 : 0}|${b.face}|${frame}|${u}`;
  const w = u * (fan ? 2.2 : 1.6), h = u * (fan ? 1.9 : 1.2);
  const c = cached(k, w, h, (ctx) => {
    if (b.face === 'left') { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const by = h - u * 0.05, bx = w * (fan ? 0.5 : 0.55);
    ctx.lineWidth = Math.max(1, u * 0.03); ctx.strokeStyle = OUT;
    if (male && fan) {
      for (let i = 0; i < 19; i++) {
        const a = Math.PI + (i / 18) * Math.PI, R = u * 0.95;
        ctx.strokeStyle = '#3a6a3a'; ctx.lineWidth = u * 0.05; ctx.beginPath(); ctx.moveTo(bx, by - u * 0.4); ctx.lineTo(bx + Math.cos(a) * R, by - u * 0.4 + Math.sin(a) * R * 0.95); ctx.stroke();
      }
      ell(ctx, bx, by - u * 0.4, u * 0.98, u * 0.9, rgba('#4a8a4a', 0.0));
      for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 9 + ring * 3; i++) {
        const a = Math.PI + ((i + 0.5) / (9 + ring * 3)) * Math.PI, R = u * (0.45 + ring * 0.25);
        const ex = bx + Math.cos(a) * R, ey = by - u * 0.4 + Math.sin(a) * R * 0.95;
        ell(ctx, ex, ey, u * 0.1, u * 0.12, '#2f7a4a'); ell(ctx, ex, ey, u * 0.065, u * 0.08, '#d8b030'); ell(ctx, ex, ey, u * 0.04, u * 0.05, '#2a4aa8'); ell(ctx, ex, ey, u * 0.02, u * 0.025, '#101830');
      }
      ctx.strokeStyle = OUT;
    } else if (male) {
      // The train trails behind, low.
      ctx.fillStyle = '#2f6a3a'; ctx.beginPath(); ctx.moveTo(bx - u * 0.1, by - u * 0.32); ctx.quadraticCurveTo(bx - u * 0.7, by - u * 0.25, bx - u * 0.95, by - u * 0.08); ctx.lineTo(bx - u * 0.9, by - u * 0.02); ctx.quadraticCurveTo(bx - u * 0.5, by - u * 0.1, bx - u * 0.05, by - u * 0.18); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { const ex = bx - u * (0.35 + i * 0.16), ey = by - u * (0.19 - i * 0.03); ell(ctx, ex, ey, u * 0.04, u * 0.03, '#d8b030'); ell(ctx, ex, ey, u * 0.02, u * 0.015, '#2a4aa8'); }
    } else {
      ctx.fillStyle = '#8a7a62'; ctx.beginPath(); ctx.moveTo(bx - u * 0.1, by - u * 0.3); ctx.lineTo(bx - u * 0.45, by - u * 0.22); ctx.lineTo(bx - u * 0.1, by - u * 0.16); ctx.fill(); ctx.stroke();
    }
    // Body, neck and head.
    const body = male ? '#1f4ab0' : '#9a8a72', neck = male ? '#2a5ac8' : '#5a8a6a';
    const peck = b.mode === 'peck' && frame % 2 === 1;
    for (const lx of [-0.06, 0.06]) { ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = u * 0.03; ctx.beginPath(); ctx.moveTo(bx + lx * u, by - u * 0.2); ctx.lineTo(bx + lx * u + (b.mode === 'walk' ? (frame % 2 ? 0.05 : -0.05) * u : 0), by); ctx.stroke(); }
    ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, u * 0.03);
    ell(ctx, bx, by - u * 0.32, u * 0.2, u * 0.15, body); ctx.stroke();
    const hx = bx + u * (peck ? 0.3 : 0.16), hy = by - u * (peck ? 0.22 : 0.68);
    ctx.strokeStyle = neck; ctx.lineWidth = u * 0.08; ctx.beginPath(); ctx.moveTo(bx + u * 0.1, by - u * 0.38); ctx.quadraticCurveTo(bx + u * 0.18, by - u * 0.5, hx, hy); ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, u * 0.03);
    ell(ctx, hx, hy, u * 0.07, u * 0.06, neck); ctx.stroke();
    ell(ctx, hx + u * 0.03, hy - u * 0.01, u * 0.015, u * 0.015, '#ffffff');
    poly(ctx, [[hx + u * 0.06, hy], [hx + u * 0.13, hy + u * 0.02], [hx + u * 0.06, hy + u * 0.03]], '#c8b088');
    for (let i = -1; i <= 1; i++) { ctx.strokeStyle = neck; ctx.lineWidth = Math.max(1, u * 0.012); ctx.beginPath(); ctx.moveTo(hx, hy - u * 0.05); ctx.lineTo(hx + i * u * 0.04, hy - u * 0.15); ctx.stroke(); ell(ctx, hx + i * u * 0.04, hy - u * 0.16, u * 0.018, u * 0.018, neck); }
  });
  return { c, ox: -w * (fan ? 0.5 : 0.55), oy: -h };
}
