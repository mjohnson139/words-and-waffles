# Decisions

Product decisions the owner has made, with the reason, newest first. Below them, the defaults the work proceeds on until the owner answers the matching item on #16.

## Decided

### 2026-11-14: The installed web app is labelled "Waffles"
The home-screen label is "Waffles" on iOS and Android because the full name truncates under the icon. The in-app title stays "Words & Waffles". The installed app's title bar uses the light table colour in dark mode too, because a manifest has one `theme_color`. Shows in `app/public/manifest.webmanifest` (PR #6).
### 2026-11-13: Stats page: one puzzle under "Today's word", system rounded font
"Today's word" shows only one puzzle (the busiest of yesterday, today, tomorrow); yesterday's tries are not shown when today has few results, to keep the page short. Headings use `ui-rounded, "SF Pro Rounded", system-ui` at weight 800, because the app's display face (Bagel Fat One) is not loaded: the CSP allows no fonts and the hard lines forbid a CDN. Self-hosting the font is possible later and not worth the bundle now. Shows on `/stats` (`worker/src/stats.ts`).
### 2026-11-13: The stats page follows the app's look
`/stats` takes the app's look and texture: a GitHub-style year heatmap of daily players, today's tries distribution and win rate, and the platform split. Shorter and more interesting than the old tables. Shows on `/stats`.
### 2026-11-13: A second anonymous event: the end-of-game result
When a daily game ends, the app may send the date and the guess count (1-6 or X), with no identifier, under the same opt-out switch as the ping. PRIVACY.md, the README and the `/stats` copy changed from "one ping" to two events when PR #5 landed, and not before. Shows in `POST /v1/result` and PRIVACY.md. The store privacy label "Data not collected" still holds: the result is not linked to a user, carries no identifier and is aggregated on arrival.
### 2026-11-13: Channels start as share links only
The word rides in the link, obfuscated like the daily word, with nothing stored on the server and nothing to moderate. Group codes with a stored daily word wait for a second decision; leaderboards inside a channel would need nicknames and are not planned. Shows in "Share link" (`app/src/game/shareLink.ts`, PR #4).
### 2026-11-13: Share links use the URL fragment, not a query string
`#w=` never leaves the browser, so the obfuscated word never reaches Cloudflare's request logs, and the service worker's cache key is unchanged. The format is `#w=1.<salt>.<cells>`, reusing `encodeCells`/`decodeCells`, so the link never contains the word in clear. It is obfuscation: anyone can brute-force five letters, so never call it secure.
### 2026-11-13: A shared word can be any five letters
A shared word need not be in the dictionary: `startCustom` already accepts any five letters and the sender saw the word. Guess checking is unchanged (the answer itself is always accepted). Accepted risk: a crafted link that reuses another link's salt with a different word gets the same id `c-<salt>`, so its first guess replaces that saved game. Random 48-bit salts never collide by chance, and only the player who opened the crafted link can be hurt.
### 2026-11-13: Share links point at the web; native deep links are deferred
On the web the link is built from `location`; on iOS and Android it is `EXPO_PUBLIC_SITE_URL`, and while that is empty the share buttons are hidden on native. Opening links in the installed app needs universal links / app links (`apple-app-site-association` and `assetlinks.json` on Pages and a dev build), which Expo Go cannot exercise. Default: leave links opening the website until the owner asks (epic #11, universal links #14).

## In force by default (open on #16)

### 2026-11-13: Share text includes the puzzle number
Daily results add the puzzle number (`Words & Waffles 🧇 #12 · Thu, Nov 12 · 3/6`). The plan added `#N` and the owner could veto; the default is in force.
### 2026-11-13: Default domains, bundle id and licence until the owner says otherwise
Production stays on `*.workers.dev` (Worker) and `*.pages.dev` (site) until a domain is picked; a custom domain would make the ping rate-limit rule in `docs/deploy.md` step 8 available. The bundle id is `app.wordsandwaffles` (`app/app.json`) and cannot change after the first store build. The licence is MIT (brief default), changeable before the repo is promoted.
### 2026-11-13: Phase 2 sync is out of v1
iCloud KV and Android backup sync need native code and break Expo Go, so they are out of v1 unless the owner asks. The app stays Expo Go compatible: only Expo SDK modules, no custom native code.
