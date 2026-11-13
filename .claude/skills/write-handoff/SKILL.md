---
name: write-handoff
description: Rewrite docs/handoff.md so the next session, started with the same fixed prompt, can do the next step cold. Use at the end of every step (it is part of the step's definition of done), when the owner redirects the work, or when asked to "write a handoff" or "set up the next session".
---

# Write the handoff

Every session starts from the same prompt in `AGENTS.md` and at the top of `docs/handoff.md`. The handoff is the only channel to the next session, which has none of your context. Write for a capable engineer who has never seen the repo.

## Keep word for word

- **The prompt** block. Never edit it unless the owner asks. If a session needs different instructions, they go in "Next step".
- **How every session works.**

## Update every time

1. **Step table.** Mark finished steps done (with the commit or PR), the new next step **next**. Keep every 🛑 and 🚩 row.
2. **Next step.** Replace it entirely with exactly one step:
   - **Goal:** what is true for the owner when it is done.
   - **Requirements:** the plan section(s) and brief sections it covers - cite, don't restate.
   - **Units and delegation:** the units you would brief out, which agent, parallel or serial.
   - **Decide in this step:** open technical choices this step owns and what evidence settles them.
   - **Definition of done:** a checklist ending with "`npm run verify` green", "review run and answered", "this file rewritten for <next id>".
   - **Not this step:** adjacent work and the step id it belongs to.
   - **What already exists:** paths the step builds on, so nothing is re-derived.
3. **Open questions for the owner.** Keep unanswered ones, remove answered ones (write the answer into the plan), add new ones with the default you are proceeding on.
4. **Learnings.** Follow "Capture and reuse learnings" in `.github/dev-process.md`. Update `docs/engineering-notes.md` only when architecture or an invariant changed.

## If the next thing is a 🛑

"Next step" describes the stop: exactly what the owner must do (accounts, secrets, commands, with links to `docs/deploy.md`), what to check, which questions it answers, and the step after it so the following session can go straight on.

## Tell the owner

Whenever your final reply points the owner to the next session, include the exact prompt from the handoff's "The prompt" section in a fenced code block, and say whether a PR needs merging first or a 🛑 is pending.

## Checks before committing

- A cold reader could do the next step without asking anything that is not a product decision.
- Every path in it exists on the branch; every step id exists in the plan.
- The prompt block is byte-identical to the one in `AGENTS.md`.
- It describes one next step, and it lands in the same commit series as the step's code.
