---
date: 2026-11-18
topic: stats-by-puzzle
---

# Stats by puzzle

## Summary

`/stats` is built around one puzzle: the viewer's current word, named by number and date ("Puzzle #17 · Tue, Nov 17"). Every number on the page counts that same word, so the player count and the word's results always agree. The page does not explain time zones.

---

## Problem Frame

The owner opened `/stats` on the evening of Nov 16 (US time) and saw "0 players today" beside "Today's word: 2 finished · Mon, Nov 16". The tile counted the server's UTC day; the word panel counted Nov 16's puzzle. Two numbers about "today" disagreed, which the owner called "confusing and frankly wrong".

The owner's model (2026-11-18): "There's the word and the stats for that word should be together. So if you and I do the same word, then those stats need to be together... if my local time shows November 17th, the word for November 17th needs to show up, but someone in a different time zone might see that word, obviously, at a different time."

Everyone gets the same word on the same calendar date: the app picks the daily word from the device's local date, so Nov 17's word is puzzle #17 for every player, reached at midnight on their own clock. A puzzle is therefore the natural unit for the stats. PR mjohnson139/words-and-waffles#24 already groups the data this way (results by the word's date, opens by the player's local date) but presents it as "your day" with time-zone wording, which this replaces.

---

## Requirements

**What the page is about**

- R1. The page leads with one puzzle: the one the viewer is on now, meaning the puzzle for the viewer's local date.
- R2. That puzzle is named by its number and date, for example "Puzzle #17 · Tue, Nov 17". The page does not call it "today".
- R3. Every puzzle-specific number on the page counts that same puzzle: players, tries distribution, finished count, win rate, and the platform split.

**Numbers that agree**

- R4. "Played" for a puzzle counts everyone who opened the app while that puzzle was their word; "finished" counts everyone who completed it. Both are grouped by puzzle, so for data sent by current apps, played is never lower than finished.
- R5. Where the numbers come from older app versions that do not send their date, they are shown as they are. The page does not patch or hide them.

**Wording**

- R6. The page carries no time-zone explanation: no "Today is …, Mountain Time" line, no VPN note, no "server's clock" note, no "UTC" (except in a fallback where the viewer's puzzle cannot be worked out, which may name the date only).
- R7. "This week" and "this month" keep their labels; under this model they count the puzzles of those days.
- R8. The page's "What we count", PRIVACY.md and the other docs stay true to whatever the page and the ping actually do.

---

## Acceptance Examples

- AE1. **Covers R1, R3, R4.** Given 11 opens and 2 finishes for puzzle #16, when a viewer whose local date is Nov 16 opens the page, the page shows "Puzzle #16 · Mon, Nov 16", 11 played, and #16's tries with 2 finished.
- AE2. **Covers R1, R2.** Given the same data, when a viewer whose local date is already Nov 17 opens the page and nobody has played #17 yet, the page shows "Puzzle #17 · Tue, Nov 17" with 0 played and 0 finished. The two numbers agree, and there is no "today" wording to contradict.
- AE3. **Covers R6.** A viewer in any time zone sees no time-zone name, no "UTC" and no explanation of time zones.

---

## Key Decisions

- Name the puzzle, not the day. A puzzle's numbers keep growing for about two days as other time zones reach it; the puzzle name makes that unremarkable, so it needs no explanation.
- Keep PR #24's plumbing and replace its wording. The ping's local date is exactly the puzzle date, so it already groups opens by puzzle; the "Today is …, Mountain Time" line, the VPN note and the "server's clock" note come out.
- Show old-app data as it is (R5) rather than patching it. The skew shrinks as players update.

---

## Scope Boundaries

- A history of past puzzles (rows for #16, #15, …).
- Marking a puzzle "final" once every time zone has finished it.
- Any change to how the daily word is chosen; it already follows the player's local date.

---

## Dependencies / Assumptions

- The viewer's local date is still needed to pick which puzzle to show. PR #24 reads it from the connection's time zone, falling back to UTC; the page simply no longer talks about it.
- PR mjohnson139/words-and-waffles#24 is open and unmerged. This work either lands on that branch before merge or follows it.
