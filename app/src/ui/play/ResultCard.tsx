import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { hms, msToMidnight } from '../../game/dates';
import { moreLabel, resultTitle } from '../../game/play';
import type { GameRecord } from '../../game/record';
import { shareText } from '../../game/share';
import { Logo } from '../Logo';
import { fonts, useTheme } from '../theme';
import { useReducedMotion } from '../useReducedMotion';
import { Btn } from './Btn';

interface Props {
  game: GameRecord;
  onToast: (message: string) => void;
  onMore: () => void;
}

/** Result card (prototype lines 427-437). */
export function ResultCard({ game, onToast, onMore }: Props) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const won = game.status === 'won';
  const [rise] = useState(() => new Animated.Value(reduced ? 1 : 0));

  useEffect(() => {
    if (reduced) return;
    Animated.timing(rise, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [reduced, rise]);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(shareText(game));
      onToast('Copied. Go brag.');
    } catch {
      onToast("Copying isn't allowed here.");
    }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: t.plate,
          borderColor: t.line,
          opacity: rise.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      <Logo size={64} />
      <Text accessibilityRole="header" selectable={false} style={[styles.title, { fontFamily: fonts.display, color: t.syrup }]}>
        {resultTitle(game)}
      </Text>
      <Text selectable={false} style={{ color: t.muted, textAlign: 'center' }}>
        The word was{' '}
        <Text style={{ color: t.ink, fontWeight: '700', letterSpacing: 2 }}>{game.answer.toUpperCase()}</Text>
        {won ? ` · ${game.guesses.length} of 6` : ''}
      </Text>
      {game.mode === 'daily' && <Countdown />}
      <View style={styles.btns}>
        <Btn alt label="Copy result" onPress={copy} />
        <Btn label={moreLabel(game.mode)} onPress={onMore} />
      </View>
    </Animated.View>
  );
}

/** "Fresh word in hh:mm:ss", ticking every second (prototype tick, line 456). */
function Countdown() {
  const t = useTheme();
  const [ms, setMs] = useState(() => msToMidnight(new Date()));
  useEffect(() => {
    const id = setInterval(() => setMs(msToMidnight(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Text selectable={false} style={{ color: t.muted }}>
      Fresh word in{' '}
      <Text style={{ color: t.ink, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{hms(ms)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  title: { fontSize: 24, textAlign: 'center' },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
});
