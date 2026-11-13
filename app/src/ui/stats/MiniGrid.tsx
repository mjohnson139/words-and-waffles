import { View } from 'react-native';

import type { Mark } from '../../game/score';
import { useTheme } from '../theme';

export function useMarkColors() {
  const t = useTheme();
  return { hit: t.hit, near: t.near, miss: t.miss } as const;
}

/** Tiny grid of coloured dots, one row per guess (prototype `.mini`). */
export function MiniGrid({ rows }: { rows: Mark[][] }) {
  const c = useMarkColors();
  return (
    <View style={{ gap: 2 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 2 }}>
          {r.map((m, j) => (
            <View key={j} style={{ width: 9, height: 9, borderRadius: 2.5, backgroundColor: c[m] }} />
          ))}
        </View>
      ))}
    </View>
  );
}
