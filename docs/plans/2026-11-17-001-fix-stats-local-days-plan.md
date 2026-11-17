---
title: "fix: Count and show stats by local day, not UTC"
type: fix
status: active
date: 2026-11-17
---

# fix: Count and show stats by local day, not UTC

## Summary

Every number on `/stats` moves to one meaning of "day": a calendar day as people live it. A ping is filed under the player's own local date, and the page takes "today" from the viewer's time zone and says which day that is. No label on the page needs UTC explained.

---

## Problem Frame

The owner opened `/stats` in the evening, US time, and saw "0 players today" above a "Today's word" panel showing two finished games. Both were correct and neither was clear.

Two things cause it:

- The app decides "first open of the day, week, month" from the device's local date (`app/src/game/ping.ts`), but the Worker files that ping under the server's UTC date (`worker/src/ping.ts`, `counterKeys`). A player who opens at 8 pm in Denver is counted on tomorrow's date, and can be counted on that same date again the next morning.
- The page's "today" is the UTC date (`worker/src/stats.ts`, `loadStats`), while results carry the player's local date. The tries panel papers over the gap by showing the busiest of yesterday, today and tomorrow under the heading "Today's word".

There is no issue for this work; the owner asked for it in session on 2026-11-17: "We should use the users local time zone to determine all this... It should be clear and not leave questions any way we cut it. using UTC....well no one will understand that."

---

## Requirements

**Counting**

- R1. A ping from a current app is counted under the player's local calendar date, and the week and month counters derive from that same date.
- R2. A ping without a date (an app version from before this change) is still accepted and counted under the UTC date, as today.
- R3. A ping with a malformed date, or a date more than one day from the UTC date, is refused with 400 and counts nothing.

**Viewing**

- R4. `/stats` and `/stats.json` take "today" from the viewer's time zone. When the zone is missing or not usable, they fall back to the UTC date.
- R5. Every day-dependent part of the page uses that one date: the "players today" tile, the heatmap's today marker and future cells, the tries panel, and the "Today" row of "Where people play".
- R6. The page states in plain words which date "today" is and whose clock it follows. The word "UTC" appears only when the fallback is in use.
- R7. The tries panel shows the viewer's today only. The busiest-of-three-days rule and the `triesHeading` helper are removed.
- R8. The stats responses are not cacheable by shared caches, because they now differ by viewer.

**Privacy and truthfulness**

- R9. Nothing new identifies a player: the ping gains one calendar date and no other field; the Worker stores counters only; the viewer's time zone is read to render the response and is never stored or logged.
- R10. Every document and page that describes the ping, the counters, or the meaning of "today" is true after the change: `PRIVACY.md`, the page's own "What we count" and "Honest limits", `docs/brief.md`, `docs/engineering-notes.md`, `docs/decisions.md`.
- R11. The checks that pin the ping's exact shape accept the new field and nothing else: the app's unit and end-to-end request audits and `scripts/live-check.mjs`.

---

## Key Technical Decisions

- **The ping carries the local date as a sixth field, `t`.** The device already computes its local date to set the `d`, `w` and `m` flags, so sending it makes the counter key agree with the flags. The result request already sends the same date (`{d, g}`), so no new kind of information leaves the device. `d` is taken (a boolean), so the date gets a new name rather than changing an existing field's type.
- **`t` is optional on the Worker.** Installed web apps and native builds keep sending five fields until they update. Refusing them would silently drop players. They fall back to the UTC date, which is the current behavior.
- **The Worker validates `t` with the same rule as the result's date.** `parseResult` in `worker/src/result.ts` already checks shape, real calendar date and "within one day of UTC". That rule moves to one shared helper so the two endpoints cannot drift. One day either side of UTC covers every time zone (UTC-12 to UTC+14).
- **The viewer's zone comes from `request.cf.timezone`, not a script.** The page stays script-free and the CSP stays `default-src 'none'`. The alternative, an inline script that reads the browser's zone, would need a CSP hash and either a reload or several pre-rendered variants. The cost of the chosen route is that Cloudflare derives the zone from the connecting address, so a viewer on a VPN sees the VPN's day, and `PRIVACY.md` must say the zone is read. It is used to render one response and is not stored.
- **The zone is turned into a date with `Intl.DateTimeFormat`, guarded.** Only a string matching a strict zone-id pattern (letters, digits, `_ + - /`, at most 64 characters) is tried; an unknown zone name throws; any failure falls back to UTC (R4). The human label prefers the generic name from `Intl` ("Mountain Time") and falls back to the zone id. Confirmed in the Worker test runtime: `America/Denver` at `2026-11-17T02:51Z` gives `2026-11-16` and "Mountain Time", `Mars/Olympus` throws, and a test `Request` built with `cf.timezone` carries it to the handler.
- **Days after the viewer's today stay hidden in the heatmap.** Players further east may already have counts on the next date. Showing a filled cell for a day that has not started for the viewer raises exactly the kind of question this work removes. Those counts appear when the viewer's day rolls over.
- **The tries panel shows today only, even when it is empty.** Early in the viewer's day it reads "No plates cleared yet today." This replaces the 2026-11-13 decision ("one puzzle: the busiest of yesterday, today, tomorrow"); a new dated entry in `docs/decisions.md` records the change and the reason.
- **No migration.** Existing counters stay filed under UTC dates. Nothing stored says which local day they belonged to, so they cannot be re-filed. The skew is at most one day for pings sent before the deploy.
- **`Cache-Control: private, max-age=300`.** Same five-minute browser cache as now, but no shared cache may reuse one viewer's "today" for another.

---

## Implementation Units

### U1. The app sends its local date in the ping

- **Goal:** `pingBody` returns the five existing fields plus `t`, the local date it was given.
- **Requirements:** R1, R9, R11
- **Dependencies:** none
- **Files:** `app/src/game/ping.ts`, `app/src/game/__tests__/ping.test.ts`, `app/src/api/__tests__/ping.test.ts`, `app/e2e/smoke.spec.ts`
- **Approach:** `pingBody` already receives `today`. Add `t` to `PingBody` and to the returned object. `maybePing` needs no change; it serializes whatever `pingBody` returns. Update the file's header comment to mention the date.
- **Patterns to follow:** `app/src/game/result.ts` (`resultBody` sends the local date as `d`).
- **Test scenarios:**
  - First ever ping on `2026-11-13` for `ios` equals `{ d: true, w: true, m: true, n: true, p: 'ios', t: '2026-11-13' }`.
  - A ping the day after a stored ping carries the new day's date in `t`, with `w`, `m`, `n` as before.
  - A second call on the same day still returns null.
  - The API client posts a body equal to the six-field object (update the existing equality assertion).
  - End-to-end request audit: the ping's keys are exactly `d, m, n, p, t, w` and `t` equals the test's fixed day.
- **Verification:** the app's unit tests and the smoke request audit pass with the six-field body; no other request changed.

### U2. The Worker counts a ping under its local date

- **Goal:** `/v1/ping` accepts five or six fields, validates `t`, and keys day, week and month counters by `t` when present, by the UTC date otherwise.
- **Requirements:** R1, R2, R3, R9
- **Dependencies:** none (deploys before the app's change takes effect; the deploy job runs the Worker before the web export)
- **Files:** `worker/src/ping.ts`, `worker/src/result.ts`, `worker/src/http.ts` (or a small new date helper beside it), `worker/test/worker.test.ts`, `worker/test/result.test.ts`, `worker/test/rollover.test.ts`
- **Approach:** Move the three date checks out of `parseResult` into one exported helper ("is this a real calendar date within a day of UTC today") and call it from both parsers. `parsePing` takes the UTC date, allows exactly the five keys or the five plus `t`, and rejects any other key set. `counterKeys` takes the date to file under; `handlePing` passes `ping.t ?? utcDate`. The dry-run path validates the same way and still counts nothing.
- **Patterns to follow:** `parseResult` in `worker/src/result.ts` for validation; the existing `counterKeys` tests for key expectations; `worker/test/rollover.test.ts` for pinning `now`.
- **Test scenarios:**
  - Happy path: with `now` at `2026-11-17T02:00:00Z`, a ping with `t: '2026-11-16'` increments `day:2026-11-16`, `day:2026-11-16:<platform>`, and (flags set) `week:2026-W47`, `month:2026-11`; nothing under `2026-11-17`.
  - Month and week follow `t`: with `now` at `2026-12-01T03:00:00Z` and `t: '2026-11-30'`, the month key is `month:2026-11`.
  - A ping one day ahead of UTC (`t` is UTC tomorrow) is counted under that date.
  - No `t`: a five-field ping increments the UTC date's keys, exactly as before.
  - Rejected with 400 and no counter change: `t` two days behind, `t` two days ahead, `t: '2026-02-30'`, `t: 20261116` (a number), `t: ''`, a sixth key that is not `t`, seven keys.
  - Dry run with a valid six-field body answers 204 and counts nothing; dry run with a bad `t` answers 400.
  - Result endpoint: its existing date tests still pass through the shared helper (no behavior change).
- **Verification:** the Worker test suite passes; the result endpoint's behavior is unchanged.

### U3. The stats page and JSON use the viewer's day

- **Goal:** One date drives the whole page, chosen from the viewer's time zone and named on the page.
- **Requirements:** R4, R5, R6, R7, R8
- **Dependencies:** none in code; reads best once U2 is live
- **Files:** `worker/src/stats.ts`, `worker/src/index.ts`, `worker/test/stats.test.ts`, `worker/test/worker.test.ts`, `worker/test/rollover.test.ts`
- **Approach:**
  - A pure function turns `(now, zone)` into `{ today, zone label, whether it fell back }`. `handleStats` and `handleStatsJson` receive the request, read `request.cf?.timezone`, and pass the result to `loadStats`, which stops computing its own date.
  - `Stats` gains the zone label and a fallback flag (additive in `/stats.json`); `tries` becomes the summary for `today`. Remove `currentTries` and `triesHeading` and their tests.
  - The date line and zone label go through the page's existing `esc()`, like every other interpolation. The zone is never logged or included in an error path.
  - The page gets one line under the subtitle, for example "Today is Mon, Nov 16, Mountain Time. Each player counts on their own calendar day." With the fallback it names UTC and says the viewer's zone could not be read. The first tile goes back to "players today".
  - "Honest limits" drops the UTC bullet and gains one about the zone being a guess from the connection (a VPN shifts it) and one saying counts from before this change were filed by UTC.
  - `Cache-Control` becomes `private, max-age=300` on both responses.
- **Patterns to follow:** `dayLabel` in `worker/src/stats.ts` for the date wording; the existing `loadStats(db, now)` test style, extended with a zone.
- **Test scenarios:**
  - Zone to date: `2026-11-17T02:51:00Z` in `America/Denver` is `2026-11-16`; the same instant in `Pacific/Auckland` is `2026-11-17`; in `UTC` is `2026-11-17`.
  - Fallback: an unknown zone name (`Mars/Olympus`), an empty string, `undefined`, and a non-string all give the UTC date with the fallback flag set, and never throw.
  - The owner's case: counts `day:2026-11-16 = 11`, `tries:2026-11-16:4 = 1`, `tries:2026-11-16:6 = 1`, viewed at `2026-11-17T02:51:00Z` from `America/Denver`: the day tile is 11, the tries summary is for `2026-11-16` with 2 played, the heatmap marks Monday as today and Tuesday as future.
  - The same data viewed from `UTC`: day tile 0, tries played 0 with "No plates cleared yet today.", and the page names UTC.
  - Tries are today's only: results on yesterday and tomorrow, none today, give played 0 (the old rule would have shown yesterday).
  - Page copy: with a known zone the HTML contains the "Today is" line with the date and zone label and does not contain "UTC" outside the fallback; the heading is "Today's word".
  - Escaping: a zone label containing `<`, `>` and `"` (forced through the label function) appears escaped in the HTML; a `cf.timezone` that fails the zone-id pattern falls back to UTC.
  - Headers: both responses carry `private, max-age=300`; the page still has no `<script` and the CSP is unchanged.
  - Integration through `worker.fetch`: a request built with a `cf.timezone` reaches the handler and changes `today` in `/stats.json`; a request without `cf` falls back.
- **Verification:** the scenario from the owner's screenshot renders one consistent day; existing heatmap span tests pass unchanged apart from the cache header and the removed helpers.

### U4. Docs, contracts and the live check tell the truth

- **Goal:** Every written description of the ping and of "today" matches the code.
- **Requirements:** R9, R10, R11
- **Dependencies:** U1, U2, U3
- **Files:** `PRIVACY.md`, `docs/brief.md`, `docs/engineering-notes.md`, `docs/decisions.md`, `docs/store-listing.md` (only if its wording about the ping is no longer true), `scripts/live-check.mjs`
- **Approach:**
  - `PRIVACY.md`: the ping body example and field table gain `t` ("your local date, so you are counted on your own day"); the "today is UTC" limit is replaced; the paragraph about what the server code reads says the stats page reads Cloudflare's time-zone guess for the viewer, which Cloudflare derives from the connection, only for `/stats` and `/stats.json` and only to pick "today"; it is not stored or logged.
  - `docs/brief.md`: the ping contract block and its field list gain `t`.
  - `docs/engineering-notes.md`: "five fields" becomes six, and "Server-side counter keys use UTC dates" becomes the new rule (local date when sent, UTC otherwise; the stats page's today follows the viewer's zone).
  - `docs/decisions.md`: a 2026-11-17 entry, newest first, in the file's existing format, stating the rule, the reason in the owner's words, the replaced 2026-11-13 rule, and where it shows.
  - `scripts/live-check.mjs`: the ping key assertion and its summary text expect `d m n p t w`, and `t` is checked to be a date string.
- **Test expectation:** none for the prose. The live check's assertion is exercised against production after deploy, not in CI; the app's end-to-end audit in U1 covers the same shape before merge.
- **Verification:** a search for "UTC", "five fields" and the old ping body across the repo finds only statements that are still true.

---

## Scope Boundaries

- The app's own Stats tab, streaks and badges already use local dates and do not change.
- The word endpoint (`/v1/word`) already takes the player's local date and does not change.
- No change to the D1 schema and no re-filing of old counters.

### Deferred to Follow-Up Work

- A way for a viewer to pick a zone by hand (a `?tz=` parameter) if the connection-based guess proves wrong often.
- Showing yesterday's tries beside today's when today is still empty.

---

## Risks & Dependencies

- **Deploy order.** The new app must not reach players before the new Worker, or six-field pings would be refused by the old parser. The deploy job runs the Worker before the web export, and native builds ship later still.
- **A privacy-facing contract changes.** `PRIVACY.md` doubles as the store privacy policy and states the ping body exactly. The change adds a calendar date the result already sends, and says so; the owner should read that file's diff before merging.
- **Shared caches.** `private` keeps compliant caches from reusing a response; the Worker has no Cache Rule in the repo's config, and after deploy a second request from another zone should show its own date. Any dashboard Cache Rule on `/stats*` would override this and is the owner's to check.
- **Mixed history.** Days before the deploy mix UTC-filed pings with the new rule. The page says so under "Honest limits".

---

## Sources

- `worker/src/ping.ts` (`parsePing`, `counterKeys`, `handlePing`) and `worker/src/result.ts` (`parseResult`): the two parsers and the date rule to share.
- `worker/src/stats.ts` (`loadStats`, `currentTries`, `triesBars`, `renderHtml`, `CACHE`): everything day-dependent on the page.
- `app/src/game/ping.ts`, `app/src/api/ping.ts`: where the local date is already in hand.
- `docs/decisions.md`, entry 2026-11-13 "Stats page: one puzzle under Today's word": the rule this replaces.
- `docs/engineering-notes.md`, "Dates are local calendar strings" and "Nothing identifies a player": the invariants to keep true.
