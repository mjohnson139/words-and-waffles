import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useReducedMotion } from '../useReducedMotion';
import { Card } from './Card';
import { barPercent } from './bars';

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const pct = barPercent(value, max);
  const [w] = useState(() => new Animated.Value(reduced ? pct : 0));
  useEffect(() => {
    if (reduced) {
      w.setValue(pct);
      return;
    }
    Animated.timing(w, {
      toValue: pct,
      duration: 600,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: false, // width cannot use the native driver
    }).start();
  }, [pct, reduced, w]);
  const zero = value === 0;
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <Text style={{ width: 44, fontSize: 13.5, fontWeight: '600', color: t.ink, fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' }),
            minWidth: 22,
            height: 20,
            borderRadius: 6,
            backgroundColor: zero ? t.line : t.syrup,
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingRight: 6,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: zero ? t.muted : t.plate }}>{value}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export function Distribution({ dist }: { dist: number[] }) {
  const max = Math.max(1, ...dist);
  return (
    <Card style={{ gap: 5 }}>
      {dist.map((v, i) => (
        <Row key={i} label={i < 6 ? String(i + 1) : 'Burnt'} value={v} max={max} />
      ))}
    </Card>
  );
}
