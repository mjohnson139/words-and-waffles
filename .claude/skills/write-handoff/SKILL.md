---
name: write-handoff
description: Hand an issue off so the next session, started with a prompt that names the next issue, can do it cold. Use at the end of every issue (it is part of its definition of done), when the owner redirects the work, or when asked to "write a handoff" or "set up the next session".
---

# Hand off an issue

The queue is GitHub issues (`.github/dev-process.md`, "Issues are the queue"). The next session has none of your context: it gets a prompt naming one issue, and reads that issue, its comments and its epic. Write for a capable engineer who has never seen the repo.

## 1. Close out the issue you worked on

- The PR body says `Closes #<n>`; merging closes the issue. Do not close it by hand.
- Comment on the issue, under 200 words: what landed (PR number), what was decided and why, anything deferred and where it went (a new `chore` issue, the decisions issue). If the issue is only partly done, say exactly what is left, so the next session can finish it from the comment.
- Tick the definition-of-done boxes that are done.

## 2. Make the next issue ready

The next issue is the one the owner named in a comment; else the first open, unblocked sub-issue in the epic's order that is not the owner's; else the oldest open, unblocked issue not assigned to the owner. An issue blocked by the one you just finished stays blocked until your PR is merged (and deployed, if it says so), so it is still the next issue: the owner merges, then starts the next session on it. Edit its body so a cold reader could do it without asking anything that is not a product decision:

- **Goal:** what is true for the owner when it is done.
- **Context:** owner quotes with dates, what already exists (paths), links to the brief and prototype sections it covers. Cite, don't restate.
- **Decide in this issue:** open technical choices and what evidence settles them.
- **Units:** the units you would brief out, which agent, parallel or serial.
- **Definition of done:** a checklist ending with "`npm run verify` green", "review run and answered", "PR closes this issue".
- **Not this issue:** adjacent work and the issue it belongs to.

If no next issue exists, create it (`gh issue create --parent <epic> --label <type>`) with that body. If the next thing is the owner's (accounts, a phone test, a decision), the issue is assigned to the owner and says exactly what they must do, with links to `docs/deploy.md` where it applies, and which issue follows it.

## 3. Reorder and record

- If the order changed, drag the sub-issues on the epic (or edit the "Order" section of its body) rather than opening a PR.
- A new open question goes on the decisions issue with the default you are proceeding on; an answered one gets its answer in `docs/decisions.md` in your PR and is ticked.
- Learnings: follow "Capture and reuse learnings" in `.github/dev-process.md`. Update `docs/engineering-notes.md` only when architecture or an invariant changed.

## 4. Tell the owner

Whenever your final reply points the owner to the next session, give this prompt with the next issue's number in a fenced code block, and say whether a PR needs merging first or the next issue is the owner's:

```
Work on mjohnson139/words-and-waffles#<n>: check out main, read the issue and AGENTS.md, and do it.
```

## Checks before you finish

- A cold reader could do the next issue from its body and comments alone.
- Every path named in it exists on `main` or on your branch.
- The issue you worked on has your closing comment, and your PR says `Closes #<n>`.
