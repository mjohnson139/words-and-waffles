# Engineering notes

The current architecture map and the invariants that are easy to break. Read the section for the area you are changing. Scope and the step order live in the [plan](plans/2026-11-13-001-feat-v1-app-plan.md); investigations live in [solutions](solutions/README.md); how to work lives in the [dev process](../.github/dev-process.md).

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
- **Dates are local calendar strings** (`YYYY-MM-DD` from the device's local time). Day arithmetic goes through `dnum()` (UTC midnight of that calendar date), so DST never makes a day 23 or 25 hours. Server-side counter keys use UTC dates; the word endpoint takes the player's local date.
- **Stats are derived, never stored.** Only game records persist. A backup is the records and nothing else.
- **Merging games** keeps the record with the higher `rank()` per id (finished beats playing, more guesses beat fewer). Restore and any future sync use the same rule.
- **A daily game that has guesses keeps its answer**, even if the word endpoint later returns a different word for that date.
- **Nothing identifies a player.** The ping body has five fields and no ID; the Worker stores counters only and never logs requests. The rate limiter's IP map lives in isolate memory only.
- **The word hashing is obfuscation**, not security. Never describe it otherwise.
- **Expo Go compatible:** only Expo SDK modules, no custom native code.
- **Animations** use the native driver on iOS/Android and the JS driver on web; reduced motion skips them entirely, as the prototype's `calm` does.
