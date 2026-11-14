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
| W2 | Home-screen install on the web: manifest, apple-touch-icon, icons | **next** (owner's pick, 2026-11-14, while 🛑 B waits) |
| 🛑 B | Owner: store accounts, EAS build and submit | open: owner, whenever they are at their Mac; does not block W2 |
| F3 | Channels: a group code with a stored daily word (needs an owner decision first) | |

## Production

Live since 2026-11-13, on the default domains:

- Site: `https://words-and-waffles.pages.dev` (Cloudflare Pages project `words-and-waffles`, Web Analytics off).
- Worker: `https://words-and-waffles.mjohnson139.workers.dev` (`/v1/word`, `/v1/ping`, `/stats`, `/stats.json`), D1 database `words-and-waffles`, `WORD_SECRET` set.
- Deploy: merging to `main` runs CI, then the Deploy workflow, whose `worker` and `web` jobs wait for the owner's approval on the `production` environment. Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and variables `WORD_ENDPOINT` and `PING_ENDPOINT` are set in the repo.
- `npm run live-check` (`scripts/live-check.mjs`) proves the five "Done means" items against production in about a minute. Its ping goes to production with `X-Dry-Run: 1`, which the Worker validates but never counts, and its last check proves `/stats` did not move. Run it after any deploy.

Checks at the end of F2: 176 app unit tests, 45 Worker tests on real D1, 29 Playwright tests, web bundle 242.1 KB of the 500 KB budget locally. From F2 the live check also dry-runs the end-of-game result (`POST /v1/result`), so it needs the F2 Worker deployed before it passes.

## Next step: W2, home-screen install on the web

The owner is away from their Mac, so 🛑 B (below) cannot happen yet. They chose this small web-only step in the meantime (2026-11-14). **Start a new branch from `main` once PR #5 is merged** (`feature/w2`); if PR #5 is still open, branch from `feature/f2` and say so in the PR. Do not add W2 to PR #5.

**Goal:** on a phone, "Add to Home Screen" (iOS Safari) or "Install app" (Android Chrome) gives Words & Waffles a proper icon, name and splash colours, and the site opens standalone with no browser bar, offline as it does today.

**Requirements:** none in plan 001 beyond the "small filler" note; the shape below is the spec. Brand colours come from `app/app.json` (`web.themeColor` / `backgroundColor` `#e6edf8`, dark splash `#171b30`) and `app/src/ui/theme.ts`.

**What session 4 already found (so it is not re-derived):**

- `expo export -p web` (SDK 58, single-page output) builds `index.html` from `app/public/index.html` **if that file exists**, else from Expo's default template (`node_modules/@expo/cli/build/src/start/server/webTemplate.js`, `getTemplateIndexHtmlAsync`). It replaces `%LANG_ISO_CODE%` and `%WEB_TITLE%`, appends the scripts, and adds `theme-color` from `app.json`. So the head tags go in a new `app/public/index.html`: copy the current output head (`app/dist/index.html` after `npm run export:web -w app`, including the react-native-web reset `<style id="expo-reset">`, the `<noscript>` and `<div id="root">`), then add the manifest link and the Apple tags.
- Everything in `app/public/` is copied to the root of `app/dist`, which Cloudflare Pages serves (Deploy workflow, `wrangler pages deploy ../app/dist`).
- The only icon source is `app/assets/icon.png` (1024x1024 RGB, no transparency); `favicon.png` is 48x48. Android adaptive layers are `app/assets/android-icon-*.png`.
- `app/public/sw.js` caches static files by the `STATIC` regex (`.png` matches; `.webmanifest` does not). Read `docs/solutions/integration-issues/service-worker-on-cloudflare-pages.md` before touching it.

**Units and delegation** (one `implementer`, serial; small enough for one brief):

1. Icons in `app/public/icons/`: `icon-192.png`, `icon-512.png`, `maskable-512.png` (the art inside the central 80% safe zone on the `#e6edf8` table colour), `apple-touch-icon.png` 180x180 (opaque; iOS rounds the corners). Generate them once from `app/assets/icon.png` with a committed script (`scripts/web-icons.mjs`, using Playwright's Chromium canvas or `sharp` if already in the tree; no new dependency without a PR sentence), and commit the PNGs.
2. `app/public/manifest.webmanifest`: `name` "Words & Waffles", `short_name` "Waffles" (or the full name if it fits under the icon; check on the screenshot), `start_url` "/", `scope` "/", `display` "standalone", `background_color` and `theme_color` `#e6edf8`, the three icons with `purpose` `any` / `maskable`. No `id` field that identifies anything, no external URLs.
3. `app/public/index.html` as above, plus `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`, `<meta name="apple-mobile-web-app-title" content="Words & Waffles">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`, and `theme-color` for both schemes (`media="(prefers-color-scheme: dark)"` with `#171b30`).
4. `sw.js`: precache `/manifest.webmanifest` and the icons at install, extend `STATIC` to `.webmanifest`, bump `VERSION`. Keep every guard in the solutions doc.
5. Tests: an e2e check (`app/e2e/`) that `/manifest.webmanifest` serves valid JSON with the fields above, that every icon it lists loads as `image/png` at its stated size, that `index.html` has the manifest and apple-touch-icon links, and that the offline spec still passes. Chromium can also report installability (`page.evaluate` on the manifest, or the "Application" checks via CDP `Page.getAppManifest`); use it if it is cheap.

**Decide in this step:** `short_name` (evidence: a 390px screenshot of the label width is not available in a browser, so pick the shortest that still reads as the game; "Waffles" is the default); whether `display_override` / `orientation: portrait` are worth adding (the app is portrait-only in `app.json`; default: add `orientation: "portrait"`).

**Definition of done:**

- [ ] `app/dist/` after `npm run export:web -w app` has `manifest.webmanifest`, `icons/*.png`, and an `index.html` with the new head tags and still exactly one bundle script.
- [ ] e2e manifest/icon checks pass; `offline.spec.ts` still passes; bundle budget unchanged (icons are not in the JS bundle, but the size script counts html+js+css only; confirm).
- [ ] PR body has screenshots of the icons, and says how the owner tests it: open the site on the phone, Share → Add to Home Screen (iOS) or ⋮ → Install app (Android), launch it, airplane mode, launch again.
- [ ] `npm run verify` green; e2e green; review run and answered.
- [ ] After merge and deploy, `npm run live-check` still passes (no change expected).
- [ ] This file rewritten: if 🛑 B is still open, the next step is the next filler the owner picks (offer: store screenshots from production at the `docs/store-listing.md` sizes, a key-prefix filter for `/stats`, or F3 once its decision is made); otherwise the step after 🛑 B.

**Not this step:** store builds (🛑 B), universal links (after 🛑 B), the `/stats` key-prefix filter (F2 review finding 6), F3.

## Pending owner stop: 🛑 B, the owner builds and submits the phone apps

**Goal:** Words & Waffles is in App Store Connect and Google Play (TestFlight / internal testing at least), built by EAS from `main`, with share links pointing at the live site.

**Before you start:** merge PR #5 (F2), approve the Deploy run on the `production` environment, then run `npm run live-check` at the repo root. Every check should pass, including the new result dry run. Open `https://words-and-waffles.mjohnson139.workers.dev/stats` and check the new page.

**What the owner does** (no agent can: it needs your accounts):

1. Apple Developer Program and Google Play Console accounts, if you don't have them yet.
2. Link the app to an Expo project: `npx eas-cli init` from `app/` on your own machine (session 4 found no Expo project for `@mjohnson139/words-and-waffles`, so neither an agent nor the Expo connector can start a build yet). That writes `extra.eas.projectId` into `app/app.json`; commit it in a small PR.
3. `docs/deploy.md`, "Phone builds", steps 1-6. Step 4 lists three EAS environment variables: `EXPO_PUBLIC_WORD_ENDPOINT`, `EXPO_PUBLIC_PING_ENDPOINT` and `EXPO_PUBLIC_SITE_URL` (`https://words-and-waffles.pages.dev/`). Without the last one the apps hide **Share link**. The result endpoint needs no variable: it is derived from the ping endpoint.
4. Confirm the bundle id `app.wordsandwaffles` (`app/app.json`) before the first build: it cannot change afterwards.
5. Store listing from `docs/store-listing.md`. Privacy label: "Data not collected" (the ping and the end-of-game result are anonymous counters, PRIVACY.md); check that reading against the current Apple and Google definitions.
6. Screenshots at the sizes in `docs/store-listing.md`. A session can take them for you against production (a variant of `scripts/live-check.mjs` with a 1290x2796 viewport); say so in a PR comment if you want that.

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
- **Phase 2 sync** (iCloud KV, Android backup) is out of v1: it needs native code and breaks Expo Go. Want it later?
