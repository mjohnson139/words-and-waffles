import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeCells, isWordPayload, type WordPayload } from '../game/cells';
import { dailyWord } from '../game/daily';
import { addDays, isDateString } from '../game/dates';
import { readJSON, writeJSON } from '../store/storage';

export type DailySource = 'endpoint' | 'bundled';
export interface Daily {
  answer: string;
  source: DailySource;
}

const KEY_PREFIX = 'ww:word:';
const KEEP_DAYS = 7;
export const WORD_TIMEOUT_MS = 2500;

/** The cached payload, only when it came from this (non-empty) endpoint. */
function cachedPayload(entry: unknown, endpoint: string): unknown | null {
  if (!endpoint || typeof entry !== 'object' || entry === null) return null;
  const e = entry as { endpoint?: unknown; payload?: unknown };
  return e.endpoint === endpoint ? (e.payload ?? null) : null;
}

/** The decoded answer when the payload is for this date and intact. */
function answerOf(x: unknown, date: string): { answer: string; payload: WordPayload } | null {
  if (!isWordPayload(x) || x.date !== date) return null;
  const answer = decodeCells(x.salt, x.cells);
  return answer ? { answer, payload: x } : null;
}

export function resolveDaily(input: { date: string; payload: unknown | null; cached: unknown | null }): Daily & {
  payloadToCache: WordPayload | null;
} {
  try {
    const fresh = answerOf(input.payload, input.date);
    if (fresh) return { answer: fresh.answer, source: 'endpoint', payloadToCache: fresh.payload };
    const cached = answerOf(input.cached, input.date);
    if (cached) return { answer: cached.answer, source: 'endpoint', payloadToCache: null };
  } catch {
    // fall through to the bundled word
  }
  return { answer: dailyWord(input.date), source: 'bundled', payloadToCache: null };
}

async function fetchPayload(
  date: string,
  endpoint: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<unknown | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const url = new URL(endpoint);
    url.searchParams.set('date', date);
    const res = await fetchImpl(url.toString(), { signal: ctl.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function pruneOld(date: string): Promise<void> {
  try {
    const oldest = addDays(date, -KEEP_DAYS);
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) => {
      if (!k.startsWith(KEY_PREFIX)) return false;
      const d = k.slice(KEY_PREFIX.length);
      return !isDateString(d) || d < oldest;
    });
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    // best effort
  }
}

export async function loadDailyWord(
  date: string,
  endpoint: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Daily> {
  const key = KEY_PREFIX + date;
  // The cache remembers which endpoint served it: another endpoint (an override
  // set or cleared) must not be answered from this one's payload.
  const entry = await readJSON<unknown>(key, null);
  const cached = cachedPayload(entry, endpoint);
  // A cached payload for this date is final (the server is deterministic per
  // date), so it costs no request and needs no network: offline cold start.
  const hit = resolveDaily({ date, payload: null, cached });
  if (hit.source === 'endpoint') {
    await pruneOld(date);
    return { answer: hit.answer, source: hit.source };
  }
  const payload = endpoint
    ? await fetchPayload(date, endpoint, opts.fetchImpl ?? fetch, opts.timeoutMs ?? WORD_TIMEOUT_MS)
    : null;
  const { answer, source, payloadToCache } = resolveDaily({ date, payload, cached });
  if (payloadToCache) await writeJSON(key, { endpoint, payload: payloadToCache });
  await pruneOld(date);
  return { answer, source };
}

/** Null while loading; resolved once per (date, endpoint). */
export function useDailyWord(date: string, endpoint: string): Daily | null {
  const [state, setState] = useState<{ date: string; endpoint: string; daily: Daily } | null>(null);

  useEffect(() => {
    let alive = true;
    loadDailyWord(date, endpoint).then((daily) => {
      if (alive) setState({ date, endpoint, daily });
    });
    return () => {
      alive = false;
    };
  }, [date, endpoint]);

  return state && state.date === date && state.endpoint === endpoint ? state.daily : null;
}
