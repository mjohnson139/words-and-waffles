import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Path, Rect } from 'react-native-svg';

import { useTheme } from '../theme';
import { useReducedMotion } from '../useReducedMotion';

const native = Platform.OS !== 'web';
const W = 38;
const H = 44;

/** Coffee mug (prototype lines 227-234): one sip gone per guess. */
export function Mug({ left, cold }: { left: number; cold: boolean }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const target = (22 * left) / 6;
  const [level] = useState(() => new Animated.Value(target));
  const [h, setH] = useState(target);
  const first = useRef(true);

  useEffect(() => {
    const id = level.addListener(({ value }) => setH(value));
    return () => level.removeListener(id);
  }, [level]);

  // Coffee drops over .5 s with the prototype's springy curve (line 78).
  useEffect(() => {
    if (reduced || first.current) {
      first.current = false;
      level.setValue(target);
      return;
    }
    const anim = Animated.timing(level, {
      toValue: target,
      duration: 500,
      easing: Easing.bezier(0.3, 1.4, 0.5, 1),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [target, reduced, level]);

  const ch = Math.max(0, h);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${left} ${left === 1 ? 'sip' : 'sips'} of coffee left`}
      style={{ width: W, height: H }}
    >
      <Svg width={W} height={H} viewBox="0 0 44 50">
        <Path d="M32 24h4a5 5 0 0 1 0 12h-4" fill="none" stroke={t.berry} strokeWidth={4} />
        <Rect x={5} y={16} width={29} height={30} rx={7} fill={t.berry} />
        <Rect x={9} y={20} width={21} height={22} rx={4} fill={t.plate} />
        <ClipPath id="cup">
          <Rect x={9} y={20} width={21} height={22} rx={4} />
        </ClipPath>
        <Rect clipPath="url(#cup)" x={9} y={42 - ch} width={21} height={ch} fill="#6b3d1e" />
      </Svg>
      {!cold && !reduced && (
        <>
          <Steam d="M15 12c-3-3 3-5 0-9" delay={0} color={t.muted} />
          <Steam d="M24 12c-3-3 3-5 0-9" delay={1100} color={t.muted} />
        </>
      )}
    </View>
  );
}

/** Steam wisp: 2.6 s loop, fades in then out while drifting up (line 80). */
function Steam({ d, delay, color }: { d: string; delay: number; color: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.75, 0] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [4, -6] }) }],
        },
      ]}
    >
      <Svg width={W} height={H} viewBox="0 0 44 50">
        <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
