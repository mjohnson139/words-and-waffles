// Generous: many real players can share one IP (carrier NAT, schools, offices).
export const MAX_PER_HOUR = 120;
const HOUR = 3600_000;

// Rate limit state lives in this isolate's memory only. It is never persisted,
// never logged, and is lost on restart. That is deliberate: no IP is stored.
const hits = new Map<string, { count: number; resetAt: number }>();

export const resetRateLimit = (): void => hits.clear();

export function overLimit(ip: string, now: number): boolean {
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const entry = hits.get(ip);
  if (!entry) {
    hits.set(ip, { count: 1, resetAt: now + HOUR });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_HOUR;
}
