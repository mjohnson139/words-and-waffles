/**
 * Share links: a picked word carried in a URL fragment, '#w=1.<salt>.<cells>'.
 *
 * This is obfuscation, not security. The word never appears in clear, but a
 * five-letter word can always be brute-forced. Never call it secure or encrypted.
 */
import { decodeCells, encodeCells } from './cells';
import { newGame } from './play';
import type { GameRecord } from './record';
import { okWord } from './words';

export interface SharedWord {
  word: string;
  salt: string;
}

export const BAD_LINK = "That link came out burnt. Here's today's.";
export const LINK_COPIED = 'Link copied. Pass the plate.';

const SALT = /^[0-9a-f]{12}$/;
const LINK = /^w=1\.([0-9a-f]{12})\.([0-9a-f]{80})$/;

const normal = (fragment: string): string => fragment.trim().replace(/^#/, '').toLowerCase();

export function newShareSalt(rand: () => number): string {
  let s = '';
  for (let i = 0; i < 12; i++) s += Math.min(15, Math.floor(rand() * 16)).toString(16);
  return s;
}

export function encodeShareLink(word: string, salt: string): string {
  if (!okWord(word)) throw new Error('A shared word needs exactly five letters, a to z.');
  if (!SALT.test(salt)) throw new Error('The salt must be 12 lowercase hex characters.');
  return 'w=1.' + salt + '.' + encodeCells(word, salt).join('');
}

export const isShareFragment = (fragment: string): boolean => normal(fragment).startsWith('w=');

export function parseShareLink(fragment: string): SharedWord | null {
  const m = LINK.exec(normal(fragment));
  if (!m) return null;
  const cells = m[2].match(/.{16}/g) ?? [];
  const word = decodeCells(m[1], cells);
  return word ? { word, salt: m[1] } : null;
}

export const shareUrl = (base: string, fragment: string): string =>
  base.replace(/#.*$/, '') + '#' + fragment;

export const shareMessage = (url: string): string => 'A word fresh off the iron, just for you: ' + url;

export function openShared(
  games: Record<string, GameRecord>,
  link: SharedWord,
  date: string,
): { game: GameRecord; toast: string } {
  const id = 'c-' + link.salt;
  const saved = games[id];
  if (saved && saved.answer === link.word) {
    return {
      game: saved,
      toast: saved.status === 'playing' ? "Back to your friend's word." : "You've had this one already.",
    };
  }
  return { game: newGame(id, 'custom', date, link.word, 'local'), toast: 'A friend picked this one. Go!' };
}
