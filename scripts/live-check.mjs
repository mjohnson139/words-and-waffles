#!/usr/bin/env node
// Proves the five "Done means" items against the deployed site and Worker.
// Usage: npm run live-check   (SITE_URL, WORKER_URL override the defaults; SHOW_WORD=1 prints the word)
// Each run lets exactly one ping reach production (the request audit), so it counts one install on /stats.
// Every other browser context aborts its ping. @playwright/test comes from the app workspace (hoisted).
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium, expect } from '@playwright/test';

const SITE = (process.env.SITE_URL || 'https://words-and-waffles.pages.dev').replace(/\/$/, '');
const WORKER = (process.env.WORKER_URL || 'https://words-and-waffles.mjohnson139.workers.dev').replace(/\/$/, '');
const ALLOWED = new Set([new URL(SITE).host, new URL(WORKER).host]);
const OUT = fileURLToPath(new URL('../app/e2e/artifacts/live/', import.meta.url));
const BUDGET_KB = 500;
// WIN[n] in app/src/game/play.ts, for a win in n guesses.
const WIN1 = 'Hole in one! Did you peek at the batter?';
const WIN2 = 'Two bites. Showing off before coffee.';
mkdirSync(OUT, { recursive: true });

let failed = 0;
const proved = new Set();
async function check(name, proves, fn) {
  try {
    const detail = await fn();
    console.log(`ok  ${name}: ${detail}`);
    if (proves) proved.add(proves);
    return true;
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}: ${String(e?.message ?? e).split('\n').slice(0, 4).join(' | ')}`);
    return false;
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = new Date();
const later = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
const getWord = (date) => fetch(`${WORKER}/v1/word?date=${date}`);
// The word contract in README.md: cells[i] = hex(sha256(salt + "|" + i + "|" + letter)).slice(0, 16).
const cell = (salt, i, c) => createHash('sha256').update(`${salt}|${i}|${c}`).digest('hex').slice(0, 16);
const encode = (word, salt) => [...word].map((c, i) => cell(salt, i, c));
const decode = (salt, cells) =>
  cells
    .map((x, i) => {
      const hit = [...'abcdefghijklmnopqrstuvwxyz'].find((c) => cell(salt, i, c) === x);
      assert(hit, `position ${i} did not decode`);
      return hit;
    })
    .join('');

const hosts = (reqs) => [...new Set(reqs.map((r) => new URL(r.url).host))];
const watch = (page) => {
  const reqs = [];
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) reqs.push({ url: r.url(), method: r.method(), body: r.postData() });
  });
  return reqs;
};
const onlyAllowed = (reqs) => {
  const bad = hosts(reqs).filter((h) => !ALLOWED.has(h));
  assert(bad.length === 0, `requests to other hosts: ${bad.join(', ')}`);
};
const wordReqs = (reqs) => reqs.filter((r) => r.url.startsWith(`${WORKER}/v1/word`));
const pingPosts = (reqs) => reqs.filter((r) => r.method === 'POST' && r.url.startsWith(`${WORKER}/v1/ping`));
const button = (page, name) => page.getByRole('button', { name, exact: true });
const VIEW = { viewport: { width: 390, height: 844 }, locale: 'en-US' };
async function quietContext(browser) {
  // A fresh context is a new install; keep it off the public counters.
  const ctx = await browser.newContext(VIEW);
  await ctx.route(`${WORKER}/v1/ping`, (r) => r.abort());
  return ctx;
}
async function openApp(page) {
  await page.goto(SITE + '/');
  await expect(button(page, 'Enter')).toBeVisible();
}
async function guess(page, word) {
  for (const ch of word) await button(page, ch).click();
  await button(page, 'Enter').click();
}

let answer = '';
let puzzle = 0;

async function workerChecks() {
  await check('worker /stats page', null, async () => {
    const r = await fetch(`${WORKER}/stats`);
    const body = await r.text();
    assert(r.status === 200, `status ${r.status}`);
    assert((r.headers.get('content-type') || '').includes('text/html'), 'not text/html');
    assert(r.headers.has('content-security-policy'), 'no content-security-policy header');
    assert(body.includes('What we count'), 'missing "What we count"');
    assert(!body.includes('<script'), 'page contains <script');
    return 'html, CSP set, no script';
  });
  await check('worker /stats.json', null, async () => {
    const j = await (await fetch(`${WORKER}/stats.json`)).json();
    assert(typeof j.installs === 'number', 'installs not a number');
    assert(j.days?.length === 30 && j.weeks?.length === 12 && j.months?.length === 12, 'window lengths wrong');
    return `installs ${j.installs}, 30 days, 12 weeks, 12 months`;
  });
  await check('worker /v1/word', null, async () => {
    const date = ymd(today);
    const r = await getWord(date);
    assert(r.status === 200, `status ${r.status}`);
    const j = await r.json();
    assert(j.v === 1 && j.date === date && j.len === 5 && j.cells?.length === 5, 'unexpected payload shape');
    answer = decode(j.salt, j.cells);
    puzzle = j.puzzle;
    return `puzzle #${j.puzzle}, ${answer.length} letters decoded${process.env.SHOW_WORD === '1' ? ` (${answer})` : ''}`;
  });
  await check('worker rejects a future date', null, async () => {
    const r = await getWord(ymd(later));
    assert(r.status === 400, `status ${r.status}`);
    return 'status 400';
  });
  await check('worker ping preflight', null, async () => {
    const r = await fetch(`${WORKER}/v1/ping`, { method: 'OPTIONS', headers: { origin: SITE, 'access-control-request-method': 'POST' } });
    assert(r.status === 204, `status ${r.status}`);
    assert(r.headers.get('access-control-allow-origin') === '*', 'allow-origin is not *');
    return 'status 204, allow-origin *';
  });
}

async function bundleCheck() {
  await check('bundle budget', 'bundle', async () => {
    // Same measure as scripts/bundle-size.mjs on the local export: gzip of the html, js and css.
    const r = await fetch(SITE + '/');
    assert(r.status === 200, `status ${r.status}`);
    const html = await r.text();
    const assets = [...new Set(html.match(/\/?_expo\/static\/(?:js|css)\/[^"']+?\.(?:js|css)/g) ?? [])];
    assert(assets.some((a) => a.endsWith('.js')), 'no web bundle script in the HTML');
    let total = gzipSync(Buffer.from(html)).length;
    for (const a of assets) total += gzipSync(Buffer.from(await (await fetch(`${SITE}/${a.replace(/^\//, '')}`)).arrayBuffer())).length;
    const kb = total / 1024;
    assert(kb <= BUDGET_KB, `${kb.toFixed(1)} KB gzip is over ${BUDGET_KB} KB`);
    return `${kb.toFixed(1)} KB gzip (html + ${assets.length} asset${assets.length === 1 ? '' : 's'}) of ${BUDGET_KB} KB`;
  });
}

async function playAuditOffline(browser) {
  const context = await browser.newContext(VIEW);
  const page = await context.newPage();
  const reqs = watch(page);
  const pingStatus = [];
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && r.url().startsWith(`${WORKER}/v1/ping`)) pingStatus.push(r.status());
  });
  const ready = await check('play: open the live app', null, async () => {
    assert(answer, 'no decoded word (worker check failed)');
    await openApp(page);
    await expect.poll(() => wordReqs(reqs).length).toBeGreaterThanOrEqual(1);
    return 'Enter key visible, word requested';
  });
  if (!ready) return context.close();

  await check('play: the served word wins', null, async () => {
    await guess(page, answer === 'crane' ? 'about' : 'crane');
    await page.waitForTimeout(1800);
    await guess(page, answer);
    await expect(page.getByText(WIN2)).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'play-won.png' });
    return 'won in 2 on the decoded word, screenshot saved';
  });
  await check('play: request audit', 'requests', async () => {
    await expect.poll(() => pingStatus.length, { timeout: 10_000 }).toBe(1);
    onlyAllowed(reqs);
    const words = wordReqs(reqs).length;
    const pings = pingPosts(reqs);
    assert(words === 1, `${words} word requests, expected 1`);
    assert(pings.length === 1, `${pings.length} pings, expected 1`);
    assert(pingStatus[0] >= 200 && pingStatus[0] < 300, `ping answered ${pingStatus[0]}`);
    const body = JSON.parse(pings[0].body ?? '{}');
    assert(Object.keys(body).sort().join() === 'd,m,n,p,w', `ping keys ${Object.keys(body).sort().join()}`);
    assert(body.p === 'web' && ['d', 'w', 'm', 'n'].every((k) => typeof body[k] === 'boolean'), 'ping values not as specified');
    return `1 word request, 1 ping (${pingStatus[0]}, keys d m n p w), hosts ${hosts(reqs).join(' + ')}`;
  });

  await check('offline cold start to a playable board', 'offline', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const keys = await (await caches.open('waffles-v1')).keys();
            const urls = keys.map((k) => new URL(k.url).pathname);
            return urls.includes('/') && urls.some((u) => u.endsWith('.ttf')) && urls.some((u) => u.startsWith('/_expo/static/js/'));
          }),
        { timeout: 15_000 },
      )
      .toBe(true);
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByText('The word was')).toBeVisible();
      // Today's game is finished, so prove the board still plays: start Seconds and take a guess.
      await button(page, 'Seconds').click();
      await expect(button(page, 'Enter')).toBeVisible();
      await guess(page, answer === 'crane' ? 'about' : 'crane');
      await page.waitForTimeout(1800);
      const rows = await page.evaluate(() => document.body.innerText.toLowerCase().replace(/\s/g, ''));
      assert(rows.includes(answer === 'crane' ? 'about' : 'crane'), 'offline guess did not land on the board');
    } finally {
      await context.setOffline(false);
    }
    return 'cache filled; offline reload shows today, and a Seconds guess lands on the board';
  });

  await check('backup restores on another device', 'backup', async () => {
    await page.getByRole('tab', { name: 'Stats' }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'Back up').click()]);
    const file = OUT + 'backup.json';
    await download.saveAs(file);
    const fresh = await quietContext(browser);
    try {
      const page2 = await fresh.newPage();
      const reqs2 = watch(page2);
      await page2.goto(SITE + '/#stats');
      await expect(page2.getByLabel('0 played')).toBeVisible();
      const chooser = page2.waitForEvent('filechooser');
      await button(page2, 'Restore').click();
      await (await chooser).setFiles(file);
      await expect(page2.getByText(/Restored: \d+ new/)).toBeVisible();
      await expect(page2.getByLabel(/^[1-9]\d* played$/)).toBeVisible();
      await page2.screenshot({ path: OUT + 'stats-restored.png' });
      onlyAllowed(reqs2);
    } finally {
      await fresh.close();
    }
    return 'fresh context restored the games and the played count; hosts allowed';
  });
  await context.close();
}

async function endpointSwap(browser) {
  await check('endpoint swap changes the word', 'endpoint', async () => {
    // Serve a different word from the same endpoint URL. The bundled fallback would still
    // be today's list word, so winning on this one proves the app plays what the endpoint says.
    const other = answer === 'crane' ? 'plumb' : 'crane';
    const ctx = await quietContext(browser);
    try {
      await ctx.route(`${WORKER}/v1/word*`, (route) => {
        const date = new URL(route.request().url()).searchParams.get('date');
        const salt = randomBytes(16).toString('hex');
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ v: 1, date, puzzle, len: 5, salt, cells: encode(other, salt) }),
        });
      });
      const page = await ctx.newPage();
      const reqs = watch(page);
      await openApp(page);
      await expect.poll(() => wordReqs(reqs).length).toBe(1);
      await guess(page, other);
      await expect(page.getByText(WIN1)).toBeVisible();
      onlyAllowed(reqs);
    } finally {
      await ctx.close();
    }
    return 'a substituted word from the endpoint won in 1, not the bundled word';
  });
}

await workerChecks();
await bundleCheck();
let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  failed++;
  console.log(`FAIL browser launch: ${String(e?.message ?? e).split('\n')[0]}`);
  console.log('run: npx -w app playwright install chromium');
}
if (browser) {
  try {
    await playAuditOffline(browser);
    if (answer) await endpointSwap(browser);
  } finally {
    await browser.close();
  }
}

const doneMeans = [
  ['offline', 'cold start to a playable board offline, after one visit'],
  ['requests', 'two requests a day, both to our domain'],
  ['endpoint', 'swapping the word endpoint changes the word'],
  ['bundle', 'web bundle under 500 KB gzipped'],
  ['backup', 'a backup from one device restores on another'],
];
console.log('\nDone means:');
for (const [key, label] of doneMeans) console.log(`${proved.has(key) ? 'ok  ' : 'FAIL'} ${label}`);
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
