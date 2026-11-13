/*
 * Build-time endpoints. Expo inlines EXPO_PUBLIC_* only when they are read as
 * literal `process.env.EXPO_PUBLIC_X` member expressions, so do not refactor
 * these into a lookup. Empty means the feature is off: no request is made,
 * the app uses the bundled word and sends no ping. The app talks to no other
 * host.
 */
export const WORD_ENDPOINT: string = process.env.EXPO_PUBLIC_WORD_ENDPOINT ?? '';
export const PING_ENDPOINT: string = process.env.EXPO_PUBLIC_PING_ENDPOINT ?? '';

/*
 * Where share links point on iOS and Android (the web builds links from the
 * page it was served from). Empty hides "Share link" on native. Set it in EAS
 * at the store build, e.g. https://words-and-waffles.pages.dev/.
 */
export const SITE_URL: string = process.env.EXPO_PUBLIC_SITE_URL ?? '';
