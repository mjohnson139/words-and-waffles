import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useReducedMotion } from './useReducedMotion';

/** Waffle logo from the prototype symbol (lines 202-207). */
export function Logo({ size = 32, spin = false }: { size?: number; spin?: boolean }) {
  const reduced = useReducedMotion();
  const [p] = useState(() => new Animated.Value(spin ? 0 : 1));

  useEffect(() => {
    if (!spin || reduced) {
      p.setValue(1);
      return;
    }
    p.setValue(0);
    // Prototype line 73-74: 1s, cubic-bezier(.3,1.4,.5,1).
    Animated.timing(p, {
      toValue: 1,
      duration: 1000,
      easing: Easing.bezier(0.3, 1.4, 0.5, 1),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [spin, reduced, p]);

  const rotate = p.interpolate({ inputRange: [0, 1], outputRange: ['-200deg', '0deg'] });
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }, { scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
        <Circle cx={20} cy={20} r={18} fill="#e2a23e" stroke="#b87a22" strokeWidth={2} />
        <G stroke="#b87a22" strokeWidth={2.6} strokeLinecap="round">
          <Path d="M11 5.5v29M20 3v34M29 5.5v29M5.5 11h29M3 20h34M5.5 29h29" />
        </G>
        <Path
          d="M9 17c5-6 16-8 22-1 3 4-1 6-2 9s-3 5-5 2-4 3-7 1-3-4-6-4-5-4-2-7z"
          fill="#8a4513"
          opacity={0.92}
        />
        <Rect x={15} y={13.5} width={11} height={9} rx={2} fill="#ffe37a" rotation={-10} origin="20, 18" />
      </Svg>
    </Animated.View>
  );
}
