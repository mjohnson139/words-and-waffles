import { Text, View } from 'react-native';

import { BADGES } from '../../game/stats';
import { useTheme } from '../theme';

export function Badges({ earned }: { earned: boolean[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
      {BADGES.map((b, i) => {
        const got = earned[i];
        return (
          <View
            key={b.title}
            accessible
            accessibilityLabel={`${b.title}, ${b.description}, ${got ? 'earned' : 'not yet'}`}
            style={{
              width: '48.5%',
              borderWidth: 1.5,
              borderStyle: got ? 'solid' : 'dashed',
              borderColor: got ? t.waffleEdge : t.line,
              backgroundColor: got ? t.batter : 'transparent',
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: got ? t.syrup : t.muted }}>{b.title}</Text>
            <Text style={{ fontSize: 13, lineHeight: 17, color: got ? t.ink : t.muted }}>{b.description}</Text>
          </View>
        );
      })}
    </View>
  );
}
