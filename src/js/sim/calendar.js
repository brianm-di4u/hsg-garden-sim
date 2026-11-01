// The calendar: day of year, seasons, the real date each game day stands for, opening hours.
import * as D from './data.js';

export const doy = (S) => S.day % D.YEAR_DAYS;
export const yearNo = (S) => Math.floor(S.day / D.YEAR_DAYS) + 1;
export const season = (S) => D.SEASONS[Math.floor(doy(S) / D.DAYS_PER_SEASON)];
export const dayOfSeason = (S) => (doy(S) % D.DAYS_PER_SEASON) + 1;
export const clock = (S) => { const m = S.time % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
export const clockOf = (m) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
export const dateLabel = (S) => `${D.SEASON_NAME[season(S)]} ${dayOfSeason(S)}, Year ${yearNo(S)}`;

// The real date a game day stands for (each season spans three real months: game choice).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function realDate(d) {
  const sea = D.SEASONS[Math.floor(d / D.DAYS_PER_SEASON)], ds = d % D.DAYS_PER_SEASON;
  let m = D.SEASON_MONTH[sea];
  const span = [0, 1, 2].reduce((a, i) => a + MDAYS[(m + i) % 12], 0);
  let off = Math.floor(ds * span / D.DAYS_PER_SEASON);
  while (off >= MDAYS[m % 12]) { off -= MDAYS[m % 12]; m++; }
  return `${MONTHS[m % 12]} ${off + 1}`;
}
export const weekday = (S) => S.day % 7; // 0 = Monday (game week)
export const weekend = (S) => weekday(S) >= 5;

// What kind of day it is for visitors. mode: 'day' | 'lights' | 'closed'.
export function hours(S) {
  const d = doy(S);
  if (D.inEvent('closed', d) || D.inEvent('thanksgiving', d) || D.inEvent('christmas', d)) return { mode: 'closed', open: 0, close: 0 };
  if (D.inEvent('lights', d)) return { mode: 'lights', open: 1020, close: 1290 };
  return { mode: 'day', open: 540, close: 1080 };
}
export function isOpen(S) { const h = hours(S); return h.mode !== 'closed' && S.time >= h.open && S.time < h.close; }
export function shopOpen(S, id) {
  const h = hours(S);
  if (id === 'cafe') return h.mode === 'lights' ? S.time >= 1000 && S.time < 1290 : h.mode === 'day' && S.time >= D.SHOPS.cafe.open[0] && S.time < D.SHOPS.cafe.open[1];
  return h.mode !== 'closed' && S.time >= (h.mode === 'lights' ? 1000 : D.SHOPS.gift.open[0]) && S.time < (h.mode === 'lights' ? 1290 : D.SHOPS.gift.open[1]);
}
// 0 = full daylight … 1 = full night (game curve; shorter days in winter).
export function darkness(S) {
  const sea = season(S), t = S.time;
  const dusk = { sp: 1170, su: 1230, fa: 1110, wi: 1050 }[sea], dawn = { sp: 410, su: 380, fa: 420, wi: 450 }[sea];
  if (t < dawn) return 0.85 - (t - 360) / Math.max(1, dawn - 360) * 0.85;
  if (t < dusk) return 0;
  if (t < dusk + 90) return (t - dusk) / 90 * 0.88;
  return 0.88;
}
// Upcoming and current events for the journal calendar.
export function eventsAround(S, ahead = 30) {
  const d = doy(S), out = [];
  for (const [id, e] of Object.entries(D.EVENTS)) {
    const now = D.inEvent(id, d);
    let until = (e.from - d + D.YEAR_DAYS) % D.YEAR_DAYS;
    if (now || until <= ahead) out.push({ id, name: e.name, now, in: now ? 0 : until, from: realDate(e.from), to: realDate(e.to), fact: e.fact });
  }
  return out.sort((a, b) => a.in - b.in);
}
