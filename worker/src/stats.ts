import { addDays, dnum, isDateString, isoWeek, monthOf } from '../../app/src/game/dates';
import { puzzleNumber } from '../../app/src/game/daily';
import { errorResponse } from './http';

const PLATFORMS = ['ios', 'android', 'web'] as const;
const CACHE = 'private, max-age=300';
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

export interface Cell {
  date: string;
  n: number;
  level: 0 | 1 | 2 | 3 | 4;
  future?: true;
}

const TRY_KEYS = ['1', '2', '3', '4', '5', '6', 'x'] as const;

export interface Tries {
  date: string;
  counts: Record<(typeof TRY_KEYS)[number], number>;
  played: number;
  won: number;
  winRate: number;
}

export interface Stats {
  installs: number;
  today: string;
  puzzle: number;
  zone: string;
  zoneFallback: boolean;
  days: Row[];
  weeks: Row[];
  months: Row[];
  current: { day: Row; week: Row; month: Row };
  year: Cell[][]; // kept for /stats.json readers; `grid` is what /stats draws
  span: HeatSpan;
  grid: Cell[][];
  tries: Tries;
}

/** Heat level 0..4 for a count against the busiest day. */
export const heatLevel = (n: number, max: number): Cell['level'] =>
  n <= 0 || max <= 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((4 * n) / max))) as Cell['level']);

export type HeatSpan = 'week' | 'month' | 'year';

const mondayIndex = (d: string): number => (dnum(d) + 3) % 7; // 1970-01-01 was a Thursday; Monday is 0
const mondayOf = (d: string): string => addDays(d, -mondayIndex(d));

/** Days of history (today - firstDay + 1): under 14 -> week, under 70 -> month, else year. */
export function heatSpan(today: string, first: string | null): HeatSpan {
  if (!first || first > today) return 'week';
  const days = dnum(today) - dnum(first) + 1;
  return days < 14 ? 'week' : days < 70 ? 'month' : 'year';
}

/** Earliest date with a `day:<date>` count above 0; platform-suffixed keys don't count. */
export function firstDay(counts: Iterable<[string, number]>): string | null {
  let first: string | null = null;
  for (const [key, n] of counts) {
    const date = key.slice(4);
    if (key.startsWith('day:') && isDateString(date) && n > 0 && (first === null || date < first)) first = date;
  }
  return first;
}

/** Monday-first columns of 7 cells from `first`; cells after `today` are `future`. */
function buildGrid(today: string, first: string, columns: number, get: (key: string) => number): Cell[][] {
  const cells = Array.from({ length: columns * 7 }, (_, i) => {
    const date = addDays(first, i);
    const future = date > today;
    return { date, future, n: future ? 0 : get(`day:${date}`) };
  });
  const max = Math.max(0, ...cells.map((c) => c.n));
  return Array.from({ length: columns }, (_, c) =>
    cells.slice(c * 7, c * 7 + 7).map(({ date, n, future }): Cell => {
      const cell: Cell = { date, n, level: heatLevel(n, max) };
      if (future) cell.future = true;
      return cell;
    }),
  );
}

/** week: the ISO week holding today; month: the ISO weeks covering today's month; year: 53 weeks ending with today's. */
export function heatGrid(today: string, span: HeatSpan, get: (key: string) => number): Cell[][] {
  if (span === 'week') return buildGrid(today, mondayOf(today), 1, get);
  if (span === 'year') return buildGrid(today, addDays(mondayOf(today), -52 * 7), 53, get);
  const monthStart = `${monthOf(today)}-01`;
  // 31 days after the 1st is always in the next month; the day before its 1st ends this one.
  const monthEnd = addDays(`${monthOf(addDays(monthStart, 31))}-01`, -1);
  const first = mondayOf(monthStart);
  return buildGrid(today, first, (dnum(mondayOf(monthEnd)) - dnum(first)) / 7 + 1, get);
}

/** 53 ISO-week columns (Monday first); the last holds `today`, later cells are `future`. */
export const yearGrid = (today: string, get: (key: string) => number): Cell[][] => heatGrid(today, 'year', get);

export function triesSummary(date: string, get: (key: string) => number): Tries {
  const counts = Object.fromEntries(TRY_KEYS.map((g) => [g, get(`tries:${date}:${g}`)])) as Tries['counts'];
  const played = TRY_KEYS.reduce((a, g) => a + counts[g], 0);
  const won = played - counts.x;
  return { date, counts, played, won, winRate: played ? Math.round((100 * won) / played) : 0 };
}

export interface ViewerDay {
  today: string;
  zone: string;
  fallback: boolean;
}

const ZONE_ID = /^[A-Za-z0-9_+\-/]{1,64}$/;

/** The viewer's local date, which picks the puzzle the page shows; any bad or missing zone gives UTC. Never throws. */
export function viewerDay(now: number, zone: unknown): ViewerDay {
  try {
    if (typeof zone !== 'string' || !ZONE_ID.test(zone)) throw new Error('bad zone');
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    if (!isDateString(today)) throw new Error('bad date');
    return { today, zone, fallback: false };
  } catch {
    return { today: new Date(now).toISOString().slice(0, 10), zone: 'UTC', fallback: true };
  }
}

export async function loadStats(db: D1Database, now: number, zone?: unknown): Promise<Stats> {
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

  const { today, zone: zoneId, fallback } = viewerDay(now, zone);
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, -i));
  const weeks = [...new Set(Array.from({ length: 12 }, (_, i) => isoWeek(addDays(today, -7 * i))))];
  const monthSet: string[] = [];
  for (let i = 0; monthSet.length < 12; i++) {
    const m = monthOf(addDays(today, -i));
    if (!monthSet.includes(m)) monthSet.push(m);
  }

  const year = yearGrid(today, get);
  const span = heatSpan(today, firstDay(counts));

  return {
    installs: get('installs'),
    today,
    puzzle: puzzleNumber(today),
    zone: zoneId,
    zoneFallback: fallback,
    days: days.map((d) => row(d, `day:${d}`)),
    weeks: weeks.map((w) => row(w, `week:${w}`)),
    months: monthSet.map((m) => row(m, `month:${m}`)),
    current: {
      day: row(today, `day:${today}`),
      week: row(isoWeek(today), `week:${isoWeek(today)}`),
      month: row(monthOf(today), `month:${monthOf(today)}`),
    },
    year,
    span,
    grid: span === 'year' ? year : heatGrid(today, span, get),
    tries: triesSummary(today, get),
  };
}

const esc = (v: string | number): string =>
  String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "Thu, Nov 12" for a YYYY-MM-DD date. */
const dayLabel = (date: string): string => {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return `${DAYS[dow]}, ${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;
};
const PLATFORM_NAMES = { ios: 'iOS', android: 'Android', web: 'Web' } as const;

const cellTitle = (c: Cell, row: number): string => {
  const [, m, d] = c.date.split('-').map(Number);
  return `${DAYS[row]}, ${MONTHS[m - 1]} ${d}: ${c.n} ${c.n === 1 ? 'player' : 'players'}`;
};

const stat = (n: number, label: string): string =>
  `<div class="plate"><div class="num">${esc(n)}</div><div class="lbl">${esc(label)}</div></div>`;

const WEEKDAYS = 'MTWTFSS';
const HEADINGS: Record<HeatSpan, string> = {
  week: 'A week of breakfasts',
  month: 'A month of breakfasts',
  year: 'A year of breakfasts',
};

/** One heat cell; `body` goes inside it (the week view shows the count). */
const heatCell = (c: Cell, r: number, today: string, body = ''): string =>
  c.future
    ? '<i class="cell fut"></i>'
    : `<i class="cell l${c.level}${c.date === today ? ' today' : ''}" title="${esc(cellTitle(c, r))}">${body}</i>`;

const yearHeat = (grid: Cell[][], today: string): string => {
  const cols = grid
    .map((col) => {
      // A month starts in this column if its first day falls here.
      const first = col.find((c) => !c.future && c.date.endsWith('-01'));
      const label = first ? MONTHS[Number(first.date.slice(5, 7)) - 1][0] : '';
      const cells = col.map((c, r) => heatCell(c, r, today)).join('');
      return `<div class="col"><span class="mo">${esc(label)}</span>${cells}</div>`;
    })
    .join('');
  return `<div class="scroll"><div class="heat">${cols}</div></div>`;
};

/** Week columns laid out row by row, a weekday letter starting each row. */
const monthHeat = (grid: Cell[][], today: string): string => {
  const rows = [...WEEKDAYS]
    .map((d, r) => `<span class="wd">${d}</span>${grid.map((col) => heatCell(col[r], r, today)).join('')}`)
    .join('');
  return `<div class="month" style="grid-template-columns:auto repeat(${grid.length},1fr)">${rows}</div>`;
};

const weekHeat = ([col]: Cell[][], today: string): string =>
  `<div class="week">${col
    .map((c, r) => `<div><span class="wd">${WEEKDAYS[r]}</span>${heatCell(c, r, today, esc(c.n))}</div>`)
    .join('')}</div>`;

const heatmap = (span: HeatSpan, grid: Cell[][], today: string): string => {
  const body = { week: weekHeat, month: monthHeat, year: yearHeat }[span](grid, today);
  const legend = [0, 1, 2, 3, 4].map((l) => `<i class="cell l${l}"></i>`).join('');
  return `${body}<div class="legend">Less ${legend} More</div>`;
};

const triesBars = (t: Tries, puzzle: number): string => {
  const max = Math.max(...TRY_KEYS.map((g) => t.counts[g]));
  const rows = TRY_KEYS.map((g) => {
    const n = t.counts[g];
    const width = max ? Math.max(10, Math.round((100 * n) / max)) : 10;
    return `<div class="trow"><span class="g">${g === 'x' ? 'X' : g}</span><span class="bar${
      n > 0 && n === max ? ' top' : ''
    }" style="width:${width}%">${esc(n)}</span></div>`;
  }).join('');
  const line = t.played
    ? `${esc(t.played)} finished &middot; ${esc(t.winRate)}% won`
    : `Nobody has finished #${esc(puzzle)} yet.`;
  return `${rows}<p class="muted">${line}</p>`;
};

const platformBar = (title: string, r: Row): string => {
  const total = PLATFORMS.reduce((a, p) => a + r[p], 0);
  const body = total
    ? `<div class="stack">${PLATFORMS.map((p) =>
        r[p] ? `<span class="seg ${p}" style="flex:${r[p]}"></span>` : '',
      ).join('')}</div><div class="plegend">${PLATFORMS.map(
        (p) => `<span><i class="dot ${p}"></i>${PLATFORM_NAMES[p]} ${esc(r[p])}</span>`,
      ).join('')}</div>`
    : '<div class="muted">Nobody yet.</div>';
  return `<div class="prow"><b>${esc(title)}</b>${body}</div>`;
};

const CSS = `
:root{--on3:var(--ink);--on4:#fff;--table:#e6edf8;--check:rgba(62,104,178,.09);--ink:#2b1a10;--muted:#6c5a4f;--plate:#fff;--line:#d3dbea;--waffle:#e2a23e;--syrup:#8a4513;--berry:#3d4fb3;--hit:#3c9a57;--onBerry:#fff;--l1:#f7e6bb;--l2:#ffe37a;--l3:#e2a23e;--l4:#8a4513}
@media (prefers-color-scheme:dark){:root{--on3:#2b1a10;--on4:#2b1a10;--table:#171b30;--check:rgba(255,255,255,.035);--ink:#f7eddb;--muted:#b5ab9b;--plate:#232946;--line:#363e63;--syrup:#eab56c;--berry:#9aa8ff;--hit:#48a864;--onBerry:#141831;--l1:#4a4460;--l2:#8a6d2c;--l3:#d69a3c;--l4:#ffe37a}}
*{box-sizing:border-box}
body{margin:0;padding:16px;color:var(--ink);font:16px/1.5 system-ui,sans-serif;background-color:var(--table);background-image:repeating-linear-gradient(0deg,var(--check) 0 22px,transparent 22px 44px),repeating-linear-gradient(90deg,var(--check) 0 22px,transparent 22px 44px)}
main{max-width:680px;margin:0 auto}
h1,h2,.num{font-family:ui-rounded,"SF Pro Rounded",system-ui,sans-serif;font-weight:800;color:var(--syrup)}
h1{font-size:2rem;margin:8px 0 4px}
h2{font-size:1.2rem;margin:0 0 10px}
header p{margin:0 0 16px;color:var(--muted)}
.puzzle{font-family:ui-rounded,"SF Pro Rounded",system-ui,sans-serif;font-weight:800;font-size:1.25rem;color:var(--ink)}
.plate{background:var(--plate);border-radius:16px;box-shadow:0 2px 10px rgba(43,26,16,.12);padding:16px;margin:0 0 16px}
.plates{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:0 0 16px}
@media (min-width:560px){.plates{grid-template-columns:repeat(4,1fr)}}
.plates .plate{margin:0;text-align:center;padding:12px 8px}
.num{font-size:2rem;line-height:1.1}
.lbl,.muted{color:var(--muted);font-size:.9rem}
.scroll{overflow-x:auto;direction:rtl;padding-bottom:6px}
.heat{direction:ltr;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(9px,1fr);gap:2px;min-width:max-content;width:100%}
.col{display:grid;grid-template-rows:14px;grid-auto-rows:auto;gap:2px;min-width:9px}
.mo{font-size:10px;line-height:14px;color:var(--muted);white-space:nowrap;width:0;overflow:visible}
.cell{display:block;width:100%;aspect-ratio:1;border-radius:2px;background:var(--line)}
.cell.l1{background:var(--l1)}.cell.l2{background:var(--l2)}.cell.l3{background:var(--l3)}.cell.l4{background:var(--l4)}
.cell.fut{background:none}
.month{display:grid;gap:4px;align-items:center;max-width:360px}
.month .cell{border-radius:4px}
.week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;max-width:440px;text-align:center}
.wd{font-size:.75rem;color:var(--muted);font-weight:700}
.week .cell{display:flex;align-items:center;justify-content:center;border-radius:10px;margin-top:2px;font-weight:800;font-size:1.05rem;font-style:normal;color:var(--ink)}
.week .cell.l3{color:var(--on3)}.week .cell.l4{color:var(--on4)}
.month .cell.fut,.week .cell.fut{border:2px dashed var(--line)}
.month .today,.week .today{outline:2px solid var(--berry);outline-offset:2px}
.legend{display:flex;gap:3px;align-items:center;justify-content:flex-end;font-size:.8rem;color:var(--muted);margin-top:6px}
.legend .cell{display:inline-block;width:11px;height:11px;margin:0 1px}
.trow{display:flex;align-items:center;gap:8px;margin:4px 0}
.g{width:1em;font-weight:800;color:var(--syrup);text-align:center}
.bar{display:block;background:var(--berry);color:var(--onBerry);border-radius:8px;padding:2px 8px;font-weight:700;font-size:.9rem;min-width:2.2em}
.bar.top{background:var(--hit);color:#fff}
.prow{margin:0 0 14px}
.stack{display:flex;height:18px;border-radius:9px;overflow:hidden;margin:6px 0;background:var(--line)}
.seg.ios,.dot.ios{background:var(--berry)}.seg.android,.dot.android{background:var(--waffle)}.seg.web,.dot.web{background:var(--hit)}
.plegend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.9rem;color:var(--muted)}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px}
p{margin:0 0 8px}ul{margin:0 0 8px;padding-left:20px}li{margin:0 0 6px}
a{color:var(--berry)}
`;

const puzzleLine = (s: Stats): string =>
  `<p class="puzzle">Puzzle #${esc(s.puzzle)} &middot; ${esc(dayLabel(s.today))}</p>`;

export function renderHtml(s: Stats): string {
  const c = s.current;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Words &amp; Waffles stats</title>
<style>${CSS}</style></head><body><main>
<header><h1>Words &amp; Waffles stats</h1><p>Who is eating breakfast, counted without knowing who.</p>${puzzleLine(s)}</header>
<div class="plates">${stat(c.day.total, `played #${s.puzzle}`)}${stat(c.week.total, 'this week')}${stat(c.month.total, 'this month')}${stat(s.installs, 'installs')}</div>
<section class="plate"><h2>${HEADINGS[s.span]}</h2>${heatmap(s.span, s.grid, s.today)}</section>
<section class="plate"><h2>How #${esc(s.puzzle)} went</h2>${triesBars(s.tries, s.puzzle)}</section>
<section class="plate"><h2>Where people play</h2>${platformBar(`Puzzle #${s.puzzle}`, c.day)}${platformBar('This month', c.month)}</section>
<section class="plate"><h2>What we count</h2>
<p>Two things, nothing else:</p>
<ul>
<li>At most one tiny ping a day: whether it is the first open of the day, week and month, whether it is a first install, whether it runs on iOS, Android or the web, and the player's date, which says which puzzle they are on.</li>
<li>When you finish the daily word: the date and how many tries it took (or that it got away).</li>
</ul>
<p>The server only adds one to a few counters. No identifier is sent or stored: no cookies, no request logs, no IP address and no user agent. This page uses your connection's time zone only to pick which puzzle to show, and keeps nothing. Both counts can be turned off in the app's Stats tab.</p></section>
<section class="plate"><h2>Honest limits</h2>
<ul>
<li>Counts are per device or browser, not per person.</li>
<li>A cleared browser counts again as a new install.</li>
<li>Anyone can send fake counts, so treat the numbers as rough.</li>
</ul></section>
<p><a href="${PRIVACY_URL}">Read the full privacy notes</a></p>
</main></body></html>`;
}

const viewerZone = (request: Request): unknown => (request as { cf?: { timezone?: unknown } }).cf?.timezone;

export async function handleStats(request: Request, env: Cloudflare.Env, now: number = Date.now()): Promise<Response> {
  try {
    const html = renderHtml(await loadStats(env.DB, now, viewerZone(request)));
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

export async function handleStatsJson(request: Request, env: Cloudflare.Env, now: number = Date.now()): Promise<Response> {
  try {
    return new Response(JSON.stringify(await loadStats(env.DB, now, viewerZone(request))), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': CACHE },
    });
  } catch {
    return errorResponse(500, 'server error');
  }
}
