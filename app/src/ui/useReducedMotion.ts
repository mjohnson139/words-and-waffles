import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const web = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia;
  const [reduced, setReduced] = useState(() => (web ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    if (web) {
      const mq = window.matchMedia(QUERY);
      const on = () => setReduced(mq.matches);
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    }
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduced(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, [web]);
  return reduced;
}
