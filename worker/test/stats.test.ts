import { describe, expect, it } from 'vitest';
import { addDays, dnum } from '../../app/src/game/dates';
import { env } from 'cloudflare:test';
import { firstDay, heatGrid, heatLevel, heatSpan, loadStats, renderHtml, triesSummary, viewerDay, yearGrid } from '../src/stats';
import type { Stats } from '../src/stats';

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

describe('viewerDay', () => {
  const at = Date.parse('2026-11-17T02:51:00Z');
  it("gives the viewer's local date and a plain zone name", () => {
    expect(viewerDay(at, 'America/Denver')).toEqual({
      today: '2026-11-16',
      zone: 'America/Denver',
      label: 'Mountain Time',
      fallback: false,
    });
    expect(viewerDay(at, 'Pacific/Auckland')).toMatchObject({ today: '2026-11-17', fallback: false });
    expect(viewerDay(at, 'UTC')).toMatchObject({ today: '2026-11-17', fallback: false });
  });
  it.each([['Mars/Olympus'], [''], [undefined], [42], ['<b>']])('falls back to UTC for %j', (zone) => {
    expect(viewerDay(at, zone)).toEqual({ today: '2026-11-17', zone: 'UTC', label: 'UTC', fallback: true });
  });
});

describe('loadStats for a viewer', () => {
  const at = Date.parse('2026-11-17T02:51:00Z');
  const seed = (data: Record<string, number>) =>
    env.DB.batch(
      Object.entries(data).map(([k, n]) => env.DB.prepare('INSERT INTO counts (key, n) VALUES (?, ?)').bind(k, n)),
    );

  it('uses the viewer day for tiles, tries and the heatmap', async () => {
    await seed({ 'day:2026-11-16': 11, 'tries:2026-11-16:4': 1, 'tries:2026-11-16:6': 1 });
    const s = await loadStats(env.DB, at, 'America/Denver');
    expect(s.current.day.total).toBe(11);
    expect(s.tries).toMatchObject({ date: '2026-11-16', played: 2 });
    const cells = s.grid.flat();
    expect(cells.find((c) => c.date === '2026-11-16')?.future).toBeUndefined();
    expect(cells.find((c) => c.date === '2026-11-17')?.future).toBe(true);
    const html = renderHtml(s);
    expect(html).toContain('class="cell l4 today"');
  });

  it('shows nothing for the same data from UTC', async () => {
    await seed({ 'day:2026-11-16': 11, 'tries:2026-11-16:4': 1, 'tries:2026-11-16:6': 1 });
    const s = await loadStats(env.DB, at, 'UTC');
    expect(s.current.day.total).toBe(0);
    expect(s.tries.played).toBe(0);
  });

  it("tries are today's only", async () => {
    await seed({ 'tries:2026-11-16:3': 5, 'tries:2026-11-18:3': 5 });
    expect((await loadStats(env.DB, at, 'UTC')).tries.played).toBe(0);
  });
});

describe('renderHtml zone copy', () => {
  const base = async (zone?: string): Promise<Stats> => loadStats(env.DB, Date.parse('2026-11-17T02:51:00Z'), zone);

  it('names the viewer day and zone, and not UTC', async () => {
    const html = renderHtml(await base('America/Denver'));
    expect(html).toContain('Today is Mon, Nov 16, Mountain Time. Each player counts on their own calendar day.');
    // The mandated "Honest limits" bullet about older counts is the only place UTC is named.
    expect(html).not.toContain('UTC');
    expect(html).toContain("<h2>Today's word</h2>");
    expect(html).toContain('players today');
  });

  it('says UTC and why when the zone is unknown', async () => {
    const html = renderHtml(await base());
    expect(html).toContain('Today is Tue, Nov 17, UTC: we could not tell your time zone.');
  });

  it('escapes the zone label', async () => {
    const html = renderHtml({ ...(await base('America/Denver')), zoneLabel: '<x>"' });
    expect(html).toContain('&#60;x&#62;&#34;');
    expect(html).not.toContain('<x>');
  });
});

describe('heatSpan', () => {
  const today = '2026-11-15';
  it('picks the span from how far back the history goes', () => {
    expect(heatSpan(today, null)).toBe('week');
    expect(heatSpan(today, today)).toBe('week');
    expect(heatSpan(today, addDays(today, -12))).toBe('week');
    expect(heatSpan(today, addDays(today, -13))).toBe('month');
    expect(heatSpan(today, addDays(today, -68))).toBe('month');
    expect(heatSpan(today, addDays(today, -69))).toBe('year');
    expect(heatSpan(today, addDays(today, 1))).toBe('week');
  });
});

describe('firstDay', () => {
  it('returns the earliest day with a count, ignoring zeros, platform keys and other keys', () => {
    const rows: [string, number][] = [
      ['day:2026-01-01', 0],
      ['day:2026-02-01:ios', 5],
      ['week:2026-W01', 5],
      ['day:2026-03-05', 2],
      ['day:2026-03-02', 1],
      ['installs', 9],
    ];
    expect(firstDay(rows)).toBe('2026-03-02');
  });
  it('is null with nothing', () => {
    expect(firstDay([])).toBeNull();
  });
});

describe('heatGrid', () => {
  const dates = (g: ReturnType<typeof heatGrid>) => g.flat().map((c) => c.date);

  it('week: one column holding today', () => {
    const g = heatGrid('2026-11-15', 'week', () => 1);
    expect(g).toHaveLength(1);
    expect(dates(g)[0]).toBe('2026-11-09');
    expect(dates(g)[6]).toBe('2026-11-15');
    expect(g[0].some((c) => c.future)).toBe(false);
  });

  it('week: future days are zero and levels scale against the week only', () => {
    const get = (k: string) => (k === 'day:2026-11-02' ? 1000 : k === 'day:2026-11-12' ? 99 : k === 'day:2026-11-10' ? 10 : 0);
    const g = heatGrid('2026-11-11', 'week', get)[0];
    expect(g.slice(3).every((c) => c.future && c.n === 0)).toBe(true);
    expect(g[1]).toMatchObject({ date: '2026-11-10', n: 10, level: 4 });
  });

  it('month: weeks covering the calendar month', () => {
    const g = heatGrid('2026-11-15', 'month', () => 1);
    expect(g).toHaveLength(6);
    expect(g[0][0].date).toBe('2026-10-26');
    expect(g[5][6].date).toBe('2026-12-06');
    const flat = g.flat();
    expect(flat.filter((c) => c.future).every((c) => c.date > '2026-11-15')).toBe(true);
    expect(flat.find((c) => c.date === '2026-11-16')?.future).toBe(true);
    expect(flat.find((c) => c.date === '2026-11-15')?.future).toBeUndefined();
  });

  it('month: a Monday-start 28-day month is 4 columns', () => {
    const g = heatGrid('2027-02-10', 'month', () => 0);
    expect(g).toHaveLength(4);
    expect(g[0][0].date).toBe('2027-02-01');
    expect(g[3][6].date).toBe('2027-02-28');
  });

  it('month: ending on a Sunday adds no extra column', () => {
    const g = heatGrid('2026-05-20', 'month', () => 0); // May 31 2026 is a Sunday
    expect(g.flat().at(-1)?.date).toBe('2026-05-31');
  });

  it('year equals yearGrid', () => {
    const get = (k: string) => (k === 'day:2026-11-10' ? 3 : 0);
    expect(heatGrid('2026-11-13', 'year', get)).toEqual(yearGrid('2026-11-13', get));
  });
});
