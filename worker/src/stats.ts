import { addDays, isoWeek, monthOf } from '../../app/src/game/dates';
import { errorResponse } from './http';

const PLATFORMS = ['ios', 'android', 'web'] as const;
const CACHE = 'public, max-age=300';
export const STATS_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PRIVACY_URL = 'https://github.com/mjohnson139/words-and-waffles/blob/main/PRIVACY.md';

export interface Row {
  label: string;
  total: number;
  ios: number;
  android: number;
  web: number;
}

export interface Stats {
  installs: number;
  today: string;
  days: Row[];
  weeks: Row[];
  months: Row[];
  current: { day: Row; week: Row; month: Row };
}

export async function loadStats(db: D1Database, now: number): Promise<Stats> {
  const { results } = await db.prepare('SELECT key, n FROM counts').all<{ key: string; n: number }>();
  const counts = new Map(results.map((r) => [r.key, r.n]));
  const get = (k: string) => counts.get(k) ?? 0;
  const row = (label: string, base: string): Row => ({
    label,
    total: get(base),
    ios: get(`${base}:ios`),
    android: get(`${base}:android`),
    web: get(`${base}:web`),
  });

  const today = new Date(now).toISOString().slice(0, 10);
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, -i));
  const weeks = [...new Set(Array.from({ length: 12 }, (_, i) => isoWeek(addDays(today, -7 * i))))];
  const monthSet: string[] = [];
  for (let i = 0; monthSet.length < 12; i++) {
    const m = monthOf(addDays(today, -i));
    if (!monthSet.includes(m)) monthSet.push(m);
  }

  return {
    installs: get('installs'),
    today,
    days: days.map((d) => row(d, `day:${d}`)),
    weeks: weeks.map((w) => row(w, `week:${w}`)),
    months: monthSet.map((m) => row(m, `month:${m}`)),
    current: {
      day: row(today, `day:${today}`),
      week: row(isoWeek(today), `week:${isoWeek(today)}`),
      month: row(monthOf(today), `month:${monthOf(today)}`),
    },
  };
}

const esc = (v: string | number): string =>
  String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const table = (title: string, rows: Row[]): string =>
  `<h2>${esc(title)}</h2><table><thead><tr><th>Period</th><th>Players</th>${PLATFORMS.map(
    (p) => `<th>${esc(p)}</th>`,
  ).join('')}</tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr><td>${esc(r.label)}</td><td>${esc(r.total)}</td>${PLATFORMS.map(
          (p) => `<td>${esc(r[p])}</td>`,
        ).join('')}</tr>`,
    )
    .join('')}</tbody></table>`;

const split = (title: string, r: Row): string =>
  `<li><strong>${esc(title)}</strong> (${esc(r.label)}): ${PLATFORMS.map(
    (p) => `${esc(p)} ${esc(r[p])}`,
  ).join(', ')}</li>`;

export function renderHtml(s: Stats): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Words &amp; Waffles stats</title>
<style>
:root{--syrup:#8a4513;--berry:#3d4fb3;--waffle:#e2a23e;--table:#e6edf8;--bg:#e6edf8;--card:#fff;--ink:#2b2118;--line:#d3dcee}
@media (prefers-color-scheme:dark){:root{--bg:#14161f;--card:#1e2130;--ink:#f1e9dc;--line:#33384d;--syrup:#e2a23e;--berry:#8fa0f5}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:640px;margin:0 auto}
h1{color:var(--syrup);margin:.5em 0 .2em}
h2{color:var(--berry);margin:1.5em 0 .4em;font-size:1.1rem}
.big{font-size:2.2rem;font-weight:700;color:var(--waffle)}
table{width:100%;border-collapse:collapse;background:var(--card);border-radius:8px}
th,td{padding:6px 10px;text-align:right;border-bottom:1px solid var(--line)}
th:first-child,td:first-child{text-align:left}
a{color:var(--berry)}
</style></head><body><main>
<h1>Words &amp; Waffles stats</h1>
<p>Total installs</p><div class="big">${esc(s.installs)}</div>
${table('Daily players, last 30 days', s.days)}
${table('Weekly players, last 12 weeks', s.weeks)}
${table('Monthly players, last 12 months', s.months)}
<h2>Platform split now</h2>
<ul>${split('Today', s.current.day)}${split('This week', s.current.week)}${split('This month', s.current.month)}</ul>
<h2>What we count</h2>
<p>The app sends at most one tiny ping per day saying whether it is the first open of the day, week and month, whether it is a first install, and whether it runs on iOS, Android or the web. The server only adds one to a few counters. No identifier is sent or stored: no cookies, no request logs, no IP address and no user agent.</p>
<h2>Honest limits</h2>
<ul>
<li>Counts are per device or browser, not per person.</li>
<li>A cleared browser counts again as a new install.</li>
<li>Anyone can send fake pings, so treat the numbers as rough.</li>
</ul>
<p><a href="${PRIVACY_URL}">Read the full privacy notes</a></p>
</main></body></html>`;
}

export async function handleStats(env: Cloudflare.Env, now: number = Date.now()): Promise<Response> {
  try {
    const html = renderHtml(await loadStats(env.DB, now));
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': CACHE,
        'Content-Security-Policy': STATS_CSP,
      },
    });
  } catch {
    return errorResponse(500, 'server error');
  }
}

export async function handleStatsJson(env: Cloudflare.Env, now: number = Date.now()): Promise<Response> {
  try {
    return new Response(JSON.stringify(await loadStats(env.DB, now)), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': CACHE },
    });
  } catch {
    return errorResponse(500, 'server error');
  }
}
