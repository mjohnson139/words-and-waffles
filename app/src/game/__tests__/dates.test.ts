import { addDays, dnum, dstr, hms, isoWeek, monthOf, msToMidnight } from '../dates';

describe('dates', () => {
  it('formats local dates', () => {
    expect(dstr(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('counts whole days across DST changes', () => {
    expect(dnum('2026-03-09') - dnum('2026-03-08')).toBe(1);
    expect(dnum('2026-11-02') - dnum('2026-11-01')).toBe(1);
    expect(dnum('1970-01-01')).toBe(0);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('computes ISO weeks, including year boundaries', () => {
    expect(isoWeek('2026-11-12')).toBe('2026-W46');
    expect(isoWeek('2026-12-31')).toBe('2026-W53');
    expect(isoWeek('2027-01-03')).toBe('2026-W53');
    expect(isoWeek('2027-01-04')).toBe('2027-W01');
    expect(isoWeek('2020-12-31')).toBe('2020-W53');
    expect(isoWeek('2024-12-30')).toBe('2025-W01');
  });

  it('extracts months and formats countdowns', () => {
    expect(monthOf('2026-11-12')).toBe('2026-11');
    expect(hms(3_723_000)).toBe('01:02:03');
    expect(hms(-5)).toBe('00:00:00');
    expect(msToMidnight(new Date(2026, 10, 12, 23, 59, 0))).toBe(60_000);
  });
});
