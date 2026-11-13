import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';

import { KEY_TEST_ID_PREFIX } from './Keyboard';

/** Web only: physical keyboard to 'enter' | 'back' | a-z (prototype lines 588-593). */
export function useHardwareKeyboard(onKey: (key: string) => void) {
  const handle = useEffectEvent(onKey);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.tagName === 'INPUT') return;
      if (e.key === 'Enter') {
        if (e.repeat) return;
        // Enter on a focused button (a chip, a tab) activates that button instead;
        // our own keys are the exception, since Enter there means "submit".
        const ownKey = el?.closest?.(`[data-testid^="${KEY_TEST_ID_PREFIX}"]`);
        if (!ownKey && el?.closest?.('button,a,[role="button"],[role="tab"],[role="switch"]')) return;
        e.preventDefault();
        handle('enter');
      } else if (e.key === 'Backspace') handle('back');
      else if (/^[a-zA-Z]$/.test(e.key)) handle(e.key.toLowerCase());
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, []);
}
