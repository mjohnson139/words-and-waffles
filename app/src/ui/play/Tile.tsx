import { memo, useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text } from 'react-native';

import type { Mark } from '../../game/score';
import { FLIP_HALF_MS } from './rows';
import { fonts, useTheme } from '../theme';

export interface FlipSpec {
  id: number;
  delay: number;
  mark: Mark;
}
export interface HopSpec {
  id: number;
  delay: number;
}

interface Props {
  letter: string;
  mark: Mark | null;
  size: number;
  popId: number;
  flip: FlipSpec | null;
  hop: HopSpec | null;
  label: string;
}

const native = Platform.OS !== 'web';
// Tile text and borders are fixed colours in the prototype (lines 101-106).
const FG = { pocket: '#fff6e0', hit: '#fff', near: '#35200a', miss: '#f6eadb' };
const SHADOW = {
  pocket: 'inset 0 4px 0 rgba(0,0,0,.17), inset 0 -2px 0 rgba(255,255,255,.2)',
  hit: 'inset 0 -4px 0 rgba(0,0,0,.16)',
  near: 'inset 0 -4px 0 rgba(0,0,0,.13)',
  miss: 'inset 0 4px 0 rgba(0,0,0,.22)',
};

function TileView({ letter, mark, size, popId, flip, hop, label }: Props) {
  const t = useTheme();
  const [pop] = useState(() => new Animated.Value(1));
  const [flipV] = useState(() => new Animated.Value(0));
  const [hopV] = useState(() => new Animated.Value(0));
  const [late, setLate] = useState<{ id: number; mark: Mark } | null>(null);

  const flipId = flip?.id ?? 0;
  const flipDelay = flip?.delay ?? 0;
  const flipMark = flip?.mark ?? null;
  const hopId = hop?.id ?? 0;
  const hopDelay = hop?.delay ?? 0;

  // Pop on type: 130 ms, scale .82 -> 1.08 -> 1 (line 118).
  useEffect(() => {
    if (!popId) return;
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [popId, pop]);

  // Flip on reveal: rotateX 0 -> 90 -> 0, colour switches at the midpoint (lines 119, 379).
  useEffect(() => {
    if (!flipId || !flipMark) return;
    flipV.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(flipDelay),
      Animated.timing(flipV, { toValue: 1, duration: FLIP_HALF_MS, easing: Easing.in(Easing.quad), useNativeDriver: native }),
      Animated.timing(flipV, { toValue: 0, duration: FLIP_HALF_MS, easing: Easing.out(Easing.quad), useNativeDriver: native }),
    ]);
    anim.start();
    const timer = setTimeout(() => setLate({ id: flipId, mark: flipMark }), flipDelay + FLIP_HALF_MS);
    return () => {
      anim.stop();
      clearTimeout(timer);
    };
  }, [flipId, flipDelay, flipMark, flipV]);

  // Hop on win: translateY -16 + rotate -4deg at 40%, then back (line 120).
  useEffect(() => {
    if (!hopId) return;
    hopV.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(hopDelay),
      Animated.timing(hopV, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.timing(hopV, { toValue: 0, duration: 360, easing: Easing.bounce, useNativeDriver: native }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [hopId, hopDelay, hopV]);

  const shown: Mark | null = mark ?? (late && late.id === flipId ? late.mark : null);
  const kind = shown ?? 'pocket';
  const bg = shown ? t[shown] : t.pocket;

  const motion = {
    transform: [
      { perspective: 600 },
      { rotateX: flipV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
      { scale: pop.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.82, 1.08, 1] }) },
      { translateY: hopV.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
      { rotate: hopV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) },
    ],
  };
  const look = {
    width: size,
    height: size,
    borderColor: !shown && letter ? '#fff1cf' : 'transparent',
    backgroundColor: bg,
    boxShadow: SHADOW[kind],
  };

  return (
    <Animated.View accessible accessibilityLabel={label} style={[styles.tile, look, motion]}>
      <Text
        selectable={false}
        style={[styles.letter, { fontFamily: fonts.display, fontSize: size * 0.56, lineHeight: size * 0.56, color: FG[kind] }]}
      >
        {letter.toUpperCase()}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  letter: { textAlign: 'center', includeFontPadding: false },
});

export const Tile = memo(TileView);
