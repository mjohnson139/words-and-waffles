import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { SITE_URL } from '../config';
import { LINK_COPIED, encodeShareLink, newShareSalt, shareMessage, shareUrl } from '../game/shareLink';

/** The page a link opens: the page this app was served from on web, SITE_URL on native. */
const linkBase = (): string =>
  Platform.OS === 'web' ? location.origin + location.pathname : SITE_URL;

export const canShareLinks = (): boolean => linkBase() !== '';

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

/**
 * Hand a word to a friend as a link: the share sheet where there is one,
 * else the clipboard. Returns the toast to show, or null for none.
 */
export async function shareWord(word: string): Promise<string | null> {
  const message = shareMessage(shareUrl(linkBase(), encodeShareLink(word, newShareSalt(Math.random))));
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message });
      return null;
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: message });
        return null;
      } catch (e) {
        if (isAbort(e)) return null; // the player closed the sheet
      }
    }
    await Clipboard.setStringAsync(message);
    return LINK_COPIED;
  } catch {
    return "Copying isn't allowed here.";
  }
}
