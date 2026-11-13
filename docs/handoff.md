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
| F1 | Share a word by link | **next** |
| 🛑 B | Owner: store accounts, EAS build and submit | |
| F2 | Stats page v2: the app's look, year heatmap, tries chart from a second anonymous event | |
| F3 | Channels: a group code with a stored daily word (needs an owner decision first) | |

## Production

Live since 2026-11-13, on the default domains:

- Site: `https://words-and-waffles.pages.dev` (Cloudflare Pages project `words-and-waffles`, Web Analytics off).
- Worker: `https://words-and-waffles.mjohnson139.workers.dev` (`/v1/word`, `/v1/ping`, `/stats`, `/stats.json`), D1 database `words-and-waffles`, `WORD_SECRET` set.
- Deploy: merging to `main` runs CI, then the Deploy workflow, whose `worker` and `web` jobs wait for the owner's approval on the `production` environment. Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and variables `WORD_ENDPOINT` and `PING_ENDPOINT` are set in the repo.
- `npm run live-check` (`scripts/live-check.mjs`) proves the five "Done means" items against production in about a minute. It lets exactly one ping reach production, so each run counts one install on `/stats`; its other browser contexts abort theirs. Run it after any deploy.

Checks at the end of S2: 147 app unit tests, 26 Worker tests on real D1, 17 Playwright tests, live check 12 of 12, web bundle 239.4 KB of the 500 KB budget locally and 237.2 KB as served.

## Next step: F1, share a word by link

**Goal:** a player who picks a word can hand it to a friend as a link instead of handing over the phone. Opening the link starts that word as a "Picked word" game, on the web today and in the apps when they exist. Nothing about the word touches a server.

**Requirements:** the owner's decisions in the plan under "Owner decisions, 2026-11-13" (share links only, nothing stored, before the store builds). The plan for this step does not exist yet: the first unit of the step writes it with `ce-brainstorm` (product shape: what the share moment looks like, what the receiver sees, what happens when the link is bad or the receiver already played that word) and then `ce-plan`, as `docs/plans/2026-11-13-002-feat-share-word-links-plan.md`. The "Pick a word" behaviour is the base: the prototype's sheet (`docs/prototype/prototype.html` lines 413-421) and its port, `startCustom` in `app/src/game/play.ts`. The word contract in the README ("The word endpoint contract") is the obfuscation to reuse.

**Units and delegation** (expected shape; the plan may refine it):

1. Plan (orchestrator): `ce-brainstorm` then `ce-plan`, with the owner's decisions pre-answered. Half a session at most; the feature is small.
2. `implementer`: `app/src/game/shareLink.ts` (pure): `encodeShareLink(word, salt)` returns the URL fragment, `parseShareLink(fragment)` returns the word or null. Reuse `encodeCells` and `decodeCells` from `cells.ts` with a fresh random salt per link, so the link looks like the daily payload and never contains the word in clear. Tests: round trip, tampered cell, wrong length, upper case and whitespace, an old or unrelated fragment, the empty fragment.
3. `implementer`: the UI. On the result card and in the "Pick a word" sheet, a share action that copies the link (web: `navigator.share` when available, else the clipboard; native: `expo-sharing` is already a dependency). On launch and on `hashchange`, a `#w=` fragment starts a custom game with that word and a toast in the prototype's voice, then clears the fragment so a reload does not restart it. The game record keeps its existing shape (`mode: 'custom'`, `source: 'local'`); nothing new is stored.
4. `implementer`: e2e in `app/e2e/share.spec.ts`: a picked word's share action yields a link; opening it in a fresh context plays that word; a bad fragment falls back to Today with a toast; the third-party-host tripwire holds. Run in parallel with unit 3 only if the plan fixes the link format first.
5. `mechanic`: README "What it is" sentence and `docs/store-listing.md` copy mention sharing a word by link.

**Decide in this step** (write the answer into the plan):

- Fragment (`#w=`) rather than a query string, so the obfuscated word never reaches Cloudflare's request logs. Evidence: the request audit in e2e and `live-check` stays at the same two requests.
- Native deep links. The web link is the share target for every platform in F1. A custom URL scheme or iOS universal links need a dev build and an `apple-app-site-association` file on Pages, which Expo Go cannot exercise; defer them to 🛑 B, and say so in the plan.
- Whether a shared word must be in the dictionary. `startCustom` accepts any five letters today; keep that, since the sender already saw the word.

**Definition of done:**

- The plan file exists and the units above (or the plan's version of them) are implemented with unit tests and the e2e spec.
- A link made on the web opens and plays on the web; the e2e spec proves it; `npm run live-check` still passes against production after the deploy, and the request audit still shows two requests.
- No new dependency, nothing identifies a player, no server change.
- `npm run verify` green; `npm run e2e -w app` green.
- Review run and answered.
- This file rewritten for 🛑 B (what the owner must do, with `docs/deploy.md` "Phone builds" and `docs/store-listing.md`; store screenshots at store sizes are 🛑 B prep, see below).

**Not this step:**

- Channels with a stored daily word: F3, after an owner decision.
- The stats page redesign and the end-of-game event: F2, after 🛑 B.
- Store screenshots at the sizes in `docs/store-listing.md`: 🛑 B prep. A variant of `scripts/live-check.mjs` with a 1290x2796 viewport can take them against production.
- A web app manifest and `apple-touch-icon` so the site installs to a phone's home screen: small, needs no decision, and a good fallback item if F1 is blocked.

**What already exists:**

- `app/src/game/cells.ts` (`encodeCells`, `decodeCells`), `app/src/game/sha256.ts`, `app/src/game/play.ts` (`startCustom`, `newGame`, `resume`), `app/src/game/record.ts` (the record contract).
- `app/src/ui/play/PickWord.tsx` (the pick-a-word sheet), `app/src/ui/play/ResultCard.tsx` (copy result), `app/src/game/share.ts` (share text), `app/src/store/backup.web.ts` (web download and share patterns), `expo-clipboard` and `expo-sharing` in `app/package.json`.
- `app/e2e/fixtures.ts` (fixed clock, stubbed endpoints, tripwire), `app/e2e/smoke.spec.ts` ("seconds starts another word; pick a word can be guessed" drives the sheet).
- `App.tsx` owns the date, settings and games and passes them down; the fragment handler belongs beside `useToday` and `useDailyWord`, not in a screen.

## Deferred findings (from the session 1 review)

- **8. Ping bodies without Content-Length are read before the size check.** Low risk (the Worker only parses); cover with a Cloudflare rate-limit rule once a custom domain exists (`docs/deploy.md` step 8).

## Open questions for the owner

Each has a default the work proceeds on.

- **Licence:** MIT (brief default). Change before the repo is promoted?
- **Domain:** `*.workers.dev` and `*.pages.dev` until you pick one. With a custom domain, the ping rate-limit rule in `docs/deploy.md` step 8 becomes available.
- **Bundle ID / package name:** `app.wordsandwaffles` is set in `app/app.json`. Change it before the first store build if you prefer another; it cannot change after.
- **Share text:** daily results add the puzzle number (`Words & Waffles 🧇 #12 · Thu, Nov 12 · 3/6`). Keep?
- **Channels (F3):** a group code whose holders set a daily word stored on the Worker, words only from the game list, no names. Default: not planned until you say so.
- **Phase 2 sync** (iCloud KV, Android backup) is out of v1: it needs native code and breaks Expo Go. Want it later?
