import { dailyWord } from '../src/game/daily';
import { WIN } from '../src/game/play';
import { DAY, expect, guess, openApp, test, wrongWord } from './fixtures';

const answer = dailyWord(DAY);
const FONT = 'BagelFatOne_400Regular'; // family registered in src/ui/theme.ts

test('after the first visit the app loads and plays with no network', async ({ page, context, ctl }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The worker precaches the shell, bundles and their font and images on install.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = await (await caches.open('waffles-v1')).keys();
        const urls = keys.map((k) => new URL(k.url).pathname);
        return urls.includes('/') && urls.some((u) => u.endsWith('.ttf')) && urls.some((u) => u.startsWith('/_expo/static/js/'));
      }),
    )
    .toBe(true);

  ctl.word = 'abort';
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate((family) => [...document.fonts].some((f) => f.family.includes(family) && f.status === 'loaded'), FONT))
    .toBe(true);
  await guess(page, wrongWord(answer));
  await guess(page, answer, { wait: false });
  await expect(page.getByText(WIN[2])).toBeVisible();
  await context.setOffline(false);
});

test('HTML served for a missing asset path is not cached', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const missing = '/_expo/static/js/web/missing.js';
  const type = await page.evaluate(async (path) => (await fetch(path)).headers.get('content-type'), missing);
  expect(type).toContain('text/html');
  const cached = await page.evaluate(async (path) => !!(await (await caches.open('waffles-v1')).match(path)), missing);
  expect(cached).toBe(false);
});
