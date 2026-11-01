// Colors. One modern garden palette with season shifts; ground and foliage tones are game choices tuned for
// readability. The menu theme borrows the garden's greens and the chapel's yellow pine.

const BASE = {
  grass: '#5c9a46', lawn: '#62a84a', forest: '#2f5a38', path: '#c8b48e', gravel: '#b8ac98', stone: '#c4bcac', street: '#5a5a60', water: '#2f6a8a', deep: '#1f4e6e',
  pond: '#3a7a7a', sand: '#c8b490', dirt: '#8a6a48', bed: '#8a5a32', wood: '#9c7a55', woodDark: '#5e4b3c', wall: '#b8a080', roof: '#4a3a34', trim: '#f6f3ec',
  glass: '#2a4a5a', sign: '#2f4a34', ink: '#f6efd8',
};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
export const shade = (a, t) => (t < 0 ? mix(a, '#000000', -t) : mix(a, '#ffffff', t));
export const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

// Season shifts for living things.
const SEASON = {
  sp: { grass: ['#8fc85a', 0.2], leaf: '#7cbf4a', accent: '#e86aa0' },
  su: { grass: ['#3f8a2f', 0.1], leaf: '#3f8a34', accent: '#e8d860' },
  fa: { grass: ['#a8902a', 0.28], leaf: '#d0702a', accent: '#c8501f' },
  wi: { grass: ['#8a8070', 0.42], leaf: '#7a6a58', accent: '#e8e8f0' },
};

export function palette(sea) {
  const b = BASE, s = SEASON[sea] || SEASON.sp;
  return {
    ...b, ch: 6, sea,
    grass: mix(b.grass, s.grass[0], s.grass[1]),
    lawn: mix(b.lawn, s.grass[0], s.grass[1] * (sea === 'wi' ? 0.8 : 0.6)),
    forest: mix(b.forest, s.grass[0], s.grass[1] * 0.6),
    leaf: s.leaf, flower: s.accent, oak: s.leaf,
    pine: sea === 'wi' ? '#2f4a34' : '#2f5a32', pineDark: '#1f3a24',
    soil: '#6a4a30', soilWet: '#4a3424',
  };
}

// Menu theme.
export const UI_THEME = { bg: '#1f3326', fg: '#f2efe4', accent: '#e0b048', accentFg: '#1f3326', muted: '#c2ccb8', border: '#6a8a5a', font: 'var(--font-body-sans)', display: 'var(--disp-modern)' };

// Canvas sign face (loaded from assets/fonts.css).
export const SIGN_FONT = 'Outfit, system-ui, sans-serif';
export const FONT_FAMILIES = ['Outfit', 'Nunito Sans', 'Alegreya'];

export const LIGHT = { led: { col: '#ffe6b8', r: 2.8 }, warm: { col: '#ffd8a0', r: 3.0 } };
export const NIGHT = '#0a1a30';
