# Words & Waffles: next-step handoff

**If you are a session picking up this work, read this file first, then do the step under "Next step".** The file is rewritten at the end of every step, and that rewrite is part of the step's definition of done.

## The prompt (the same every time)

```
Continue Words & Waffles: in mjohnson139/words-and-waffles, check out main, read docs/handoff.md, and follow its "Next step" section.
```

The prompt never names a step. If a session needs different instructions, change this file, never the prompt.

## How every session works

1. **Read, in order:** this file; the [plan](plans/2026-11-13-001-feat-v1-app-plan.md) (Goal Capsule, Architecture, Contracts, then the units for your step); [`.github/dev-process.md`](../.github/dev-process.md); [engineering notes](engineering-notes.md). Search [`docs/solutions/`](solutions/README.md) for the area you touch.
2. **Check open PRs and the latest owner comments.** An owner comment beats this file. If the previous session's PR is still unmerged, build on its branch rather than redoing its work, and say so in your PR.
3. **Set up:** `npm install -g npm@11.21.2 && npm install` at the root (npm 10 crashes on this workspace: `docs/solutions/build-issues/npm10-workspace-edgesout-crash.md`).
4. **Work on the branch the session was given** (or `feature/<step-id>` from an up-to-date `main`). Commit small, push after every step, open one draft PR into `main` after the first step.
5. **Do the step under "Next step"**, delegating units per `.claude/skills/delegate/SKILL.md`. When it is done (definition of done below), rewrite this file with `.claude/skills/write-handoff/SKILL.md` and, if context allows and no 🛑 is next, carry on with the new next step in the same branch and PR.
6. **Before the PR leaves draft:** `npm run verify` green at the root, the e2e smoke green (from E1), a review run and answered.
7. **Cloud sessions:** never run `expo run:ios`, `expo prebuild`, Xcode or an Android emulator. The screen check is the web export driven by Playwright (Chromium is preinstalled; do not run `playwright install` in the sandbox).

Rules: logic in pure, node-tested modules; no new dependency without a reason in the PR; nothing that identifies a player; only the owner merges.

## Steps

| Step | What | Status |
|---|---|---|
| P0 | Dev process, scaffold (Expo SDK 58 workspace, Vitest, ESLint, bundle budget), repo docs, CI | done (session 1) |
| C1 | Pure core in `app/src/game/` + `app/src/ui/fit.ts` | done (session 1) |
| W1 | Worker: word, ping, stats, D1, tests | done (session 1) |
| U1 | App shell: theme, font, table, header, tabs, games store | done (session 1) |
| U2 | Play screen | done (session 1) |
| 🚩 | Owner looks at Play in Expo Go (non-blocking) | open, whenever convenient |
| U3 | History and Stats | done (session 1) |
| U4 | Backup/restore, ping switch, endpoint override | done (session 1) |
| N1 | Client word fetch/decode/cache/fallback | done (session 1) |
| N2 | Ping client | done (session 1) |
| E1 | Playwright smoke in CI | done (session 1) |
| R1 | Fixes from the session 1 review | done (session 1) |
| S1 | Ship prep: service worker, deploy workflows, EAS config, icons, store copy | done (session 1, PR #1) |
| 🛑 A | Owner: Cloudflare, D1, secrets, first deploy | done 2026-11-13 (PR #2 and Deploy run #3) |
| S2 | Live checks of "Done means", README link and screenshot, repo settings | done (session 2, PR #3) |
| F1 | Share a word by link | done (session 3, PR #4) |
| F2 | Stats page v2: the app's look, year heatmap, tries chart from a second anonymous event | done (session 4, PR #5, ahead of 🛑 B) |
| W2 | Home-screen install on the web: manifest, apple-touch-icon, icons | done (session 5, PR #6; live once deployed) |
| S3 | Store screenshots from production at the `docs/store-listing.md` sizes | **next** (default filler while 🛑 B waits; owner may pick another) |
| 🛑 B | Owner: store accounts, EAS build and submit | open: owner, whenever they are at their Mac; does not block W2 |
| F3 | Channels: a group code with a stored daily word (needs an owner decision first) | |

## Production

Live since 2026-11-13, on the default domains:

- Site: `https://words-and-waffles.pages.dev` (Cloudflare Pages project `words-and-waffles`, Web Analytics off).
- Worker: `https://words-and-waffles.mjohnson139.workers.dev` (`/v1/word`, `/v1/ping`, `/stats`, `/stats.json`), D1 database `words-and-waffles`, `WORD_SECRET` set.
- Deploy: merging to `main` runs CI, then the Deploy workflow, whose `worker` and `web` jobs wait for the owner's approval on the `production` environment. Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and variables `WORD_ENDPOINT` and `PING_ENDPOINT` are set in the repo.
- `npm run live-check` (`scripts/live-check.mjs`) proves the five "Done means" items against production in about a minute. Its ping goes to production with `X-Dry-Run: 1`, which the Worker validates but never counts, and its last check proves `/stats` did not move. Run it after any deploy.

Checks at the end of W2: 176 app unit tests, 45 Worker tests on real D1, 33 Playwright tests, web bundle 242.5 KB of the 500 KB budget locally. From W2 the live check also fetches `/manifest.webmanifest` and its icons (`home-screen install files`); it fails until the W2 web build is deployed, because Pages answers unknown paths with `index.html`.

## Next step: S3, store screenshots from production

**Before you start:** PR #6 (W2) should be merged and its Deploy run approved; then `npm run live-check` passes all checks including `home-screen install files`. If PR #6 is still open, branch from `claude/pensive-gates-shvsah` (W2) and say so in your PR; do not add S3 to PR #6. If the owner has picked a different filler (a PR comment or a note in this file), do that instead: the other offers are the `/stats` key-prefix filter (deferred finding F2-6) and F3 (needs the owner's channels decision first).

**Goal:** the owner has the five store screenshots from `docs/store-listing.md` "Screenshots" (Play mid-game, a win with toppings, History, Stats, dark mode) at each required size, taken from the live site, ready to upload during 🛑 B.

**Requirements:** `docs/store-listing.md` "Screenshots"; 🛑 B item 6 below. Look up the current pixel sizes before capturing (App Store Connect: iPhone 6.9-inch, e.g. 1320x2868 or 1290x2796, and 6.5-inch 1242x2688 / 1284x2778; Google Play phone: 16:9 or 9:16, 320-3840 px per side) and record the ones used in `docs/store-listing.md`.

**Units and delegation** (one `implementer`, serial):

1. `scripts/store-shots.mjs`, a variant of `scripts/live-check.mjs` (reuse its `quietContext`, `openApp`, `guess` shape and its `ALLOWED` host audit): for each size, a Playwright context with viewport = size / deviceScaleFactor (e.g. 430x932 at 3 for 1290x2796), the daily word from production (the live check already reads it), a mid-game board, a win, History, Stats, and the dark colour scheme (`colorScheme: 'dark'`). Pings off in the app (the Settings switch) so the run counts nothing; the last live-check step ("stats not inflated") shows how to prove that. Files to `docs/store-listing/screenshots/<store>-<size>/<n>-<name>.png`, opaque PNG, exact pixel size checked after capture.
2. Commit the PNGs (check their total size; if over ~5 MB, put them in the PR as an artifact link instead and say so) and a short "how to refresh" line in `docs/store-listing.md`.

**Decide in this step:** whether the board shows a real daily word (spoils that day's puzzle in a public repo; default: use a shared-word link `#w=...` built with `src/game/shareLink.ts` for a fixed non-daily word instead, so no daily answer is published); whether to hide the status-bar area (default: no web chrome exists in a Playwright screenshot, so nothing to hide).

**Definition of done:**

- [ ] All five shots at every size, exact pixels, light and dark as listed.
- [ ] No daily answer visible in a committed image; `/stats` unchanged by the run.
- [ ] PR body shows one size's set inline.
- [ ] `npm run verify` green; e2e green; review run and answered.
- [ ] This file rewritten: next is 🛑 B if still open (with the screenshots path added to its item 6), else the step after 🛑 B.

**Not this step:** store builds and submission (🛑 B), universal links (after 🛑 B), the `/stats` key-prefix filter (F2-6), F3.

**What already exists:** `scripts/live-check.mjs` (production driver, host audit, dry-run pings), `app/e2e/smoke.spec.ts` "review screenshots" (light and dark capture locally), `app/e2e/fixtures.ts` (`guess`, `wrongWord`), `app/src/game/shareLink.ts`, `docs/store-listing.md`, W2's icons in `app/public/icons/` and preview `docs/screenshots/w2-icons.png`.

## Pending owner stop: 🛑 B, the owner builds and submits the phone apps

**Goal:** Words & Waffles is in App Store Connect and Google Play (TestFlight / internal testing at least), built by EAS from `main`, with share links pointing at the live site.

**Before you start:** merge the open W2/S3 PRs, approve the Deploy run on the `production` environment, then run `npm run live-check` at the repo root. Every check should pass. On your phone, try the web install too: open the site, Share → Add to Home Screen (iOS) or ⋮ → Install app (Android).

**What the owner does** (no agent can: it needs your accounts):

1. Apple Developer Program and Google Play Console accounts, if you don't have them yet.
2. Link the app to an Expo project: `npx eas-cli init` from `app/` on your own machine (session 4 found no Expo project for `@mjohnson139/words-and-waffles`, so neither an agent nor the Expo connector can start a build yet). That writes `extra.eas.projectId` into `app/app.json`; commit it in a small PR.
3. `docs/deploy.md`, "Phone builds", steps 1-6. Step 4 lists three EAS environment variables: `EXPO_PUBLIC_WORD_ENDPOINT`, `EXPO_PUBLIC_PING_ENDPOINT` and `EXPO_PUBLIC_SITE_URL` (`https://words-and-waffles.pages.dev/`). Without the last one the apps hide **Share link**. The result endpoint needs no variable: it is derived from the ping endpoint.
4. Confirm the bundle id `app.wordsandwaffles` (`app/app.json`) before the first build: it cannot change afterwards.
5. Store listing from `docs/store-listing.md`. Privacy label: "Data not collected" (the ping and the end-of-game result are anonymous counters, PRIVACY.md); check that reading against the current Apple and Google definitions.
6. Screenshots at the sizes in `docs/store-listing.md`; step S3 takes them from production.

Optional: once the Expo project exists and the repo is connected to it in the Expo dashboard (GitHub integration), a session can start EAS builds itself through the Expo connector. Store credentials and submission stay with you.

**What to check on the phone build:** a daily game, Seconds, Pick a word, **Share link** from the app (opens in the browser), and that finishing the daily word shows up under "Today's word" on `/stats` within five minutes.

**Questions this stop answers:** the bundle id; whether links should open the installed app (universal links / app links); the open questions below.

**After 🛑 B:** universal links if the owner wants them (needs `apple-app-site-association` and `assetlinks.json` on Pages plus associated domains in `app/app.json`), then whatever the owner picks from the open questions.

**Not this step:** universal links (after 🛑 B, owner's call), channels with a stored word (F3, needs a decision).

**What already exists:** `app/eas.json` (development, preview, production profiles), `app/app.json` (scheme `wordsandwaffles`, bundle ids, icons, splash), `docs/deploy.md` "Phone builds", `docs/store-listing.md`, `app/src/config.ts`, `docs/plans/2026-11-13-003-feat-stats-v2-plan.md` (what F2 shipped).

## Deferred findings (from the session 1 review)

- **8. Ping and result bodies without Content-Length are read before the size check.** Low risk (the Worker only parses); cover with a Cloudflare rate-limit rule once a custom domain exists (`docs/deploy.md` step 8), or a bounded stream read.
- **F2-6. `/stats` reads the whole `counts` table per request** (cached 5 minutes at the edge). About 7 new rows a day; add a key-prefix filter if it ever matters.

## Open questions for the owner

Each has a default the work proceeds on.

- **Licence:** MIT (brief default). Change before the repo is promoted?
- **Domain:** `*.workers.dev` and `*.pages.dev` until you pick one. With a custom domain, the ping rate-limit rule in `docs/deploy.md` step 8 becomes available.
- **Bundle ID / package name:** `app.wordsandwaffles` is set in `app/app.json`. Change it before the first store build if you prefer another; it cannot change after.
- **Share text:** daily results add the puzzle number (`Words & Waffles 🧇 #12 · Thu, Nov 12 · 3/6`). Keep?
- **Channels (F3):** a group code whose holders set a daily word stored on the Worker, words only from the game list, no names. Default: not planned until you say so.
- **Links into the apps:** share links open the website, also on phones with the app installed. Default: leave it so until you ask for universal links after 🛑 B.
- **Stats page (F2):** "Today's word" shows only one puzzle (the busiest of yesterday, today, tomorrow) and headings use the system rounded font, not Bagel Fat One. Default: keep both.
- **Home-screen name (W2):** the installed web app is labelled "Waffles" on iOS and Android (the full name truncates under the icon); the in-app title stays "Words & Waffles". Default: keep. The installed app's title bar uses the light table colour in dark mode too (a manifest has one `theme_color`).
- **Phase 2 sync** (iCloud KV, Android backup) is out of v1: it needs native code and breaks Expo Go. Want it later?
