import type { GameRecord } from '../../game/record';
import { type Mark, score } from '../../game/score';

export interface RowView {
  letters: string;
  /** Marks per tile, or null while the row is not scored (empty, typing, or mid-reveal). */
  marks: Mark[] | null;
}

/** What each of the six board rows shows (prototype paint, lines 342-352). `holdRow` is the row being revealed. */
export function boardRows(game: GameRecord | null, typed: string, holdRow: number | null): RowView[] {
  const guesses = game?.guesses ?? [];
  return Array.from({ length: 6 }, (_, r) => {
    const g = guesses[r];
    if (g && game) return { letters: g, marks: r === holdRow ? null : score(g, game.answer) };
    if (game && r === guesses.length && game.status === 'playing') return { letters: typed, marks: null };
    return { letters: '', marks: null };
  });
}

/** Reveal timing (prototype submit, lines 376-384). */
export const FLIP_STAGGER_MS = 240;
export const FLIP_HALF_MS = 230;
export const REVEAL_DONE_MS = 4 * FLIP_STAGGER_MS + 520;
