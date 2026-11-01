// Shared helpers for the Woodland Gardens Keeper tests (imported by *.test.mjs; not a test file itself).

// A paused game on a given day of the year (0 = Spring 1), at a named place and time.
export async function garden(t, o = {}) {
  await t.seed(o.seed ?? 7);
  const s = await t.game('scene', { day: o.day ?? 0, at: o.at || 'start', time: o.time ?? 600, weather: o.weather, money: o.money, tx: o.tx, ty: o.ty });
  if (o.setup) return t.game('setState', o.setup);
  return s;
}
export const yd = (sea, d) => ['sp', 'su', 'fa', 'wi'].indexOf(sea) * 28 + d - 1;

// A free walkable tile next to (x, y) to stand on, and the facing toward (x, y).
export async function standBy(t, x, y) {
  const spot = await t.page.evaluate(([x, y]) => {
    for (const [dx, dy, f] of [[0, 1, 'up'], [0, -1, 'down'], [-1, 0, 'right'], [1, 0, 'left']]) if (!window.__game.act('blocked', x + dx, y + dy)) return { x: x + dx, y: y + dy, f };
    return null;
  }, [x, y]);
  if (!spot) throw new Error(`no free tile next to ${x},${y}`);
  await t.game('act', 'teleport', spot.x, spot.y, spot.f);
  return spot;
}
// Use the given item on the tile (x, y) from a neighbouring tile.
export async function useOn(t, item, x, y) {
  await standBy(t, x, y);
  if (item) await t.game('act', 'selectItem', item);
  await t.game('act', 'useAt', x, y);
  return t.state();
}

// Hold a key for n ticks of the paused game (real keyboard events, deterministic stepping).
export async function holdKey(t, key, ticks) {
  await t.page.keyboard.down(key);
  await t.game('step', ticks);
  await t.page.keyboard.up(key);
  await t.game('step', 1);
}
export async function click(t, act, arg) {
  const sel = arg != null ? `[data-act="${act}"][data-arg="${arg}"]` : `[data-act="${act}"]`;
  await t.page.click(sel);
  await t.page.waitForTimeout(30);
}
export const gm = (t, fn, arg) => t.page.evaluate(fn, arg);

// WCAG contrast of every visible text element against its nearest opaque background.
export async function contrastReport(page) {
  return page.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v[3] == null ? 1 : v[3] }; };
    const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
    const bgOf = (el) => {
      const stack = [];
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) break; }
      }
      let bg = { r: 26, g: 22, b: 18, a: 1 };
      for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg);
      return bg;
    };
    const fails = [];
    let checked = 0;
    for (const el of document.querySelectorAll('#hud *, #screen *, #hotbar *, #prompt, .toast')) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      if (el.closest('[disabled]')) continue;
      const fg = parse(cs.color); if (!fg) continue;
      const bg = bgOf(el);
      const L1 = lum(blend(fg, bg)), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
      const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      checked++;
      if (ratio < need) fails.push({ text: el.textContent.trim().slice(0, 40), ratio: +ratio.toFixed(2), need, tag: el.tagName, cls: el.className });
    }
    return { checked, fails };
  });
}
