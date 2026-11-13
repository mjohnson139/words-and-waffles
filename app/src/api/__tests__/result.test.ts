import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameRecord } from '../../game/record';
import { maybeSendResult, RESULT_KEY } from '../result';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));

const mkFetch = (ok: boolean) => vi.fn(async () => ({ ok }) as unknown as Response);
const today = '2026-11-13';
const game: GameRecord = {
  id: 'd-' + today,
  mode: 'daily',
  date: today,
  answer: 'waffl',
  guesses: ['crane', 'waffl'],
  status: 'won',
  startedAt: 1,
  finishedAt: 2,
  source: 'bundled',
};
const base = { endpoint: 'https://x.test/v1/ping', enabled: true, today, game };

describe('maybeSendResult', () => {
  beforeEach(() => store.clear());

  it('sends exactly d and g to the result URL and stores the date', async () => {
    const f = mkFetch(true);
    expect(await maybeSendResult({ ...base, fetchImpl: f as unknown as typeof fetch })).toBe('sent');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.test/v1/result');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ d: today, g: 2 });
    expect(Object.keys(body).sort()).toEqual(['d', 'g']);
    expect(JSON.parse(store.get(RESULT_KEY) as string)).toEqual({ lastDate: today });
  });

  it('a second call the same day is skipped without a request', async () => {
    await maybeSendResult({ ...base, fetchImpl: mkFetch(true) as unknown as typeof fetch });
    const f = mkFetch(true);
    expect(await maybeSendResult({ ...base, fetchImpl: f as unknown as typeof fetch })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('disabled, unfinished or no usable endpoint is skipped with no request', async () => {
    const f = mkFetch(true);
    const fi = f as unknown as typeof fetch;
    expect(await maybeSendResult({ ...base, enabled: false, fetchImpl: fi })).toBe('skipped');
    expect(await maybeSendResult({ ...base, endpoint: '', fetchImpl: fi })).toBe('skipped');
    expect(await maybeSendResult({ ...base, game: { ...game, status: 'playing' }, fetchImpl: fi })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('failure does not store state', async () => {
    expect(await maybeSendResult({ ...base, fetchImpl: mkFetch(false) as unknown as typeof fetch })).toBe('failed');
    expect(store.has(RESULT_KEY)).toBe(false);
    const throwing = vi.fn(async () => {
      throw new Error('net');
    });
    expect(await maybeSendResult({ ...base, fetchImpl: throwing as unknown as typeof fetch })).toBe('failed');
    expect(store.has(RESULT_KEY)).toBe(false);
  });
});
