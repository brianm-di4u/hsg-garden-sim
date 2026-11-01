// The calendar: 4 × 28-day seasons, real dates, opening hours and the event calendar.
import { garden, yd } from './helpers.mjs';

export const tests = [
  {
    name: 'calendar and real dates',
    viewports: ['desktop'],
    async run(t) {
      let s = await garden(t, { day: 0 });
      t.equal(s.date, 'Spring 1, Year 1', 'starts Spring 1, Year 1');
      t.equal(s.realDate, 'Mar 1', 'Spring 1 stands for March 1');
      const check = async (d, want, label) => { s = await t.game('scene', { day: d }); t.equal(s.realDate, want, label); return s; };
      await check(yd('fa', 5), 'Sep 14', 'Holiday Lights install starts mid-September');
      s = await check(yd('fa', 26), 'Nov 21', 'Holiday Lights opens November 21');
      t.equal(s.hours.mode, 'lights', 'night-only hours during Holiday Lights');
      t.equal([s.hours.open, s.hours.close], [1020, 1290], 'lights hours 5:00 to 9:30 PM');
      s = await t.game('scene', { day: yd('wi', 14) });
      t.equal(s.hours.mode, 'closed', 'closed in January');
      s = await t.game('scene', { day: yd('wi', 20) });
      t.equal(s.hours.mode, 'day', 'reopens February 1');
      s = await t.game('scene', { day: yd('fa', 27) });
      t.equal(s.hours.mode, 'closed', 'closed Thanksgiving');
      s = await t.game('scene', { day: 111 });
      t.equal(s.season, 'wi', 'day 111 is winter');
    },
  },
  {
    name: 'the clock runs, the gates open, a day ends',
    async run(t) {
      await garden(t, { day: 2, time: 535 });
      let s = await t.game('step', 12 * 6);
      t.equal(s.time, 541, 'six game minutes pass');
      t.expect(s.toasts.some((x) => /gates are open/.test(x)), 'gates open at 9:00');
      await t.game('act', 'sleep');
      s = await t.state();
      t.equal(s.day, 3, 'next day');
      t.equal(s.time, 360, 'morning at 6:00');
      t.equal(s.modal, 'summary', 'day report shown');
      await t.shot('10-day-report');
      await t.checkLayout();
    },
  },
];
