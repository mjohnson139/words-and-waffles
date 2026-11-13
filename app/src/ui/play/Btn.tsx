import { Pressable, Text } from 'react-native';

import { useTheme } from '../theme';

/** Chunky button (prototype `.btn`, lines 133-137). */
export function Btn({ label, onPress, alt = false }: { label: string; onPress: () => void; alt?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: alt ? t.butter : t.berry,
        boxShadow: pressed ? '0 1px 0 rgba(0,0,0,.22)' : '0 3px 0 rgba(0,0,0,.22)',
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      <Text selectable={false} style={{ fontWeight: '800', fontSize: 14.5, color: alt ? '#35200a' : t.onBerry }}>
        {label}
      </Text>
    </Pressable>
  );
}
