# Words & Waffles: Expo build brief

Port the working prototype (`prototype.html`, a single-file web game) to an Expo app that ships to iOS, Android and web from one codebase. Read the prototype first: its game logic, copy, colours and stats are the spec. This brief covers what changes.

## Principles

- **Lightweight.** No UI kit, no state library, no router unless needed, no analytics SDK, no accounts, no ads. Every dependency must justify itself.
- **Private by construction.** No cookies, no device IDs, no fingerprints, no IP logging, no third-party scripts. Player data never leaves the device unless the player exports it.
- **Offline-first.** The game must be playable with no network after first launch.
- **Open.** Usage numbers are public on a `/stats` page. Licence the repo openly.

## Stack

| Piece | Choice | Why |
|---|---|---|
| App | Expo (latest SDK), TypeScript, React Native + React Native Web | One codebase, three targets |
| Navigation | Local state for the three tabs (Play / History / Stats) | Avoids a router dependency |
| Animation | React Native `Animated` API | Built in; enough for flip, pop, shake, hop |
| Storage | `@react-native-async-storage/async-storage` | Works on all three targets |
| Font | One display face via `expo-font` (prototype uses Bagel Fat One), system font for body | |
| Backend | One Cloudflare Worker + D1 | Free tier, no cold starts, atomic counters |
| Web hosting | Cloudflare Pages serving `npx expo export -p web` | Same account as the Worker |
| Native builds | EAS Build / EAS Submit | |

Vercel would also work (static export + two edge functions + a KV/Postgres add-on). Cloudflare is recommended because the Worker, database and static hosting sit in one free-tier project with nothing else to wire up. Turn Cloudflare Web Analytics **off** for the Pages project.

## Repo layout

```
app/                 Expo app
  src/game/          score.ts, words.ts, daily.ts, stats.ts   (pure, unit-tested)
  src/store/         games.ts (AsyncStorage), backup.ts (export/import)
  src/api/           word.ts (endpoint client + decode), ping.ts
  src/ui/            Board, Tile, Keyboard, Mug, WaffleStack, Toppings, tabs
  src/config.ts      WORD_ENDPOINT, PING_ENDPOINT
worker/              Cloudflare Worker: /v1/word, /v1/ping, /stats
  src/sources/       word source adapters
```

## The public repo

The repo is `words-and-waffles` and it is public from the first commit. Treat everything in it as something a stranger will read.

- **README.md**, in this order: one-line pitch, a screenshot or short GIF of a game being won, a link to the live web app, "What it is" (three sentences), the privacy promise in plain words (what is counted, what is never collected, link to the public `/stats` page), how to run it locally (three commands), how to self-host the Worker and point the app at your own word endpoint, the endpoint contract, credits, licence. Keep it short; move depth into `docs/`.
- **LICENSE:** MIT, unless the owner says otherwise before the first commit.
- **PRIVACY.md:** the exact ping payload, what the Worker stores (counters only), what it does not (IDs, IPs, user agents, cookies), and how to turn the ping off. This doubles as the store privacy policy.
- **CONTRIBUTING.md:** how to run tests, the "every dependency must justify itself" rule, and the no-trackers rule as a hard line for pull requests. Add a short `CODE_OF_CONDUCT.md`.
- **Credits:** the word lists were built from the npm packages `wordlist-english` and `an-array-of-english-words`. Check each package's licence, credit them in the README, and include any notice they require.
- **No secrets, ever.** The HMAC secret and Cloudflare/Expo tokens live in Worker secrets, EAS secrets and GitHub Actions secrets. Commit `.env.example` and `wrangler.toml` without secret values. `.gitignore` covers `.env*`, `.dev.vars`, `node_modules`, `dist`, `.expo`, `.wrangler`.
- **The answer list is public here.** `prototype.html` and `words.json` contain every future daily word in order. That is acceptable for an open project, but say so in the README rather than let someone "discover" it. Put the prototype under `docs/prototype/` as a reference, not at the root.
- **CI (GitHub Actions):** on every push and pull request run typecheck, lint, unit tests and a web export build. Deploy the Worker and Pages site from `main` only. Show the CI badge in the README.
- **Housekeeping:** small conventional commits with clear messages; issue templates for bug and idea; repo description "A cosy daily word game. No accounts, no trackers."; topics `expo`, `react-native`, `word-game`, `privacy`, `cloudflare-workers`; the live site set as the repo's website link.
- **Do not** use the name "Wordle" in the repo description, README title or topics.

## Word-of-the-day endpoint (swappable)

The app reads one URL from config: `EXPO_PUBLIC_WORD_ENDPOINT`. Anything that answers this contract can be swapped in without an app release (also allow an override URL in a hidden settings field for self-hosters).

```
GET {WORD_ENDPOINT}?date=YYYY-MM-DD        (player's local date)

200 application/json
{
  "v": 1,
  "date": "2026-11-12",
  "puzzle": 12,              // running number, for share text
  "len": 5,
  "salt": "9f2c…",           // per-day, hex
  "cells": ["ab12…", "…", "…", "…", "…"]   // one hash per letter position
}
```

- `cells[i] = hex(sha256(salt + "|" + i + "|" + letter)).slice(0, 16)`, lowercase letter a–z.
- **Client decode:** on load, for each position try 26 letters (130 hashes total) to recover the word, keep it in memory only, then score guesses locally exactly as the prototype's `score()` does. Use a tiny pure-JS SHA-256 so web and native behave the same.
- **Server:** `salt = hmac(SECRET, date)` so responses are deterministic and cacheable (`Cache-Control: public, max-age=3600`). Reject dates more than one day ahead of UTC+14.
- **Be clear about what hashing buys:** a five-letter word can always be brute-forced, so this is obfuscation. It keeps the answer out of plain sight in network logs and casual inspection; it is not secrecy. Do not describe it as secure anywhere.
- **Client cache:** store the day's payload in AsyncStorage keyed by date. If the endpoint is unreachable and nothing is cached, fall back to the bundled deterministic word (`daily.ts`, same algorithm as the prototype's `dailyWord`) and record `source: "bundled"` on the game.

### Word sources (server side)

`worker/src/sources/` exports `getWord(date): Promise<{ word, puzzle }>`. Ship one adapter:

- `builtin.ts`: the prototype's 890-word answer list, indexed by days since 2026-11-01. This is the default.

The adapter interface is the second swap point: another source can be added later by whoever has the rights to use it. **Do not ship an adapter that scrapes another publisher's daily answer** (the owner should decide that separately; a public app redistributing someone else's puzzle answers is a legal risk, and the name "Wordle" is a trademark, so keep it out of the app name and store listing).

## Counting people without tracking them

Goal: know roughly how many people play, storing nothing about any of them.

```
POST {PING_ENDPOINT}
{ "d": true, "w": true, "m": false, "n": false, "p": "ios" }
```

- The app sends **at most one ping per local day**, on first open that day.
- Flags are computed on the device from locally stored dates: `d` first open today, `w` first open this ISO week, `m` first open this month, `n` first open ever. `p` is `ios` / `android` / `web`.
- The Worker only increments counters in D1: `UPDATE counts SET n = n + 1 WHERE key = ?` for keys like `day:2026-11-12`, `week:2026-W46`, `month:2026-11`, `installs`, `day:2026-11-12:ios`.
- Result: daily, weekly and monthly active players and total installs, with **no identifier ever sent or stored**. No cookies, no request logging, no IP stored, no user-agent stored.
- Limits to state honestly on the stats page: counts are per device/browser, a cleared browser counts again, and anyone can send fake pings (add a light per-IP rate limit in memory only, never persisted).
- `GET /stats` renders the counters as a plain public page. Add a one-paragraph "What we count" note in the app's Stats tab with a switch to turn the ping off.

## Player data

- All games live in AsyncStorage under one key, same record shape as the prototype: `{ id, mode, date, answer, guesses[], status, startedAt, finishedAt, source }`. Stats and streaks are always derived, never stored.
- **Personal cloud, phase 1:** "Back up" exports one JSON file through the share sheet (`expo-sharing`), so the player saves it to iCloud Drive, Google Drive or anywhere; "Restore" imports it (`expo-document-picker`) and merges by game id using the prototype's `rank()` rule. On web, download/upload the same file.
- **Phase 2 (optional, native module):** automatic sync through the player's own iCloud key-value store on iOS and Android's app-data backup. Only do this if it stays a small config plugin; otherwise phase 1 is the answer.
- Note for the README: iOS device backups and Android Auto Backup already include AsyncStorage data.

## Features to port (all exist in the prototype)

1. Three modes: Today (endpoint word), Seconds (random from bundled list), Pick a word (secret entry).
2. Waffle board: tiles are pockets in one golden slab, butter pat, syrup drip; board and keyboard size to the screen (see `fit()`).
3. Tile flip reveal, pop on type, row shake on bad word, hop on win, toppings confetti, coffee mug that drains per guess, waffle streak stack.
4. On-screen keyboard with coloured keys, hardware keyboard on web, no text selection.
5. History list with mini grids and expandable guesses.
6. Stats: played, win %, streaks, distribution, top openers, kitchen facts, ten badges.
7. Share text with emoji grid (`expo-clipboard` or share sheet).
8. Light and dark themes from the prototype's tokens; respect reduced motion.
9. Add: light haptics on key press and reveal (`expo-haptics`), native only.

Drop the prototype's Claude-specific storage code (`initSync`, `claude.use`) and the NYT link in the Pick-a-word card.

## Milestones

1. **Core:** scaffold; move `score`, word lists, `dailyWord`, stats into `src/game` with unit tests (duplicate letters, streak edges, date rollover).
2. **Play screen:** board, keyboard, animations, three modes, bundled word only.
3. **History, Stats, storage, backup/restore.**
4. **Worker:** `/v1/word` with builtin adapter, client decode + cache + fallback.
5. **Ping + `/stats` page + opt-out switch.**
6. **Ship:** web export to Cloudflare Pages, EAS builds, store listings, privacy label "Data not collected".

## Done means

- Cold start to playable board with airplane mode on (after one prior launch).
- Network tab shows exactly two requests per day to our own domain: word and ping. No third-party hosts.
- Swapping `EXPO_PUBLIC_WORD_ENDPOINT` to another server that follows the contract changes the daily word with no code change.
- Web bundle under ~500 KB gzipped including the word list.
- A backup exported on one device restores on another with stats intact.
