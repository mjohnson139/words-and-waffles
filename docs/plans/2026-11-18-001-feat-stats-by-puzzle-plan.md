---
title: "feat: Name the stats page by puzzle, not by day"
type: feat
status: completed
date: 2026-11-18
origin: docs/brainstorms/2026-11-18-stats-by-puzzle-requirements.md
---

# feat: Name the stats page by puzzle, not by day

## Summary

`/stats` leads with the viewer's current puzzle, named "Puzzle #17 · Tue, Nov 17", and every puzzle-specific number on the page counts that puzzle. The time-zone wording PR mjohnson139/words-and-waffles#24 added comes out; its data handling stays. Lands on the PR #24 branch before merge.

## Problem Frame

The owner's complaint was "0 players today" beside "Today's word: 2 finished": two numbers about "today" that disagreed. PR #24 already groups opens and results by the player's local date, which is the puzzle date, so the numbers now agree; but the page still talks about "today", time zones, VPNs and the server's clock. The owner wants the page named by the puzzle, with no time-zone explanation (see origin: docs/brainstorms/2026-11-18-stats-by-puzzle-requirements.md).

## Requirements

- R1. The page leads with the viewer's current puzzle (the puzzle for the viewer's local date).
- R2. It is named by number and date ("Puzzle #17 · Tue, Nov 17"), not "today".
- R3. Players, tries, finished, win rate and the platform split all count that puzzle.
- R4. Played and finished are both grouped by puzzle, so they agree.
- R5. Data from older app versions is shown as it is, with no note.
- R6. No time-zone explanation, VPN note, "server's clock" note or "UTC" on the page, including in the fallback; the single privacy clause in the page's "What we count" is the only mention of the connection's time zone.
- R7. "This week" and "this month" keep their labels.
- R8. "What we count", PRIVACY.md and the docs stay true.

## Key Technical Decisions

- **Keep PR #24's data path unchanged.** The ping's local date `t`, the viewer's date from `request.cf.timezone`, the UTC fallback and `Cache-Control: private` all stay; only the presentation changes.
- **The puzzle number comes from the existing `puzzleNumber` in `app/src/game/daily.ts`.** The Worker already imports the app's game modules for the word endpoint, so the number cannot drift from the app's.
- **Drop the zone label.** The page no longer shows a zone name, so `viewerDay` stops computing the generic name and `/stats.json` drops `zoneLabel`. `zone` and `zoneFallback` stay for debugging; `puzzle` is added. PR #24 is unmerged, so nothing outside reads these fields yet.
- **The fallback looks the same as the normal page.** When the zone is missing it shows the puzzle for the UTC date with no extra wording (R6). Visitors arriving without a Cloudflare zone are rare; a wrong-by-one puzzle there is acceptable and unexplained.
- **One short privacy sentence stays on the page.** "What we count" keeps a single clause saying the page uses the connection's time zone only to pick which puzzle to show, and keeps nothing. That is a privacy disclosure (R8), not a time-zone explanation.

## Implementation Units

### U1. Render the page around one puzzle

- **Goal:** the page names the puzzle and every puzzle number counts it, with no time-zone copy.
- **Requirements:** R1-R7
- **Dependencies:** none
- **Files:** `worker/src/stats.ts`, `worker/test/stats.test.ts`, `worker/test/worker.test.ts`
- **Approach:**
  - Under the subtitle, one prominent line: "Puzzle #17 · Tue, Nov 17" (`puzzleNumber` and `dayLabel` of the viewer's date, through `esc()`). Remove `todayLine` and the zone label.
  - First tile: "played #17" instead of "players today".
  - Tries panel heading: "How #17 went". The line under the bars drops the date, which the header now carries: "2 finished · 100% won"; empty: "Nobody has finished #17 yet."
  - "Where people play": the first row is named "Puzzle #17" instead of "Today".
  - "Honest limits": remove the VPN and "server's clock" bullets; the remaining three stay as they are.
  - "What we count": the ping bullet says the app sends "the player's date, which says which puzzle they are on"; the paragraph's zone clause becomes "This page uses your connection's time zone only to pick which puzzle to show, and keeps nothing."
  - `Stats` gains `puzzle: number`, loses `zoneLabel`; `viewerDay` drops the `longGeneric` lookup.
- **Patterns to follow:** existing `stat()`, `platformBar()`, `triesBars()` helpers; `esc()` on every interpolation.
- **Test scenarios:**
  - Covers AE1. Data day:2026-11-16 = 11, tries #16 at 4 and 6, viewed at 2026-11-17T02:51Z from America/Denver: HTML contains "Puzzle #16 · Mon, Nov 16", "played #16" with 11, "How #16 went", "2 finished · 100% won", and the platform row "Puzzle #16".
  - Covers AE2. Same data viewed from Pacific/Auckland (Nov 17): "Puzzle #17 · Tue, Nov 17", played 0, "Nobody has finished #17 yet."
  - Covers AE3. For Denver, Auckland and the fallback (no zone): the page's visible text (tags, attributes and the style block stripped, the privacy clause removed) contains none of "UTC", "time zone", "Mountain", "VPN", "server's clock" or "today" (case-insensitive). The heatmap's `today` cell class stays as it is.
  - `/stats.json` carries `puzzle` equal to `puzzleNumber(today)` and no `zoneLabel`.
  - Fallback renders without throwing and with the same layout.
- **Verification:** the Worker suite, typecheck and lint pass; a render of the owner's data from Denver shows one consistent puzzle.

### U2. Docs say "puzzle" and stop explaining zones

- **Goal:** the written descriptions match the page.
- **Requirements:** R8
- **Dependencies:** U1
- **Files:** `PRIVACY.md`, `docs/decisions.md`, `docs/engineering-notes.md`, `worker/README.md`
- **Approach:**
  - `PRIVACY.md`: the limits bullet about the viewer's zone says the page shows the puzzle for the viewer's date, worked out from Cloudflare's guess of their time zone. The old-app/UTC bullet stays (the privacy notes are where detail belongs).
  - `docs/decisions.md`: a 2026-11-18 entry, newest first: the page is named by puzzle; every puzzle number counts that puzzle; no time-zone wording on the page; it replaces the wording part of the 2026-11-17 entry, whose data rules stand. Add "(wording replaced 2026-11-18)" to that entry.
  - `docs/engineering-notes.md`: the stats sentence says `/stats` shows the puzzle for the viewer's date.
  - `worker/README.md`: the JSON field list gains `puzzle` and loses `zoneLabel`.
- **Test expectation:** none -- documentation only.
- **Verification:** no doc still describes a "Today is …, <zone>" line or `zoneLabel`.

## Scope Boundaries

- A history of past puzzles, and marking a puzzle final once every zone has finished it (origin scope boundaries).
- Any change to how the daily word, the ping or the counters work.
- The in-app Stats tab's "What we count" copy stays; it does not mention the stats page's wording.

## Risks & Dependencies

- Lands on PR #24's branch, so #24 grows by these commits; the PR body needs its "Viewing" paragraph updated to match.
