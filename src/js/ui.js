// DOM UI: HUD, hotbar, prompt, toasts and every panel. Panels are rebuilt from state when opened or
// changed; clicks are delegated through data-act attributes (main.js routes them).
import * as sim from './sim/sim.js';
import * as D from './sim/data.js';
import { ZONES, W } from './sim/world.js';
import { iconURL, personSprite } from './render/art.js';
import * as PA from './render/painted.js';
import { UI_THEME } from './render/palette.js';

export const qs = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
let app = null;
let FACT = new Map();
export function init(a, facts) { app = a; FACT = new Map(facts.map((f) => [f.id, f])); }
export const fact = (id) => FACT.get(id);

// ---------- theme ----------
export function applyTheme() {
  const t = UI_THEME, r = document.documentElement.style;
  r.setProperty('--ui-bg', t.bg); r.setProperty('--ui-fg', t.fg); r.setProperty('--ui-accent', t.accent);
  r.setProperty('--ui-accent-fg', t.accentFg); r.setProperty('--ui-muted', t.muted); r.setProperty('--ui-border', t.border); r.setProperty('--ui-font', t.font); r.setProperty('--ui-display', t.display);
}

// ---------- HUD ----------
const last = {};
const setText = (id, v) => { if (last[id] !== v) { last[id] = v; const el = document.getElementById(id); if (el) el.textContent = v; } };
const WX = { clear: ['☀', 'Clear'], rain: ['🌧', 'Rain'], storm: ['⛈', 'Storm'], snow: ['❄', 'Snow'], ice: ['🧊', 'Ice'], fog: ['🌫', 'Fog'], heat: ['🔥', 'Hot'] };
export const leaves = (r) => { const n = Math.round(r * 2) / 2; return '🍃'.repeat(Math.floor(n)) + (n % 1 ? '½' : ''); };
export function hud(gm) {
  const S = gm.S;
  setText('h-date', `${sim.dateLabel(S)} · ${sim.realDate(sim.doy(S))}`);
  const h = sim.hours(S);
  setText('h-time', sim.clock(S) + (h.mode === 'closed' ? ' · Closed' : sim.isOpen(S) ? (h.mode === 'lights' ? ' · Lights' : ' · Open') : ''));
  const wx = S.weather + (S.freezeTonight ? '!' : '');
  if (last.wx !== wx) { last.wx = wx; const [ic, word] = WX[S.weather] || WX.clear; const el = document.getElementById('h-wx'); if (el) el.innerHTML = `<span aria-hidden="true">${ic}</span><span class="wx-w"> ${word}${S.freezeTonight ? ' · freeze tonight' : ''}</span>`; }
  setText('h-money', `${money(S.money)} · ${S.rating.toFixed(1)}★`);
  setText('h-energy', `${Math.round(S.energy)}/${S.maxEnergy}`);
  const pct = Math.round(S.energy / S.maxEnergy * 100);
  if (last.ebar !== pct) { last.ebar = pct; qs('#h-ebar').style.width = pct + '%'; qs('.h-energy').classList.toggle('low', S.energy <= 15); }
  const p = S.player, zone = sim.zoneAt(gm, Math.floor(p.x), Math.floor(p.y - 0.1));
  const open = S.orders.filter((o) => !o.done);
  const sig = S.orders.map((o) => o.id + o.prog + (o.done ? 1 : 0)).join('|') + zone.name;
  if (last.quest !== sig) {
    last.quest = sig;
    qs('#h-quest').innerHTML = `<div class="zone">${esc(zone.name)}</div><b>Work orders · ${S.orders.length - open.length}/${S.orders.length}</b>` + (open.length ? open.slice(0, 3).map((o) => `<div class="q">◇ ${esc(o.title)} <span class="muted">${esc(sim.progressText(o))}</span></div>`).join('') + (open.length > 3 ? `<div class="q muted">+${open.length - 3} more on the board</div>` : '')
      : `<div class="q">✓ Board clear. Walk the garden, or clock out at the barn.</div>`);
  }
  hotbar(gm);
}
export function hotbar(gm) {
  const S = gm.S;
  const sig = S.inv.slice(0, sim.HOTBAR).map((it) => (it ? it.id + it.n : '-')).join(',') + '|' + S.sel + '|' + S.can + '|' + S.tier;
  if (last.hot === sig) return;
  last.hot = sig;
  const cap = D.CAN_CAP[S.tier];
  qs('#hotbar').innerHTML = S.inv.slice(0, sim.HOTBAR).map((it, i) => `<button class="slot${i === S.sel ? ' sel' : ''}" data-act="hot" data-arg="${i}" aria-label="Slot ${i + 1}: ${it ? esc(nameOf(S, it.id)) + (it.n > 1 ? ' ×' + it.n : '') : 'empty'}${i === S.sel ? ' (selected)' : ''}">
      <span class="k">${i + 1}</span>${it ? `${icon(it.id)}${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}` : ''}
      ${it && it.id === 'can' ? `<span class="jug"><i style="width:${Math.round(S.can / cap * 100)}%"></i></span>` : ''}</button>`).join('');
}
export function resetHud() { for (const k of Object.keys(last)) delete last[k]; }
const nameOf = (S, id) => (D.ITEMS[id] && D.ITEMS[id].kind === 'tool' ? D.toolName(id, S.tier) : D.itemName(id));

// ---------- prompt ----------
export function describeTarget(gm) {
  const S = gm.S;
  const t = sim.target(gm), k = t.x + ',' + t.y;
  const npc = sim.npcAt(gm, t.x, t.y);
  if (npc) return `Talk to ${D.PEOPLE[npc].name.split(' ')[0]}`;
  const bird = sim.peafowlAt(gm, t.x, t.y);
  if (bird) return S.peafowlInBeds[bird.id] ? `Shoo ${bird.id === 'george' ? 'George' : 'the peahen'} out of the bed` : `Admire ${bird.id === 'george' ? 'George' : 'the peahen'}`;
  const bi = t.x >= 0 && t.y >= 0 && t.x < W ? gm.bmap[t.y * W + t.x] : -1;
  if (bi >= 0) {
    const b = gm.world.buildings[bi];
    return { barn: 'Open: work-order board', greenhouse: 'Open: supply bench', storage: 'Open: Lights Storage', cafe: 'Open: Chipmunk Café', welcome: 'Open: GardenShop', chapel: 'Read: Anthony Chapel', pavilion: 'Read: Garvan Pavilion', treehouse: 'Read: the Treehouse', carillon: 'Read: the carillon' }[b.id] || '';
  }
  const f = gm.fixed[k];
  if (f) return { sign: 'Read the plaque', feeder: 'Bird feeder', fairy: 'Fairy Village', venue: 'Wedding site', pergola: 'Dooley Pergola', falls: 'Waterfall' }[f.t] || '';
  const sel = sim.selected(S), id = sel && sel.id;
  const m = gm.markerMap[k];
  if (m && (id === 'reel' || (id && id === m.item))) {
    const st = S.disp[m.id];
    if (!st) return m.wrap ? 'Wrap this tree in lights' : `Place ${D.itemName(m.item).toLowerCase()}`;
    return { set: 'Test the lights', dark: 'Fix the dead strand', ok: sim.phase(m.show, sim.doy(S)) === 'strike' ? 'Take it down' : 'Working' }[st.st];
  }
  if (S.litter[k]) return 'Pick up litter';
  if (!sel) return '';
  const o = S.objs[k];
  switch (id) {
    case 'trowel': if (S.weeds[k]) return 'Pull weeds'; { const L = sim.bedLook(S, S.beds[k], sim.doy(S)); if (L && (L.stage === 'spent' || L.stage === 'tired')) return 'Pull the spent plants'; } break;
    case 'rake': if (S.leaves[k]) return S.tier >= 2 ? 'Blow the leaves' : 'Rake leaves'; break;
    case 'mower': if (S.grass[k]) return 'Mow'; break;
    case 'can': if (o && o.t === 'plant' && D.PLANTS[o.k] && D.PLANTS[o.k].thirsty && !S.watered[k]) return `Water the ${D.PLANTS[o.k].name.toLowerCase()}`; if (S.beds[k] && S.beds[k].p === 'annual' && !S.watered[k]) return 'Water the annuals'; break;
    case 'pruners': if (o && (o.t === 'plant' || o.k === 'jmaple') && sim.needsPrune(o, sim.doy(S), sim.yearNo(S))) return `Prune the ${D.PLANTS[o.k].name.toLowerCase()}`; break;
    case 'saw': if (o && o.t === 'limb') return 'Cut up the fallen limb'; if (o && o.k === 'privet') return 'Cut out the privet'; break;
    case 'straw': if (gm.world.g[t.y * W + t.x] === 15) return 'Spread pine straw'; break;
  }
  if (id && id.startsWith('bulb:') && gm.bedMap[k] && !S.beds[k]) return `Plant ${id.slice(5)} tulips`;
  if (id === 'annuals' && gm.bedMap[k] && !S.beds[k]) return 'Plant annuals';
  if (id === 'cloth' && S.beds[k] && S.beds[k].p === 'tulip' && !S.covered[k]) return 'Cover with frost cloth';
  if (o && o.t === 'plant' && D.PLANTS[o.k]) { const L = sim.plantLook(o, sim.doy(S), sim.yearNo(S)); return `${D.PLANTS[o.k].name}${L.bloom ? ' (in bloom)' : ''}`; }
  return '';
}

// ---------- toasts ----------
export function toast(text, kind = 'info') {
  const box = qs('#toasts');
  const same = [...box.children].find((c) => c.dataset.text === text);
  if (same) { same.dataset.n = (+same.dataset.n || 1) + 1; same.textContent = text + '  ×' + same.dataset.n; clearTimeout(same._t); same._t = setTimeout(() => same.remove(), 2800); }
  const el = same || document.createElement('div');
  if (!same) { el.className = 'toast ' + kind; el.textContent = text; el.dataset.text = text; box.appendChild(el); }
  while (box.children.length > 3) box.firstChild.remove();
  if (!same) el._t = setTimeout(() => el.remove(), kind === 'quest' ? 4200 : 2800);
  const sr = qs('#sr'); sr.textContent = ''; sr.textContent = text;
  app.toastLog.push(text); if (app.toastLog.length > 30) app.toastLog.shift();
}

// ---------- screens ----------
export function show(html, cls = '') {
  const s = qs('#screen');
  s.className = 'screen ' + cls;
  s.innerHTML = html;
  s.hidden = false;
  const f = s.querySelector('[data-focus]') || s.querySelector('button.primary') || s.querySelector('button');
  if (f) f.focus({ preventScroll: true });
}
export function hide() { const s = qs('#screen'); s.hidden = true; s.innerHTML = ''; s.className = 'screen'; }
const closeBtn = '<button class="btn" data-act="close">Close <span class="kbd">Esc</span></button>';
const head = (title, extra = '') => `<div class="row spread"><h2>${esc(title)}</h2><div class="row">${extra}${closeBtn}</div></div>`;

export function titleScreen(hasSave, saveInfo) {
  show(`<div class="title-wrap">
    <div class="brand"><h1>Woodland Gardens Keeper</h1><div class="sub">A year on the grounds at Garvan Woodland Gardens</div></div>
    <div class="title-menu">
      ${hasSave ? `<button class="btn primary" data-act="continue" data-focus>Continue</button>` : `<button class="btn" disabled>Continue</button>`}
      <button class="btn ${hasSave ? '' : 'primary'}" data-act="newgame" ${hasSave ? '' : 'data-focus'}>New game</button>
      <button class="btn" data-act="open" data-arg="settings">Settings</button>
      <button class="btn" data-act="open" data-arg="help">Help</button>
      <button class="btn" data-act="open" data-arg="about">About</button>
    </div>
    ${saveInfo ? `<div class="title-note">${esc(saveInfo)}</div>` : ''}
    <div class="title-note">A gardening and grounds-keeping sim set at the real Garvan Woodland Gardens in Hot Springs, Arkansas. Staff and prices are invented; garden facts cite their sources.</div>
  </div>`, 'title');
}

export function helpScreen() {
  const k = app.settings.keys;
  const kb = (a) => k[a].map((x) => `<span class="kbd">${esc(keyName(x))}</span>`).join(' ');
  show(`<div class="panel">${head('Help')}
    <h3>Controls</h3>
    <table class="keys">
      <tr><td>Move</td><td>${kb('up')} ${kb('left')} ${kb('down')} ${kb('right')} · touch pad · tap a tile to walk there</td></tr>
      <tr><td>Use tool / item</td><td>${kb('use')} · <b>A</b> button · click or tap a tile next to you</td></tr>
      <tr><td>Talk / interact</td><td>${kb('talk')} · <b>B</b> button</td></tr>
      <tr><td>Hotbar</td><td><span class="kbd">1</span>–<span class="kbd">8</span>, ${kb('prev')} ${kb('next')}, mouse wheel, tap a slot</td></tr>
      <tr><td>Eat selected</td><td>${kb('eat')}</td></tr>
      <tr><td>Pack · Journal · Menu</td><td>${kb('inv')} · ${kb('journal')} · ${kb('pause')}</td></tr>
    </table>
    <h3>Your job</h3>
    <p>You start each morning at the <b>maintenance barn</b> (southeast of the parking lot). The board there lists the day's <b>work orders</b>. Grab supplies at the <b>greenhouse</b> bench (pine straw, bulbs, annuals, frost cloth, bird seed) and display pieces at <b>Lights Storage</b>. Clock out at the barn to end the day.</p>
    <p>Visitors judge every area they walk through: litter, leaves on the paths, weeds and stale mulch in the beds, long grass, storm limbs, thirsty or overgrown plants, and dark light pieces all pull the <b>Garden Rating</b> down; flowers in bloom and a good show lift it. The rest of the crew and the volunteers handle part of the mess overnight.</p>
    <h3>The year</h3>
    <p>Spring: Tulip Extravaganza, then azaleas and dogwoods; pull the tulips and plant summer annuals. Summer: water, mow and weed in the heat; weddings. Fall: Fall in the Woodlands mums and pumpkins, then the Holiday Lights install from mid-September for opening night in late November. Winter: Holiday Lights nights, then the January closure, when the lights come down and the tulips go in, planted to this year's design. Check the <b>Calendar</b> in the journal.</p>
    <h3>What is real</h3>
    <p>The garden's layout, buildings, plants, events and the peacock George come from the research notes (see About); fact cards cite their sources. The staff, the wages, the exact game dates and the work orders are <b>game content</b>.</p>
  </div>`);
}

export function aboutScreen() {
  show(`<div class="panel">${head('About')}
    <p><b>Woodland Gardens Keeper</b> is an original, open-source (MIT) gardening sim, part of the Hot Springs Games collection. It is set at Garvan Woodland Gardens (University of Arkansas, Hot Springs) but is not affiliated with or endorsed by the garden or the university. No logos are used.</p>
    <p>The map follows the real layout as closely as the sources allow: the peninsula points west into Lake Hamilton, the Welcome Center is the gate, Anthony Chapel sits outside it by the parking lot, the Garden of the Pine Wind lies in the ravine to the southwest, the path runs west to Perry Wildflower Overlook and back over the Millsap Canopy Bridge. Distances are compressed, and places whose exact spot was not published (the Great Lawn, the amphitheater, the Pavilion) are placed plausibly. The maintenance yard's location is invented.</p>
    <p>Facts come from the garden's own pages, the Encyclopedia of Arkansas, University of Arkansas news, the Sentinel-Record, Arkansas Tourism and others, collected in research/garvan-layout.md and research/garvan-operations.md; each card names its source. George the peacock is real; the two peahens are a game addition (a visitor report mentions a peahen, but no count is published). The 2026 kinetic art installation is not shown.</p>
    <p class="muted small">Art is drawn in code, plus painted art generated for the Hot Springs Games collection with OpenAI's Codex image tool from prompts kept in the repository, and Blender character renders. Fonts are open-source (SIL OFL); sounds are synthesized.</p>
  </div>`);
}

export function pauseScreen(canSave) {
  show(`<div class="panel" style="max-width:24rem">${head('Paused')}
    <div style="display:grid;gap:8px">
      <button class="btn primary" data-act="close" data-focus>Resume</button>
      <button class="btn" data-act="save" ${canSave ? '' : 'disabled'}>Save now</button>
      <button class="btn" data-act="open" data-arg="journal">Journal</button>
      <button class="btn" data-act="open" data-arg="settings">Settings</button>
      <button class="btn" data-act="open" data-arg="help">Help</button>
      <button class="btn" data-act="title">Save and quit to title</button>
    </div>${canSave ? '' : '<p class="small muted">Saving is unavailable in this browser (storage blocked). Progress lasts until you close the page.</p>'}</div>`);
}

// ---------- pack ----------
export function inventoryScreen(gm, tab = 'items', pick = null) {
  const S = gm.S;
  const slots = S.inv.map((it, i) => `<button class="slot${i === S.sel ? ' sel' : ''}${i === pick ? ' pick' : ''}" data-act="slot" data-arg="${i}" aria-label="Slot ${i + 1}: ${it ? esc(nameOf(S, it.id)) + ' ×' + it.n : 'empty'}">
    ${i < sim.HOTBAR ? `<span class="k">${i + 1}</span>` : ''}${it ? `${icon(it.id)}${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}` : ''}</button>`).join('');
  const it = pick != null ? S.inv[pick] : sim.selected(S);
  const det = it ? itemDetail(gm, it) : '<span class="muted">Select an item. Click two slots to swap them; slots 1–8 are the hotbar.</span>';
  show(`<div class="panel">${head('Pack', `<span class="muted">${money(S.money)}</span>`)}<div class="grid">${slots}</div><div class="detail">${det}</div></div>`);
}
function itemDetail(gm, it) {
  const S = gm.S, def = D.ITEMS[it.id];
  const kind = { tool: 'Tool', material: 'Supplies', display: 'Display piece', food: 'Food', wear: 'Hat' }[def.kind] || def.kind;
  return `<div class="row">${icon(it.id, 'big')}<div class="grow"><b>${esc(nameOf(S, it.id))}</b> ×${it.n}
    <div class="small muted">${esc(kind)}${def.energy ? ` · +${def.energy} energy` : ''}${it.id === 'can' ? ` · ${S.can} water` : ''}${def.desc ? ' · ' + esc(def.desc) : ''}</div></div>
    ${def.energy ? `<button class="btn sm" data-act="eat" data-arg="${it.id}">Eat</button>` : ''}</div>`;
}

// ---------- buildings ----------
export function boardScreen(gm) {
  const S = gm.S;
  const li = (o) => `<li class="li ${o.done ? 'done' : ''}"><div class="grow"><b>${o.done ? '✓' : '◇'} ${esc(o.title)}</b><div class="small muted">${esc(D.ORDER_TYPES[o.type].unit)} · +$${o.pay}</div></div><span class="small">${o.done ? 'Done' : esc(sim.progressText(o))}</span></li>`;
  const w = S.wedding;
  show(`<div class="panel">${head('Work-order board')}
    <p class="small muted">${esc(sim.dateLabel(S))} (${esc(sim.realDate(sim.doy(S)))}). Visitors today: about ${S.attend}. ${w ? `Wedding: ${esc(w.name)} at ${sim.clockOf(w.at)}.` : ''} ${S.freezeTonight ? '<b>Hard freeze forecast tonight.</b>' : ''}</p>
    <ul class="list">${S.orders.map(li).join('') || '<li class="muted">No orders today.</li>'}</ul>
    <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn" data-act="open" data-arg="journal">Journal</button><button class="btn primary" data-act="open" data-arg="bed">Clock out…</button></div></div>`);
}
export function suppliesScreen(gm) {
  const S = gm.S;
  show(`<div class="panel">${head('Greenhouse supply bench')}
    <p class="small muted">The garden's own stock: take what today's work needs.</p>
    <ul class="list">${sim.supplyList(gm).map((e) => `<li class="li">${icon(e.id)}<div class="grow"><b>${esc(D.itemName(e.id))}</b><div class="small muted">${esc(e.note)} · you have ${sim.count(S, e.id)}</div></div>
      <button class="btn sm" data-act="supply" data-arg="${e.id}|1">Take 1</button>${e.max > 1 ? `<button class="btn sm" data-act="supply" data-arg="${e.id}|${Math.min(10, e.max)}">Take ${Math.min(10, e.max)}</button>` : ''}</li>`).join('')}</ul></div>`);
}
export function storageScreen(gm) {
  const S = gm.S, d = sim.doy(S);
  const line = (show) => { const c = sim.counts(gm, show), ph = sim.phase(show, d); return `<li class="li"><div class="grow"><b>${esc(sim.SHOWS[show].name)}</b><div class="small muted">${ph ? { install: 'Install window', live: 'Running', strike: 'Teardown' }[ph] : 'In storage'} · ${c.up}/${c.total} pieces out · ${c.ok} working${c.dark ? ` · ${c.dark} dark` : ''}${c.set ? ` · ${c.set} untested` : ''}</div></div></li>`; };
  show(`<div class="panel">${head('Lights Storage')}
    <p class="small muted">Holiday Lights and Fall in the Woodlands pieces live here between seasons. The install crew sets the heavy pieces each night; you carry the rest out to their marked stakes and test every one with the light reel.</p>
    <ul class="list">${line('fall')}${line('hl')}</ul>
    <div class="row" style="gap:8px"><button class="btn primary" data-act="storage" data-arg="take">Load pieces to place</button><button class="btn" data-act="storage" data-arg="return">Put pieces away</button></div></div>`);
}
export function shopScreen(gm, shop) {
  const S = gm.S, def = D.SHOPS[shop];
  show(`<div class="panel">${head(def.name, `<span class="muted">${money(S.money)}</span>`)}
    <ul class="list">${sim.shopList(S, shop).map((e) => `<li class="li">${icon(e.id)}<div class="grow"><b>${esc(D.itemName(e.id))}</b>${D.ITEMS[e.id].energy ? `<div class="small muted">+${D.ITEMS[e.id].energy} energy</div>` : ''}</div>
      <span class="price">${money(e.price)}</span><button class="btn sm" data-act="buy" data-arg="${shop}|${e.id}|1" ${S.money >= e.price ? '' : 'disabled'}>Buy</button></li>`).join('')}</ul>
    <p class="small muted">Game prices.</p></div>`);
}

// ---------- journal ----------
export function journalScreen(gm, tab = 'orders') {
  const S = gm.S;
  const tabs = ['orders', 'year', 'calendar', 'garden', 'staff', 'notes'].map((t) => `<button class="tab ${tab === t ? 'on' : ''}" data-act="jtab" data-arg="${t}">${{ orders: 'Orders', year: 'Year', calendar: 'Calendar', garden: 'Garden', staff: 'Staff', notes: 'Notes' }[t]}</button>`).join('');
  let body = '';
  if (tab === 'orders') {
    body = `<ul class="list">${S.orders.map((o) => `<li class="li ${o.done ? 'done' : ''}"><div class="grow"><b>${o.done ? '✓' : '◇'} ${esc(o.title)}</b></div><span class="small">${o.done ? 'Done' : esc(sim.progressText(o))}</span></li>`).join('')}</ul>
      <p class="small muted">New orders go up on the board in the maintenance barn every morning.</p>`;
  } else if (tab === 'year') {
    const yr = sim.yearNo(S), Y = D.yearDef(yr);
    body = `<p><b>Year ${yr}: ${esc(Y.title)}</b> · Garden Rating ${S.rating.toFixed(1)} (last two weeks)</p>
      <ul class="list">${sim.goals(gm).map((g) => `<li class="li ${g.done ? 'done' : ''}"><div class="grow"><b>${g.done ? '✓' : '◇'} ${esc(g.title)}</b><div class="small muted">${esc(g.text)}</div></div></li>`).join('')}</ul>
      <p class="small muted">Your year-end review comes after the last day of winter. Each review brings better tools.</p>
      ${S.yearsDone.map((r) => `<p class="small">Year ${r.year}: ${r.passed}/4 goals, rating ${r.rating}, orders ${r.orders}.</p>`).join('')}`;
  } else if (tab === 'calendar') {
    body = `<ul class="list">${sim.eventsAround(S, 40).map((e) => `<li class="li"><div class="grow"><b>${esc(e.name)}</b><div class="small muted">${esc(e.from)}${e.from !== e.to ? ' – ' + esc(e.to) : ''} (real dates)</div></div><span class="small">${e.now ? 'Now' : `in ${e.in} day${e.in > 1 ? 's' : ''}`}</span></li>`).join('')}</ul>
      <p class="small muted">Each game season is three real months; one game day stands for about three real days.</p>`;
  } else if (tab === 'garden') {
    const z = sim.zoneStats(gm);
    const t = sim.tulipProgress(gm);
    body = `<table class="keys"><tr><th>Area</th><th>Tidy</th><th>Bloom</th><th>To do</th></tr>${ZONES.map((Z, i) => ({ Z, s: z[i] })).filter(({ Z }) => Z.visitor && Z.id !== 'parking').map(({ Z, s }) => `<tr><td>${esc(Z.name)}</td><td>${s.tidy}</td><td>${s.bloomScore}</td><td class="small">${[s.litter && `${s.litter} litter`, s.leaves >= 1 && `leaves`, s.weeds && `weeds`, s.grass && `mowing`, s.limbs && `${s.limbs} limbs`, s.stale && `mulch`, s.dry && `${s.dry} thirsty`, s.shaggy && `${s.shaggy} to prune`, s.dark && `${s.dark} dark lights`].filter(Boolean).join(', ') || '—'}</td></tr>`).join('')}</table>
      <p class="small">Tulip beds: ${t.planted}/${t.total} tiles planted (${t.right} to the design).</p>`;
  } else if (tab === 'staff') {
    body = `<ul class="list">${Object.entries(S.npcs).map(([id, n]) => { const p = D.PEOPLE[id], h = sim.hearts(n.pts); return `<li class="li"><canvas class="pp" data-pid="${id}" width="36" height="48" aria-hidden="true"></canvas><div class="grow"><b>${esc(p.name)}</b><div class="small muted">${esc(p.role)}</div></div><span class="hearts" aria-label="${h} of 5 hearts">${'♥'.repeat(h)}${'♡'.repeat(5 - h)}</span></li>`; }).join('')}</ul><p class="small muted">The staff are fictional. Talk to them daily; small gifts from the café go a long way.</p>`;
  } else {
    const ids = S.almanac;
    body = `<p class="small muted">${ids.length} of ${FACT.size} garden notes collected (read plaques, talk to staff).</p>` + (ids.length ? ids.map((id) => factHtml(id)).join('') : '');
  }
  show(`<div class="panel">${head('Journal')}<div class="tabs">${tabs}</div>${body}</div>`);
  document.querySelectorAll('canvas.pp').forEach((c) => { const id = c.dataset.pid; const ctx = c.getContext('2d'); portrait(ctx, id, 36, 48, 64) || ctx.drawImage(personSprite(id, D.PEOPLE[id].look, 'down', 0, 64), 0, 0, 36, 48); });
}
export function repaintPortraits() {
  document.querySelectorAll('canvas.pp').forEach((c) => { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); portrait(ctx, c.dataset.pid, 36, 48, 64); });
  const c = document.querySelector('.dialog .portrait'), id = c && c.dataset.pid;
  if (c && id) { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, 84, 112); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, 84, 112); portrait(ctx, id, 84, 112, 160); }
}
function portrait(ctx, id, w, h, u) {
  const sp = PA.personSprite(id, D.PEOPLE[id].look, 'down', 'idle', u);
  if (!sp) return false;
  const cw = sp.c.width * 0.78, ch = cw * h / w;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sp.c, (sp.c.width - cw) / 2, sp.c.height * 0.03, cw, ch, 0, 0, w, h);
  return true;
}
function icon(id, cls = '') { return PA.iconHtml(id, cls) || `<img alt="" class="${cls}" src="${iconURL(id)}"${cls === 'big' ? ' width="40" height="40"' : ''}>`; }
export function factHtml(id) {
  const f = FACT.get(id);
  if (!f) return '';
  const site = String(f.sourceUrl || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  return `<div class="fact">${esc(f.text)}<span class="src" title="${esc(f.sourceUrl)}">Source: ${esc(f.source)} · <span class="site">${esc(site)}</span></span></div>`;
}

// ---------- settings ----------
export const ACTIONS = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', use: 'Use tool / item', talk: 'Talk / interact', eat: 'Eat selected', prev: 'Previous hotbar slot', next: 'Next hotbar slot', inv: 'Pack', journal: 'Journal', pause: 'Menu / close' };
export function keyName(code) { return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('Escape', 'Esc'); }
export function settingsScreen(waiting) {
  const s = app.settings;
  const opt = (act, val, cur, label) => `<button class="tab ${cur === val ? 'on' : ''}" data-act="${act}" data-arg="${val}" aria-pressed="${cur === val}">${label}</button>`;
  show(`<div class="panel">${head('Settings')}
    <h3>Text size</h3><div class="tabs">${opt('text', '1', String(s.text), '100%')}${opt('text', '1.25', String(s.text), '125%')}${opt('text', '1.5', String(s.text), '150%')}</div>
    <h3>Motion</h3><div class="tabs">${opt('motion', 'auto', s.motion, 'Follow system')}${opt('motion', 'reduced', s.motion, 'Reduced')}${opt('motion', 'full', s.motion, 'Full')}</div>
    <h3>Touch controls</h3><div class="tabs">${opt('touch', 'auto', s.touch, 'Auto')}${opt('touch', 'on', s.touch, 'Always show')}${opt('touch', 'off', s.touch, 'Hide')}</div>
    <h3>Sound</h3><div class="tabs">${opt('mute', 'off', s.mute ? 'on' : 'off', 'Sound on')}${opt('mute', 'on', s.mute ? 'on' : 'off', 'Muted')}${opt('vol', '0.25', String(s.volume), 'Quiet')}${opt('vol', '0.5', String(s.volume), 'Normal')}${opt('vol', '1', String(s.volume), 'Loud')}</div>
    <h3>Graphics</h3><div class="tabs">${opt('gfx', 'painted', s.gfx || 'painted', 'Painted')}${opt('gfx', 'simple', s.gfx || 'painted', 'Simple (faster)')}</div>
    <h3>HUD</h3><div class="tabs">${opt('contrast', 'on', s.contrast ? 'on' : 'off', 'High contrast')}${opt('contrast', 'off', s.contrast ? 'on' : 'off', 'Standard')}</div>
    <h3>Keys</h3>
    <table class="keys">${Object.entries(ACTIONS).map(([a, label]) => `<tr><td>${label}</td><td>${s.keys[a].map((k) => `<span class="kbd">${esc(keyName(k))}</span>`).join(' ')}</td><td><button class="btn sm" data-act="rebind" data-arg="${a}">${waiting === a ? 'Press a key…' : 'Change'}</button></td></tr>`).join('')}</table>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-act="resetkeys">Reset keys</button></div>
  </div>`);
}

// ---------- dialogue and cards ----------
export function dialogScreen(d, gm) {
  const S = gm.S;
  const sel = sim.selected(S);
  const canGive = sel && !['tool', 'display'].includes(D.ITEMS[sel.id].kind);
  const facts = (d.facts || []).map(factHtml).join('');
  show(`<div class="dialog" role="dialog" aria-label="${esc(d.name)}"><canvas class="portrait" data-pid="${d.npc}" width="84" height="112" aria-hidden="true"></canvas>
    <div class="panel"><div class="row spread"><div><div class="who">${esc(d.name)} <span class="hearts small" aria-label="${d.hearts} hearts">${'♥'.repeat(d.hearts)}${'♡'.repeat(5 - d.hearts)}</span></div><div class="role">${esc(d.role)}</div></div></div>
    ${d.lines.map((l) => `<p class="text">${esc(l)}</p>`).join('')}
    ${d.giftText ? `<p class="text"><i>${esc(d.giftText)}</i></p>` : ''}
    ${facts ? `<details><summary class="small">Source</summary>${facts}</details>` : ''}
    <div class="row">${canGive && !d.giftText ? `<button class="btn" data-act="give" data-arg="${d.npc}">Give ${esc(D.itemName(sel.id).toLowerCase())}</button>` : ''}<button class="btn primary" data-act="close" data-focus>Bye</button></div></div></div>`, 'dlg');
  const c = document.querySelector('.dialog .portrait');
  if (c) { const ctx = c.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, 84, 112); portrait(ctx, d.npc, 84, 112, 160) || ctx.drawImage(personSprite(d.npc, D.PEOPLE[d.npc].look, 'down', 0, 80), 2, -6, 80, 120); }
}
export function bedScreen(gm) {
  const S = gm.S, open = S.orders.filter((o) => !o.done).length;
  show(`<div class="panel" style="max-width:28rem"><h2>Clock out?</h2>
    <p>It is ${sim.clock(S)}. Clocking out ends the day: you are paid, the Garden Rating is tallied, the night crew does its rounds, and the game saves.</p>
    ${open ? `<p class="small">${open} order${open > 1 ? 's are' : ' is'} still open.</p>` : ''}
    ${sim.hours(S).mode === 'lights' && S.time < 1290 ? '<p class="small">Holiday Lights is still running tonight. Dark pieces left unfixed cost the rating.</p>' : ''}
    <div style="display:grid;gap:8px"><button class="btn primary" data-act="sleep" data-focus>Clock out</button><button class="btn" data-act="close">Not yet</button></div></div>`);
}
export function signScreen(kind) {
  const s = D.SIGNS[kind];
  if (!s) return;
  show(`<div class="panel" style="max-width:34rem">${head(s.title)}${s.facts.map(factHtml).join('')}</div>`);
}
export function cardScreen(card) {
  show(`<div class="panel" style="max-width:38rem" role="dialog" aria-label="${esc(card.title)}">
    ${card.kicker ? `<div class="card-era">${esc(card.kicker)}</div>` : ''}<h2>${esc(card.title)}</h2>
    ${(card.paras || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    ${card.list ? `<ul class="list">${card.list.map((x) => `<li class="li ${x.done ? 'done' : ''}"><div class="grow">${x.done ? '✓' : '◇'} ${esc(x.title)}<div class="small muted">${esc(x.text || '')}</div></div></li>`).join('')}</ul>` : ''}
    ${(card.facts || []).map(factHtml).join('')}
    ${card.note ? `<p class="small muted">${esc(card.note)}</p>` : ''}
    <div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="cardnext" data-focus>${esc(card.button || 'Continue')}</button></div></div>`);
}
export function summaryScreen(gm, sum) {
  const S = gm.S;
  const notes = [];
  if (sum.storm) notes.push(`The storm brought down ${sum.storm} limbs.`);
  if (sum.freeze) notes.push(sum.freeze.burnt ? `The hard freeze burned ${sum.freeze.burnt} uncovered tulip bed tiles.` : 'The tulips came through the freeze under their frost cloth.');
  if (sum.wilting) notes.push(`${sum.wilting} plants are wilting in the heat. Water them.`);
  if (sum.dark) notes.push(`${sum.dark} light pieces went dark overnight.`);
  if (sum.crew) notes.push(`The install crew set ${sum.crew} piece${sum.crew > 1 ? 's' : ''} overnight.`);
  if (sum.crewOut) notes.push(`The crew took down ${sum.crewOut} piece${sum.crewOut > 1 ? 's' : ''}.`);
  if (sum.crewBeds) notes.push(`The crew cleared ${sum.crewBeds} bed tiles you didn't get to.`);
  show(`<div class="panel" style="max-width:32rem" role="dialog" aria-label="Day report">
    <div class="card-era">Day report · ${esc(sum.date)} (${esc(sum.real)})</div><h2>${esc(sim.dateLabel(S))}</h2>
    ${sum.passOut ? `<p><b>You worked past 2:00 AM.</b> A security guard drove you home. You woke tired.</p>` : ''}
    <p>Garden Rating yesterday: <b>${sum.rating != null ? sum.rating.toFixed(1) + ' ★' : 'no visitors'}</b> (${sum.visitors} visitor${sum.visitors === 1 ? '' : 's'} surveyed) · Pay: <b>${money(sum.wage + sum.orders.reduce((a, o) => a + o.pay, 0))}</b></p>
    <ul class="list">${sum.orders.map((o) => `<li class="li ${o.done ? 'done' : ''}"><div class="grow">${o.done ? '✓' : '✗'} ${esc(o.title)}</div>${o.pay ? `<span class="price">+$${o.pay}</span>` : ''}</li>`).join('') || '<li class="muted">No orders.</li>'}</ul>
    ${notes.map((n) => `<p class="small">${esc(n)}</p>`).join('')}
    <p>Weather today: ${esc((WX[S.weather] || WX.clear)[1])}${S.freezeTonight ? ' · <b>hard freeze forecast tonight</b>' : ''}.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="cardnext" data-focus>Start the day</button></div></div>`);
}
