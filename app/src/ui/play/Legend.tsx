import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

/** What the colours mean, shown before the first guess (prototype line 424). */
export function Legend() {
  const t = useTheme();
  const items = [
    { color: t.hit, label: 'right pocket' },
    { color: t.near, label: 'wrong pocket' },
    { color: t.miss, label: 'not in the recipe' },
  ];
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <Text selectable={false} style={{ fontSize: 13, color: t.muted }}>
            {i.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 14, height: 14, borderRadius: 4 },
});
