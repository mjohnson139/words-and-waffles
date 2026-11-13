import { Text, View, useWindowDimensions } from 'react-native';

import { fonts, useTheme } from '../theme';

/** Four tiles; two columns under 380px wide (prototype line 197). */
export function StatTiles({ items }: { items: { value: string; label: string }[] }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const basis = width < 380 ? '48%' : '23.5%';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
      {items.map((it) => (
        <View
          key={it.label}
          accessible
          accessibilityLabel={`${it.value} ${it.label}`}
          style={{
            width: basis,
            backgroundColor: t.plate,
            borderColor: t.line,
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 6,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: t.ink, fontVariant: ['tabular-nums'] }}>
            {it.value}
          </Text>
          <Text style={{ fontSize: 11.5, color: t.muted, marginTop: 2 }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
