// Seasonal displays: Holiday Lights and Fall in the Woodlands. Each piece has a marked spot (world.markers) and
// moves through stored → set (installed, untested) → ok (lit and tested) / dark (fault) → stored again at
// teardown. An install crew (as at the real garden, where contractors do the heavy pieces) installs and strikes a
// few pieces each night; the player carries the rest, tests every piece and fixes faults during the run.
import * as D from './data.js';
import { stream, rnd, pick } from './rng.js';
import { key, toast, sound, emit, addItem, removeItem, count } from './core.js';
import { doy } from './calendar.js';

// Phase windows (day of year). Game choice informed by research/garvan-operations.md.
export const SHOWS = {
  hl: { name: 'Holiday Lights', install: [D.yd('fa', 5), D.yd('fa', 25)], live: [D.yd('fa', 26), D.yd('wi', 10)], strike: [D.yd('wi', 11), D.yd('wi', 19)], crewIn: 1, crewOut: 2 },
  fall: { name: 'Fall in the Woodlands', install: [D.yd('fa', 1), D.yd('fa', 5)], live: [D.yd('fa', 4), D.yd('fa', 25)], strike: [D.yd('fa', 26), D.yd('fa', 28)], crewIn: 2, crewOut: 2 },
};
export function phase(show, d) {
  const s = SHOWS[show];
  if (D.inWindow(s.install, d)) return D.inWindow(s.live, d) ? 'live' : 'install';
  if (D.inWindow(s.live, d)) return 'live';
  if (D.inWindow(s.strike, d)) return 'strike';
  return null;
}
export const pieceState = (S, id) => (S.disp[id] ? S.disp[id].st : 'stored');
export const isUp = (S, id) => !!S.disp[id];
export const lit = (S, m, d) => m.show === 'hl' && S.disp[m.id] && S.disp[m.id].st === 'ok' && (phase('hl', d) === 'live' || phase('hl', d) === 'install');

export function counts(gm, show) {
  const S = gm.S, out = { total: 0, up: 0, ok: 0, dark: 0, set: 0 };
  for (const m of gm.world.markers) {
    if (m.show !== show) continue;
    out.total++;
    const st = S.disp[m.id];
    if (!st) continue;
    out.up++; out[st.st]++;
  }
  return out;
}

// Use a display item on a tile.
export function placePiece(gm, m, itemId, record) {
  const S = gm.S, d = doy(S), ph = phase(m.show, d);
  if (m.item !== itemId) { toast(gm, `This spot is marked for a ${D.itemName(m.item).toLowerCase()}.`); return { none: true }; }
  if (ph !== 'install' && !(ph === 'live' && m.show === 'fall')) { toast(gm, `${SHOWS[m.show].name} pieces go out during the install window.`); return { none: true }; }
  if (S.disp[m.id]) { toast(gm, 'That piece is already in place.'); return { none: true }; }
  S.disp[m.id] = { st: m.show === 'fall' ? 'ok' : 'set' };
  record('install', null, 1);
  sound(gm, 'place');
  return { used: true, fx: 'spark', energy: 'place' };
}
// The light reel on a marker: wrap a tree (install), test a set piece, repair a dark one, or strike at teardown.
export function reelOn(gm, m, record) {
  const S = gm.S, d = doy(S), ph = phase(m.show, d), st = S.disp[m.id];
  if (ph === 'strike' && st) {
    delete S.disp[m.id];
    if (!m.wrap) addItem(S, m.item, 1);
    record('strike', null, 1); sound(gm, 'pickup');
    return { done: true, fx: 'spark', energy: 'reel' };
  }
  if (m.wrap && !st) {
    if (ph !== 'install') { toast(gm, 'Trees are wrapped during the Holiday Lights install (from mid-September).'); return { none: true }; }
    S.disp[m.id] = { st: 'set' };
    record('install', null, 1); sound(gm, 'place');
    return { done: true, fx: 'spark', energy: 'reel' };
  }
  if (!st) return null;
  if (st.st === 'set') {
    const r = stream(S.seed, 'test', m.id, S.day, S.time);
    st.st = rnd(r) < 0.12 ? 'dark' : 'ok';
    record('test', null, 1);
    if (st.st === 'dark') { toast(gm, 'A dead strand. Use the reel again to swap it.', 'warn'); sound(gm, 'nope'); }
    else sound(gm, 'quest');
    return { done: true, fx: 'spark', energy: 'reel' };
  }
  if (st.st === 'dark') { st.st = 'ok'; record('repair', null, 1); sound(gm, 'quest'); return { done: true, fx: 'spark', energy: 'reel' }; }
  if (st.st === 'ok') { toast(gm, m.show === 'hl' ? 'Lit and working.' : 'Looking good.'); return { done: true }; }
  return null;
}

// Pieces still to place for the shows in their install windows, handed out at Lights Storage (ten per trip).
export function takeFromStorage(gm) {
  const S = gm.S, d = doy(S);
  const want = {};
  for (const m of gm.world.markers) {
    if (m.wrap || S.disp[m.id]) continue;
    const ph = phase(m.show, d);
    if (ph !== 'install' && !(ph === 'live' && m.show === 'fall')) continue;
    want[m.item] = (want[m.item] || 0) + 1;
  }
  let given = 0;
  for (const [id, n] of Object.entries(want)) {
    const k = Math.max(0, Math.min(n - count(S, id), 10 - given));
    if (k > 0) { addItem(S, id, k); given += k; }
  }
  return given;
}
export function returnToStorage(gm) {
  const S = gm.S;
  let n = 0;
  for (const it of [...S.inv]) if (it && D.ITEMS[it.id] && D.ITEMS[it.id].kind === 'display') { n += it.n; removeItem(S, it.id, it.n); }
  return n;
}

// Overnight: the crew's work and the night's faults.
export function nightly(gm, sum) {
  const S = gm.S, d = doy(S);
  const r = stream(S.seed, 'crew', S.day);
  for (const show of ['hl', 'fall']) {
    const ph = phase(show, d), s = SHOWS[show];
    const mine = gm.world.markers.filter((m) => m.show === show);
    if (ph === 'install') {
      const left = mine.filter((m) => !S.disp[m.id] && !m.wrap && !(m.item === 'hl:blossom' || m.item === 'fd:mums'));
      for (let i = 0; i < s.crewIn && left.length; i++) { const m = left.splice(Math.floor(rnd(r) * left.length), 1)[0]; S.disp[m.id] = { st: 'ok', crew: true }; sum.crew = (sum.crew || 0) + 1; }
    }
    if (ph === 'strike') {
      const up = mine.filter((m) => S.disp[m.id]);
      for (let i = 0; i < s.crewOut && up.length; i++) { const m = up.splice(Math.floor(rnd(r) * up.length), 1)[0]; delete S.disp[m.id]; sum.crewOut = (sum.crewOut || 0) + 1; }
    }
    // After the teardown window the crew clears whatever is left.
    if (!ph) for (const m of mine) if (S.disp[m.id]) { delete S.disp[m.id]; sum.leftover = (sum.leftover || 0) + 1; }
    // Faults during the run (lights only): weather is hard on the strands.
    if (show === 'hl' && ph === 'live') {
      const p = S.weather === 'rain' || S.weather === 'ice' || S.weather === 'storm' ? 0.08 : 0.035;
      for (const m of mine) { const st = S.disp[m.id]; if (st && st.st === 'ok' && rnd(r) < p) { st.st = 'dark'; sum.dark = (sum.dark || 0) + 1; } }
    }
  }
}
