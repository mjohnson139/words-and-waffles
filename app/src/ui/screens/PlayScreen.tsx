import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { type HostInstance, type LayoutChangeEvent, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type PlayState, pickGame, press } from '../../game/play';
import type { GameRecord, Mode, Source } from '../../game/record';
import { type Mark, keyMarks } from '../../game/score';
import { BAD_LINK, openShared, parseShareLink } from '../../game/shareLink';
import { streaks } from '../../game/stats';
import * as haptics from '../haptics';
import { fit } from '../fit';
import { Board, type Anim } from '../play/Board';
import { Keyboard } from '../play/Keyboard';
import { Legend } from '../play/Legend';
import { ModeChips } from '../play/ModeChips';
import { Mug } from '../play/Mug';
import { PickWord } from '../play/PickWord';
import { ResultCard } from '../play/ResultCard';
import { REVEAL_DONE_MS, FLIP_HALF_MS, FLIP_STAGGER_MS, boardRows } from '../play/rows';
import { Streak } from '../play/Streak';
import { Toast } from '../play/Toast';
import { Toppings } from '../play/Toppings';
import { useHardwareKeyboard } from '../play/useHardwareKeyboard';
import { useReducedMotion } from '../useReducedMotion';

interface Props {
  games: Record<string, GameRecord>;
  saveGame: (g: GameRecord) => void;
  ready: boolean;
  /** Today's local date (App's useToday); a change is the day rollover. */
  date: string;
  /** The day's word from the endpoint (or bundled), or null while it loads. */
  dailyAnswer: { date: string; answer: string; source: Source } | null;
  /** A '#w=' share link to open once the games are loaded (F1); onLink clears it. */
  link: { fragment: string; id: number } | null;
  onLink: () => void;
}

const NO_MARKS: Record<string, Mark> = {};

export function PlayScreen({ games, saveGame, ready, date, dailyAnswer, link, onLink }: Props) {
  const calm = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('daily');
  const [play, setPlayState] = useState<PlayState>({ game: null, typed: '' });
  const [busy, setBusyState] = useState(false);
  const playRef = useRef(play);
  const busyRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = useRef(0);
  const calmRef = useRef(calm);
  const saveRef = useRef(saveGame);
  // A reload skipped while a reveal was running: 'daily' = only if in daily mode.
  const pending = useRef<'any' | 'daily' | null>(null);
  const [loading, setLoading] = useState(false);

  const [pop, setPop] = useState<(Anim & { col: number }) | null>(null);
  const [shake, setShake] = useState<Anim | null>(null);
  const [reveal, setReveal] = useState<(Anim & { marks: Mark[] }) | null>(null);
  const [hop, setHop] = useState<Anim | null>(null);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState({ message: '', id: 0 });

  const [boardTop, setBoardTop] = useState(150);
  const [kbHeight, setKbHeight] = useState(190);
  const boardBox = useRef<HostInstance>(null);

  const setPlay = useCallback((p: PlayState) => {
    playRef.current = p;
    setPlayState(p);
  }, []);
  const setBusy = useCallback((b: boolean) => {
    busyRef.current = b;
    setBusyState(b);
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const say = useCallback((message: string) => setToast({ message, id: ++seq.current }), []);

  const show = (m: Mode, picked: GameRecord | null | 'loading') => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    pending.current = null;
    setBusy(false);
    setReveal(null);
    setHop(null);
    setMode(m);
    setLoading(picked === 'loading');
    setPlay({ game: picked === 'loading' ? null : picked, typed: '' });
  };

  // Port of loadGame (prototype lines 319-327). The same game with nothing new
  // in it is kept as it is, so a reload never wipes typed-but-unsent letters.
  const load = (m: Mode) => {
    const picked = pickGame({ games, mode: m, date, daily: dailyAnswer, rand: Math.random, now: Date.now() });
    const cur = playRef.current.game;
    if (
      m === mode &&
      cur &&
      picked &&
      picked !== 'loading' &&
      cur.id === picked.id &&
      cur.answer === picked.answer &&
      cur.guesses.length === picked.guesses.length
    ) {
      return;
    }
    show(m, picked);
  };

  // Saved games arrive after the first render; the server's word and the day
  // rollover may arrive later still. A reload that lands mid-reveal waits.
  const reload = useEffectEvent((only: 'any' | 'daily') => {
    if (!ready || (only === 'daily' && mode !== 'daily')) return;
    if (busyRef.current) pending.current = pending.current === 'any' ? 'any' : only;
    else load(mode);
  });
  const answer = dailyAnswer?.answer;
  const source = dailyAnswer?.source;
  const answerDate = dailyAnswer?.date;
  useEffect(() => {
    reload('any');
  }, [ready]);
  useEffect(() => {
    reload('daily');
  }, [date, answerDate, answer, source]);
  // A share link (F1): its game replaces whatever is on the board, even mid-reveal;
  // a bad link shows Today.
  const openLink = useEffectEvent(() => {
    if (!ready || !link) return;
    const shared = parseShareLink(link.fragment);
    const opened = shared ? openShared(games, shared, date) : null;
    if (opened) show('custom', opened.game);
    else load('daily');
    say(opened?.toast ?? BAD_LINK);
    onLink();
  });
  useEffect(() => {
    // The link arrives from outside React (the URL) and is applied exactly once, then cleared.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openLink();
  }, [ready, link?.id]);
  useEffect(() => {
    if (!busy && pending.current) {
      const only = pending.current;
      pending.current = null;
      reload(only);
    }
  }, [busy]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const finish = useCallback((outcome: 'won' | 'lost' | null, row: number) => {
    timers.current = []; // the reveal's timers have all fired by now
    setBusy(false);
    setReveal(null);
    if (outcome === 'won') {
      setHop({ row, id: ++seq.current });
      setBurst(++seq.current);
      haptics.win();
    } else if (outcome === 'lost') haptics.lose();
  }, [setBusy]);

  useEffect(() => {
    calmRef.current = calm;
    saveRef.current = saveGame;
  });

  // Stable, so the memoised Keyboard doesn't re-render on every keystroke.
  const onKey = useCallback((key: string) => {
    if (busyRef.current) return;
    const { state, effects } = press(playRef.current, key, Date.now());
    if (state !== playRef.current) setPlay(state);
    let outcome: 'won' | 'lost' | null = null;
    let row = 0;
    let revealing = false;
    for (const e of effects) {
      if (e.type === 'pop') {
        setPop({ row: e.row, col: e.col, id: ++seq.current });
        haptics.tapKey();
      } else if (e.type === 'shake') {
        setShake({ row: e.row, id: ++seq.current });
        haptics.bad();
      } else if (e.type === 'toast') say(e.message);
      else if (e.type === 'reveal') {
        row = e.row;
        if (!calmRef.current) {
          revealing = true;
          setBusy(true);
          setReveal({ row: e.row, id: ++seq.current, marks: e.marks });
          for (let c = 0; c < 5; c++) later(haptics.revealTile, c * FLIP_STAGGER_MS + FLIP_HALF_MS);
        }
      } else if (e.type === 'won') {
        outcome = 'won';
        row = e.row;
      } else if (e.type === 'lost') outcome = 'lost';
      else if (e.type === 'save') saveRef.current(e.game);
    }
    if (revealing) later(() => finish(outcome, row), REVEAL_DONE_MS);
    else if (outcome) finish(outcome, row);
  }, [finish, later, say, setBusy, setPlay]);
  useHardwareKeyboard(onKey);

  const onMode = (m: Mode) => {
    if (!busyRef.current) load(m);
  };
  const onMore = () => {
    if (play.game?.mode === 'custom') {
      setLoading(false);
      setPlay({ game: null, typed: '' });
      setMode('custom');
    } else load('extra');
  };

  const measure = () =>
    boardBox.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y)) setBoardTop(Math.round(y));
    });
  useEffect(() => {
    const id = setTimeout(measure, 50);
    return () => clearTimeout(id);
  }, [width, height]);

  const { game, typed } = play;
  const showKb = !loading && !!game && (game.status === 'playing' || busy);
  const onKbLayout = (e: LayoutChangeEvent) => setKbHeight(e.nativeEvent.layout.height);
  const { tile, key } = fit({ width, height, boardTop, keyboardHeight: kbHeight + insets.bottom });

  // Keys take on their colours once a row has finished flipping (prototype paintKeys after done()).
  const doneGuesses = game ? (reveal ? game.guesses.slice(0, reveal.row) : game.guesses) : [];
  const marks = game ? keyMarks(doneGuesses, game.answer) : NO_MARKS;
  const left = game ? 6 - game.guesses.length : 6;
  const cold = left === 0 || !game || game.status === 'lost';

  let below = null;
  if (ready && !loading) {
    if (!game) below = <PickWord onToast={say} onStart={(g) => setPlay({ game: g, typed: '' })} />;
    else if (game.status === 'playing') below = game.guesses.length ? null : <Legend />;
    else if (!busy) below = <ResultCard key={game.id} game={game} onToast={say} onMore={onMore} />;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.bar} onLayout={measure}>
          <ModeChips mode={mode} onMode={onMode} />
          <View style={styles.side}>
            <Streak days={streaks(games, date).now} />
            <Mug left={left} cold={cold} />
          </View>
        </View>
        <View ref={boardBox} onLayout={measure} collapsable={false}>
          <Board
            rows={boardRows(game, typed, reveal?.row ?? null)}
            size={tile}
            pop={pop}
            shake={shake}
            reveal={reveal}
            hop={hop}
            dim={!game}
            calm={calm}
          />
        </View>
        {below}
      </ScrollView>
      {showKb && <Keyboard marks={marks} keyHeight={key} onKey={onKey} onLayout={onKbLayout} />}
      <Toast message={toast.message} id={toast.id} />
      <Toppings burst={burst} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
});
