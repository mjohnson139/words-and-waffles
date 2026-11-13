import { encodeCells } from '../../app/src/game/cells';
import { EPOCH } from '../../app/src/game/daily';
import { addDays, isDateString } from '../../app/src/game/dates';
import { errorResponse, json } from './http';
import { builtinSource } from './sources/builtin';
import type { WordSource } from './sources/types';

const hex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

/** Deterministic per-day salt: first 32 hex chars of HMAC-SHA256(secret, date). */
export async function makeSalt(secret: string, date: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(date))).slice(0, 32);
}

/** Calendar date for an instant at the given UTC offset in hours. */
const dateAt = (ms: number, offsetHours: number): string => {
  const t = new Date(ms + offsetHours * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
};

/** Latest date we serve: tomorrow in the furthest-ahead time zone (UTC+14) plus a day of slack. */
export const latestAllowed = (now: number): string => addDays(dateAt(now, 14), 1);

const isRealDate = (s: string): boolean => {
  const t = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s;
};

export async function handleWord(
  request: Request,
  env: Cloudflare.Env,
  now: number = Date.now(),
  source: WordSource = builtinSource,
): Promise<Response> {
  const date = new URL(request.url).searchParams.get('date');
  if (!isDateString(date) || !isRealDate(date)) return errorResponse(400, 'date must be YYYY-MM-DD');
  if (date < EPOCH) return errorResponse(400, 'date is before the first puzzle');
  if (date > latestAllowed(now)) return errorResponse(400, 'date is too far in the future');
  if (!env.WORD_SECRET) return errorResponse(500, 'server error');

  const { word, puzzle } = await source.getWord(date);
  const salt = await makeSalt(env.WORD_SECRET, date);
  const body = { v: 1, date, puzzle, len: 5, salt, cells: encodeCells(word, salt) };
  return json(body, 200, 'public, max-age=3600');
}
