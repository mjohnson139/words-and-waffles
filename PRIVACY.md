# Privacy policy

This policy is also the privacy text for the app store listings.

**App store label: "Data not collected".**

## The short version

Words & Waffles has no accounts, no ads, no analytics and no trackers. Your games stay on your device.

## What the app sends

The app makes two kinds of request, both to our own server:

1. **The word of the day:** `GET /v1/word?date=YYYY-MM-DD`. The date is your local date, which the server needs to pick the day's puzzle.
2. **At most one count ping a day:** sent on the first open of the day, as `POST /v1/ping` with exactly this body:

```json
{ "d": true, "w": true, "m": false, "n": false, "p": "ios" }
```

| Field | Meaning |
| --- | --- |
| `d` | First open today. |
| `w` | First open this ISO week. |
| `m` | First open this month. |
| `n` | First open ever on this device. |
| `p` | Platform: `ios`, `android` or `web`. |

Nothing else is sent. No ID, no account, no device name, no location.

## What the server stores

The server stores counters only, for example `day:2026-11-12`, `week:2026-W46`, `month:2026-11`, `installs`, and the same keys per platform. Each ping adds one to some of these counters. That's all.

## What the server never stores

- IP addresses
- user agents
- cookies
- device or advertising IDs
- request logs

A short-lived rate limit sees the connecting IP address, so that fake pings can be slowed down. It is kept in memory only. It is never written to disk or a database, and it disappears when the server instance restarts.

## The public numbers

All counts are public on the stats page, at `/stats` on the word server.

The limits, stated honestly:

- Counts are per device or browser, not per person.
- Clearing a browser counts it again.
- Anyone can send fake pings.

## Turning the ping off

Open the Stats tab, go to "What we count", and switch it off. The game works the same without it.

## Your games

Your games are stored on your device only, in AsyncStorage on the app or in browser storage on the web.

- **Back up** exports a JSON file that you save wherever you choose.
- **Restore** imports that file.

iOS device backups and Android Auto Backup may include app data. Those backups are under your own account with Apple or Google. We never see them.

## The word list is public

The repository contains every future daily answer, because the project is open. The word endpoint hashes the letters. That keeps the answer out of plain sight, but it is not secret.

## Third parties

There are no third parties at runtime. The app is hosted on Cloudflare, for the static site and the word server. Cloudflare Web Analytics is turned off.

## Changes

Changes to this policy are made in the public repository, so the history is visible there.

## Contact

Open an issue on the GitHub repository.
