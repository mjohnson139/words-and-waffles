import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = cleanSettings({ ...prev, ...partial });
      void saveSettings(next);
      return next;
    });
  }, []);

  return { ready, settings, update };
}
