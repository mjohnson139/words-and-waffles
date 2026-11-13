import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
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

/** A loaded daily word, plus whether a configured endpoint was tried and failed. */
export interface LoadedDaily extends Daily {
  failed: boolean;
}

export const RETRY_MIN_MS = 60_000;

/**
 * Whether to try the word endpoint again: only after a configured endpoint
 * failed, never once the game has guesses (it keeps its answer), at most once
 * per RETRY_MIN_MS.
 */
export function shouldRetry(input: {
  result: { source: DailySource; failed: boolean };
  endpoint: string;
  hasGuesses: boolean;
  lastAttemptAt: number;
  now: number;
}): boolean {
  const { result, endpoint, hasGuesses, lastAttemptAt, now } = input;
  if (!endpoint || !result.failed || result.source !== 'bundled' || hasGuesses) return false;
  return now - lastAttemptAt >= RETRY_MIN_MS;
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
): Promise<LoadedDaily> {
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
    return { answer: hit.answer, source: hit.source, failed: false };
  }
  const payload = endpoint
    ? await fetchPayload(date, endpoint, opts.fetchImpl ?? fetch, opts.timeoutMs ?? WORD_TIMEOUT_MS)
    : null;
  const { answer, source, payloadToCache } = resolveDaily({ date, payload, cached });
  if (payloadToCache) await writeJSON(key, { endpoint, payload: payloadToCache });
  await pruneOld(date);
  return { answer, source, failed: !!endpoint && source === 'bundled' };
}

/**
 * Null while loading; resolved once per (date, endpoint). If the endpoint
 * failed, retries on foreground / `online` while the day's game has no guesses.
 */
export function useDailyWord(date: string, endpoint: string, hasGuesses = false): Daily | null {
  const [state, setState] = useState<{ date: string; endpoint: string; daily: LoadedDaily; at: number } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let alive = true;
    inFlight.current = false;
    loadDailyWord(date, endpoint).then((daily) => {
      if (alive) setState({ date, endpoint, daily, at: Date.now() });
    });
    return () => {
      alive = false;
    };
  }, [date, endpoint]);

  const retry = useEffectEvent(() => {
    if (!state || state.date !== date || state.endpoint !== endpoint || inFlight.current) return;
    const now = Date.now();
    if (!shouldRetry({ result: state.daily, endpoint, hasGuesses, lastAttemptAt: state.at, now })) return;
    inFlight.current = true;
    loadDailyWord(date, endpoint).then((daily) => {
      inFlight.current = false;
      setState((cur) =>
        cur && cur.date === date && cur.endpoint === endpoint ? { date, endpoint, daily, at: Date.now() } : cur,
      );
    });
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') retry();
    });
    const on = () => retry();
    if (Platform.OS === 'web') window.addEventListener('online', on);
    return () => {
      sub.remove();
      if (Platform.OS === 'web') window.removeEventListener('online', on);
    };
  }, []);

  if (!state || state.date !== date || state.endpoint !== endpoint) return null;
  return { answer: state.daily.answer, source: state.daily.source };
}
