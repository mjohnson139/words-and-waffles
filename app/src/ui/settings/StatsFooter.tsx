import { useState } from 'react';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { type GameRecord } from '../../game/record';
import { PING_ENDPOINT, WORD_ENDPOINT } from '../../config';
import { exportBackup, pickBackupText } from '../../store/backup';
import { parseBackup } from '../../store/backupFormat';

import { isEndpointUrl, type Settings } from '../../store/settingsRules';
import { Card, Note } from '../stats/Card';
import { useTheme } from '../theme';

type Games = Record<string, GameRecord>;

const PRIVACY_URL = 'https://github.com/mjohnson139/words-and-waffles/blob/main/PRIVACY.md';

/** Origin of the ping endpoint + /stats, or '' when pings are off. */
function statsUrl(): string {
  try {
    return PING_ENDPOINT ? new URL(PING_ENDPOINT).origin + '/stats' : '';
  } catch {
    return '';
  }
}

const plural = (n: number) => `${n} game${n === 1 ? '' : 's'}`;

function Btn({ label, onPress, alt, disabled }: { label: string; onPress: () => void; alt?: boolean; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: alt ? t.butter : t.berry,
        opacity: disabled ? 0.5 : 1,
        transform: [{ translateY: pressed ? 2 : 0 }],
        // Prototype .btn lines 120-125.
        borderBottomWidth: pressed ? 1 : 3,
        borderBottomColor: 'rgba(0,0,0,.22)',
      })}
    >
      <Text style={{ fontWeight: '800', fontSize: 14.5, color: alt ? '#35200a' : t.onBerry }}>{label}</Text>
    </Pressable>
  );
}

function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="link" onPress={onPress} style={{ fontSize: 13, color: t.berry, fontWeight: '700' }}>
      {label}
    </Text>
  );
}

interface Props {
  games: Games;
  /** Merges incoming games into the latest stored ones (by rank) and reports the counts. */
  restore: (incoming: Games) => { added: number; updated: number };
  settings: Settings;
  update: (partial: Partial<Settings>) => void;
}

export function StatsFooter({ games, restore: restoreGames, settings, update }: Props) {
  const t = useTheme();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [endpointError, setEndpointError] = useState('');
  const counts = statsUrl();
  const shown = endpoint ?? settings.wordEndpointOverride;

  const backUp = async () => {
    setBusy(true);
    const r = await exportBackup(games);
    setBusy(false);
    const n = Object.keys(games).length;
    setStatus(r === 'shared' ? `Backed up ${plural(n)}.` : r === 'cancelled' ? 'Nothing backed up.' : "Couldn't back up just now.");
  };

  const restore = async () => {
    setBusy(true);
    const text = await pickBackupText();
    setBusy(false);
    if (text === null) return setStatus('Nothing restored.');
    const parsed = parseBackup(text);
    if (!parsed.ok) return setStatus(parsed.error);
    const { added, updated } = restoreGames(parsed.games);
    setStatus(`Restored: ${added} new, ${updated} updated.`);
  };

  const saveEndpoint = () => {
    const v = shown.trim();
    if (!isEndpointUrl(v)) return setEndpointError('That needs to be an https:// address.');
    setEndpointError('');
    update({ wordEndpointOverride: v });
    setEndpoint(null);
  };

  const useDefault = () => {
    setEndpointError('');
    update({ wordEndpointOverride: '' });
    setEndpoint(null);
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Text style={{ fontWeight: '800', color: t.ink, fontSize: 15, marginBottom: 6 }}>What we count</Text>
        <Note>
          Once a day the app tells our server that someone opened it today, whether it is the first open this week,
          this month or ever, and which platform it runs on. No name, no ID, nothing about your games. The counts are
          public.
        </Note>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          {counts ? <LinkText label="See the counts" onPress={() => void Linking.openURL(counts)} /> : null}
          <LinkText label="Privacy details" onPress={() => void Linking.openURL(PRIVACY_URL)} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={{ color: t.ink, fontSize: 14.5, fontWeight: '700' }}>Send the daily count</Text>
          <Switch
            accessibilityLabel="Send the daily count"
            value={settings.pingEnabled}
            onValueChange={(v) => update({ pingEnabled: v })}
          />
        </View>
      </Card>

      <Card>
        <Text style={{ fontWeight: '800', color: t.ink, fontSize: 15, marginBottom: 8 }}>Keep your games</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Btn label="Back up" onPress={() => void backUp()} disabled={busy} />
          <Btn label="Restore" alt onPress={() => void restore()} disabled={busy} />
        </View>
        {status ? (
          <Text accessibilityLiveRegion="polite" style={{ color: t.ink, fontSize: 13.5, fontWeight: '700', marginTop: 8 }}>
            {status}
          </Text>
        ) : null}
        <Note style={{ marginTop: 8 }}>
          Your games live on this device. iOS and Android device backups include them too.
        </Note>
      </Card>

      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
        >
          <Text style={{ fontWeight: '800', color: t.ink, fontSize: 15 }}>{open ? '▾' : '▸'} Advanced</Text>
        </Pressable>
        {open ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text style={{ color: t.ink, fontSize: 14, fontWeight: '700' }}>Word server</Text>
            <TextInput
              value={shown}
              onChangeText={(v) => {
                setEndpoint(v);
                setEndpointError('');
              }}
              placeholder={WORD_ENDPOINT || 'Built-in word list'}
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel="Word server address"
              style={{
                borderWidth: 1,
                borderColor: endpointError ? t.miss : t.line,
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 10,
                color: t.ink,
                backgroundColor: t.table,
              }}
            />
            {endpointError ? <Note style={{ color: t.ink, fontWeight: '700' }}>{endpointError}</Note> : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Btn label="Save" onPress={saveEndpoint} />
              <Btn label="Use default" alt onPress={useDefault} />
            </View>
            <Note>
              For self-hosters: any server that follows the word contract in the README will do.
            </Note>
          </View>
        ) : null}
      </Card>
    </View>
  );
}
