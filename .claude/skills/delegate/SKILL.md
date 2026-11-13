---
name: delegate
description: Write a brief and hand one unit of work to a cheaper subagent (implementer on sonnet, mechanic on haiku, reviewer on sonnet), then verify what comes back. Use whenever a unit of a step can be fully specified up front - which is most of them - so the session's main model spends its tokens on planning, review and integration.
---

# Delegate a unit

The orchestrator plans, reviews and integrates; delegates type. A delegate starts cold, so the brief is the whole world it knows.

## Pick the agent

- `implementer` (sonnet): code plus tests for one unit.
- `mechanic` (haiku): no judgment needed - docs from a template, data conversion, renames, lint fixes, copying copy.
- `reviewer` (sonnet): read-only review of a diff.
- Keep it yourself when the brief would be longer than the code, or a delegate already failed twice.

If `.claude/agents/` is not loaded in this session (agents load at session start), use the `general-purpose` agent with `model: "sonnet"` or `"haiku"` and paste the agent file's body at the top of the prompt.

## Parallel or serial

- Units with disjoint files and no dependency changes: run in parallel, each with `isolation: "worktree"`. Merge their branches yourself afterwards (`git merge --no-ff <branch>` or cherry-pick), then run verify once on the result.
- A unit that touches `package.json`, the lockfile, `app.json` or shared config: run it alone, before the others.
- Never let two delegates edit the same file.

## The brief (copy this shape)

```
Repo: /path/to/words-and-waffles (branch <name>). Read AGENTS.md first.
Unit: <step id> - <one line>.

Goal: <what is true when this is done, one or two sentences>.

You own these files (create or edit only these):
- app/src/game/foo.ts
- app/src/game/__tests__/foo.test.ts

Contract:
<exact TypeScript signatures / payload shapes / props the rest of the app relies on>

Port from the prototype: docs/prototype/prototype.html lines <a-b> (<function names>). Keep behavior and copy identical.

Tests to write: <list of cases, including the edge cases that matter>.

Constraints: no new dependencies <or: you may add X with `npx expo install X`>; <other rules>.

Done when: `<command>` passes. Commit with message "<conventional message>" <or: do not commit>.

Report (under 200 words): files changed, commands run and results, assumptions, anything not done. No file contents.
```

## When it comes back

1. Read the diff (`git diff`, or the worktree branch's diff), not just the report.
2. Run the check yourself. A delegate's "it passes" is a claim, not evidence.
3. Fix small things yourself; send substantive problems back once with a sharper brief; take the unit back after a second failure.
4. Note in the PR body what was delegated to which agent.
