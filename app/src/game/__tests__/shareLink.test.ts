import { describe, expect, it } from 'vitest';
import { ANSWERS } from '../answers';
import { encodeCells } from '../cells';
import { newGame } from '../play';
import {
  BAD_LINK,
  encodeShareLink,
  isShareFragment,
  newShareSalt,
  openShared,
  parseShareLink,
  resolveLink,
  shareUrl,
} from '../shareLink';

const SALT = '0123456789ab';

describe('share link round trip', () => {
  it('parses every answer word back', () => {
    for (const word of ANSWERS) {
      expect(parseShareLink(encodeShareLink(word, SALT))).toEqual({ word, salt: SALT });
    }
  });

  it('never contains the word in clear', () => {
    for (const word of ['crane', 'waffl', 'zzzzz', 'abbey']) {
      expect(encodeShareLink(word, SALT).includes(word)).toBe(false);
    }
  });

  it('accepts upper case, whitespace and a leading #', () => {
    const link = encodeShareLink('crane', SALT);
    const want = { word: 'crane', salt: SALT };
    expect(parseShareLink('#' + link)).toEqual(want);
    expect(parseShareLink('  ' + link.toUpperCase() + '\n')).toEqual(want);
    expect(parseShareLink(' #' + link.toUpperCase())).toEqual(want);
  });
});

describe('bad links', () => {
  const link = encodeShareLink('crane', SALT);

  it('rejects a tampered cell', () => {
    const i = link.length - 3;
    const tampered = link.slice(0, i) + (link[i] === '0' ? '1' : '0') + link.slice(i + 1);
    expect(parseShareLink(tampered)).toBeNull();
  });

  it('rejects wrong lengths, missing parts and unknown versions', () => {
    const cells = encodeCells('crane', SALT).join('');
    expect(parseShareLink('w=1.' + SALT.slice(1) + '.' + cells)).toBeNull();
    expect(parseShareLink('w=1.' + SALT + '.' + cells.slice(1))).toBeNull();
    expect(parseShareLink('w=1.' + SALT + '.' + cells + '0')).toBeNull();
    expect(parseShareLink('w=1.' + SALT)).toBeNull();
    expect(parseShareLink('w=1.' + cells)).toBeNull();
    expect(parseShareLink('w=2.' + SALT + '.' + cells)).toBeNull();
  });

  it('rejects unrelated fragments', () => {
    for (const f of ['', '#', 'stats', '#play', 'w=', 'w=1.']) expect(parseShareLink(f)).toBeNull();
  });
});

describe('isShareFragment', () => {
  it('is true for anything that starts with w=', () => {
    expect(isShareFragment('#w=junk')).toBe(true);
    expect(isShareFragment(' W=1.x ')).toBe(true);
  });
  it('is false for other fragments', () => {
    expect(isShareFragment('#stats')).toBe(false);
    expect(isShareFragment('')).toBe(false);
  });
});

describe('encodeShareLink', () => {
  it('throws on a bad word or salt', () => {
    expect(() => encodeShareLink('abc', SALT)).toThrow();
    expect(() => encodeShareLink('ABCDE', SALT)).toThrow();
    expect(() => encodeShareLink('abcd1', SALT)).toThrow();
    expect(() => encodeShareLink('crane', 'xyz')).toThrow();
    expect(() => encodeShareLink('crane', 'ABCDEF012345')).toThrow();
  });
});

describe('newShareSalt', () => {
  it('gives 12 hex characters at both ends of rand', () => {
    expect(newShareSalt(() => 0)).toBe('000000000000');
    expect(newShareSalt(() => 0.99999)).toMatch(/^[0-9a-f]{12}$/);
    expect(newShareSalt(() => 0.9999999999999999)).toBe('ffffffffffff');
  });
});

describe('shareUrl', () => {
  it('appends the fragment and drops an existing one', () => {
    const f = encodeShareLink('crane', SALT);
    expect(shareUrl('https://x.dev/', f)).toBe('https://x.dev/#' + f);
    expect(shareUrl('https://x.dev/#stats', f)).toBe('https://x.dev/#' + f);
  });
});

describe('openShared', () => {
  const link = { word: 'crane', salt: SALT };
  const id = 'c-' + SALT;

  it('starts a new game', () => {
    const { game, toast } = openShared({}, link, '2026-11-13');
    expect(game).toEqual(newGame(id, 'custom', '2026-11-13', 'crane', 'local'));
    expect(game.guesses).toEqual([]);
    expect(toast).toBe('A friend picked this one. Go!');
  });

  it('resumes a game in progress', () => {
    const saved = { ...newGame(id, 'custom', '2026-11-12', 'crane', 'local'), guesses: ['slate'] };
    const { game, toast } = openShared({ [id]: saved }, link, '2026-11-13');
    expect(game).toBe(saved);
    expect(toast).toBe("Back to your friend's word.");
  });

  it('returns a finished game with the already-had toast', () => {
    const saved = { ...newGame(id, 'custom', '2026-11-12', 'crane', 'local'), guesses: ['crane'], status: 'won' as const };
    const { game, toast } = openShared({ [id]: saved }, link, '2026-11-13');
    expect(game).toBe(saved);
    expect(toast).toBe("You've had this one already.");
  });

  it('starts fresh when the same salt holds a different answer', () => {
    const other = newGame(id, 'custom', '2026-11-12', 'slate', 'local');
    const { game, toast } = openShared({ [id]: other }, link, '2026-11-13');
    expect(game.answer).toBe('crane');
    expect(game.guesses).toEqual([]);
    expect(toast).toBe('A friend picked this one. Go!');
  });
});

describe('resolveLink', () => {
  const salt = 'abcdef012345';
  const link = encodeShareLink('crane', salt);
  it('opens a good link as a new picked game', () => {
    const r = resolveLink({}, '#' + link, '2026-11-13');
    expect(r.game?.answer).toBe('crane');
    expect(r.game?.id).toBe('c-' + salt);
    expect(r.toast).toBe('A friend picked this one. Go!');
  });
  it('resumes the same link in progress', () => {
    const first = resolveLink({}, link, '2026-11-13').game!;
    const games = { [first.id]: { ...first, guesses: ['about'], startedAt: 1 } };
    const r = resolveLink(games, link, '2026-11-14');
    expect(r.game?.guesses).toEqual(['about']);
    expect(r.toast).toBe("Back to your friend's word.");
  });
  it('sends a bad link to Today', () => {
    expect(resolveLink({}, '#w=junk', '2026-11-13')).toEqual({ game: null, toast: BAD_LINK });
    expect(resolveLink({}, link.slice(0, -1) + (link.endsWith('0') ? '1' : '0'), '2026-11-13').game).toBeNull();
  });
});
