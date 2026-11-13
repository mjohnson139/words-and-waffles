import { Text, View } from 'react-native';

import type { GameRecord } from '../../game/record';
import { fonts, useTheme } from '../theme';

// Placeholder until the real screen lands.
export function HistoryScreen(_props: { games?: Record<string, GameRecord> }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, paddingTop: 24, alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, color: t.syrup }}>History</Text>
    </View>
  );
}
