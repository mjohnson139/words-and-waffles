import { Text, View } from 'react-native';

import { fonts, useTheme } from '../theme';

export interface Fact {
  label: string;
  value: string;
  /** Render the value in the display font, uppercase (prototype `.word`). */
  word?: boolean;
  /** Muted trailing text instead of a bold value (opening words). */
  detail?: string;
}

export function Facts({ items }: { items: Fact[] }) {
  const t = useTheme();
  return (
    <View>
      {items.map((f, i) => (
        <View
          key={f.label + i}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            paddingVertical: 8,
            borderBottomWidth: i === items.length - 1 ? 0 : 1,
            borderBottomColor: t.line,
            borderStyle: 'dashed',
          }}
        >
          <Text style={{ fontSize: 14.5, color: t.muted, flexShrink: 1 }}>{f.label}</Text>
          <Text
            style={[
              { fontSize: 14.5, color: t.ink, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
              f.word && { fontFamily: fonts.display, fontWeight: '400', letterSpacing: 1.5, textTransform: 'uppercase' },
            ]}
          >
            {f.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Opening-word rows: the word on the left in display font, count on the right. */
export function OpenerRows({ items }: { items: { word: string; detail: string }[] }) {
  const t = useTheme();
  return (
    <View>
      {items.map((o, i) => (
        <View
          key={o.word}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            paddingVertical: 8,
            borderBottomWidth: i === items.length - 1 ? 0 : 1,
            borderBottomColor: t.line,
            borderStyle: 'dashed',
          }}
        >
          <Text style={{ fontFamily: fonts.display, letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 14.5, color: t.ink }}>
            {o.word}
          </Text>
          <Text style={{ fontSize: 14.5, color: t.muted }}>{o.detail}</Text>
        </View>
      ))}
    </View>
  );
}
