import { BagelFatOne_400Regular, useFonts } from '@expo-google-fonts/bagel-fat-one';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useGames } from './src/store/games';
import { Header, TABS, type Tab } from './src/ui/Header';
import { HistoryScreen } from './src/ui/screens/HistoryScreen';
import { PlayScreen } from './src/ui/screens/PlayScreen';
import { StatsScreen } from './src/ui/screens/StatsScreen';
import { Table } from './src/ui/Table';
import { useTheme } from './src/ui/theme';

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
  const { ready, games, saveGame } = useGames();

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
            {tab === 'play' && <PlayScreen games={games} saveGame={saveGame} ready={ready} />}
            {tab === 'history' && <HistoryScreen games={games} />}
            {tab === 'stats' && <StatsScreen games={games} />}
          </SafeAreaView>
        </Table>
      </View>
    </SafeAreaProvider>
  );
}
