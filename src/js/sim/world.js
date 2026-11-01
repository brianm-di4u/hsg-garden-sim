// The garden map: Garvan Woodland Gardens on its Lake Hamilton peninsula, built from data (rectangles and
// polylines), so positions can be corrected by editing the tables below. Pure data, no DOM.
// Layout follows research/garvan-layout.md (OpenStreetMap positions and visitor walk-throughs): the peninsula points
// west, visitors arrive from the east, the chapel sits outside the gate by the parking lot. Distances are
// compressed (about 11 m per tile) and places whose exact position was not found are placed plausibly.
import { hash, stream, rnd, chance, pick } from './rng.js';
import { PLANTS, TULIP_COLORS } from './data.js';

export const W = 120;
export const H = 90;
export const G = { GRASS: 0, FOREST: 1, PATH: 2, ROAD: 3, WATER: 4, DEEP: 5, POND: 6, STREAM: 7, BRIDGE: 8, BOARDWALK: 9, ROCK: 10, SAND: 11, RAIL: 12, LAWN: 13, STONE: 14, BED: 15, PARKING: 16, GORGE: 17, GRAVEL: 18 };
const BLOCKING = new Set([G.WATER, G.DEEP, G.POND, G.STREAM, G.ROCK, G.GORGE]);
export const groundBlocks = (g) => BLOCKING.has(g);
export const isWater = (g) => g === G.WATER || g === G.DEEP || g === G.POND || g === G.STREAM;
export const isPaved = (g) => g === G.PATH || g === G.ROAD || g === G.BRIDGE || g === G.BOARDWALK || g === G.STONE || g === G.PARKING || g === G.GRAVEL;
// Ground the visitors see as "the path" (litter and leaves there count most).
export const isWalkway = (g) => isPaved(g) || g === G.LAWN;

// ---------- zones ----------
// Priority order: the first rectangle containing a tile names its zone. visitor: counts toward the Garden Rating.
export const ZONES = [
  { id: 'yard', name: 'Maintenance yard', r: [98, 58, 119, 89] },
  { id: 'parking', name: 'Parking lot', r: [95, 42, 119, 57], visitor: true },
  { id: 'chapel', name: 'Anthony Chapel', r: [94, 21, 119, 41], visitor: true, sign: 'chapel' },
  { id: 'welcome', name: 'Welcome Center and Bonsai Garden', r: [78, 45, 94, 56], visitor: true, sign: 'welcome' },
  { id: 'cafe', name: 'Chipmunk Café and Train Garden', r: [76, 29, 94, 44], visitor: true, sign: 'train' },
  { id: 'pavilion', name: 'Garvan Pavilion and Sensory Garden', r: [69, 36, 77, 48], visitor: true, sign: 'pavilion' },
  { id: 'lawn', name: 'Great Lawn and Amphitheater', r: [46, 34, 68, 52], visitor: true, sign: 'klipsch' },
  { id: 'pinewind', name: 'Garden of the Pine Wind', r: [57, 53, 82, 78], visitor: true, sign: 'pinewind' },
  { id: 'southern', name: 'Southern Inspiration Garden', r: [41, 53, 56, 68], visitor: true },
  { id: 'children', name: 'Children\'s Adventure Garden', r: [55, 16, 72, 34], visitor: true, sign: 'children' },
  { id: 'canopy', name: 'Singing Springs Gorge', r: [34, 12, 54, 36], visitor: true, sign: 'canopy' },
  { id: 'perry', name: 'Perry Wildflower Overlook', r: [0, 26, 26, 66], visitor: true, sign: 'perry' },
  { id: 'hixson', name: 'Hixson Nature Preserve', r: [28, 0, 94, 22], visitor: true, sign: 'hixson' },
  { id: 'woods', name: 'Woodland Walk', r: [0, 0, 119, 89], visitor: true },
];
export const ZONE_INDEX = Object.fromEntries(ZONES.map((z, i) => [z.id, i]));
export const zoneOfIndex = (i) => ZONES[i];
const DEVELOPED = new Set(['parking', 'chapel', 'welcome', 'cafe', 'pavilion', 'lawn', 'pinewind', 'southern', 'children', 'perry', 'yard']);

// ---------- the shoreline ----------
// The peninsula's north and south shores close in toward the west and meet near x = 6 (Perry Point).
// East of x = 100 is the mainland. Returns true for land.
export function landAt(x, y) {
  if (x >= 100) return y >= 1 && y <= H - 2;
  const wob = Math.sin(x * 0.33) * 1.3 + Math.sin(x * 0.11 + 2) * 1.6 + ((hash(x >> 1, 'shore') % 100) / 100 - 0.5) * 0.9;
  const wob2 = Math.sin(x * 0.29 + 1) * 1.4 + Math.sin(x * 0.13) * 1.5 + ((hash(x >> 1, 'shore2') % 100) / 100 - 0.5) * 0.9;
  let top = 3 + (100 - x) * 0.22 + wob, bot = 87 - (100 - x) * 0.3 + wob2;
  if (x < 16) { const k = (16 - x) * (16 - x) * 0.16; top += k; bot -= k; }
  // The mouth of Singing Springs Gorge opens a small cove on the north shore.
  if (x >= 42 && x <= 47) top += 1.5;
  return y >= top && y <= bot;
}

// ---------- paths (polylines in tile coordinates) ----------
// The visitor loop in the walking order of the research notes, from the parking lot through the Welcome
// Center gate and back.
export const LOOP = [[104, 50], [96, 50], [90, 50], [84, 50], [80, 52], [78, 55], [75, 57], [71, 58], [66, 59], [61, 60], [57, 60], [52, 59], [47, 56],
  [40, 52], [33, 48], [26, 46], [19, 45], [14, 44], [14, 41], [19, 37], [25, 33], [31, 30], [37, 30], [41, 30], [51, 30], [55, 29], [59, 30],
  [62, 33], [65, 35], [68, 37], [69, 41], [70, 44], [74, 44], [78, 44], [82, 42], [84, 41], [84, 47], [86, 50], [96, 50], [104, 50]];
// A short stroll and the Holiday Lights route: gate, promenade, Great Lawn, Pavilion, Café.
export const SHORT = [[104, 50], [96, 50], [90, 50], [84, 49], [74, 49], [64, 49], [60, 46], [62, 43], [66, 44], [70, 44], [74, 44], [78, 44], [82, 42], [84, 41], [84, 47], [86, 50], [96, 50], [104, 50]];
export const LIGHTS_ROUTE = SHORT;
const PROMENADE = [[84, 49], [58, 49]];
const CHAPEL_WALK = [[106, 44], [106, 37]];
const CELEBRATION_WALK = [[104, 40], [101, 37]];
const AMPHI_WALK = [[58, 49], [55, 46], [53, 43]];
const TREEHOUSE_WALK = [[60, 30], [60, 23]];
const KOI_WALK = [[71, 58], [73, 62], [74, 65]];
const BIRDSONG = [[60, 26], [62, 18], [68, 12], [75, 14], [77, 19], [71, 22], [64, 24], [60, 26]];
const SHORE_TRAIL = [[60, 72], [50, 69], [40, 64], [31, 58], [23, 54], [17, 50], [14, 46]];
const CAMELLIA_TRAIL = [[40, 52], [37, 45], [35, 38], [34, 31]];
const SERVICE = [[106, 57], [106, 62]];
const SERVICE_WEST = [[103, 67], [92, 67], [84, 63], [79, 57]];
const ROAD_IN = [[119, 48], [113, 48]];
// Streams: in the Pine Wind ravine a cascade falls from the waterfall under the Full Moon Bridge into the koi pond, a
// spring-fed stream runs in from the east under the Sunrise Bridge, and the outlet passes under the Floating Cloud
// Bridge on its way to the lake. Singing Springs runs north down its gorge; a small run spills from the Children's
// Garden waterfall. (Which bridge crosses which stream is a game choice.)
const PINE_CASCADE = [[71, 54], [69, 57], [68, 61]];
const PINE_STREAM = [[81, 67], [77, 66], [73, 64], [70, 64]];
const PINE_OUTLET = [[63, 67], [61, 70], [60, 76]];
const SPRINGS = [[46, 37], [45, 32], [45, 26], [44, 20], [44, 12]];
const KIDS_RUN = [[61, 26], [62, 29], [63, 31]];
const POND = { cx: 66.5, cy: 64.5, rx: 3.6, ry: 2.7 };

// ---------- beds and display markers ----------
// Tulip beds (rectangles, or a ring): one tile = about 1,000 bulbs (game scale), so the beds hold roughly the
// garden's 150,000 tulips.
export const TULIP_BEDS = [
  { id: 'gate', name: 'Welcome Center beds', r: [86, 52, 95, 54] },
  { id: 'promenade', name: 'Dierks Promenade beds', r: [60, 51, 76, 52] },
  { id: 'border', name: 'Pavilion flowering border', r: [70, 46, 77, 47] },
  { id: 'southernN', name: 'Southern Inspiration beds (north)', r: [50, 55, 56, 56] },
  { id: 'southernS', name: 'Southern Inspiration beds (south)', r: [47, 62, 56, 63] },
  { id: 'celebration', name: 'Evans Celebration Garden ring', ring: [100, 32, 2, 3.2] },
];
// Perennial beds (mulch, weeds, shrubs).
const SHRUB_BEDS = [[77, 39, 82, 42], [88, 40, 93, 41], [96, 44, 97, 49], [101, 41, 104, 42], [108, 37, 112, 38], [42, 57, 45, 62], [56, 41, 57, 46],
  [66, 31, 69, 32], [79, 46, 82, 47]];
// Display markers: where each Holiday Lights or Fall in the Woodlands piece goes. Nudged to free ground at build.
const HL_SPOTS = [
  ['rose', 'hl:rose', 63, 43], ['gallery1', 'hl:rose', 60, 41], ['gallery2', 'hl:rose', 66, 41],
  ...[59, 60, 61, 62, 63, 64, 65, 66].map((x, i) => ['blossom' + i, 'hl:blossom', x, 46]),
  ...[68, 71, 74, 77].map((x, i) => ['arch' + i, 'hl:arch', x, 49]),
  ['pole0', 'hl:pole', 82, 47], ['pole1', 'hl:pole', 94, 47], ['pole2', 'hl:pole', 77, 53], ['pole3', 'hl:pole', 70, 56], ['pole4', 'hl:pole', 57, 47],
  ['pole5', 'hl:pole', 68, 46], ['pole6', 'hl:pole', 80, 40], ['pole7', 'hl:pole', 90, 38], ['pole8', 'hl:pole', 64, 36], ['pole9', 'hl:pole', 76, 46],
  ['set0', 'hl:set', 82, 50], ['set1', 'hl:set', 102, 44], ['set2', 'hl:set', 78, 37], ['set3', 'hl:set', 92, 39], ['set4', 'hl:set', 64, 30], ['set5', 'hl:set', 73, 61],
  ['cocoa', 'hl:cocoa', 80, 48],
];
// Trees wrapped in lights (a tree is planted on each spot at the start).
const WRAP_SPOTS = [[58, 44], [68, 39], [57, 39], [69, 47], [78, 48], [92, 45], [80, 54], [74, 55], [62, 57], [67, 56], [86, 43], [97, 46]];
const FALL_SPOTS = [
  ['mum0', 'fd:mums', 83, 48], ['mum1', 'fd:mums', 95, 49], ['mum2', 'fd:mums', 77, 51], ['mum3', 'fd:mums', 69, 50], ['mum4', 'fd:mums', 59, 50],
  ['mum5', 'fd:mums', 72, 45], ['mum6', 'fd:mums', 81, 43], ['mum7', 'fd:mums', 105, 38], ['mum8', 'fd:mums', 74, 59], ['mum9', 'fd:mums', 53, 58],
  ['pump0', 'fd:pumpkins', 87, 52], ['pump1', 'fd:pumpkins', 62, 47], ['pump2', 'fd:pumpkins', 78, 45], ['pump3', 'fd:pumpkins', 87, 41], ['pump4', 'fd:pumpkins', 104, 39], ['pump5', 'fd:pumpkins', 72, 57],
];

// ---------- buildings ----------
// [type, id, label, x, y, w, h, place, sign]. Doors face south; `place` names the standing spot in front.
const BUILDINGS = [
  ['welcome', 'welcome', 'WELCOME CENTER', 86, 43, 8, 5, 'welcomeDoor'],
  ['cafe', 'cafe', 'CHIPMUNK CAFÉ', 84, 36, 5, 4, 'cafeDoor'],
  ['chapel', 'chapel', '', 103, 28, 6, 8, 'chapelFront'],
  ['carillon', 'carillon', '', 110, 30, 1, 3, null],
  ['brides', 'brides', '', 98, 37, 4, 3, null],
  ['grooms', 'grooms', '', 112, 24, 4, 3, null],
  ['pavilion', 'pavilion', '', 71, 38, 6, 5, 'pavilionFront'],
  ['treehouse', 'treehouse', '', 58, 19, 5, 4, 'treehouseFront'],
  ['restroom', 'restroom', '', 17, 48, 3, 2, null],
  ['barn', 'barn', 'MAINTENANCE', 104, 62, 6, 4, 'board'],
  ['greenhouse', 'greenhouse', 'GREENHOUSE', 111, 62, 5, 4, 'greenhouse'],
  ['storage', 'storage', 'LIGHTS STORAGE', 104, 69, 5, 3, 'storage'],
];

// ---------- build ----------
export function buildWorld(seed) {
  const g = new Uint8Array(W * H);
  const lake = new Uint8Array(W * H);
  const zone = new Uint8Array(W * H);
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, v) => { if (inb(x, y)) g[y * W + x] = v; };
  const get = (x, y) => (inb(x, y) ? g[y * W + x] : G.DEEP);
  const zoneId = (x, y) => ZONES[zone[y * W + x]].id;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let zi = ZONES.length - 1;
    for (let i = 0; i < ZONES.length; i++) { const r = ZONES[i].r; if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { zi = i; break; } }
    zone[y * W + x] = zi;
    if (!landAt(x, y)) { lake[y * W + x] = 1; set(x, y, G.WATER); }
    else set(x, y, DEVELOPED.has(ZONES[zi].id) ? G.GRASS : G.FOREST);
  }
  // Deep water away from the shore; a sandy and rocky margin where land meets the lake.
  const near = (x, y, r, f) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (f(x + i, y + j)) return true; return false; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (lake[k] && !near(x, y, 4, (a, b) => inb(a, b) && !lake[b * W + a])) g[k] = G.DEEP;
    else if (!lake[k] && near(x, y, 1, (a, b) => inb(a, b) && lake[b * W + a])) g[k] = (hash(x, y, 'shore') % 7 === 0) ? G.ROCK : G.SAND;
  }
  const fill = (x0, y0, x1, y1, v, only) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!only || only(get(x, y))) set(x, y, v); };
  const onLand = (v) => v !== G.WATER && v !== G.DEEP;
  const line = (pts, width, v, opt = {}) => {
    const o0 = width === 1 ? 0 : width === 3 ? -1 : 0, o1 = width === 1 ? 0 : width === 3 ? 1 : width - 1;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 4));
      for (let s = 0; s <= n; s++) {
        const px = Math.floor(ax + (bx - ax) * s / n), py = Math.floor(ay + (by - ay) * s / n);
        for (let dy = o0; dy <= o1; dy++) for (let dx = o0; dx <= o1; dx++) {
          const x = px + dx, y = py + dy, cur = get(x, y);
          if (opt.keep && opt.keep(cur)) continue;
          if ((cur === G.BRIDGE || cur === G.BOARDWALK) && v !== G.BOARDWALK) continue; // a later stroke never paves over a bridge
          if (!onLand(cur) && !opt.water) continue;
          if (opt.bridge && (cur === G.STREAM || cur === G.POND || cur === G.GORGE)) { set(x, y, opt.bridge); continue; }
          set(x, y, v);
        }
      }
    }
  };
  // Lawns and plazas.
  fill(58, 38, 68, 47, G.LAWN, onLand);              // Ellen Edmondson Great Lawn
  fill(70, 63, 76, 68, G.LAWN, onLand);              // Koi Pond Meadow
  fill(84, 48, 97, 51, G.STONE, onLand);             // Welcome Center plaza
  fill(70, 43, 77, 45, G.STONE, onLand);             // Pavilion terrace
  fill(9, 41, 15, 47, G.STONE, onLand);              // Perry Overlook flagstone terrace
  for (let y = 37; y <= 45; y++) for (let x = 48; x <= 56; x++) { // Klipsch Amphitheater: flagstone rows in a hollow
    if (Math.hypot((x - 52) * 0.8, y - 44) > 7.5) continue;
    set(x, y, y % 2 ? G.STONE : G.GRASS);
  }
  { const cx = 100, cy = 32; for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= 3.4) set(x, y, d <= 1.8 ? G.LAWN : G.LAWN); } } // Celebration Garden lawn
  fill(96, 42, 114, 56, G.PARKING, onLand);
  fill(102, 59, 117, 74, G.GRAVEL, onLand);          // maintenance yard
  // Beds.
  const beds = [];
  for (const b of TULIP_BEDS) {
    const tiles = [];
    if (b.ring) { const [cx, cy, r0, r1] = b.ring; for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) { const d = Math.hypot(x - cx, y - cy); if (d >= r0 && d <= r1) tiles.push([x, y]); } }
    else { const [x0, y0, x1, y1] = b.r; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push([x, y]); }
    beds.push({ ...b, tiles });
    for (const [x, y] of tiles) if (onLand(get(x, y))) set(x, y, G.BED);
  }
  for (const [x0, y0, x1, y1] of SHRUB_BEDS) fill(x0, y0, x1, y1, G.BED, onLand);
  // Streams, pond, gorge.
  const SPR = new Set();
  line(PINE_CASCADE, 1, G.STREAM); line(PINE_STREAM, 1, G.STREAM); line(PINE_OUTLET, 1, G.STREAM); line(KIDS_RUN, 1, G.STREAM);
  for (let y = 58; y <= 70; y++) for (let x = 60; x <= 73; x++) if (((x + 0.5 - POND.cx) / POND.rx) ** 2 + ((y + 0.5 - POND.cy) / POND.ry) ** 2 <= 1) set(x, y, G.POND);
  for (let y = 13; y <= 37; y++) for (let x = 41; x <= 49; x++) if (Math.abs(x - (44.6 + (37 - y) * -0.04)) <= 2.2 && onLand(get(x, y))) set(x, y, G.GORGE);
  line(SPRINGS, 1, G.STREAM, { water: true, keep: (v) => v === G.WATER || v === G.DEEP });
  for (const [x, y] of [[60, 26], [61, 27], [62, 30]]) { set(x, y, G.POND); SPR.add(x + ',' + y); } // wading pools
  // Paths (bridges where they cross water).
  line(PROMENADE, 2, G.STONE);
  line(LOOP, 2, G.PATH, { bridge: G.BRIDGE, keep: (v) => v === G.STONE || v === G.PARKING });
  line([[41, 30], [51, 30]], 2, G.BOARDWALK, { bridge: G.BOARDWALK });  // Millsap Canopy Bridge
  line(SHORT, 2, G.PATH, { bridge: G.BRIDGE, keep: (v) => v === G.STONE || v === G.PARKING || v === G.LAWN });
  line(CHAPEL_WALK, 2, G.STONE); line(CELEBRATION_WALK, 1, G.STONE);
  line(AMPHI_WALK, 2, G.STONE, { keep: (v) => v === G.LAWN });
  line(TREEHOUSE_WALK, 2, G.PATH, { bridge: G.BRIDGE });
  line(KOI_WALK, 1, G.STONE, { bridge: G.BRIDGE });
  line(BIRDSONG, 1, G.PATH, { bridge: G.BRIDGE });
  line(SHORE_TRAIL, 1, G.PATH, { bridge: G.BRIDGE });
  line(CAMELLIA_TRAIL, 1, G.PATH, { bridge: G.BRIDGE });
  line(SERVICE, 2, G.GRAVEL); line(SERVICE_WEST, 2, G.GRAVEL, { bridge: G.BRIDGE, keep: (v) => v === G.STONE || v === G.PATH });
  line(ROAD_IN, 2, G.ROAD);
  // Model-train track: a G-scale loop in the train garden behind the Welcome Center.
  for (let y = 32; y <= 36; y++) for (let x = 77; x <= 83; x++) if ((y === 32 || y === 36 || x === 77 || x === 83) && onLand(get(x, y))) set(x, y, G.RAIL);
  // Boulders in the Japanese garden ravine and along the gorge rim.
  const r0 = stream(seed, 'boulders');
  for (let i = 0; i < 26; i++) { const x = 60 + Math.floor(rnd(r0) * 20), y = 55 + Math.floor(rnd(r0) * 16); if (get(x, y) === G.GRASS) set(x, y, G.ROCK); }

  // Buildings.
  const buildings = [];
  const places = {};
  for (const [type, id, label, x, y, w, h, place] of BUILDINGS) {
    const door = { x: x + Math.floor(w / 2), y: y + h - 1 };
    const b = { type, id, label, x, y, w, h, door, front: { x: door.x, y: door.y + 1 }, place };
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (get(xx, yy) === G.WATER || get(xx, yy) === G.DEEP) set(xx, yy, G.GRASS);
    const f = b.front; if (!isPaved(get(f.x, f.y))) set(f.x, f.y, G.STONE);
    buildings.push(b);
    if (place) places[place] = { ...b.front };
  }
  // Named standing points (staff schedules, visitors, tests).
  Object.assign(places, {
    welcomeFront: { x: 89, y: 49 }, cafeFront: { x: 86, y: 41 }, pavilionFront: { x: 74, y: 44 }, lawnEast: { x: 69, y: 44 },
    pinewindPath: { x: 72, y: 58 }, childrenPath: { x: 59, y: 30 }, trainYard: { x: 80, y: 38 }, perry: { x: 13, y: 44 },
    gate: { x: 84, y: 50 }, start: { x: 107, y: 67 }, staffLot: { x: 116, y: 76 }, koi: { x: 74, y: 65 }, canopy: { x: 46, y: 30 },
    amphitheater: { x: 53, y: 43 }, southern: { x: 52, y: 59 }, hixson: { x: 68, y: 13 }, chapel: { x: 106, y: 37 },
  });
  for (const p of Object.values(places)) if (groundBlocks(get(p.x, p.y))) set(p.x, p.y, G.PATH);
  const bmask = new Set();
  const taken = new Set();
  for (const p of Object.values(places)) { taken.add(p.x + ',' + p.y); taken.add(p.x + ',' + (p.y - 1)); }
  for (const b of buildings) for (let yy = b.y - 1; yy <= b.y + b.h; yy++) for (let xx = b.x - 1; xx <= b.x + b.w; xx++) bmask.add(xx + ',' + yy);
  const freeAt = (x, y, ok) => !bmask.has(x + ',' + y) && !taken.has(x + ',' + y) && ok(get(x, y));
  const nudge = (x, y, ok) => { for (let r = 0; r < 5; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (freeAt(x + i, y + j, ok)) return [x + i, y + j]; return [x, y]; };
  const soft = (v) => v === G.GRASS || v === G.LAWN || v === G.FOREST;
  // Fixed objects (rebuilt with the map, not saved): plaques, feeders, venues, the Fairy Village, the pergola.
  const fixed = [];
  const addFixed = (o, ok = soft) => { const [x, y] = nudge(o.x, o.y, ok); if (taken.has(x + ',' + y)) return; taken.add(x + ',' + y); fixed.push({ ...o, x, y }); };
  for (const [k, x, y] of [['welcome', 95, 52], ['chapel', 108, 39], ['pavilion', 69, 42], ['pinewind', 79, 58], ['bonsai', 85, 53], ['canopy', 52, 32],
    ['children', 57, 32], ['hixson', 61, 22], ['perry', 16, 43], ['train', 84, 33], ['klipsch', 57, 42], ['history', 98, 51]]) addFixed({ t: 'sign', k, x, y });
  for (const [x, y] of [[63, 17], [71, 11], [77, 16], [66, 23]]) addFixed({ t: 'feeder', x, y });
  addFixed({ t: 'venue', k: 'chapel', x: 104, y: 37 }, (v) => soft(v) || v === G.STONE);
  addFixed({ t: 'venue', k: 'pergola', x: 80, y: 45 }, (v) => soft(v) || v === G.BED);
  addFixed({ t: 'venue', k: 'koi', x: 75, y: 66 });
  addFixed({ t: 'pergola', x: 81, y: 45 }, (v) => soft(v) || v === G.BED);
  addFixed({ t: 'fairy', x: 67, y: 21 });
  // Benches along the path west to Perry Point (a run of benches is mapped there).
  for (const [x, y] of [[24, 48], [30, 50], [36, 53], [44, 57], [20, 47]]) addFixed({ t: 'bench', x, y });
  addFixed({ t: 'falls', x: 72, y: 54 }, (v) => soft(v) || v === G.ROCK);
  addFixed({ t: 'falls', x: 60, y: 25 }, (v) => soft(v) || v === G.ROCK);
  // Display markers.
  const markers = [];
  const addMarker = (id, item, x, y, show, ok) => { const [mx, my] = nudge(x, y, ok); taken.add(mx + ',' + my); markers.push({ id, item, x: mx, y: my, show }); };
  for (const [id, item, x, y] of HL_SPOTS) addMarker(id, item, x, y, 'hl', item === 'hl:arch' ? (v) => isPaved(v) : (v) => soft(v));
  const wraps = [];
  for (const [x, y] of WRAP_SPOTS) { const [mx, my] = nudge(x, y, soft); taken.add(mx + ',' + my); wraps.push({ x: mx, y: my }); markers.push({ id: 'wrap' + wraps.length, item: 'wrap', x: mx, y: my, show: 'hl', wrap: true }); }
  for (const [id, item, x, y] of FALL_SPOTS) addMarker(id, item, x, y, 'fall', soft);
  // Lamps: low LED path lights along the promenade, the plaza, the chapel walk and the parking lot.
  const lamps = [];
  for (let x = 60; x <= 82; x += 4) lamps.push({ x: x + 0.5, y: 48.6, k: 'led', post: true });
  for (let x = 86; x <= 96; x += 5) lamps.push({ x: x + 0.5, y: 51.9, k: 'led', post: true });
  for (let y = 38; y <= 44; y += 3) lamps.push({ x: 105.4, y: y + 0.5, k: 'led', post: true });
  for (let x = 99; x <= 112; x += 6) for (const y of [45.5, 53.5]) lamps.push({ x: x + 0.5, y, k: 'led', post: true });
  for (const b of buildings) if (b.place) lamps.push({ x: b.front.x + 0.5, y: b.front.y - 0.3, k: 'led', door: true });
  const routes = { loop: LOOP, short: SHORT, lights: LIGHTS_ROUTE };
  return { W, H, g, lake, zone, buildings, places, fixed, lamps, markers, wraps, beds, routes, special: {}, pools: SPR, zoneId };
}

// ---------- plantings ----------
// The permanent plants and the woods, placed once for a new game from a seeded stream. Objects:
// { t: 'plant', k: plant id, c: colour index, hp: health 0-100 } and { t: 'tree', k } (trees are plants too, but
// drawn by the tree renderer). Rocks are boulders.
const ZONE_MIX = {
  welcome: ['azalea', 'camellia', 'azalea', 'rose', 'daffodil'], cafe: ['hydrangea', 'daylily', 'azalea', 'daffodil'],
  pinewind: ['azalea', 'azalea', 'peony', 'fern', 'camellia', 'fern'], southern: ['rose', 'daylily', 'hydrangea', 'camellia', 'azalea'],
  canopy: ['hydrangea', 'fern', 'rhododendron', 'fern', 'hydrangea'], children: ['fern', 'azalea', 'daylily', 'fern'],
  lawn: ['azalea', 'daffodil', 'conifer'], pavilion: ['rose', 'daylily', 'hydrangea', 'azalea'], chapel: ['azalea', 'camellia', 'hydrangea', 'daffodil'],
  perry: ['wildflower', 'wildflower', 'wildflower'], parking: ['azalea', 'daylily'],
};
const ZONE_TREES = {
  welcome: ['magnolia', 'dogwood', 'pine'], cafe: ['oak', 'dogwood', 'pine'], pinewind: ['jmaple', 'jmaple', 'pine', 'jmaple', 'dogwood'],
  southern: ['magnolia', 'dogwood', 'redbud'], canopy: ['pine', 'oak', 'hickory', 'dogwood'], children: ['oak', 'pine', 'dogwood'],
  lawn: ['dogwood', 'redbud', 'magnolia', 'oak'], pavilion: ['magnolia', 'dogwood'], chapel: ['pine', 'pine', 'oak', 'dogwood'],
  perry: ['pine', 'oak'], parking: ['oak', 'pine'], yard: ['pine'], hixson: ['oak', 'pine', 'hickory', 'pine'], woods: ['pine', 'oak', 'pine', 'hickory'],
};
export function gardenPlantings(world, seed) {
  const r = stream(seed, 'plantings');
  const objs = {};
  const { g } = world;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? G.DEEP : g[y * W + x]);
  const occupied = new Set();
  for (const b of world.buildings) for (let y = b.y - 1; y <= b.y + b.h; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) occupied.add(x + ',' + y);
  for (const f of world.fixed) occupied.add(f.x + ',' + f.y);
  for (const m of world.markers) if (!m.wrap) occupied.add(m.x + ',' + m.y);
  for (const p of Object.values(world.places)) { occupied.add(p.x + ',' + p.y); occupied.add(p.x + ',' + (p.y - 1)); }
  const tulipTiles = new Set(world.beds.flatMap((b) => b.tiles.map(([x, y]) => x + ',' + y)));
  const nearPaved = (x, y, d) => { for (let j = -d; j <= d; j++) for (let i = -d; i <= d; i++) { const v = at(x + i, y + j); if (v === G.PATH || v === G.STONE || v === G.BRIDGE || v === G.BOARDWALK) return true; } return false; };
  const touchesWalk = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => { const v = at(x + i, y + j); return v === G.PATH || v === G.STONE || v === G.BRIDGE || v === G.BOARDWALK || v === G.PARKING; });
  const put = (x, y, o) => { const k = x + ',' + y; if (occupied.has(k) || objs[k]) return false; objs[k] = o; return true; };
  const plant = (k) => ({ t: 'plant', k, c: Math.floor(rnd(r) * 4), hp: 80 + Math.floor(rnd(r) * 20) });
  const tree = (k) => ({ t: 'tree', k, hp: 100 });
  // Wrapped trees for Holiday Lights.
  for (const w of world.wraps) objs[w.x + ',' + w.y] = tree(pick(r, ['oak', 'dogwood', 'magnolia']));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = at(x, y), k = x + ',' + y;
    if (occupied.has(k) || objs[k] || tulipTiles.has(k)) continue;
    const zid = world.zoneId(x, y);
    if (v === G.FOREST) {
      const n = rnd(r);
      const shore = zid === 'hixson' && [[0, -2], [0, -3], [-2, 0], [2, 0]].some(([i, j]) => at(x + i, y + j) === G.SAND || at(x + i, y + j) === G.WATER);
      if (touchesWalk(x, y)) { if (n < 0.08 && (zid === 'woods' || zid === 'hixson')) put(x, y, plant('camellia')); continue; }
      if (n < 0.42) put(x, y, tree(shore && chance(r, 0.6) ? 'cypress' : pick(r, ZONE_TREES[zid] || ZONE_TREES.woods)));
      else if (n < 0.47 && zid === 'canopy' && nearPaved(x, y, 3)) put(x, y, plant(pick(r, ['fern', 'hydrangea'])));
      else if (n < 0.475) put(x, y, plant('privet'));
      else if (n < 0.49) put(x, y, { t: 'rock' });
    } else if (v === G.BED) {
      if (rnd(r) < 0.5) put(x, y, plant(pick(r, ZONE_MIX[zid] || ['azalea'])));
    } else if (v === G.GRASS) {
      if (touchesWalk(x, y)) { if (rnd(r) < 0.18 && ZONE_MIX[zid]) { const p = pick(r, ZONE_MIX[zid]); if (PLANTS[p].size === 'low') put(x, y, plant(p)); } continue; }
      const n = rnd(r);
      const mix = ZONE_MIX[zid], trees = ZONE_TREES[zid];
      if (zid === 'perry') { if (n < 0.5 && x >= 12 && y >= 33 && y <= 52) put(x, y, plant('wildflower')); else if (n < 0.58) put(x, y, tree(pick(r, trees))); continue; }
      if (zid === 'yard' || zid === 'parking') { if (n < 0.08) put(x, y, tree(pick(r, trees))); continue; }
      if (n < 0.16 && trees) put(x, y, tree(pick(r, trees)));
      else if (n < 0.32 && mix && nearPaved(x, y, 3)) put(x, y, plant(pick(r, mix)));
      else if (n < 0.34) put(x, y, { t: 'rock' });
    }
  }
  // Signature plantings: cloud-clipped white azaleas by the Floating Cloud Bridge, Japanese maples round the koi
  // pond, camellias along the camellia trail, bonsai on their benches, conifers on the lawn's north edge.
  for (const [x, y] of [[59, 69], [60, 68], [64, 70], [65, 71], [62, 71]]) if (at(x, y) === G.GRASS) objs[x + ',' + y] = { t: 'plant', k: 'azalea', c: 1, hp: 100, cloud: true };
  for (const [x, y] of [[62, 61], [71, 62], [69, 68], [63, 66], [75, 60], [60, 63]]) if (at(x, y) === G.GRASS && !occupied.has(x + ',' + y)) objs[x + ',' + y] = tree('jmaple');
  for (let y = 31; y <= 52; y += 2) for (const dx of [-1, 1]) { const x = Math.round(40 - (52 - y) * 0.27) + dx; if (at(x, y) === G.FOREST || at(x, y) === G.GRASS) objs[x + ',' + y] = { t: 'plant', k: 'camellia', c: (x + y) % 3, hp: 95 }; }
  for (const [x, y] of [[80, 53], [81, 53], [82, 53], [80, 55], [81, 55], [82, 55], [83, 54]]) if (!occupied.has(x + ',' + y) && at(x, y) !== G.PATH && at(x, y) !== G.STONE) { objs[x + ',' + y] = { t: 'plant', k: 'bonsai', c: 0, hp: 90 }; }
  for (let x = 58; x <= 68; x += 2) if (at(x, 37) !== G.PATH && !occupied.has(x + ',37')) objs[x + ',37'] = { t: 'plant', k: 'conifer', c: 0, hp: 100 };
  return objs;
}

// The tulip design for a bed tile: a colour key, by bed and year (string lines, a new theme every year).
const THEMES = [
  (i, j) => (Math.floor(i / 2) % 3),                               // stripes
  (i, j) => ((i + j) % 3 === 0 ? 0 : (i + 2 * j) % 5 < 2 ? 1 : 2),  // diagonal ribbons
  (i, j) => ((i ^ j) & 1 ? 1 : (i % 4 === 0 ? 2 : 0)),              // checks with bars
  (i, j, cx, cy) => Math.floor(Math.hypot(i - cx, j - cy) * 0.9) % 3, // rings
];
const PALETTES = [['red', 'yellow', 'white'], ['pink', 'purple', 'white'], ['orange', 'yellow', 'red'], ['purple', 'yellow', 'pink'], ['white', 'red', 'pink']];
export function tulipDesign(bed, x, y, year) {
  const xs = bed.tiles.map((t) => t[0]), ys = bed.tiles.map((t) => t[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), cx = (Math.max(...xs) - x0) / 2, cy = (Math.max(...ys) - y0) / 2;
  const th = THEMES[(year + bed.id.length) % THEMES.length];
  const pal = PALETTES[(year * 2 + bed.id.length) % PALETTES.length];
  return pal[th(x - x0, y - y0, cx, cy)];
}
export const TULIP_KEYS = Object.keys(TULIP_COLORS);
