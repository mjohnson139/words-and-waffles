import type { ReactNode } from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';

import { fonts, useTheme } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: t.plate, borderColor: t.line, borderWidth: 1, borderRadius: 14, padding: 14 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Note({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const t = useTheme();
  return <Text style={[{ fontSize: 13, color: t.muted }, style]}>{children}</Text>;
}

export function SectionTitle({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 20, color: t.syrup, marginTop: 6 }}>
      {children}
    </Text>
  );
}
