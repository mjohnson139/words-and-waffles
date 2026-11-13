import { puzzleNumber } from './daily';
import { type GameRecord } from './record';
import { score } from './score';

/** Prototype `nice` (line 259): e.g. "Thu, Nov 12". */
export const niceDate = (date: string, locale?: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
};

const SQUARE = { hit: '\u{1F7E9}', near: '\u{1F7E8}', miss: '\u{2B1B}' };

/** Share text (lines 404-407); daily games carry the puzzle number. */
export function shareText(g: GameRecord, fmt: (date: string) => string = niceDate): string {
  const num = g.mode === 'daily' ? ' #' + puzzleNumber(g.date) : '';
  const result = (g.status === 'won' ? g.guesses.length : 'X') + '/6';
  const rows = g.guesses.map((x) => score(x, g.answer).map((s) => SQUARE[s]).join(''));
  return 'Words & Waffles \u{1F9C7}' + num + ' · ' + fmt(g.date) + ' · ' + result + '\n' + rows.join('\n');
}
