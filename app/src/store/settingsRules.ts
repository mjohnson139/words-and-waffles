export interface Settings {
  pingEnabled: boolean;
  wordEndpointOverride: string;
}

export const DEFAULT_SETTINGS: Settings = { pingEnabled: true, wordEndpointOverride: '' };

/** True for an https:// URL with a host and no embedded credentials. */
export function isEndpointUrl(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (!/^https:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' && u.hostname !== '' && u.username === '' && u.password === '';
  } catch {
    return false;
  }
}

export function cleanSettings(x: unknown): Settings {
  const o = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
  return {
    pingEnabled: typeof o.pingEnabled === 'boolean' ? o.pingEnabled : DEFAULT_SETTINGS.pingEnabled,
    wordEndpointOverride: isEndpointUrl(o.wordEndpointOverride) ? o.wordEndpointOverride.trim() : '',
  };
}
