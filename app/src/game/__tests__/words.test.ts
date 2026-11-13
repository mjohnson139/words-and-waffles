import { ANSWERS } from '../answers';
import { VALID, isValidWord, okWord } from '../words';

describe('words', () => {
  it('includes every answer in VALID', () => {
    expect(ANSWERS.every((w) => VALID.has(w))).toBe(true);
    expect(VALID.size).toBeGreaterThan(10000);
  });
  it('checks validity', () => {
    expect(isValidWord('terse')).toBe(true);
    expect(isValidWord('zzzzz')).toBe(false);
  });
  it('okWord needs five lowercase letters', () => {
    expect(okWord('terse')).toBe(true);
    for (const bad of ['Terse', 'tere', 'tersee', 'ter3e', 5, null, undefined, ' erse'])
      expect(okWord(bad)).toBe(false);
  });
});
