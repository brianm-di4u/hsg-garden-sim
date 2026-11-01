#!/usr/bin/env node
// Balance check: runs the real sim in Node for a full year with three players and reports the Garden Rating,
// money and goals.
//   node tools/balance.mjs [--years 1] [--seed 7]
// idle: clocks in and out, does nothing. steady: works through the board each day within an energy budget.
// keen: does the board and then tidies the busiest areas until out of energy.
// The bots act on tiles directly (no walking), so time costs are approximated by a per-action clock charge.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const sim = await import(pathToFileURL(path.join(here, '../src/js/sim/sim.js')).href);
const D = await import(pathToFileURL(path.join(here, '../src/js/sim/data.js')).href);
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? +args[i + 1] : d; };
const YEARS = arg('years', 1), SEED = arg('seed', 7);

const MIN_PER_ACTION = 4;
function act(gm, item, x, y) {
  const S = gm.S;
  if (S.energy < 3 || S.time > 1260) return false;
  const i = S.inv.findIndex((it) => it && it.id === item);
  if (i < 0) return false;
  S.sel = i;
  const r = sim.useItemAt(gm, x, y);
  S.time += MIN_PER_ACTION;
  gm.events.length = 0;
  return r && r.done;
}
const tiles = (obj) => Object.keys(obj).map((k) => k.split(',').map(Number));
function inVisitorZone(gm, x, y) { const z = sim.zoneAt(gm, x, y); return z.visitor && z.id !== 'woods' && z.id !== 'hixson'; }

function work(gm, keen) {
  const S = gm.S, d = sim.doy(S);
  S.time = 420;
  // Supplies.
  for (const e of sim.supplyList(gm)) sim.takeSupply(gm, e.id, e.max);
  if (S.wedding && !S.wedding.setup) { S.wedding.setup = true; sim.removeItem(S, 'kit', 1); }
  // Board orders first.
  for (const o of S.orders) {
    if (o.done) continue;
    let left = o.n - o.prog;
    const zoneOk = (x, y) => !o.zone || sim.zoneAt(gm, x, y).id === o.zone;
    const run = (item, list) => { for (const [x, y] of list) { if (left <= 0) break; if (zoneOk(x, y) && act(gm, item, x, y)) left--; } };
    switch (o.type) {
      case 'litter': run('grabber', tiles(S.litter)); break;
      case 'weed': run('trowel', tiles(S.weeds)); break;
      case 'rake': case 'koi': case 'track': run('rake', tiles(S.leaves)); break;
      case 'mow': run('mower', tiles(S.grass)); break;
      case 'mulch': run('straw', gm.bedTiles.map((k) => k.split(',').map(Number)).filter(([x, y]) => S.day - (S.mulch[x + ',' + y] ?? -999) > 60)); break;
      case 'water': case 'bonsai': S.can = 99; run('can', Object.entries(S.objs).filter(([, v]) => v.t === 'plant' && D.PLANTS[v.k].thirsty).map(([k]) => k.split(',').map(Number))); break;
      case 'prune': run('pruners', Object.entries(S.objs).filter(([, v]) => sim.needsPrune(v, d, sim.yearNo(S))).map(([k]) => k.split(',').map(Number))); break;
      case 'debris': case 'invasive': for (let i = 0; i < 2; i++) run('saw', Object.entries(S.objs).filter(([, v]) => v.t === 'limb' || v.k === 'privet').map(([k]) => k.split(',').map(Number))); break;
      case 'plantBulbs': for (const k of gm.tulipTiles) { if (left <= 0) break; if (S.beds[k]) continue; const [x, y] = k.split(',').map(Number); const c = sim.tulipDesign(gm.bedMap[k], x, y, sim.yearNo(S)); if (act(gm, 'bulb:' + c, x, y)) left--; } break;
      case 'pullBulbs': case 'pullAnnuals': run('trowel', tiles(S.beds)); break;
      case 'plantAnnuals': run('annuals', gm.tulipTiles.map((k) => k.split(',').map(Number))); break;
      case 'cover': run('cloth', tiles(S.beds)); break;
      case 'install': { sim.storageTake(gm); for (const m of gm.world.markers) { if (left <= 0) break; if (S.disp[m.id]) continue; if (m.wrap ? act(gm, 'reel', m.x, m.y) : act(gm, m.item, m.x, m.y)) left--; } sim.storageReturn(gm); break; }
      case 'test': case 'repair': case 'strike': for (const m of gm.world.markers) { if (left <= 0) break; const st = S.disp[m.id]; if (!st) continue; if (o.type === 'test' && st.st !== 'set') continue; if (o.type === 'repair' && st.st !== 'dark') continue; if (act(gm, 'reel', m.x, m.y)) left--; } sim.storageReturn(gm); break;
      case 'feeders': for (const f of gm.feeders) if (sim.count(S, 'seed')) sim.interactAt(gm, f.x, f.y); break;
      case 'fairy': { const f = gm.world.fixed.find((x) => x.t === 'fairy'); sim.interactAt(gm, f.x, f.y); break; }
    }
    gm.events.length = 0;
  }
  // Repair and test anything outstanding during the shows.
  for (const m of gm.world.markers) { const st = S.disp[m.id]; if (st && (st.st === 'dark' || st.st === 'set')) act(gm, 'reel', m.x, m.y); }
  if (keen) {
    // Snack, then sweep the visitor areas.
    if (S.money > 30) { S.money -= 9; S.energy = Math.min(S.maxEnergy, S.energy + 30); }
    for (const [x, y] of tiles(S.litter)) if (inVisitorZone(gm, x, y)) act(gm, 'grabber', x, y);
    for (const [x, y] of tiles(S.leaves)) if (inVisitorZone(gm, x, y) && sim.ground(gm, x, y) !== 0) act(gm, 'rake', x, y);
    for (const [x, y] of tiles(S.weeds)) act(gm, 'trowel', x, y);
    for (const [x, y] of tiles(S.grass)) if (S.grass[x + ',' + y] >= 2) act(gm, 'mower', x, y);
  }
  S.time = Math.max(S.time, 1080);
}

function run(kind) {
  const gm = sim.newGame({ seed: SEED });
  const S = gm.S;
  const ratings = [];
  for (let day = 0; day < D.YEAR_DAYS * YEARS; day++) {
    if (kind !== 'idle') work(gm, kind === 'keen');
    // Visitors: run the crowd for the opening hours.
    const h = sim.hours(S);
    if (h.mode !== 'closed') { S.time = h.open - 1; while (S.time < h.close + 40) sim.tick(gm, {}); }
    gm.events.length = 0;
    const sum = sim.sleep(gm);
    gm.events.length = 0;
    if (sum.rating != null) ratings.push(sum.rating);
    if (sum.yearEnd) {
      const r = sum.yearEnd;
      console.log(`  ${kind.padEnd(6)} year ${r.year}: rating ${r.rating}, orders ${r.orders}, goals ${r.passed}/4 — ${r.goals.map((g) => (g.done ? '✓' : '✗') + ' ' + g.text).join(' · ')}`);
    }
  }
  const avg = ratings.reduce((a, b) => a + b, 0) / Math.max(1, ratings.length);
  return { kind, avg: +avg.toFixed(2), min: Math.min(...ratings), max: Math.max(...ratings), money: S.money };
}

console.log(`Balance, seed ${SEED}, ${YEARS} year(s)`);
const out = ['idle', 'steady', 'keen'].map(run);
for (const r of out) console.log(`${r.kind.padEnd(7)} rating avg ${r.avg} (min ${r.min}, max ${r.max}) · money $${r.money}`);
const [idle, steady, keen] = out;
const ok = idle.avg < 2.8 && steady.avg >= 3 && keen.avg >= 3.6 && keen.avg > steady.avg - 0.05;
console.log(ok ? 'OK: idle play rates low, steady work rates well, keen work rates best.' : 'CHECK: ratings out of the target bands (idle < 2.8, steady ≥ 3.0, keen ≥ 3.6).');
process.exit(ok ? 0 : 1);
