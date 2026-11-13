/**
 * The word endpoint payload: five per-letter hashes plus a salt.
 *
 * This is obfuscation, not secrecy. A five-letter word can always be
 * brute-forced (26 guesses per position), so never call this secure. It only
 * keeps the answer from being readable at a glance in the network response.
 */
import { sha256Hex } from './sha256';
import { isDateString } from './dates';

export interface WordPayload {
  v: 1;
  date: string;
  puzzle: number;
  len: 5;
  salt: string;
  cells: string[];
}

export const cellHash = (salt: string, i: number, letter: string): string =>
  sha256Hex(salt + '|' + i + '|' + letter).slice(0, 16);

export function encodeCells(word: string, salt: string): string[] {
  return Array.from({ length: 5 }, (_, i) => cellHash(salt, i, word[i]));
}

/** Try a..z at each position (at most 130 hashes). Null if any position has no match. */
export function decodeCells(salt: string, cells: readonly string[]): string | null {
  let word = '';
  for (let i = 0; i < cells.length; i++) {
    let found = '';
    for (let c = 97; c <= 122; c++) {
      const letter = String.fromCharCode(c);
      if (cellHash(salt, i, letter) === cells[i]) {
        found = letter;
        break;
      }
    }
    if (!found) return null;
    word += found;
  }
  return word;
}

export function isWordPayload(x: unknown): x is WordPayload {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    p.v === 1 &&
    isDateString(p.date) &&
    typeof p.puzzle === 'number' &&
    Number.isInteger(p.puzzle) &&
    p.puzzle > 0 &&
    p.len === 5 &&
    typeof p.salt === 'string' &&
    /^[0-9a-f]{8,128}$/.test(p.salt) &&
    Array.isArray(p.cells) &&
    p.cells.length === 5 &&
    p.cells.every((c) => typeof c === 'string' && /^[0-9a-f]{16}$/.test(c))
  );
}
