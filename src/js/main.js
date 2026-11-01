// Boot, fixed-step loop, input, screen flow, saves and the window.__game test hooks.
import * as sim from './sim/sim.js';
import * as D from './sim/data.js';
import { W, H } from './sim/world.js';
import { hash } from './sim/rng.js';
import * as save from './sim/save.js';
import * as scene from './render/scene.js';
import * as ui from './ui.js';
import { play, unlock, setVolume, audioState } from './audio.js';
import { artCacheSize, clearArt } from './render/art.js';
import { FONT_FAMILIES } from './render/palette.js';
import { ART, want, allNames } from './render/assets.js';
import * as PA from './render/painted.js';
import { terrainReady } from './render/terrain.js';

const T0 = performance.now();
const DEFAULT_KEYS = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], use: ['Space', 'KeyJ'], talk: ['KeyE', 'KeyK'], eat: ['KeyF'], prev: ['KeyQ'], next: ['KeyR'], inv: ['KeyI', 'Tab'], journal: ['KeyL'], pause: ['Escape'] };
const app = {
  gm: null, settings: null, storageOK: true, paused: false, seed: null, toastLog: [], held: new Set(), queue: [], modalQueue: [],
  ui: { scene: 'title', modal: null, data: null, invPick: null, jTab: 'orders', rebinding: null },
  fx: { animAt: null }, pad: { x: 0, y: 0 }, loadMs: 0, lastRenderTitle: false, dirty: true,
};
window.__gwApp = app;
window.__gwScene = scene;

// ---------- storage ----------
function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch { return false; } }
function load(k) { try { return localStorage.getItem(k); } catch { return null; } }
function probeStorage() { try { localStorage.setItem('garvan-probe', '1'); localStorage.removeItem('garvan-probe'); return true; } catch { return false; } }
function loadSettings() {
  let s = {};
  try { s = JSON.parse(load(save.SETTINGS_KEY) || '{}') || {}; } catch { s = {}; }
  const keys = { ...DEFAULT_KEYS, ...(s.keys || {}) };
  return { text: s.text || 1, motion: s.motion || 'auto', touch: s.touch || 'auto', mute: !!s.mute, volume: s.volume ?? 0.5, contrast: !!s.contrast, gfx: s.gfx === 'simple' ? 'simple' : 'painted', keys };
}
function saveSettings() { store(save.SETTINGS_KEY, JSON.stringify(app.settings)); }
function saveGame() { if (!app.gm) return false; return store(save.SAVE_KEY, save.serialize(app.gm.S)); }
function readSave() {
  const t = load(save.SAVE_KEY);
  if (!t) return null;
  try { return save.parse(t); } catch (e) { return { error: String(e.message || e) }; }
}

// ---------- settings ----------
function reducedMotion() {
  const m = app.settings.motion;
  if (m === 'reduced') return true;
  if (m === 'full') return false;
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function touchWanted() {
  const t = app.settings.touch;
  if (t === 'on') return true;
  if (t === 'off') return false;
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
}
function applySettings() {
  const s = app.settings;
  document.documentElement.style.fontSize = 16 * s.text + 'px';
  document.documentElement.classList.toggle('text-l', s.text >= 1.25);
  document.body.classList.toggle('hc', !!s.contrast);
  scene.R.reduced = reducedMotion();
  setVolume(s.volume, s.mute);
  layoutVisibility();
}
function layoutVisibility() {
  const g = app.ui.scene === 'game';
  document.getElementById('hud').hidden = !g;
  document.getElementById('hotbar').hidden = !g;
  document.getElementById('touch').hidden = !(g && touchWanted());
  if (!g) document.getElementById('prompt').hidden = true;
}

// ---------- game lifecycle ----------
function startGame(gm, intro) {
  app.gm = gm;
  app.ui.scene = 'game';
  closeModal(true);
  ui.applyTheme(); ui.resetHud();
  scene.invalidateChunks(); scene.snapCamera(gm);
  layoutVisibility();
  gm.events.length = 0;
  if (intro) introCard();
  app.dirty = true;
}
function newGame(opts = {}) {
  const seed = opts.seed ?? app.seed ?? ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const gm = sim.newGame({ seed, day: opts.day, money: opts.money });
  const skip = opts.skipIntro ?? !!window.__TEST__;
  startGame(gm, !skip);
  if (opts.paused) app.paused = true;
  if (!opts.noSave) saveGame();
  return gm;
}
function continueGame() {
  const s = readSave();
  if (!s || s.error) { ui.toast(s && s.error ? 'That save could not be loaded: ' + s.error : 'No save found.', 'warn'); return false; }
  startGame(sim.attach(s), false);
  ui.toast(`Welcome back. ${sim.dateLabel(s)}.`);
  return true;
}
function toTitle() {
  if (app.gm && app.ui.scene === 'game') saveGame();
  app.ui.scene = 'title';
  closeModal(true);
  ui.applyTheme();
  { const nf = document.getElementById('nightfx'); nf.getContext('2d').clearRect(0, 0, nf.width, nf.height); scene.R.nightOn = false; }
  layoutVisibility();
  const s = readSave();
  const info = s && !s.error ? `Saved: ${sim.dateLabel(s)} · $${Math.round(s.money).toLocaleString('en-US')}` : s && s.error ? 'The saved game could not be read.' : (!app.storageOK ? 'Saving is unavailable in this browser.' : '');
  ui.titleScreen(!!(s && !s.error), info);
  app.ui.modal = 'title';
  app.lastRenderTitle = false;
}

// ---------- modals ----------
function openModal(name, data) {
  const gm = app.gm;
  app.ui.modal = name; app.ui.data = data ?? null;
  app.held.clear(); app.pad.x = app.pad.y = 0;
  document.getElementById('prompt').hidden = true;
  switch (name) {
    case 'inventory': ui.inventoryScreen(gm, 'items', app.ui.invPick); break;
    case 'journal': ui.journalScreen(gm, app.ui.jTab); break;
    case 'board': ui.boardScreen(gm); break;
    case 'supplies': ui.suppliesScreen(gm); break;
    case 'storage': ui.storageScreen(gm); break;
    case 'shop': ui.shopScreen(gm, data); break;
    case 'settings': ui.settingsScreen(app.ui.rebinding); break;
    case 'help': ui.helpScreen(); break;
    case 'about': ui.aboutScreen(); break;
    case 'pause': ui.pauseScreen(app.storageOK); break;
    case 'bed': ui.bedScreen(gm); break;
    case 'sign': ui.signScreen(data); if (D.SIGNS[data]) sim.readFacts(gm.S, D.SIGNS[data].facts); break;
    case 'dialog': ui.dialogScreen(data, gm); if (data.facts) sim.readFacts(gm.S, data.facts); break;
    case 'card': ui.cardScreen(data); if (data.facts && gm) sim.readFacts(gm.S, data.facts); break;
    case 'summary': ui.summaryScreen(gm, data); break;
    default: break;
  }
}
function refreshModal() { if (app.ui.modal && app.ui.modal !== 'title') openModal(app.ui.modal, app.ui.data); }
function closeModal(all) {
  if (all) app.modalQueue.length = 0;
  ui.hide();
  const was = app.ui.modal;
  app.ui.modal = null; app.ui.data = null; app.ui.invPick = null; app.ui.rebinding = null;
  if (!all && app.modalQueue.length) { const next = app.modalQueue.shift(); next(); return; }
  if (!all && app.ui.scene === 'title' && was !== 'title') toTitle();
  app.dirty = true;
}
function queueModal(fn) { if (app.ui.modal) app.modalQueue.push(fn); else fn(); }

function introCard() {
  const Y = D.YEARS[1];
  openModal('card', { kicker: 'Garvan Woodland Gardens · Hot Springs, Arkansas', title: 'Woodland Gardens Keeper', paras: [...Y.intro, 'Start at the maintenance barn: read the board, take your tools, and head out. George the peacock usually hangs around the Welcome Center.'], facts: Y.introFacts, note: 'The staff, the wages and the work orders are invented. The garden, its plants, its events and George are real; fact cards cite their sources.', button: 'Clock in' });
}
function yearCard(rev) {
  openModal('card', { kicker: `End of Year ${rev.year}`, title: 'Year-end review', paras: [`Average Garden Rating: ${rev.rating}. Work orders done: ${rev.orders}. You met ${rev.passed} of 4 goals.`, `New title: ${rev.title}. ${rev.tier >= 2 ? 'You get the leaf blower, the hose reel, the chainsaw, the zero-turn mower and the utility cart (faster on paths).' : ''}`], list: rev.goals, button: 'On to spring' });
}

// ---------- events from the sim ----------
function drainEvents() {
  const gm = app.gm;
  if (!gm || !gm.events.length) return;
  const evs = gm.events.splice(0);
  for (const e of evs) {
    switch (e.type) {
      case 'toast': ui.toast(e.text, e.kind); break;
      case 'sound': play(e.id); break;
      case 'pop': scene.addPop(e.x, e.y, e.item, e.n); break;
      case 'card': queueModal(() => openModal('card', { kicker: 'Garden notes', title: e.title, facts: e.facts })); break;
      case 'event': ui.toast(`${e.name} begins today.`, 'good'); if (e.fact && !gm.S.almanac.includes(e.fact)) app.modalQueue.push(() => openModal('card', { kicker: 'On the calendar', title: e.name, facts: [e.fact] })); break;
      case 'slept': {
        play('sleep');
        const sum = e.summary;
        saveGame();
        queueModal(() => openModal('summary', sum));
        if (sum.yearEnd) app.modalQueue.unshift(() => yearCard(sum.yearEnd));
        break;
      }
      case 'heart': { const n = gm.S.npcs[e.npc]; if (n) scene.addHearts(n.x, n.y); break; }
      default: break;
    }
  }
  app.dirty = true;
}

// ---------- actions ----------
function handleResult(r, t) {
  const gm = app.gm;
  if (!r) return;
  if (r.talk) return openTalk(r.talk);
  if (r.board) return openModal('board');
  if (r.supplies) return openModal('supplies');
  if (r.storage) return openModal('storage');
  if (r.shop) return openModal('shop', r.shop);
  if (r.sign) return openModal('sign', r.sign);
  if (r.card) return openModal('card', r.card);
  if (r.eat) { sim.eat(gm, r.eat); return; }
  if (r.fx && t) scene.addFx(r.fx, t.x, t.y);
}
function openTalk(id) { const d = sim.talk(app.gm, id); if (d) openModal('dialog', d); }
function doUse(at) {
  const gm = app.gm;
  if (at) { const p = gm.S.player; const dx = at.x + 0.5 - p.x, dy = at.y + 0.5 - (p.y - 0.3); p.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  const t = at || sim.target(gm);
  scene.R.useT = performance.now();
  handleResult(sim.use(gm, at ? { x: at.x, y: at.y } : undefined), t);
}
function doTalk() {
  const gm = app.gm;
  const t = sim.target(gm);
  const npc = sim.npcAt(gm, t.x, t.y);
  if (npc) return openTalk(npc);
  const r = sim.interactAt(gm, t.x, t.y);
  if (r) return handleResult(r, t);
  const bird = sim.peafowlAt(gm, t.x, t.y);
  if (bird) return handleResult(sim.use(gm, { x: t.x, y: t.y }), t);
  const sel = sim.selected(gm.S);
  if (sel && D.ITEMS[sel.id].energy) sim.eat(gm, sel.id);
}
function tickOnce() {
  const gm = app.gm;
  while (app.queue.length) {
    const a = app.queue.shift();
    if (app.ui.modal) continue;
    if (a.k === 'use') doUse(a.at);
    else if (a.k === 'talk') doTalk();
    drainEvents();
  }
  if (app.ui.modal) return;
  let mx = 0, my = 0;
  const k = app.settings.keys, held = (a) => k[a].some((c) => app.held.has(c));
  if (held('left')) mx -= 1; if (held('right')) mx += 1; if (held('up')) my -= 1; if (held('down')) my += 1;
  if (!mx && !my) { mx = app.pad.x; my = app.pad.y; }
  sim.tick(gm, { mx, my });
  drainEvents();
}

// ---------- input ----------
function keyAction(code) { for (const [a, codes] of Object.entries(app.settings.keys)) if (codes.includes(code)) return a; return null; }
function onKeyDown(e) {
  unlock();
  if (app.ui.rebinding) {
    e.preventDefault();
    const a = app.ui.rebinding;
    if (e.code !== 'Escape') {
      for (const [k, codes] of Object.entries(app.settings.keys)) app.settings.keys[k] = codes.filter((c) => c !== e.code);
      app.settings.keys[a] = [e.code, ...app.settings.keys[a].filter((c) => c !== e.code)].slice(0, 2);
      saveSettings();
    }
    app.ui.rebinding = null; ui.settingsScreen(null);
    return;
  }
  const act = keyAction(e.code);
  if (app.ui.modal) {
    if (e.code === 'Escape' || (act === 'pause' && e.code !== 'Space')) {
      e.preventDefault();
      if (['card', 'summary'].includes(app.ui.modal)) return cardNext();
      if (app.ui.modal === 'title') return;
      return closeModal();
    }
    if ((act === 'inv' && app.ui.modal === 'inventory') || (act === 'journal' && app.ui.modal === 'journal')) { e.preventDefault(); return closeModal(); }
    return;
  }
  if (app.ui.scene !== 'game') return;
  if (act) e.preventDefault();
  if (/^Digit[1-8]$/.test(e.code)) { app.gm.S.sel = +e.code.slice(5) - 1; play('click'); return; }
  if (e.repeat && act !== 'up' && act !== 'down' && act !== 'left' && act !== 'right') return;
  switch (act) {
    case 'up': case 'down': case 'left': case 'right': app.held.add(e.code); break;
    case 'use': app.queue.push({ k: 'use' }); break;
    case 'talk': app.queue.push({ k: 'talk' }); break;
    case 'eat': { const s = sim.selected(app.gm.S); if (s) { sim.eat(app.gm, s.id); drainEvents(); } break; }
    case 'prev': app.gm.S.sel = (app.gm.S.sel + sim.HOTBAR - 1) % sim.HOTBAR; break;
    case 'next': app.gm.S.sel = (app.gm.S.sel + 1) % sim.HOTBAR; break;
    case 'inv': openModal('inventory'); break;
    case 'journal': openModal('journal'); break;
    case 'pause': openModal('pause'); break;
  }
}
function onKeyUp(e) { app.held.delete(e.code); }

function canvasPointer(e) {
  unlock();
  if (app.ui.scene !== 'game' || app.ui.modal || !app.gm) return;
  const rect = e.target.getBoundingClientRect();
  const t = scene.screenToTile(e.clientX - rect.left, e.clientY - rect.top);
  const gm = app.gm, p = gm.S.player;
  const px = Math.floor(p.x), py = Math.floor(p.y - 0.1);
  const d = Math.max(Math.abs(t.x - px), Math.abs(t.y - py));
  if (d <= 1 && !(t.x === px && t.y === py)) { app.queue.push({ k: 'use', at: t }); return; }
  if (d === 0) return;
  let goal = t, face = null;
  if (sim.blocked(gm, t.x, t.y) || sim.npcAt(gm, t.x, t.y)) {
    const opts = [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']].map(([dx, dy, f]) => ({ x: t.x + dx, y: t.y + dy, f })).filter((o) => !sim.blocked(gm, o.x, o.y));
    if (!opts.length) return;
    opts.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
    goal = opts[0]; face = goal.f;
  }
  const path = pathTo(gm, px, py, goal.x, goal.y);
  if (path) { gm.S.autoPath = path; gm.S.autoFace = face; }
}
function pathTo(gm, sx, sy, gx, gy) {
  const prev = new Int32Array(W * H).fill(-1);
  const start = sy * W + sx, goal = gy * W + gx;
  prev[start] = start; const q = [start];
  for (let i = 0; i < q.length; i++) {
    const c = q[i]; if (c === goal) break;
    const cx = c % W, cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx; if (prev[n] !== -1 || sim.blocked(gm, nx, ny)) continue;
      prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] === -1) return null;
  const out = [];
  for (let c = goal; c !== start; c = prev[c]) out.push({ x: c % W, y: (c / W) | 0 });
  return out.reverse();
}
function setupTouch() {
  const pad = document.getElementById('pad'), knob = pad.querySelector('.knob');
  let id = null;
  const move = (e) => {
    const r = pad.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy), max = r.width / 2;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = `translate(${dx * 0.6}px, ${dy * 0.6}px)`;
    if (len < 12) { app.pad.x = app.pad.y = 0; return; }
    const a = Math.atan2(dy, dx), oct = Math.round(a / (Math.PI / 4));
    const dirs = { 0: [1, 0], 1: [1, 1], 2: [0, 1], 3: [-1, 1], 4: [-1, 0], '-4': [-1, 0], '-3': [-1, -1], '-2': [0, -1], '-1': [1, -1] };
    [app.pad.x, app.pad.y] = dirs[oct];
  };
  pad.addEventListener('pointerdown', (e) => { unlock(); id = e.pointerId; try { pad.setPointerCapture(id); } catch { /* */ } move(e); e.preventDefault(); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; app.pad.x = app.pad.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  document.getElementById('btn-a').addEventListener('pointerdown', (e) => { e.preventDefault(); unlock(); if (!app.ui.modal) app.queue.push({ k: 'use' }); });
  document.getElementById('btn-b').addEventListener('pointerdown', (e) => { e.preventDefault(); unlock(); if (!app.ui.modal) app.queue.push({ k: 'talk' }); });
}

// ---------- clicks on UI ----------
function cardNext() { closeModal(); }
function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  unlock(); play('click');
  const act = el.dataset.act, arg = el.dataset.arg;
  const gm = app.gm;
  switch (act) {
    case 'open': openModal(arg); break;
    case 'close': closeModal(); break;
    case 'cardnext': cardNext(); break;
    case 'continue': continueGame(); break;
    case 'newgame': newGame({}); break;
    case 'title': toTitle(); break;
    case 'save': ui.toast(saveGame() ? 'Game saved.' : 'Saving is unavailable here.', 'good'); break;
    case 'hot': gm.S.sel = +arg; break;
    case 'slot': {
      const i = +arg;
      if (app.ui.invPick != null && app.ui.invPick !== i) { sim.swapSlots(gm.S, app.ui.invPick, i); app.ui.invPick = null; }
      else { app.ui.invPick = app.ui.invPick === i ? null : i; if (i < sim.HOTBAR) gm.S.sel = i; }
      refreshModal(); break;
    }
    case 'eat': sim.eat(gm, arg); drainEvents(); refreshModal(); break;
    case 'buy': { const [shop, id, n] = arg.split('|'); sim.buy(gm, shop, id, +n); drainEvents(); refreshModal(); break; }
    case 'supply': { const [id, n] = arg.split('|'); sim.takeSupply(gm, id, +n); drainEvents(); refreshModal(); break; }
    case 'storage': if (arg === 'take') sim.storageTake(gm); else sim.storageReturn(gm); drainEvents(); refreshModal(); break;
    case 'jtab': app.ui.jTab = arg; refreshModal(); break;
    case 'give': { const sel = sim.selected(gm.S); const r = sim.give(gm, arg, sel && sel.id); drainEvents(); if (r && r.text) { const d = { ...app.ui.data, giftText: r.text, hearts: sim.hearts(gm.S.npcs[arg].pts) }; openModal('dialog', d); } break; }
    case 'sleep': closeModal(); sim.sleep(gm); drainEvents(); break;
    case 'text': app.settings.text = +arg; saveSettings(); applySettings(); refreshModal(); break;
    case 'motion': app.settings.motion = arg; saveSettings(); applySettings(); refreshModal(); break;
    case 'touch': app.settings.touch = arg; saveSettings(); applySettings(); refreshModal(); break;
    case 'mute': app.settings.mute = arg === 'on'; saveSettings(); applySettings(); refreshModal(); break;
    case 'vol': app.settings.volume = +arg; app.settings.mute = false; saveSettings(); applySettings(); play('coin'); refreshModal(); break;
    case 'contrast': app.settings.contrast = arg === 'on'; saveSettings(); applySettings(); refreshModal(); break;
    case 'gfx': if (app.settings.gfx !== arg) { app.settings.gfx = arg; saveSettings(); ui.toast(arg === 'simple' ? 'Simple graphics from the next start (reload the page).' : 'Painted graphics from the next start (reload the page).', 'good'); } refreshModal(); break;
    case 'rebind': app.ui.rebinding = arg; ui.settingsScreen(arg); break;
    case 'resetkeys': app.settings.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); saveSettings(); refreshModal(); break;
  }
  app.dirty = true;
}

// ---------- loop ----------
let acc = 0, lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const t0 = performance.now();
  frameBody(now);
  const ms = performance.now() - t0;
  app.frameMs = app.frameMs == null ? ms : app.frameMs * 0.95 + ms * 0.05;
  app.frameMax = Math.max(app.frameMax || 0, ms);
}
function frameBody(now) {
  const dt = Math.min(0.25, lastT ? (now - lastT) / 1000 : 0); lastT = now;
  if (app.ui.scene === 'title') { if (!app.lastRenderTitle || app.titleArt !== ART.loaded) renderTitle(); return; }
  if (!app.gm) return;
  if (!app.paused && !app.ui.modal) {
    acc += dt;
    let n = 0;
    while (acc >= 1 / 60 && n < 10) { tickOnce(); acc -= 1 / 60; n++; }
    if (n >= 10) acc = 0;
  } else { acc = 0; if (app.queue.length && !app.ui.modal) tickOnce(); }
  if (app.ui.modal && app.portraitArt !== ART.loaded && PA.peopleReady()) { app.portraitArt = ART.loaded; ui.repaintPortraits(); }
  if (!app.ui.modal || app.dirty || ART.dirty) render();
}
const TALKISH = /^(Talk|Open|Read|Admire|Shoo|Bird|Fairy|Wedding|Dooley|Waterfall)/;
function render() {
  const gm = app.gm;
  if (!app.wantedAll) wantAll();
  scene.draw(gm, { showTarget: !app.ui.modal && app.ui.scene === 'game' });
  ui.hud(gm);
  const pr = document.getElementById('prompt');
  const txt = app.ui.modal ? '' : ui.describeTarget(gm);
  if (txt) { const talk = TALKISH.test(txt); const key = touchWanted() ? (talk ? 'B' : 'A') : ui.keyName(app.settings.keys[talk ? 'talk' : 'use'][0]); const s = `${key}: ${txt}`; if (pr.textContent !== s) pr.textContent = s; pr.hidden = false; }
  else pr.hidden = true;
  app.dirty = false;
}
function renderTitle() {
  const c = scene.R.canvas, ctx = scene.R.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  want(['vista-garvan']);
  scene.vista(ctx, c.width, c.height);
  app.lastRenderTitle = true; app.titleArt = ART.loaded;
}

// ---------- test hooks ----------
function compact() {
  const gm = app.gm;
  const base = { scene: app.ui.scene, modal: app.ui.modal, paused: app.paused, reduced: scene.R.reduced, loadMs: app.loadMs, settings: { ...app.settings, keys: app.settings.keys }, storageOK: app.storageOK, toasts: app.toastLog.slice(-8), ts: scene.R.ts, touch: touchWanted(), audioPlayed: audioState.played, artCache: artCacheSize() };
  if (!gm) return base;
  const S = gm.S;
  const t = sim.target(gm);
  const d = sim.doy(S);
  return {
    ...base, year: sim.yearNo(S), day: S.day, doy: d, season: sim.season(S), dayOfSeason: sim.dayOfSeason(S), date: sim.dateLabel(S), realDate: sim.realDate(d),
    time: S.time, clock: sim.clock(S), weather: S.weather, freezeTonight: S.freezeTonight, money: S.money, energy: S.energy, maxEnergy: S.maxEnergy, seed: S.seed, tier: S.tier, rating: S.rating, hours: sim.hours(S),
    player: { x: +S.player.x.toFixed(3), y: +S.player.y.toFixed(3), tx: Math.floor(S.player.x), ty: Math.floor(S.player.y - 0.1), face: S.player.face, moving: S.player.moving },
    zone: sim.zoneAt(gm, Math.floor(S.player.x), Math.floor(S.player.y - 0.1)).id,
    target: { x: t.x, y: t.y }, sel: S.sel, selItem: sim.selected(S)?.id || null, can: S.can,
    inv: S.inv.filter(Boolean).map((i) => ({ id: i.id, n: i.n })), invSlots: S.inv.map((i) => (i ? i.id : null)),
    orders: S.orders.map((o) => ({ id: o.id, type: o.type, zone: o.zone, n: o.n, prog: o.prog, done: o.done, title: o.title })),
    counts: { litter: Object.keys(S.litter).length, leaves: Object.keys(S.leaves).length, weeds: Object.keys(S.weeds).length, grass: Object.keys(S.grass).length, beds: Object.keys(S.beds).length, limbs: Object.values(S.objs).filter((o) => o.t === 'limb').length, disp: Object.keys(S.disp).length },
    visitors: S.visitors.length, peafowl: S.peafowl.map((b) => ({ id: b.id, x: +b.x.toFixed(2), y: +b.y.toFixed(2), mode: b.mode })), wedding: S.wedding,
    npcs: Object.entries(S.npcs).map(([id, n]) => ({ id, x: +n.x.toFixed(2), y: +n.y.toFixed(2), tx: Math.floor(n.x), ty: Math.floor(n.y - 0.1), place: n.place, hidden: n.hidden, pts: n.pts, hearts: sim.hearts(n.pts) })),
    almanac: S.almanac.length, almanacIds: S.almanac, summary: S.summary, ys: S.ys,
    places: gm.world.places, buildings: gm.world.buildings.map((b) => ({ id: b.id, type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, front: b.front, label: b.label })),
    chunkBakes: scene.R.chunkBakes, bakeMs: +(scene.R.bakeMs || 0).toFixed(1), bakeLog: (scene.R.bakeLog || []).slice(), artLoaded: ART.loaded, artPending: ART.pending, artFailed: ART.failed.slice(), artTotal: allNames().length, vectorFallback: [...scene.R.fallback],
    painted: { terrain: terrainReady(), people: PA.peopleReady() }, frames: scene.R.frames, particles: scene.R.particles.length, frameMs: +(app.frameMs || 0).toFixed(2), srText: document.getElementById('sr').textContent, cam: { ...scene.R.cam }, autoPath: S.autoPath ? S.autoPath.length : 0,
  };
}
function deepMerge(t, p) {
  for (const [k, v] of Object.entries(p)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) deepMerge(t[k], v);
    else t[k] = v;
  }
}
const hooks = {
  seed(n) { app.seed = n >>> 0; if (app.gm) app.gm.S.rs = hash(n, 'run') | 0; return n; },
  getState: compact,
  setState(p = {}) {
    const gm = app.gm; if (!gm) return compact();
    const S = gm.S;
    const q = { ...p };
    if (q.inv) { S.inv = new Array(24).fill(null); q.inv.forEach((it, i) => { if (it) S.inv[i] = { id: it.id, n: it.n ?? 1 }; }); delete q.inv; }
    if (q.player) { const pl = q.player; if (pl.tx != null) { S.player.x = pl.tx + 0.5; S.player.y = pl.ty + 0.9; } if (pl.face) S.player.face = pl.face; delete q.player; }
    if (q.npcs) { for (const [id, v] of Object.entries(q.npcs)) Object.assign(S.npcs[id] || {}, v); delete q.npcs; }
    for (const k of ['weeds', 'leaves', 'litter', 'grass', 'beds', 'disp', 'covered', 'watered']) if (q[k]) { S[k] = q[k]; delete q[k]; }
    if (q.objs) { Object.assign(S.objs, q.objs); for (const [k, v] of Object.entries(q.objs)) if (v == null) delete S.objs[k]; delete q.objs; }
    deepMerge(S, q);
    gm.navVersion++; gm.zcache = null;
    scene.snapCamera(gm); ui.resetHud(); app.dirty = true; render();
    return compact();
  },
  isIdle() { return ART.pending === 0 && app.fontsReady !== false; },
  step(n = 1) { app.paused = true; for (let i = 0; i < n; i++) tickOnce(); if (app.ui.scene === 'game' && app.gm) render(); return compact(); },
  pause() { app.paused = true; return true; },
  resume() { app.paused = false; return true; },
  scene(name) {
    if (name && typeof name === 'object') {
      const gm = sim.newGame({ seed: app.seed ?? 1, day: name.day, money: name.money });
      startGame(gm, false);
      if (name.time != null) gm.S.time = name.time;
      if (name.weather) gm.S.weather = name.weather;
      if (name.at) { const p = gm.world.places[name.at]; if (p) { gm.S.player.x = p.x + 0.5; gm.S.player.y = p.y + 0.9; } }
      if (name.tx != null) { gm.S.player.x = name.tx + 0.5; gm.S.player.y = name.ty + 0.9; }
      if (name.paused !== false) app.paused = true;
      scene.snapCamera(gm); render();
      return compact();
    }
    if (name === 'title') { toTitle(); return compact(); }
    if (name === 'game') { if (!app.gm) newGame({ seed: app.seed ?? 1, noSave: true }); app.ui.scene = 'game'; closeModal(true); layoutVisibility(); render(); return compact(); }
    if (!app.gm && !['settings', 'help', 'about'].includes(name)) newGame({ seed: app.seed ?? 1, noSave: true });
    if (name === 'card') { introCard(); return compact(); }
    if (name === 'summary') { openModal('summary', app.gm.S.summary || { date: sim.dateLabel(app.gm.S), real: '', orders: [], rating: null, visitors: 0, wage: 0 }); return compact(); }
    if (['settings', 'help', 'about'].includes(name) && app.ui.scene === 'title') { openModal(name); return compact(); }
    if (app.ui.scene !== 'game') { app.ui.scene = 'game'; closeModal(true); layoutVisibility(); }
    if (name === 'shop') openModal('shop', 'cafe'); else if (name === 'sign') openModal('sign', 'chapel'); else openModal(name);
    render();
    return compact();
  },
  newGame(opts = {}) { newGame({ ...opts }); if (opts.paused) app.paused = true; render(); return compact(); },
  act(name, ...args) {
    const gm = app.gm;
    const r = (() => {
      switch (name) {
        case 'use': doUse(); return true;
        case 'interact': case 'talkKey': doTalk(); return true;
        case 'useAt': doUse({ x: args[0], y: args[1] }); return true;
        case 'face': gm.S.player.face = args[0]; return true;
        case 'select': gm.S.sel = args[0]; return true;
        case 'selectItem': { const i = gm.S.inv.findIndex((it) => it && it.id === args[0]); if (i >= 0) { if (i >= sim.HOTBAR) { sim.swapSlots(gm.S, i, sim.HOTBAR - 1); gm.S.sel = sim.HOTBAR - 1; } else gm.S.sel = i; } return i >= 0; }
        case 'teleport': gm.S.player.x = args[0] + 0.5; gm.S.player.y = args[1] + 0.9; if (args[2]) gm.S.player.face = args[2]; scene.snapCamera(gm); return true;
        case 'goto': { const p = gm.world.places[args[0]]; if (!p) return false; gm.S.player.x = p.x + 0.5; gm.S.player.y = p.y + 0.9; gm.S.player.face = args[1] || 'up'; scene.snapCamera(gm); return true; }
        case 'buy': return sim.buy(gm, args[0], args[1], args[2] ?? 1);
        case 'supply': return sim.takeSupply(gm, args[0], args[1] ?? 1);
        case 'storageTake': return sim.storageTake(gm);
        case 'storageReturn': return sim.storageReturn(gm);
        case 'eat': return sim.eat(gm, args[0]);
        case 'sleep': closeModal(true); sim.sleep(gm); return true;
        case 'sleepSkip': { closeModal(true); sim.sleep(gm); const evs = gm.events.splice(0); evs.filter((e) => e.type === 'toast').forEach((e) => app.toastLog.push(e.text)); saveGame(); return true; }
        case 'skipDays': { closeModal(true); for (let i = 0; i < args[0]; i++) { sim.sleep(gm); gm.events.length = 0; } scene.invalidateChunks(); return true; }
        case 'talk': { const d = sim.talk(gm, args[0]); if (d) openModal('dialog', d); return d; }
        case 'give': return sim.give(gm, args[0], args[1]);
        case 'card': openModal('card', { kicker: 'Garden notes', title: args[1] || 'Garden notes', facts: args[0] || [] }); return true;
        case 'toast': ui.toast(args[0]); return true;
        case 'close': closeModal(); return true;
        case 'closeAll': closeModal(true); return true;
        case 'cardNext': cardNext(); return true;
        case 'save': return saveGame();
        case 'reloadSave': return continueGame();
        case 'loadRaw': { try { const s = save.parse(args[0]); startGame(sim.attach(s), false); return true; } catch (e) { return String(e.message); } }
        case 'rawSave': return load(save.SAVE_KEY);
        case 'fill': { for (const [id, n] of args[0]) sim.addItem(gm.S, id, n); return true; }
        case 'objAt': { const o = sim.objAt(gm, args[0], args[1]); return o ? { ...o } : null; }
        case 'blocked': return sim.blocked(gm, args[0], args[1]);
        case 'ground': return sim.ground(gm, args[0], args[1]);
        case 'describe': return ui.describeTarget(gm);
        case 'zones': return sim.zoneStats(gm).map((z, i) => ({ i, tidy: z.tidy, score: z.score }));
        case 'goals': return sim.goals(gm);
        case 'markers': return gm.world.markers.map((m) => ({ ...m, st: gm.S.disp[m.id] ? gm.S.disp[m.id].st : null }));
        case 'design': { const b = gm.bedMap[args[0] + ',' + args[1]]; return b ? sim.tulipDesign(b, args[0], args[1], sim.yearNo(gm.S)) : null; }
        case 'render': render(); return true;
      }
      return null;
    })();
    drainEvents(); if (app.ui.scene === 'game' && app.gm) render();
    return r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r;
  },
};
window.__game = hooks;

// ---------- painted art ----------
function wantAll() { if (!app.wantedAll) { app.wantedAll = true; want(allNames().filter((n) => n.startsWith('tex-') || n.startsWith('chars-'))); setTimeout(() => want(allNames()), 1200); } }

// ---------- boot ----------
function boot() {
  if (document.fonts && document.fonts.load) {
    app.fontsReady = false;
    Promise.all(FONT_FAMILIES.map((f) => document.fonts.load(`700 20px "${f}"`).catch(() => null))).then(() => { app.fontsReady = true; clearArt(); app.lastRenderTitle = false; app.dirty = true; });
  }
  app.storageOK = probeStorage();
  app.settings = loadSettings();
  scene.setup(document.getElementById('view'));
  ui.init(app, typeof FACTS !== 'undefined' ? FACTS.facts : []);
  applySettings();
  setupTouch();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { app.held.clear(); app.pad.x = app.pad.y = 0; });
  document.getElementById('view').addEventListener('pointerdown', canvasPointer);
  document.getElementById('view').addEventListener('wheel', (e) => { if (app.gm && !app.ui.modal && app.ui.scene === 'game') { app.gm.S.sel = (app.gm.S.sel + (e.deltaY > 0 ? 1 : sim.HOTBAR - 1)) % sim.HOTBAR; e.preventDefault(); } }, { passive: false });
  document.getElementById('app').addEventListener('click', onClick);
  window.addEventListener('resize', () => { scene.resize(); app.lastRenderTitle = false; app.dirty = true; layoutVisibility(); });
  if (window.matchMedia) window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', applySettings);
  toTitle();
  if (!app.storageOK) ui.toast('Saving is unavailable in this browser. You can still play.', 'warn');
  app.loadMs = Math.round(performance.now() - T0);
  requestAnimationFrame(frame);
}
boot();
