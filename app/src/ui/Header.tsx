import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Logo } from './Logo';
import { fonts, useTheme } from './theme';

export type Tab = 'play' | 'history' | 'stats';
export const TABS: { id: Tab; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
];

export function Header({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  // clamp(19px, 5.6vw, 26px), 22px on narrow screens (prototype lines 58, 126).
  const fontSize = width <= 380 ? 22 : Math.max(19, Math.min(26, width * 0.056));
  const padX = width <= 380 ? 9 : 12;
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Logo size={32} spin />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{ fontFamily: fonts.display, fontSize, lineHeight: fontSize, color: t.syrup, letterSpacing: 0.2 }}
        >
          Words <Text style={{ color: t.berry }}>&</Text> Waffles
        </Text>
      </View>
      <View
        accessibilityRole="tablist"
        style={[styles.nav, { backgroundColor: t.plate, borderColor: t.line }]}
      >
        {TABS.map(({ id, label }) => {
          const on = id === tab;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onTab(id)}
              style={[styles.pill, { paddingHorizontal: padX }, on && { backgroundColor: t.berry }]}
            >
              <Text style={{ fontWeight: '600', fontSize: 14, color: on ? t.onBerry : t.muted }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10, rowGap: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nav: { flexDirection: 'row', gap: 2, borderWidth: 1, borderRadius: 999, padding: 3 },
  pill: { paddingVertical: 6, borderRadius: 999 },
});
