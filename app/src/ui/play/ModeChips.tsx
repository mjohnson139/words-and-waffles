import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Mode } from '../../game/record';
import { useTheme } from '../theme';

const CHIPS: { mode: Mode; label: string }[] = [
  { mode: 'daily', label: 'Today' },
  { mode: 'extra', label: 'Seconds' },
  { mode: 'custom', label: 'Pick a word' },
];

export function ModeChips({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Which word" style={styles.modes}>
      {CHIPS.map(({ mode: m, label }) => {
        const on = m === mode;
        return (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onMode(m)}
            style={[
              styles.chip,
              { backgroundColor: t.plate, borderColor: on ? t.syrup : t.line },
              on && { boxShadow: `0 2px 0 ${t.syrup}` },
            ]}
          >
            <Text selectable={false} style={{ fontSize: 13.5, fontWeight: '600', color: on ? t.syrup : t.muted }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  chip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1.5 },
});
