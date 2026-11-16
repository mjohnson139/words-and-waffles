# How to work in this repo

Every session starts from a prompt that names one GitHub issue, and should be able to finish it without asking the owner anything that is not a product decision. This file is the shape of that work.

## Roles

- **The owner** is the product manager. They decide scope and answer open questions, test feel on a phone, hold every account and secret, and are the only one who merges. An owner comment on an issue or a PR beats this file and the issue body.
- **The orchestrator** is the session's main model, and it is always a smart one: Opus at high effort, or better. It owns design, planning, every judgment call and review. It reads the issue, splits it into units, writes briefs, delegates, reviews what comes back, integrates, runs the checks and hands the issue off. It writes code itself only when a brief would take longer than the code, or when a delegated attempt failed twice.
- **Delegates** are cheaper models (Sonnet, Haiku) defined in `.claude/agents/`, which pin their models. They get clearly defined, well-scoped work: implementing a specified unit, mechanical edits, inventories, running `gh` and CI commands. One unit each. See "Delegation" below.

## Issues are the queue

Work lives in GitHub issues, not in a file. Changing the plan or the order is an edit on GitHub, never a PR.

**Types.** An issue's type is a conventional-commit word, used twice: as the title prefix and as the label. The issue, its branch, its commits and its PR then share one word.

| Type | Label | Use for |
|---|---|---|
| `epic` | `epic` | A goal that takes several issues. Its sub-issues are the work. |
| `feat` | `feat` | New or changed behavior the player or the owner can see. |
| `fix` | `fix` | Something is wrong. Bug reports from the template get this. |
| `chore` | `chore` | Upkeep with no player-visible change: CI, tooling, an owner task, a deferred review finding. A `ci:`, `refactor:` or `test:` commit closes a `chore` issue. |
| `docs` | `docs` | Documentation only. |

Titles read like the commit that will close them, scope optional: `fix(web): no text selection on the play screen`, `feat: store screenshots from production`, `epic: app store launch`. Is there a Conventional Commits for issues? Not as a spec. The nearest things are GitHub's own issue types and the habit, common in repos that use conventional commits, of putting the commit type in the issue title. This repo does the second, so no new vocabulary is needed.

**Epics and order.** An epic is an issue with the `epic` label whose children are GitHub sub-issues (`gh issue create --parent <epic>`). The order of the sub-issues, top first, is the queue; drag to reorder. A hard dependency is a `blocked by` relation (`gh issue create --blocked-by <n>`), and a session does not start a blocked issue. Shipped work needs no issue after the fact: an epic's body links the PRs that got it there.

**Owner work.** Something only the owner can do (accounts, credentials, a phone test) is a `chore` assigned to the owner. A session stops at it and says so. A non-blocking "have a look" is the same thing without anything blocked by it.

**Decisions.** Open product questions sit in one `chore` issue assigned to the owner, each with the default the work proceeds on. An answer gets written into `docs/decisions.md` in the next PR that touches the area, and the item is ticked.

**The body of a work issue** is the brief a cold session needs: `Goal` (what is true when it is done), `Context` (owner quotes with dates, what already exists, links), `Decide in this issue`, `Units` (what to delegate and to whom), `Definition of done` (a checklist that ends with verify green, review answered, and a PR that closes the issue), `Not this issue`. An epic's body holds the goal, the shipped PRs, the order and any decisions. Durable reasoning does not live in issues: architecture and invariants go in `docs/engineering-notes.md`, investigations in `docs/solutions/`, product decisions in `docs/decisions.md`. An epic that needs more design than its body carries gets a plan in `docs/plans/`, written with `ce-plan` and linked from the epic; the plan holds architecture and contracts, never the step list.

## The shape of a session

1. Read the issue named in the prompt and its comments, then its epic (if any), `AGENTS.md`, this file and `docs/engineering-notes.md`. Search `docs/solutions/` for the area you are touching. Check open PRs and the latest owner comments; if the previous session's PR for this issue is still unmerged, build on its branch rather than redoing its work, and say so in your PR.
2. Set up: `npm install -g npm@11.21.2 && npm install` at the root (npm 10 crashes on this workspace: `docs/solutions/build-issues/npm10-workspace-edgesout-crash.md`).
3. Work on the branch the session was given; if none, `git switch -c <type>/<issue-number>-<slug>` from an up-to-date `main`. Nothing is ever committed on `main`.
4. **Do the issue**, delegating units per `.claude/skills/delegate/SKILL.md`. Commit small, push after every unit, open one draft PR into `main` whose body says `Closes #<n>`.
5. Before the PR leaves draft: `npm run verify` green, the e2e smoke green, a code review run and answered (see "Review").
6. **Hand off** with `.claude/skills/write-handoff/SKILL.md`: comment on the issue with what landed and what was decided, make sure the next issue in the epic's order can be done cold, and tell the owner the prompt for it. If the context allows and the next issue is neither blocked (by yours or anything else) nor the owner's, carry on with it on a new branch and a new PR: one PR closes one issue.
7. **Stop** at an issue assigned to the owner, when a product decision blocks you, or when the same failure survives two honest fixes. Say why on the issue and in the PR.
8. Cloud sessions never run `expo run:ios`, `expo prebuild`, Xcode or an Android emulator. The screen check is the web export driven by Playwright (Chromium is preinstalled; do not run `playwright install` in the sandbox).

### Run contract (minimal owner intervention)

- Sessions run almost automatically. A session picks up the named issue, implements it, reviews the diff, opens the PR and babysits CI to green (`ce-babysit-pr`), without asking for approval along the way. It asks only for a genuinely owner-only decision, and even then it proceeds on a stated default when it can.
- The owner merges a session's PR, then starts the next session with the prompt the last session gave them, which names the next issue. Merging and owner-only decisions are the only interventions.
- Sessions never wait on a non-blocking owner issue; they note what the owner might look at and move on.
- Owner decisions that are not blocking get a sensible default, recorded on the decisions issue and in `docs/decisions.md`, and the work continues on that default.
- Never merge, never push to `main`, never create accounts, never add secrets, never deploy outside CI.

## Delegation

The subscription lasts longer when the expensive model thinks and the cheaper models type. The orchestrator (Opus at high effort or better) keeps design, planning, judgment calls and review; everything that can be specified completely in a brief goes to a delegate. The agent definitions in `.claude/agents/` pin the delegate models; do not raise them to work around a weak brief, sharpen the brief.

| Agent | Model | Use for |
|---|---|---|
| `implementer` | sonnet | One unit of code with its tests: a pure module, a component, a Worker route, a CI workflow. |
| `mechanic` | haiku | Mechanical work with no design judgment: boilerplate docs from a template, data transforms, renames, lint fixes, copying copy from the prototype. |
| `reviewer` | sonnet | A focused review of a diff against the issue, the brief and these rules. |

How to delegate well (`.claude/skills/delegate/SKILL.md` has the brief template):

- **One unit, one owner, disjoint files.** Two delegates never edit the same file. Run independent units in parallel with `isolation: "worktree"` and merge their branches yourself; run a unit that touches `package.json` or the lockfile alone.
- **The brief carries the context.** Delegates start cold. Give them the files they own, the exact contract (types and signatures), the prototype line numbers to port, the tests to write and the command that must pass. Never "see the conversation above".
- **Ask for a short report**, not file contents: files changed, commands run with results, anything they could not do. Then read the diff yourself (`git diff`), not their summary.
- **Escalate, don't loop.** If a delegate fails the same check twice, take the unit back or rewrite the brief; do not send it a third time unchanged.
- Research questions (an Expo API, a Wrangler flag) go to a delegate with web access, and the answer goes into the brief or `docs/solutions/`, not just the conversation.

## Review

Review is where the expensive model earns its cost. After an issue's units are integrated:

1. Run the checks. A red check is fixed before anyone reviews.
2. Spawn one `reviewer` (or the `ce-code-review` skill's personas on sonnet) over the diff. For a Worker or privacy change add a security pass; for a UI change, look at the Playwright screenshots yourself.
3. The orchestrator decides which findings are real, fixes or delegates them, and lists the rest with a reason in the PR. A finding worth keeping but not fixing now becomes a `chore` issue.

## Checks

```bash
npm run verify          # root: app (typecheck, lint, unit, web export, bundle budget) + worker (typecheck, lint, tests, dry-run deploy)
npm run e2e -w app      # Playwright smoke against the web export
npm run live-check      # proves the "Done means" items against production, about a minute; run after any deploy
```

Run `npm run verify` before every push. Reproduce a failure before fixing it.

## What belongs in a unit test

The unit runner is node and cannot render a component, on purpose: it keeps logic out of screens. Anything that could be wrong goes in a pure module with a test: scoring, dates, streaks, stats, badges, the game state machine, the word contract, merge rules, ping flags, layout maths. `src/game/` may not import React, React Native or Expo (lint-enforced). Screens are checked by the e2e smoke in a real browser and by the owner on a phone.

## Hard lines

These are rejected in review no matter who wrote them:

- A new dependency without a sentence in the PR saying why it is needed and what it costs in bundle size. Prefer the platform and the Expo SDK.
- Anything that sends data to a host that is not ours, or sends an identifier to ours: analytics, crash reporters, fonts or scripts from a CDN, cookies, device IDs, fingerprinting, logging of IPs or user agents.
- A secret in the repo. Secrets live in Worker secrets, EAS secrets and GitHub Actions secrets; the repo has `app/.env.example` only.
- Calling the word hashing "secure" or "encrypted". It is obfuscation.
- The name "Wordle" in the app name, store listing, README title, repo description or topics.
- Custom native code (it breaks Expo Go) without an owner decision.

## Expo moves fast

Expo ships breaking changes every SDK. Before writing code against an Expo or React Native API, read the major version in `app/package.json` and check `https://docs.expo.dev/versions/v<major>.0.0/` (or `https://docs.expo.dev/llms.txt`). Install packages with `npx expo install <pkg>` from `app/`, never a bare `npm install`, so versions match the SDK.

## Capture and reuse learnings (Compound Engineering)

Before changing an area, read its entry in `docs/engineering-notes.md` and search `docs/solutions/` by module, symptom and tags. Read matching documents before repeating an investigation.

After a problem is solved and verified, use the `ce-compound` skill to judge whether it deserves a learning. Capture reasoning that is not recoverable from the code, tests or existing docs and whose loss would cause a repeat, real risk or a long rediscovery. Effort and diff size alone do not qualify. If nothing qualifies, write nothing and say so in the PR.

For each qualifying learning:

1. **One solved problem per document**, in `docs/solutions/<category>/<descriptive-name>.md` with YAML `title`, `module`, `date`, `problem_type`, `component`, `severity`, `tags` (bugs also `symptoms`, `root_cause`, `resolution_type`). Update an existing document that covers the same problem rather than adding a competing one.
2. **Preserve the investigation:** symptom, what failed and why, the cause, the verified fix, how to prevent it. Cite files and tests.
3. **Make it findable:** add a row to `docs/solutions/README.md` and, where useful, a link from the engineering notes topic.

Use `ce-compound-refresh` to audit old learnings for drift. Agents without skills read the installed `ce-compound/SKILL.md` and follow it.

Document responsibilities stay small: engineering notes hold the current architecture and invariants; solutions hold durable investigations; `docs/decisions.md` holds product decisions and their reasons; issues hold scope, order and definitions of done; PRs hold delivery evidence. Never append a diary of completed work to the engineering notes.

## Commits and PRs

- Conventional commits (`feat(game): …`, `fix(worker): …`, `docs: …`, `ci: …`, `chore: …`), small and focused, each leaving verify green. The type matches the issue's type where one exists.
- PR titles in the same style. The PR body: `Closes #<n>`, what changed, how it was verified (commands and results, e2e screenshots for UI), what was delegated, review findings and their disposition, open questions.
- UI copy comes from the prototype verbatim. New copy matches its voice (short, warm, breakfast puns, US spelling).
