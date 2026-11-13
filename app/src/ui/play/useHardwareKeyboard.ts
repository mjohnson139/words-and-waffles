import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';

/** Web only: physical keyboard to 'enter' | 'back' | a-z (prototype lines 588-593). */
export function useHardwareKeyboard(onKey: (key: string) => void) {
  const handle = useEffectEvent(onKey);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.tagName === 'INPUT') return;
      if (e.key === 'Enter') {
        // Enter on a focused button (a chip, a key) activates that button instead.
        if (el?.closest?.('button,a,[role="button"],[role="tab"],[role="switch"]')) return;
        e.preventDefault();
        handle('enter');
      } else if (e.key === 'Backspace') handle('back');
      else if (/^[a-zA-Z]$/.test(e.key)) handle(e.key.toLowerCase());
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, []);
}
