# Words & Waffles

A cosy daily word game. No accounts, no trackers.

[![CI](https://github.com/mjohnson139/words-and-waffles/actions/workflows/ci.yml/badge.svg)](https://github.com/mjohnson139/words-and-waffles/actions/workflows/ci.yml)

<!-- Screenshot or GIF of a game being won goes here (step S2). -->

**Play it:** the live web app link goes here once it is deployed (step S2).

## What it is

Guess the five-letter word of the day in six tries; each guess shows which letters sit in the right pocket, the wrong pocket, or aren't in the recipe. Keep a streak going to stack waffles, try "Seconds" for extra words, or pick a word and hand the phone to a friend. It runs on iOS, Android and the web from one Expo codebase, and works offline after the first launch.

## Privacy, in plain words

- **Counted:** at most once a day the app tells our server "someone opened the game today" plus four yes/no flags (first open this week, this month, ever) and the platform. No ID of any kind. The server adds one to a few counters and stores nothing else.
- **Never collected:** names, accounts, device IDs, IP addresses, user agents, cookies, locations, or your games. There are no analytics, ad or crash-reporting SDKs.
- **Your games** stay on your device. Back up exports a file you keep wherever you like.
- **Public numbers:** every count is on the public `/stats` page of the word server (link added at deploy).
- You can turn the ping off in the Stats tab. Full details: [PRIVACY.md](PRIVACY.md).

## Run it locally

```bash
npm install -g npm@11.21.2 && npm install
npm run web -w app
npm run verify
```

`npm start -w app` and the Expo Go app run it on a phone. The app works without the Worker: with no word server reachable, it uses the bundled daily word.

## Self-host the word server

The Worker in [`worker/`](worker/) serves the word of the day, takes the count ping and renders `/stats`. With a Cloudflare account:

```bash
cd worker
npx wrangler d1 create words-and-waffles      # put the id in wrangler.toml
npx wrangler d1 migrations apply words-and-waffles --remote
npx wrangler secret put WORD_SECRET            # any long random string
npx wrangler deploy
```

Then point the app at it with `EXPO_PUBLIC_WORD_ENDPOINT` and `EXPO_PUBLIC_PING_ENDPOINT` (see `app/.env.example`), or paste the URL into Stats → Advanced in a running app.

## The word endpoint contract

Anything that answers this can replace our server, with no app release:

```
GET {WORD_ENDPOINT}?date=YYYY-MM-DD        (the player's local date)

200 application/json
{ "v": 1, "date": "2026-11-12", "puzzle": 12, "len": 5,
  "salt": "9f2c…", "cells": ["ab12…", "…", "…", "…", "…"] }
```

`cells[i] = hex(sha256(salt + "|" + i + "|" + letter)).slice(0, 16)` for the lowercase letter at position `i`. The app tries all 26 letters per position to recover the word. This is **obfuscation, not secrecy**: it keeps the answer out of plain sight in network logs, but a five-letter word can always be brute-forced.

**The answer list is public.** This is an open project, so [`docs/prototype/words.json`](docs/prototype/words.json) and the app's source contain every future daily word in order. If you want surprises, don't look.

## Credits

- Word lists built from the npm packages [`wordlist-english`](https://www.npmjs.com/package/wordlist-english) (MIT; derived from SCOWL, © Kevin Atkinson and contributors) and [`an-array-of-english-words`](https://www.npmjs.com/package/an-array-of-english-words) (MIT).
- Display font: [Bagel Fat One](https://fonts.google.com/specimen/Bagel+Fat+One) (SIL Open Font License 1.1), bundled with the app.
- Built with [Expo](https://expo.dev) and [Cloudflare Workers](https://workers.cloudflare.com).

## Licence

[MIT](LICENSE). Contributions welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md). How the project is built, including by AI agents: [`.github/dev-process.md`](.github/dev-process.md).
