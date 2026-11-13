# Worker

Cloudflare Worker for Words & Waffles. It serves:

- `GET /v1/word?date=YYYY-MM-DD`: the day's word as salted letter hashes (obfuscation, not secrecy).
- `POST /v1/ping`: anonymous counters in D1. No identifier, IP or user agent is stored.
- `GET /stats` and `GET /stats.json`: the public counts and the honest limits.

## Local dev

```sh
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply words-and-waffles --local
npm run dev -w worker
```

Checks: `npm run verify -w worker` (typecheck, lint, tests on real D1 via Miniflare, deploy dry run).

## Deploy

Left for step S1: create the D1 database, put its id in `wrangler.toml`, `wrangler secret put WORD_SECRET`, apply migrations remotely, deploy.
