import { isoWeek, monthOf } from '../../app/src/game/dates';
import { errorResponse } from './http';

const PLATFORMS = ['ios', 'android', 'web'];
const KEYS = ['d', 'w', 'm', 'n', 'p'];
const MAX_BODY = 200;
// Generous: many real players can share one IP (carrier NAT, schools, offices).
export const MAX_PER_HOUR = 120;
const HOUR = 3600_000;

// Rate limit state lives in this isolate's memory only. It is never persisted,
// never logged, and is lost on restart. That is deliberate: no IP is stored.
const hits = new Map<string, { count: number; resetAt: number }>();

export const resetRateLimit = (): void => hits.clear();

function overLimit(ip: string, now: number): boolean {
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const entry = hits.get(ip);
  if (!entry) {
    hits.set(ip, { count: 1, resetAt: now + HOUR });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_HOUR;
}

interface Ping {
  d: boolean;
  w: boolean;
  m: boolean;
  n: boolean;
  p: string;
}

function parsePing(text: string): Ping | null {
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
  if (keys.length !== KEYS.length || !KEYS.every((k) => keys.includes(k))) return null;
  if (![o.d, o.w, o.m, o.n].every((v) => typeof v === 'boolean')) return null;
  if (typeof o.p !== 'string' || !PLATFORMS.includes(o.p)) return null;
  return o as unknown as Ping;
}

export function counterKeys(ping: Ping, utcDate: string): string[] {
  const out: string[] = [];
  const add = (base: string) => out.push(base, `${base}:${ping.p}`);
  add(`day:${utcDate}`);
  if (ping.w) add(`week:${isoWeek(utcDate)}`);
  if (ping.m) add(`month:${monthOf(utcDate)}`);
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
  const ping = parsePing(await request.text());
  if (!ping) return errorResponse(400, 'invalid ping');

  const utcDate = new Date(now).toISOString().slice(0, 10);
  const stmt = env.DB.prepare(
    'INSERT INTO counts (key, n) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET n = n + 1',
  );
  try {
    await env.DB.batch(counterKeys(ping, utcDate).map((k) => stmt.bind(k)));
  } catch {
    return errorResponse(500, 'server error');
  }
  return new Response(null, { status: 204 });
}
