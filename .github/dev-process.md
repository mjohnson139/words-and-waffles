# How to work in this repo

Every session starts from one fixed prompt (in `AGENTS.md` and `docs/handoff.md`) and should be able to finish real work without asking the owner anything that is not a product decision. This file is the shape of that work.

## Roles

- **The owner** is the product manager. They decide scope and answer open questions, test feel on a phone, hold every account and secret, and are the only one who merges. An owner comment on a PR or the epic issue beats this file, the handoff and the plan.
- **The orchestrator** is the session's main model. It reads the handoff, splits the step into units, writes briefs, delegates, reviews what comes back, integrates, runs the checks and rewrites the handoff. It writes code itself only when a brief would take longer than the code, or when a delegated attempt failed twice.
- **Delegates** are cheaper subagents defined in `.claude/agents/`. They do one well-specified unit each. See "Delegation" below.

## The shape of a session

1. Read `docs/handoff.md`, then the plan sections it points to, then `docs/engineering-notes.md`. Search `docs/solutions/` for the area you are touching.
2. Work on the branch the session was given; if none, `git switch -c feature/<step-id>` from an up-to-date `main`.
3. **Do the step under "Next step".** Then, if the context and the run contract allow, rewrite the handoff and keep going with the following step in the same branch. A session may finish several steps; each step ends with its own commit(s), verify green and a handoff rewrite, so a session that dies mid-way loses at most one step.
4. **Push after every step** and open a draft PR into `main` after the first one. One PR per session. Keep the PR description's checklist in step with what landed.
5. Before the PR leaves draft: `npm run verify` green, the e2e smoke green (from E1 on), a code review run and answered (see "Review").
6. **Stop** at a 🛑 in the plan, when a product decision blocks you, or when the same failure survives two honest fixes. Say why in the PR and the handoff.

### Run contract (minimal owner intervention)

- The owner merges a session's PR, then starts the next session with the same prompt. That is the only routine intervention.
- Sessions never wait on 🚩 rows; they note what the owner might look at and move on.
- Owner decisions that are not blocking get a sensible default, recorded in the plan's "Risks and open questions" and the handoff, and the work continues on that default.
- Never merge, never push to `main`, never create accounts, never add secrets, never deploy outside CI.

## Delegation

The subscription lasts longer when the expensive model thinks and the cheaper models type. Delegate any unit that can be specified completely in a brief.

| Agent | Model | Use for |
|---|---|---|
| `implementer` | sonnet | One unit of code with its tests: a pure module, a component, a Worker route, a CI workflow. |
| `mechanic` | haiku | Mechanical work with no design judgment: boilerplate docs from a template, data transforms, renames, lint fixes, copying copy from the prototype. |
| `reviewer` | sonnet | A focused review of a diff against the plan, the brief and these rules. |

How to delegate well (`.claude/skills/delegate/SKILL.md` has the brief template):

- **One unit, one owner, disjoint files.** Two delegates never edit the same file. Run independent units in parallel with `isolation: "worktree"` and merge their branches yourself; run a unit that touches `package.json` or the lockfile alone.
- **The brief carries the context.** Delegates start cold. Give them the files they own, the exact contract (types and signatures), the prototype line numbers to port, the tests to write and the command that must pass. Never "see the conversation above".
- **Ask for a short report**, not file contents: files changed, commands run with results, anything they could not do. Then read the diff yourself (`git diff`), not their summary.
- **Escalate, don't loop.** If a delegate fails the same check twice, take the unit back or rewrite the brief; do not send it a third time unchanged.
- Research questions (an Expo API, a Wrangler flag) go to a delegate with web access, and the answer goes into the brief or `docs/solutions/`, not just the conversation.

## Review

Review is where the expensive model earns its cost. After a step's units are integrated:

1. Run the checks. A red check is fixed before anyone reviews.
2. Spawn one `reviewer` (or the `ce-code-review` skill's personas on sonnet) over the step's diff. For a Worker or privacy change add a security pass; for a UI change, look at the Playwright screenshots yourself.
3. The orchestrator decides which findings are real, fixes or delegates them, and lists the rest with a reason in the PR.

## Checks

```bash
npm run verify          # root: app (typecheck, lint, unit, web export, bundle budget) + worker (typecheck, lint, tests, dry-run deploy)
npm run e2e -w app      # Playwright smoke against the web export (from step E1)
```

Run `npm run verify` before every push. Reproduce a failure before fixing it.

## What belongs in a unit test

The unit runner is node and cannot render a component, on purpose: it keeps logic out of screens. Anything that could be wrong goes in a pure module with a test: scoring, dates, streaks, stats, badges, the game state machine, the word contract, merge rules, ping flags, layout maths. `src/game/` may not import React, React Native or Expo (lint-enforced). Screens are checked by the e2e smoke in a real browser and by the owner on a phone.

## Hard lines

These are rejected in review no matter who wrote them:

- A new dependency without a sentence in the PR saying why it is needed and what it costs in bundle size. Prefer the platform and the Expo SDK.
- Anything that sends data to a host that is not ours, or sends an identifier to ours: analytics, crash reporters, fonts or scripts from a CDN, cookies, device IDs, fingerprinting, logging of IPs or user agents.
- A secret in the repo. Secrets live in Worker secrets, EAS secrets and GitHub Actions secrets; the repo has `.env.example` and `.dev.vars.example` only.
- Calling the word hashing "secure" or "encrypted". It is obfuscation.
- The name "Wordle" in the app name, store listing, README title, repo description or topics.
- Custom native code (it breaks Expo Go) without an owner decision.

## Expo moves fast

Expo ships breaking changes every SDK. Before writing code against an Expo or React Native API, read the major version in `app/package.json` and check `https://docs.expo.dev/versions/v<major>.0.0/` (or `https://docs.expo.dev/llms.txt`). Install packages with `npx expo install <pkg>` from `app/`, never a bare `npm install`, so versions match the SDK.

## Capture and reuse learnings (Compound Engineering)

Before changing an area, read its entry in `docs/engineering-notes.md` and search `docs/solutions/` by module, symptom and tags. Read matching documents before repeating an investigation.

After a problem is solved and verified, use the `ce-compound` skill to judge whether it deserves a learning. Capture reasoning that is not recoverable from the code, tests or existing docs and whose loss would cause a repeat, real risk or a long rediscovery. Effort and diff size alone do not qualify. If nothing qualifies, write nothing and say so in the step's report.

For each qualifying learning:

1. **One solved problem per document**, in `docs/solutions/<category>/<descriptive-name>.md` with YAML `title`, `module`, `date`, `problem_type`, `component`, `severity`, `tags` (bugs also `symptoms`, `root_cause`, `resolution_type`). Update an existing document that covers the same problem rather than adding a competing one.
2. **Preserve the investigation:** symptom, what failed and why, the cause, the verified fix, how to prevent it. Cite files and tests.
3. **Make it findable:** add a row to `docs/solutions/README.md` and, where useful, a link from the engineering notes topic.

Use `ce-compound-refresh` to audit old learnings for drift. Agents without skills read the installed `ce-compound/SKILL.md` and follow it.

Document responsibilities stay small: engineering notes hold the current architecture and invariants; solutions hold durable investigations; the plan and handoff hold scope, next step and open owner decisions; PRs hold delivery evidence. Never append a diary of completed steps to the engineering notes.

## Commits and PRs

- Conventional commits (`feat(game): …`, `fix(worker): …`, `docs: …`, `ci: …`, `chore: …`), small and focused, each leaving verify green.
- PR titles in the same style. The PR body: what changed per step, how it was verified (commands and results, e2e screenshots for UI), what was delegated, review findings and their disposition, open questions.
- UI copy comes from the prototype verbatim. New copy matches its voice (short, warm, breakfast puns, US spelling).
