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
| R1 | Fixes from the session 1 review (rollover race, Enter on web, per-day ping, cache keyed by endpoint, settings writes, Worker headers) | done (session 1) |
| S1 | Ship prep: service worker, deploy workflows, EAS config, icons, store copy | done (session 1) |
| 🛑 A | Owner: merge session 1's PR, Cloudflare, D1, secrets, domain; first deploy | **next** |
| S2 | Live checks of "Done means", README link and screenshot, repo settings | |
| 🛑 B | Owner: store accounts, EAS build and submit | |

## Next step: 🛑 A, the owner deploys

**If a session starts before 🛑 A is done** (no Cloudflare secrets and no owner comment saying it is deployed): do not wait for it. Pick the smallest open item from "Open questions" that needs no owner decision, or improve test coverage of an untested path; otherwise stop and say the deploy is pending.

Everything up to the deploy is built and tested in the cloud: 142 app unit tests, 17 Worker tests on real D1, 15 Playwright tests against the web export (including offline after one visit and a third-party-host tripwire), web bundle ~240 KB of the 500 KB budget. Nothing is deployed and no account exists yet.

**What the owner does** (about 20 minutes; every command is in [docs/deploy.md](deploy.md)):

1. Merge session 1's PR into `main`. The Deploy workflow runs and skips with a notice, because no secrets exist yet. CI should be green.
2. Follow `docs/deploy.md` steps 1-6: create the D1 database and commit its id into `worker/wrangler.toml`; `wrangler secret put WORD_SECRET`; create the API token; add the GitHub secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) and variables (`WORD_ENDPOINT`, `PING_ENDPOINT`); create the Pages project with Web Analytics off; run Actions → Deploy.
3. Answer the open questions below that matter before going public (licence, domain, bundle id, share text).
4. 🚩 Optional, any time: `npm install -g npm@11.21.2 && npm install && npm start -w app`, open it in Expo Go on a phone, and play a game. Note on the PR anything that feels off (animations, haptics, keyboard size, the share sheet for Back up).

**What the owner tells the next session** (as a comment on the PR or an issue, or simply by starting it): the deployed Worker URL and Pages URL. The next session reads them from the repository variables and `wrangler.toml` if they are there.

**Then S2 (the next agent step), in short:**
- Goal: prove each "Done means" item against production and finish the public face of the repo.
- Units: an `implementer` writes `scripts/live-check.mjs` (Playwright against the live Pages URL: play a game, assert only the two own hosts are contacted, exactly one word request and at most one ping, offline reload works; curl `/stats` and `/stats.json`; `/v1/word` for today decodes; a future date is rejected), runs it, and records the evidence in the PR. A `mechanic` adds the live link and a GIF or screenshot of a win (from the e2e review screenshots against production) to the README. The orchestrator checks "swapping `EXPO_PUBLIC_WORD_ENDPOINT` changes the word" with a local `wrangler dev` on another secret, and "a backup from one device restores on another" (the e2e backup test against production).
- Repo settings the owner applies (agents cannot): description "A cosy daily word game. No accounts, no trackers.", topics `expo`, `react-native`, `word-game`, `privacy`, `cloudflare-workers`, website = the Pages URL.
- Then 🛑 B: store accounts and `eas build` / `eas submit` (docs/deploy.md "Phone builds", docs/store-listing.md).

## Deferred findings (from the session 1 review)

- **8. Ping bodies without Content-Length are read before the size check.** Low risk (the Worker only parses); cover with a Cloudflare rate-limit rule at deploy (S1, `docs/deploy.md`).

## Open questions for the owner

Each has a default the work proceeds on.

- **Licence:** MIT (brief default). Change before the repo is promoted?
- **Domain:** default `*.workers.dev` for the Worker and `*.pages.dev` for the site until you pick one. With a custom domain, the ping rate-limit rule in `docs/deploy.md` step 8 becomes available.
- **Bundle ID / package name:** `app.wordsandwaffles` is set in `app/app.json`. Change it before the first store build if you prefer another; it cannot change after.
- **Share text:** daily results add the puzzle number (`Words & Waffles 🧇 #12 · Thu, Nov 12 · 3/6`). Keep?
- **Phase 2 sync** (iCloud KV, Android backup) is out of v1: it needs native code and breaks Expo Go. Want it later?
