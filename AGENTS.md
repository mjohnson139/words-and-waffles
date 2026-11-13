# Agent instructions

Words & Waffles: a cosy daily word game. One Expo app (iOS, Android, web) in `app/`, one Cloudflare Worker in `worker/`. No accounts, no trackers.

- **Start here:** `docs/handoff.md`. It names the next step and how every session works.
- **Every session starts with the same prompt:** `Continue Words & Waffles: in mjohnson139/words-and-waffles, check out main, read docs/handoff.md, and follow its "Next step" section.`
- **When pointing the owner to the next session:** give that exact prompt in a copyable code block, and say whether a PR needs merging first or a 🛑 is pending.
- **End every step by rewriting the handoff:** `.claude/skills/write-handoff/SKILL.md`.
- **Scope:** the plan linked from the handoff, in `docs/plans/`. The behavior spec is `docs/prototype/prototype.html`; the build brief is `docs/brief.md`.
- **How to work:** `.github/dev-process.md` (roles, run contract, delegation, review, hard lines, Compound Engineering). **How the app works:** `docs/engineering-notes.md`. Past investigations: `docs/solutions/`.
- **Delegate:** the main model plans, reviews and integrates; units go to `.claude/agents/` (`implementer` on sonnet, `mechanic` on haiku, `reviewer` on sonnet) with a brief from `.claude/skills/delegate/SKILL.md`.
- **Before every push:** `npm run verify` at the repo root.
- **Expo changes every SDK:** check the versioned docs for the SDK in `app/package.json` before using an Expo API; add packages with `npx expo install` from `app/`.
- **Never:** merge, push to `main`, add a secret, add a third-party host or tracker, or use the name "Wordle".
