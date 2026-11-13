import { isDateString } from './dates';
import { okWord } from './words';

export type Mode = 'daily' | 'extra' | 'custom';
export type Status = 'playing' | 'won' | 'lost';
export type Source = 'endpoint' | 'bundled' | 'local';

export interface GameRecord {
  id: string;
  mode: Mode;
  date: string;
  answer: string;
  guesses: string[];
  status: Status;
  startedAt: number;
  finishedAt: number;
  source: Source;
}

export const MODE_LABEL: Record<Mode, string> = {
  daily: "Today's word",
  extra: 'Seconds',
  custom: 'Picked word',
};

const MODES: readonly string[] = ['daily', 'extra', 'custom'];
const STATUSES: readonly string[] = ['won', 'lost', 'playing'];
const SOURCES: readonly string[] = ['endpoint', 'bundled', 'local'];

/** Validate untrusted data into a GameRecord, or null (prototype clean, lines 266-272). */
export function clean(x: unknown): GameRecord | null {
  if (!x || typeof x !== 'object') return null;
  const g = x as Record<string, unknown>;
  if (!okWord(g.answer) || !Array.isArray(g.guesses) || !isDateString(g.date)) return null;
  if (typeof g.id !== 'string' || !/^[a-z0-9-]{3,40}$/.test(g.id)) return null;
  if (typeof g.mode !== 'string' || !MODES.includes(g.mode)) return null;
  const mode = g.mode as Mode;
  const source =
    typeof g.source === 'string' && SOURCES.includes(g.source)
      ? (g.source as Source)
      : mode === 'daily'
        ? 'bundled'
        : 'local';
  return {
    id: g.id,
    mode,
    date: g.date,
    answer: g.answer,
    guesses: (g.guesses as unknown[]).filter(okWord).slice(0, 6),
    status:
      typeof g.status === 'string' && STATUSES.includes(g.status) ? (g.status as Status) : 'playing',
    startedAt: +(g.startedAt as number) || 0,
    finishedAt: +(g.finishedAt as number) || 0,
    source,
  };
}

/** Clean a stored map of games, dropping invalid entries; keys become record ids. */
export function cleanAll(x: unknown): Record<string, GameRecord> {
  const out: Record<string, GameRecord> = {};
  if (!x || typeof x !== 'object') return out;
  for (const k of Object.keys(x)) {
    const g = clean((x as Record<string, unknown>)[k]);
    if (g) out[g.id] = g;
  }
  return out;
}

/** Progress rank: finished beats playing, then more guesses (prototype line 275). */
export const rank = (g: GameRecord): number => (g.status === 'playing' ? 0 : 100) + g.guesses.length;

/** Merge by id; higher rank wins, a tie keeps the local record. */
export function mergeGames(
  local: Record<string, GameRecord>,
  incoming: Record<string, GameRecord>,
): Record<string, GameRecord> {
  const out = { ...local };
  for (const id of Object.keys(incoming)) {
    const mine = out[id];
    if (!mine || rank(incoming[id]) > rank(mine)) out[id] = incoming[id];
  }
  return out;
}
