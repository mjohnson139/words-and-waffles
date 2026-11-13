import { ANSWERS } from './answers';
import { dailyWord } from './daily';
import { type GameRecord, type Mode, type Source } from './record';
import { type Mark, score } from './score';
import { isValidWord as defaultIsValid, okWord } from './words';

export interface PlayState {
  game: GameRecord | null;
  typed: string;
}

export type Effect =
  | { type: 'pop'; row: number; col: number }
  | { type: 'shake'; row: number }
  | { type: 'toast'; message: string }
  | { type: 'reveal'; row: number; marks: Mark[] }
  | { type: 'won'; row: number }
  | { type: 'lost' }
  | { type: 'save'; game: GameRecord };

// Prototype line 261.
export const WIN: readonly string[] = [
  '',
  'Hole in one! Did you peek at the batter?',
  'Two bites. Showing off before coffee.',
  'Golden brown. Perfect flip.',
  'Nicely toasted.',
  'A little chewy, but it counts.',
  'Saved it just before the smoke alarm.',
];

export function newGame(
  id: string,
  mode: Mode,
  date: string,
  answer: string,
  source: Source,
): GameRecord {
  return {
    id,
    mode,
    date,
    answer,
    guesses: [],
    status: 'playing',
    startedAt: 0,
    finishedAt: 0,
    source,
  };
}

/** Prototype line 318. */
export const uid = (now: number, rand: () => number): string =>
  now.toString(36) + Math.floor(rand() * 1e4).toString(36);

/** Press a key: a-z, 'enter' or 'back' (prototype press/submit, lines 370-386). */
export function press(
  state: PlayState,
  key: string,
  now: number,
  isValid: (w: string) => boolean = defaultIsValid,
): { state: PlayState; effects: Effect[] } {
  const { game, typed } = state;
  if (!game || game.status !== 'playing') return { state, effects: [] };
  const row = game.guesses.length;

  if (key === 'back') return { state: { game, typed: typed.slice(0, -1) }, effects: [] };

  if (key === 'enter') {
    if (typed.length < 5) {
      return {
        state,
        effects: [{ type: 'toast', message: 'Five letters, chef.' }, { type: 'shake', row }],
      };
    }
    if (!isValid(typed) && typed !== game.answer) {
      return {
        state,
        effects: [{ type: 'toast', message: "That one isn't in the pantry." }, { type: 'shake', row }],
      };
    }
    const marks = score(typed, game.answer);
    const guesses = [...game.guesses, typed];
    const status =
      typed === game.answer ? 'won' : guesses.length === 6 ? 'lost' : 'playing';
    const next: GameRecord = {
      ...game,
      guesses,
      status,
      finishedAt: status !== 'playing' ? now : game.finishedAt,
    };
    const effects: Effect[] = [{ type: 'reveal', row, marks }];
    if (status === 'won') effects.push({ type: 'won', row });
    else if (status === 'lost') effects.push({ type: 'lost' });
    effects.push({ type: 'save', game: next });
    return { state: { game: next, typed: '' }, effects };
  }

  if (!/^[a-z]$/.test(key) || typed.length >= 5) return { state, effects: [] };
  const started = game.startedAt ? game : { ...game, startedAt: now };
  return {
    state: { game: started, typed: typed + key },
    effects: [{ type: 'pop', row, col: typed.length }],
  };
}

/** Port of loadGame (lines 319-327). */
export function resume(
  games: Record<string, GameRecord>,
  mode: Mode,
  date: string,
  rand: () => number,
  now: number,
  dailyAnswer?: { answer: string; source: Source },
): GameRecord | null {
  if (mode === 'daily') {
    const id = 'd-' + date;
    return (
      games[id] ??
      newGame(
        id,
        'daily',
        date,
        dailyAnswer?.answer ?? dailyWord(date),
        dailyAnswer?.source ?? 'bundled',
      )
    );
  }
  const open = Object.values(games)
    .filter((g) => g.mode === mode && g.status === 'playing')
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  if (open) return open;
  if (mode === 'extra') {
    const daily = dailyWord(date);
    let w: string;
    do {
      w = ANSWERS[Math.floor(rand() * ANSWERS.length)];
    } while (w === daily);
    return newGame('x-' + uid(now, rand), 'extra', date, w, 'local');
  }
  return null;
}

/**
 * What the Play screen should show. A daily game waits ('loading') until the
 * day's word is known for this date, so a bundled word never stands in for a
 * server word that is still on its way. A saved game keeps its own answer.
 */
export function pickGame(input: {
  games: Record<string, GameRecord>;
  mode: Mode;
  date: string;
  daily: { date: string; answer: string; source: Source } | null | undefined;
  rand: () => number;
  now: number;
}): GameRecord | null | 'loading' {
  const { games, mode, date, daily, rand, now } = input;
  if (mode === 'daily') {
    const saved = games['d-' + date];
    if (saved) return saved;
    if (daily?.date !== date) return 'loading';
    return resume(games, mode, date, rand, now, { answer: daily.answer, source: daily.source });
  }
  return resume(games, mode, date, rand, now);
}

/** Lines 419-421. */
export function startCustom(
  secret: string,
  date: string,
  now: number,
  rand: () => number,
): { game: GameRecord; toast: string } | { error: string } {
  const w = secret.trim().toLowerCase();
  if (!okWord(w)) return { error: 'It needs exactly five letters, A to Z.' };
  return {
    game: newGame('c-' + uid(now, rand), 'custom', date, w, 'local'),
    toast: 'Word is in the iron. Go!',
  };
}

export const resultTitle = (g: GameRecord): string =>
  g.status === 'won' ? WIN[g.guesses.length] : 'Burnt that one.';

/** Line 430. */
export const moreLabel = (mode: Mode): string =>
  mode === 'custom' ? 'Pick another word' : mode === 'extra' ? 'Another helping' : 'Have seconds';
