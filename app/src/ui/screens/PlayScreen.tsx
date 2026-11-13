import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { type HostInstance, type LayoutChangeEvent, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { today } from '../../game/dates';
import { type PlayState, press, resume } from '../../game/play';
import type { GameRecord, Mode, Source } from '../../game/record';
import { type Mark, keyMarks } from '../../game/score';
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
  /** The server's word for today (wired in step N1); defaults to the bundled word. */
  /** The day's word from the endpoint (or bundled); used only when its date is today. */
  dailyAnswer?: { date: string; answer: string; source: Source };
}

const NO_MARKS: Record<string, Mark> = {};

export function PlayScreen({ games, saveGame, ready, dailyAnswer }: Props) {
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
  const daySeen = useRef(today());

  const [pop, setPop] = useState<(Anim & { col: number }) | null>(null);
  const [shake, setShake] = useState<Anim | null>(null);
  const [reveal, setReveal] = useState<(Anim & { marks: Mark[] }) | null>(null);
  const [hop, setHop] = useState<Anim | null>(null);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState({ message: '', id: 0 });

  const [boardTop, setBoardTop] = useState(150);
  const [kbHeight, setKbHeight] = useState(190);
  const boardBox = useRef<HostInstance>(null);

  const setPlay = (p: PlayState) => {
    playRef.current = p;
    setPlayState(p);
  };
  const setBusy = (b: boolean) => {
    busyRef.current = b;
    setBusyState(b);
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const say = (message: string) => setToast({ message, id: ++seq.current });

  // Port of loadGame (prototype lines 319-327).
  const load = (m: Mode) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBusy(false);
    setReveal(null);
    setHop(null);
    setMode(m);
    const date = today();
    const daily = dailyAnswer?.date === date ? dailyAnswer : undefined;
    setPlay({ game: resume(games, m, date, Math.random, Date.now(), daily), typed: '' });
  };

  // Saved games arrive after the first render; the server's word may arrive later still.
  const reload = useEffectEvent(() => {
    if (ready && !busyRef.current) load(mode);
  });
  const answer = dailyAnswer?.answer;
  const source = dailyAnswer?.source;
  useEffect(() => {
    reload();
  }, [ready, answer, source]);

  // Day rollover (prototype tick, line 458).
  const rollover = useEffectEvent(() => {
    if (today() === daySeen.current) return;
    daySeen.current = today();
    if (mode === 'daily' && !busyRef.current) load('daily');
  });
  useEffect(() => {
    const id = setInterval(rollover, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const finish = (outcome: 'won' | 'lost' | null, row: number) => {
    setBusy(false);
    setReveal(null);
    if (outcome === 'won') {
      setHop({ row, id: ++seq.current });
      setBurst(++seq.current);
      haptics.win();
    } else if (outcome === 'lost') haptics.lose();
  };

  const onKey = (key: string) => {
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
        if (!calm) {
          revealing = true;
          setBusy(true);
          setReveal({ row: e.row, id: ++seq.current, marks: e.marks });
          for (let c = 0; c < 5; c++) later(haptics.revealTile, c * FLIP_STAGGER_MS + FLIP_HALF_MS);
        }
      } else if (e.type === 'won') {
        outcome = 'won';
        row = e.row;
      } else if (e.type === 'lost') outcome = 'lost';
      else if (e.type === 'save') saveGame(e.game);
    }
    if (revealing) later(() => finish(outcome, row), REVEAL_DONE_MS);
    else if (outcome) finish(outcome, row);
  };
  useHardwareKeyboard(onKey);

  const onMode = (m: Mode) => {
    if (!busyRef.current) load(m);
  };
  const onMore = () => {
    if (play.game?.mode === 'custom') {
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
  const showKb = !!game && (game.status === 'playing' || busy);
  const onKbLayout = (e: LayoutChangeEvent) => setKbHeight(e.nativeEvent.layout.height);
  const { tile, key } = fit({ width, height, boardTop, keyboardHeight: kbHeight + insets.bottom });

  // Keys take on their colours once a row has finished flipping (prototype paintKeys after done()).
  const doneGuesses = game ? (reveal ? game.guesses.slice(0, reveal.row) : game.guesses) : [];
  const marks = game ? keyMarks(doneGuesses, game.answer) : NO_MARKS;
  const left = game ? 6 - game.guesses.length : 6;
  const cold = left === 0 || !game || game.status === 'lost';

  let below = null;
  if (ready) {
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
            <Streak days={streaks(games, today()).now} />
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
