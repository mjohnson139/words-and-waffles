import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { decodeCells } from '../../app/src/game/cells';
import { dailyWord, puzzleNumber } from '../../app/src/game/daily';
import { addDays } from '../../app/src/game/dates';
import worker from '../src/index';
import { handleWord } from '../src/word';
import { MAX_PER_HOUR } from '../src/ping';

const call = (path: string, init?: RequestInit) =>
  worker.fetch(new Request('https://w.test' + path, init), env);
const ping = (body: unknown, ip = '1.1.1.1') =>
  call('/v1/ping', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const good = { d: true, w: true, m: true, n: true, p: 'ios' };
const rows = async () =>
  Object.fromEntries(
    (await env.DB.prepare('SELECT key, n FROM counts').all<{ key: string; n: number }>()).results.map(
      (r) => [r.key, r.n],
    ),
  );
const utc14Today = (now: number) => new Date(now + 14 * 3600_000).toISOString().slice(0, 10);

describe('GET /v1/word', () => {
  it('decodes to the daily word and puzzle number', async () => {
    const res = await call('/v1/word?date=2026-11-13');
    expect(res.status).toBe(200);
    const b = (await res.json()) as { v: number; date: string; puzzle: number; len: number; salt: string; cells: string[] };
    expect(b).toMatchObject({ v: 1, date: '2026-11-13', len: 5, puzzle: puzzleNumber('2026-11-13') });
    expect(b.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(decodeCells(b.salt, b.cells)).toBe(dailyWord('2026-11-13'));
  });

  it('is deterministic per date and differs between dates', async () => {
    const a = (await (await call('/v1/word?date=2026-11-13')).json()) as { salt: string };
    const a2 = (await (await call('/v1/word?date=2026-11-13')).json()) as { salt: string };
    const b = (await (await call('/v1/word?date=2026-11-14')).json()) as { salt: string };
    expect(a.salt).toBe(a2.salt);
    expect(a.salt).not.toBe(b.salt);
  });

  it('sets CORS and cache headers', async () => {
    const res = await call('/v1/word?date=2026-11-13');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });

  it('rejects malformed dates and dates before the epoch', async () => {
    for (const q of ['', '?date=nope', '?date=2026-13-45', '?date=2026-11-1', '?date=2026-10-31']) {
      const res = await call('/v1/word' + q);
      expect(res.status).toBe(400);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    }
  });

  it('allows up to one day past UTC+14 today and rejects beyond', async () => {
    const now = Date.parse('2026-12-05T10:00:00Z');
    const limit = addDays(utc14Today(now), 1);
    const req = (d: string) => new Request('https://w.test/v1/word?date=' + d);
    expect((await handleWord(req(limit), env, now)).status).toBe(200);
    expect((await handleWord(req(addDays(limit, 1)), env, now)).status).toBe(400);
  });

  it('returns a bare 500 when the secret is missing', async () => {
    const res = await handleWord(new Request('https://w.test/v1/word?date=2026-11-13'), {
      DB: env.DB,
    } as Cloudflare.Env);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toMatch(/secret/i);
  });
});

describe('POST /v1/ping', () => {
  it('writes the exact counter keys and returns 204', async () => {
    const res = await ping(good);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const day = new Date().toISOString().slice(0, 10);
    const keys = Object.keys(await rows());
    expect(keys).toHaveLength(8);
    expect(keys).toEqual(
      expect.arrayContaining([`day:${day}`, `day:${day}:ios`, `month:${day.slice(0, 7)}`, `month:${day.slice(0, 7)}:ios`, 'installs', 'installs:ios']),
    );
    expect(keys.filter((k) => k.startsWith('week:'))).toHaveLength(2);
    expect(Object.values(await rows()).every((n) => n === 1)).toBe(true);
  });

  it('only writes day keys when other flags are false', async () => {
    await ping({ d: true, w: false, m: false, n: false, p: 'web' });
    const day = new Date().toISOString().slice(0, 10);
    expect(Object.keys(await rows()).sort()).toEqual([`day:${day}`, `day:${day}:web`].sort());
  });

  it('increments on repeated pings', async () => {
    await ping(good);
    await ping(good);
    expect((await rows()).installs).toBe(2);
  });

  it('rejects invalid bodies and writes nothing', async () => {
    const bad: unknown[] = [
      { ...good, x: 1 },
      { d: true, w: true, m: true, p: 'ios' },
      { ...good, d: 'yes' },
      { ...good, p: 'tv' },
      { ...good, p: 3 },
      [good],
      'null',
      'not json',
      JSON.stringify({ ...good, pad: 'x'.repeat(300) }),
      '',
    ];
    for (const [i, b] of bad.entries()) {
      const res = await ping(typeof b === 'string' ? b : JSON.stringify(b), `9.9.9.${i}`);
      expect(res.status, JSON.stringify(b)).toBe(400);
    }
    expect(await rows()).toEqual({});
  });

  it('a dry run is validated and answered but writes nothing', async () => {
    const dry = (body: unknown, ip: string) =>
      call('/v1/ping', {
        method: 'POST',
        headers: { 'CF-Connecting-IP': ip, 'X-Dry-Run': '1' },
        body: JSON.stringify(body),
      });
    expect((await dry(good, '7.7.7.1')).status).toBe(204);
    expect((await dry({ ...good, x: 1 }, '7.7.7.2')).status).toBe(400);
    expect(await rows()).toEqual({});
    // Any other value is an ordinary ping.
    const res = await call('/v1/ping', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '7.7.7.3', 'X-Dry-Run': 'true' },
      body: JSON.stringify(good),
    });
    expect(res.status).toBe(204);
    expect((await rows()).installs).toBe(1);
  });

  it('rate limits pings beyond MAX_PER_HOUR from one IP', async () => {
    for (let i = 0; i < MAX_PER_HOUR; i++) expect((await ping(good, '5.5.5.5')).status).toBe(204);
    const res = await ping(good, '5.5.5.5');
    expect(res.status).toBe(429);
    expect((await ping(good, '6.6.6.6')).status).toBe(204);
    expect((await rows()).installs).toBe(MAX_PER_HOUR + 1);
  });
});

describe('stats', () => {
  it('renders HTML with zero rows', async () => {
    const res = await call('/stats');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    const html = await res.text();
    expect(html).toContain('What we count');
    expect(html).toContain('https://github.com/mjohnson139/words-and-waffles/blob/main/PRIVACY.md');
    expect(html).not.toContain('<script');
  });

  it('renders data and matches the JSON', async () => {
    await ping(good);
    await ping({ d: true, w: false, m: false, n: false, p: 'android' }, '2.2.2.2');
    const res = await call('/stats.json');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    const s = (await res.json()) as {
      installs: number;
      days: { label: string; total: number; ios: number; android: number; web: number }[];
      weeks: unknown[];
      months: unknown[];
      current: { day: { total: number } };
    };
    expect(s.installs).toBe(1);
    expect(s.days).toHaveLength(30);
    expect(s.weeks).toHaveLength(12);
    expect(s.months).toHaveLength(12);
    expect(s.days[0]).toMatchObject({ total: 2, ios: 1, android: 1, web: 0 });
    expect(s.current.day.total).toBe(2);
    expect(await (await call('/stats')).text()).toContain(s.days[0].label);
  });
});

describe('routing', () => {
  it('answers preflight with 204 and CORS', async () => {
    const res = await call('/v1/ping', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });

  it('404s unknown paths and 405s wrong methods', async () => {
    expect((await call('/nope')).status).toBe(404);
    expect((await call('/v1/word', { method: 'POST' })).status).toBe(405);
    expect((await call('/v1/ping')).status).toBe(405);
    expect((await call('/stats', { method: 'POST' })).status).toBe(405);
  });
});

describe('security headers and D1 failure', () => {
  const brokenDb = {
    prepare: () => ({ all: async () => Promise.reject(new Error('d1 down')), bind: () => ({}) }),
    batch: async () => Promise.reject(new Error('d1 down')),
  } as unknown as D1Database;
  const broken = { ...env, DB: brokenDb } as Cloudflare.Env;
  const callBroken = (path: string, init?: RequestInit) =>
    worker.fetch(new Request('https://w.test' + path, init), broken);

  it('sets nosniff everywhere and a CSP on /stats', async () => {
    for (const path of ['/v1/word?date=2026-11-13', '/stats', '/stats.json', '/nope']) {
      expect((await call(path)).headers.get('X-Content-Type-Options'), path).toBe('nosniff');
    }
    expect((await call('/v1/ping', { method: 'OPTIONS' })).headers.get('X-Content-Type-Options')).toBe('nosniff');
    const csp = (await call('/stats')).headers.get('Content-Security-Policy');
    expect(csp).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
  });

  it('answers 500 (with CORS on the API) when D1 fails', async () => {
    const p = await callBroken('/v1/ping', { method: 'POST', body: JSON.stringify(good) });
    expect(p.status).toBe(500);
    expect(p.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await p.json()).toEqual({ error: 'server error' });
    expect((await callBroken('/stats')).status).toBe(500);
    expect((await callBroken('/stats.json')).status).toBe(500);
  });
});
