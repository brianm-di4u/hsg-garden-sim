// The map: the real layout's relative positions, every named place reachable, the peninsula in its lake.
import { garden } from './helpers.mjs';

export const tests = [
  {
    name: 'layout follows the research notes',
    viewports: ['desktop'],
    async run(t) {
      const s = await garden(t, { at: 'gate' });
      const B = Object.fromEntries(s.buildings.map((b) => [b.id, b]));
      const P = s.places;
      const wc = B.welcome;
      t.expect(B.chapel.x > wc.x + wc.w, 'Anthony Chapel is east of the Welcome Center (outside the gate, by the parking lot)');
      t.expect(B.chapel.y + B.chapel.h < 42, 'the chapel sits north of the parking lot');
      t.expect(B.cafe.y < wc.y && Math.abs(B.cafe.x - wc.x) < 6, 'the Chipmunk Café is just north of (behind) the Welcome Center');
      t.expect(P.pinewindPath.x < wc.x && P.pinewindPath.y > wc.y, 'the Garden of the Pine Wind is southwest of the Welcome Center');
      t.expect(P.perry.x < 20, 'Perry Wildflower Overlook is at the west point');
      t.expect(B.treehouse.x < wc.x && B.treehouse.y < wc.y, 'the Treehouse is northwest of the Welcome Center');
      const g = await t.page.evaluate(() => { const gm = window.__gwApp.gm; return { west: gm.world.g[44 * 120 + 2], north: gm.world.g[2 * 120 + 50], south: gm.world.g[86 * 120 + 50], east: gm.world.g[48 * 120 + 118] }; });
      t.expect(g.west === 4 || g.west === 5, 'lake to the west of the point');
      t.expect(g.north === 4 || g.north === 5, 'lake along the north shore');
      t.expect(g.south === 4 || g.south === 5, 'lake along the south shore');
      t.equal(g.east, 3, 'Arkridge Road comes in from the east');
      const bridges = await t.page.evaluate(() => { const w = window.__gwApp.gm.world; let b = 0, bw = 0; for (const v of w.g) { if (v === 8) b++; if (v === 9) bw++; } return { b, bw }; });
      t.expect(bridges.b >= 6, `bridges over the streams (${bridges.b} tiles)`);
      t.expect(bridges.bw >= 16, `the Millsap Canopy Bridge spans the gorge (${bridges.bw} tiles)`);
    },
  },
  {
    name: 'every place and the whole visitor loop are reachable',
    viewports: ['desktop'],
    async run(t) {
      await garden(t, { at: 'start' });
      const r = await t.page.evaluate(() => {
        const gm = window.__gwApp.gm, W = 120, H = 90, seen = new Uint8Array(W * H);
        const st = gm.world.places.start, q = [st.y * W + st.x]; seen[q[0]] = 1;
        for (let i = 0; i < q.length; i++) { const c = q[i], x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || window.__game.act('blocked', nx, ny)) continue; seen[n] = 1; q.push(n); } }
        const bad = Object.entries(gm.world.places).filter(([k, p]) => k !== 'staffLot' && !seen[p.y * W + p.x]).map(([k]) => k);
        const loopBad = gm.world.routes.loop.filter(([x, y]) => window.__game.act('blocked', x, y) || window.__game.act('blocked', x + 1, y + 1));
        const markersBad = gm.world.markers.filter((m) => ![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen[(m.y + dy) * W + m.x + dx])).map((m) => m.id);
        return { bad, loopBad, markersBad, reach: q.length };
      });
      t.equal(r.bad, [], 'every named place can be walked to from the maintenance yard');
      t.equal(r.loopBad.length, 0, 'the visitor loop runs on walkable ground');
      t.equal(r.markersBad, [], 'every display stake can be reached');
      t.log(`${r.reach} walkable tiles reachable`);
    },
  },
];
