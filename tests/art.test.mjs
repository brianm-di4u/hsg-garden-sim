// Painted art loads with no failures, the code-drawn art works with ?art=0, and a tour of the garden through the
// year for the visual review.
import { garden, yd } from './helpers.mjs';

export const tests = [
  {
    name: 'painted art loads with no failures',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { at: 'gate', time: 660 });
      await t.waitForStable();
      await t.page.waitForFunction(() => { const s = window.__game.getState(); return s.artPending === 0 && s.artLoaded >= s.artTotal; }, null, { timeout: 20000 });
      const s = await t.state();
      t.equal(s.artFailed.length, 0, `no asset failed to load (${s.artFailed.join(', ')})`);
      t.expect(s.painted.terrain && s.painted.people, 'painted terrain and people in use');
    },
  },
  {
    name: 'code-drawn fallback with ?art=0',
    url: 'index.html?art=0',
    async run(t) {
      await garden(t, { at: 'gate', time: 660 });
      const s = await t.state();
      t.equal(s.artLoaded, 0, 'no painted art requested');
      await t.shot('71-vector-fallback');
    },
  },
  {
    name: 'a year in the garden',
    viewports: ['desktop'],
    async run(t) {
      const tour = [
        ['72-tulips-welcome', { day: yd('sp', 6), at: 'gate', time: 640 }],
        ['73-azaleas-pinewind', { day: yd('sp', 15), at: 'pinewindPath', time: 700 }],
        ['74-chapel', { day: yd('sp', 15), at: 'chapel', time: 820 }],
        ['75-canopy-summer', { day: yd('su', 8), at: 'canopy', time: 760 }],
        ['76-perry', { day: yd('su', 20), at: 'perry', time: 1080 }],
        ['77-fall-color-koi', { day: yd('fa', 22), at: 'koi', time: 900 }],
        ['78-treehouse', { day: yd('fa', 22), at: 'childrenPath', time: 900 }],
        ['79-snow-lawn', { day: yd('wi', 15), at: 'lawnEast', time: 700, weather: 'snow' }],
        ['80-daffodils', { day: yd('wi', 24), at: 'gate', time: 640 }],
      ];
      for (const [name, o] of tour) {
        await garden(t, o);
        await t.waitForStable();
        await t.shot(name);
      }
    },
  },
];
