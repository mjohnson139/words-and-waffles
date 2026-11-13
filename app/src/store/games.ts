import { useCallback, useEffect, useRef, useState } from 'react';

import { cleanAll, type GameRecord } from '../game/record';
import { restoreInto } from './backupFormat';
import { readJSON, writeJSON } from './storage';

export const GAMES_KEY = 'ww:games';

export type Games = Record<string, GameRecord>;

export async function loadGames(): Promise<Games> {
  return cleanAll(await readJSON<unknown>(GAMES_KEY, {}));
}

export function saveGames(games: Games): Promise<void> {
  return writeJSON(GAMES_KEY, games);
}

export function useGames() {
  const [ready, setReady] = useState(false);
  const [games, setGames] = useState<Games>({});
  const latest = useRef<Games>({});
  const queue = useRef<Promise<void>>(Promise.resolve());

  const commit = useCallback((next: Games) => {
    latest.current = next;
    setGames(next);
    // Serialise writes so a slow one can't land after a newer one.
    queue.current = queue.current.then(() => saveGames(next));
  }, []);

  useEffect(() => {
    let live = true;
    loadGames().then((g) => {
      if (!live) return;
      // Keep anything saved before the load finished.
      const merged = { ...g, ...latest.current };
      latest.current = merged;
      setGames(merged);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const saveGame = useCallback((g: GameRecord) => commit({ ...latest.current, [g.id]: g }), [commit]);
  // Merge against the latest state, not a snapshot taken before a file picker opened.
  const restore = useCallback(
    (incoming: Games) => {
      const { games: merged, added, updated } = restoreInto(latest.current, incoming);
      if (added || updated) commit(merged);
      return { added, updated };
    },
    [commit],
  );

  return { ready, games, saveGame, restore };
}
