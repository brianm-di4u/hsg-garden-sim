// Work orders, Holiday Lights from install to teardown, weddings, and the peafowl.
import { garden, yd, useOn, standBy, click } from './helpers.mjs';

export const tests = [
  {
    name: 'the board: orders are seeded, completing one pays',
    viewports: ['desktop'],
    async run(t) {
      let s = await garden(t, { seed: 11, day: 4 });
      const a = s.orders.map((o) => o.id);
      s = await garden(t, { seed: 11, day: 4 });
      t.equal(s.orders.map((o) => o.id), a, 'same seed and day, same orders');
      t.expect(a.length >= 3, `${a.length} orders on the board`);
      // Make a litter order and finish it.
      await t.game('setState', { litter: { '88,50': 'litter', '89,50': 'litter' }, orders: [{ id: 'litter:welcome', type: 'litter', zone: 'welcome', n: 2, prog: 0, done: false, pay: 7, title: 'Pick up litter · test', unit: 'pieces' }] });
      const m0 = (await t.state()).money;
      await useOn(t, 'grabber', 88, 50);
      s = await useOn(t, 'grabber', 89, 50);
      t.equal(s.orders[0].done, true, 'the order completes');
      t.equal(s.money, m0 + 7, 'and pays');
      // The board in the barn.
      await t.game('act', 'goto', 'board', 'up');
      await t.game('act', 'interact');
      s = await t.state();
      t.equal(s.modal, 'board', 'the barn opens the work-order board');
      await t.shot('30-board');
      await t.checkLayout();
    },
  },
  {
    name: 'Holiday Lights: install, test, fault, repair, teardown',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { day: yd('fa', 8), at: 'storage' });
      await t.game('act', 'storageTake');
      let s = await t.state();
      const pieces = s.inv.filter((i) => i.id.startsWith('hl:'));
      t.expect(pieces.length > 0, `pieces loaded from storage (${pieces.map((p) => p.id + '×' + p.n).join(', ')})`);
      const markers = await t.game('act', 'markers');
      const m = markers.find((x) => x.item === pieces[0].id && !x.st);
      await useOn(t, pieces[0].id, m.x, m.y);
      let st = (await t.game('act', 'markers')).find((x) => x.id === m.id).st;
      t.equal(st, 'set', 'piece placed on its stake, untested');
      await t.game('act', 'selectItem', 'reel'); await t.game('act', 'useAt', m.x, m.y);
      st = (await t.game('act', 'markers')).find((x) => x.id === m.id).st;
      t.expect(st === 'ok' || st === 'dark', `tested (${st})`);
      if (st === 'dark') { await t.game('act', 'useAt', m.x, m.y); st = (await t.game('act', 'markers')).find((x) => x.id === m.id).st; }
      t.equal(st, 'ok', 'lit');
      // Wrap a tree.
      const w = markers.find((x) => x.wrap);
      await useOn(t, 'reel', w.x, w.y);
      t.expect((await t.game('act', 'markers')).find((x) => x.id === w.id).st, 'tree wrapped');
      // Opening night: a dark piece gets fixed.
      await t.game('scene', { day: yd('fa', 27) - 1, time: 1140, at: 'lawnEast' });
      const all = await t.game('act', 'markers');
      const disp = {}; all.filter((x) => x.show === 'hl').forEach((x, i) => { disp[x.id] = { st: i === 0 ? 'dark' : 'ok' }; });
      await t.game('setState', { disp });
      const d0 = all.find((x) => x.show === 'hl');
      await useOn(t, 'reel', d0.x, d0.y);
      t.equal((await t.game('act', 'markers')).find((x) => x.id === d0.id).st, 'ok', 'dark piece repaired');
      await t.game('act', 'teleport', 63, 47, 'up');
      await t.shot('31-holiday-lights');
      // Teardown in January returns pieces to the pack.
      await t.game('scene', { day: yd('wi', 12), at: 'lawnEast' });
      await t.game('setState', { disp });
      const p = all.find((x) => x.show === 'hl' && !x.wrap);
      s = await useOn(t, 'reel', p.x, p.y);
      t.equal((await t.game('act', 'markers')).find((x) => x.id === p.id).st, null, 'piece struck');
      t.expect(s.inv.some((i) => i.id === p.item), 'and back in the pack');
    },
  },
  {
    name: 'peafowl roam the grounds and roost at night',
    viewports: ['desktop'],
    async run(t) {
      let s = await garden(t, { day: 6, time: 600, at: 'welcomeFront' });
      t.equal(s.peafowl.length, 3, 'George and two peahens');
      const bad = [];
      for (let i = 0; i < 30; i++) {
        s = await t.game('step', 120);
        for (const b of s.peafowl) if (b.mode !== 'roost') { const tx = Math.floor(b.x), ty = Math.floor(b.y - 0.1); if (await t.game('act', 'blocked', tx, ty)) bad.push(`${b.id}@${tx},${ty}`); }
      }
      t.equal(bad, [], 'peafowl stay on walkable ground');
      const george = s.peafowl.find((b) => b.id === 'george');
      t.expect(Math.hypot(george.x - 89, george.y - 49) < 22, 'George stays around the Welcome Center');
      await t.game('setState', { time: 1200 });
      s = await t.game('step', 2400);
      t.expect(s.peafowl.every((b) => b.mode === 'roost' || b.mode === 'toRoost'), 'they head to roost at night');
      // Shooing George out of a tulip bed.
      await garden(t, { day: yd('sp', 3), time: 620, at: 'gate' });
      const bed = await t.page.evaluate(() => { const gm = window.__gwApp.gm; const k = gm.tulipTiles.find((k) => gm.S.beds[k]); const [x, y] = k.split(',').map(Number); const b = gm.S.peafowl[0]; b.x = x + 0.5; b.y = y + 0.9; b.mode = 'peck'; b.t = 999; return [x, y]; });
      s = await t.game('step', 3);
      t.expect(s.orders.some((o) => o.type === 'peafowl'), 'a peafowl in the tulips makes an order');
      await standBy(t, bed[0], bed[1]);
      await t.game('act', 'interact');
      s = await t.state();
      t.expect(s.orders.find((o) => o.type === 'peafowl').done, 'shooed out');
    },
  },
  {
    name: 'weddings: set up on time',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { day: 10, time: 700, at: 'chapel' });
      await t.game('setState', { wedding: { venue: 'chapel', name: 'Anthony Chapel', at: 840, setup: false, struck: false, checked: false } });
      await t.game('act', 'supply', 'kit', 1);
      const v = await t.page.evaluate(() => window.__gwApp.gm.world.fixed.find((f) => f.t === 'venue' && f.k === 'chapel'));
      await standBy(t, v.x, v.y);
      await t.game('act', 'interact');
      let s = await t.state();
      t.equal(s.wedding.setup, true, 'set up');
      await t.shot('32-wedding');
      await t.game('setState', { time: 839 });
      s = await t.game('step', 24);
      t.expect(s.toasts.some((x) => /wedding is under way/.test(x)), 'the ceremony goes ahead');
    },
  },
];
