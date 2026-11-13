import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type HostInstance, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { type Kind, type Particle, SEGMENTS, makeParticles } from './confetti';
import { useReducedMotion } from '../useReducedMotion';

const COUNT = 40;
const DURATION = 4200;

/** Confetti of berries, butter, syrup, waffle bits and strawberries on a win (prototype party, lines 463-484). */
export function Toppings({ burst }: { burst: number }) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const anchor = useRef<HostInstance>(null);
  const [t] = useState(() => new Animated.Value(0));
  const [run, setRun] = useState<{ ox: number; oy: number; ps: Particle[] } | null>(null);

  useEffect(() => {
    if (!burst || reduced) return;
    // The overlay covers the whole window, so find where this view sits in it.
    anchor.current?.measureInWindow((x, y) => {
      t.setValue(0);
      setRun({ ox: x || 0, oy: y || 0, ps: makeParticles(COUNT, width, height, Math.random) });
    });
  }, [burst, reduced, width, height, t]);

  useEffect(() => {
    if (!run) return;
    const anim = Animated.timing(t, { toValue: 1, duration: DURATION, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' });
    anim.start(({ finished }) => finished && setRun(null));
    return () => anim.stop();
  }, [run, t]);

  const input = Array.from({ length: SEGMENTS + 1 }, (_, i) => i / SEGMENTS);
  return (
    <View ref={anchor} pointerEvents="none" style={StyleSheet.absoluteFill} collapsable={false}>
      {run && (
        <View pointerEvents="none" style={{ position: 'absolute', left: -run.ox, top: -run.oy, width, height, zIndex: 4 }}>
          {run.ps.map((p, i) => {
            const s = p.r * 3;
            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: -s / 2,
                  top: -s / 2,
                  width: s,
                  height: s,
                  transform: [
                    { translateX: t.interpolate({ inputRange: input, outputRange: p.x }) },
                    { translateY: t.interpolate({ inputRange: input, outputRange: p.y }) },
                    { rotate: t.interpolate({ inputRange: input, outputRange: p.a.map((a) => `${a}deg`) }) },
                  ],
                }}
              >
                <Piece kind={p.kind} size={s} />
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** One shape, drawn in units of r inside a 3r box (lines 472-476). */
function Piece({ kind, size }: { kind: Kind; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="-1.5 -1.5 3 3">
      {kind === 'berry' && (
        <>
          <Circle r={0.8} fill="#3d4fb3" />
          <Circle cy={-0.2} r={0.25} fill="#232c6e" />
        </>
      )}
      {kind === 'butter' && <Rect x={-1} y={-0.7} width={2} height={1.4} fill="#ffe37a" />}
      {kind === 'syrup' && <Path d="M0 -1.3Q1 .2 0 1Q-1 .2 0 -1.3Z" fill="#a5561a" />}
      {kind === 'straw' && (
        <>
          <Path d="M-1 -.5Q0 -1.2 1 -.5Q.6 1 0 1.2Q-.6 1 -1 -.5Z" fill="#e0403f" />
          <Rect x={-0.5} y={-1.1} width={1} height={0.35} fill="#3c9a57" />
        </>
      )}
      {kind === 'waffle' && (
        <>
          <Rect x={-1} y={-1} width={2} height={2} fill="#e2a23e" />
          <Rect x={-0.12} y={-1} width={0.24} height={2} fill="rgba(0,0,0,.2)" />
          <Rect x={-1} y={-0.12} width={2} height={0.24} fill="rgba(0,0,0,.2)" />
        </>
      )}
    </Svg>
  );
}
