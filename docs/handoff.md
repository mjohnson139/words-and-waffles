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
| 🛑 B | Owner: store accounts, EAS build and submit | **next** |
| F2 | Stats page v2: the app's look, year heatmap, tries chart from a second anonymous event | |
| F3 | Channels: a group code with a stored daily word (needs an owner decision first) | |

## Production

Live since 2026-11-13, on the default domains:

- Site: `https://words-and-waffles.pages.dev` (Cloudflare Pages project `words-and-waffles`, Web Analytics off).
- Worker: `https://words-and-waffles.mjohnson139.workers.dev` (`/v1/word`, `/v1/ping`, `/stats`, `/stats.json`), D1 database `words-and-waffles`, `WORD_SECRET` set.
- Deploy: merging to `main` runs CI, then the Deploy workflow, whose `worker` and `web` jobs wait for the owner's approval on the `production` environment. Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and variables `WORD_ENDPOINT` and `PING_ENDPOINT` are set in the repo.
- `npm run live-check` (`scripts/live-check.mjs`) proves the five "Done means" items against production in about a minute. Its ping goes to production with `X-Dry-Run: 1`, which the Worker validates but never counts, and its last check proves `/stats` did not move. Run it after any deploy.

Checks at the end of F1: 165 app unit tests, 27 Worker tests on real D1, 26 Playwright tests, web bundle 241.6 KB of the 500 KB budget locally. Live check (13 of 13 at the end of S2) runs again after F1 deploys.

## Next step: 🛑 B, the owner builds and submits the phone apps

**Goal:** Words & Waffles is in App Store Connect and Google Play (TestFlight / internal testing at least), built by EAS from `main`, with the share links of F1 pointing at the live site.

**Before you start:** merge PR #4 (F1), approve the Deploy run on the `production` environment, then run `npm run live-check` at the repo root. It should pass 13 of 13 with two requests. Open a share link on your phone's browser once: Pick a word, type a word, tap **Share link**, and open the link.

**What the owner does** (no agent can: it needs your accounts):

1. Apple Developer Program and Google Play Console accounts, if you don't have them yet.
2. `docs/deploy.md`, "Phone builds", steps 1-6. Step 4 now lists three EAS environment variables: `EXPO_PUBLIC_WORD_ENDPOINT`, `EXPO_PUBLIC_PING_ENDPOINT` and `EXPO_PUBLIC_SITE_URL` (`https://words-and-waffles.pages.dev/`). Without the last one the apps hide **Share link**.
3. Confirm the bundle id `app.wordsandwaffles` (`app/app.json`) before the first build: it cannot change afterwards.
4. Store listing from `docs/store-listing.md`. Privacy label: "Data not collected" (the ping is anonymous counters, PRIVACY.md).
5. Screenshots at the sizes in `docs/store-listing.md`. A session can take them for you against production (a variant of `scripts/live-check.mjs` with a 1290x2796 viewport); say so in a comment on the latest PR if you want that before you submit.

**What to check on the phone build:** a daily game, Seconds, Pick a word, and **Share link** from the app. The link opens in the browser, not the app: opening links in the installed app (universal links / app links) is deferred, see below.

**Questions this stop answers:** the bundle id; whether you want links to open the installed app (needs `apple-app-site-association` and `assetlinks.json` on Pages plus the app's associated domains; a small follow-up step once the apps exist, not Expo Go testable); the open questions below.

**The step after 🛑 B:** F2, the stats page v2 (plan 001, "Owner decisions, 2026-11-13": the app's look on `/stats`, a year heatmap, today's tries and win rate from a second anonymous end-of-game event, platform split; PRIVACY.md and the stats copy change from "one ping" to two events). Its first unit writes `docs/plans/2026-11-13-003-feat-stats-v2-plan.md`. A session that starts while 🛑 B is still open and finds no owner comment saying otherwise may go straight to F2: the order (F1, 🛑 B, F2) puts the store build first, but F2 does not depend on it.

**Not this step:** universal links (after 🛑 B, owner's call), channels with a stored word (F3, needs a decision), a web app manifest and `apple-touch-icon` (small; a good filler unit for any session).

**What already exists:** `app/eas.json` (development, preview, production profiles), `app/app.json` (scheme `wordsandwaffles`, bundle ids, icons, splash), `docs/deploy.md` "Phone builds", `docs/store-listing.md`, `app/src/config.ts` (`SITE_URL`), `app/src/ui/shareWord.ts`, `docs/plans/2026-11-13-002-feat-share-word-links-plan.md`.

## Deferred findings (from the session 1 review)

- **8. Ping bodies without Content-Length are read before the size check.** Low risk (the Worker only parses); cover with a Cloudflare rate-limit rule once a custom domain exists (`docs/deploy.md` step 8).

## Open questions for the owner

Each has a default the work proceeds on.

- **Licence:** MIT (brief default). Change before the repo is promoted?
- **Domain:** `*.workers.dev` and `*.pages.dev` until you pick one. With a custom domain, the ping rate-limit rule in `docs/deploy.md` step 8 becomes available.
- **Bundle ID / package name:** `app.wordsandwaffles` is set in `app/app.json`. Change it before the first store build if you prefer another; it cannot change after.
- **Share text:** daily results add the puzzle number (`Words & Waffles 🧇 #12 · Thu, Nov 12 · 3/6`). Keep?
- **Channels (F3):** a group code whose holders set a daily word stored on the Worker, words only from the game list, no names. Default: not planned until you say so.
- **Links into the apps:** share links open the website, also on phones with the app installed. Default: leave it so until you ask for universal links after 🛑 B.
- **Phase 2 sync** (iCloud KV, Android backup) is out of v1: it needs native code and breaks Expo Go. Want it later?
