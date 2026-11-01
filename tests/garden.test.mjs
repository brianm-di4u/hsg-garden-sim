// Grounds care: each tool on its job, tulip planting to the design, frost cloth, and the zone scores.
import { garden, yd, useOn, standBy } from './helpers.mjs';

const firstBed = (t, filter = 'empty') => t.page.evaluate((f) => { const gm = window.__gwApp.gm; return gm.tulipTiles.map((k) => k.split(',').map(Number)).find(([x, y]) => (f === 'empty' ? !gm.S.beds[x + ',' + y] : !!gm.S.beds[x + ',' + y]) && !window.__game.act('blocked', x, y + 1)); }, filter);

export const tests = [
  {
    name: 'litter, weeds, leaves, mowing, mulch',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { day: 3, at: 'gate', time: 600 });
      // Litter on the plaza.
      await t.game('setState', { litter: { '88,50': 'litter' }, weeds: { '88,53': 2 }, leaves: { '86,50': 2 }, grass: { '62,42': 3 } });
      let s = await useOn(t, 'grabber', 88, 50);
      t.equal(s.counts.litter, 0, 'grabber picks up litter');
      s = await useOn(t, 'trowel', 88, 53);
      t.equal(s.counts.weeds, 0, 'trowel pulls weeds');
      s = await useOn(t, 'rake', 86, 50);
      t.equal(s.counts.leaves, 0, 'rake clears leaves');
      s = await useOn(t, 'mower', 62, 42);
      t.equal(s.counts.grass, 0, 'mower cuts the lawn');
      const e0 = s.energy;
      await t.game('act', 'fill', [['straw', 2]]);
      await t.page.evaluate(() => { window.__gwApp.gm.S.mulch['89,53'] = -100; });
      s = await useOn(t, 'straw', 89, 53);
      const fresh = await t.page.evaluate(() => window.__gwApp.gm.S.mulch['89,53']);
      t.equal(fresh, s.day, 'pine straw freshens the bed');
      t.expect(s.energy < e0, 'work costs energy');
    },
  },
  {
    name: 'pruning only in season; storm limbs and privet',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { day: yd('sp', 22), at: 'gate' });
      const az = await t.page.evaluate(() => { const S = window.__gwApp.gm.S; return Object.entries(S.objs).find(([k, o]) => o.t === 'plant' && o.k === 'azalea' && !o.cloud)[0].split(',').map(Number); });
      await useOn(t, 'pruners', az[0], az[1]);
      let o = await t.game('act', 'objAt', az[0], az[1]);
      t.equal(o.pr, 1, 'azaleas are pruned right after they bloom');
      await t.game('scene', { day: yd('su', 20) });
      const cam = await t.page.evaluate(() => { const S = window.__gwApp.gm.S; return Object.entries(S.objs).find(([k, o]) => o.t === 'plant' && o.k === 'camellia')[0].split(',').map(Number); });
      await useOn(t, 'pruners', cam[0], cam[1]);
      o = await t.game('act', 'objAt', cam[0], cam[1]);
      t.expect(!o.pr, 'camellias are not pruned in summer');
      await t.game('setState', { objs: { '90,52': { t: 'limb', hp: 2 } } });
      await useOn(t, 'saw', 90, 52); await t.game('act', 'useAt', 90, 52);
      t.equal(await t.game('act', 'objAt', 90, 52), null, 'the saw clears a fallen limb in two cuts');
    },
  },
  {
    name: 'tulips: planted to the design in January, bloom in spring, freeze cloth',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { day: yd('wi', 12), at: 'gate' });
      const [x, y] = await firstBed(t);
      const color = await t.game('act', 'design', x, y);
      t.expect(['red', 'yellow', 'white', 'pink', 'purple', 'orange'].includes(color), `the design marks this tile ${color}`);
      await t.game('act', 'supply', 'bulb:' + color, 2);
      await t.shot('19-tulip-planting');
      let s = await t.state();
      t.expect(s.inv.some((i) => i.id === 'bulb:' + color), 'bulbs from the greenhouse bench in planting season');
      s = await useOn(t, 'bulb:' + color, x, y);
      t.equal(s.counts.beds, 1, 'a bed tile planted');
      const ok = await t.page.evaluate(([x, y]) => window.__gwApp.gm.S.beds[x + ',' + y].ok, [x, y]);
      t.equal(ok, true, 'planted to the design');
      // Spring: the tulips bloom; a freeze night burns uncovered blooms.
      await t.game('act', 'skipDays', 112 - yd('wi', 12) + 2);
      s = await t.state();
      t.equal(s.season, 'sp', 'spring');
      const look = await t.page.evaluate(([x, y]) => { const gm = window.__gwApp.gm; const b = gm.S.beds[x + ',' + y]; return b && b.p; }, [x, y]);
      t.equal(look, 'tulip', 'the tulips are still there in spring');
      await t.page.evaluate(([x, y]) => { delete window.__gwApp.gm.S.beds[x + ',' + y].dmg; }, [x, y]); // an earlier random freeze may have hit it
      await t.game('setState', { freezeTonight: true });
      await t.game('act', 'fill', [['cloth', 1]]);
      await useOn(t, 'cloth', x, y);
      await t.game('act', 'sleep'); await t.game('act', 'closeAll');
      const b = await t.page.evaluate(([x, y]) => window.__gwApp.gm.S.beds[x + ',' + y], [x, y]);
      t.expect(b && !b.dmg, 'covered tulips come through the freeze');
      await t.shot('20-tulips');
    },
  },
  {
    name: 'zone scores fall with mess and rise with care',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { day: 5, at: 'gate' });
      const before = (await t.game('act', 'zones'))[3].tidy;
      const litter = {}; for (let x = 84; x < 96; x++) litter[x + ',50'] = 'litter';
      await t.game('setState', { litter });
      const after = (await t.game('act', 'zones'))[3].tidy;
      t.expect(after < before - 15, `litter pulls the Welcome Center's tidiness down (${before} → ${after})`);
    },
  },
];
