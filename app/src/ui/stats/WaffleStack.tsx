import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { fonts, useTheme } from '../theme';
import { useReducedMotion } from '../useReducedMotion';
import { Card } from './Card';

/** Drops in from above with a fade (prototype `drop`, line 168). */
function Drop({ delay, animate, children }: { delay: number; animate: boolean; children: React.ReactNode }) {
  const [v] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 500,
      delay,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, [animate, delay, v]);
  return (
    <Animated.View
      style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] }}
    >
      {children}
    </Animated.View>
  );
}

export function WaffleStack({ streak }: { streak: number }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const count = Math.min(streak, 9);
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
      <View
        accessible
        accessibilityLabel={streak ? `${streak}-day stack` : 'Empty plate'}
        style={{
          flexDirection: 'column-reverse',
          alignItems: 'center',
          gap: 2,
          minWidth: 104,
          paddingBottom: 6,
          borderBottomWidth: 5,
          borderBottomColor: t.line,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <Drop key={i} delay={i * 70} animate={!reduced}>
            <View
              style={{
                width: 92,
                height: 15,
                borderRadius: 7,
                backgroundColor: t.waffle,
                borderBottomWidth: 3,
                borderBottomColor: t.waffleDark,
                borderLeftWidth: 4,
                borderRightWidth: 4,
                borderLeftColor: t.pocket,
                borderRightColor: t.pocket,
                transform: [{ translateX: i % 2 === 1 ? 3 : 0 }],
              }}
            />
          </Drop>
        ))}
        {count > 0 && (
          <Drop delay={500} animate={!reduced}>
            <View style={{ width: 26, height: 9, borderRadius: 3, backgroundColor: t.butter }} />
          </Drop>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: t.ink }}>
          {streak ? `${streak}-day stack` : 'Empty plate'}
        </Text>
        <Text style={{ color: t.muted, fontSize: 14.5 }}>
          {streak ? 'One waffle for every morning in a row with a win.' : 'Win a word today to start a stack.'}
        </Text>
      </View>
    </Card>
  );
}
