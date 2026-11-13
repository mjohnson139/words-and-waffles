import { addDays, isDateString } from '../../app/src/game/dates';
import { errorResponse } from './http';
import { overLimit } from './rateLimit';

const MAX_BODY = 100;

export function parseResult(text: string, utcToday: string): { d: string; g: number | 'x' } | null {
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
  if (keys.length !== 2 || !keys.includes('d') || !keys.includes('g')) return null;
  const { d, g } = o;
  // isDateString checks the shape only; the round trip rejects 2026-02-30.
  if (!isDateString(d) || addDays(d, 0) !== d) return null;
  if (d < addDays(utcToday, -1) || d > addDays(utcToday, 1)) return null;
  const tries = typeof g === 'number' && Number.isInteger(g) && g >= 1 && g <= 6;
  if (!tries && g !== 'x') return null;
  return { d, g: g as number | 'x' };
}

export async function handleResult(
  request: Request,
  env: Cloudflare.Env,
  now: number = Date.now(),
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (overLimit(ip, now)) return errorResponse(429, 'too many requests');

  // Refuse oversized bodies before reading them.
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) return errorResponse(400, 'invalid result');
  const utcToday = new Date(now).toISOString().slice(0, 10);
  const result = parseResult(await request.text(), utcToday);
  if (!result) return errorResponse(400, 'invalid result');
  if (request.headers.get('X-Dry-Run') === '1') return new Response(null, { status: 204 });

  try {
    await env.DB.prepare('INSERT INTO counts (key, n) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET n = n + 1')
      .bind(`tries:${result.d}:${result.g}`)
      .run();
  } catch {
    return errorResponse(500, 'server error');
  }
  return new Response(null, { status: 204 });
}
