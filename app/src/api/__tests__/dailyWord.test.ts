import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeCells, type WordPayload } from '../../game/cells';
import { dailyWord } from '../../game/daily';
import { loadDailyWord, resolveDaily } from '../dailyWord';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
    getAllKeys: async () => [...store.keys()],
    multiRemove: async (ks: string[]) => ks.forEach((k) => store.delete(k)),
  },
}));

const DATE = '2026-11-13';
const SALT = 'abcdef0123456789';
const mk = (word: string, date = DATE): WordPayload => ({
  v: 1,
  date,
  puzzle: 13,
  len: 5,
  salt: SALT,
  cells: encodeCells(word, SALT),
});
const bundled = dailyWord(DATE);
const other = bundled === 'crane' ? 'slate' : 'crane';

describe('resolveDaily', () => {
  it('fresh wins over cache', () => {
    const r = resolveDaily({ date: DATE, payload: mk('crane'), cached: mk('slate') });
    expect(r).toMatchObject({ answer: 'crane', source: 'endpoint' });
    expect(r.payloadToCache).toEqual(mk('crane'));
  });
  it('fresh with wrong date is ignored', () => {
    const r = resolveDaily({ date: DATE, payload: mk('crane', '2026-11-12'), cached: mk('slate') });
    expect(r).toMatchObject({ answer: 'slate', source: 'endpoint', payloadToCache: null });
  });
  it('fresh garbage falls to cache', () => {
    expect(resolveDaily({ date: DATE, payload: { nope: 1 }, cached: mk('slate') }).answer).toBe('slate');
  });
  it('tampered cell falls back to bundled', () => {
    const bad = mk('crane');
    bad.cells[2] = '0000000000000000';
    const r = resolveDaily({ date: DATE, payload: bad, cached: null });
    expect(r).toEqual({ answer: bundled, source: 'bundled', payloadToCache: null });
  });
  it('nothing gives bundled', () => {
    expect(resolveDaily({ date: DATE, payload: null, cached: null })).toEqual({
      answer: bundled,
      source: 'bundled',
      payloadToCache: null,
    });
  });
});

const okFetch = (body: unknown) =>
  vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response) as unknown as typeof fetch;

describe('loadDailyWord', () => {
  beforeEach(() => store.clear());

  it('empty endpoint never fetches', async () => {
    const f = vi.fn();
    const r = await loadDailyWord(DATE, '', { fetchImpl: f as unknown as typeof fetch });
    expect(f).not.toHaveBeenCalled();
    expect(r).toEqual({ answer: bundled, source: 'bundled' });
  });

  it('success caches the payload and builds the query', async () => {
    const f = okFetch(mk(other));
    const r = await loadDailyWord(DATE, 'https://x.test/v1/word?k=1', { fetchImpl: f });
    expect(r).toEqual({ answer: other, source: 'endpoint' });
    const url = new URL((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(url.searchParams.get('date')).toBe(DATE);
    expect(url.searchParams.get('k')).toBe('1');
    expect(JSON.parse(store.get(`ww:word:${DATE}`)!)).toEqual(mk(other));
    expect(store.get(`ww:word:${DATE}`)).not.toContain(other);
  });

  it('a cached payload for the date needs no request (offline cold start)', async () => {
    store.set(`ww:word:${DATE}`, JSON.stringify(mk(other)));
    const f = vi.fn();
    const r = await loadDailyWord(DATE, 'https://x.test/w', { fetchImpl: f as unknown as typeof fetch });
    expect(f).not.toHaveBeenCalled();
    expect(r).toEqual({ answer: other, source: 'endpoint' });
  });

  it('timeout with nothing cached falls back to the bundled word', async () => {
    const hang = ((_u: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal!.addEventListener('abort', () => rej(new Error('abort'))))) as unknown as typeof fetch;
    const r = await loadDailyWord(DATE, 'https://x.test/w', { fetchImpl: hang, timeoutMs: 10 });
    expect(r).toEqual({ answer: bundled, source: 'bundled' });
  });

  it('prunes word keys older than 7 days', async () => {
    store.set('ww:word:2026-11-01', '{}');
    store.set('ww:word:2026-11-10', '{}');
    store.set('ww:other', '1');
    await loadDailyWord(DATE, '');
    expect(store.has('ww:word:2026-11-01')).toBe(false);
    expect(store.has('ww:word:2026-11-10')).toBe(true);
    expect(store.has('ww:other')).toBe(true);
  });
});
