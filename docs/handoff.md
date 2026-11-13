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
| S1 | Ship prep: service worker, deploy workflows, EAS config, icons, store copy | **next** |
| 🛑 A | Owner: Cloudflare, D1, secrets, domain, Expo account; first deploy | |
| S2 | Live checks of "Done means", README link and screenshot, repo settings | |
| 🛑 B | Owner: store accounts, EAS build and submit | |

## Next step: S1, ship prep

- **Goal:** everything needed to deploy exists and is tested, so the owner's 🛑 A is only creating accounts, pasting secrets and pressing go. After S1 the web app works offline after one visit.
- **Requirements:** plan "S1 - ship prep"; brief "Stack" (Pages, EAS), "The public repo" (CI deploys from `main` only, repo description and topics), "Done means" (offline cold start, bundle size).
- **Units and delegation** (see `.claude/skills/delegate/SKILL.md`):
  1. `implementer`: `app/public/sw.js` service worker (cache the shell and hashed bundles on install/first fetch, cache-first for same-origin static GETs, never cache `/v1/*` or cross-origin), registered from a tiny web-only module in production builds; an e2e test that loads once, goes offline (`context.setOffline(true)`), reloads and wins a game. Check how `expo export -p web` copies `app/public/` (Expo SDK 58 docs) before relying on it.
  2. `implementer`: `.github/workflows/deploy.yml` on push to `main` only: Worker (`wrangler d1 migrations apply --remote` then `wrangler deploy`) and Pages (`expo export -p web` with `EXPO_PUBLIC_WORD_ENDPOINT`/`EXPO_PUBLIC_PING_ENDPOINT` from repository variables, then `wrangler pages deploy`). Each job is skipped with a visible notice when `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are absent. Least-privilege `permissions`. A Cloudflare WAF rate-limit rule for `/v1/ping` is documented for the owner (deferred review finding 8).
  3. `mechanic`: `docs/deploy.md`, the owner's checklist for 🛑 A (Cloudflare account, `wrangler d1 create`, put the id in `worker/wrangler.toml`, `WORD_SECRET`, API token scopes, GitHub secrets and variables, Pages project with Web Analytics off, optional custom domain, Expo account and `eas init`), and `docs/store-listing.md` (name, subtitle, description, keywords without "Wordle", privacy label "Data not collected", support URL).
  4. `implementer`: `app/app.json` (name "Words & Waffles", slug, scheme, bundle id / package `app.wordsandwaffles` per the open question, `userInterfaceStyle: automatic`, splash and icons), `app/eas.json` (development, preview, production), and icons and splash rendered from the waffle logo SVG by a script in `scripts/` (any rasterizing via the preinstalled Playwright Chromium, no new dependency).
- **Decide in this step:** whether the service worker should also cache the word payload (no: the app already caches it in storage); how Pages gets the endpoint values (repository variables, not secrets, because they are public URLs).
- **Definition of done:**
  - [ ] Offline e2e test green; `npm run e2e -w app` green.
  - [ ] Deploy workflow passes `actionlint` (run it with `npx --yes actionlint` if available, else review by hand) and skips cleanly without secrets.
  - [ ] `npm run verify` green.
  - [ ] Review run and answered.
  - [ ] This file rewritten for 🛑 A (the owner checklist from `docs/deploy.md`, then S2).
- **Not this step:** deploying anything (🛑 A), the live checks (S2), store submission (🛑 B), retrying a failed cold-start word fetch (deferred review finding 5, below).
- **What already exists:** the whole app and Worker (see [engineering notes](engineering-notes.md)); CI in `.github/workflows/ci.yml` (verify job, e2e job); the e2e harness in `app/e2e/` (`fixtures.ts` fixes the clock with `page.clock.install`, stubs `https://words.test`, fails on third-party hosts; `serve.mjs` serves `app/dist`); `worker/wrangler.toml` with a placeholder D1 id; `worker/README.md`.

## Deferred findings (from the session 1 review)

- **5. A failed cold-start fetch fixes the bundled word for the day.** A failed or timed-out fetch is not cached, and nothing retries until the date changes or the app restarts. Fix later: one retry on app foreground while today's game has no guesses. Low impact while the Worker serves the same list as the bundle.
- **8. Ping bodies without Content-Length are read before the size check.** Low risk (the Worker only parses); cover with a Cloudflare rate-limit rule at deploy (S1, `docs/deploy.md`).

## Open questions for the owner

Each has a default the work proceeds on.

- **Licence:** MIT (brief default). Change before the repo is promoted?
- **Domain:** default `*.workers.dev` for the Worker and `*.pages.dev` for the site until you pick one.
- **Bundle ID / package name:** default `app.wordsandwaffles`.
- **Share text:** daily results add the puzzle number (`Words & Waffles 🧇 #12 · Thu, Nov 12 · 3/6`). Keep?
- **Phase 2 sync** (iCloud KV, Android backup) is out of v1: it needs native code and breaks Expo Go. Want it later?
