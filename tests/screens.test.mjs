import { garden, click, holdKey } from './helpers.mjs';

export const tests = [
  {
    name: 'title and hooks',
    async run(t) {
      const s = await t.state();
      t.equal(s.scene, 'title', 'starts on the title');
      t.expect(t.loadMs < 2000, `hooks ready in ${t.loadMs} ms (< 2000)`);
      t.expect(/Woodland Gardens Keeper/.test(await t.page.textContent('#screen')), 'title names the game');
      t.expect(await t.page.$('.title-menu button[disabled]'), 'Continue disabled without a save');
      await t.shot('01-title');
      await t.checkLayout();
    },
  },
  {
    name: 'help and about',
    async run(t) {
      await click(t, 'open', 'help');
      const help = await t.page.textContent('#screen');
      t.expect(/Controls/.test(help) && /work orders/i.test(help) && /game content/i.test(help), 'help covers controls, orders and the game-content note');
      await t.shot('02-help'); await t.checkLayout();
      await click(t, 'close');
      await click(t, 'open', 'about');
      const about = await t.page.textContent('#screen');
      t.expect(/MIT/.test(about) && /not affiliated/.test(about) && /George/.test(about), 'about states license, no affiliation and the peafowl note');
      await t.shot('03-about'); await t.checkLayout();
    },
  },
  {
    name: 'new game: intro card, then the maintenance yard',
    async run(t) {
      await t.seed(3);
      await t.game('newGame', { skipIntro: false });
      let s = await t.state();
      t.equal(s.modal, 'card', 'intro card first');
      const txt = await t.page.textContent('#screen');
      t.expect(/Garvan Woodland Gardens/.test(txt) && /Source:/.test(txt), 'intro names the garden and cites a source');
      await t.shot('04-intro'); await t.checkLayout();
      await click(t, 'cardnext');
      s = await t.state();
      t.equal(s.modal, null, 'card closed');
      t.equal(s.zone, 'yard', 'starts in the maintenance yard');
      await t.game('pause');
      await t.shot('05-game'); await t.checkLayout();
    },
  },
  {
    name: 'keyboard walking and the journal tabs',
    async run(t) {
      await garden(t, { at: 'gate', time: 620 });
      const x0 = (await t.state()).player.x;
      await holdKey(t, 'ArrowLeft', 40);
      t.expect((await t.state()).player.x < x0 - 1, 'arrow keys walk');
      for (const tab of ['orders', 'year', 'calendar', 'garden', 'staff', 'notes']) {
        await t.game('scene', 'journal');
        await click(t, 'jtab', tab);
        if (tab === 'calendar' || tab === 'garden') { await t.shot('06-journal-' + tab); await t.checkLayout(); }
        await t.game('act', 'closeAll');
      }
      for (const sc of ['supplies', 'storage', 'shop', 'inventory', 'sign']) { await t.game('scene', sc); await t.checkLayout(); if (sc === 'supplies') await t.shot('07-supplies'); await t.game('act', 'closeAll'); }
      await t.game('act', 'talk', 'ruth');
      t.equal((await t.state()).modal, 'dialog', 'talk to the head gardener');
      await t.shot('08-dialog'); await t.checkLayout();
    },
  },
];
