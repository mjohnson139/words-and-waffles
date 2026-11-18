# Worker

Cloudflare Worker for Words & Waffles. It serves:

- `GET /v1/word?date=YYYY-MM-DD`: the day's word as salted letter hashes (obfuscation, not secrecy).
- `POST /v1/ping`: anonymous counters in D1. No identifier, IP or user agent is stored.
- `POST /v1/result`: `{d, g}` when a daily game ends; adds one to `tries:<d>:<g>`. Same rate limit, same `X-Dry-Run: 1`.
- `GET /stats` and `GET /stats.json`: the public counts and the honest limits. The JSON carries `installs`, `today`, `days` (30), `weeks` (12), `months` (12), `current`, `tries`, `year` (53 Monday-first week columns of 7 `{date, n, level, future?}` cells) and the heatmap `/stats` shows: `puzzle` (the puzzle number for `today`), `zone` and `zoneFallback` (the viewer's time zone that picked `today`, from Cloudflare's guess; UTC when it is missing), `span` (`'week'`, `'month'` or `'year'`, from how far back the `day:` counters go: under 14 days, under 70 days, longer) and `grid` (that span's columns, same cell shape; levels 0-4 scale against the busiest day in the grid). New fields are only ever added.

## Local dev

```sh
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply words-and-waffles --local
npm run dev -w worker
```

Checks: `npm run verify -w worker` (typecheck, lint, tests on real D1 via Miniflare, deploy dry run).

## Deploy

Deploys run from `main` only, through `.github/workflows/deploy.yml`. One-time setup (D1 database, Pages project, API token) is in [docs/deploy.md](../docs/deploy.md).

The workflow reads these GitHub settings (no secrets live in the repo):

- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Variables: `WORD_ENDPOINT`, `PING_ENDPOINT` (public Worker URLs baked into the web build), optional `PAGES_PROJECT` (defaults to `words-and-waffles`)

The Worker's own secret is set once with `npx wrangler secret put WORD_SECRET` (run from `worker/`); never put it in `wrangler.toml`.
