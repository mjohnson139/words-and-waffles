import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { addDays } from '../../app/src/game/dates';
import worker from '../src/index';
import { MAX_PER_HOUR } from '../src/ping';

const call = (path: string, init?: RequestInit) =>
  worker.fetch(new Request('https://w.test' + path, init), env);
const result = (body: unknown, ip = '1.1.1.1', headers: Record<string, string> = {}) =>
  call('/v1/result', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': ip, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const rows = async () =>
  Object.fromEntries(
    (await env.DB.prepare('SELECT key, n FROM counts').all<{ key: string; n: number }>()).results.map(
      (r) => [r.key, r.n],
    ),
  );
const d = new Date().toISOString().slice(0, 10);

describe('POST /v1/result', () => {
  it('writes tries:<d>:<g> and returns 204', async () => {
    expect((await result({ d, g: 3 })).status).toBe(204);
    expect((await result({ d, g: 'x' })).status).toBe(204);
    expect(await rows()).toEqual({ [`tries:${d}:3`]: 1, [`tries:${d}:x`]: 1 });
  });

  it('increments an existing counter', async () => {
    await result({ d, g: 3 });
    await result({ d, g: 3 });
    expect((await rows())[`tries:${d}:3`]).toBe(2);
  });

  it('accepts yesterday and tomorrow, rejects two days either side and impossible dates', async () => {
    for (const n of [-1, 1]) expect((await result({ d: addDays(d, n), g: 2 })).status).toBe(204);
    for (const bad of [addDays(d, -2), addDays(d, 2), '2026-02-30', '2026-13-01', 'nope'])
      expect((await result({ d: bad, g: 2 })).status).toBe(400);
  });

  it('rejects malformed bodies with 400 invalid result', async () => {
    const long = JSON.stringify({ d, g: 3, pad: 'a'.repeat(80) });
    expect(long.length).toBeGreaterThan(100);
    const bodies: unknown[] = [
      { d, g: 3, x: 1 },
      { d },
      { g: 3 },
      { d, g: 0 },
      { d, g: 7 },
      { d, g: 2.5 },
      { d, g: '3' },
      { d, g: 'X' },
      [d, 3],
      [],
      'not json',
      long,
    ];
    for (const b of bodies) {
      const res = await result(b);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid result' });
    }
    expect(await rows()).toEqual({});
  });

  it('refuses a 101-byte body and an oversized Content-Length', async () => {
    const body = JSON.stringify({ d, g: 3 }).padEnd(101, ' ');
    expect(body.length).toBe(101);
    expect((await result(body)).status).toBe(400);
    expect((await result({ d, g: 3 }, '1.1.1.1', { 'Content-Length': '101' })).status).toBe(400);
  });

  it('dry run validates but writes nothing', async () => {
    expect((await result({ d, g: 3 }, '1.1.1.1', { 'X-Dry-Run': '1' })).status).toBe(204);
    expect((await result({ d, g: 9 }, '1.1.1.1', { 'X-Dry-Run': '1' })).status).toBe(400);
    expect(await rows()).toEqual({});
  });

  it('shares the rate limit with /v1/ping', async () => {
    for (let i = 0; i < MAX_PER_HOUR; i++)
      await call('/v1/ping', {
        method: 'POST',
        headers: { 'CF-Connecting-IP': '2.2.2.2' },
        body: JSON.stringify({ d: true, w: false, m: false, n: false, p: 'ios' }),
      });
    const res = await result({ d, g: 3 }, '2.2.2.2');
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'too many requests' });
  });

  it('answers OPTIONS with CORS and rejects GET', async () => {
    const opt = await call('/v1/result', { method: 'OPTIONS' });
    expect(opt.status).toBe(204);
    expect(opt.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await call('/v1/result')).status).toBe(405);
  });
});
