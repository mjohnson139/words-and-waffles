import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import type { Mark } from '../../game/score';
import { useTheme } from '../theme';
import { FLIP_STAGGER_MS, type RowView } from './rows';
import { Tile } from './Tile';

const native = Platform.OS !== 'web';
const MARK_WORD: Record<Mark, string> = { hit: 'right pocket', near: 'wrong pocket', miss: 'not in the recipe' };

export interface Anim {
  row: number;
  id: number;
}

interface Props {
  rows: RowView[];
  size: number;
  /** Tile that just got a letter. */
  pop: (Anim & { col: number }) | null;
  shake: Anim | null;
  /** Row being revealed, with the marks its tiles flip to. */
  reveal: (Anim & { marks: Mark[] }) | null;
  hop: Anim | null;
  dim: boolean;
  calm: boolean;
}

export function Board({ rows, size, pop, shake, reveal, hop, dim, calm }: Props) {
  const t = useTheme();
  return (
    <View
      accessibilityLabel="Guesses"
      style={[
        styles.board,
        { backgroundColor: t.waffle, opacity: dim ? 0.35 : 1 },
        { boxShadow: `inset 0 3px 0 rgba(255,255,255,.28), 0 6px 0 ${t.waffleDark}, 0 14px 22px rgba(0,0,0,.2)` },
      ]}
    >
      <View style={[styles.butter, { backgroundColor: t.butter }]} pointerEvents="none" />
      {rows.map((row, r) => (
        <ShakeRow key={r} shakeId={shake?.row === r ? shake.id : 0} calm={calm}>
          {Array.from({ length: 5 }, (_, c) => {
            const letter = row.letters[c] ?? '';
            const mark = row.marks?.[c] ?? null;
            const revealing = reveal?.row === r;
            return (
              <Tile
                key={c}
                size={size}
                letter={letter}
                mark={mark}
                popId={pop && pop.row === r && pop.col === c ? pop.id : 0}
                flip={revealing && !calm ? { id: reveal.id, delay: c * FLIP_STAGGER_MS, mark: reveal.marks[c] } : null}
                hop={hop?.row === r && !calm ? { id: hop.id, delay: c * 80 } : null}
                label={letter ? `${letter.toUpperCase()}${mark ? ', ' + MARK_WORD[mark] : ''}` : 'empty'}
              />
            );
          })}
        </ShakeRow>
      ))}
      <Drips calm={calm} />
    </View>
  );
}

/** Row shake (400 ms, prototype keyframes line 121). */
function ShakeRow({ shakeId, calm, children }: { shakeId: number; calm: boolean; children: React.ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!shakeId || calm) return;
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.linear, useNativeDriver: native });
    anim.start();
    return () => anim.stop();
  }, [shakeId, calm, v]);
  const translateX = v.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -7, 7, -5, 4, 0] });
  return <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>{children}</Animated.View>;
}

/** Two syrup drips under the slab, growing in from the top (lines 108-109). */
function Drips({ calm }: { calm: boolean }) {
  const [v] = useState(() => new Animated.Value(calm ? 1 : 0));
  useEffect(() => {
    if (calm) {
      v.setValue(1);
      return;
    }
    const anim = Animated.timing(v, { toValue: 1, delay: 300, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: native });
    anim.start();
    return () => anim.stop();
  }, [calm, v]);
  // scaleY about the top edge: scale about the centre, then shift up by half the lost height.
  const grow = (h: number) => [
    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-h / 2, 0] }) },
    { scaleY: v },
  ];
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.drip, { left: 34, top: '100%', width: 15, height: 24, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, transform: grow(24) }]} />
      <Animated.View pointerEvents="none" style={[styles.drip, { left: 62, top: '100%', marginTop: -7, width: 11, height: 20, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, transform: grow(20) }]} />
    </>
  );
}

const styles = StyleSheet.create({
  board: { alignSelf: 'center', marginTop: 12, marginBottom: 14, padding: 11, gap: 7, borderRadius: 24 },
  row: { flexDirection: 'row', gap: 7 },
  butter: {
    position: 'absolute',
    top: -16,
    right: 26,
    width: 38,
    height: 24,
    borderRadius: 6,
    transform: [{ rotate: '-8deg' }],
    boxShadow: 'inset 0 -5px 0 rgba(0,0,0,.12), 0 2px 0 rgba(0,0,0,.18)',
    zIndex: 1,
  },
  drip: { position: 'absolute', backgroundColor: '#8a4513' },
});
