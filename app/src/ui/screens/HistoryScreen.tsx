import { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, Text, View } from 'react-native';

import { MODE_LABEL, type GameRecord } from '../../game/record';
import { score } from '../../game/score';
import { niceDate } from '../../game/share';
import { finished } from '../../game/stats';
import { Card, Note } from '../stats/Card';
import { GuessTiles } from '../stats/GuessTiles';
import { MiniGrid } from '../stats/MiniGrid';
import { fonts, useTheme } from '../theme';
import { useReducedMotion } from '../useReducedMotion';

function GameCard({ g }: { g: GameRecord }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rows = g.guesses.map((x) => score(x, g.answer));
  const won = g.status === 'won';
  const toggle = () => {
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };
  return (
    <Card style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${g.answer}, ${niceDate(g.date)}, ${MODE_LABEL[g.mode]}, ${won ? g.guesses.length + ' of 6' : 'Burnt'}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <MiniGrid rows={rows} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.display, letterSpacing: 1.5, textTransform: 'uppercase', color: t.ink }}>
            {g.answer}
          </Text>
          <Text style={{ color: t.muted, fontSize: 12.5 }}>
            {niceDate(g.date)} · {MODE_LABEL[g.mode]}
          </Text>
        </View>
        <Text
          style={
            won
              ? { fontFamily: fonts.display, fontSize: 20, color: t.ink, fontVariant: ['tabular-nums'] }
              : { fontSize: 14, fontWeight: '800', color: t.muted }
          }
        >
          {won ? `${g.guesses.length}/6` : 'Burnt'}
        </Text>
      </Pressable>
      {open && <GuessTiles guesses={g.guesses} rows={rows} />}
    </Card>
  );
}

export function HistoryScreen({ games }: { games: Record<string, GameRecord> }) {
  const list = finished(games);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
      {list.length ? (
        <>
          <View style={{ gap: 8 }}>
            {list.map((g) => (
              <GameCard key={g.id} g={g} />
            ))}
          </View>
          <Note>Tap a game to see the words you tried.</Note>
        </>
      ) : (
        <Card>
          <Note>No games yet. Play today’s word and it will land here with every guess you made.</Note>
        </Card>
      )}
    </ScrollView>
  );
}
