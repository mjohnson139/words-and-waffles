import { useEffect, useRef } from 'react';
import { Platform as RNPlatform } from 'react-native';
import { afterPing, cleanPingState, pingBody, type Platform } from '../game/ping';
import { today as todayStr } from '../game/dates';
import { readJSON, writeJSON } from '../store/storage';

export const PING_KEY = 'ww:ping';

export async function maybePing(opts: {
  endpoint: string;
  enabled: boolean;
  platform: Platform;
  today: string;
  fetchImpl?: typeof fetch;
}): Promise<'sent' | 'skipped' | 'failed'> {
  if (!opts.endpoint || !opts.enabled) return 'skipped';
  const state = cleanPingState(await readJSON<unknown>(PING_KEY, null));
  const body = pingBody(state, opts.today, opts.platform);
  if (!body) return 'skipped';

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await (opts.fetchImpl ?? fetch)(opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      signal: ctl.signal,
    });
    if (!res.ok) return 'failed';
    await writeJSON(PING_KEY, afterPing(opts.today));
    return 'sent';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

const platformName = (): Platform =>
  RNPlatform.OS === 'ios' ? 'ios' : RNPlatform.OS === 'android' ? 'android' : 'web';

/**
 * Pings once per mount, but only after settings have loaded, so a player who
 * turned the ping off never sends one from the default value.
 */
export function usePingOnOpen(endpoint: string, enabled: boolean, ready: boolean): void {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    void maybePing({ endpoint, enabled, platform: platformName(), today: todayStr() });
  }, [ready, endpoint, enabled]);
}
