# Code-sample survey (carried over from the farm game this sim was converted from)

Surveyed 2026-10-28. Licenses were read from each repo's license file or the page's own license text.
Commits come from the GitHub API (`/commits?per_page=1`, `/license`, `/tags`). The few relevant source
files were downloaded with curl, pinned to the commit listed below, into `reference-samples/<name>/`
(git-ignored). They were treated as untrusted data: nothing was installed, built, run or opened in a
browser.

All five samples are genre-generic: engine techniques, an algorithm write-up, a loop library, a PRNG
collection and a narrative runtime. None is a clone or fan remake of a commercial farming or life game,
and no repo whose name or readme references one was considered.

**No third-party code is copied into the game except the 6-line mulberry32 PRNG** (public domain, with MIT
as fallback), which the collection already uses in other games. Everything else is reimplemented from
the ideas listed in the Foundation section.

| # | Sample | URL | License | Commit / version | Verdict |
|---|---|---|---|---|---|
| 1 | MDN "Tiles and tilemaps" + `mozdevs/gamedev-js-tiles` | https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps and https://github.com/mozdevs/gamedev-js-tiles | Repo: **MPL-2.0** (`LICENSE`; README also says Kenney art is CC0). Article: prose CC BY-SA 2.5+, code snippets CC0 per MDN's attribution page | Repo `6e25f5a891641cbe4d60bfbbaa11df01ff594add` (2015-10-22, `gh-pages`, archived). Article last modified 2026-09-13 | Reference only (MPL-2.0 is file-level copyleft; article) |
| 2 | Red Blob Games, "Implementation of A*" (+ "Introduction to A*") | https://www.redblobgames.com/pathfinding/a-star/implementation.html | Page: "free to use in your projects... treat it as Apache v2 licensed by Red Blob Games". `implementation.py` header: Apache v2.0, Copyright 2014 Red Blob Games | Not a git repo. Page "Last modified: 9 Aug 2026" | Adapt with attribution allowed (Apache-2.0). We plan to reimplement in JS, not copy |
| 3 | MainLoop.js (Isaac Sukin / IceCreamYou) | https://github.com/IceCreamYou/MainLoop.js | **MIT** (`LICENSE.txt`, Copyright (C) 2016 Isaac Sukin) | `3ddadf0ab902da96af7077be40206ac27ba1b1d3` (2026-07-15, `gh-pages`; dependabot bump). Latest tag `1.0.4` | Adapt with attribution allowed. We plan to write our own loop from the pattern |
| 4 | bryc/code `jshash/PRNGs.md` | https://github.com/bryc/code/blob/master/jshash/PRNGs.md | **Public domain, MIT fallback** (`LICENSE.md`: "Public domain..." then "as a fallback license, I approve the use of MIT", Copyright (c) 2024 bryc). GitHub's API reports `NOASSERTION` because the file is not a standard template | `88c1317ea6f9b25c153afa9c369c365fed11b482` (2026-01-31; also the latest commit touching `PRNGs.md`) | **Adapt** (mulberry32, verbatim) |
| 5 | inkjs (JS port of inkle's ink runtime) | https://github.com/y-lohse/inkjs | **MIT** (`LICENSE.md`, Copyright (c) 2017 inkle Ltd. and inkjs contributors) | `6b1153410ab1c4bcfd9ef04eb2f0107f36be7778` (2026-09-01, `master`). Latest release `v2.4.0` (2026-02-17) | Adapt with attribution allowed, but we use it as a design reference only (too big to inline) |

Companion article (no download): Glenn Fiedler, "Fix Your Timestep!" (https://gafferongames.com/post/fix_your_timestep/,
published 2004-06-10, page footer "Copyright © Glenn Fiedler, 2004 - 2026", no license stated). Reference only.

Downloaded files (`games/farm-sim/reference-samples/`):

- `mozdevs-gamedev-js-tiles/`: `LICENSE`, `README.md`, `common.js`, `scroll.js`, `layers.js`, `logic-grid.js`, `offcanvas.js`
- `redblob-astar/`: `implementation.py`
- `mainloop-js/`: `LICENSE.txt`, `README.md`, `mainloop.js`
- `bryc-prngs/`: `LICENSE.md`, `PRNGs.md`
- `inkjs/`: `LICENSE.md`, `README.md`, `Choice.ts`, `VariablesState.ts`

---

## 1. MDN Tilemaps + gamedev-js-tiles (MPL-2.0 / MDN CC)

- **What it covers:** a tilemap as `{cols, rows, tsize, layers: [flat arrays]}` with
  `getTile(layer, col, row) = layers[layer][row * cols + col]`. A tile atlas where tile index picks the
  source rect (`0` = empty). A camera clamped to map bounds that follows the hero and only draws the
  visible column/row range with a sub-tile offset. A two-layer draw with the hero sandwiched between the
  layers, so the hero can walk behind tree tops. `logic-grid.js` adds `isSolidTileAtXY` and hero-vs-tile
  collision. `offcanvas.js` renders each layer to its own canvas and blits it. The article also describes
  the better caches: a canvas 2×2 tiles larger than the view that redraws only when scrolling crosses a
  whole tile, and splitting big maps into pre-rendered chunks (for example 10×10) that are treated as
  "big tiles".
- **Does well:** the smallest clear model of layered tile data plus camera culling. World/screen
  conversion is just `x - camera.x`. Layer ordering for depth is spelled out.
- **Does badly / doesn't fit:**
  - The offscreen demo re-renders every layer canvas whenever the camera moves at all, so it saves
    nothing while walking. Chunking is only described in prose, not implemented.
  - Collision samples only the four AABB corners and resolves one axis through an `if/else if` chain on
    the input direction. That works only because input is 4-way, one key at a time; diagonal movement
    would snap wrongly. Corner sampling also misses tiles when the sprite is larger than a tile.
  - `_drawLayer` reads `endCol`/`endRow` without bounds checks. At the right edge, `col == cols` wraps
    into the next row's first tile; it happens to be drawn offscreen.
  - `Keyboard.isDown` has a precedence bug (`!keyCode in this._keys`). It uses deprecated `keyCode`.
  - Variable delta (capped at 0.25 s), not a fixed step.
- **Verdict:** **reference only.** MPL-2.0 is not on our adaptable list and requires MPL-licensed files
  to stay MPL. The article's CC0 snippets are trivial, so we write our own.

## 2. Red Blob Games A* implementation (Apache-2.0)

- **What it covers:** `SquareGrid` with `in_bounds`, `passable` (walls set) and `neighbors` (4-way). A
  trick that reverses neighbour order on alternating parity, `(x + y) % 2 == 0`, so paths look straighter.
  `GridWithWeights` with per-tile move cost. A `PriorityQueue` over `heapq`. Breadth-first search,
  Dijkstra and A* with a Manhattan heuristic, all storing `came_from`/`cost_so_far` dicts, plus a
  `reconstruct_path`. The page explains early exit, tie-breaking, and when BFS is enough (uniform costs).
- **Does well:** the canonical, readable reference. It separates the graph interface (`neighbors`,
  `cost`) from the search, so any tile map can plug in. The license is explicit and permissive.
- **Does badly / doesn't fit:** Python (with C++ and C# on the page), not JS. Dict-keyed by tuples,
  where in JS we want flat `Int32Array`s indexed by `row * cols + col`. No binary heap in JS (Python
  uses `heapq`). No diagonal moves or corner-cutting rules. No path smoothing. No handling of a goal that
  moves, or of a tile that becomes blocked after the path was computed (crops, placed objects).
- **Verdict:** **adapt with attribution is allowed** (Apache-2.0). We plan to rewrite in JS from the
  algorithm, which needs no attribution. If any structure stays close to the original, keep a
  `// Based on Red Blob Games A* sample code (Apache-2.0), https://www.redblobgames.com/pathfinding/a-star/implementation.html`
  comment.

## 3. MainLoop.js (MIT)

- **What it covers:** a rAF loop with `begin(timestamp, frameDelta)`, `update(timestep)` called 0..n
  times per frame from an accumulator (`frameDelta`), `draw(interpolation)` with
  `frameDelta / simulationTimestep`, and `end(fps, panic)`. Default step `1000 / 60`. "Panic" after 240
  update steps in one frame, which the user resolves with `resetFrameDelta()`. An exponentially smoothed
  FPS estimate. An optional max-FPS throttle. A `setTimeout` fallback when rAF is missing. The README
  explains each phase.
- **Does well:** the right shape: fixed simulation step, interpolation alpha for rendering, and an
  explicit spiral-of-death escape hatch.
- **Does badly / doesn't fit:**
  - A module-level singleton (one loop per page).
  - `frameDelta` is never clamped, so returning from a hidden tab (rAF paused) forces up to 240 catch-up
    updates before panic. Fiedler's article clamps frame time to 0.25 s instead.
  - The first frame calls `draw(1)` before any update.
  - Callbacks are only swapped via setters, and there is no pause or step API for tests.
  - Repo housekeeping (Grunt, Travis, jsduck docs) is irrelevant to us. The 2026 commit is only a
    dependabot bump; the source is effectively the 1.0.x code.
- **Verdict:** **adapt with attribution is allowed** (MIT). We will write our own ~20-line loop with the
  same phases plus a frame-time clamp, which needs no attribution. If we copy any lines, use
  `// Loop structure adapted from MainLoop.js by Isaac Sukin (MIT), https://github.com/IceCreamYou/MainLoop.js`.

## 4. bryc/code PRNGs.md (public domain / MIT fallback)

- **What it covers:** short 32-bit-arithmetic JS PRNGs with a speed table: `sfc32` (128-bit state,
  recommended), `mulberry32` (32-bit state, "best 2^32 state JS PRNG"), `splitmix32` and others. Also seed
  hashing (`xmur3`) to turn a string into seeds.
- **Does well:** tiny, fast, seedable, and statistically fine for games. A single uint32 of state
  serializes trivially into save files. The license is about as permissive as it gets.
- **Does badly / doesn't fit:** the file itself notes, citing the original author, that mulberry32
  "skip[s] a third of all 32-bit values" and suggests splitmix32 for serious use. That is irrelevant for
  crop rolls and NPC choices, but worth knowing. The closure form (`mulberry32(a)` returns a function)
  hides state, which we can't save, so we step it on a plain object instead (the collection's existing
  pattern).
- **Verdict:** **adapt** (verbatim algorithm, state moved onto an object).

## 5. inkjs (MIT)

- **What it covers:** the runtime for inkle's ink narrative language: `new Story(json)`,
  `Continue()`/`canContinue`, `currentChoices` (`Choice` has `text`, `index`, `targetPath`, `tags`),
  `ChooseChoiceIndex(i)`, `variablesState.$('name', value)` for globals shared with the game,
  `ObserveVariableChange` callbacks, and save/load of the story state as JSON. Ink adds conditional
  choices, visit counts, and tags on lines.
- **Does well:** the right mental model for dialogue. Text flows until a choice point. Choices are
  filtered by conditions over game variables. Visit counts drive "first meeting / repeat" lines. Tags
  carry side data (speaker, portrait, emote). Dialogue state is serializable.
- **Does badly / doesn't fit:** a large runtime (plus a compiler, or a pre-compiled JSON story) written in
  TypeScript. We ship a single HTML file with no runtime libraries and want dialogue as plain JS data
  that a test harness can inspect. Ink's text-scripting language is overkill for short villager chats.
  It covers dialogue only: no inventory, crafting, schedules or calendar.
- **Verdict:** adapt with attribution is allowed (MIT), but we take **ideas only** (node/choice/condition
  shape, visit counts, tags, a flag store). No code.

### Gaps (no sample adopted)

Inventory slots and stacks, recipe tables, NPC schedules and the calendar/day-night cycle have no
sample in this survey; no separate search was run for them. These systems are plain data plus small pure
functions, so they are designed from scratch (see Foundation).

---

## Side-by-side

| Mechanic | 1 MDN / gamedev-js-tiles | 2 Red Blob A* | 3 MainLoop.js | 4 bryc PRNGs | 5 inkjs |
|---|---|---|---|---|---|
| Tilemap data + layers | **Yes** (flat arrays, atlas index) | Grid only (walls set) | — | — | — |
| Camera + visible-range culling | **Yes** (clamped follow) | — | — | — | — |
| Cached / chunked layer render | Partial (per-layer canvas; chunking described, not coded) | — | — | — | — |
| AABB vs tile collision | Yes (4 corners, 4-way only) | — | — | — | — |
| BFS / A* on grid | Logic grid mentioned | **Yes** (BFS, Dijkstra, A*, weights) | — | — | — |
| Fixed step + accumulator | No (variable dt, 0.25 s cap) | — | **Yes** (60 Hz, alpha, panic) | — | — |
| Seeded RNG | — | — | — | **Yes** (mulberry32, sfc32, splitmix32) | — |
| Dialogue nodes + conditions | — | — | — | — | **Yes** (choices, conditions, visit counts, tags) |
| Inventory / recipes | — | — | — | — | — |
| Calendar / day-night / schedules | — | — | — | — | Variables only |
| License fit for code reuse | No (MPL-2.0) | Yes (Apache-2.0) | Yes (MIT) | Yes (PD/MIT) | Yes (MIT), unused |

## Foundation

| System | Base idea | Taken from | Code reuse |
|---|---|---|---|
| Chunked tile rendering + camera | Map = `{cols, rows, ts, layers: {ground, soil, objects, overhead}}` of `Uint16Array`s indexed `r * cols + c`, plus an atlas-index → source-rect table. World split into 16×16-tile chunks. Each chunk caches one offscreen canvas per static layer, drawn only when that chunk is dirty: tilling, watering and crop growth mark one chunk dirty instead of redrawing the map. Each frame, blit only the chunks the camera overlaps. Camera follows the player, clamped to map bounds, with integer-rounded draw positions. Entities are y-sorted between `objects` and `overhead`. | Sample 1 (layers, atlas index, clamped camera, chunks-as-big-tiles from the article) | None; reimplemented |
| AABB-vs-tile collision | Player/NPC feet hitbox smaller than a tile. Move X, then resolve against every solid tile the box overlaps (not just corners). Then move Y and resolve. This handles diagonal input and boxes of any size. Solidity comes from a separate `solid` logic grid rebuilt per changed tile. | Sample 1 (logic grid; its corner-only, single-axis resolution is the thing we fix) | None |
| BFS / A* NPC pathing | Flat-array A* with a small binary heap, Manhattan heuristic, 4-way neighbours with Red Blob's parity tie-break for straighter paths, per-tile cost (path tiles cheaper than grass). BFS when costs are uniform. Re-path when the next step becomes blocked, and cache paths between schedule waypoints. | Sample 2 | None (rewrite); attribution comment above if structure stays close |
| Fixed 60 Hz step with accumulator | `acc += min(now - last, 250)`; `while (acc >= STEP) { update(STEP); acc -= STEP; if (++n > 240) { acc = 0; break; } }`; `render(acc / STEP)`. Pause on `visibilitychange`. Expose `step(n)` for the test harness. | Samples 3 + Fiedler article | None (our own ~20 lines) |
| Seeded RNG | mulberry32 stepped on `{rs}` inside the save state. Separate streams for the world (forage, weather) and for each day (derived from `seed ^ dayIndex`), so a reload replays the same day. | Sample 4 | **Verbatim algorithm** (see below) |
| Data-driven dialogue | JS data: `{id, speaker, text, tags, next | choices: [{text, if, set, next}]}`. Conditions are small predicate objects over a flag/variable store (friendship, season, day, item owned, visit count) rather than `eval`. Track visit counts per node. The dialogue state (current node, flags, counts) is JSON in the save. | Sample 5 (ideas) | None |
| Inventory slots/stacks + recipes | Fixed slot array of `{id, qty}`. Item table gives `maxStack`, category and price. `add()` fills existing stacks first, then empty slots, and returns the overflow. Recipes are data: `{out: {id, qty}, in: [{id, qty}], station}`. `canCraft`/`craft` are pure functions over the slot array. | Original | None |
| Calendar / day-night / schedules | Game clock in minutes (for example 10 game-min per real 7 s), a day from 06:00 to 02:00, 4 seasons × 28 days. Day-night is a tinted overlay blended from a keyframed color table by time of day, plus lit-window sprites. NPC schedules are data: `{season?, weekday?, weather?, entries: [{time, map, tile, anim}]}`, chosen by specificity and then walked with the pathfinder. | Original | None |

### Verbatim code we plan to adapt

Only mulberry32, from sample 4, written in the collection's existing "state on an object" form
(same arithmetic as `PRNGs.md`, with state on `o.rs` instead of a closure). Attribution comment to put
directly above it in source:

```js
// mulberry32 PRNG (Tommy Ettinger), JS form from bryc/code jshash/PRNGs.md
// https://github.com/bryc/code/blob/88c1317ea6f9b25c153afa9c369c365fed11b482/jshash/PRNGs.md
// Public domain (MIT fallback, Copyright (c) 2024 bryc). State kept on o.rs so it saves with the game.
function rnd(o) {
  o.rs = (o.rs + 0x6D2B79F5) | 0;
  let t = o.rs;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
```

Nothing else is copied. If implementation ends up mirroring Red Blob's search structure or
MainLoop.js's phases closely, add the attribution comments given in sections 2 and 3.

### Not verified

- The original mulberry32 C gist by Tommy Ettinger (linked from `PRNGs.md`) was not opened this session.
  Our reuse relies on bryc's `LICENSE.md` (public domain, MIT fallback), which was read.
- Red Blob Games has no commit hash; the version is the page's "Last modified: 9 Aug 2026". The license
  statement was read on the implementation page and in the `implementation.py` header. The separate
  "Introduction to A*" page's footer was not checked.
- MDN states that its CC0 code-sample rule cannot be confirmed per sample since 2020 (Yari). That doesn't
  matter here because the Tilemaps material is reference only.

## Visual pass (2026-10-29): vendored fonts

Seven font families, latin subsets only, from npm `@fontsource/*` **5.2.5** (`npm pack`), each under the
SIL Open Font License 1.1 (license text copied beside each file as `vendor/fonts/LICENSE-<family>.txt`).
`tools/build-fonts.mjs` inlines them as base64 into `assets/fonts.css`, which the build inlines into
`index.html` (Chrome blocks `@font-face url()` from file://).

| Family | Weight(s) | npm package | Used for |
|---|---|---|---|
| IM Fell English | 400 | @fontsource/im-fell-english@5.2.5 | 1807 and 1871 display type and signs |
| Playfair Display | 700 | @fontsource/playfair-display@5.2.5 | 1886 display, signs, the title wordmark |
| Josefin Sans | 700 | @fontsource/josefin-sans@5.2.5 | 1931 display and signs, title subtitle |
| Righteous | 400 | @fontsource/righteous@5.2.5 | 1955 display and signs |
| Outfit | 600 | @fontsource/outfit@5.2.5 | 2026 display and signs |
| Alegreya | 400, 700 | @fontsource/alegreya@5.2.5 | body text, chapters 1–3 |
| Nunito Sans | 400, 700 | @fontsource/nunito-sans@5.2.5 | body text, chapters 4–6 |

No other third-party code or art is used: painted images are generated for this game and characters are rendered
in Blender (see the next section).

## Art provenance

| Art | Count | Made with | Record |
|---|---|---|---|
| Painted images in `assets/` (buildings, terrain textures, trees, props, vehicles, crops, animals, lamps, item icons, title and era panoramas, the spring boxes, soaking basin and creek culvert) | 225 WebP files | The image generation tool of the OpenAI Codex CLI (session model GPT-6.1 Sol), 14 prompts, 2026-10-29 | Every prompt, verbatim, in `art-src/PROMPTS.md`; per-image packing settings in `art-src/art.json` |
| Characters (three layered atlases) | 3 | Blender 5.2, rendered from a script (background mode) | `art-src/blender/characters.py` and `characters.blend` |
| Packing | — | `tools/pack-art.mjs` (keys out the white background, trims, resizes, makes textures seamless, encodes WebP) | `art-src/art.json` |

- **Style references.** The first prompt (the style pilot) used none. Every later prompt names earlier generated
  images from `art-src/` (mostly the approved pilot) as its style reference; `PROMPTS.md` shows which.
- **No photographs.** No photographs or third-party images were given to the image generator, as style references
  or as image-to-image inputs. The user's `/Sample Images/` reference photos (git-ignored) were not used for this
  game's art at all. Benchmark screenshots of other games (`benchmarks/`, git-ignored) were shown only to the
  reviewing agents that scored the work, never to the image generator.
- **No logos, real people or text.** Every prompt asked for no text, lettering, logos or signatures and blank sign
  boards (the game draws the words). People in the game are fictional and drawn by the Blender pipeline.
- **License.** The generated images, the Blender renders and their sources ship under this repository's MIT
  license (`LICENSE`), like the code. The fonts above keep their own OFL license.
- **Sources kept locally.** The generated source PNGs are not in git (`art-src/**/*.png`); the packed files in
  `assets/` are the shipped output and can be regenerated only from the prompts, not byte-for-byte.
