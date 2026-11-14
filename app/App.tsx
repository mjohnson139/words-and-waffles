import { BagelFatOne_400Regular, useFonts } from '@expo-google-fonts/bagel-fat-one';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useDailyWord } from './src/api/dailyWord';
import { isShareFragment } from './src/game/shareLink';
import { usePingOnOpen } from './src/api/ping';
import { useResultOnFinish } from './src/api/result';
import { PING_ENDPOINT, WORD_ENDPOINT } from './src/config';
import { useGames } from './src/store/games';
import { useSettings } from './src/store/settings';
import { Header, TABS, type Tab } from './src/ui/Header';
import { HistoryScreen } from './src/ui/screens/HistoryScreen';
import { PlayScreen } from './src/ui/screens/PlayScreen';
import { StatsScreen } from './src/ui/screens/StatsScreen';
import { Table } from './src/ui/Table';
import { StatsFooter } from './src/ui/settings/StatsFooter';
import { useTheme } from './src/ui/theme';
import { useToday } from './src/ui/useToday';

const isTab = (v: string): v is Tab => TABS.some((t) => t.id === v);
const fromHash = (): Tab => {
  const h = location.hash.slice(1);
  return isTab(h) ? h : 'play';
};

const webRoot = Platform.OS === 'web' ? ({ userSelect: 'none', WebkitTapHighlightColor: 'transparent' } as object) : null;

export default function App() {
  const t = useTheme();
  const [fontsLoaded, fontError] = useFonts({ BagelFatOne_400Regular });
  const [tab, setTab] = useState<Tab>(Platform.OS === 'web' ? fromHash() : 'play');
  const { ready, games, saveGame, restore } = useGames();
  const { ready: settingsReady, settings, update } = useSettings();
  const date = useToday();
  const endpoint = settings.wordEndpointOverride || WORD_ENDPOINT;
  // Wait for settings so an override (or none) decides the one word request.
  const hasGuesses = (games['d-' + date]?.guesses.length ?? 0) > 0;
  const daily = useDailyWord(date, settingsReady ? endpoint : '', hasGuesses);
  usePingOnOpen(PING_ENDPOINT, settings.pingEnabled, settingsReady, date);
  useResultOnFinish(PING_ENDPOINT, settings.pingEnabled, settingsReady && ready, date, games['d-' + date]);

  // Web: a '#w=' share link (F1). Play opens it once the games are loaded.
  const [link, setLink] = useState(() =>
    Platform.OS === 'web' && isShareFragment(location.hash) ? { fragment: location.hash, id: 0 } : null,
  );
  const linkOpened = () => {
    setLink(null);
    // Drop the link so a reload does not reopen it, without a history entry.
    history.replaceState(null, '', location.pathname + location.search + '#play');
  };

  // Web: mirror the tab to location.hash both ways (prototype lines 578-585).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const on = () => {
      if (!isShareFragment(location.hash)) return setTab(fromHash());
      setLink({ fragment: location.hash, id: Date.now() });
      setTab('play');
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (next: Tab) => {
    setTab(next);
    if (Platform.OS === 'web') location.hash = next;
  };

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: t.table }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[{ flex: 1 }, webRoot]}>
        <Table>
          <SafeAreaView style={{ flex: 1, gap: 8 }} edges={['top', 'bottom']}>
            <Header tab={tab} onTab={go} />
            {tab === 'play' && (
              <PlayScreen
                games={games}
                saveGame={saveGame}
                ready={ready && settingsReady}
                date={date}
                dailyAnswer={daily && settingsReady ? { date, ...daily } : null}
                link={link}
                onLink={linkOpened}
              />
            )}
            {tab === 'history' && <HistoryScreen games={games} />}
            {tab === 'stats' && (
              <StatsScreen
                games={games}
                footer={<StatsFooter games={games} restore={restore} settings={settings} update={update} />}
              />
            )}
          </SafeAreaView>
        </Table>
      </View>
    </SafeAreaProvider>
  );
}
