---
title: F1 - share a word by link
type: feat
status: active
date: 2026-11-13
epic: v1
step: F1
---

# F1 - Share a word by link

## Goal Capsule

- **Outcome:** a player who picks a word (or just played one) can hand it to a friend as a link instead of handing over the phone. Opening the link starts that word as a "Pick a word" game. Nothing about the word touches a server.
- **Owner decisions (plan 001, "Owner decisions, 2026-11-13"):** share links only; the word rides in the link, obfuscated like the daily word; nothing stored on the server; ships before the store builds (🛑 B).
- **Done means:** a link made on the web opens and plays on the web (e2e proves it); production's request audit still shows two requests; no new dependency, no server change, nothing that identifies a player.

## Product shape (brainstorm, decisions pre-answered)

The owner's decisions settle the "what"; this section settles the moments. Written directly rather than through an interactive `ce-brainstorm`, since no question here needs the owner.

**Sending.** Two places offer "Share link":

1. The "Pick the word" card, beside Start: type a word, tap **Share link**, and the friend gets the word without the sender playing it. The typed word is checked like Start (`It needs exactly five letters, A to Z.`).
2. The result card of a finished Seconds or Pick-a-word game: **Share word**, so "try this one" follows a good game. Not on the daily result: the friend already has that word, and a link would only spoil it.

The share action uses the platform's share sheet where there is one (`navigator.share` on mobile browsers, React Native's built-in `Share` on iOS and Android) and otherwise copies the link to the clipboard with the toast `Link copied. Pass the plate.` The message reads `A word fresh off the iron, just for you: <link>`.

**Receiving.** Opening `https://<site>/#w=…` (on launch or by `hashchange`):

- A good link switches to Play, starts a "Pick a word" game with that word and toasts `A friend picked this one. Go!`.
- The same link again resumes the same game: the game id is derived from the link (`c-<salt>`), so a reload or a second tap never makes a duplicate. If that game is finished the result card shows, with `You've had this one already.`; if it is in progress, `Back to your friend's word.`.
- A bad link (tampered, truncated, an old format) opens Today with `That link came out burnt. Here's today's.`
- Either way the fragment is replaced with `#play` (`history.replaceState`), so a reload does not restart it and the tab hash keeps working.

**What is stored.** Nothing new. The game record keeps its shape (`mode: 'custom'`, `source: 'local'`), and only once a guess is made, as today.

## Decisions

- **Fragment, not query string.** `#w=` never leaves the browser, so the obfuscated word never reaches Cloudflare's request logs, and the service worker's cache key is unchanged. Evidence: the e2e request audit (no request carries the payload) and `npm run live-check` stays at two requests.
- **Link format:** `#w=1.<salt>.<cells>`. `1` is the format version; `salt` is 12 random lowercase hex characters (fresh per link); `cells` is the five `cellHash` values from `app/src/game/cells.ts` concatenated (80 hex). Reusing `encodeCells`/`decodeCells` means the link looks like the daily payload and never contains the word in clear. It is obfuscation: anyone can brute-force five letters; never call it secure.
- **Any five letters.** A shared word need not be in the dictionary; `startCustom` already accepts any five letters and the sender saw the word. Guess checking is unchanged (the answer itself is always accepted).
- **Base URL.** On the web the link is built from `location` (whatever host served the app). On iOS and Android it is `EXPO_PUBLIC_SITE_URL`; while that is empty the share buttons are hidden on native. Set it in EAS at 🛑 B.
- **Native deep links: deferred to 🛑 B.** The web link is the share target for every platform in F1. Opening links in the installed app needs the `scheme` already in `app.json` plus iOS universal links / Android app links (an `apple-app-site-association` and `assetlinks.json` on Pages and a dev build), which Expo Go cannot exercise.

## Units

| # | Unit | Owner | Files |
|---|---|---|---|
| 1 | This plan | orchestrator | `docs/plans/2026-11-13-002-feat-share-word-links-plan.md` |
| 2 | Pure link module and tests | `implementer` | `app/src/game/shareLink.ts`, `app/src/game/__tests__/shareLink.test.ts` |
| 3 | UI: share buttons, fragment handling, `EXPO_PUBLIC_SITE_URL` | orchestrator (the brief would be as long as the code) | `App.tsx`, `src/config.ts`, `src/ui/share.ts` (+ `.web.ts`), `src/ui/useShareLink.ts`, `PlayScreen.tsx`, `PickWord.tsx`, `ResultCard.tsx` |
| 4 | e2e | `implementer`, after 2 and 3 | `app/e2e/share.spec.ts` |
| 5 | README and store copy | `mechanic` | `README.md`, `docs/store-listing.md` |

Units 2 and 3 run in parallel because the contract below is fixed first.

### Contract (`app/src/game/shareLink.ts`)

```ts
export interface SharedWord { word: string; salt: string }
/** 12 lowercase hex characters. */
export function newShareSalt(rand: () => number): string;
/** 'w=1.<salt>.<cells>' (no '#'); throws on a word that is not five a-z letters. */
export function encodeShareLink(word: string, salt: string): string;
/** True when the fragment is meant as a share link, good or bad ('w=' after an optional '#', any case, trimmed). */
export function isShareFragment(fragment: string): boolean;
/** The word and salt, or null for anything malformed or tampered. Accepts a leading '#', surrounding whitespace and upper case. */
export function parseShareLink(fragment: string): SharedWord | null;
/** base without its own fragment + '#' + fragment. */
export function shareUrl(base: string, fragment: string): string;
export const shareMessage: (url: string) => string;
/** The game a link opens: the saved game with id 'c-<salt>' if its answer matches, else a new custom game. */
export function openShared(games: Record<string, GameRecord>, link: SharedWord, date: string): { game: GameRecord; toast: string };
export const BAD_LINK: string;
export const LINK_COPIED: string;
```

## Tests

- Unit: round trip over every answer word; a tampered cell; wrong lengths (salt, cells, count); upper case and whitespace; a leading `#`; an unknown version; an unrelated fragment (`stats`, `w=`, empty); `openShared` new / in progress / finished / same salt but different answer.
- e2e (`app/e2e/share.spec.ts`): the Pick card's Share link copies a link (clipboard read in the page); opening it in a fresh context plays that word and wins; reopening after the win shows the result, not a new game; a bad fragment falls back to Today with the toast; the fragment is cleared after opening; no request carries `w=`; the third-party-host tripwire holds.

## Not in F1

Native deep links and universal links (🛑 B), stored channel words (F3), the stats redesign and end-of-game event (F2).
