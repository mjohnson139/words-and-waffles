import { useCallback, useEffect, useRef, useState } from 'react';
import { readJSON, writeJSON } from './storage';
import { cleanSettings, DEFAULT_SETTINGS, type Settings } from './settingsRules';

export type { Settings } from './settingsRules';
export const SETTINGS_KEY = 'ww:settings';

export async function loadSettings(): Promise<Settings> {
  return cleanSettings(await readJSON<unknown>(SETTINGS_KEY, null));
}

export async function saveSettings(s: Settings): Promise<void> {
  await writeJSON(SETTINGS_KEY, cleanSettings(s));
}

export function useSettings(): {
  ready: boolean;
  settings: Settings;
  update: (partial: Partial<Settings>) => void;
} {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const latest = useRef<Settings>(DEFAULT_SETTINGS);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => {
      if (!alive) return;
      latest.current = s;
      setSettings(s);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((partial: Partial<Settings>) => {
    const next = cleanSettings({ ...latest.current, ...partial });
    latest.current = next;
    setSettings(next);
    // Serialise writes so a slow one can't land after a newer one.
    queue.current = queue.current.then(() => saveSettings(next)).catch(() => {});
  }, []);

  return { ready, settings, update };
}
