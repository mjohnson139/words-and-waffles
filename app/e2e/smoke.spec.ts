import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { dailyWord } from '../src/game/daily';
import { WIN } from '../src/game/play';
import { DAY, expect, guess, openApp, test, wrongWord } from './fixtures';

const answer = dailyWord(DAY);
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function winDaily(page: Page) {
  await openApp(page);
  await guess(page, wrongWord(answer));
  await guess(page, answer, { wait: false });
  await expect(page.getByText(WIN[2])).toBeVisible();
}

test('daily win shows the result, history and stats', async ({ page }) => {
  await winDaily(page);
  await expect(page.getByText('The word was')).toBeVisible();

  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.getByRole('button', { name: new RegExp(`^${answer}, .*2 of 6`) })).toBeVisible();

  await page.getByRole('tab', { name: 'Stats' }).click();
  await expect(page.getByLabel('1 played')).toBeVisible();
  await expect(page.getByLabel('100% won')).toBeVisible();
  await expect(page.getByLabel('1 day streak')).toBeVisible();
});

test('bad input toasts', async ({ page }) => {
  await openApp(page);
  for (const ch of 'abc') await button(page, ch).click();
  await button(page, 'Enter').click();
  await expect(page.getByText('Five letters, chef.')).toBeVisible();
  for (const ch of 'de') await button(page, ch).click();
  await button(page, 'Enter').click(); // "abcde" is not a word
  await expect(page.getByText("That one isn't in the pantry.")).toBeVisible();
});

test('six wrong guesses burn the waffle', async ({ page }) => {
  await openApp(page);
  const wrong = ['crane', 'about', 'house', 'light', 'storm', 'ghost', 'plant'].filter((w) => w !== answer).slice(0, 6);
  for (const w of wrong) await guess(page, w);
  await expect(page.getByText('Burnt that one.')).toBeVisible();
  await expect(page.getByText('The word was')).toBeVisible();
});

test('hardware keyboard types, deletes and submits', async ({ page }) => {
  await openApp(page);
  await page.keyboard.type('abc');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Five letters, chef.')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace');
  await page.keyboard.type(wrongWord(answer));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1800);
  await page.keyboard.type(answer);
  await page.keyboard.press('Enter');
  await expect(page.getByText(WIN[2])).toBeVisible();
});

test('Enter after tapping an on-screen key submits instead of repeating the key', async ({ page }) => {
  await openApp(page);
  const word = wrongWord(answer);
  await button(page, word[0]).click();
  await page.keyboard.type(word.slice(1));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1800);
  // The guess went in as one row: typing the answer now wins on the second row.
  await page.keyboard.type(answer);
  await page.keyboard.press('Enter');
  await expect(page.getByText(WIN[2])).toBeVisible();
});

test('Seconds is playable while the word request hangs', async ({ page, ctl }) => {
  ctl.word = 'hang';
  await page.goto('/');
  await button(page, 'Seconds').click();
  await expect(button(page, 'Enter')).toBeVisible();
  await page.keyboard.type('abc');
  await button(page, 'Enter').click();
  await expect(page.getByText('Five letters, chef.')).toBeVisible();
  expect(ctl.wordRequests.length).toBeGreaterThan(0);
});

test('seconds starts another word; pick a word can be guessed', async ({ page }) => {
  await openApp(page);
  await button(page, 'Seconds').click();
  await guess(page, answer); // today's word is not the seconds word
  await expect(page.getByText(WIN[1])).toHaveCount(0);

  await button(page, 'Pick a word').click();
  await page.getByLabel('Secret word').fill('waffl');
  await button(page, 'Start').click();
  await expect(page.getByText('Word is in the iron. Go!')).toBeVisible();
  await guess(page, 'waffl', { wait: false });
  await expect(page.getByText(WIN[1])).toBeVisible();
});

test('the endpoint word wins over the bundled word', async ({ page, ctl }) => {
  const other = wrongWord(answer);
  ctl.answer = other;
  await openApp(page);
  await guess(page, wrongWord(other));
  await guess(page, other, { wait: false });
  await expect(page.getByText(WIN[2])).toBeVisible();
  expect(ctl.wordRequests).toHaveLength(1);
});

test('offline falls back to the bundled word', async ({ page, ctl }) => {
  ctl.word = 'abort';
  await winDaily(page);
  expect(ctl.wordRequests.length).toBeGreaterThan(0);
});

test('a failed word fetch is retried when the browser comes back online', async ({ page, ctl }) => {
  const other = wrongWord(answer);
  ctl.answer = other;
  ctl.word = 'abort-once';
  await openApp(page);
  await expect.poll(() => ctl.wordRequests.length).toBe(1);
  await page.clock.fastForward(61_000);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => ctl.wordRequests.length).toBe(2);
  await page.waitForTimeout(500);
  await guess(page, wrongWord(other));
  await guess(page, other, { wait: false });
  await expect(page.getByText(WIN[2])).toBeVisible();
});

test('request audit: one word request, one ping, respects the setting', async ({ page, ctl }) => {
  await openApp(page);
  await expect.poll(() => ctl.pings.length).toBe(1);
  await page.waitForTimeout(500);
  expect(ctl.wordRequests).toHaveLength(1);
  expect(ctl.pings).toHaveLength(1);
  expect(Object.keys(ctl.pings[0]).sort()).toEqual(['d', 'm', 'n', 'p', 'w']);
  expect(ctl.pings[0].p).toBe('web');

  await page.reload();
  await expect(button(page, 'Enter')).toBeVisible();
  await page.waitForTimeout(800);
  expect(ctl.pings).toHaveLength(1);
  expect(ctl.wordRequests).toHaveLength(1);

  await page.getByRole('tab', { name: 'Stats' }).click();
  await page.getByLabel('Send the daily count').click();
  await page.waitForTimeout(300);
  await page.clock.setSystemTime(new Date(2026, 10, 14, 9, 0));
  await page.reload();
  await page.waitForTimeout(1000);
  expect(ctl.pings).toHaveLength(1);
});

test('backup and restore round trip', async ({ page, ctl, browser }) => {
  await winDaily(page);
  await page.getByRole('tab', { name: 'Stats' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'Back up').click()]);
  const file = await download.path();
  expect(JSON.parse(await readFile(file, 'utf8'))).toBeTruthy();

  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: new URL(page.url()).origin });
  const page2 = await fresh.newPage();
  await ctl.install(page2);
  await page2.goto('/#stats');
  await expect(page2.getByLabel('0 played')).toBeVisible();
  const chooser = page2.waitForEvent('filechooser');
  await button(page2, 'Restore').click();
  await (await chooser).setFiles(file);
  await expect(page2.getByText(/Restored: 1 new/)).toBeVisible();
  await expect(page2.getByLabel('1 played')).toBeVisible();
  await page2.getByRole('tab', { name: 'History' }).click();
  await expect(page2.getByRole('button', { name: new RegExp(`^${answer}, `) })).toBeVisible();
  await fresh.close();
});

test('reduced motion still wins', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await guess(page, wrongWord(answer), { wait: false });
  await guess(page, answer, { wait: false });
  await expect(page.getByText(WIN[2])).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`review screenshots (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const shot = (name: string, full = false) =>
      page.screenshot({ path: `e2e/artifacts/review/${name}-${scheme}.png`, fullPage: full });
    await openApp(page);
    await guess(page, wrongWord(answer));
    for (const ch of 'wa') await button(page, ch).click();
    await shot('play-mid-game');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await guess(page, answer, { wait: false });
    await expect(page.getByText(WIN[2])).toBeVisible();
    await page.waitForTimeout(800);
    await shot('play-won');
    await page.getByRole('tab', { name: 'History' }).click();
    await page.getByRole('button', { name: new RegExp(`^${answer}, `) }).click();
    await page.waitForTimeout(300);
    await shot('history-expanded');
    await page.getByRole('tab', { name: 'Stats' }).click();
    await page.waitForTimeout(300);
    await shot('stats', true);
  });
}
