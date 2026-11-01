// Painted art loader. Images listed in assets/manifest.json (inlined at build time as ART_MANIFEST) are
// loaded with new Image() + decode(), which works from file:// as well as http, and only ever drawn (never
// read back). Loading is progressive: the current chapter's set first, everything else after first paint.
// Until an image is decoded the vector art in art.js is drawn instead; `?art=0` keeps the vector art.
/* global ART_MANIFEST */
const MAN = typeof ART_MANIFEST !== 'undefined' ? ART_MANIFEST : {};
const simple = (() => { try { return JSON.parse(localStorage.getItem('garvan-settings') || '{}').gfx === 'simple'; } catch { return false; } })();
const off = (typeof location !== 'undefined' && /[?&]art=0\b/.test(location.search)) || simple;

export const ART = { on: !off && Object.keys(MAN).length > 0, imgs: new Map(), loading: new Map(), pending: 0, failed: [], dirty: false, loaded: 0, fresh: [] };

export const hasArt = (name) => ART.on && !!MAN[name];
export const img = (name) => (ART.on ? ART.imgs.get(name) || null : null);
export const manifest = () => MAN;

export function want(names) {
  if (!ART.on) return Promise.resolve();
  const jobs = [];
  for (const n of names) {
    if (!MAN[n] || ART.imgs.has(n)) continue;
    if (ART.loading.has(n)) { jobs.push(ART.loading.get(n)); continue; }
    const im = new Image();
    ART.pending++;
    const p = new Promise((res) => {
      im.onload = () => {
        const done = () => { ART.imgs.set(n, im); ART.pending--; ART.loaded++; ART.fresh.push(n); ART.dirty = true; ART.loading.delete(n); res(); };
        if (im.decode) im.decode().then(done, done); else done();
      };
      im.onerror = () => { ART.pending--; ART.failed.push(n); ART.loading.delete(n); res(); };
    });
    im.src = 'assets/' + MAN[n].file;
    ART.loading.set(n, p);
    jobs.push(p);
  }
  return Promise.all(jobs);
}

export const allNames = () => Object.keys(MAN);
