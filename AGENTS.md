# Agent instructions

Words & Waffles: a cosy daily word game. One Expo app (iOS, Android, web) in `app/`, one Cloudflare Worker in `worker/`. No accounts, no trackers.

- **The queue is GitHub issues.** Epics hold sub-issues; the sub-issue order is the order of work. Issue titles and labels use the conventional-commit words (`epic`, `feat`, `fix`, `chore`, `docs`). Details: `.github/dev-process.md`, "Issues are the queue".
- **Every session starts with a prompt that names one issue:** `Work on mjohnson139/words-and-waffles#<n>: check out main, read the issue and AGENTS.md, and do it.`
- **When pointing the owner to the next session:** give that prompt with the next issue's number in a copyable code block, and say whether a PR needs merging first or the next issue is the owner's.
- **End every issue by handing it off:** `.claude/skills/write-handoff/SKILL.md` (a comment on the issue, the next issue made ready, the prompt for the owner).
- **Scope:** the issue and its epic. The behavior spec is `docs/prototype/prototype.html`; the build brief is `docs/brief.md`; product decisions and their defaults are in `docs/decisions.md`.
- **How to work:** `.github/dev-process.md` (roles, issues, run contract, delegation, review, hard lines, Compound Engineering). **How the app works:** `docs/engineering-notes.md`. Past investigations: `docs/solutions/`.
- **Delegate:** the orchestrator is always a smart model (Opus at high effort, or better) and owns design, planning, judgment calls and review; well-scoped units go to the cheaper models pinned in `.claude/agents/` (`implementer` on sonnet, `mechanic` on haiku, `reviewer` on sonnet) with a brief from `.claude/skills/delegate/SKILL.md`.
- **Run hands-off:** pick up the named issue, implement, review, open the PR and babysit CI without asking for approval. The owner steps in only to merge and for decisions only they can make.
- **Before every push:** `npm run verify` at the repo root. Every PR body says `Closes #<n>`.
- **Expo changes every SDK:** check the versioned docs for the SDK in `app/package.json` before using an Expo API; add packages with `npx expo install` from `app/`.
- **Never:** merge, push to `main`, add a secret, add a third-party host or tracker, or use the name "Wordle".
