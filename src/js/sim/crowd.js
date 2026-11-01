// Visitors and the peafowl. Both draw from their own random stream (S.crs), never the running one, so the rest
// of the simulation replays the same for a seed whatever the crowd does.
import * as D from './data.js';
import { W, H, G, ZONES, isWater } from './world.js';
import { rnd, ri, pick, chance } from './rng.js';
import { key, ground, blocked, zoneAt, toast, sound, emit, placeOf } from './core.js';
import { doy, season, hours, isOpen } from './calendar.js';
import { zoneStats } from './garden.js';

const MAX_VISITORS = 26;
const V_SPEED = 2.1 / 60;
// Visitor looks: built from shirt, hair and skin choices (no new art needed).
const SHIRTS = ['#c84a3a', '#3a6aa8', '#e8b030', '#4a8a5a', '#a85a9a', '#f4f0ea', '#2a3a5a', '#e87a5a', '#6a5ac8', '#5ab8b0'];
const PANTS = ['#2a2a33', '#3a4a6a', '#5a4a3a', '#8a8070', '#1f2f5c'];
const HAIR = ['#2a2420', '#5a3a22', '#c8a060', '#8a8078', '#1f1a16', '#a8502a'];
const HATS = ['none', 'none', 'none', 'cap', 'brim'];
export function visitorLook(n) {
  const h = (k) => ((n * 2654435761 + k * 40503) >>> 0) % 1000;
  return { shirt: SHIRTS[h(1) % SHIRTS.length], pants: PANTS[h(2) % PANTS.length], hair: HAIR[h(3) % HAIR.length], skin: h(4) % 5, hat: HATS[h(5) % HATS.length], dress: h(6) % 3 === 0, glasses: h(7) % 5 === 0 };
}

// Expected visitors today (game scale, not real attendance).
export function attendance(S) {
  const d = doy(S), h = hours(S);
  if (h.mode === 'closed') return 0;
  let n = { sp: 34, su: 18, fa: 22, wi: 14 }[season(S)];
  if (D.inEvent('tulips', d)) n = 46;
  if (D.inEvent('azaleas', d)) n = Math.max(n, 40);
  if (D.inEvent('fallColor', d)) n = 34;
  if (D.inEvent('celebrateFall', d)) n = 60;
  if (h.mode === 'lights') n = 52;
  if (S.weather === 'rain' || S.weather === 'storm') n *= 0.45;
  if (S.weather === 'heat') n *= 0.75;
  if (S.weather === 'snow' || S.weather === 'ice') n *= 0.3;
  if (S.day % 7 >= 5) n *= 1.3;
  return Math.round(n);
}

export function crowdTick(gm) {
  const S = gm.S;
  const h = hours(S);
  // Spawning: once a game minute, a chance spread over the opening hours.
  if (S.tick === 0 && h.mode !== 'closed' && S.time >= h.open && S.time < h.close - 60 && S.visitors.length < MAX_VISITORS) {
    const per = S.attend / Math.max(60, h.close - 60 - h.open);
    if (rnd(S.crs) < per) spawn(gm, h.mode);
  }
  const z = S.visitors.length ? zoneStats(gm) : null;
  for (let i = S.visitors.length - 1; i >= 0; i--) {
    const v = S.visitors[i];
    if (stepVisitor(gm, v, z)) { finish(gm, v); S.visitors.splice(i, 1); }
  }
  // After closing, the stragglers leave quickly.
  if (h.mode !== 'closed' && S.time >= h.close + 30) for (const v of S.visitors) v.sp = V_SPEED * 2.5;
  peafowlTick(gm);
}
function spawn(gm, mode) {
  const S = gm.S;
  const route = mode === 'lights' ? 'lights' : rnd(S.crs) < 0.6 ? 'loop' : 'short';
  const pts = gm.world.routes[route];
  const o = 0.4 + rnd(S.crs) * 1.2;
  const id = ++S.vseq;
  S.visitors.push({ id, route, i: 1, x: pts[0][0] + o, y: pts[0][1] + o, o, sp: V_SPEED * (0.8 + rnd(S.crs) * 0.4), stop: 0, face: 'left', dog: mode === 'day' && rnd(S.crs) < 0.12, sat: 0, n: 0, saw: 0, emote: null, emoteT: 0 });
}
function stepVisitor(gm, v, z) {
  const S = gm.S, pts = gm.world.routes[v.route];
  if (v.emoteT > 0) v.emoteT--;
  if (v.stop > 0) { v.stop--; v.moving = false; return false; }
  const [px, py] = pts[v.i];
  const tx = px + v.o, ty = py + v.o;
  const dx = tx - v.x, dy = ty - v.y, dist = Math.hypot(dx, dy);
  if (dist <= v.sp) {
    v.x = tx; v.y = ty; v.i++;
    if (v.i >= pts.length) return true;
    if (rnd(S.crs) < 0.22) v.stop = ri(S.crs, 60, 300); // stop to look
  } else { v.x += dx / dist * v.sp; v.y += dy / dist * v.sp; v.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  v.moving = true;
  // Once a game minute: judge the surroundings, maybe drop litter, notice a peafowl.
  if (S.tick === (v.id % 12)) {
    const tx0 = Math.floor(v.x), ty0 = Math.floor(v.y - 0.1);
    const zi = gm.world.zone[ty0 * W + tx0];
    const s = z[zi];
    let score = s.score;
    if (ZONES[zi].id === 'parking') score = Math.max(score, 70);
    const d = doy(S);
    if (D.inEvent('lights', d)) score = Math.round(score * 0.5 + lightsScore(gm) * 0.5);
    else if (D.inEvent('fallShow', d) || D.inEvent('tulips', d)) score = Math.min(100, score + 5);
    v.sat += score; v.n++;
    if (rnd(S.crs) < 0.006) dropLitter(gm, tx0, ty0, 'litter');
    if (v.dog && rnd(S.crs) < 0.006) dropLitter(gm, tx0 + (rnd(S.crs) < 0.5 ? 1 : -1), ty0, 'dog');
    if (!v.saw) for (const b of S.peafowl) if (Math.hypot(b.x - v.x, b.y - v.y) < 3.2 && b.mode !== 'roost') { v.saw = 1; v.emote = '♥'; v.emoteT = 120; break; }
    if (!v.emoteT && score < 45 && rnd(S.crs) < 0.08) { v.emote = '…'; v.emoteT = 100; }
    else if (!v.emoteT && score > 88 && rnd(S.crs) < 0.05) { v.emote = '✿'; v.emoteT = 100; }
  }
  return false;
}
function dropLitter(gm, x, y, kind) {
  const S = gm.S, k = key(x, y);
  if (S.litter[k] || blocked(gm, x, y) || isWater(ground(gm, x, y))) return;
  S.litter[k] = kind;
}
function finish(gm, v) {
  const S = gm.S;
  if (!v.n) return;
  const avg = v.sat / v.n + (v.saw ? 8 : 0);
  S.rate.sum += Math.min(100, avg); S.rate.n++;
}
function lightsScore(gm) {
  const S = gm.S;
  let total = 0, ok = 0;
  for (const m of gm.world.markers) if (m.show === 'hl') { total++; if (S.disp[m.id] && S.disp[m.id].st === 'ok') ok++; }
  return total ? Math.round(ok / total * 100) : 0;
}
// End of the day: the Garden Rating (0-5) from today's visitors, plus orders.
export function dayRating(gm) {
  const S = gm.S;
  if (!S.rate.n) return null;
  const base = S.rate.sum / S.rate.n;
  return Math.max(0, Math.min(5, Math.round((base / 20 + S.rateBonus / 40) * 10) / 10));
}

// ---------- peafowl ----------
export function peafowlTick(gm) {
  const S = gm.S;
  if (S.tick % 3) return;
  const night = S.time >= 1170 || S.time < 400;
  for (const b of S.peafowl) {
    if (b.t > 0) b.t--;
    if (night) { toRoost(gm, b); continue; }
    if (b.mode === 'roost') { b.mode = 'peck'; b.t = 30; b.x = b.rx + 0.5; b.y = b.ry + 1.85; }
    if (b.flee) { b.flee = false; const h = placeOf(gm, b.home); b.tx = h.x + 0.5; b.ty = h.y + 0.9; b.mode = 'walk'; }
    if (b.mode === 'walk') { if (walk(gm, b, 0.05)) { b.mode = 'peck'; b.t = ri(S.crs, 40, 160); } continue; }
    if (b.t > 0) continue;
    // Choose the next thing to do.
    const n = rnd(S.crs);
    const sea = season(S);
    if (b.sex === 'm' && (sea === 'sp' || sea === 'su') && n < 0.14 && nearVisitors(S, b)) { b.mode = 'fan'; b.t = ri(S.crs, 90, 200); if (rnd(S.crs) < 0.5) emit(gm, 'sound', { id: 'peacock', x: b.x, y: b.y }); continue; }
    if (n < 0.5) { b.mode = 'peck'; b.t = ri(S.crs, 40, 140); continue; }
    const home = placeOf(gm, b.home);
    const far = rnd(S.crs) < 0.18;
    const R = far ? 16 : 6;
    for (let i = 0; i < 12; i++) {
      const tx = home.x + ri(S.crs, -R, R), ty = home.y + ri(S.crs, -R, R);
      if (blocked(gm, tx, ty) || isWater(ground(gm, tx, ty))) continue;
      b.tx = tx + 0.5; b.ty = ty + 0.9; b.mode = 'walk'; break;
    }
    if (rnd(S.crs) < 0.04) emit(gm, 'sound', { id: 'peacock', x: b.x, y: b.y });
  }
  // A bird in a tulip bed (planted, during winter or spring) needs shooing out.
  const out = {};
  for (const b of S.peafowl) {
    if (b.mode === 'roost') continue;
    const k = key(Math.floor(b.x), Math.floor(b.y - 0.1));
    if (S.beds[k] && S.beds[k].p === 'tulip') out[b.id] = true;
  }
  for (const id of Object.keys(out)) if (!S.peafowlInBeds[id]) { S.peafowlInBeds[id] = true; S.orders.push({ id: 'peafowl:' + id + S.time, type: 'peafowl', zone: null, n: 1, prog: 0, done: false, pay: 6, title: `Shoo ${id === 'george' ? 'George' : 'a peahen'} out of the tulip beds`, unit: 'bird', bird: id }); toast(gm, `${id === 'george' ? 'George is' : 'A peahen is'} scratching in the tulip beds!`, 'warn'); }
}
function nearVisitors(S, b) { return S.visitors.some((v) => Math.hypot(v.x - b.x, v.y - b.y) < 4); }
// Straight-line walking with sliding collision. Returns true on arrival (or when stuck).
function walk(gm, b, sp) {
  const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
  if (d < sp) { b.x = b.tx; b.y = b.ty; return true; }
  const vx = dx / d * sp, vy = dy / d * sp;
  b.face = dx >= 0 ? 'right' : 'left';
  const free = (x, y) => !blocked(gm, Math.floor(x), Math.floor(y - 0.1)) && !isWater(ground(gm, Math.floor(x), Math.floor(y - 0.1)));
  let moved = false;
  if (free(b.x + vx, b.y)) { b.x += vx; moved = true; }
  if (free(b.x, b.y + vy)) { b.y += vy; moved = true; }
  if (!moved) { b.stuck = (b.stuck || 0) + 1; if (b.stuck > 20) { b.stuck = 0; return true; } }
  return false;
}
// Peafowl roost in trees at night: walk to the roost tree near home, then sit up in it.
function toRoost(gm, b) {
  if (b.mode === 'roost') return;
  if (b.mode !== 'toRoost') { b.mode = 'toRoost'; b.tx = b.rx + 0.5; b.ty = b.ry + 1.85; }
  if (walk(gm, b, 0.06) || Math.hypot(b.tx - b.x, b.ty - b.y) < 0.6) { b.mode = 'roost'; }
}
export function newPeafowl(gm) {
  const S = gm.S;
  return D.PEAFOWL.map((p) => {
    const h = placeOf(gm, p.home);
    // The nearest tree to home is the roost.
    let best = null, bd = 1e9;
    for (const [k, o] of Object.entries(S.objs)) if (o.t === 'tree') { const [x, y] = k.split(',').map(Number); const dd = Math.hypot(x - h.x, y - h.y); if (dd < bd && !blocked(gm, x, y + 1) && !isWater(ground(gm, x, y + 1))) { bd = dd; best = [x, y]; } }
    const [rx, ry] = best || [h.x, h.y - 1];
    return { id: p.id, name: p.name, sex: p.sex, home: p.home, x: h.x + 0.5, y: h.y + 0.9, tx: h.x + 0.5, ty: h.y + 0.9, mode: 'peck', t: 20, face: 'left', rx, ry };
  });
}
export function peafowlAt(gm, x, y) {
  for (const b of gm.S.peafowl) if (b.mode !== 'roost' && Math.abs(b.x - (x + 0.5)) < 0.8 && Math.abs(b.y - 0.4 - (y + 0.5)) < 0.8) return b;
  return null;
}
