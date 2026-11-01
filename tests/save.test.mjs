import { garden, click } from './helpers.mjs';

export const tests = [
  {
    name: 'autosave, continue and manual save',
    async run(t) {
      await t.seed(21);
      await t.game('newGame', {});
      await t.game('setState', { money: 777, litter: { '88,50': 'litter' } });
      await t.game('act', 'sleepSkip');
      let s = await t.state();
      const want = { day: s.day, money: s.money, date: s.date };
      await t.reload();
      s = await t.state();
      t.equal(s.scene, 'title', 'reload lands on the title');
      t.expect(!(await t.page.$('.title-menu button[disabled]')), 'Continue enabled');
      t.expect(/Spring 2, Year 1/.test(await t.page.textContent('#screen')), 'title shows the saved date');
      await click(t, 'continue');
      s = await t.state();
      t.equal(s.day, want.day, 'day restored');
      t.equal(s.money, want.money, 'money restored');
      await t.game('setState', { money: 4321 });
      await t.game('scene', 'pause');
      await click(t, 'save');
      await t.reload();
      await click(t, 'continue');
      t.equal((await t.state()).money, 4321, 'manual save restored');
    },
  },
  {
    name: 'saves: determinism and old saves',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { seed: 5, day: 2 });
      await t.game('act', 'skipDays', 6);
      const a = await t.page.evaluate(() => { const S = window.__gwApp.gm.S; return JSON.stringify([S.day, S.weather, S.orders.map((o) => o.id), Object.keys(S.leaves).length, Object.keys(S.weeds).length, S.money]); });
      await garden(t, { seed: 5, day: 2 });
      await t.game('act', 'skipDays', 6);
      const b = await t.page.evaluate(() => { const S = window.__gwApp.gm.S; return JSON.stringify([S.day, S.weather, S.orders.map((o) => o.id), Object.keys(S.leaves).length, Object.keys(S.weeds).length, S.money]); });
      t.equal(a, b, 'same seed, same week');
      const old = await t.game('act', 'loadRaw', JSON.stringify({ v: 1, state: { v: 1, ch: 2, day: 3 } }));
      t.expect(typeof old === 'string', `a farm-era save is rejected with a message (${old})`);
    },
  },
  {
    name: 'storage blocked',
    initScript: () => {
      const no = () => { throw new Error('storage blocked'); };
      Object.defineProperty(window, 'localStorage', { get: no, configurable: true });
    },
    async run(t) {
      const s = await t.state();
      t.equal(s.storageOK, false, 'storage reported unavailable');
      await t.game('newGame', {});
      await t.game('act', 'sleepSkip');
      t.equal((await t.state()).day, 1, 'the game still runs');
    },
  },
];
