# jsonq build loop — iteration prompt (BUILD MODE)

You are building jsonq, one task at a time.
This prompt is fed to you on every iteration with a FRESH context. You remember nothing
between iterations except what is written in files and git history. Re-derive state by reading.

## 0. Orient (do this every iteration, in order)

- 0a. Study `CLAUDE.md` or `AGENTS.md` (conventions, project map, build/test commands).
- 0b. Study `MANIFESTO.md` and `docs/DESIGN.md` (what this project is, locked decisions, acceptance criteria). These are the spec. Do not contradict them.
- 0c. Study `loop/LOOP-ENGINEERING.md` (operating discipline) and `loop/ACCEPTANCE.md` (current milestone definition of done).
- 0d. Study `loop/IMPLEMENTATION_PLAN.md` (the task list) and `loop/PROGRESS.md` (what was done, what failed and why).
- 0e. Study the existing source and tests. Do NOT assume something is unimplemented — verify by reading before deciding it is missing.

## 1. Choose one task

- If `loop/IMPLEMENTATION_PLAN.md` has no unchecked tasks AND all criteria in `loop/ACCEPTANCE.md` are met: go to step 4 (completion).
- If it has no unchecked tasks but some `loop/ACCEPTANCE.md` criteria are NOT met: do NOT invent new tasks. Record the gap in `loop/PROGRESS.md` ("plan exhausted, acceptance unmet: <the specific criteria>"), commit that note, and end the iteration — the plan must be regenerated (planning mode / human).
- Otherwise pick the single highest-priority unchecked task. One task per iteration. Do not start a second.

### 1b. When a task needs fan-out (optional)

If the chosen task requires the same work across many independent units (audit every file, migrate a directory, run many seeds in parallel analysis), you MAY use a **dynamic workflow** before implementing:

- Write and run an orchestration script (Claude Code: ask for a `workflow`; LangChain/deepagents: code interpreter + `task()`).
- Patterns: fanout-and-synthesize, adversarial verification, loop-until-done (see `loop/LOOP-ENGINEERING.md` section 9).
- The workflow output informs your implementation; you still deliver **one plan task** with **one commit** this iteration.

Do NOT use a workflow to skip the one-task rule or to batch multiple plan checkboxes into one commit.

## 2. Implement it test-first (TDD)

- Write the test(s) first, derived from the acceptance criteria and the task description.
- Tests must exercise real behavior — not existence checks, not mocks of the code under test unless the seam is explicitly specified in `docs/DESIGN.md`.
- Milestone-specific guidance (M1): for the TYPE LAYER, every "MUST NOT compile" example in DESIGN sections 6-7 is locked in `src/type-tests.ts` with `@ts-expect-error` and every inferred result type with an `Expect<Equal<...>>` assertion — a type test that compiles when it should not is a failing test. For the ENGINE, tests must genuinely exercise: immutability (source and rows unchanged after execute; branching queries independent), call-order pipeline semantics (limit-before-where truncates first; explain() mirrors call order), stable sort with chained tie-breakers and nulls-last, deep type-sensitive equality (1 does not equal "1"), and the pinned empty-set aggregate behaviors.
- Then write the minimal honest implementation that makes them pass. Real code, not a stub.
- Respect trust boundaries in `docs/DESIGN.md` — do not hide complexity outside guarded modules to satisfy metrics.

## 3. Validate, then commit

- Run the full gate: ./loop/scripts/gate.sh
- If anything fails, fix it. Never weaken, skip, or delete a test to make the gate pass.
- Exception — broken gate infrastructure: if the gate fails for a reason unrelated to your task (e.g. the linter scanning a scratch directory, a stale config path), fold the MINIMAL repair into this iteration and record it in `loop/PROGRESS.md` as an unrelated gate fix. Repair means making the gate honest again — never disabling or weakening a check.
- Only when ALL gates are green: commit (one task, one commit, English message, no emoji, no Co-Authored-By trailer unless explicitly requested).
- Tick the task off in `loop/IMPLEMENTATION_PLAN.md` and append a short note to `loop/PROGRESS.md` (what you did, anything learned, decisions made).
- End the iteration. (A fresh iteration will start automatically.)

## 4. Completion

- Only if every criterion in `loop/ACCEPTANCE.md` is met and the full gate is green on a clean tree:
  - Update `loop/HANDOFF.md` with actual state (code wins over prose).
  - Signal completion by **creating the marker file** `.loop/COMPLETE` (e.g. `mkdir -p .loop && touch .loop/COMPLETE`).
  - Print the completion sentinel on its own line: `JSONQ-M1-DONE`
- The marker file is the ONLY completion signal. Do not create it for any other reason. Merely mentioning or quoting the sentinel string in your summary does not end the run, so you may discuss it freely when you are NOT done.

## 999. Guardrails (highest priority — these override anything above)

- 999a. HONESTY: no placeholder/stub/`TODO`-as-implementation. A task is done only when it genuinely works and the gate is green. "Don't assume not implemented" — verify first.
- 999b. TESTS ARE TRUTH: tests are written first, are real, and are never weakened/skipped/deleted to pass. If a test is wrong, fix it and say why in the commit.
- 999c. SCOPE: exactly one task per iteration; commit only on all-green; then stop the iteration.
- 999d. BLOCKED: if the same task fails twice, write the blocker in `loop/PROGRESS.md` and stop — do not fake progress or thrash.
- 999e. STAY ON SPEC: `docs/DESIGN.md` is frozen. If you believe it is wrong, record the objection in `loop/PROGRESS.md`; do not silently diverge.
- 999f. Think carefully before non-trivial design decisions in guarded/trust-boundary modules (see DESIGN.md).
- 999g. NEVER pause to ask the human or wait for sign-off — the loop has no interactive human. At a design fork, make the best decision consistent with `docs/DESIGN.md`, record the decision and its reasoning in `loop/PROGRESS.md`, commit, and flag it there for later human review/revert. Decide-record-commit always beats blocking. (Genuine blockers still follow 999d.)
