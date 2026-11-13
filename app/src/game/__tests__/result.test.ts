import { describe, expect, it } from 'vitest';
import type { GameRecord } from '../record';
import { cleanResultState, resultBody, resultEndpoint } from '../result';

const TODAY = '2026-11-13';
const game = (over: Partial<GameRecord> = {}): GameRecord => ({
  id: 'd-' + TODAY,
  mode: 'daily',
  date: TODAY,
  answer: 'waffl',
  guesses: ['crane', 'waffl'],
  status: 'won',
  startedAt: 1,
  finishedAt: 2,
  source: 'bundled',
  ...over,
});

describe('resultBody', () => {
  it('sends the number of guesses for a win', () => {
    expect(resultBody(game({ guesses: ['waffl'] }), TODAY, {})).toEqual({ d: TODAY, g: 1 });
    expect(resultBody(game({ guesses: Array(5).fill('crane').concat('waffl') }), TODAY, {})).toEqual({
      d: TODAY,
      g: 6,
    });
  });

  it("sends 'x' for a loss", () => {
    const g = game({ status: 'lost', guesses: Array(6).fill('crane') });
    expect(resultBody(g, TODAY, {})).toEqual({ d: TODAY, g: 'x' });
  });

  it('is null without a finished daily game for today', () => {
    expect(resultBody(undefined, TODAY, {})).toBeNull();
    expect(resultBody(game({ status: 'playing' }), TODAY, {})).toBeNull();
    expect(resultBody(game({ mode: 'extra' }), TODAY, {})).toBeNull();
    expect(resultBody(game({ mode: 'custom' }), TODAY, {})).toBeNull();
    expect(resultBody(game({ date: '2026-11-12' }), TODAY, {})).toBeNull();
  });

  it('is null once sent today, but not after yesterday', () => {
    expect(resultBody(game(), TODAY, { lastDate: TODAY })).toBeNull();
    expect(resultBody(game(), TODAY, { lastDate: '2026-11-12' })).toEqual({ d: TODAY, g: 2 });
  });
});

describe('cleanResultState', () => {
  it('keeps only a valid date', () => {
    expect(cleanResultState({ lastDate: TODAY })).toEqual({ lastDate: TODAY });
    expect(cleanResultState({ lastDate: 'nope' })).toEqual({});
    expect(cleanResultState({ lastDate: 5, extra: 1 })).toEqual({});
    expect(cleanResultState(null)).toEqual({});
    expect(cleanResultState('x')).toEqual({});
  });
});

describe('resultEndpoint', () => {
  it('swaps the ping path for the result path', () => {
    expect(resultEndpoint('https://x.test/v1/ping')).toBe('https://x.test/v1/result');
    expect(resultEndpoint('https://x.test/api/v1/ping')).toBe('https://x.test/api/v1/result');
    expect(resultEndpoint('https://x.test/v1/ping?a=1#h')).toBe('https://x.test/v1/result');
  });

  it('is empty for anything else', () => {
    expect(resultEndpoint('https://x.test/v1/ping/')).toBe('');
    expect(resultEndpoint('https://x.test/v1/word')).toBe('');
    expect(resultEndpoint('https://x.test')).toBe('');
    expect(resultEndpoint('not a url')).toBe('');
    expect(resultEndpoint('')).toBe('');
  });
});
