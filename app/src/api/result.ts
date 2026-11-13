import { useEffect, useRef } from 'react';
import type { GameRecord } from '../game/record';
import { cleanResultState, resultBody, resultEndpoint } from '../game/result';
import { readJSON, writeJSON } from '../store/storage';

export const RESULT_KEY = 'ww:result';

export async function maybeSendResult(opts: {
  endpoint: string;
  enabled: boolean;
  today: string;
  game: GameRecord | undefined;
  fetchImpl?: typeof fetch;
}): Promise<'sent' | 'skipped' | 'failed'> {
  const url = resultEndpoint(opts.endpoint);
  if (!url || !opts.enabled) return 'skipped';
  const state = cleanResultState(await readJSON<unknown>(RESULT_KEY, null));
  const body = resultBody(opts.game, opts.today, state);
  if (!body) return 'skipped';

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try {
    const res = await (opts.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      signal: ctl.signal,
    });
    if (!res.ok) return 'failed';
    await writeJSON(RESULT_KEY, { lastDate: opts.today });
    return 'sent';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends today's result when the daily game becomes won or lost, under the same
 * switch as the ping. The ref keeps one send in flight per date; anything but
 * a send clears it so a later change (switch turned on, retry) can try again.
 */
export function useResultOnFinish(
  pingEndpoint: string,
  enabled: boolean,
  ready: boolean,
  today: string,
  game: GameRecord | undefined,
): void {
  const inFlight = useRef<string | null>(null);
  const finished = game?.status === 'won' || game?.status === 'lost';
  useEffect(() => {
    if (!ready || !finished || inFlight.current === today) return;
    inFlight.current = today;
    void maybeSendResult({ endpoint: pingEndpoint, enabled, today, game }).then((r) => {
      if (r !== 'sent' && inFlight.current === today) inFlight.current = null;
    });
  }, [ready, finished, pingEndpoint, enabled, today, game]);
}
