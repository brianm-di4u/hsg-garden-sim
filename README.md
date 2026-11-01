# Woodland Gardens Keeper

A gardening and grounds-keeping sim set at **Garvan Woodland Gardens**, the University of Arkansas botanical
garden on a Lake Hamilton peninsula in Hot Springs. You work a year (or several) on the grounds crew: pick up
after the visitors, weed, mulch with pine straw, rake, mow, water, prune each plant in its season, clear storm
limbs and invasive privet, plant the tulip beds to the year's design during the January closure, set up
weddings at Anthony Chapel, and install, run and tear down Fall in the Woodlands and Holiday Lights. George the
peacock wanders the grounds.

Part of **Hot Springs Games**, an open-source (MIT) collection of browser games set in Hot Springs, Arkansas.
The game ships as a self-contained `index.html`: art is drawn in code or painted into `assets/`, sound is
synthesized with WebAudio, and nothing loads from the network.

Real places appear as setting only: no logos are reproduced and nothing implies endorsement by the garden or
the university. The staff, wages, work orders and exact game dates are invented. Garden facts are sourced:
see `research/garvan-layout.md`, `research/garvan-operations.md` and the fact cards in `data/facts.json`.

## Play

Open `index.html` in a browser, or serve the folder (`python -m http.server 8765`) and open http://127.0.0.1:8765/.

## Develop

```bash
npm run setup   # installs Playwright and Chromium for the test harness
npm run build   # rebuilds index.html from src/ (edit src/, not index.html)
npm test        # runs tests/*.test.mjs; screenshots land in screenshots/
node tools/check-facts.mjs   # every fact card quotes its research note and cites its source
node tools/balance.mjs       # a year with idle, steady and keen bots; checks the Garden Rating bands
node tools/perf-scenes.mjs   # frame rate in the busiest scenes
node tools/pack-art.mjs      # art-src/*.png → assets/*.webp (see art-src/art.json, art-src/PROMPTS.md)
```

Design notes: `DESIGN.md`. Code-sample survey: `SAMPLES.md`.

## Vendored from the collection

- `shared/test-harness/`: the Playwright screenshot test runner.
- `shared/tools/inline.mjs`: bundles `src/` into the single-file `index.html`. It does not support
  `export … from` re-exports: write `export const x = mod.x;` instead.

## License

MIT (see `LICENSE`). Third-party code in `vendor/` keeps its own license.
