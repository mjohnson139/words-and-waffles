import { ANSWERS } from '../answers';
import { addDays } from '../dates';
import { EPOCH, dailyIndex, dailyWord, puzzleNumber } from '../daily';

describe('daily', () => {
  it('has 890 answers starting with terse', () => {
    expect(ANSWERS).toHaveLength(890);
    expect(ANSWERS[0]).toBe('terse');
    expect(ANSWERS.every((w) => /^[a-z]{5}$/.test(w))).toBe(true);
  });
  it('picks ANSWERS[0] on the epoch', () => {
    expect(dailyIndex(EPOCH)).toBe(0);
    expect(dailyWord(EPOCH)).toBe('terse');
  });
  it('advances one word a day and wraps at 890', () => {
    expect(dailyWord(addDays(EPOCH, 1))).toBe(ANSWERS[1]);
    expect(dailyIndex(addDays(EPOCH, 889))).toBe(889);
    expect(dailyIndex(addDays(EPOCH, 890))).toBe(0);
  });
  it('is safe before the epoch', () => {
    expect(dailyIndex(addDays(EPOCH, -1))).toBe(889);
    expect(dailyWord(addDays(EPOCH, -890))).toBe('terse');
  });
  it('numbers puzzles from 1', () => {
    expect(puzzleNumber(EPOCH)).toBe(1);
    expect(puzzleNumber('2026-11-13')).toBe(13);
    expect(puzzleNumber(addDays(EPOCH, -1))).toBe(0);
  });
});
