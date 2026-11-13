import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { useTheme } from './theme';

const TILE = 44;

/** Gingham cloth (prototype lines 46-49) with the centred `.app` column. */
export function Table({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.table }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <Pattern id="gingham" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={TILE} height={TILE / 2} fill={t.check} />
            <Rect x={0} y={0} width={TILE / 2} height={TILE} fill={t.check} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#gingham)" />
      </Svg>
      <View style={styles.app}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  app: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
});
