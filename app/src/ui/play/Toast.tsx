import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useReducedMotion } from '../useReducedMotion';

const native = Platform.OS !== 'web';

/** Pill under the header, visible 2.2 s (prototype lines 149-150, 367-368). `id` changes with every new message. */
export function Toast({ message, id }: { message: string; id: number }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!id) return;
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
    const dur = reduced ? 0 : 200;
    Animated.timing(v, { toValue: 1, duration: dur, useNativeDriver: native }).start();
    const timer = setTimeout(
      () => Animated.timing(v, { toValue: 0, duration: dur, useNativeDriver: native }).start(),
      2200,
    );
    return () => clearTimeout(timer);
  }, [id, message, reduced, v]);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.pill,
          {
            backgroundColor: t.ink,
            opacity: v,
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          },
        ]}
      >
        <Text selectable={false} style={{ color: t.table, fontWeight: '800', fontSize: 14.5, textAlign: 'center' }}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 20, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  pill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, maxWidth: '100%' },
});
