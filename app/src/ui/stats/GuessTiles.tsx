import { Text, View } from 'react-native';

import type { Mark } from '../../game/score';
import { fonts, useTheme } from '../theme';
import { useMarkColors } from './MiniGrid';

/** Expanded guesses: small coloured letter tiles (prototype `.g ol .tile`). */
export function GuessTiles({ guesses, rows }: { guesses: string[]; rows: Mark[][] }) {
  const t = useTheme();
  const c = useMarkColors();
  return (
    <View style={{ marginTop: 10, marginBottom: 2, gap: 4 }}>
      {guesses.map((g, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 3 }}>
          {[...g].map((ch, j) => {
            const m = rows[i][j];
            return (
              <View
                key={j}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  backgroundColor: c[m],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 17,
                    textTransform: 'uppercase',
                    color: m === 'near' ? '#2b1a10' : m === 'hit' ? '#ffffff' : t.ink === '#2b1a10' ? '#ffffff' : t.ink,
                  }}
                >
                  {ch}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
