/**
 * The anonymous end-of-game result: the date and how many tries it took, or
 * 'x' for a loss. Sent once per daily game; nothing here identifies a player.
 */
import { isDateString } from './dates';
import type { GameRecord } from './record';

export type Tries = 1 | 2 | 3 | 4 | 5 | 6 | 'x';
export interface ResultBody {
  d: string;
  g: Tries;
}
export interface ResultState {
  lastDate?: string;
}

/** The body to send, or null unless today's daily game just finished and was not sent yet. */
export function resultBody(
  game: GameRecord | undefined,
  today: string,
  state: ResultState,
): ResultBody | null {
  if (!game || game.mode !== 'daily' || game.date !== today) return null;
  if (game.status === 'playing' || state.lastDate === today) return null;
  return { d: game.date, g: game.status === 'won' ? (game.guesses.length as Tries) : 'x' };
}

export function cleanResultState(x: unknown): ResultState {
  const d = x && typeof x === 'object' ? (x as Record<string, unknown>).lastDate : undefined;
  return isDateString(d) ? { lastDate: d } : {};
}

const PING_SUFFIX = '/v1/ping';

/** The result URL next to the ping URL, or '' when the ping endpoint is not set up. */
export function resultEndpoint(pingEndpoint: string): string {
  try {
    const url = new URL(pingEndpoint);
    if (!url.pathname.endsWith(PING_SUFFIX)) return '';
    url.pathname = url.pathname.slice(0, -PING_SUFFIX.length) + '/v1/result';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}
