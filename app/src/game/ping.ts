/**
 * Anonymous usage ping flags. The app stores only the last day, week and
 * month it pinged; the flags say "first open today / this week / this month /
 * ever" so the server can count people without any identifier.
 */
import { isDateString, isoWeek, monthOf } from './dates';

export type Platform = 'ios' | 'android' | 'web';
export interface PingState {
  lastDay?: string;
  lastWeek?: string;
  lastMonth?: string;
}
export interface PingBody {
  d: boolean;
  w: boolean;
  m: boolean;
  n: boolean;
  p: Platform;
}

/** The body to send, or null when we already pinged today. */
export function pingBody(state: PingState, today: string, p: Platform): PingBody | null {
  if (state.lastDay === today) return null;
  return {
    d: true,
    w: state.lastWeek !== isoWeek(today),
    m: state.lastMonth !== monthOf(today),
    n: !state.lastDay,
    p,
  };
}

/** The state to store after a 2xx. */
export function afterPing(today: string): PingState {
  return { lastDay: today, lastWeek: isoWeek(today), lastMonth: monthOf(today) };
}

export function cleanPingState(x: unknown): PingState {
  const o = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
  const out: PingState = {};
  if (isDateString(o.lastDay)) out.lastDay = o.lastDay;
  if (typeof o.lastWeek === 'string' && /^\d{4}-W\d\d$/.test(o.lastWeek)) out.lastWeek = o.lastWeek;
  if (typeof o.lastMonth === 'string' && /^\d{4}-\d\d$/.test(o.lastMonth)) out.lastMonth = o.lastMonth;
  return out;
}
