# jsonq build loop — iteration prompt (PLANNING MODE)

You are planning the next build milestone for jsonq.
This prompt is fed with a FRESH context. Re-derive state by reading files and git history.
Do NOT implement features in this mode. Your only output is an updated plan (and optional PROGRESS notes).

## 0. Orient (do this every iteration, in order)

- 0a. Study `CLAUDE.md` or `AGENTS.md`.
- 0b. Study `MANIFESTO.md` and `docs/DESIGN.md` — the frozen spec.
- 0c. Study `loop/ACCEPTANCE.md` — what "done" means for the current milestone.
- 0d. Study `loop/IMPLEMENTATION_PLAN.md`, `loop/PROGRESS.md`, `loop/HANDOFF.md`.
- 0e. Study the codebase and test suite. Inventory what actually exists vs what DESIGN.md still requires.

## 1. Assess

- What milestone are we in? (see ACCEPTANCE.md title)
- What is already built and green? (git log, ticks in plan, tests)
- What remains per DESIGN.md and ACCEPTANCE.md?
- Did the previous plan go stale, circle, or have tasks too large for one iteration? (PROGRESS.md blockers)

## 2. Produce or refresh the plan

Rewrite `loop/IMPLEMENTATION_PLAN.md` with:

- A one-paragraph milestone header (scope, reference to DESIGN sections, link to ACCEPTANCE.md)
- Phases in **build order** (dependencies first)
- Tasks as `- [ ]` checkboxes, **one iteration each** — completable with one commit after TDD + gate
- Each task description states: what to test, what to implement, which DESIGN section it satisfies
- A "Later (NOT this milestone)" section for explicitly deferred work
- Mark already-complete work as `- [x]` with brief note if re-planning mid-milestone

### Task sizing rules

- One task = one commit = one gate run
- If a task needs > ~30 minutes of agent work, split it
- If a task is "implement entire subsystem", split by testable slice
- Order: infrastructure/seams before features; features before polish; docs close-out last

### Optional: use a workflow for discovery

If the codebase is large and you need inventory (list every module, map dependencies), you MAY run a **dynamic workflow** to explore in parallel, then write the plan from synthesized results. Do not implement code.

## 3. Validate the plan

- Every ACCEPTANCE.md criterion maps to at least one task
- No task contradicts DESIGN.md locked decisions
- Blockers from PROGRESS.md are addressed (task removed, split, or explicit "blocked" section)
- Plan is disposable — prefer clarity over preserving old checkbox IDs

## 4. Commit and stop

- Commit only the plan (and PROGRESS/HANDOFF updates if needed): `docs(plan): refresh IMPLEMENTATION_PLAN for M1`
- Do NOT create `.loop/COMPLETE` in planning mode
- End the iteration

## 999. Guardrails

- 999a. NO IMPLEMENTATION — no feature code, no "quick fixes" while planning
- 999b. NO weakening acceptance criteria to make the plan easier
- 999c. Record open questions in PROGRESS.md, not silent spec changes
- 999d. NEVER pause for human input — make planning decisions, record them, commit

After planning: set `LOOP_PROMPT_FILE="loop/PROMPT.md"` in `loop/config/loop.env` (build mode) and run the build loop.
