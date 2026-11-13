import { dailyWord } from '../src/game/daily';
import { WIN } from '../src/game/play';
import { DAY, expect, guess, openApp, test, wrongWord } from './fixtures';

const answer = dailyWord(DAY);

test('after the first visit the app loads and plays with no network', async ({ page, context, ctl }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Reload once so the page is controlled and its assets pass through the worker.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeVisible();

  ctl.word = 'abort';
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeVisible();
  await guess(page, wrongWord(answer));
  await guess(page, answer, { wait: false });
  await expect(page.getByText(WIN[2])).toBeVisible();
  await context.setOffline(false);
});
