import { garden, yd } from './helpers.mjs';

export const tests = [
  {
    name: 'performance and budgets',
    async run(t) {
      t.expect(t.loadMs < 2000, `hooks ready in ${t.loadMs} ms`);
      const bytes = await t.page.evaluate(() => document.documentElement.outerHTML.length);
      t.expect(bytes < 2 * 1024 * 1024, `page ${(bytes / 1024).toFixed(0)} KB < 2 MB`);
      for (const [label, o] of [['spring day', { day: yd('sp', 6), at: 'gate', time: 700 }], ['lights night', { day: yd('wi', 3), at: 'lawnEast', time: 1140 }], ['woods', { day: yd('su', 4), at: 'canopy', time: 700 }]]) {
        await garden(t, o);
        if (label === 'lights night') {
          const ms = await t.game('act', 'markers');
          const disp = {}; ms.filter((m) => m.show === 'hl').forEach((m) => { disp[m.id] = { st: 'ok' }; });
          await t.game('setState', { disp });
          await t.game('step', 12 * 60); // let visitors arrive
        }
        await t.waitForStable();
        await t.game('resume');
        await t.page.keyboard.down('ArrowLeft');
        const fps = await t.fps(1500);
        await t.page.keyboard.up('ArrowLeft');
        const s = await t.state();
        await t.game('pause');
        t.log(`${label}: ${fps.toFixed(1)} fps, ${s.frameMs} ms script per frame, ${s.visitors} visitors`);
        t.expect(s.frameMs < 10, `${label} frame script cost ${s.frameMs} ms (< 10 ms)`);
        t.expect(fps >= 50, `${label} runs at ${fps.toFixed(1)} fps (≥ 50)`);
      }
      const mb = await t.memoryMB();
      t.log(`heap ${mb.toFixed(1)} MB`);
      t.expect(mb < 60, `JS heap ${mb.toFixed(1)} MB < 60`);
    },
  },
];
