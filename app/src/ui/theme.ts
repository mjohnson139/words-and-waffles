import { useColorScheme } from 'react-native';

// Tokens from prototype lines 11-43.
const shared = {
  hit: '#3c9a57',
  near: '#ffdf6b',
  miss: '#5d493c',
  waffle: '#e2a23e',
  waffleDark: '#b87a22',
  pocket: '#c98c2e',
  butter: '#ffe37a',
};

export const light = {
  ...shared,
  table: '#e6edf8',
  check: 'rgba(62,104,178,.09)',
  ink: '#2b1a10',
  muted: '#6c5a4f',
  plate: '#ffffff',
  line: '#d3dbea',
  batter: '#f7e6bb',
  batterSoft: '#f3ead2',
  waffleEdge: '#c98a2a',
  syrup: '#8a4513',
  berry: '#3d4fb3',
  /** Text on a berry fill (prototype lines 62-64). */
  onBerry: '#ffffff',
};

export const dark = {
  ...shared,
  table: '#171b30',
  check: 'rgba(255,255,255,.035)',
  ink: '#f7eddb',
  muted: '#b5ab9b',
  plate: '#232946',
  line: '#363e63',
  batter: '#4a4460',
  batterSoft: '#2a3050',
  waffleEdge: '#d69a3c',
  syrup: '#eab56c',
  berry: '#9aa8ff',
  onBerry: '#141831',
};

export type Theme = typeof light;

export const fonts = {
  /** Family name registered by useFonts in App.tsx. */
  display: 'BagelFatOne_400Regular',
  body: undefined as string | undefined, // system font
};

export function useTheme(): Theme & { scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...(scheme === 'dark' ? dark : light), scheme };
}
