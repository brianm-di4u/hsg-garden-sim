// Upkeep: plant states through the year, what piles up overnight (weeds, leaves, grass, storm limbs, stale mulch,
// thirsty plants), the care actions that fix it, and each zone's condition score.
import * as D from './data.js';
import { W, H, G, ZONES, ZONE_INDEX, isWalkway, isWater, tulipDesign } from './world.js';
import { stream, rnd, ri, chance, pick } from './rng.js';
import { key, unkey, ground, zoneAt, objAt, blocked, toast, sound, emit } from './core.js';
import { doy, season, yearNo } from './calendar.js';

// ---------- plant states ----------
// { bloom: colour | null, leaf: colour, bare, fall } for drawing and scoring.
export function plantLook(o, d, year) {
  const P = D.PLANTS[o.k];
  if (!P) return { leaf: '#3a6a30' };
  const bloomOn = (P.bloom && D.inWindow(P.bloom, d)) || (P.bloom2 && D.inWindow(P.bloom2, d));
  const bare = P.bare ? D.inWindow(P.bare, d) : (P.size === 'low' && !P.ever && season({ day: d }) === 'wi' && o.k !== 'daffodil');
  const fall = P.color ? D.inWindow(P.color, d) : (P.drops && season({ day: d }) === 'fa' && (d % 28) > 16);
  const sick = (o.hp ?? 100) < 40;
  const col = P.col ? P.col[(o.c || 0) % P.col.length] : null;
  let leaf = P.leaf;
  if (fall && P.fallLeaf) leaf = P.fallLeaf;
  if (o.k === 'fern' && season({ day: d }) === 'wi') leaf = P.fallLeaf;
  if (o.k === 'daffodil' && !bloomOn && !D.inWindow([D.yd('wi', 12), D.yd('sp', 14)], d)) return { leaf, bare: true, hidden: true };
  return { bloom: bloomOn && !sick && !bare ? col : null, leaf, bare, fall, sick, shaggy: year != null && P.size !== 'tree' && needsPrune(o, d, year) };
}
export const inBloom = (o, d) => !!plantLook(o, d).bloom;
// Pruning is due inside the plant's window if it has not been pruned this year.
export function needsPrune(o, d, year) {
  const P = D.PLANTS[o.k];
  if (!P || !P.prune || o.t === 'tree' && o.k !== 'jmaple') return false;
  if (!D.inWindow(P.prune, d)) return false;
  return o.pr !== year;
}

// ---------- bed plantings (tulips, annuals) ----------
// S.beds[k] = { p: 'tulip', c: colour key, ok: matches design, dmg: freeze-burnt } | { p: 'annual', c } | { p: 'spent' }
export function bedLook(S, b, d) {
  if (!b) return null;
  if (b.p === 'tulip') {
    const up = D.inWindow([D.yd('wi', 20), D.yd('sp', 14)], d), blooming = D.inWindow(D.BEDS.tulip.bloom, d);
    if (D.inWindow([D.yd('sp', 15), D.yd('sp', 28)], d)) return { stage: 'spent' };
    return { stage: blooming ? (b.dmg ? 'burnt' : 'bloom') : up ? 'leaf' : 'bulb', col: D.TULIP_COLORS[b.c] };
  }
  if (b.p === 'annual') {
    const tired = D.inWindow([D.yd('fa', 20), D.yd('wi', 10)], d);
    return { stage: tired ? 'tired' : (b.dry ? 'dry' : 'bloom'), col: D.BEDS.annual.col[(b.c || 0) % 4] };
  }
  return null;
}

// ---------- zone condition ----------
// Penalties per zone from the sparse maps, scaled by the zone's walkable size. Cached per game hour.
export function zoneStats(gm) {
  const S = gm.S;
  const stamp = S.day * 100 + Math.floor(S.time / 60) + (gm.statsBump || 0);
  if (gm.zcache && gm.zcache.stamp === stamp) return gm.zcache.z;
  const z = ZONES.map(() => ({ litter: 0, weeds: 0, leaves: 0, limbs: 0, stale: 0, dry: 0, grass: 0, shaggy: 0, bloom: 0, plants: 0, dark: 0 }));
  const zi = (k) => { const [x, y] = unkey(k); return gm.world.zone[y * W + x]; };
  for (const k of Object.keys(S.litter)) z[zi(k)].litter++;
  for (const [k, v] of Object.entries(S.weeds)) z[zi(k)].weeds += v;
  for (const [k, v] of Object.entries(S.leaves)) { const [x, y] = unkey(k); z[zi(k)].leaves += v * (isWalkway(ground(gm, x, y)) ? 1 : 0.25); }
  for (const [k, v] of Object.entries(S.grass)) if (v >= 2) z[zi(k)].grass += v - 1;
  const d = doy(S), yr = yearNo(S);
  for (const k of gm.bedTiles) { const age = S.day - (S.mulch[k] ?? -999); if (age > 60) z[zi(k)].stale++; }
  for (const [k, o] of Object.entries(S.objs)) {
    if (o.t === 'limb') { z[zi(k)].limbs++; continue; }
    if (o.t !== 'plant' && o.t !== 'tree') continue;
    const P = D.PLANTS[o.k]; if (!P || P.invasive) continue;
    const s = z[zi(k)];
    s.plants++;
    if ((o.hp ?? 100) < 50) s.dry++;
    if (P.size !== 'tree' && needsPrune(o, d, yr)) s.shaggy++;
    if (plantLook(o, d).bloom) s.bloom++;
  }
  for (const [k, b] of Object.entries(S.beds)) { const L = bedLook(S, b, d); if (L && (L.stage === 'bloom')) z[zi(k)].bloom += 1.5; if (L && (L.stage === 'spent' || L.stage === 'tired' || L.stage === 'burnt' || L.stage === 'dry')) z[zi(k)].stale += 1; }
  for (const [id, st] of Object.entries(S.disp)) if (st && st.st === 'dark') { const m = gm.markerById[id]; if (m) z[gm.world.zone[m.y * W + m.x]].dark++; }
  ZONES.forEach((Z, i) => {
    const s = z[i], size = Math.max(1, (gm.zoneSize[i] || 200) / 220);
    const pen = (s.litter * 7 + s.weeds * 1.6 + s.leaves * 1.1 + s.limbs * 9 + s.stale * 0.8 + s.dry * 3 + s.grass * 0.7 + s.shaggy * 1.2 + s.dark * 6) / size;
    s.tidy = Math.max(0, Math.round(100 - pen));
    s.bloomScore = Math.min(100, Math.round(s.bloom / Math.max(4, s.plants * 0.25) * 100));
    s.score = Math.round(s.tidy * 0.75 + s.bloomScore * 0.25);
  });
  gm.zcache = { stamp, z };
  return z;
}
export const touchStats = (gm) => { gm.statsBump = ((gm.statsBump || 0) + 1) % 1000; };

// ---------- overnight ----------
// What changes in the garden between one day and the next. `r` streams are seeded by day, so the garden changes
// the same way for the same seed.
export function overnight(gm, sum) {
  const S = gm.S, d = doy(S), sea = season(S), seed = S.seed, day = S.day;
  const wx = S.weather;
  // Weeds in beds (not in winter).
  const rw = stream(seed, 'weeds', day);
  const weedRate = { sp: 0.05, su: 0.06, fa: 0.03, wi: 0.004 }[sea];
  for (const k of gm.bedTiles) {
    if (rnd(rw) < weedRate) S.weeds[k] = Math.min(3, (S.weeds[k] || 0) + 1);
  }
  // Grass grows on lawns in the growing season.
  if (sea === 'sp' || sea === 'su' || (sea === 'fa' && (d % 28) < 14)) {
    const rg = stream(seed, 'grass', day);
    for (const k of gm.lawnTiles) if (rnd(rg) < 0.35) S.grass[k] = Math.min(3, (S.grass[k] || 0) + 1);
  }
  // Leaves: deciduous trees drop in fall and early winter; a few needles and twigs the rest of the year.
  const rl = stream(seed, 'leaves', day);
  const leafSeason = D.inWindow([D.yd('fa', 16), D.yd('wi', 14)], d);
  for (const [k, o] of Object.entries(S.objs)) {
    if (o.t !== 'tree') continue;
    const P = D.PLANTS[o.k] || {};
    const p = leafSeason && P.drops ? 0.55 : 0.03;
    if (rnd(rl) >= p) continue;
    const [x, y] = unkey(k);
    for (let i = 0; i < (leafSeason && P.drops ? 2 : 1); i++) {
      const tx = x + ri(rl, -2, 2), ty = y + ri(rl, -1, 2);
      const g = ground(gm, tx, ty);
      if (g === G.DEEP || g === G.WATER || g === G.STREAM || g === G.ROCK || g === G.GORGE || gm.bmap[ty * W + tx] >= 0) continue;
      if (g === G.FOREST) continue; // the woods keep their leaf litter
      if (g === G.GRASS && rnd(rl) < 0.6) continue;
      const kk = key(tx, ty);
      S.leaves[kk] = Math.min(3, (S.leaves[kk] || 0) + 1);
    }
  }
  // Leaves on open grass break down; volunteers and the rest of the crew handle part of the day's mess
  // (game: the player is one of several hands on the grounds).
  const rv = stream(seed, 'crew', 'tidy', day);
  for (const [k, v] of Object.entries(S.leaves)) {
    const [x, y] = unkey(k), gg = ground(gm, x, y);
    if ((gg === G.GRASS || gg === G.SAND) && rnd(rv) < 0.25) { if (v > 1) S.leaves[k] = v - 1; else delete S.leaves[k]; }
    else if (rnd(rv) < 0.08) delete S.leaves[k];
  }
  for (const k of Object.keys(S.litter)) if (rnd(rv) < 0.35) delete S.litter[k];
  for (const k of Object.keys(S.weeds)) if (rnd(rv) < 0.12) delete S.weeds[k];
  for (const k of Object.keys(S.grass)) if (S.grass[k] >= 3 && rnd(rv) < 0.2) delete S.grass[k];
  // The crew clears beds you didn't get to once their season is over.
  if (d === D.yd('sp', 28)) for (const [k, b] of Object.entries(S.beds)) if (b.p === 'tulip') { delete S.beds[k]; sum.crewBeds = (sum.crewBeds || 0) + 1; }
  if (d === D.yd('fa', 28)) for (const [k, b] of Object.entries(S.beds)) if (b.p === 'annual') { delete S.beds[k]; sum.crewBeds = (sum.crewBeds || 0) + 1; }
  // Wind blows a little litter around even when nobody is here.
  if (wx === 'storm' || wx === 'ice') {
    const rs = stream(seed, 'storm', day);
    const n = ri(rs, wx === 'ice' ? 8 : 5, wx === 'ice' ? 16 : 11);
    const trees = Object.keys(S.objs).filter((k) => S.objs[k].t === 'tree' && zoneAt(gm, ...unkey(k)).visitor);
    let made = 0;
    for (let i = 0; i < 300 && made < n; i++) {
      const [x, y] = unkey(pick(rs, trees));
      const tx = x + ri(rs, -2, 2), ty = y + ri(rs, -2, 2), kk = key(tx, ty);
      if (S.objs[kk] || gm.fixed[kk] || blocked(gm, tx, ty) || gm.markerMap[kk]) continue;
      const g = ground(gm, tx, ty);
      if (g === G.BED || g === G.WATER) continue;
      S.objs[kk] = { t: 'limb', hp: wx === 'ice' ? 3 : 2 }; made++;
    }
    sum.storm = made;
    gm.navVersion++;
  }
  // Thirst: in summer heat, thirsty plants not watered (and no rain) lose health; watered ones recover.
  const hot = sea === 'su' || (sea === 'sp' && (d % 28) > 20) || (sea === 'fa' && (d % 28) < 6);
  const rained = wx === 'rain' || wx === 'storm';
  for (const [k, o] of Object.entries(S.objs)) {
    if (o.t !== 'plant') continue;
    const P = D.PLANTS[o.k];
    if (!P || P.invasive) continue;
    const thirsty = P.thirsty && (hot || o.k === 'bonsai');
    if (S.watered[k] || rained) o.hp = Math.min(100, (o.hp ?? 80) + 8);
    else if (thirsty) { o.hp = Math.max(10, (o.hp ?? 80) - (o.k === 'bonsai' ? 9 : 6)); if (o.hp < 40) sum.wilting = (sum.wilting || 0) + 1; }
    else o.hp = Math.min(100, (o.hp ?? 80) + 2);
  }
  for (const [k, b] of Object.entries(S.beds)) if (b.p === 'annual' && hot) b.dry = !(S.watered[k] || rained);
  S.watered = {};
  // Invasive privet creeps back along the woodland edges (about weekly).
  if (day % 6 === 0) {
    const rp = stream(seed, 'privet', day);
    for (let i = 0, tries = 0; i < 2 && tries < 200; tries++) {
      const x = ri(rp, 6, 98), y = ri(rp, 6, 84), kk = key(x, y);
      if (ground(gm, x, y) !== G.FOREST || S.objs[kk] || gm.fixed[kk]) continue;
      S.objs[kk] = { t: 'plant', k: 'privet', c: 0, hp: 100 }; i++;
    }
    gm.navVersion++;
  }
  // Freeze tonight burns uncovered tulip blooms.
  if (S.freezeTonight) {
    let burnt = 0;
    for (const [k, b] of Object.entries(S.beds)) if (b.p === 'tulip' && !S.covered[k] && D.inWindow([D.yd('wi', 20), D.yd('sp', 14)], d)) { if (!b.dmg) burnt++; b.dmg = 1; }
    sum.freeze = { burnt, covered: Object.keys(S.covered).length };
  }
  S.covered = {};
  S.freezeTonight = false;
  touchStats(gm);
}

// The day's weather, rolled in the morning: rain, storm, fog, heat, snow, ice; and whether a hard freeze is
// forecast for tonight (late winter and early spring, when the tulips are up).
export function rollWeather(gm, first) {
  const S = gm.S, d = doy(S), sea = season(S);
  const r = stream(S.seed, 'wx', S.day);
  let wx = 'clear';
  if (!first) {
    const p = { sp: 0.3, su: 0.2, fa: 0.22, wi: 0.24 }[sea];
    const n = rnd(r);
    if (n < p) wx = sea === 'wi' ? (rnd(r) < 0.18 ? 'snow' : rnd(r) < 0.15 ? 'ice' : 'rain') : rnd(r) < 0.18 ? 'storm' : 'rain';
    else if ((sea === 'sp' || sea === 'fa') && rnd(r) < 0.25) wx = 'fog';
    else if (sea === 'su' && rnd(r) < 0.35) wx = 'heat';
  }
  S.weather = wx;
  S.freezeTonight = !first && D.inWindow([D.yd('wi', 20), D.yd('sp', 10)], d) && rnd(r) < 0.14;
}

// ---------- care actions ----------
// Each returns { done, fx, n } or a toast-and-none. `record(type, zoneId, n)` advances matching work orders.
export function careAt(gm, x, y, tool, record) {
  const S = gm.S, k = key(x, y), g = ground(gm, x, y), z = zoneAt(gm, x, y), tier = S.tier || 1;
  const o = S.objs[k];
  switch (tool) {
    case 'grabber': {
      if (!S.litter[k]) return null;
      const kind = S.litter[k]; delete S.litter[k];
      S.stats.litter++; record('litter', z.id, 1); touchStats(gm);
      sound(gm, 'pickup');
      return { done: true, fx: 'pick', pop: kind === 'dog' ? null : 'litter' };
    }
    case 'trowel': {
      if (S.weeds[k]) { delete S.weeds[k]; record('weed', z.id, 1); touchStats(gm); sound(gm, 'till'); return { done: true, fx: 'dirt', energy: 'trowel' }; }
      const b = S.beds[k], L = bedLook(S, b, doy(S));
      if (L && (L.stage === 'spent' || L.stage === 'burnt' && D.inWindow([D.yd('sp', 15), D.yd('sp', 28)], doy(S)))) { delete S.beds[k]; record('pullBulbs', z.id, 1); touchStats(gm); sound(gm, 'till'); return { done: true, fx: 'dirt', energy: 'trowel' }; }
      if (L && (L.stage === 'tired')) { delete S.beds[k]; record('pullAnnuals', z.id, 1); touchStats(gm); sound(gm, 'till'); return { done: true, fx: 'dirt', energy: 'trowel' }; }
      if (o && o.t === 'plant' && o.k === 'privet') { toast(gm, 'Privet roots are too tough for a trowel. Use the saw.'); return { none: true }; }
      return null;
    }
    case 'rake': {
      const tiles = tier >= 2 ? lineTiles(S, x, y) : [[x, y]];
      let n = 0;
      for (const [tx, ty] of tiles) {
        const kk = key(tx, ty);
        if (!S.leaves[kk]) continue;
        const gg = ground(gm, tx, ty);
        if (gg === G.POND) record('koi', 'pinewind', 1);
        else if (gg === G.RAIL) record('track', 'cafe', 1);
        else record('rake', zoneAt(gm, tx, ty).id, 1);
        delete S.leaves[kk]; n++;
      }
      if (!n) return null;
      touchStats(gm); sound(gm, 'swish');
      return { done: true, fx: 'leaf', energy: 'rake' };
    }
    case 'mower': {
      if (g !== G.LAWN) return null;
      const tiles = tier >= 2 ? [[x, y], ...sideTiles(S, x, y)] : [[x, y]];
      let n = 0;
      for (const [tx, ty] of tiles) { const kk = key(tx, ty); if (ground(gm, tx, ty) === G.LAWN && S.grass[kk]) { delete S.grass[kk]; record('mow', zoneAt(gm, tx, ty).id, 1); n++; } }
      if (!n) { toast(gm, 'That lawn is already mown.'); return { none: true }; }
      touchStats(gm); sound(gm, 'mow');
      return { done: true, fx: 'grass', energy: 'mower' };
    }
    case 'can': {
      if (isWater(g)) { S.can = D.CAN_CAP[tier]; sound(gm, 'splash'); toast(gm, `${tier >= 2 ? 'Hose reel' : 'Can'} filled.`); return { done: true }; }
      const plantHere = o && o.t === 'plant' && D.PLANTS[o.k] && D.PLANTS[o.k].thirsty;
      const annual = S.beds[k] && S.beds[k].p === 'annual';
      if (!plantHere && !annual) return null;
      if (S.watered[k]) { toast(gm, 'Already watered today.'); return { none: true }; }
      if (S.can <= 0) { toast(gm, 'Empty. Refill at any pond, stream or the lake.', 'warn'); return { none: true }; }
      S.can--; S.watered[k] = 1;
      if (annual) S.beds[k].dry = false;
      if (plantHere) o.hp = Math.min(100, (o.hp ?? 80) + 10);
      record(o && o.k === 'bonsai' ? 'bonsai' : 'water', z.id, 1); touchStats(gm);
      sound(gm, 'water');
      return { done: true, fx: 'water', energy: 'can' };
    }
    case 'pruners': {
      if (!o || (o.t !== 'plant' && !(o.t === 'tree' && o.k === 'jmaple'))) return null;
      const P = D.PLANTS[o.k];
      if (!P.prune) { toast(gm, `${P.name}s don't need pruning.`); return { none: true }; }
      if (!D.inWindow(P.prune, doy(S))) { toast(gm, `Not now: prune ${P.name.toLowerCase()}s ${pruneWhen(P)}.`); return { none: true }; }
      if (o.pr === yearNo(S)) { toast(gm, 'Already pruned this year.'); return { none: true }; }
      o.pr = yearNo(S); o.pry = yearNo(S);
      record('prune', z.id, 1); touchStats(gm); sound(gm, 'snip');
      return { done: true, fx: 'leaf', energy: 'pruners' };
    }
    case 'saw': {
      if (!o) return null;
      if (o.t === 'limb' || (o.t === 'plant' && o.k === 'privet')) {
        o.hp = (o.hp ?? 2) - (tier >= 2 ? 2 : 1); sound(gm, 'chop');
        if (o.hp <= 0) { delete S.objs[k]; gm.navVersion++; record(o.t === 'limb' ? 'debris' : 'invasive', z.id, 1); touchStats(gm); if (o.t === 'limb') S.stats.limbs++; }
        return { done: true, fx: 'chip', energy: 'saw' };
      }
      if (o.t === 'tree' || o.t === 'plant') { toast(gm, 'The garden\'s plants stay. Only storm debris and invasive privet come out.'); return { none: true }; }
      return null;
    }
  }
  return null;
}
const pruneWhen = (P) => `in ${D.SEASON_NAME[D.SEASONS[Math.floor(P.prune[0] / 28)]].toLowerCase()}`;
function lineTiles(S, x, y) {
  const f = S.player.face, dx = f === 'left' ? -1 : f === 'right' ? 1 : 0, dy = f === 'up' ? -1 : f === 'down' ? 1 : 0;
  return [0, 1, 2].map((i) => [x + dx * i, y + dy * i]);
}
function sideTiles(S, x, y) {
  const f = S.player.face;
  return f === 'up' || f === 'down' ? [[x - 1, y], [x + 1, y]] : [[x, y - 1], [x, y + 1]];
}

// Material used on a tile: pine straw, bulbs, annuals, frost cloth.
export function materialAt(gm, x, y, id, record) {
  const S = gm.S, k = key(x, y), g = ground(gm, x, y), z = zoneAt(gm, x, y), d = doy(S);
  const bed = gm.bedMap[k];
  if (id === 'straw') {
    if (g !== G.BED) { toast(gm, 'Pine straw goes on the planting beds.'); return { none: true }; }
    if (S.day - (S.mulch[k] ?? -999) < 20) { toast(gm, 'That bed was mulched recently.'); return { none: true }; }
    S.mulch[k] = S.day; record('mulch', z.id, 1); touchStats(gm);
    return { used: true, fx: 'straw', energy: 'place' };
  }
  if (id.startsWith('bulb:')) {
    if (!bed) { toast(gm, 'Tulips go in the display beds (the marked string-line beds).'); return { none: true }; }
    if (!D.inWindow([D.yd('wi', 1), D.yd('wi', 19)], d)) { toast(gm, 'Tulips are planted in December and January, while the garden is closed.', 'warn'); return { none: true }; }
    if (S.beds[k]) { toast(gm, 'Something is already planted there.'); return { none: true }; }
    if (S.weeds[k]) { toast(gm, 'Weed the bed first.'); return { none: true }; }
    const c = id.slice(5), want = tulipDesign(bed, x, y, yearNo(S));
    S.beds[k] = { p: 'tulip', c, ok: c === want };
    S.stats.bulbs++;
    record('plantBulbs', z.id, 1); touchStats(gm);
    if (c !== want) toast(gm, `That tile is marked for ${want} in this year's design.`, 'warn');
    return { used: true, fx: 'dirt', energy: 'trowel' };
  }
  if (id === 'annuals') {
    if (!bed) { toast(gm, 'Annuals go in the display beds.'); return { none: true }; }
    if (!D.inWindow([D.yd('sp', 15), D.yd('su', 20)], d)) { toast(gm, 'Summer annuals go in after the tulips come out (late spring).'); return { none: true }; }
    if (S.beds[k]) { toast(gm, bedLook(S, S.beds[k], d).stage === 'spent' ? 'Pull the spent tulips first (trowel).' : 'Something is already planted there.'); return { none: true }; }
    S.beds[k] = { p: 'annual', c: (x * 7 + y * 3) % 4 };
    record('plantAnnuals', z.id, 1); touchStats(gm);
    return { used: true, fx: 'dirt', energy: 'trowel' };
  }
  if (id === 'cloth') {
    const b = S.beds[k];
    if (!b || b.p !== 'tulip') { toast(gm, 'Frost cloth protects tulip beds.'); return { none: true }; }
    if (S.covered[k]) { toast(gm, 'Already covered.'); return { none: true }; }
    S.covered[k] = 1; record('cover', z.id, 1);
    return { used: true, fx: 'straw', energy: 'place' };
  }
  return null;
}

// ---------- reports ----------
export function tulipProgress(gm) {
  const S = gm.S;
  let planted = 0, right = 0;
  for (const k of gm.tulipTiles) { const b = S.beds[k]; if (b && b.p === 'tulip') { planted++; if (b.ok) right++; } }
  return { total: gm.tulipTiles.length, planted, right };
}
