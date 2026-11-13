/**
 * Calendar dates as local `YYYY-MM-DD` strings, the way the prototype keeps
 * them. Day arithmetic goes through dnum(), which counts UTC midnights, so a
 * DST change never makes a day 23 or 25 hours long.
 */

export const pad = (n: number): string => String(n).padStart(2, '0');

/** Local calendar date of `d` (prototype `dstr`). */
export const dstr = (d: Date): string =>
  d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

/** Today's local date. */
export const today = (now: Date = new Date()): string => dstr(now);

export const isDateString = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s);

/** Days since 1970-01-01 for a calendar date (prototype `dnum`). */
export const dnum = (s: string): number => {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};

/** The calendar date `n` days after `s` (negative goes back). */
export const addDays = (s: string, n: number): string => {
  const t = new Date((dnum(s) + n) * 864e5);
  return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
};

/** ISO 8601 week of a calendar date, e.g. `2026-W46`. */
export const isoWeek = (s: string): string => {
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7; // Monday 1 .. Sunday 7
  t.setUTCDate(t.getUTCDate() + 4 - day); // Thursday of this week decides the year
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return year + '-W' + pad(week);
};

/** `YYYY-MM` of a calendar date. */
export const monthOf = (s: string): string => s.slice(0, 7);

/** Milliseconds from `now` to the next local midnight (the "Fresh word in" countdown). */
export const msToMidnight = (now: Date): number =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

/** `hh:mm:ss` for a countdown (prototype `tick`). */
export const hms = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
};
