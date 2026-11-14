---
title: F2 - stats page v2 and the end-of-game event
type: feat
status: active
date: 2026-11-13
epic: v1
step: F2
---

# F2 - Stats page v2 and the end-of-game event

## Goal Capsule

- **Outcome:** `/stats` looks like the app (its colours, its gingham table, its warmth), is shorter, and answers more interesting questions: how many people played each day for a year (a heatmap), how today's word went (tries and win rate), and where people play (platform split).
- **Owner decisions (plan 001, "Owner decisions, 2026-11-13"):** a second anonymous event is allowed: when a daily game ends, the app may send the date and the guess count (1-6 or X), no identifier, under the same opt-out switch as the ping. PRIVACY.md, the README and the `/stats` copy change from "one ping" to two events when F2 lands, not before.
- **Done means:** a finished daily game sends exactly one result event (e2e proves it, and proves none when the switch is off); the Worker counts it under keys that hold no identifier; `/stats` renders the heatmap, today's tries and the platform split with no script and the same CSP; PRIVACY.md, README, the in-app "What we count" card and the stats copy all describe two events; `npm run live-check` audits the new event as a dry run and stays green.

## The event

`POST /v1/result` on the Worker, body exactly:

```json
{ "d": "2026-11-13", "g": 3 }
```

- `d`: the daily game's date, the player's local calendar date (the same date the word endpoint takes).
- `g`: the number of guesses for a win, `1` to `6`, or the string `"x"` for a loss.
- Nothing else: no platform (the ping already carries the platform split), no puzzle number, no time, no identifier.

**When it is sent.** Once per local day, when today's daily game reaches `won` or `lost`, if the ping switch is on and a ping endpoint is configured. The app stores only `{ lastDate }` under `ww:result` and sends nothing for a date it already sent. Seconds and Pick-a-word games never send. A daily game from an earlier date never sends (the date has to be today). A restored backup on a fresh device can send today's result once more; counts are rough by design and say so.

**Where it goes.** The URL is derived from the ping endpoint: `/v1/ping` becomes `/v1/result` on the same origin. No new build variable, no new EAS or GitHub configuration. A ping endpoint that does not end in `/v1/ping` means no result events.

**Worker side.**

- Validates: a JSON object with exactly the keys `d` and `g`; `d` a real calendar date within one day of the server's UTC date (players live from UTC-12 to UTC+14); `g` an integer 1-6 or `"x"`. Bodies over 100 bytes are refused before reading when `Content-Length` says so.
- Counts one key: `tries:<d>:<g>` (for example `tries:2026-11-13:3`, `tries:2026-11-13:x`). No platform suffix.
- Shares the ping's in-memory rate limiter (one map, one budget per IP per hour; still memory only, never stored or logged).
- Honors `X-Dry-Run: 1` like the ping: validated, answered 204, never counted.

## The page

Served at `/stats` as today: server-rendered HTML, no script, `Content-Security-Policy` unchanged (inline styles only, no fonts or images from anywhere). `/stats.json` keeps every field it has now (the live check reads `installs`, `days`, `weeks`, `months`) and gains `year` and `tries`.

Sections, top to bottom:

1. **Header:** "Words & Waffles" with a small subtitle ("Who came to breakfast"), on the app's gingham table (`table` + `check` tokens from `app/src/ui/theme.ts`, as a CSS repeating gradient), light and dark.
2. **Four plates** (cards): players today, this week, this month, installs. Big numbers in waffle gold, labels in muted ink.
3. **A year of breakfasts:** a GitHub-style heatmap of daily players, 53 ISO-week columns ending with the current week, Monday at the top, colours stepping from batter to waffle to syrup (five levels, 0 = empty plate). Each cell has a `title` tooltip ("Thu, Nov 12: 34 players"). On a phone the grid scrolls sideways inside its card and starts scrolled to today (`direction: rtl` on the scroller, `ltr` on the grid; no script). Month initials above the columns where a month starts.
4. **Today's word:** the tries distribution for today's UTC date as horizontal bars (1-6 and X), the app's guess-distribution look (berry bars, the most common row in hit green), plus "N finished, W% won". With no results yet: "No plates cleared yet today."
5. **Where people play:** today's platform split as one stacked bar (iOS, Android, web) with counts and a legend; this month's split as a second bar.
6. **What we count** (heading kept: the live check asserts it) and **Honest limits**, rewritten for two events; the privacy link.

**Levels for the heatmap:** 0 for no players; otherwise `ceil(4 * n / max)` clamped to 1-4, where `max` is the year's highest day. Pure and tested.

**Font:** the app's display face (Bagel Fat One) is not loaded: the CSP allows no fonts and the hard lines forbid a CDN. Headings use `ui-rounded, "SF Pro Rounded", system-ui` at weight 800 instead. Self-hosting the font from the Worker is possible later and not worth the bundle now.

## Units

| Unit | Agent | Files | Depends on |
|---|---|---|---|
| F2.1 Worker result route | implementer | `worker/src/result.ts`, `worker/src/rateLimit.ts`, `worker/src/ping.ts`, `worker/src/index.ts`, `worker/test/result.test.ts`, `worker/test/setup.ts` | - |
| F2.2 Stats page v2 | implementer | `worker/src/stats.ts`, `worker/test/worker.test.ts` (stats block), `worker/test/stats.test.ts`, `worker/test/rollover.test.ts` (stats windows only if needed) | key format from this plan |
| F2.3 App result event | implementer | `app/src/game/result.ts`, `app/src/game/__tests__/result.test.ts`, `app/src/api/result.ts`, `app/src/api/__tests__/result.test.ts`, `app/App.tsx`, `app/e2e/fixtures.ts`, `app/e2e/smoke.spec.ts` | event contract from this plan |
| F2.4 Copy and checks | orchestrator | `PRIVACY.md`, `README.md`, `docs/store-listing.md`, `app/src/ui/settings/StatsFooter.tsx`, `scripts/live-check.mjs`, `docs/engineering-notes.md`, `worker/README.md` | F2.1-F2.3 |
| F2.5 Review | reviewer + security pass | the step's diff | all |

F2.1, F2.2 and F2.3 own disjoint files and run in parallel worktrees. F2.2 renders from counter keys only, so it does not wait for F2.1.

## Risks and open questions

- **Fake results.** Anyone can post results, as anyone can post pings. Same answer: rate limit in memory, the date window, rough numbers, said plainly on the page.
- **UTC vs local dates on the page.** Results are keyed by the player's local date; the page shows the UTC date's puzzle as "today". Near midnight UTC some players are already on tomorrow's word. Acceptable; noted in "Honest limits".
- **Store privacy label.** "Data not collected" still holds: the result is not linked to a user, carries no identifier and is aggregated on arrival. `docs/store-listing.md` says so.
- **Open for the owner (default in brackets):** show yesterday's tries too when today has few results [no, keep it short]; self-host the display font on `/stats` [no].
