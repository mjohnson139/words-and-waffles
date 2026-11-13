import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { today } from '../../game/dates';
import type { GameRecord } from '../../game/record';
import { compute, earnedBadges, formatDuration } from '../../game/stats';
import { Badges } from '../stats/Badges';
import { Card, Note, SectionTitle } from '../stats/Card';
import { Distribution } from '../stats/Distribution';
import { Facts, OpenerRows } from '../stats/Facts';
import { StatTiles } from '../stats/StatTiles';
import { WaffleStack } from '../stats/WaffleStack';

/** Prototype `clock` (line 529). */
const clock = (m: number): string =>
  new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

export function StatsScreen({ games, footer }: { games: Record<string, GameRecord>; footer?: ReactNode }) {
  const s = compute(games, today());
  const n = s.fs.length;
  const dash = '–';
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
      {n === 0 && (
        <Card>
          <Note>Nothing on the griddle yet. Finish a word and your numbers will start cooking here.</Note>
        </Card>
      )}
      <StatTiles
        items={[
          { value: String(n), label: 'played' },
          { value: (n ? Math.round((100 * s.wins.length) / n) : 0) + '%', label: 'won' },
          { value: String(s.st.now), label: 'day streak' },
          { value: String(s.st.best), label: 'best streak' },
        ]}
      />
      <WaffleStack streak={s.st.now} />
      <SectionTitle>Guesses it took</SectionTitle>
      <Distribution dist={s.dist} />
      <SectionTitle>Opening words</SectionTitle>
      <Card>
        {s.openers.length ? (
          <OpenerRows
            items={s.openers.slice(0, 5).map(([word, o]) => ({
              word,
              detail: `${o.n} ${o.n === 1 ? 'time' : 'times'}${o.w ? ' · wins in ' + (o.sum / o.w).toFixed(1) : ''}`,
            }))}
          />
        ) : (
          <Note>Your favorite first guesses will line up here.</Note>
        )}
      </Card>
      <SectionTitle>From the kitchen</SectionTitle>
      <Card>
        <Facts
          items={[
            { label: 'Words you got', value: String(s.wins.length) },
            { label: 'Average guesses to win', value: s.wins.length ? s.avg.toFixed(2) : dash },
            { label: 'Guesses made, all time', value: String(s.total) },
            { label: 'Different words tried', value: String(s.uniq) },
            { label: 'Different openers', value: String(s.openers.length) },
            { label: 'Greens on the first guess', value: n ? (s.greens / n).toFixed(1) + ' a game' : dash },
            { label: 'Most-typed letter', value: s.letter ? s.letter[0] : dash, word: true },
            { label: 'Fastest win', value: s.fast ? formatDuration(s.fast) : dash },
            { label: 'Earliest win of the day', value: s.early !== null ? clock(s.early) : dash },
            { label: 'Mornings with a win', value: String(s.st.days) },
          ]}
        />
      </Card>
      <SectionTitle>Toppings earned</SectionTitle>
      <Badges earned={earnedBadges(s)} />
      {footer ? <View style={{ gap: 12 }}>{footer}</View> : null}
    </ScrollView>
  );
}
