#!/usr/bin/env node
// Checks every fact card the game can display.
//   node tools/check-facts.mjs
// 1. data/facts.json: each fact quotes strings that really appear in its research file (research/garvan-*.md),
//    and has text, a source and a URL.
// 2. src/js/sim/data.js: every fact id it uses (years, events, plants, staff lines, plaques) exists.
// 3. Any year shown in game text (intro paragraphs, staff lines) must appear in a fact attached to that text,
//    so no unsourced date reaches the screen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '..');
const facts = JSON.parse(fs.readFileSync(path.join(game, 'data/facts.json'), 'utf8')).facts;
const D = await import(pathToFileURL(path.join(game, 'src/js/sim/data.js')).href);

const byId = new Map(facts.map((f) => [f.id, f]));
let bad = 0;
const fail = (msg) => { bad++; console.log('FAIL ' + msg); };

for (const f of facts) {
  if (!f.text || !f.source || !f.sourceUrl) fail(`${f.id}: missing text/source/url`);
  if (!f.corpus) { fail(`${f.id}: no corpus reference`); continue; }
  const src = fs.readFileSync(path.join(game, f.corpus.file), 'utf8').replace(/\s+/g, ' ');
  for (const c of f.corpus.contains) if (!src.includes(c)) fail(`${f.id}: "${c}" not found in ${f.corpus.file}`);
  if (!src.includes(f.sourceUrl)) fail(`${f.id}: source URL not listed in ${f.corpus.file}`);
  console.log(`ok   ${f.id.padEnd(20)} ${f.corpus.file}`);
}

const texts = [];
const used = new Set();
const need = (id, where) => { if (!id) return; used.add(id); if (!byId.has(id)) fail(`${where}: unknown fact "${id}"`); };
for (const y of D.YEARS.slice(1)) { y.introFacts.forEach((id) => need(id, `year ${y.n}`)); y.intro.forEach((t) => texts.push({ where: `year ${y.n} intro`, t, facts: y.introFacts })); }
for (const [id, p] of Object.entries(D.PEOPLE)) for (const l of p.lines) { need(l.fact, `${id} line`); texts.push({ where: `${id} line`, t: l.t, facts: l.fact ? [l.fact] : [] }); }
for (const [id, e] of Object.entries(D.EVENTS)) need(e.fact, `event ${id}`);
for (const [id, p] of Object.entries(D.PLANTS)) need(p.fact, `plant ${id}`);
for (const [id, s] of Object.entries(D.SIGNS)) s.facts.forEach((f) => need(f, `plaque ${id}`));

for (const x of texts) {
  const years = x.t.match(/\b(1[89]\d\d|20[0-3]\d)\b/g) || [];
  for (const y of years) {
    const ok = x.facts.some((id) => byId.has(id) && byId.get(id).text.includes(y));
    if (!ok) fail(`${x.where}: year ${y} not backed by an attached fact — "${x.t.slice(0, 70)}…"`);
  }
}

const unused = facts.filter((f) => !used.has(f.id)).map((f) => f.id);
if (unused.length) console.log(`note: ${unused.length} facts not referenced by game data: ${unused.join(', ')}`);
console.log(`\n${facts.length} facts, ${texts.length} game texts scanned, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
