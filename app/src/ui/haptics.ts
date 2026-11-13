import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Native only; on web every call is a no-op. Failures are ignored: haptics are garnish.
const run = (f: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  f().catch(() => {});
};

export const tapKey = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const revealTile = () => run(() => Haptics.selectionAsync());
export const win = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const lose = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const bad = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
