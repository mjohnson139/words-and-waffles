# Contributing

Thanks for helping make Words & Waffles better. Please read the [code of conduct](CODE_OF_CONDUCT.md) first.

## Run it

From the repo root:

```sh
npm install
npm run web -w app          # web build in the browser
# or: npm start -w app      # then open the project in Expo Go
npm run verify              # run all checks
```

## Tests

```sh
npm test -w app
npm test -w worker
npm run e2e -w app          # Playwright smoke test of the screens
```

Game logic lives in pure modules under `app/src/game/`, with Vitest tests next to them. Screens are checked by the Playwright smoke test.

## Every dependency must justify itself

A new dependency needs one sentence in the pull request: why the platform or the Expo SDK can't do the job, and what it adds to the web bundle. The budget is about 500 KB gzipped, checked by `npm run size -w app`.

Add Expo packages with `npx expo install` from `app/`, so the versions match the SDK.

## No trackers. Ever.

This is a hard line. Pull requests that add any of the following are closed:

- analytics or crash reporters
- ad SDKs
- cookies, device IDs, or fingerprinting
- third-party fonts, scripts, or CDNs
- logging of IP addresses or user agents

Player data stays on the device unless the player chooses to export it. See [PRIVACY.md](PRIVACY.md).

## Issues

Bugs and features go in as issues; the templates set the title prefix and label. Prefixes are the conventional-commit words: `feat`, `fix`, `chore`, `docs`, and `epic` for a goal that takes several issues. Title it the way you would title the commit: `fix(web): long press selects the whole page`.

## Pull requests

- Keep them small and focused.
- Use conventional commit messages: `feat`, `fix`, `docs`, `ci`, `chore`, `refactor` or `test`.
- Say `Closes #N` in the description. Work is tracked in GitHub issues; the title convention is in [`.github/dev-process.md`](.github/dev-process.md).
- `npm run verify` must be green.
- Describe how you tested the change. Use the template that opens with each pull request.

## How agents work here

Agents follow the process in [`.github/dev-process.md`](.github/dev-process.md).
