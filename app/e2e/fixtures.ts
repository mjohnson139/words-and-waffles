import { test as base, expect, type Page } from '@playwright/test';
import { encodeCells } from '../src/game/cells';
import { dailyWord, puzzleNumber } from '../src/game/daily';

export const DAY = '2026-11-13';
export const REVEAL_MS = 1800; // longer than the five-tile flip (src/ui/play/rows.ts)

export interface Ctl {
  /** Answer the word endpoint serves; defaults to dailyWord(date). */
  answer: string | null;
  /** 'abort' makes the word endpoint unreachable. */
  word: 'ok' | 'abort';
  wordRequests: string[];
  pings: Record<string, unknown>[];
  urls: string[];
  /** Applies the fixed clock, routes and request log to a page (also for extra contexts). */
  install: (page: Page) => Promise<void>;
}

export const test = base.extend<{ ctl: Ctl }>({
  ctl: async ({ baseURL }, provide) => {
    const origin = new URL(baseURL ?? 'http://127.0.0.1:4173').host;
    const ctl: Ctl = {
      answer: null,
      word: 'ok',
      wordRequests: [],
      pings: [],
      urls: [],
      install: async (page) => {
        await page.clock.install({ time: new Date(2026, 10, 13, 9, 0) });
        page.on('request', (r) => ctl.urls.push(r.url()));
        await page.route('https://words.test/v1/word*', async (route) => {
          ctl.wordRequests.push(route.request().url());
          if (ctl.word === 'abort') return route.abort();
          const date = new URL(route.request().url()).searchParams.get('date') ?? DAY;
          const salt = 'abcdef0123456789';
          const payload = {
            v: 1,
            date,
            puzzle: puzzleNumber(date),
            len: 5,
            salt,
            cells: encodeCells(ctl.answer ?? dailyWord(date), salt),
          };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify(payload),
          });
        });
        await page.route('https://words.test/v1/ping', async (route) => {
          const req = route.request();
          if (req.method() === 'OPTIONS') {
            return route.fulfill({
              status: 204,
              headers: {
                'access-control-allow-origin': '*',
                'access-control-allow-headers': 'content-type',
                'access-control-allow-methods': 'POST',
              },
            });
          }
          ctl.pings.push(req.postDataJSON());
          await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
        });
      },
    };
    await provide(ctl);
    // No third-party hosts: only the local server and words.test.
    const hosts = new Set(
      ctl.urls.filter((u) => /^https?:/.test(u)).map((u) => new URL(u).host),
    );
    hosts.delete(origin);
    hosts.delete('words.test');
    expect([...hosts], 'requests to other hosts').toEqual([]);
  },
  page: async ({ page, ctl }, provide) => {
    await ctl.install(page);
    await provide(page);
  },
});

export { expect };

/** A valid word that is not `answer`. */
export const wrongWord = (answer: string): string => (answer === 'crane' ? 'about' : 'crane');

export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeVisible();
}

/** Types a word with the on-screen keyboard and presses Enter. */
export async function guess(page: Page, word: string, opts: { wait?: boolean } = {}): Promise<void> {
  for (const ch of word) await page.getByRole('button', { name: ch, exact: true }).click();
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  if (opts.wait !== false) await page.waitForTimeout(REVEAL_MS);
}
