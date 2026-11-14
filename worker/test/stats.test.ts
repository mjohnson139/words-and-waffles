import { describe, expect, it } from 'vitest';
import { dnum } from '../../app/src/game/dates';
import { currentTries, heatLevel, triesSummary, yearGrid } from '../src/stats';

describe('heatLevel', () => {
  it('is 0 for nothing and scales 1..4 against the max', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(5, 0)).toBe(0);
    expect(heatLevel(1, 100)).toBe(1);
    expect(heatLevel(25, 100)).toBe(1);
    expect(heatLevel(26, 100)).toBe(2);
    expect(heatLevel(51, 100)).toBe(3);
    expect(heatLevel(76, 100)).toBe(4);
    expect(heatLevel(100, 100)).toBe(4);
  });
});

describe('yearGrid', () => {
  const mondayIndex = (d: string) => (dnum(d) + 3) % 7;

  it('has 53 Monday-first columns of 7 with today in the last column at its weekday', () => {
    const g = yearGrid('2027-01-01', (k) => (k === 'day:2027-01-01' ? 8 : k === 'day:2026-12-31' ? 2 : 0));
    expect(g).toHaveLength(53);
    expect(g.every((c) => c.length === 7)).toBe(true);
    expect(mondayIndex(g[0][0].date)).toBe(0);
    // 2027-01-01 is a Friday: row 4 of the last column.
    expect(g[52][4]).toMatchObject({ date: '2027-01-01', n: 8, level: 4 });
    expect(g[52][3]).toMatchObject({ date: '2026-12-31', n: 2, level: 1 });
    expect(g[52][0].date).toBe('2026-12-28');
    expect(g[52][5]).toMatchObject({ date: '2027-01-02', n: 0, future: true });
    expect(g[52][6].future).toBe(true);
    expect(g[52][4].future).toBeUndefined();
  });

  it('starts 52 weeks before the current week', () => {
    const g = yearGrid('2026-11-13', () => 0);
    expect(g[0][0].date).toBe('2025-11-10');
    expect(g[52][4].date).toBe('2026-11-13');
  });
});

describe('triesSummary', () => {
  it('sums played and won and rounds the win rate', () => {
    const data: Record<string, number> = {
      'tries:2026-11-13:2': 1,
      'tries:2026-11-13:4': 1,
      'tries:2026-11-13:x': 1,
    };
    const t = triesSummary('2026-11-13', (k) => data[k] ?? 0);
    expect(t).toMatchObject({ played: 3, won: 2, winRate: 67 });
    expect(t.counts).toEqual({ '1': 0, '2': 1, '3': 0, '4': 1, '5': 0, '6': 0, x: 1 });
  });

  it('is zero when nobody played', () => {
    expect(triesSummary('2026-11-13', () => 0)).toMatchObject({ played: 0, won: 0, winRate: 0 });
  });
});

describe('currentTries', () => {
  const at = (data: Record<string, number>) => (k: string) => data[k] ?? 0;
  it('shows the UTC date when it has the most results', () => {
    expect(currentTries('2026-11-13', at({ 'tries:2026-11-13:3': 2, 'tries:2026-11-12:3': 1 })).date).toBe('2026-11-13');
  });
  it("shows yesterday's word while most players are still on it", () => {
    expect(currentTries('2026-11-13', at({ 'tries:2026-11-13:3': 1, 'tries:2026-11-12:x': 5 })).date).toBe('2026-11-12');
  });
  it('shows tomorrow when only players east of UTC have finished', () => {
    expect(currentTries('2026-12-31', at({ 'tries:2027-01-01:1': 1 })).date).toBe('2027-01-01');
  });
  it('falls back to the UTC date with no results at all', () => {
    expect(currentTries('2026-11-13', at({}))).toMatchObject({ date: '2026-11-13', played: 0 });
  });
});
