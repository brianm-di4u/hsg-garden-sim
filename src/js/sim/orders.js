// Work orders: the head gardener's morning board, built from the calendar and the garden's state, plus the
// year's goals. Generated from a seeded stream (not the running random state).
import * as D from './data.js';
import { ZONES, G, W } from './world.js';
import { stream, rnd, pick } from './rng.js';
import { unkey, toast, sound, emit, ground } from './core.js';
import { doy, season, yearNo, hours } from './calendar.js';
import { zoneStats, needsPrune, bedLook, tulipProgress } from './garden.js';
import { phase, counts } from './displays.js';

const visitorZones = ZONES.filter((z) => z.visitor && !['woods', 'hixson', 'parking'].includes(z.id));
const zoneName = (id) => (ZONES.find((z) => z.id === id) || {}).name || '';

function order(type, zone, n, extra = {}) {
  const T = D.ORDER_TYPES[type];
  return { id: type + (zone ? ':' + zone : ''), type, zone, n: Math.max(1, n), prog: 0, done: false, pay: T.pay + Math.min(10, Math.floor(n / 3)), title: extra.title || T.verb + (zone ? ' · ' + zoneName(zone) : ''), unit: T.unit, ...extra };
}

export function generate(gm) {
  const S = gm.S, d = doy(S), sea = season(S), yr = yearNo(S), h = hours(S);
  const r = stream(S.seed, 'orders', S.day);
  const z = zoneStats(gm);
  const urgent = [], upkeep = [];
  const per = (fn) => visitorZones.map((Z) => ({ id: Z.id, v: fn(z[gm.zoneIdx[Z.id]], Z) })).filter((e) => e.v > 0).sort((a, b) => b.v - a.v);
  // Events first.
  if (S.wedding && !S.wedding.setup) urgent.push(order('wedding', null, 1, { title: `Set up the wedding at ${S.wedding.name} by ${S.wedding.at === 840 ? '2:00 PM' : '4:00 PM'}`, venue: S.wedding.venue }));
  if (S.freezeTonight && Object.values(S.beds).some((b) => b.p === 'tulip')) urgent.push(order('cover', null, Math.min(12, Object.values(S.beds).filter((b) => b.p === 'tulip').length), { title: 'Hard freeze tonight: cover tulip beds with frost cloth' }));
  for (const show of ['fall', 'hl']) {
    const ph = phase(show, d), c = counts(gm, show);
    if (ph === 'install' && c.up < c.total) urgent.push(order('install', null, Math.min(show === 'hl' ? 3 : 4, c.total - c.up), { title: `${show === 'hl' ? 'Holiday Lights' : 'Fall in the Woodlands'}: install pieces (take them from Lights Storage)` }));
    if (c.set > 0) urgent.push(order('test', null, Math.min(5, c.set)));
    if (ph === 'live' && c.dark > 0) urgent.push(order('repair', null, c.dark));
    if (ph === 'strike' && c.up > 0) urgent.push(order('strike', null, Math.min(4, c.up), { title: `${show === 'hl' ? 'Holiday Lights' : 'Fall display'}: take pieces down` }));
  }
  if (D.inEvent('tulipPlanting', d)) { const t = tulipProgress(gm); if (t.planted < t.total) urgent.push(order('plantBulbs', null, Math.min(14, t.total - t.planted), { title: 'Plant tulip bulbs to this year\'s design (bulbs at the greenhouse)' })); }
  const spent = Object.values(S.beds).filter((b) => { const L = bedLook(S, b, d); return L && L.stage === 'spent'; }).length;
  if (spent) urgent.push(order('pullBulbs', null, Math.min(12, spent)));
  const emptyBeds = gm.tulipTiles.filter((k) => !S.beds[k]).length;
  if (D.inWindow([D.yd('sp', 18), D.yd('su', 10)], d) && emptyBeds) upkeep.push(order('plantAnnuals', null, Math.min(12, emptyBeds), { title: 'Plant summer annuals in the display beds (flats at the greenhouse)' }));
  const tired = Object.values(S.beds).filter((b) => { const L = bedLook(S, b, d); return L && L.stage === 'tired'; }).length;
  if (tired) upkeep.push(order('pullAnnuals', null, Math.min(12, tired)));
  for (const [id, b] of Object.entries(S.peafowlInBeds || {})) if (b) urgent.push(order('peafowl', null, 1, { title: `Shoo ${id === 'george' ? 'George' : 'a peahen'} out of the tulip beds`, bird: id }));
  // Upkeep by need.
  const top = (list) => list.length ? list[0] : null;
  const lit = top(per((s) => s.litter));
  if (lit && h.mode !== 'closed') upkeep.push(order('litter', lit.id, Math.min(10, lit.v)));
  const lv = top(per((s) => s.leaves));
  if (lv && lv.v >= 4) upkeep.push(order('rake', lv.id, Math.min(14, Math.ceil(lv.v / 1.5))));
  const wd = top(per((s) => s.weeds));
  if (wd && wd.v >= 3) upkeep.push(order('weed', wd.id, Math.min(10, Math.ceil(wd.v / 1.6))));
  const gr = top(per((s) => s.grass));
  if (gr && gr.v >= 6) upkeep.push(order('mow', gr.id, Math.min(16, gr.v)));
  const mu = top(per((s) => s.stale));
  if (mu && mu.v >= 4 && sea !== 'wi') upkeep.push(order('mulch', mu.id, Math.min(8, mu.v)));
  const pr = top(per((s) => s.shaggy));
  if (pr) upkeep.push(order('prune', pr.id, Math.min(5, pr.v)));
  const limbs = Object.values(S.objs).filter((o) => o.t === 'limb').length;
  if (limbs) urgent.push(order('debris', null, Math.min(10, limbs), { title: 'Clear storm debris from the grounds' }));
  const privet = Object.values(S.objs).filter((o) => o.t === 'plant' && o.k === 'privet').length;
  if (privet >= 3 && (sea === 'wi' || rnd(r) < 0.3)) upkeep.push(order('invasive', null, Math.min(3, privet), { title: 'Cut out invasive privet in the woods' }));
  if (sea === 'su' || (sea === 'sp' && (d % 28) > 20)) {
    const thirsty = per((s, Z) => s.dry);
    if (thirsty.length) upkeep.push(order('water', thirsty[0].id, Math.min(6, thirsty[0].v + 2)));
  }
  // Site chores.
  if (h.mode !== 'closed' || sea !== 'wi') upkeep.push(order('bonsai', 'welcome', gm.bonsai.length, { title: 'Water the bonsai (Weyerhaeuser Bonsai Garden)' }));
  const pondLeaves = gm.pondTiles.filter((k) => S.leaves[k]).length;
  if (pondLeaves >= 2) upkeep.push(order('koi', 'pinewind', pondLeaves));
  const trackLeaves = gm.railTiles.filter((k) => S.leaves[k]).length;
  if (trackLeaves >= 2 && h.mode !== 'closed') upkeep.push(order('track', 'cafe', trackLeaves));
  if (S.day - (S.feedersDay ?? -99) >= 5) upkeep.push(order('feeders', 'hixson', gm.feeders.length));
  if (S.fairy !== sea + yr) upkeep.push(order('fairy', 'children', 1));
  // Pick: every urgent order, then upkeep by a seeded shuffle weighted to the most needed, up to six in all.
  const out = [...urgent];
  const pool = upkeep.slice();
  while (out.length < 6 && pool.length) {
    const i = pool.length > 2 && rnd(r) < 0.35 ? Math.floor(rnd(r) * pool.length) : 0;
    const o = pool.splice(i, 1)[0];
    if (!out.some((x) => x.id === o.id)) out.push(o);
  }
  return out;
}

// Record work done: advances matching orders. zone null = any order of that type.
export function record(gm, type, zone, n = 1) {
  const S = gm.S;
  S.daystats[type] = (S.daystats[type] || 0) + n;
  for (const o of S.orders) {
    if (o.done || o.type !== type) continue;
    if (o.zone && zone && o.zone !== zone && !['bonsai', 'koi', 'track', 'feeders', 'fairy'].includes(type)) continue;
    o.prog = Math.min(o.n, o.prog + n);
    if (o.prog >= o.n) complete(gm, o);
    break;
  }
}
function complete(gm, o) {
  const S = gm.S;
  o.done = true;
  S.money += o.pay; S.earned += o.pay;
  S.rateBonus += 2;
  toast(gm, `Order done: ${o.title} (+$${o.pay})`, 'quest');
  sound(gm, 'quest');
  if (S.orders.every((x) => x.done)) { toast(gm, 'Every order on the board is done. Nice work.', 'quest'); S.rateBonus += 4; }
}
export const progressText = (o) => `(${o.prog}/${o.n})`;

// ---------- the year's goals ----------
export function goals(gm) {
  const S = gm.S, ys = S.ys, yr = yearNo(S), need = D.yearDef(yr).rating;
  const avg = ys.ratingDays ? ys.ratingSum / ys.ratingDays : 0;
  return [
    { id: 'tulips', title: 'Plant the tulip beds to the design by the end of January (80%)', done: ys.tulipPct >= 80, text: ys.tulipPct != null ? `${ys.tulipPct}% planted to design` : 'Due at the end of January' },
    { id: 'lights', title: 'Holiday Lights fully installed and lit by opening night', done: !!ys.lightsReady, text: ys.lightsChecked ? (ys.lightsReady ? 'Ready on opening night' : `${ys.lightsPct}% ready on opening night`) : 'Opening night is late November' },
    { id: 'weddings', title: 'Every wedding set up on time', done: ys.weddings > 0 && ys.weddingsMissed === 0, text: `${ys.weddings - ys.weddingsMissed}/${ys.weddings} on time` },
    { id: 'rating', title: `Average Garden Rating of ${need} or better`, done: avg >= need && ys.ratingDays >= 20, text: ys.ratingDays ? `${avg.toFixed(2)} over ${ys.ratingDays} days` : 'No visitors yet' },
  ];
}
