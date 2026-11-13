import { cellHash, decodeCells, encodeCells, isWordPayload } from '../cells';

const WORDS = (
  'apple crane slate house wafer ghost zebra jazzy fuzzy quick vivid woozy kayak nymph ' +
  'lunch pizza sugar maple bacon honey toast syrup flour cocoa plain stack grill batch dough ' +
  'sweet cream berry melon peach lemon mango olive pasta salad stove knife spoon plate bowls ' +
  'cabin river mount ocean cloud tiger'
).split(' ');
const SALT = 'a1b2c3d4e5f60718';

describe('cells', () => {
  it('has a 50 word test list', () => expect(WORDS.length).toBe(50));
  it('round trips', () => {
    for (const w of WORDS) expect(decodeCells(SALT, encodeCells(w, SALT))).toBe(w);
  });
  it('depends on the salt', () => {
    expect(encodeCells('apple', SALT)).not.toEqual(encodeCells('apple', 'ffffffff'));
  });
  it('returns null for a tampered cell', () => {
    const cells = encodeCells('apple', SALT);
    cells[2] = '0'.repeat(16);
    expect(decodeCells(SALT, cells)).toBeNull();
    expect(decodeCells('deadbeef', encodeCells('apple', SALT))).toBeNull();
  });
  it('hashes to 16 hex chars', () => expect(cellHash(SALT, 0, 'a')).toMatch(/^[0-9a-f]{16}$/));
});

describe('isWordPayload', () => {
  const good = () => ({
    v: 1, date: '2026-11-13', puzzle: 1, len: 5, salt: SALT, cells: encodeCells('apple', SALT),
  });
  it('accepts a good payload', () => expect(isWordPayload(good())).toBe(true));
  it('rejects each bad field', () => {
    const bad: Record<string, unknown>[] = [
      { v: 2 }, { date: '2026-1-3' }, { date: 5 }, { puzzle: 0 }, { puzzle: 1.5 }, { puzzle: '1' },
      { len: 4 }, { salt: 'abc' }, { salt: 'XYZXYZXYZ' }, { salt: 'a'.repeat(129) },
      { cells: [] }, { cells: ['0'.repeat(16)] }, { cells: [...good().cells.slice(1), 'zz'] },
      { cells: [...good().cells, '0'.repeat(16)] }, { cells: [1, 2, 3, 4, 5] },
    ];
    for (const b of bad) expect(isWordPayload({ ...good(), ...b })).toBe(false);
    for (const x of [null, undefined, 'x', 3, []]) expect(isWordPayload(x)).toBe(false);
  });
});
