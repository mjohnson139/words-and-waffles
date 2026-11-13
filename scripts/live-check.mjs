#!/usr/bin/env node
// Proves the five "Done means" items against the deployed site and Worker.
// Usage: npm run live-check   (SITE_URL, WORKER_URL override the defaults; SHOW_WORD=1 prints the word)
// Note: the played game lets the app send its one daily ping to production; that counts one install.
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium, expect } from '@playwright/test';

const SITE = (process.env.SITE_URL || 'https://words-and-waffles.pages.dev').replace(/\/$/, '');
const WORKER = (process.env.WORKER_URL || 'https://words-and-waffles.mjohnson139.workers.dev').replace(/\/$/, '');
const ALLOWED = new Set([new URL(SITE).host, new URL(WORKER).host]);
const OUT = fileURLToPath(new URL('../app/e2e/artifacts/live/', import.meta.url));
const BUDGET_KB = 500;
const WIN = 'Two bites. Showing off before coffee.'; // WIN[2] in app/src/game/play.ts
mkdirSync(OUT, { recursive: true });

let failed = 0;
const done = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
async function check(name, n, fn) {
  try {
    const detail = await fn();
    console.log(`ok  ${name}: ${detail}`);
    if (n) done[n] = true;
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
const decode = (salt, cells) =>
  cells.map((cell, i) => {
    const hit = [...'abcdefghijklmnopqrstuvwxyz'].find(
      (c) => createHash('sha256').update(`${salt}|${i}|${c}`).digest('hex').slice(0, 16) === cell,
    );
    assert(hit, `position ${i} did not decode`);
    return hit;
  }).join('');

const hosts = (reqs) => [...new Set(reqs.map((r) => new URL(r.url).host))];
const watch = (page) => {
  const reqs = [];
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) reqs.push({ url: r.url(), method: r.method() });
  });
  return reqs;
};
const onlyAllowed = (reqs) => {
  const bad = hosts(reqs).filter((h) => !ALLOWED.has(h));
  assert(bad.length === 0, `requests to other hosts: ${bad.join(', ')}`);
};
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function openApp(page) {
  await page.goto(SITE + '/');
  await expect(button(page, 'Enter')).toBeVisible();
}
async function guess(page, word) {
  for (const ch of word) await button(page, ch).click();
  await button(page, 'Enter').click();
}

let answer = '';

async function workerChecks() {
  await check('worker /stats page', 1, async () => {
    const r = await fetch(`${WORKER}/stats`);
    const body = await r.text();
    assert(r.status === 200, `status ${r.status}`);
    assert((r.headers.get('content-type') || '').includes('text/html'), 'not text/html');
    assert(r.headers.has('content-security-policy'), 'no content-security-policy header');
    assert(body.includes('What we count'), 'missing "What we count"');
    assert(!body.includes('<script'), 'page contains <script');
    return 'html, CSP set, no script';
  });
  await check('worker /stats.json', 0, async () => {
    const j = await (await fetch(`${WORKER}/stats.json`)).json();
    assert(typeof j.installs === 'number', 'installs not a number');
    assert(j.days?.length === 30 && j.weeks?.length === 12 && j.months?.length === 12, 'window lengths wrong');
    return `installs ${j.installs}, 30 days, 12 weeks, 12 months`;
  });
  await check('worker /v1/word', 0, async () => {
    const date = ymd(today);
    const r = await getWord(date);
    assert(r.status === 200, `status ${r.status}`);
    const j = await r.json();
    assert(j.v === 1 && j.date === date && j.len === 5 && j.cells?.length === 5, 'unexpected payload shape');
    answer = decode(j.salt, j.cells);
    return `puzzle #${j.puzzle}, ${answer.length} letters decoded${process.env.SHOW_WORD === '1' ? ` (${answer})` : ''}`;
  });
  await check('worker rejects a future date', 0, async () => {
    const r = await getWord(ymd(later));
    assert(r.status === 400, `status ${r.status}`);
    return 'status 400';
  });
  await check('worker ping preflight', 0, async () => {
    const r = await fetch(`${WORKER}/v1/ping`, { method: 'OPTIONS', headers: { origin: SITE, 'access-control-request-method': 'POST' } });
    assert(r.status === 204, `status ${r.status}`);
    assert(r.headers.get('access-control-allow-origin') === '*', 'allow-origin is not *');
    return 'status 204, allow-origin *';
  });
}

async function bundleCheck() {
  await check('bundle budget', 2, async () => {
    const r = await fetch(SITE + '/');
    assert(r.status === 200, `status ${r.status}`);
    const src = (await r.text()).match(/_expo\/static\/js\/web\/[^"']+?\.js/)?.[0];
    assert(src, 'no web bundle script in the HTML');
    const js = Buffer.from(await (await fetch(`${SITE}/${src}`)).arrayBuffer());
    const kb = gzipSync(js, { level: 9 }).length / 1024;
    assert(kb <= BUDGET_KB, `${kb.toFixed(1)} KB gzip is over ${BUDGET_KB} KB`);
    return `${kb.toFixed(1)} KB gzip of ${BUDGET_KB} KB (main JS only; bundle-size.mjs sums js+css+html)`;
  });
}

async function playAndOffline(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const page = await context.newPage();
  const reqs = watch(page);
  const ready = await check('play: open the live app', 0, async () => {
    assert(answer, 'no decoded word (worker check failed)');
    await openApp(page);
    await expect.poll(() => reqs.filter((r) => r.url.startsWith(`${WORKER}/v1/word`)).length).toBeGreaterThanOrEqual(1);
    return 'Enter key visible, word requested';
  });
  if (!ready) return context.close();

  await check('play: endpoint word wins', 3, async () => {
    await guess(page, answer === 'crane' ? 'about' : 'crane');
    await page.waitForTimeout(1800);
    await guess(page, answer);
    await expect(page.getByText(WIN)).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: OUT + 'play-won.png' });
    return 'won in 2 on the decoded word, screenshot saved';
  });
  await check('play: two requests, our domain only', 6, async () => {
    onlyAllowed(reqs);
    const word = reqs.filter((r) => r.url.startsWith(`${WORKER}/v1/word`)).length;
    const pings = reqs.filter((r) => r.method === 'POST' && r.url.startsWith(`${WORKER}/v1/ping`)).length;
    assert(word === 1, `${word} word requests, expected 1`);
    assert(pings <= 1, `${pings} pings, expected at most 1`);
    return `${word} word request, ${pings} ping, hosts ${hosts(reqs).join(' + ')}`;
  });

  await check('offline cold start', 4, async () => {
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
      // A finished game replaces the keyboard with the result card, so there is no Enter key here.
      await expect(page.getByRole('tab', { name: 'Play' })).toBeVisible();
      await expect(page.getByText('The word was')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
    return 'cache filled; offline reload shows the saved won game';
  });

  await check('backup restores on another device', 5, async () => {
    await page.getByRole('tab', { name: 'Stats' }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'Back up').click()]);
    const file = OUT + 'backup.json';
    await download.saveAs(file);
    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
    try {
      const page2 = await fresh.newPage();
      const reqs2 = watch(page2);
      await page2.goto(SITE + '/#stats');
      await expect(page2.getByLabel('0 played')).toBeVisible();
      const chooser = page2.waitForEvent('filechooser');
      await button(page2, 'Restore').click();
      await (await chooser).setFiles(file);
      await expect(page2.getByText(/Restored: 1 new/)).toBeVisible();
      await expect(page2.getByLabel('1 played')).toBeVisible();
      await page2.screenshot({ path: OUT + 'stats-restored.png' });
      onlyAllowed(reqs2);
    } finally {
      await fresh.close();
    }
    return 'fresh context restored 1 new game; hosts allowed';
  });
  await context.close();
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
    await playAndOffline(browser);
  } finally {
    await browser.close();
  }
}

const proof = [
  ['offline cold start', 4],
  ['two requests, both to our domain', 6],
  ['endpoint word wins', 1],
  ['bundle under 500 KB', 2],
  ['backup restores on another device', 5],
];
console.log('\nDone means:');
for (const [label, n] of proof) {
  const label2 = { 4: '(offline check)', 6: '(request audit)', 1: '(worker word + play win)', 2: '(bundle check)', 5: '(backup check)' }[n];
  const ok = n === 1 ? done[1] && done[3] : done[n];
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} ${label2}`);
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
