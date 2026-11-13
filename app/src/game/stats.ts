import { addDays, dnum, pad } from './dates';
import { type GameRecord } from './record';
import { score } from './score';

type Games = Record<string, GameRecord>;

/** Finished games with at least one guess, newest first (prototype line 487). */
export function finished(games: Games): GameRecord[] {
  return Object.values(games)
    .filter((g) => g.status !== 'playing' && g.guesses.length)
    .sort((a, b) => b.finishedAt - a.finishedAt || (a.date < b.date ? 1 : -1));
}

/** Win-day streaks (lines 488-495). `today` is passed in; a streak ending yesterday still counts. */
export function streaks(games: Games, today: string): { now: number; best: number; days: number } {
  const days = [...new Set(Object.values(games).filter((g) => g.status === 'won').map((g) => g.date))].sort();
  const set = new Set(days);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    run = prev !== null && dnum(d) - prev === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = dnum(d);
  }
  let now = 0;
  let d = set.has(today) ? today : addDays(today, -1);
  while (set.has(d)) {
    now++;
    d = addDays(d, -1);
  }
  return { now, best, days: days.length };
}

export interface Stats {
  fs: GameRecord[];
  wins: GameRecord[];
  st: { now: number; best: number; days: number };
  /** Wins on guess 1..6, then burnt (index 6). */
  dist: number[];
  openers: [string, { n: number; w: number; sum: number }][];
  total: number;
  uniq: number;
  greens: number;
  letter: [string, number] | undefined;
  /** Fastest win in ms, 0 if none timed. */
  fast: number;
  /** Earliest win finish, minutes after local midnight. */
  early: number | null;
  avg: number;
}

/** Lines 496-512. */
export function compute(games: Games, today: string): Stats {
  const fs = finished(games);
  const wins = fs.filter((g) => g.status === 'won');
  const st = streaks(games, today);
  const dist = [0, 0, 0, 0, 0, 0, 0];
  fs.forEach((g) => dist[g.status === 'won' ? g.guesses.length - 1 : 6]++);
  const open: Record<string, { n: number; w: number; sum: number }> = {};
  const letters: Record<string, number> = {};
  const uniq = new Set<string>();
  let total = 0;
  let greens = 0;
  fs.forEach((g) => {
    const o = g.guesses[0];
    open[o] = open[o] || { n: 0, w: 0, sum: 0 };
    open[o].n++;
    if (g.status === 'won') {
      open[o].w++;
      open[o].sum += g.guesses.length;
    }
    greens += score(o, g.answer).filter((s) => s === 'hit').length;
    g.guesses.forEach((x) => {
      total++;
      uniq.add(x);
      for (const ch of x) letters[ch] = (letters[ch] || 0) + 1;
    });
  });
  const openers = Object.entries(open).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
  const timed = wins.filter((g) => g.startedAt && g.finishedAt > g.startedAt).map((g) => g.finishedAt - g.startedAt);
  const mins = wins
    .filter((g) => g.finishedAt)
    .map((g) => {
      const d = new Date(g.finishedAt);
      return d.getHours() * 60 + d.getMinutes();
    });
  return {
    fs,
    wins,
    st,
    dist,
    openers,
    total,
    uniq: uniq.size,
    greens,
    letter: Object.entries(letters).sort((a, b) => b[1] - a[1])[0],
    fast: timed.length ? Math.min(...timed) : 0,
    early: mins.length ? Math.min(...mins) : null,
    avg: wins.length ? wins.reduce((s, g) => s + g.guesses.length, 0) / wins.length : 0,
  };
}

export interface Badge {
  title: string;
  description: string;
  test: (s: Stats) => boolean;
}

/** Lines 513-524. */
export const BADGES: readonly Badge[] = [
  { title: 'First waffle', description: 'Win a game', test: (s) => s.wins.length >= 1 },
  { title: 'Short stack', description: '3 days in a row', test: (s) => s.st.best >= 3 },
  { title: 'Tall stack', description: '7 days in a row', test: (s) => s.st.best >= 7 },
  { title: "Baker's dozen", description: '13 wins', test: (s) => s.wins.length >= 13 },
  { title: 'Two-bite wonder', description: 'Win in 2 or fewer', test: (s) => s.dist[0] + s.dist[1] > 0 },
  { title: 'Smoke alarm', description: 'Win on the last guess', test: (s) => s.dist[5] > 0 },
  { title: 'Early bird', description: 'Win before 7 am', test: (s) => s.early !== null && s.early < 420 },
  { title: 'Creature of habit', description: 'Same opener 5 times', test: (s) => s.openers.some((o) => o[1].n >= 5) },
  { title: 'Taste tester', description: '10 different openers', test: (s) => s.openers.length >= 10 },
  {
    title: 'Seconds, please',
    description: 'Finish 5 extra words',
    test: (s) => s.fs.filter((g) => g.mode !== 'daily').length >= 5,
  },
];

export const earnedBadges = (s: Stats): boolean[] => BADGES.map((b) => b.test(s));

/** m:ss (line 527). */
export const formatDuration = (ms: number): string => {
  const t = Math.round(ms / 1000);
  return Math.floor(t / 60) + ':' + pad(t % 60);
};
