import { BagelFatOne_400Regular, useFonts } from '@expo-google-fonts/bagel-fat-one';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useDailyWord } from './src/api/dailyWord';
import { usePingOnOpen } from './src/api/ping';
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
  const daily = useDailyWord(date, settingsReady ? endpoint : '');
  usePingOnOpen(PING_ENDPOINT, settings.pingEnabled, settingsReady);

  // Web: mirror the tab to location.hash both ways (prototype lines 578-585).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const on = () => setTab(fromHash());
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
                ready={ready && settingsReady && daily !== null}
                dailyAnswer={daily && settingsReady ? { date, ...daily } : undefined}
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
