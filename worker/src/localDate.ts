import { addDays, isDateString } from '../../app/src/game/dates';

/**
 * A player's local calendar date as the app sends it: a real `YYYY-MM-DD`
 * within one day of the UTC date, which covers every time zone (UTC-12 to
 * UTC+14). The ping and the result both use this rule.
 */
export function isLocalDate(d: unknown, utcToday: string): d is string {
  // isDateString checks the shape only; the round trip rejects 2026-02-30.
  if (!isDateString(d) || addDays(d, 0) !== d) return false;
  return d >= addDays(utcToday, -1) && d <= addDays(utcToday, 1);
}
