// The rules. One serializable state object (gm.S) plus derived data (world, nav, indexes). No DOM here, so
// tools/balance.mjs can run the same code in Node. Garden upkeep, displays, orders and the crowd live in their
// own modules; this one runs the day, the player, the staff and the buildings.
import { rnd, stream, ri, pick, chance, hash } from './rng.js';
import * as D from './data.js';
import { buildWorld, gardenPlantings, W, H, G, groundBlocks, isWater, ZONES, ZONE_INDEX } from './world.js';
import { makeNav, findPath } from './path.js';
import * as C from './core.js';
import * as cal from './calendar.js';
import * as garden from './garden.js';
import * as disp from './displays.js';
import * as orders from './orders.js';
import * as crowd from './crowd.js';
import * as WORLD from './world.js';

export const key = C.key;
export const count = C.count;
export const matches = C.matches;
export const addItem = C.addItem;
export const removeItem = C.removeItem;
export const selected = C.selected;
export const swapSlots = C.swapSlots;
export const ground = C.ground;
export const objAt = C.objAt;
export const blocked = C.blocked;
export const placeOf = C.placeOf;
export const target = C.target;
export const HOTBAR = C.HOTBAR;
export const zoneAt = C.zoneAt;
export const markerAt = C.markerAt;
export const season = cal.season;
export const dayOfSeason = cal.dayOfSeason;
export const yearNo = cal.yearNo;
export const clock = cal.clock;
export const clockOf = cal.clockOf;
export const dateLabel = cal.dateLabel;
export const realDate = cal.realDate;
export const hours = cal.hours;
export const isOpen = cal.isOpen;
export const shopOpen = cal.shopOpen;
export const darkness = cal.darkness;
export const doy = cal.doy;
export const eventsAround = cal.eventsAround;
export const zoneStats = garden.zoneStats;
export const plantLook = garden.plantLook;
export const bedLook = garden.bedLook;
export const tulipProgress = garden.tulipProgress;
export const needsPrune = garden.needsPrune;
export const phase = disp.phase;
export const counts = disp.counts;
export const pieceState = disp.pieceState;
export const lit = disp.lit;
export const SHOWS = disp.SHOWS;
export const goals = orders.goals;
export const progressText = orders.progressText;
export const visitorLook = crowd.visitorLook;
export const peafowlAt = crowd.peafowlAt;
export const attendance = crowd.attendance;
export const tulipDesign = WORLD.tulipDesign;

const { emit, toast, sound } = C;
export const VERSION = 2;
const SPEED = 4.5 / 60;          // tiles per tick
const NPC_SPEED = 3 / 60;
export const hearts = (pts) => Math.min(5, Math.floor(pts / 20));

// ---------- creation ----------
export function newGame(opts = {}) {
  const seed = (opts.seed ?? 1) >>> 0;
  const S = {
    v: VERSION, seed, day: opts.day ?? 0, time: D.DAY_START, tick: 0, weather: 'clear', freezeTonight: false,
    money: opts.money ?? 40, earned: 0, energy: D.MAX_ENERGY, maxEnergy: D.MAX_ENERGY, rs: hash(seed, 'run') | 0, crs: { rs: hash(seed, 'crowd') | 0 },
    player: { x: 0, y: 0, face: 'down', moving: false, walk: 0, hat: 'cap', hatColor: '#3a6a3a' }, sel: 0, inv: new Array(C.INV_SIZE).fill(null), can: D.CAN_CAP[1], tier: 1,
    objs: {}, weeds: {}, leaves: {}, litter: {}, grass: {}, mulch: {}, beds: {}, covered: {}, watered: {},
    disp: {}, orders: [], daystats: {}, rate: { sum: 0, n: 0 }, rateBonus: 0, ratingHist: [], rating: 3,
    visitors: [], vseq: 0, peafowl: [], peafowlInBeds: {}, attend: 0, wedding: null, feedersDay: -99, fairy: null,
    npcs: {}, almanac: [], flags: {}, stats: { litter: 0, limbs: 0, bulbs: 0, orders: 0, visitors: 0 }, ys: null, yearsDone: [],
    summary: null, passOut: false, autoPath: null,
  };
  const gm = { S, world: null, nav: makeNav(), navVersion: 0, events: [] };
  rebuildWorld(gm);
  S.objs = gardenPlantings(gm.world, seed);
  indexObjs(gm);
  startingGarden(gm);
  S.ys = newYearStats();
  for (const [id, p] of Object.entries(D.PEOPLE)) {
    const at = placeOf(gm, p.sched[0][1]);
    S.npcs[id] = { pts: 0, talkDay: -1, giftDay: -1, x: at.x + 0.5, y: at.y + 0.9, path: null, place: p.sched[0][1], hidden: true, face: 'down' };
  }
  S.peafowl = crowd.newPeafowl(gm);
  for (const t of D.TOOLS) addItem(S, t, 1);
  addItem(S, 'straw', 6);
  toStart(gm);
  startDay(gm, true);
  return gm;
}
// The garden as you find it on your first spring morning: tulips up in the display beds (planted by last year's
// crew), beds mulched at various times, a little of everything to do.
function startingGarden(gm) {
  const S = gm.S, r = stream(S.seed, 'start');
  for (const bed of gm.world.beds) for (const [x, y] of bed.tiles) {
    const k = key(x, y);
    if (ground(gm, x, y) !== G.BED) continue;
    if (S.day % D.YEAR_DAYS < D.yd('sp', 14)) S.beds[k] = { p: 'tulip', c: tulipDesignFor(gm, bed, x, y, 0), ok: true };
  }
  for (const k of gm.bedTiles) S.mulch[k] = -Math.floor(rnd(r) * 70);
  for (const k of gm.lawnTiles) if (rnd(r) < 0.4) S.grass[k] = 1;
  for (const k of gm.bedTiles) if (rnd(r) < 0.06) S.weeds[k] = 1;
}
const tulipDesignFor = (gm, bed, x, y, year) => WORLD.tulipDesign(bed, x, y, year);

export function attach(S) {
  const gm = { S, world: null, nav: makeNav(), navVersion: 0, events: [] };
  rebuildWorld(gm);
  return gm;
}
// Derived data: the map and indexes the rules use (never saved).
export function rebuildWorld(gm) {
  const w = gm.world = buildWorld(gm.S.seed);
  gm.bmap = new Int16Array(W * H).fill(-1);
  w.buildings.forEach((b, i) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) gm.bmap[y * W + x] = i; });
  gm.fixed = {};
  for (const f of w.fixed) gm.fixed[key(f.x, f.y)] = f;
  gm.markerMap = {}; gm.markerById = {};
  for (const m of w.markers) { gm.markerMap[key(m.x, m.y)] = m; gm.markerById[m.id] = m; }
  gm.bedMap = {}; gm.tulipTiles = [];
  for (const b of w.beds) for (const [x, y] of b.tiles) if (w.g[y * W + x] === G.BED) { gm.bedMap[key(x, y)] = b; gm.tulipTiles.push(key(x, y)); }
  gm.bedTiles = []; gm.lawnTiles = []; gm.pondTiles = []; gm.railTiles = [];
  gm.zoneSize = new Array(ZONES.length).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = w.g[y * W + x], k = key(x, y);
    if (v === G.BED) gm.bedTiles.push(k);
    else if (v === G.LAWN) gm.lawnTiles.push(k);
    else if (v === G.POND) gm.pondTiles.push(k);
    else if (v === G.RAIL) gm.railTiles.push(k);
    if (!groundBlocks(v)) gm.zoneSize[w.zone[y * W + x]]++;
  }
  gm.zoneIdx = ZONE_INDEX;
  gm.feeders = w.fixed.filter((f) => f.t === 'feeder');
  indexObjs(gm);
  gm.navVersion++;
  gm.zcache = null;
}
function indexObjs(gm) {
  gm.bonsai = [];
  for (const [k, o] of Object.entries(gm.S.objs || {})) if (o.t === 'plant' && o.k === 'bonsai') gm.bonsai.push(k);
}
const newYearStats = () => ({ tulipPct: null, lightsReady: false, lightsChecked: false, lightsPct: 0, weddings: 0, weddingsMissed: 0, ratingSum: 0, ratingDays: 0, orders: 0, ordersDone: 0 });
function toStart(gm) { const p = placeOf(gm, 'board'); gm.S.player.x = p.x + 0.5; gm.S.player.y = p.y + 0.9; gm.S.player.face = 'up'; }

// ---------- the tick ----------
export function tick(gm, input = {}) {
  const S = gm.S;
  S.tick++;
  if (S.tick >= D.TICKS_PER_MIN) {
    S.tick = 0; S.time++;
    if (S.time >= D.DAY_END) { sleep(gm, { passOut: true }); return; }
    minute(gm);
  }
  movePlayer(gm, input);
  moveNpcs(gm);
  crowd.crowdTick(gm);
}
// Once a game minute: weddings start and end, the café closes, the lights come on.
function minute(gm) {
  const S = gm.S, w = S.wedding;
  if (w && !w.checked && S.time >= w.at) {
    w.checked = true;
    if (!w.setup) { S.ys.weddingsMissed++; S.rateBonus -= 6; toast(gm, `The wedding at ${w.name} started without its chairs. Mariana is not happy.`, 'warn'); }
    else { toast(gm, `A wedding is under way at ${w.name}. ♥`, 'good'); emit(gm, 'sound', { id: 'bells' }); }
  }
  const h = cal.hours(S);
  if (h.mode === 'lights' && S.time === h.open) toast(gm, 'The gates open for Holiday Lights.', 'good');
  if (h.mode === 'day' && S.time === h.open) toast(gm, 'The gates are open. Visitors are coming in.');
  if (h.mode !== 'closed' && S.time === h.close) toast(gm, 'The garden is closing for the day.');
}

function movePlayer(gm, input) {
  const S = gm.S, p = S.player;
  let mx = input.mx || 0, my = input.my || 0;
  if ((mx || my) && S.autoPath) S.autoPath = null;
  if (!mx && !my && S.autoPath && S.autoPath.length) {
    const n = S.autoPath[0];
    const dx = n.x + 0.5 - p.x, dy = n.y + 0.9 - p.y;
    if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08) { S.autoPath.shift(); if (!S.autoPath.length) { S.autoPath = null; if (S.autoFace) { p.face = S.autoFace; S.autoFace = null; } } }
    else { mx = Math.abs(dx) > 0.04 ? Math.sign(dx) : 0; my = Math.abs(dy) > 0.04 ? Math.sign(dy) : 0; if (Math.abs(dx) > 0.04 && Math.abs(dy) > 0.04) my = 0; }
  }
  if (!mx && !my) { p.moving = false; return; }
  const len = Math.hypot(mx, my);
  let sp = SPEED * (S.energy <= 15 ? 0.7 : 1);
  // The utility cart (from Year 2) is quicker on paths and roads.
  const here = ground(gm, Math.floor(p.x), Math.floor(p.y - 0.1));
  if (S.tier >= 2 && (here === G.PATH || here === G.ROAD || here === G.PARKING || here === G.GRAVEL || here === G.STONE)) sp *= 1.45;
  if (S.autoPath) sp = Math.min(sp, Math.max(Math.abs((S.autoPath[0]?.x ?? 0) + 0.5 - p.x), Math.abs((S.autoPath[0]?.y ?? 0) + 0.9 - p.y), 0.02));
  const vx = mx / len * sp, vy = my / len * sp;
  if (Math.abs(mx) > Math.abs(my) + 0.01) p.face = mx > 0 ? 'right' : 'left';
  else if (my) p.face = my > 0 ? 'down' : 'up';
  else p.face = mx > 0 ? 'right' : 'left';
  const hw = 0.28, top = 0.2;
  const free = (x, y) => !blocked(gm, Math.floor(x - hw), Math.floor(y - top)) && !blocked(gm, Math.floor(x + hw), Math.floor(y - top))
    && !blocked(gm, Math.floor(x - hw), Math.floor(y - 0.01)) && !blocked(gm, Math.floor(x + hw), Math.floor(y - 0.01));
  if (free(p.x + vx, p.y)) p.x += vx;
  if (free(p.x, p.y + vy)) p.y += vy;
  p.x = Math.max(0.3, Math.min(W - 0.3, p.x)); p.y = Math.max(1.2, Math.min(H - 0.01, p.y));
  p.moving = true; p.walk = (p.walk + 1) % 10000;
}

// ---------- staff ----------
export function npcPlaceNow(S, id) {
  const p = D.PEOPLE[id];
  let place = p.sched[0][1];
  for (const [t, pl] of p.sched) if (S.time >= t) place = pl;
  const h = cal.hours(S);
  if (id === 'dale' && h.mode === 'lights' && S.time >= 960 && S.time < 1320) place = 'lawnEast';
  if (id === 'tomas' && h.mode === 'closed') place = 'staffLot';
  if (id === 'opal' && h.mode !== 'day') place = h.mode === 'lights' && S.time >= 990 && S.time < 1290 ? 'welcomeFront' : 'staffLot';
  if (id === 'mariana' && S.wedding && S.time >= 600 && S.time < S.wedding.at + 120) place = S.wedding.venue + 'Venue';
  return place;
}
function spotFor(gm, id, place) {
  const base = placeOf(gm, place);
  if (place === D.PEOPLE[id].home) return base;
  const cast = Object.keys(gm.S.npcs), i = cast.indexOf(id);
  for (const dx of [[0, 1, -1][i % 3], 0]) { const x = base.x + dx; if (!blocked(gm, x, base.y)) return { x, y: base.y }; }
  return base;
}
function moveNpcs(gm) {
  const S = gm.S;
  const blk = (x, y) => blocked(gm, x, y);
  for (const [id, n] of Object.entries(S.npcs)) {
    const want = npcPlaceNow(S, id);
    if (want !== n.place || (!n.path && n.placeArrived !== want)) {
      n.place = want; n.placeArrived = null;
      const to = spotFor(gm, id, want);
      const sx = Math.floor(n.x), sy = Math.floor(n.y - 0.1);
      n.path = findPath(gm.nav, gm.navVersion, W, H, blk, sx, sy, to.x, to.y);
      n.path = n.path ? n.path.slice() : null;
      n.hidden = false;
      if (!n.path) { n.x = to.x + 0.5; n.y = to.y + 0.9; n.placeArrived = want; }
    }
    if (n.path && n.path.length) {
      const t = n.path[0];
      const dx = t.x + 0.5 - n.x, dy = t.y + 0.9 - n.y, d = Math.hypot(dx, dy);
      if (d <= NPC_SPEED) { n.x = t.x + 0.5; n.y = t.y + 0.9; n.path.shift(); }
      else { n.x += dx / d * NPC_SPEED; n.y += dy / d * NPC_SPEED; n.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
      n.moving = true;
      if (!n.path.length) { n.path = null; n.placeArrived = n.place; n.moving = false; n.face = 'down'; }
    } else n.moving = false;
    n.hidden = n.place === D.PEOPLE[id].home && !n.path;
  }
}
export function npcAt(gm, x, y) {
  for (const [id, n] of Object.entries(gm.S.npcs)) {
    if (n.hidden) continue;
    if (Math.abs(n.x - (x + 0.5)) < 0.75 && Math.abs(n.y - 0.5 - (y + 0.5)) < 0.8) return id;
  }
  return null;
}

// ---------- actions ----------
const rec = (gm) => (type, zone, n) => orders.record(gm, type, zone, n);
// use(): context first (person, bird, building, fixed object), then the selected item on the target tile.
export function use(gm, at) {
  const t = at || target(gm);
  const npc = npcAt(gm, t.x, t.y);
  if (npc) return { talk: npc };
  const bird = crowd.peafowlAt(gm, t.x, t.y);
  if (bird) return birdMeet(gm, bird);
  const r = interactAt(gm, t.x, t.y, true);
  if (r) return r;
  return useItemAt(gm, t.x, t.y);
}
export function interactAt(gm, x, y, viaUse = false) {
  const S = gm.S;
  const bi = x >= 0 && y >= 0 && x < W && y < H ? gm.bmap[y * W + x] : -1;
  if (bi >= 0) {
    const b = gm.world.buildings[bi];
    switch (b.id) {
      case 'barn': return { board: true };
      case 'greenhouse': return { supplies: true };
      case 'storage': return { storage: true };
      case 'cafe': if (!cal.shopOpen(S, 'cafe')) { toast(gm, 'The Chipmunk Café grill is open 10 AM to 3 PM (and evenings during Holiday Lights).'); return { done: true }; } return { shop: 'cafe' };
      case 'welcome': if (!cal.shopOpen(S, 'gift')) { toast(gm, 'The GardenShop is closed right now.'); return { done: true }; } return { shop: 'gift' };
      case 'chapel': return { sign: 'chapel' };
      case 'pavilion': return { sign: 'pavilion' };
      case 'treehouse': return { sign: 'children' };
      case 'carillon': return { sign: 'chapel' };
      default: toast(gm, { brides: 'Millsap Bride\'s Hall.', grooms: 'Evans Groom\'s Quarters.', restroom: 'Restrooms.' }[b.id] || 'A building.'); return { done: true };
    }
  }
  const f = gm.fixed[key(x, y)];
  if (f) {
    const sel = selected(S);
    if (f.t === 'sign') return { sign: f.k };
    if (f.t === 'feeder') { if (count(S, 'seed')) return fillFeeder(gm, f); toast(gm, S.day - S.feedersDay < 5 ? 'The feeder is full. Chickadees and titmice are busy at it.' : 'This feeder is nearly empty. Bring bird seed from the greenhouse.'); return { done: true }; }
    if (f.t === 'fairy') { if (count(S, 'decor')) return fairyDecor(gm); toast(gm, 'The Fairy Village: tiny houses tucked among the roots. The decor changes with the seasons.'); return { done: true }; }
    if (f.t === 'venue') return venueUse(gm, f, sel);
    if (f.t === 'pergola') { toast(gm, 'Dooley Pergola.'); return { done: true }; }
    if (f.t === 'falls') { toast(gm, 'The waterfall.'); return { done: true }; }
  }
  return null;
}
export function useItemAt(gm, x, y) {
  const S = gm.S, k = key(x, y);
  const sel = selected(S);
  const m = gm.markerMap[k];
  const record = rec(gm);
  if (!sel) { if (S.litter[k]) return garden.careAt(gm, x, y, 'grabber', record); return { none: true }; }
  const def = D.ITEMS[sel.id];
  if (def.kind === 'tool') {
    if (sel.id === 'reel') { if (m && (m.show === 'hl' || m.show === 'fall')) return withEnergy(gm, disp.reelOn(gm, m, record)); toast(gm, 'The light reel works on Holiday Lights pieces and the trees marked for wrapping.'); return { none: true }; }
    const r = garden.careAt(gm, x, y, sel.id, record);
    if (r) return withEnergy(gm, r);
    if (sel.id === 'grabber' && S.litter[k] === undefined) return { none: true };
    return { none: true };
  }
  if (def.kind === 'display') { if (!m) { toast(gm, 'Display pieces go on their marked spots (look for the stakes).'); return { none: true }; } return consume(gm, sel.id, disp.placePiece(gm, m, sel.id, record)); }
  if (def.kind === 'material') {
    if (['straw', 'annuals', 'cloth'].includes(sel.id) || sel.id.startsWith('bulb:')) return consume(gm, sel.id, garden.materialAt(gm, x, y, sel.id, record));
    toast(gm, { seed: 'Fill the feeders on the Birdsong Trail.', decor: 'This goes in the Fairy Village by the Treehouse.', kit: 'Set this up at today\'s wedding spot.' }[sel.id] || 'Nothing to do with that here.');
    return { none: true };
  }
  if (def.kind === 'food') return { eat: sel.id };
  if (def.kind === 'wear') { S.player.hat = def.hat; S.player.hatColor = def.hatColor; toast(gm, `You put on the ${def.name.toLowerCase()}.`); return { done: true }; }
  return { none: true };
}
function withEnergy(gm, r) {
  if (!r || !r.energy) return r;
  if (!C.spend(gm, r.energy)) return { none: true };
  return r;
}
function consume(gm, id, r) {
  if (!r || !r.used) return r || { none: true };
  if (r.energy && !C.spend(gm, r.energy)) return { none: true };
  removeItem(gm.S, id, 1);
  sound(gm, 'place');
  return { done: true, fx: r.fx };
}
function fillFeeder(gm, f) {
  const S = gm.S;
  removeItem(S, 'seed', 1);
  f.filled = S.day;
  orders.record(gm, 'feeders', 'hixson', 1);
  if (gm.feeders.every((x) => x.filled === S.day)) S.feedersDay = S.day;
  sound(gm, 'pickup'); toast(gm, 'Feeder filled.');
  return { done: true };
}
function fairyDecor(gm) {
  const S = gm.S, sea = cal.season(S);
  if (S.fairy === sea + cal.yearNo(S)) { toast(gm, 'The Fairy Village already has this season\'s decor.'); return { done: true }; }
  removeItem(S, 'decor', 1); S.fairy = sea + cal.yearNo(S);
  orders.record(gm, 'fairy', 'children', 1);
  toast(gm, { sp: 'Tiny tulips and a ribbon maypole.', su: 'Paper lanterns and a little lemonade stand.', fa: 'Acorn-cap pumpkins and a scarecrow the size of your thumb.', wi: 'Moss wreaths and a string of the smallest lights.' }[sea], 'good');
  sound(gm, 'craft');
  return { done: true };
}
function venueUse(gm, f, sel) {
  const S = gm.S, w = S.wedding;
  const names = { chapel: 'Anthony Chapel', pergola: 'Dooley Pergola', koi: 'Koi Pond Meadow' };
  if (!w || w.venue !== f.k) { toast(gm, `${names[f.k]}: a wedding site. ${w ? `Today's wedding is at ${w.name}.` : 'No wedding here today.'}`); return { done: true }; }
  if (!w.setup) {
    if (!count(S, 'kit')) { toast(gm, 'Bring the wedding kit from the greenhouse.'); return { done: true }; }
    removeItem(S, 'kit', 1); w.setup = true; orders.record(gm, 'wedding', null, 1);
    toast(gm, S.time < w.at ? 'Chairs out, arch up, aisle runner down. Ready for the couple.' : 'Set up, but late.', S.time < w.at ? 'good' : 'warn');
    sound(gm, 'place');
    return { done: true };
  }
  if (S.time < w.at + 120) { toast(gm, 'The ceremony is still to come or under way. Strike it after.'); return { done: true }; }
  if (!w.struck) { w.struck = true; addItem(S, 'kit', 1); orders.record(gm, 'unwed', null, 1); toast(gm, 'Wedding setup struck and packed.'); sound(gm, 'pickup'); return { done: true }; }
  toast(gm, 'All packed up.');
  return { done: true };
}
function birdMeet(gm, b) {
  const S = gm.S;
  if (S.peafowlInBeds[b.id]) {
    S.peafowlInBeds[b.id] = false; b.flee = true;
    for (const o of S.orders) if (o.type === 'peafowl' && o.bird === b.id && !o.done) { o.prog = 1; o.done = true; S.money += o.pay; toast(gm, `Order done: ${o.title} (+$${o.pay})`, 'quest'); }
    toast(gm, b.id === 'george' ? 'George gives you a long look and stalks off toward the café.' : 'The peahen hurries off, unbothered.');
    emit(gm, 'sound', { id: 'peacock' });
    return { done: true };
  }
  if (S.flags['admire' + b.id] !== S.day) { S.flags['admire' + b.id] = S.day; S.energy = Math.min(S.maxEnergy, S.energy + 4); }
  if (b.id === 'george' && !S.almanac.includes('g-george')) return { card: { kicker: 'The garden', title: 'George the peacock', paras: ['George eyes you, then your pockets, then fans his tail for nobody in particular.'], facts: ['g-george'] } };
  toast(gm, b.sex === 'm' ? (b.mode === 'fan' ? 'George fans his tail: a shimmering wall of eyes.' : 'George struts past, very pleased with himself.') : 'A peahen pecks at the gravel, ignoring you completely.');
  return { done: true };
}
export function eat(gm, id) {
  const S = gm.S, def = D.ITEMS[id];
  if (!def || !def.energy || !count(S, id)) return false;
  if (S.energy >= S.maxEnergy) { toast(gm, 'You\'re not hungry.'); return false; }
  removeItem(S, id, 1);
  S.energy = Math.min(S.maxEnergy, S.energy + def.energy);
  sound(gm, 'eat'); toast(gm, `${def.name}. +${def.energy} energy.`);
  return true;
}

// ---------- buildings: board, supplies, storage, shops ----------
// The greenhouse supply bench hands out what today's work needs (free: it's the garden's stock).
export function supplyList(gm) {
  const S = gm.S, d = cal.doy(S), out = [];
  out.push({ id: 'straw', max: 20, note: 'Mulch for the beds' });
  if (D.inWindow([D.yd('wi', 1), D.yd('wi', 19)], d)) for (const c of Object.keys(D.TULIP_COLORS)) out.push({ id: 'bulb:' + c, max: 20, note: 'Planting season' });
  if (D.inWindow([D.yd('sp', 15), D.yd('su', 20)], d)) out.push({ id: 'annuals', max: 20, note: 'Summer color' });
  if (S.freezeTonight || S.orders.some((o) => o.type === 'cover' && !o.done)) out.push({ id: 'cloth', max: 20, note: 'Freeze tonight' });
  out.push({ id: 'seed', max: 4, note: 'Birdsong Trail feeders' });
  if (S.fairy !== cal.season(S) + cal.yearNo(S)) out.push({ id: 'decor', max: 1, note: 'This season\'s Fairy Village decor' });
  if (S.wedding && !S.wedding.setup && !count(S, 'kit')) out.push({ id: 'kit', max: 1, note: `Today: ${S.wedding.name}` });
  return out;
}
export function takeSupply(gm, id, n) {
  const S = gm.S, e = supplyList(gm).find((x) => x.id === id);
  if (!e) return false;
  const k = Math.max(0, Math.min(n, e.max - count(S, id)));
  if (!k) { toast(gm, 'You have plenty of that.'); return false; }
  const left = addItem(S, id, k);
  if (left === k) { toast(gm, 'Your pack is full.', 'warn'); return false; }
  sound(gm, 'pickup');
  return true;
}
export function storageTake(gm) {
  const n = disp.takeFromStorage(gm);
  toast(gm, n ? `Loaded ${n} display piece${n > 1 ? 's' : ''}. Place them on their marked stakes.` : 'Nothing to take out right now.', n ? 'good' : 'info');
  if (n) sound(gm, 'pickup');
  return n;
}
export function storageReturn(gm) {
  const n = disp.returnToStorage(gm);
  toast(gm, n ? `Stored ${n} piece${n > 1 ? 's' : ''}.` : 'No display pieces to put away.');
  return n;
}
export function shopList(S, id) { return D.SHOPS[id].stock.map(([item, price]) => ({ id: item, price })); }
export function buy(gm, shop, id, n = 1) {
  const S = gm.S;
  const e = shopList(S, shop).find((x) => x.id === id);
  if (!e) return false;
  if (!cal.shopOpen(S, shop)) { toast(gm, 'Closed right now.'); return false; }
  const cost = e.price * n;
  if (S.money < cost) { toast(gm, 'Not enough money.', 'warn'); sound(gm, 'nope'); return false; }
  const left = addItem(S, id, n), got = n - left;
  if (!got) { toast(gm, 'Your pack is full.', 'warn'); return false; }
  S.money -= e.price * got; sound(gm, 'coin');
  return true;
}

// ---------- people ----------
export function talk(gm, id) {
  const S = gm.S, n = S.npcs[id], p = D.PEOPLE[id];
  if (!n) return null;
  const out = { npc: id, name: p.name, role: p.role, lines: [], facts: [] };
  const pl = S.player;
  n.face = Math.abs(pl.x - n.x) > Math.abs(pl.y - n.y) ? (pl.x > n.x ? 'right' : 'left') : (pl.y > n.y ? 'down' : 'up');
  if (n.talkDay !== S.day) { n.talkDay = S.day; addPts(gm, id, 3); }
  const h = hearts(n.pts), sea = cal.season(S);
  // Situational lines first.
  if (id === 'ruth') { const open = S.orders.filter((o) => !o.done); out.lines.push(open.length ? `${open.length} order${open.length > 1 ? 's' : ''} still open on the board. ${open[0].title}.` : 'Board\'s clear. Take a walk and look for anything I missed.'); }
  if (id === 'mariana' && S.wedding) out.lines.push(S.wedding.setup ? 'Everything looks lovely. Thank you.' : `Wedding at ${S.wedding.name} at ${cal.clockOf(S.wedding.at)}. The kit is at the greenhouse.`);
  if (id === 'dale') { const ph = disp.phase('hl', cal.doy(S)); if (ph === 'install') { const c = disp.counts(gm, 'hl'); out.lines.push(`${c.up} of ${c.total} pieces are up. Grab more from Lights Storage.`); } }
  const cands = p.lines.filter((l) => l.h <= h && (!l.s || l.s === sea));
  if (cands.length) {
    const best = cands.filter((l) => l.h === Math.max(...cands.map((c) => c.h)));
    const pool = (S.day + hash(id) % 3) % 2 === 0 ? best : cands;
    const l = pool[(S.day + (hash(id, S.day) % 5)) % pool.length];
    out.lines.push(l.t);
    if (l.fact) out.facts.push(l.fact);
  }
  out.hearts = hearts(n.pts);
  sound(gm, 'talk');
  return out;
}
export function addPts(gm, id, k) {
  const n = gm.S.npcs[id]; if (!n) return;
  const before = hearts(n.pts);
  n.pts = Math.max(0, Math.min(100, n.pts + k));
  if (hearts(n.pts) > before) { toast(gm, `${D.PEOPLE[id].name}: ${'♥'.repeat(hearts(n.pts))}`, 'good'); emit(gm, 'heart', { npc: id }); }
}
export function giftReaction(id, item) {
  const g = D.PEOPLE[id].gifts;
  const hit = (list) => list.some((w) => C.matches(item, w));
  if (hit(g.love)) return 'love';
  if (hit(g.dislike)) return 'dislike';
  if (hit(g.like)) return 'like';
  return 'neutral';
}
export function give(gm, id, itemId) {
  const S = gm.S, n = S.npcs[id];
  if (!n || !itemId || !count(S, itemId)) return null;
  const kind = D.ITEMS[itemId].kind;
  if (kind === 'tool' || kind === 'display') return null;
  if (n.giftDay === S.day) { toast(gm, `You already gave ${D.PEOPLE[id].name.split(' ')[0]} something today.`); return { already: true }; }
  const r = giftReaction(id, itemId);
  removeItem(S, itemId, 1);
  n.giftDay = S.day;
  addPts(gm, id, { love: 12, like: 6, neutral: 2, dislike: -4 }[r]);
  sound(gm, r === 'dislike' ? 'nope' : 'gift');
  const first = D.PEOPLE[id].name.split(' ')[0];
  return { reaction: r, text: { love: `${first} lights up. "For me? I love this!"`, like: `${first} smiles. "Thank you."`, neutral: `${first} nods. "That's kind of you."`, dislike: `${first} frowns. "Oh. Well."` }[r] };
}

// ---------- days ----------
// Clock out (or pass out at 2:00): pay, the Garden Rating, the overnight garden, then the next morning.
export function sleep(gm, opts = {}) {
  const S = gm.S;
  for (const v of S.visitors) if (v.n) { S.rate.sum += Math.min(100, v.sat / v.n); S.rate.n++; }
  S.stats.visitors += S.visitors.length;
  const open = S.orders.filter((o) => !o.done);
  S.rateBonus -= open.length;
  const rating = crowd.dayRating(gm);
  const sum = { date: cal.dateLabel(S), real: cal.realDate(cal.doy(S)), orders: S.orders.map((o) => ({ title: o.title, done: o.done, pay: o.done ? o.pay : 0 })), rating, visitors: S.rate.n, wage: 0, passOut: !!opts.passOut, lost: 0 };
  // Pay: a day's wage for a day worked (any order done, or time on the clock).
  sum.wage = S.orders.some((o) => o.done) || S.time > 720 ? D.WAGE : Math.round(D.WAGE / 2);
  S.money += sum.wage; S.earned += sum.wage;
  if (opts.passOut) { sum.lost = 20; S.money = Math.max(0, S.money - 20); }
  if (rating != null) { S.ratingHist.push(rating); if (S.ratingHist.length > 14) S.ratingHist.shift(); S.rating = Math.round(S.ratingHist.reduce((a, b) => a + b, 0) / S.ratingHist.length * 10) / 10; S.ys.ratingSum += rating; S.ys.ratingDays++; }
  S.ys.orders += S.orders.length; S.ys.ordersDone += S.orders.filter((o) => o.done).length; S.stats.orders += S.orders.filter((o) => o.done).length;
  if (S.wedding && !S.wedding.checked) { S.ys.weddingsMissed += S.wedding.setup ? 0 : 1; }
  // The night.
  disp.nightly(gm, sum);
  garden.overnight(gm, sum);
  const lastDoy = cal.doy(S);
  S.day++;
  const d = cal.doy(S);
  // Year milestones.
  if (lastDoy === D.yd('wi', 19)) { const t = garden.tulipProgress(gm); S.ys.tulipPct = Math.round(t.right / Math.max(1, t.total) * 100); }
  if (d === D.yd('fa', 26)) { const c = disp.counts(gm, 'hl'); S.ys.lightsChecked = true; S.ys.lightsPct = Math.round(c.ok / Math.max(1, c.total) * 100); S.ys.lightsReady = c.ok >= c.total; }
  if (d === 0) sum.yearEnd = yearReview(gm);
  S.summary = sum;
  S.passOut = !!opts.passOut;
  startDay(gm, false);
  if (opts.passOut) S.energy = Math.round(S.maxEnergy * 0.6);
  emit(gm, 'slept', { summary: sum });
  return sum;
}
// Year-end review: the year's goals, a new title and better tools.
function yearReview(gm) {
  const S = gm.S, yr = cal.yearNo(S) - 1;
  const g = orders.goals(gm);
  const passed = g.filter((x) => x.done).length;
  const rev = { year: yr, goals: g.map((x) => ({ title: x.title, done: x.done, text: x.text })), passed, rating: S.ys.ratingDays ? Math.round(S.ys.ratingSum / S.ys.ratingDays * 100) / 100 : 0, orders: `${S.ys.ordersDone}/${S.ys.orders}` };
  const next = D.yearDef(yr + 1);
  if (passed >= 3 || yr >= 1) { S.tier = Math.max(S.tier, Math.min(3, next.tier)); S.can = D.CAN_CAP[S.tier]; }
  rev.title = next.title; rev.tier = S.tier;
  S.yearsDone.push(rev);
  S.ys = newYearStats();
  return rev;
}

export function startDay(gm, first) {
  const S = gm.S;
  S.time = D.DAY_START; S.tick = 0; S.autoPath = null;
  S.energy = S.maxEnergy;
  garden.rollWeather(gm, first);
  S.daystats = {}; S.rate = { sum: 0, n: 0 }; S.rateBonus = 0;
  S.visitors = []; S.peafowlInBeds = {};
  for (const b of S.peafowl) { const h = placeOf(gm, b.home); b.mode = 'peck'; b.x = h.x + 0.5; b.y = h.y + 0.9; b.t = 10; }
  S.attend = crowd.attendance(S);
  // A wedding today? About 200 a year at the real garden (game: often on spring and fall weekends).
  const r = stream(S.seed, 'wedding', S.day);
  const sea = cal.season(S), h = cal.hours(S);
  const p = h.mode !== 'day' ? 0 : (sea === 'sp' || sea === 'fa' ? 0.2 : 0.1) * (cal.weekend(S) ? 2.2 : 1);
  S.wedding = null;
  if (!first && rnd(r) < p) {
    const venue = pick(r, ['chapel', 'chapel', 'pergola', 'koi']);
    S.wedding = { venue, name: { chapel: 'Anthony Chapel', pergola: 'Dooley Pergola', koi: 'Koi Pond Meadow' }[venue], at: rnd(r) < 0.6 ? 840 : 960, setup: false, struck: false, checked: false };
    S.ys.weddings++;
  }
  for (const f of gm.world.fixed) if (f.t === 'venue') {
    const spot = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].map(([dx, dy]) => ({ x: f.x + dx, y: f.y + dy })).find((p) => !blocked(gm, p.x, p.y));
    gm.world.places[f.k + 'Venue'] = spot || { x: f.x, y: f.y + 1 };
  }
  gm.navVersion++;
  for (const n of Object.values(S.npcs)) { n.path = null; n.placeArrived = null; }
  for (const [id, n] of Object.entries(S.npcs)) {
    const at = placeOf(gm, D.PEOPLE[id].home);
    n.x = at.x + 0.5; n.y = at.y + 0.9; n.place = D.PEOPLE[id].home; n.placeArrived = n.place; n.hidden = true;
  }
  S.orders = orders.generate(gm);
  toStart(gm);
  if (!first) {
    const d = cal.doy(S);
    for (const [id, e] of Object.entries(D.EVENTS)) if (e.from === d && e.name) emit(gm, 'event', { id, name: e.name, fact: e.fact });
  }
}
export function readFacts(S, ids) { for (const f of ids || []) if (!S.almanac.includes(f)) S.almanac.push(f); }
