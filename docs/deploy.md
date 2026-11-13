# Deploying Words & Waffles

Owner checklist. Do it once; after that, merging to `main` deploys.

## What you need

- A Cloudflare account (free plan).
- Admin access to the GitHub repo.
- An Expo account (for phone builds later).

## 1. Create the database

1. `cd worker`
2. `npx wrangler login`
3. `npx wrangler d1 create words-and-waffles`
4. Copy the printed `database_id` into `worker/wrangler.toml`, replacing `REPLACE-WITH-D1-DATABASE-ID`. The id is not a secret.
5. Commit the database id to `main` (the deploy stays skipped until the secrets exist).

## 2. Set the word secret

Your Worker lives at `https://words-and-waffles.<your-subdomain>.workers.dev`. Find or register your workers.dev subdomain first: Cloudflare dashboard → Workers & Pages → the account's workers.dev settings shows it. A new account must choose one before the first Worker deploy.

1. `npx wrangler secret put WORD_SECRET`. Because the Worker does not exist yet, wrangler offers to create it: answer yes.
2. Paste a long random string (e.g. from `openssl rand -hex 32`).
3. Never commit it.
4. Changing it later changes every salt. That is harmless: clients re-fetch.

## 3. Create an API token

1. Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom token.
2. Add these permissions:
   - Account · Workers Scripts · Edit
   - Account · D1 · Edit
   - Account · Cloudflare Pages · Edit
3. Create the token and copy it once.
4. Note your Account ID (dashboard sidebar).

## 4. Add GitHub secrets and variables

Repo → Settings → Secrets and variables → Actions.

1. Secrets:
   - `CLOUDFLARE_API_TOKEN` (from step 3)
   - `CLOUDFLARE_ACCOUNT_ID`
2. Variables:
   - `WORD_ENDPOINT` = `https://words-and-waffles.<your-subdomain>.workers.dev/v1/word`
   - `PING_ENDPOINT` = `https://words-and-waffles.<your-subdomain>.workers.dev/v1/ping`
   - `PAGES_PROJECT` (optional; default `words-and-waffles`)
3. Recommended: create a `production` environment (Settings → Environments) with yourself as a required reviewer. The deploy jobs use it, so every deploy then waits for your approval, and nobody who can push to `main` can ship without it.

## 5. Create the Pages project

1. `npx wrangler pages project create words-and-waffles --production-branch main`
2. Cloudflare dashboard → Workers & Pages → the Pages project → Metrics.
3. Make sure Web Analytics is OFF. This is our privacy promise.

## 6. Deploy

1. Merge to `main`, or go to Actions → Deploy → Run workflow.
2. The workflow:
   - applies the D1 migrations,
   - deploys the Worker,
   - builds the web app with the two endpoint variables,
   - deploys the web app to Pages.

## 7. Check it

1. Open `https://words-and-waffles.<your-subdomain>.workers.dev/stats`.
2. Open the Pages URL and play a word.
3. In the browser's network tab, check that the only requests go to your own two hosts.

## 8. Rate-limit pings (recommended)

Needs a custom domain. Skip this on workers.dev.

1. Cloudflare dashboard, for the custom domain → Security → WAF → Rate limiting rules.
2. Create a rule:
   - Path equals `/v1/ping`
   - 120 requests per minute per IP
   - Action: Block

Cloudflare's edge sees the connecting IP of every request, and the rule's security events can show those IPs for a short time. `PRIVACY.md` says so.

## Custom domain (optional)

1. Add the domain in Cloudflare.
2. Attach it to the Worker: Workers → Settings → Domains & Routes.
3. Attach it to the Pages project: Custom domains.
4. Update `WORD_ENDPOINT` and `PING_ENDPOINT` in GitHub variables (step 4).
5. Re-run Deploy (step 6).

## Phone builds (later, step 🛑 B)

1. `cd app`
2. `npx eas-cli@latest login`
3. `npx eas-cli@latest init`
4. Set `EXPO_PUBLIC_WORD_ENDPOINT` and `EXPO_PUBLIC_PING_ENDPOINT` as EAS environment variables. Make them plain, not secret: they are public URLs.
5. `npx eas-cli@latest build --profile production --platform all`
6. `eas submit` (it asks for your Apple and Google account details interactively; none are stored in the repo)
7. Store copy: `docs/store-listing.md`.

## Never commit

- `.dev.vars`
- `.env`
- API tokens
- The word secret
