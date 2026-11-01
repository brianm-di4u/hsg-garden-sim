# Woodland Gardens Keeper: design notes

## The garden (map)

`src/js/sim/world.js` builds a 120 × 90 tile map (about 11 m per tile, north up) from tables, so positions can be
corrected by editing data:

- **Shoreline** (`landAt`): the peninsula points west into Lake Hamilton; north and south shores close in to Perry
  Point near x = 6; the mainland is east of x = 100, where Arkridge Road comes in.
- **Zones** (`ZONES`): one per real area, in priority order. Each tile belongs to the first rectangle containing
  it. Zones drive the HUD ("You are in…"), work orders and the Garden Rating.
- **Paths** (`LOOP`, `SHORT`, trails): polylines rasterised two tiles wide; where a path crosses a stream it
  becomes a bridge. `LOOP` follows the visitor walk-through order in the research notes and is also the route
  visitors walk. The Millsap Canopy Bridge is boardwalk over the blocking Singing Springs Gorge.
- **Buildings** (`BUILDINGS`): Welcome Center (the gate), Chipmunk Café, Anthony Chapel and carillon, Bride's Hall,
  Groom's Quarters, Garvan Pavilion, Treehouse, Perry restrooms, and the staff yard (maintenance barn,
  greenhouse, Lights Storage; the yard's location is invented).
- **Beds**: `TULIP_BEDS` (about 130 tiles; one tile ≈ 1,000 bulbs) and perennial shrub beds.
- **Markers**: stakes for every Holiday Lights and Fall in the Woodlands piece, and the trees to wrap.
- `gardenPlantings` places the permanent plants once per new game: woods by zone, a planting mix near the paths
  per zone, and signature plantings (cloud-clipped white azaleas at the Floating Cloud Bridge, Japanese maples
  round the koi pond, the camellia trail, bonsai, the conifer border).

Positions follow OpenStreetMap coordinates and walk-throughs; places without a published position (Great Lawn,
amphitheater, Pavilion, Southern Inspiration Garden) are placed plausibly. See `research/garvan-layout.md`.

## The year

4 seasons × 28 days (`data.js`); Spring = March–May and so on, one game day ≈ 3.25 real days (`realDate`).
`EVENTS` places the real calendar: Tulip Extravaganza (Sp 1–14), azaleas and dogwoods (Sp 12–20), Fall in the
Woodlands (F 4–25), Holiday Lights install from mid-September (F 5) to opening night November 21 (F 26), Trash Bash,
Celebrate Fall, Thanksgiving and Christmas closures, the January closure (W 11–19) with teardown and tulip
planting, Daffodil Days from February 1 (W 20). Opening hours (`calendar.hours`): 9–6 by day, 5–9:30 PM nights
during Holiday Lights, closed in January.

## Systems (src/js/sim)

| Module | What it does |
|---|---|
| `core.js` | Events to the UI, inventory, map queries, blocking, energy. Imported by every other sim module (no cycles). |
| `calendar.js` | Day of year, seasons, real dates, opening hours, darkness. |
| `garden.js` | Plant looks by day (bloom, fall colour, bare, thirsty, overdue for pruning); bed plantings; overnight changes (weeds, lawn growth, leaf drop, storm limbs, thirst, privet, freeze damage, the night crew and volunteers tidying part of it); the tool actions; zone scores. |
| `displays.js` | Holiday Lights and Fall in the Woodlands pieces: stored → set → tested ok / dark → struck; the install crew's nightly work; faults during the run. |
| `orders.js` | The morning board, built from the calendar and the garden's state with a seeded stream; progress; the year's goals. |
| `crowd.js` | Visitors (spawned through opening hours, walking the route, judging the zones they pass, dropping litter, walking dogs) and the peafowl (wander near home, fan for visitors in spring and summer, roost in a tree at night, wander into tulip beds). Uses its own random stream. |
| `sim.js` | New game, the tick, the player, staff schedules, buildings (board, supply bench, storage, café, GardenShop), weddings, talk and gifts, clock-out and the year-end review. |

**Garden Rating.** Each visitor averages the score of the zones they walk through (75% tidiness from litter, leaves
on walkways, weeds, stale mulch, long grass, limbs, thirsty or overdue plants and dark light pieces; 25% bloom),
plus a bonus for seeing a peafowl and, during Holiday Lights, how much of the display is lit. The day's rating
(0–5) also counts finished and unfinished orders. `tools/balance.mjs` keeps idle play below 2.8, steady work
above 3.0 and keen work above 3.6.

**Year goals** (reviewed after Winter 28): tulip beds 80% planted to the design by the end of January; Holiday
Lights fully lit on opening night; every wedding set up on time; an average rating at or above the year's bar.
The review raises the tool tier (blower, hose reel, chainsaw, zero-turn mower, utility cart).

## Facts

Every fact card is in `data/facts.json` with a `corpus` quote from `research/garvan-*.md` and its source URL;
`tools/check-facts.mjs` verifies the quotes, the URLs, every fact id used in `data.js`, and that any year shown in
game text is backed by an attached fact.

## Art

Painted art (Codex image generation, prompts in `art-src/PROMPTS.md`, packing in `art-src/art.json`) for the
buildings, the garden trees, the peafowl, the pine-straw texture and the title panorama; Blender characters;
everything that changes daily (shrub bloom, bed plantings, ground clutter, light pieces) is drawn in code
(`src/js/render/garden.js`), which is also the full fallback with `?art=0`.
