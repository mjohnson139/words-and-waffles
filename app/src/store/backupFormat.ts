import { cleanAll, mergeGames, type GameRecord } from '../game/record';

export const BACKUP_APP = 'words-and-waffles';
export const BACKUP_VERSION = 1;

type Games = Record<string, GameRecord>;

export interface Backup {
  app: typeof BACKUP_APP;
  v: 1;
  exportedAt: string;
  games: Games;
}

export function makeBackup(games: Games, now: number): Backup {
  return { app: BACKUP_APP, v: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), games };
}

/** `date` is YYYY-MM-DD. */
export const backupFileName = (date: string): string => `${BACKUP_APP}-${date}.json`;

export type ParsedBackup = { ok: true; games: Games } | { ok: false; error: string };

const NOT_A_BACKUP = "That file isn't a Words & Waffles backup.";

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: NOT_A_BACKUP };
  const o = data as Record<string, unknown>;
  if (o.app !== BACKUP_APP || typeof o.v !== 'number') return { ok: false, error: NOT_A_BACKUP };
  if (o.v > BACKUP_VERSION) return { ok: false, error: 'That backup is from a newer version.' };
  if (o.v !== BACKUP_VERSION) return { ok: false, error: NOT_A_BACKUP };
  return { ok: true, games: cleanAll(o.games) };
}

/** Merge a backup into the local games; counts new ids and ids whose record was replaced. */
export function restoreInto(
  local: Games,
  incoming: Games,
): { games: Games; added: number; updated: number } {
  const games = mergeGames(local, incoming);
  let added = 0;
  let updated = 0;
  for (const id of Object.keys(incoming)) {
    if (!local[id]) added++;
    else if (games[id] !== local[id]) updated++;
  }
  return { games, added, updated };
}
