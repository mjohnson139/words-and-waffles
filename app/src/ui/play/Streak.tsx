import { StyleSheet, Text, View } from 'react-native';

import { Logo } from '../Logo';
import { fonts, useTheme } from '../theme';

/** Waffle icon and the current streak (prototype `.streak`, line 69). */
export function Streak({ days }: { days: number }) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel={`${days} day streak`} style={styles.streak}>
      <Logo size={22} />
      <Text selectable={false} style={{ fontFamily: fonts.display, fontSize: 18, color: t.syrup }}>
        {days}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ streak: { flexDirection: 'row', alignItems: 'center', gap: 4 } });
