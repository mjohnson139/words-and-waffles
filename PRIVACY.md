# Privacy policy

This policy is also the privacy text for the app store listings.

**App store label: "Data not collected".**

## The short version

Words & Waffles has no accounts, no ads, no analytics and no trackers. Your games stay on your device.

## What the app sends

The app makes three kinds of request, all to our own server:

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

3. **At most one result a day:** sent when you finish the daily word, as `POST /v1/result` with exactly this body:

```json
{ "d": "2026-11-13", "g": 3 }
```

| Field | Meaning |
| --- | --- |
| `d` | The daily word's date (your local date). |
| `g` | How many tries it took, `1` to `6`, or `"x"` if the word got away. |

Seconds and Pick-a-word games send nothing.

Nothing else is sent. No ID, no account, no device name, no location.

## What the server stores

The server stores counters only, for example `day:2026-11-12`, `week:2026-W46`, `month:2026-11`, `installs`, and the same keys per platform. Each ping adds one to some of these counters. Each result adds one to a single counter such as `tries:2026-11-13:3`, with no platform attached. That's all.

## What the server never stores

- IP addresses
- user agents
- cookies
- device or advertising IDs
- request logs

A short-lived rate limit sees the connecting IP address, so that fake counts can be slowed down. It is kept in memory only. It is never written to disk or a database, and it disappears when the server instance restarts.

Cloudflare, which runs the server, necessarily sees the connecting IP address of every request, as any host does. We have turned off its analytics, and our server code never reads or stores the address except for the in-memory rate limit described above (and an optional edge rate-limit rule, whose security events Cloudflare may keep briefly).

## The public numbers

All counts are public on the stats page, at `/stats` on the word server.

The limits, stated honestly:

- Counts are per device or browser, not per person.
- Clearing a browser counts it again.
- The stats page's "today" is the UTC date, so near midnight some players are already on the next word.
- Anyone can send fake counts.

## Turning the counts off

Open the Stats tab, go to "What we count", and switch it off. One switch stops both the daily ping and the result. The game works the same without it.

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
