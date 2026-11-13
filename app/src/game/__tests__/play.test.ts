import { dailyWord } from '../daily';
import { ANSWERS } from '../answers';
import {
  type PlayState,
  WIN,
  moreLabel,
  newGame,
  press,
  resultTitle,
  resume,
  startCustom,
  uid,
} from '../play';
import { type GameRecord } from '../record';

const valid = (w: string) => ['crane', 'slate', 'moist', 'plumb', 'ghost', 'fjord'].includes(w);
const fresh = (answer = 'terse'): PlayState => ({
  game: newGame('d-2026-11-01', 'daily', '2026-11-01', answer, 'bundled'),
  typed: '',
});
const type = (s: PlayState, word: string, now = 1) => {
  for (const ch of word) s = press(s, ch, now, valid).state;
  return s;
};
const submit = (s: PlayState, word: string, now = 1) => press(type(s, word, now), 'enter', now, valid);

describe('press typing', () => {
  it('types letters with pop effects and sets startedAt once', () => {
    const r = press(fresh(), 'c', 100, valid);
    expect(r.state.typed).toBe('c');
    expect(r.state.game?.startedAt).toBe(100);
    expect(r.effects).toEqual([{ type: 'pop', row: 0, col: 0 }]);
    const r2 = press(r.state, 'r', 200, valid);
    expect(r2.state.game?.startedAt).toBe(100);
    expect(r2.effects).toEqual([{ type: 'pop', row: 0, col: 1 }]);
  });
  it('stops at five letters', () => {
    const s = type(fresh(), 'cranes');
    expect(s.typed).toBe('crane');
  });
  it('back removes a letter and does nothing when empty', () => {
    expect(press(type(fresh(), 'ab'), 'back', 1).state.typed).toBe('a');
    expect(press(fresh(), 'back', 1).state.typed).toBe('');
  });
  it('ignores unknown keys', () => {
    expect(press(fresh(), '1', 1).state.typed).toBe('');
  });
});

describe('press submit', () => {
  it('shakes and toasts on a short word', () => {
    const r = press(type(fresh(), 'cra'), 'enter', 1, valid);
    expect(r.effects).toEqual([
      { type: 'toast', message: 'Five letters, chef.' },
      { type: 'shake', row: 0 },
    ]);
    expect(r.state.typed).toBe('cra');
  });
  it('rejects a word not in the list', () => {
    const r = submit(fresh(), 'zzzzz');
    expect(r.effects).toEqual([
      { type: 'toast', message: "That one isn't in the pantry." },
      { type: 'shake', row: 0 },
    ]);
    expect(r.state.game?.guesses).toEqual([]);
  });
  it('accepts a valid guess: reveal then save', () => {
    const r = submit(fresh(), 'crane', 5);
    expect(r.state.typed).toBe('');
    expect(r.state.game?.guesses).toEqual(['crane']);
    expect(r.effects.map((e) => e.type)).toEqual(['reveal', 'save']);
    expect(r.effects[0]).toMatchObject({ type: 'reveal', row: 0 });
  });
  it('wins: reveal, won, save, with finishedAt', () => {
    const r = submit(fresh(), 'terse', 9);
    expect(r.state.game).toMatchObject({ status: 'won', finishedAt: 9 });
    expect(r.effects.map((e) => e.type)).toEqual(['reveal', 'won', 'save']);
  });
  it('accepts the answer even when it is not in the valid list', () => {
    const r = submit(fresh('zzzzz'), 'zzzzz');
    expect(r.state.game?.status).toBe('won');
  });
  it('loses on the sixth wrong guess', () => {
    let s = fresh();
    for (const w of ['crane', 'slate', 'moist', 'plumb', 'ghost']) s = submit(s, w).state;
    expect(s.game?.status).toBe('playing');
    const r = submit(s, 'fjord', 77);
    expect(r.state.game).toMatchObject({ status: 'lost', finishedAt: 77 });
    expect(r.effects.map((e) => e.type)).toEqual(['reveal', 'lost', 'save']);
    expect(r.effects[0]).toMatchObject({ row: 5 });
  });
  it('ignores input after finish and with no game', () => {
    const done = submit(fresh(), 'terse').state;
    const r = press(done, 'a', 1, valid);
    expect(r.state).toBe(done);
    expect(r.effects).toEqual([]);
    expect(press({ game: null, typed: '' }, 'a', 1).effects).toEqual([]);
  });
  it('never mutates the input state', () => {
    const s = type(fresh(), 'crane');
    const snap = JSON.stringify(s);
    press(s, 'enter', 1, valid);
    press(s, 'back', 1, valid);
    expect(JSON.stringify(s)).toBe(snap);
    const s0 = fresh();
    const snap0 = JSON.stringify(s0);
    press(s0, 'a', 1);
    expect(JSON.stringify(s0)).toBe(snap0);
  });
});

describe('uid', () => {
  it('combines time and random in base 36', () => {
    expect(uid(36, () => 0.0036)).toBe('10' + '10');
  });
});

describe('resume', () => {
  const date = '2026-11-05';
  const mk = (id: string, mode: GameRecord['mode'], status: GameRecord['status'], startedAt: number) => ({
    ...newGame(id, mode, date, 'terse', 'local'),
    status,
    startedAt,
  });
  it('daily: returns the stored game or a new one', () => {
    const stored = mk('d-' + date, 'daily', 'playing', 1);
    expect(resume({ [stored.id]: stored }, 'daily', date, Math.random, 1)).toBe(stored);
    const g = resume({}, 'daily', date, Math.random, 1);
    expect(g).toMatchObject({ id: 'd-' + date, answer: dailyWord(date), source: 'bundled' });
  });
  it('daily: uses a supplied answer and source', () => {
    const g = resume({}, 'daily', date, Math.random, 1, { answer: 'crane', source: 'endpoint' });
    expect(g).toMatchObject({ answer: 'crane', source: 'endpoint' });
  });
  it('extra/custom: newest open game of the mode', () => {
    const games = {
      a: mk('x-aaa', 'extra', 'playing', 1),
      b: mk('x-bbb', 'extra', 'playing', 9),
      c: mk('x-ccc', 'extra', 'won', 20),
      d: mk('c-ddd', 'custom', 'playing', 3),
    };
    expect(resume(games, 'extra', date, Math.random, 1)?.id).toBe('x-bbb');
    expect(resume(games, 'custom', date, Math.random, 1)?.id).toBe('c-ddd');
  });
  it('extra: new random answer that is not today', () => {
    const daily = dailyWord(date);
    const idx = ANSWERS.indexOf(daily) / ANSWERS.length;
    const seq = [idx, 0.5];
    const g = resume({}, 'extra', date, () => seq.shift() ?? 0.5, 1);
    expect(g?.mode).toBe('extra');
    expect(g?.id.startsWith('x-')).toBe(true);
    expect(g?.answer).toBe(ANSWERS[Math.floor(0.5 * ANSWERS.length)]);
    expect(g?.answer).not.toBe(daily);
  });
  it('custom with nothing open is null', () => {
    expect(resume({}, 'custom', date, Math.random, 1)).toBeNull();
  });
});

describe('startCustom', () => {
  it('starts a game from a trimmed lowercase word', () => {
    const r = startCustom('  CRANE ', '2026-11-05', 1, () => 0.5);
    if ('error' in r) throw new Error('unexpected');
    expect(r.game).toMatchObject({ mode: 'custom', answer: 'crane', source: 'local', date: '2026-11-05' });
    expect(r.game.id.startsWith('c-')).toBe(true);
    expect(r.toast).toBe('Word is in the iron. Go!');
  });
  it('errors on bad words', () => {
    for (const bad of ['', 'abcd', 'abcdef', 'ab1de', 'ab de'])
      expect(startCustom(bad, '2026-11-05', 1, Math.random)).toEqual({
        error: 'It needs exactly five letters, A to Z.',
      });
  });
});

describe('copy helpers', () => {
  it('resultTitle and moreLabel', () => {
    const won = { ...fresh().game!, status: 'won' as const, guesses: ['a', 'b', 'c'] };
    expect(resultTitle(won)).toBe(WIN[3]);
    expect(resultTitle({ ...won, status: 'lost' })).toBe('Burnt that one.');
    expect(moreLabel('custom')).toBe('Pick another word');
    expect(moreLabel('extra')).toBe('Another helping');
    expect(moreLabel('daily')).toBe('Have seconds');
  });
});
