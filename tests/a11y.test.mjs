import { garden, click, contrastReport, useOn } from './helpers.mjs';

export const tests = [
  {
    name: 'contrast on every screen',
    async run(t) {
      const fails = [];
      const push = (r, sc) => { for (const f of r.fails) fails.push({ ...f, sc }); };
      push(await contrastReport(t.page), 'title');
      await garden(t, { at: 'gate', time: 620 });
      push(await contrastReport(t.page), 'hud');
      for (const sc of ['inventory', 'journal', 'board', 'supplies', 'storage', 'shop', 'sign', 'settings', 'pause', 'summary', 'card', 'help', 'bed']) {
        await t.game('scene', sc);
        push(await contrastReport(t.page), sc);
        await t.game('act', 'closeAll');
      }
      await t.game('act', 'talk', 'opal');
      push(await contrastReport(t.page), 'dialog');
      await t.game('act', 'closeAll');
      await t.game('act', 'toast', 'A toast for contrast');
      push(await contrastReport(t.page), 'toast');
      const seen = new Set();
      for (const f of fails) { const key = f.sc + f.cls + f.text; if (seen.has(key)) continue; seen.add(key); if (seen.size <= 25) t.log(`${f.sc}: "${f.text}" ${f.ratio} < ${f.need} (${f.tag}.${f.cls})`); }
      t.equal(fails.length, 0, 'all text passes WCAG contrast');
    },
  },
  {
    name: 'text size',
    async run(t) {
      await garden(t, { at: 'gate' });
      await t.game('scene', 'settings');
      await click(t, 'text', '1.5');
      t.equal((await t.state()).settings.text, 1.5, 'text size 150%');
      t.equal(await t.page.evaluate(() => getComputedStyle(document.documentElement).fontSize), '24px', 'root font scaled');
      await t.game('act', 'closeAll');
      await t.checkLayout();
      await t.shot('58-text-150');
      await t.game('scene', 'journal');
      await t.checkLayout();
      await t.game('act', 'closeAll');
      await t.game('scene', 'settings');
      await click(t, 'text', '1');
    },
  },
  {
    name: 'reduced motion',
    reducedMotion: true,
    async run(t) {
      let s = await t.state();
      t.equal(s.reduced, true, 'system preference honored');
      await garden(t, { at: 'gate' });
      await t.game('resume');
      await t.page.waitForTimeout(500);
      t.equal((await t.state()).particles, 0, 'no drifting particles');
      await t.game('pause');
      await t.game('scene', 'settings');
      await click(t, 'motion', 'full');
      t.equal((await t.state()).reduced, false, 'Full motion setting overrides');
      await click(t, 'motion', 'auto');
    },
  },
  {
    name: 'rebinding keys persists',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { at: 'gate' });
      await t.game('scene', 'settings');
      await click(t, 'rebind', 'use');
      t.expect(/Press a key/.test(await t.page.textContent('#screen')), 'waits for a key');
      await t.page.keyboard.press('KeyU');
      t.equal((await t.state()).settings.keys.use[0], 'KeyU', 'Use is now U');
      await t.game('act', 'closeAll');
      await t.game('setState', { litter: { '88,50': 'litter' } });
      await t.game('act', 'teleport', 88, 51, 'up');
      await t.game('act', 'selectItem', 'grabber');
      await t.page.keyboard.press('KeyU'); await t.game('step', 2);
      t.equal((await t.state()).counts.litter, 0, 'U picks up litter');
      await t.reload();
      t.equal((await t.state()).settings.keys.use[0], 'KeyU', 'binding survives a reload');
      await t.game('scene', 'settings');
      await click(t, 'resetkeys');
      t.equal((await t.state()).settings.keys.use[0], 'Space', 'reset restores Space');
    },
  },
  {
    name: 'sound and the live region',
    async run(t) {
      await t.game('scene', 'settings');
      await click(t, 'vol', '0.25');
      await t.reload();
      t.equal((await t.state()).settings.volume, 0.25, 'volume persists');
      await t.game('scene', 'settings');
      await click(t, 'vol', '0.5');
      await garden(t, { at: 'gate' });
      await t.page.mouse.click(5, 300);
      const before = (await t.state()).audioPlayed;
      await t.game('setState', { litter: { '88,50': 'litter' } });
      await useOn(t, 'grabber', 88, 50);
      t.expect((await t.state()).audioPlayed > before, 'sounds play');
      await t.game('act', 'toast', 'Order done: test');
      t.equal((await t.state()).srText, 'Order done: test', 'toasts are announced in the live region');
      await t.game('scene', 'settings');
      await click(t, 'contrast', 'on');
      t.expect(await t.page.evaluate(() => document.body.classList.contains('hc')), 'high-contrast HUD class');
      await click(t, 'contrast', 'off');
    },
  },
  {
    name: 'phone readability',
    viewports: ['mobile'],
    async run(t) {
      await garden(t, { at: 'gate', time: 640 });
      const s = await t.state();
      t.expect(s.ts >= 30, `tiles are ${s.ts} CSS px`);
      const minFont = await t.page.evaluate(() => Math.min(...[...document.querySelectorAll('#hud *')].filter((e) => e.childNodes.length && e.textContent.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize))));
      t.expect(minFont >= 11, `HUD text ≥ 11 px (${minFont})`);
    },
  },
];
