import { newGame } from '../../../game/play';
import { boardRows } from '../rows';

const game = (guesses: string[], status: 'playing' | 'won' | 'lost' = 'playing') => ({
  ...newGame('d-2026-11-13', 'daily', '2026-11-13', 'crane', 'bundled'),
  guesses,
  status,
});

describe('boardRows', () => {
  it('shows six empty rows without a game', () => {
    const rows = boardRows(null, 'ab', null);
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.letters === '' && r.marks === null)).toBe(true);
  });
  it('scores guesses and shows typing on the next row', () => {
    const rows = boardRows(game(['crate']), 'sl', null);
    expect(rows[0].marks).toEqual(['hit', 'hit', 'hit', 'miss', 'hit']);
    expect(rows[1]).toEqual({ letters: 'sl', marks: null });
    expect(rows[2].letters).toBe('');
  });
  it('holds back the marks of the row being revealed', () => {
    const rows = boardRows(game(['crate']), '', 0);
    expect(rows[0]).toEqual({ letters: 'crate', marks: null });
  });
  it('shows no typing row once the game is over', () => {
    const rows = boardRows(game(['crane'], 'won'), 'x', null);
    expect(rows[1].letters).toBe('');
  });
});
