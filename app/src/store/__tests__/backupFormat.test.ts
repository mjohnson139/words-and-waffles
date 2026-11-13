import { backupFileName, BACKUP_APP, makeBackup, parseBackup, restoreInto } from '../backupFormat';
import { compute } from '../../game/stats';
import { newGame } from '../../game/play';
import { type GameRecord } from '../../game/record';

const won = (id: string, date: string): GameRecord => ({
  ...newGame(id, 'daily', date, 'terse', 'bundled'),
  guesses: ['crane', 'terse'],
  status: 'won',
  startedAt: 1,
  finishedAt: 2000,
});
const playing = (id: string, date: string): GameRecord => ({
  ...newGame(id, 'daily', date, 'terse', 'bundled'),
  guesses: ['crane'],
});
const map = (...gs: GameRecord[]) => Object.fromEntries(gs.map((g) => [g.id, g]));

describe('backup format', () => {
  it('makes a tagged backup with an ISO timestamp and a dated file name', () => {
    const b = makeBackup({}, Date.UTC(2026, 10, 13, 8, 0, 0));
    expect(b).toEqual({ app: BACKUP_APP, v: 1, exportedAt: '2026-11-13T08:00:00.000Z', games: {} });
    expect(backupFileName('2026-11-13')).toBe('words-and-waffles-2026-11-13.json');
  });

  it('round-trips', () => {
    const games = map(won('g-aaa', '2026-11-12'), playing('g-bbb', '2026-11-13'));
    const r = parseBackup(JSON.stringify(makeBackup(games, 0)));
    expect(r).toEqual({ ok: true, games });
  });

  it('rejects garbage, other apps and non-objects', () => {
    for (const t of ['not json', '[]', 'null', '{"app":"other","v":1,"games":{}}', '{"v":1,"games":{}}']) {
      const r = parseBackup(t);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("That file isn't a Words & Waffles backup.");
    }
  });

  it('rejects a newer version', () => {
    const r = parseBackup(JSON.stringify({ app: BACKUP_APP, v: 2, games: {} }));
    expect(r).toEqual({ ok: false, error: 'That backup is from a newer version.' });
  });

  it('drops corrupt records', () => {
    const good = won('g-aaa', '2026-11-12');
    const text = JSON.stringify({
      app: BACKUP_APP,
      v: 1,
      games: { 'g-aaa': good, bad: { id: 'x' }, worse: 5 },
    });
    expect(parseBackup(text)).toEqual({ ok: true, games: { 'g-aaa': good } });
  });

  it('counts added and updated on restore', () => {
    const local = map(playing('g-aaa', '2026-11-12'), won('g-bbb', '2026-11-11'));
    const incoming = map(won('g-aaa', '2026-11-12'), won('g-bbb', '2026-11-11'), won('g-ccc', '2026-11-10'));
    const r = restoreInto(local, incoming);
    expect(r.added).toBe(1);
    expect(r.updated).toBe(1);
    expect(Object.keys(r.games).sort()).toEqual(['g-aaa', 'g-bbb', 'g-ccc']);
  });

  it('lets a finished incoming game beat a playing local one, not the reverse', () => {
    const fin = won('g-aaa', '2026-11-12');
    expect(restoreInto(map(playing('g-aaa', '2026-11-12')), map(fin)).games['g-aaa']).toEqual(fin);
    const r = restoreInto(map(fin), map(playing('g-aaa', '2026-11-12')));
    expect(r.games['g-aaa']).toEqual(fin);
    expect(r.updated).toBe(0);
  });

  it('gives the same stats after export then import on an empty device', () => {
    const games = map(won('g-aaa', '2026-11-12'), won('g-bbb', '2026-11-13'), playing('g-ccc', '2026-11-13'));
    const parsed = parseBackup(JSON.stringify(makeBackup(games, 0)));
    if (!parsed.ok) throw new Error('parse failed');
    const restored = restoreInto({}, parsed.games).games;
    const a = compute(games, '2026-11-13');
    const b = compute(restored, '2026-11-13');
    expect(b.total).toBe(a.total);
    expect(b.st).toEqual(a.st);
  });
});
