import { memo } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Mark } from '../../game/score';
import { useTheme } from '../theme';

// Prototype lines 339-340: '+' is Enter, '-' is delete.
const ROWS = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'];
const MARKED = {
  hit: { fg: '#fff' },
  near: { fg: '#35200a' },
  miss: { fg: '#f6eadb' },
};

interface Props {
  marks: Record<string, Mark>;
  keyHeight: number;
  onKey: (key: string) => void;
  onLayout: (e: LayoutChangeEvent) => void;
}

function KeyboardView({ marks, keyHeight, onKey, onLayout }: Props) {
  const t = useTheme();
  return (
    <View
      accessibilityLabel="Keyboard"
      onLayout={onLayout}
      style={[styles.kb, { backgroundColor: t.table, borderTopColor: t.line }]}
    >
      {ROWS.map((row) => (
        <View key={row} style={styles.row}>
          {[...row].map((ch) => {
            const wide = ch === '+' || ch === '-';
            const key = ch === '+' ? 'enter' : ch === '-' ? 'back' : ch;
            const mark = wide ? undefined : marks[ch];
            const bg = mark ? t[mark] : t.plate;
            const fg = mark ? MARKED[mark].fg : t.ink;
            return (
              <Pressable
                key={ch}
                accessibilityRole="button"
                accessibilityLabel={ch === '-' ? 'Delete letter' : ch === '+' ? 'Enter' : ch}
                onPress={() => onKey(key)}
                style={({ pressed }) => [
                  styles.key,
                  wide && styles.wide,
                  {
                    height: keyHeight,
                    backgroundColor: bg,
                    borderColor: mark ? 'transparent' : t.line,
                    boxShadow: pressed ? 'none' : `0 2px 0 ${t.line}`,
                    opacity: mark === 'miss' ? 0.75 : 1,
                    transform: [{ translateY: pressed ? 2 : 0 }],
                  },
                ]}
              >
                <Text selectable={false} style={[styles.label, wide && styles.wideLabel, { color: fg }]}>
                  {ch === '-' ? '⌫' : ch === '+' ? 'Enter' : ch.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export const Keyboard = memo(KeyboardView);

const styles = StyleSheet.create({
  kb: { marginHorizontal: -16, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 6, gap: 6, borderTopWidth: 1 },
  row: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  key: { flex: 1, maxWidth: 44, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wide: { maxWidth: 68, flex: 1.6 },
  label: { fontWeight: '800', fontSize: 16 },
  wideLabel: { fontSize: 12.5 },
});
