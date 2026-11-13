import { useState } from 'react';
import { Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { NEED_FIVE, startCustom } from '../../game/play';
import type { GameRecord } from '../../game/record';
import { today } from '../../game/dates';
import { okWord } from '../../game/words';
import { canShareLinks, shareWord } from '../shareWord';
import { fonts, useTheme } from '../theme';
import { Btn } from './Btn';

interface Props {
  onStart: (game: GameRecord) => void;
  onToast: (message: string) => void;
}

/** "Pick the word" card (prototype lines 411-421), without the outside link. */
export function PickWord({ onStart, onToast }: Props) {
  const t = useTheme();
  const [secret, setSecret] = useState('');
  const [peek, setPeek] = useState(false);

  const submit = () => {
    const r = startCustom(secret, today(), Date.now(), Math.random);
    if ('error' in r) return onToast(r.error);
    setSecret('');
    onStart(r.game);
    onToast(r.toast);
  };

  // Send the word as a link instead of handing the phone over (F1).
  const share = async () => {
    const w = secret.trim().toLowerCase();
    if (!okWord(w)) return onToast(NEED_FIVE);
    const message = await shareWord(w);
    if (message) onToast(message);
  };

  return (
    <View style={[styles.card, { backgroundColor: t.plate, borderColor: t.line }]}>
      <Text accessibilityRole="header" selectable={false} style={{ fontFamily: fonts.display, fontSize: 21, color: t.syrup }}>
        Pick the word
      </Text>
      <Text selectable={false} style={{ color: t.muted, fontSize: 14.5 }}>
        Type a secret five-letter word, then hand the phone over. Played a puzzle somewhere else this morning? Enter its
        answer here and retype your guesses to add that game to your stats.
      </Text>
      <View style={styles.line}>
        <TextInput
          accessibilityLabel="Secret word"
          value={secret}
          onChangeText={setSecret}
          onSubmitEditing={submit}
          secureTextEntry={!peek}
          maxLength={5}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          style={[
            styles.input,
            { borderColor: t.line, backgroundColor: t.table, color: t.ink },
            Platform.OS === 'web' ? ({ textTransform: 'uppercase', userSelect: 'text' } as object) : null,
          ]}
        />
        <Btn label="Start" onPress={submit} />
        {canShareLinks() && <Btn alt label="Share link" onPress={share} />}
      </View>
      <View style={styles.peek}>
        <Switch
          accessibilityLabel="Show letters while typing"
          value={peek}
          onValueChange={setPeek}
          trackColor={{ true: t.berry, false: t.line }}
        />
        <Text selectable={false} style={{ fontSize: 13.5, color: t.muted }}>
          Show letters while typing
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  line: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 150,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  peek: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
