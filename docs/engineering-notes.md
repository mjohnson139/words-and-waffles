# Engineering notes

The current architecture map and the invariants that are easy to break. Read the section for the area you are changing. Scope and order live in GitHub issues (epics and their sub-issues); product decisions live in [decisions](decisions.md); investigations live in [solutions](solutions/README.md); how to work lives in the [dev process](../.github/dev-process.md).

## Layout and ownership

| Area | Owner and boundary |
| --- | --- |
| Workspace | Root `package.json` declares npm workspaces `app` and `worker` with one lockfile. `npm run verify` at the root runs both packages' verify. |
| Pure core | `app/src/game/`: words, dates, daily word, scoring, the play state machine, records, stats, share text, the word contract (`cells.ts`, `sha256.ts`), ping flags. No React/RN/Expo imports (ESLint `no-restricted-imports`). |
| Storage | `app/src/store/`: AsyncStorage adapters. Everything read back passes through `clean()` in `src/game/record.ts`. |
| Network | `app/src/api/`: the word endpoint client and the ping client. URLs come only from `src/config.ts`. |
| Screens | `app/src/ui/`: render state from the pure core and play its effects (animations, haptics, toasts). `fit.ts` is pure layout maths. |
| Worker | `worker/src/`: router, word sources, D1 counters, the public stats page. Imports `app/src/game/{answers,daily,cells,sha256,dates}.ts` by relative path so encoder and decoder cannot drift. |

## Invariants

- **The prototype is the behavior spec.** Scoring, copy, timings, stats and badge rules are ports. A change in behavior is a product decision, not a refactor.
- **Dates are local calendar strings** (`YYYY-MM-DD` from the device's local time). Day arithmetic goes through `dnum()` (UTC midnight of that calendar date), so DST never makes a day 23 or 25 hours. Ping counters are filed under the player's local date (the ping's `t`, checked to be within a day of UTC; older apps without it fall back to the UTC date), results under the daily word's date, and the word endpoint takes the player's local date. `/stats` takes "today" from the viewer's zone (`request.cf.timezone`, UTC when missing) and answers `Cache-Control: private` because the page differs by viewer.
- **Stats are derived, never stored.** Only game records persist. A backup is the records and nothing else.
- **Merging games** keeps the record with the higher `rank()` per id (finished beats playing, more guesses beat fewer). Restore and any future sync use the same rule.
- **A daily game that has guesses keeps its answer**, even if the word endpoint later returns a different word for that date.
- **Nothing identifies a player.** The ping body has six fields (the four flags, the platform and the local date) and no ID; the result body (`/v1/result`, PR #5) has two, the daily date and the tries, and its counter key has no platform; the Worker stores counters only and never logs requests. The rate limiter's IP map lives in isolate memory only.
- **The word hashing is obfuscation**, not security. Never describe it otherwise.
- **Expo Go compatible:** only Expo SDK modules, no custom native code.
- **Animations** use the native driver on iOS/Android and the JS driver on web; reduced motion skips them entirely, as the prototype's `calm` does. Timings: tile flip 460 ms staggered 240 ms with the colour applied at the midpoint, pop 130 ms, shake 400 ms, hop 600 ms staggered 80 ms, toppings about 40 particles over 4.2 s.

## The daily word, end to end

`App.tsx` owns the date (`useToday`), settings (`useSettings`) and games (`useGames`), and passes them down; screens never read storage themselves.

1. The endpoint is the Advanced override if set, else `EXPO_PUBLIC_WORD_ENDPOINT` (`src/config.ts`). Empty means no request at all: the bundled word.
2. `useDailyWord(date, endpoint)` waits for settings, then `loadDailyWord`: a cached `{endpoint, payload}` for this date and this endpoint is final (no request, so offline cold start works); otherwise one fetch with a timeout; otherwise the bundled `dailyWord(date)` with `source: 'bundled'`. If a configured endpoint failed, `useDailyWord` retries on foreground or `online` (at most once per 60 s, never once today's game has guesses; `shouldRetry`).
3. The answer reaches Play tagged with its date. Play only builds a new daily game from an answer whose date is today, so after midnight it waits for the new day's word instead of reusing yesterday's. A saved daily game always keeps its own answer.
4. The ping (`usePingOnOpen`) also waits for settings, so an opted-out player never sends one, and runs again when the date changes; `maybePing` dedupes per local day from stored state.
5. When today's daily game ends, `useResultOnFinish` sends `{d, g}` to the ping endpoint's sibling `/v1/result` (`resultEndpoint`), under the same switch, at most once per date (`ww:result`).

## Share links (PR #4)

- A shared word travels only in the URL fragment, `#w=1.<salt>.<cells>` (`src/game/shareLink.ts`), so it never reaches a server, a log or the service worker's cache key. Never move it to a query string.
- `App.tsx` notices the fragment (launch or `hashchange`) and replaces it with `#play`; `PlayScreen` opens it with `resolveLink` once games are loaded. The game id is `c-<salt>`, so the same link reopens the same game.
- Links point at `location` on web and at `EXPO_PUBLIC_SITE_URL` on native; empty hides the share buttons. Opening links in the installed apps (universal links) is not built yet.

## Home-screen install (PR #6)

- `app/public/index.html` is the web page template: `expo export -p web` uses it instead of Expo's default, fills `%LANG_ISO_CODE%` and `%WEB_TITLE%`, appends the bundle script and the favicon, and appends a plain `theme-color` from `app.json`. So the template holds only the dark `theme-color` (before Expo's, because the first matching tag wins) plus the manifest and Apple tags.
- `app/public/manifest.webmanifest` and `app/public/icons/` (made by `scripts/make-icons.mjs --web`). The home-screen label is "Waffles" on both platforms.
- `sw.js` precaches the manifest and icons only when missing and never prunes them: **bump `VERSION` whenever one of them changes**, or installed users keep the old one. Bumping `VERSION` means updating the `waffles-vN` cache name in `app/e2e/offline.spec.ts` too.
- The viewport has `viewport-fit=cover` (PR #8), so `env(safe-area-inset-*)` is real on the web; App's `SafeAreaView` pads all four edges. On the web the keyboard adds `webKeyboardClearance(insets.bottom)` (`app/src/ui/fit.ts`: at least 20 px including the inset) under its bottom row, so taps miss the browser's own bottom bar. The keyboard's measured height includes it, so the board shrinks, not the keys. `app/e2e/smoke.spec.ts` "phone fit" checks 30 px under Enter at 360x640, 360x780 and 390x844.

## Testing layers

- **Unit (Vitest, node):** everything in `src/game/`, plus pure helpers next to screens (`src/ui/**/*.ts`), the API clients with a fake `fetch` and an in-memory AsyncStorage mock, and `worker/test/` on real D1 in Miniflare.
- **E2E (Playwright, `app/e2e/`):** the web export with a fixed clock (`page.clock.install`; `setFixedTime` freezes React Native `Animated`), a stubbed `https://words.test` endpoint, and a third-party-host tripwire on every test. Review screenshots land in `app/e2e/artifacts/review/` (git-ignored).
- **Phone:** feel only (the owner's phone checks, issue #15), through Expo Go.

## Production

Live since 2026-11-13, on the default domains:

- Site: `https://words-and-waffles.pages.dev` (Cloudflare Pages project `words-and-waffles`, Web Analytics off).
- Worker: `https://words-and-waffles.mjohnson139.workers.dev` (`/v1/word`, `/v1/ping`, `/stats`, `/stats.json`), D1 database `words-and-waffles`, `WORD_SECRET` set.
- Deploy: merging to `main` runs CI, then the Deploy workflow, whose one `deploy` job (D1 migrations, Worker, web export, Pages, in that order) waits for the owner's approval on the `production` environment, once per run (PR #8). Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and variables `WORD_ENDPOINT` and `PING_ENDPOINT` are set in the repo.

`npm run live-check` (`scripts/live-check.mjs`) proves the five "Done means" items against production in about a minute. Its ping goes to production with `X-Dry-Run: 1`, which the Worker validates but never counts, and its last check proves `/stats` did not move. Run it after any deploy.
