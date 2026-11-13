import { beforeEach, describe, expect, it, vi } from 'vitest';

import { maybePing } from '../ping';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const mkFetch = (ok: boolean) => vi.fn(async () => ({ ok }) as unknown as Response);
const base = { endpoint: 'https://x.test/v1/ping', enabled: true, platform: 'ios' as const, today: '2026-11-13' };

describe('maybePing', () => {
  beforeEach(() => store.clear());

  it('first ever ping sends all flags and exactly 5 keys', async () => {
    const f = mkFetch(true);
    expect(await maybePing({ ...base, fetchImpl: f as unknown as typeof fetch })).toBe('sent');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(base.endpoint);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ d: true, w: true, m: true, n: true, p: 'ios' });
    expect(Object.keys(body)).toHaveLength(5);
  });

  it('second ping the same day is skipped without a request', async () => {
    await maybePing({ ...base, fetchImpl: mkFetch(true) as unknown as typeof fetch });
    const f = mkFetch(true);
    expect(await maybePing({ ...base, fetchImpl: f as unknown as typeof fetch })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('failure does not store state', async () => {
    expect(await maybePing({ ...base, fetchImpl: mkFetch(false) as unknown as typeof fetch })).toBe('failed');
    expect(store.has('ww:ping')).toBe(false);
    const throwing = vi.fn(async () => {
      throw new Error('net');
    });
    expect(await maybePing({ ...base, fetchImpl: throwing as unknown as typeof fetch })).toBe('failed');
    expect(store.has('ww:ping')).toBe(false);
  });

  it('disabled or empty endpoint is skipped', async () => {
    const f = mkFetch(true);
    const fi = f as unknown as typeof fetch;
    expect(await maybePing({ ...base, enabled: false, fetchImpl: fi })).toBe('skipped');
    expect(await maybePing({ ...base, endpoint: '', fetchImpl: fi })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });
});
