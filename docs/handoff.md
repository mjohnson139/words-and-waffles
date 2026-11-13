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
| P0 | Dev process, scaffold (Expo SDK 58 workspace, Vitest, ESLint, bundle budget), repo docs, CI | **in progress** (this session) |
| C1 | Pure core in `app/src/game/` + `app/src/ui/fit.ts` | next |
| W1 | Worker: word, ping, stats, D1, tests | |
| U1 | App shell: theme, font, table, header, tabs, games store | |
| U2 | Play screen | |
| 🚩 | Owner looks at Play in Expo Go (non-blocking) | |
| U3 | History and Stats | |
| U4 | Backup/restore, ping switch, endpoint override | |
| N1 | Client word fetch/decode/cache/fallback | |
| N2 | Ping client | |
| E1 | Playwright smoke in CI | |
| S1 | Ship prep: service worker, deploy workflows, EAS config, icons, store copy | |
| 🛑 A | Owner: Cloudflare, D1, secrets, domain, Expo account; first deploy | |
| S2 | Live checks of "Done means", README link and screenshot, repo settings | |
| 🛑 B | Owner: store accounts, EAS build and submit | |

## Next step: C1, the pure core

- **Goal:** every rule in the prototype that can be wrong exists as a pure, tested TypeScript module, so screens and the Worker only wire it up.
- **Requirements:** plan, "C1 - pure core" and "Contracts"; brief, "Word-of-the-day endpoint" (cell encoding) and "Counting people" (flags).
- **Units and delegation:** one `implementer` for the game modules (words, dates, daily, score, play, record, stats, share), one for the contract and flags (sha256, cells, ping, fit). Disjoint files, run in parallel in worktrees.
- **Definition of done:**
  - [ ] Modules and tests listed in the plan exist; `src/game` imports nothing from React/RN/Expo.
  - [ ] `npm run verify` green.
  - [ ] Review run and answered.
  - [ ] This file rewritten for W1.
- **Not this step:** any screen (U1+), any network code (N1, N2), the Worker (W1).
- **What already exists:** `app/` scaffold with Vitest (`app/vitest.config.ts`), ESLint flat config with the purity rule (`app/eslint.config.js`), bundle budget (`scripts/bundle-size.mjs`), the word list (`docs/prototype/words.json`, keys `a` answers and `v` valid, packed 5 letters per word).

## Open questions for the owner

Each has a default the work proceeds on.

- **Licence:** MIT (brief default). Change before the repo is promoted?
- **Domain:** default `*.workers.dev` for the Worker and `*.pages.dev` for the site until you pick one.
- **Bundle ID / package name:** default `app.wordsandwaffles`.
- **Share text:** daily results add the puzzle number (`Words & Waffles 🧇 #12 · Thu, Nov 12 · 3/6`). Keep?
- **Phase 2 sync** (iCloud KV, Android backup) is out of v1: it needs native code and breaks Expo Go. Want it later?
