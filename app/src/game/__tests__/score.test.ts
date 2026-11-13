import { keyMarks, score } from '../score';

describe('score', () => {
  it('marks all hits', () => expect(score('terse', 'terse')).toEqual(Array(5).fill('hit')));
  it('handles duplicate guess letters against a single answer letter', () => {
    // geese vs those: only one e in the answer, and it is a hit at index 4
    expect(score('geese', 'those')).toEqual(['miss', 'miss', 'miss', 'hit', 'hit']);
  });
  it('gives the near mark only as often as the answer has the letter', () => {
    expect(score('speed', 'abide')).toEqual(['miss', 'miss', 'near', 'miss', 'near']);
  });
  it('handles an answer with a double letter', () => {
    expect(score('llama', 'hello')).toEqual(['near', 'near', 'miss', 'miss', 'miss']);
  });
  it('lets a hit take a letter before a near does', () => {
    // answer "abbey": guess "bobby" -> b at idx 2 hit; idx 0 near; idx 3 near? answer has b,b
    expect(score('babes', 'abbey')).toEqual(['near', 'near', 'hit', 'hit', 'miss']);
  });
});

describe('keyMarks', () => {
  it('keeps the best mark per letter', () => {
    const m = keyMarks(['crane', 'trace'], 'terse');
    expect(m.r).toBe('near');
    expect(m.e).toBe('hit');
    expect(m.c).toBe('miss');
    expect(m.t).toBe('hit');
  });
  it('never downgrades hit to near or miss', () => {
    expect(keyMarks(['speed', 'abide'], 'abide').e).toBe('hit');
    expect(keyMarks(['geese'], 'those').e).toBe('hit');
  });
  it('is empty without guesses', () => expect(keyMarks([], 'terse')).toEqual({}));
});
