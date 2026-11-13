import { BADGES, compute, earnedBadges, finished, formatDuration, streaks } from '../stats';
import { type Mode, type GameRecord } from '../record';
import { newGame } from '../play';

let n = 0;
const mk = (
  date: string,
  status: 'won' | 'lost',
  o: { mode?: Mode; answer?: string; guesses?: string[]; startedAt?: number; finishedAt?: number } = {},
): GameRecord => {
  const answer = o.answer ?? 'terse';
  const guesses = o.guesses ?? (status === 'won' ? [answer] : Array(6).fill('crane'));
  return {
    ...newGame('g-' + ++n, o.mode ?? 'daily', date, answer, 'bundled'),
    guesses,
    status,
    startedAt: o.startedAt ?? 0,
    finishedAt: o.finishedAt ?? 1000 + n,
  };
};
const map = (...gs: GameRecord[]) => Object.fromEntries(gs.map((g) => [g.id, g]));
const wins = (...dates: string[]) => map(...dates.map((d) => mk(d, 'won')));

describe('streaks', () => {
  it('counts today and yesterday', () => {
    expect(streaks(wins('2026-11-12', '2026-11-13'), '2026-11-13')).toEqual({ now: 2, best: 2, days: 2 });
  });
  it('counts a streak ending yesterday', () => {
    expect(streaks(wins('2026-11-11', '2026-11-12'), '2026-11-13').now).toBe(2);
  });
  it('is 0 when last win was 2 days ago', () => {
    expect(streaks(wins('2026-11-10', '2026-11-11'), '2026-11-13')).toMatchObject({ now: 0, best: 2 });
  });
  it('a gap resets the run but keeps best', () => {
    const s = streaks(wins('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'), '2026-11-06');
    expect(s).toEqual({ now: 2, best: 3, days: 5 });
  });
  it('two wins on one day count once', () => {
    expect(streaks(map(mk('2026-11-13', 'won'), mk('2026-11-13', 'won', { mode: 'extra' })), '2026-11-13')).toEqual({
      now: 1,
      best: 1,
      days: 1,
    });
  });
  it('runs across month and year ends', () => {
    expect(streaks(wins('2026-10-31', '2026-11-01'), '2026-11-01').now).toBe(2);
    expect(streaks(wins('2026-12-30', '2026-12-31', '2027-01-01'), '2027-01-01')).toMatchObject({ now: 3, best: 3 });
  });
  it('a loss is not a win day', () => {
    const g = map(mk('2026-11-12', 'won'), mk('2026-11-13', 'lost'));
    expect(streaks(g, '2026-11-13')).toEqual({ now: 1, best: 1, days: 1 });
  });
});

describe('finished', () => {
  it('drops playing and empty games, newest first', () => {
    const a = mk('2026-11-01', 'won', { finishedAt: 5 });
    const b = mk('2026-11-02', 'won', { finishedAt: 9 });
    const p = { ...mk('2026-11-03', 'won'), status: 'playing' as const };
    expect(finished(map(a, b, p))).toEqual([b, a]);
  });
});

describe('compute', () => {
  it('builds dist with burnt slot, avg, greens, letters', () => {
    const g = map(
      mk('2026-11-01', 'won', { guesses: ['crane', 'terse'] }),
      mk('2026-11-02', 'won', { guesses: ['terse'] }),
      mk('2026-11-03', 'lost'),
    );
    const s = compute(g, '2026-11-03');
    expect(s.dist).toEqual([1, 1, 0, 0, 0, 0, 1]);
    expect(s.avg).toBe(1.5);
    expect(s.total).toBe(9);
    expect(s.uniq).toBe(2);
    expect(s.greens).toBe(5 + 1 + 1); // terse/crane: only the final e is green in crane vs terse
    expect(s.letter?.[0]).toBe('e');
  });
  it('sorts openers by count then alpha', () => {
    const g = map(
      mk('2026-11-01', 'won', { guesses: ['slate', 'terse'] }),
      mk('2026-11-02', 'won', { guesses: ['crane', 'terse'] }),
      mk('2026-11-03', 'won', { guesses: ['crane', 'terse'] }),
      mk('2026-11-04', 'lost', { guesses: ['adieu', 'x1', 'x2', 'x3', 'x4', 'x5'] }),
    );
    const s = compute(g, '2026-11-04');
    expect(s.openers.map((o) => o[0])).toEqual(['crane', 'adieu', 'slate']);
    expect(s.openers[0][1]).toEqual({ n: 2, w: 2, sum: 4 });
  });
  it('fast ignores games without startedAt', () => {
    const g = map(
      mk('2026-11-01', 'won', { startedAt: 0, finishedAt: 500 }),
      mk('2026-11-02', 'won', { startedAt: 1000, finishedAt: 31000 }),
      mk('2026-11-03', 'won', { startedAt: 1000, finishedAt: 11000 }),
    );
    expect(compute(g, '2026-11-03').fast).toBe(10000);
    expect(compute(map(mk('2026-11-01', 'won')), '2026-11-01').fast).toBe(0);
  });
  it('early uses local minutes of the earliest win', () => {
    const t = (h: number, m: number) => new Date(2026, 10, 12, h, m).getTime();
    const g = map(
      mk('2026-11-01', 'won', { finishedAt: t(9, 0) }),
      mk('2026-11-02', 'won', { finishedAt: t(6, 30) }),
      mk('2026-11-03', 'lost', { finishedAt: t(3, 0) }),
    );
    expect(compute(g, '2026-11-03').early).toBe(390);
    expect(compute({}, '2026-11-03').early).toBeNull();
  });
});

describe('BADGES', () => {
  const titles = BADGES.map((b) => b.title);
  const has = (s: ReturnType<typeof compute>, t: string) => earnedBadges(s)[titles.indexOf(t)];
  const empty = compute({}, '2026-11-13');
  const at = (h: number) => new Date(2026, 10, 12, h, 0).getTime();

  it('has ten badges, none earned when empty', () => {
    expect(BADGES).toHaveLength(10);
    expect(earnedBadges(empty).every((x) => !x)).toBe(true);
  });
  it('First waffle', () => {
    expect(has(compute(wins('2026-11-01'), '2026-11-13'), 'First waffle')).toBe(true);
  });
  it('Short stack and Tall stack', () => {
    const three = compute(wins('2026-11-01', '2026-11-02', '2026-11-03'), '2026-11-13');
    expect(has(three, 'Short stack')).toBe(true);
    expect(has(three, 'Tall stack')).toBe(false);
    const seven = compute(wins(...[1, 2, 3, 4, 5, 6, 7].map((d) => `2026-11-0${d}`)), '2026-11-13');
    expect(has(seven, 'Tall stack')).toBe(true);
  });
  it("Baker's dozen", () => {
    const d = (i: number) => `2026-11-${String(i).padStart(2, '0')}`;
    const all = (k: number) => compute(wins(...Array.from({ length: k }, (_, i) => d(i + 1))), '2026-11-30');
    expect(has(all(13), "Baker's dozen")).toBe(true);
    expect(has(all(12), "Baker's dozen")).toBe(false);
  });
  it('Two-bite wonder', () => {
    expect(has(compute(map(mk('2026-11-01', 'won', { guesses: ['terse'] })), '2026-11-13'), 'Two-bite wonder')).toBe(true);
    const slow = map(mk('2026-11-01', 'won', { guesses: ['crane', 'slate', 'terse'] }));
    expect(has(compute(slow, '2026-11-13'), 'Two-bite wonder')).toBe(false);
  });
  it('Smoke alarm', () => {
    const last = map(mk('2026-11-01', 'won', { guesses: ['a', 'b', 'c', 'd', 'e', 'terse'] }));
    expect(has(compute(last, '2026-11-13'), 'Smoke alarm')).toBe(true);
    expect(has(compute(wins('2026-11-01'), '2026-11-13'), 'Smoke alarm')).toBe(false);
  });
  it('Early bird', () => {
    const early = map(mk('2026-11-01', 'won', { finishedAt: at(6) }));
    const late = map(mk('2026-11-01', 'won', { finishedAt: at(7) }));
    expect(has(compute(early, '2026-11-13'), 'Early bird')).toBe(true);
    expect(has(compute(late, '2026-11-13'), 'Early bird')).toBe(false);
  });
  it('Creature of habit', () => {
    const k = (c: number) =>
      compute(
        map(...Array.from({ length: c }, (_, i) => mk(`2026-11-0${i + 1}`, 'won', { guesses: ['crane', 'terse'] }))),
        '2026-11-13',
      );
    expect(has(k(5), 'Creature of habit')).toBe(true);
    expect(has(k(4), 'Creature of habit')).toBe(false);
  });
  it('Taste tester', () => {
    const k = (c: number) =>
      compute(
        map(...Array.from({ length: c }, (_, i) => mk(`2026-11-${String(i + 1).padStart(2, '0')}`, 'won', { guesses: ['abc' + i + 'x'.repeat(1), 'terse'] }))),
        '2026-11-30',
      );
    expect(has(k(10), 'Taste tester')).toBe(true);
    expect(has(k(9), 'Taste tester')).toBe(false);
  });
  it('Seconds, please', () => {
    const k = (c: number) =>
      compute(map(...Array.from({ length: c }, (_, i) => mk(`2026-11-0${i + 1}`, 'won', { mode: 'extra' }))), '2026-11-13');
    expect(has(k(5), 'Seconds, please')).toBe(true);
    expect(has(k(4), 'Seconds, please')).toBe(false);
  });
});

describe('formatDuration', () => {
  it('formats m:ss', () => {
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(9000)).toBe('0:09');
  });
});
