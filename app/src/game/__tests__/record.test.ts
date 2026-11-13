import { type GameRecord, clean, cleanAll, mergeGames, rank } from '../record';

const base = {
  id: 'd-2026-11-01',
  mode: 'daily',
  date: '2026-11-01',
  answer: 'terse',
  guesses: ['crane'],
  status: 'playing',
  startedAt: 5,
  finishedAt: 0,
};

const rec = (o: Partial<GameRecord> = {}): GameRecord => ({ ...(clean(base) as GameRecord), ...o });

describe('clean', () => {
  it('fills a missing source by mode', () => {
    expect(clean(base)?.source).toBe('bundled');
    expect(clean({ ...base, id: 'x-abc', mode: 'extra' })?.source).toBe('local');
    expect(clean({ ...base, source: 'bogus' })?.source).toBe('bundled');
    expect(clean({ ...base, source: 'endpoint' })?.source).toBe('endpoint');
  });
  it('rejects bad input', () => {
    for (const bad of [
      null,
      'x',
      { ...base, id: 'AB' },
      { ...base, id: 'has space' },
      { ...base, mode: 'weekly' },
      { ...base, answer: 'Terse' },
      { ...base, date: '2026-1-1' },
      { ...base, guesses: 'crane' },
    ])
      expect(clean(bad)).toBeNull();
  });
  it('filters bad guesses, caps at 6 and defaults status and times', () => {
    const g = clean({
      ...base,
      guesses: ['crane', 'XXXXX', 'a', 'slate', 'moist', 'plumb', 'ghost', 'fjord', 'tulip'],
      status: 'weird',
      startedAt: 'x',
    });
    expect(g?.guesses).toEqual(['crane', 'slate', 'moist', 'plumb', 'ghost', 'fjord']);
    expect(g?.status).toBe('playing');
    expect(g?.startedAt).toBe(0);
  });
  it('cleanAll keeps valid entries by id', () => {
    const out = cleanAll({ a: base, b: { nope: 1 } });
    expect(Object.keys(out)).toEqual(['d-2026-11-01']);
    expect(cleanAll(null)).toEqual({});
  });
});

describe('rank and mergeGames', () => {
  it('ranks finished above playing', () => {
    expect(rank(rec())).toBe(1);
    expect(rank(rec({ status: 'lost', guesses: ['crane'] }))).toBe(101);
  });
  it('higher rank wins, tie keeps local, new ids are added', () => {
    const local = rec({ guesses: ['crane'] });
    const more = rec({ guesses: ['crane', 'slate'] });
    const tie = rec({ startedAt: 99 });
    const other = rec({ id: 'x-new' });
    expect(mergeGames({ [local.id]: local }, { [more.id]: more })[local.id]).toBe(more);
    expect(mergeGames({ [local.id]: more }, { [local.id]: local })[local.id]).toBe(more);
    expect(mergeGames({ [local.id]: local }, { [local.id]: tie })[local.id]).toBe(local);
    expect(Object.keys(mergeGames({ [local.id]: local }, { [other.id]: other }))).toHaveLength(2);
  });
});
