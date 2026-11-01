// Versioned saves. localStorage access is wrapped by the caller (main.js); this module only
// serializes, migrates and validates. Saves from the old farm game (v1) are not carried over.
import { VERSION } from './sim.js';

export const SAVE_KEY = 'garvan-save';
export const SETTINGS_KEY = 'garvan-settings';

// migrations[v] turns a version-v state into version v+1.
export const migrations = {};

export function serialize(S) {
  return JSON.stringify({ v: VERSION, savedAt: Date.now(), state: S });
}

export function migrate(state) {
  let s = state;
  let v = s.v ?? 0;
  if (v < 2) throw new Error('this save is from an older game');
  while (v < VERSION) {
    if (!migrations[v]) throw new Error('no migration from v' + v);
    s = migrations[v](s); v = s.v;
  }
  return s;
}

export function parse(text) {
  const o = JSON.parse(text);
  const s = migrate(o.state || o);
  validate(s);
  return s;
}

export function validate(s) {
  const need = ['seed', 'day', 'time', 'money', 'energy', 'player', 'inv', 'objs', 'npcs', 'orders', 'beds'];
  for (const k of need) if (s[k] == null) throw new Error('save is missing ' + k);
  if (!Array.isArray(s.inv)) throw new Error('bad inventory');
  // Fill fields added after a save was written.
  for (const k of ['weeds', 'leaves', 'litter', 'grass', 'mulch', 'covered', 'watered', 'disp', 'flags', 'peafowlInBeds', 'daystats']) s[k] = s[k] || {};
  for (const k of ['visitors', 'peafowl', 'almanac', 'ratingHist', 'yearsDone']) s[k] = s[k] || [];
  s.crs = s.crs || { rs: 1 };
  s.rate = s.rate || { sum: 0, n: 0 };
  s.stats = s.stats || { litter: 0, limbs: 0, bulbs: 0, orders: 0, visitors: 0 };
  s.tier = s.tier || 1;
  return s;
}
