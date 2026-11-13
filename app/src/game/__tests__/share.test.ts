import { newGame } from '../play';
import { niceDate, shareText } from '../share';

const fmt = (d: string) => 'D' + d;
const game = (mode: 'daily' | 'extra', guesses: string[], status: 'won' | 'lost') => ({
  ...newGame('g-1', mode, '2026-11-12', 'terse', 'bundled'),
  guesses,
  status,
});

describe('shareText', () => {
  it('daily win has puzzle number and emoji rows', () => {
    const g = game('daily', ['crane', 'terse'], 'won');
    expect(shareText(g, fmt)).toBe(
      'Words & Waffles \u{1F9C7} #12 · D2026-11-12 · 2/6\n' +
        '\u{2B1B}\u{1F7E8}\u{2B1B}\u{2B1B}\u{1F7E9}\n' +
        '\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}',
    );
  });
  it('daily loss shows X/6', () => {
    const g = game('daily', ['crane', 'crane', 'crane', 'crane', 'crane', 'crane'], 'lost');
    const first = shareText(g, fmt).split('\n')[0];
    expect(first).toBe('Words & Waffles \u{1F9C7} #12 · D2026-11-12 · X/6');
    expect(shareText(g, fmt).split('\n')).toHaveLength(7);
  });
  it('extra has no number', () => {
    expect(shareText(game('extra', ['terse'], 'won'), fmt).split('\n')[0]).toBe(
      'Words & Waffles \u{1F9C7} · D2026-11-12 · 1/6',
    );
  });
  it('marks near letters yellow', () => {
    expect(shareText(game('extra', ['rests'], 'lost'), fmt)).toContain('\u{1F7E8}');
  });
});

describe('niceDate', () => {
  it('formats weekday, month and day', () => {
    expect(niceDate('2026-11-12', 'en-US')).toBe('Thu, Nov 12');
  });
});
