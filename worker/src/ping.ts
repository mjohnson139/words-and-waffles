import { isoWeek, monthOf } from '../../app/src/game/dates';
import { errorResponse } from './http';
import { isLocalDate } from './localDate';
import { MAX_PER_HOUR, overLimit, resetRateLimit } from './rateLimit';

const PLATFORMS = ['ios', 'android', 'web'];
const KEYS = ['d', 'w', 'm', 'n', 'p'];
const MAX_BODY = 200;
// `t`, the player's local date, is optional: app versions from before it was
// added send the five keys above and are counted under the UTC date.
export { MAX_PER_HOUR, resetRateLimit };

interface Ping {
  d: boolean;
  w: boolean;
  m: boolean;
  n: boolean;
  p: string;
  t?: string;
}

export function parsePing(text: string, utcToday: string): Ping | null {
  if (text.length > MAX_BODY) return null;
  let x: unknown;
  try {
    x = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const keys = Object.keys(o);
  const withDate = keys.length === KEYS.length + 1 && keys.includes('t');
  if (keys.length !== KEYS.length && !withDate) return null;
  if (!KEYS.every((k) => keys.includes(k))) return null;
  if (![o.d, o.w, o.m, o.n].every((v) => typeof v === 'boolean')) return null;
  if (typeof o.p !== 'string' || !PLATFORMS.includes(o.p)) return null;
  if (withDate && !isLocalDate(o.t, utcToday)) return null;
  return o as unknown as Ping;
}

/** Counter keys for a ping, filed under `date` (the player's local date, or UTC when the ping has none). */
export function counterKeys(ping: Ping, date: string): string[] {
  const out: string[] = [];
  const add = (base: string) => out.push(base, `${base}:${ping.p}`);
  add(`day:${date}`);
  if (ping.w) add(`week:${isoWeek(date)}`);
  if (ping.m) add(`month:${monthOf(date)}`);
  if (ping.n) add('installs');
  return out;
}

export async function handlePing(
  request: Request,
  env: Cloudflare.Env,
  now: number = Date.now(),
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (overLimit(ip, now)) return errorResponse(429, 'too many requests');

  // Refuse oversized bodies before reading them.
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) return errorResponse(400, 'invalid ping');
  const utcDate = new Date(now).toISOString().slice(0, 10);
  const ping = parsePing(await request.text(), utcDate);
  if (!ping) return errorResponse(400, 'invalid ping');
  // A dry run is validated like any ping but never counted (the production live
  // check uses it). It can only make a ping not count, so it needs no secret.
  if (request.headers.get('X-Dry-Run') === '1') return new Response(null, { status: 204 });

  const stmt = env.DB.prepare(
    'INSERT INTO counts (key, n) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET n = n + 1',
  );
  try {
    await env.DB.batch(counterKeys(ping, ping.t ?? utcDate).map((k) => stmt.bind(k)));
  } catch {
    return errorResponse(500, 'server error');
  }
  return new Response(null, { status: 204 });
}
