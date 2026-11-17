import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { counterKeys, handlePing } from '../src/ping';
import { loadStats } from '../src/stats';
import { handleWord, latestAllowed } from '../src/word';

/*
 * Date edges the Worker owns: a ping is counted on the player's local date
 * when it sends one and on the UTC date when it does not (older apps), ISO weeks straddle the new year while months do not, and the stats
 * windows are built backwards from the UTC date of the request. Every call
 * here pins `now`, so none of this depends on when the suite runs.
 */

const good = { d: true, w: true, m: true, n: true, p: 'ios' };
const dayOnly = { d: true, w: false, m: false, n: false, p: 'ios' };
const at = (iso: string) => Date.parse(iso);

const ping = (now: number, body: unknown = good, ip = '1.1.1.1') =>
  handlePing(
    new Request('https://w.test/v1/ping', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': ip },
      body: JSON.stringify(body),
    }),
    env,
    now,
  );
const rows = async () =>
  Object.fromEntries(
    (await env.DB.prepare('SELECT key, n FROM counts').all<{ key: string; n: number }>()).results.map(
      (r) => [r.key, r.n],
    ),
  );
const keysLike = async (prefix: string) =>
  Object.keys(await rows())
    .filter((k) => k.startsWith(prefix))
    .sort();
const word = (date: string, now?: number) =>
  handleWord(new Request('https://w.test/v1/word?date=' + date), env, now);

describe('counterKeys', () => {
  it('pairs every counter with its platform, in order, on the last day of an ISO week 53', () => {
    expect(counterKeys({ ...good, p: 'web' }, '2026-12-31')).toEqual([
      'day:2026-12-31',
      'day:2026-12-31:web',
      'week:2026-W53',
      'week:2026-W53:web',
      'month:2026-12',
      'month:2026-12:web',
      'installs',
      'installs:web',
    ]);
  });

  it('writes only the day pair when week, month and install flags are off', () => {
    expect(counterKeys({ ...dayOnly, p: 'android' }, '2027-01-01')).toEqual(['day:2027-01-01', 'day:2027-01-01:android']);
  });
});

describe('ping counted on the local date', () => {
  // 02:00Z on the 17th is still the evening of the 16th in the Americas.
  const now = at('2026-11-17T02:00:00Z');

  it('files day, week and month under the date the app sent', async () => {
    expect((await ping(now, { ...good, t: '2026-11-16' })).status).toBe(204);
    expect(await keysLike('day:')).toEqual(['day:2026-11-16', 'day:2026-11-16:ios']);
    expect(await keysLike('week:')).toEqual(['week:2026-W47', 'week:2026-W47:ios']);
    expect(await keysLike('month:')).toEqual(['month:2026-11', 'month:2026-11:ios']);
  });

  it('takes the month from the local date when UTC is already in the next one', async () => {
    await ping(at('2026-12-01T03:00:00Z'), { ...good, t: '2026-11-30' });
    expect(await keysLike('month:')).toEqual(['month:2026-11', 'month:2026-11:ios']);
  });

  it('accepts a date one day ahead of UTC (players east of UTC)', async () => {
    expect((await ping(at('2026-11-17T12:00:00Z'), { ...dayOnly, t: '2026-11-18' })).status).toBe(204);
    expect(await keysLike('day:')).toEqual(['day:2026-11-18', 'day:2026-11-18:ios']);
  });

  it('counts a ping without a date under the UTC date, as before', async () => {
    await ping(now, dayOnly);
    expect(await keysLike('day:')).toEqual(['day:2026-11-17', 'day:2026-11-17:ios']);
  });

  it('refuses a bad date with 400 and counts nothing', async () => {
    const bad = ['2026-11-15', '2026-11-19', '2026-02-30', '2026-11-1', '', 20261116, null];
    for (const [i, t] of bad.entries()) {
      expect((await ping(now, { ...good, t }, `8.8.8.${i}`)).status, String(t)).toBe(400);
    }
    expect((await ping(now, { ...good, x: '2026-11-16' }, '8.8.9.1')).status).toBe(400);
    expect((await ping(now, { ...good, t: '2026-11-16', x: 1 }, '8.8.9.2')).status).toBe(400);
    expect(await rows()).toEqual({});
  });

  it('a dry run with a date is validated and counts nothing', async () => {
    const dry = (t: unknown) =>
      handlePing(
        new Request('https://w.test/v1/ping', {
          method: 'POST',
          headers: { 'CF-Connecting-IP': '4.4.4.4', 'X-Dry-Run': '1' },
          body: JSON.stringify({ ...good, t }),
        }),
        env,
        now,
      );
    expect((await dry('2026-11-16')).status).toBe(204);
    expect((await dry('2026-11-10')).status).toBe(400);
    expect(await rows()).toEqual({});
  });
});

describe('ping counters around UTC midnight (no date sent)', () => {
  it('one second either side of midnight lands on different UTC days', async () => {
    const midnight = at('2026-11-14T00:00:00Z');
    expect((await ping(midnight - 1000, dayOnly, '1.1.1.1')).status).toBe(204);
    expect((await ping(midnight + 1000, dayOnly, '1.1.1.2')).status).toBe(204);
    expect(await keysLike('day:')).toEqual([
      'day:2026-11-13',
      'day:2026-11-13:ios',
      'day:2026-11-14',
      'day:2026-11-14:ios',
    ]);
  });

  it('at new year the ISO week key stays in 2026 while the month key rolls to 2027', async () => {
    const newYear = at('2027-01-01T00:00:00Z');
    expect((await ping(newYear - 1000, good, '2.2.2.1')).status).toBe(204);
    expect((await ping(newYear + 1000, good, '2.2.2.2')).status).toBe(204);
    expect(await keysLike('week:')).toEqual(['week:2026-W53', 'week:2026-W53:ios']);
    expect(await keysLike('month:')).toEqual([
      'month:2026-12',
      'month:2026-12:ios',
      'month:2027-01',
      'month:2027-01:ios',
    ]);
    const n = await rows();
    expect(n['week:2026-W53']).toBe(2);
    expect(n['month:2026-12']).toBe(1);
    expect(n['month:2027-01']).toBe(1);
    expect(n.installs).toBe(2);
  });
});

describe('stats windows', () => {
  it('builds 30 days, 12 ISO weeks and 12 months backwards across the year end', async () => {
    const s = await loadStats(env.DB, at('2027-01-02T12:00:00Z'));
    expect(s.today).toBe('2027-01-02');

    expect(s.days).toHaveLength(30);
    expect(s.days.slice(0, 3).map((r) => r.label)).toEqual(['2027-01-02', '2027-01-01', '2026-12-31']);
    expect(s.days[29].label).toBe('2026-12-04');

    expect(s.weeks.map((r) => r.label)).toEqual([
      '2026-W53',
      '2026-W52',
      '2026-W51',
      '2026-W50',
      '2026-W49',
      '2026-W48',
      '2026-W47',
      '2026-W46',
      '2026-W45',
      '2026-W44',
      '2026-W43',
      '2026-W42',
    ]);

    expect(s.months.map((r) => r.label)).toEqual([
      '2027-01',
      '2026-12',
      '2026-11',
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
      '2026-06',
      '2026-05',
      '2026-04',
      '2026-03',
      '2026-02',
    ]);

    expect(s.current.day.label).toBe('2027-01-02');
    expect(s.current.week.label).toBe('2026-W53');
    expect(s.current.month.label).toBe('2027-01');
  });

  it("a ping just before UTC midnight is in yesterday's row once the day rolls", async () => {
    const midnight = at('2026-11-14T00:00:00Z');
    expect((await ping(midnight - 1000, good)).status).toBe(204);
    const s = await loadStats(env.DB, midnight + 1000);
    expect(s.current.day).toEqual({ label: '2026-11-14', total: 0, ios: 0, android: 0, web: 0 });
    expect(s.days[1]).toEqual({ label: '2026-11-13', total: 1, ios: 1, android: 0, web: 0 });
    // Same ISO week and month, so the current rows still count it.
    expect(s.current.week).toMatchObject({ label: '2026-W46', total: 1, ios: 1 });
    expect(s.current.month).toMatchObject({ label: '2026-11', total: 1, ios: 1 });
  });
});

describe('/v1/word date edges', () => {
  it('rejects calendar dates that do not exist', async () => {
    for (const d of ['2027-02-29', '2026-04-31', '2026-00-10', '2026-12-32']) {
      const res = await word(d);
      expect(res.status, d).toBe(400);
      expect(await res.json(), d).toEqual({ error: 'date must be YYYY-MM-DD' });
    }
  });

  it('accepts a leap day', async () => {
    const res = await word('2028-02-29', at('2028-02-28T00:00:00Z'));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { date: string }).date).toBe('2028-02-29');
  });

  it('the latest allowed date follows the UTC+14 calendar, not UTC', () => {
    // At 10:00Z it is already the 14th at UTC+14, so one day of slack reaches the 15th.
    expect(latestAllowed(at('2026-11-13T10:00:00Z'))).toBe('2026-11-15');
    expect(latestAllowed(at('2026-11-13T09:59:59Z'))).toBe('2026-11-14');
  });
});
