import type { Page } from '@playwright/test';
import { dailyWord } from '../src/game/daily';
import { WIN } from '../src/game/play';
import { BAD_LINK, LINK_COPIED, encodeShareLink } from '../src/game/shareLink';
import { DAY, expect, guess, openApp, test, wrongWord } from './fixtures';

const answer = dailyWord(DAY);
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const GOOD = encodeShareLink('crane', 'abcdef012345');
const FRIEND = 'A friend picked this one. Go!';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** Picks `waffl`, taps Share link and returns the copied URL. */
async function copyLink(page: Page): Promise<string> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  await openApp(page);
  await button(page, 'Pick a word').click();
  await page.getByLabel('Secret word').fill('waffl');
  await button(page, 'Share link').click();
  await expect(page.getByText(LINK_COPIED)).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('A word fresh off the iron, just for you: ');
  const url = /https?:\/\/\S+/.exec(text)?.[0] ?? '';
  expect(url).toContain('#w=1.');
  expect(text).not.toContain('waffl');
  return url;
}

test('share link is copied without the word in it', async ({ page }) => {
  await copyLink(page);
});

test('a friend opens the link, wins, and a reload shows the result', async ({ page, ctl, browser }) => {
  const url = await copyLink(page);
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await fresh.newPage();
  await ctl.install(page2);
  await page2.goto(url);
  await expect(page2.getByText(FRIEND)).toBeVisible();
  await expect(button(page2, 'Enter')).toBeVisible();
  await expect.poll(() => page2.evaluate(() => location.hash)).toBe('#play');
  await guess(page2, 'waffl', { wait: false });
  await expect(page2.getByText(WIN[1])).toBeVisible();

  await page2.goto(url);
  await expect(page2.getByText("You've had this one already.")).toBeVisible();
  await expect(page2.getByText('The word was')).toBeVisible();
  await fresh.close();
});

test('a directly built link plays that word', async ({ page }) => {
  await page.goto('/#' + GOOD);
  await expect(page.getByText(FRIEND)).toBeVisible();
  await guess(page, 'crane', { wait: false });
  await expect(page.getByText(WIN[1])).toBeVisible();
});

for (const [name, fragment] of [
  ['a tampered link', GOOD.slice(0, -1) + (GOOD.endsWith('0') ? '1' : '0')],
  ['junk', 'w=junk'],
] as const) {
  test(`bad fragment (${name}) falls back to today's board`, async ({ page }) => {
    await page.goto('/#' + fragment);
    await expect(page.getByText(BAD_LINK)).toBeVisible();
    await expect(button(page, 'Enter')).toBeVisible();
    await guess(page, wrongWord(answer));
    await guess(page, answer, { wait: false });
    await expect(page.getByText(WIN[2])).toBeVisible(); // daily: second row
  });
}

test('hashchange opens the shared game while the app is open', async ({ page }) => {
  await openApp(page);
  await page.evaluate((f) => {
    location.hash = f;
  }, GOOD);
  await expect(page.getByText(FRIEND)).toBeVisible();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#play');
  await guess(page, 'crane', { wait: false });
  await expect(page.getByText(WIN[1])).toBeVisible();
});

test('the word never travels in a request', async ({ page, ctl }) => {
  await page.goto('/#' + GOOD);
  await expect(page.getByText(FRIEND)).toBeVisible();
  await page.waitForTimeout(500);
  expect(ctl.urls.filter((u) => u.includes('w=1.'))).toEqual([]);
});

test('Seconds result offers Share word; the daily result does not', async ({ page }) => {
  await openApp(page);
  await button(page, 'Seconds').click();
  const share = button(page, 'Share word');
  const words = ['crane', 'about', 'house', 'light', 'storm', 'ghost'];
  for (const w of words) {
    if (await share.isVisible()) break;
    await guess(page, w);
  }
  await expect(share).toBeVisible();
  await expect(page.getByText('The word was')).toBeVisible();
});

test('the daily result has no Share word', async ({ page }) => {
  await openApp(page);
  await guess(page, wrongWord(answer));
  await guess(page, answer, { wait: false });
  await expect(page.getByText(WIN[2])).toBeVisible();
  await expect(page.getByText('The word was')).toBeVisible();
  await expect(button(page, 'Share word')).toHaveCount(0);
});
