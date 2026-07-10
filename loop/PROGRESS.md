# Progress Log (lab notebook)

> Append-only during the loop. This file is the loop's cross-iteration memory: the next
> fresh-context iteration learns dead ends, pinned decisions, and known limitations ONLY from here
> and from git history. Thin entries starve later iterations — write decision-record grade notes.

## Entry anatomy (follow this shape)

```markdown
### YYYY-MM-DD — {{phase/task id and title}} (DONE | BLOCKED)

- Tests first: {{suite/file, N new cases}}; watched them fail RED ({{the actual failure message}})
  before implementing.
- {{What was built or changed — one or two factual sentences.}}
- DECISION — {{the decision, pinned}}: {{rationale in one or two sentences; what was rejected and
  why}}. (add "flagged for human review" when non-obvious)
- KNOWN LIMITATION (recorded): {{honest deferral or edge left open, and why it is acceptable now}}.
- Gate: typecheck OK, lint clean, {{N}} tests pass (was {{M}}; +{{K}}) at {{coverage}}, build OK.
- Next: {{the single next task, per the plan}}.
```

Rules (from the reference build's real notebook):

- Record decisions WITH their reasoning. A bare "chose X" cannot stop a later fresh-context
  iteration from re-litigating X; the rationale can.
- Record failures and dead ends explicitly — preventing re-attempts is this file's whole purpose.
- Record known limitations at the moment you accept them, not when they bite.
- Tag anything a human should re-check with "flagged for human review".
- Include the gate numbers (test count delta, coverage) so progress is measurable, not narrated.
- Docs-only or verification-only iterations still get an entry (state what was verified and that
  nothing testable changed).

---

## Log

### 2026-07-10 — Spec locked, scaffold created (human session) (DONE)
- Brainstorm completed interactively; decisions ratified into MANIFESTO.md and docs/DESIGN.md
  (full type safety; immutable op-list core; Bun toolchain; refusals list closed).
- Template scaffold applied; gate.sh wired to `bun run typecheck/lint/test/build` (fails until
  loop Phase 0 creates package.json — correct backpressure).
- No source code exists. Next: planning mode generates IMPLEMENTATION_PLAN.md for M1.

### 2026-07-10 — M1 plan generated (planning mode) (DONE)
- Verified state by inventory: single scaffold commit, no package.json, no src/ — pure
  greenfield; plan written from DESIGN.md + ACCEPTANCE.md with nothing to mark done.
- Rewrote loop/IMPLEMENTATION_PLAN.md: 18 tasks in 6 phases (0 toolchain gate; 1 guarded core
  ops.ts; 2 type machinery; 3 fluent builder in 10 slices; 4 acceptance sweep; F close-out).
  Every ACCEPTANCE criterion maps to at least one task; refusals (DESIGN section 8) listed
  under "Later".
- DECISION — build order is bottom-up (ops.ts before types.ts before query.ts): the guarded
  core is pure functions with no dependencies (easiest to TDD in isolation, and it is where
  wrong answers are born, so it gets the earliest and strictest test pressure); the builder
  then composes already-proven parts. Rejected top-down (builder first with stub ops) because
  stubs in the guarded core would ship placeholder semantics past the gate.
- DECISION — semantic gaps in DESIGN are pinned by the BUILD loop, not resolved here: NaN
  equality for deepEqual (1.1), predicate representation in explain() (3.3), tie-breaker
  composition mechanics and non-adjacent sort behavior (3.6). Each task explicitly requires a
  recorded PROGRESS decision; flagged for human review when they land.
- No code written; gate not run (nothing to gate — package.json is task 0.1).
- Next: task 0.1 (toolchain scaffold, gate green) via the build loop
  (LOOP_PROMPT_FILE=loop/PROMPT.md).

### 2026-07-10 — M1 plan re-validated (planning mode, verification-only) (DONE)

- Re-derived state from files and git: still pure greenfield (2 commits, no package.json, no
  src/); the M1 plan from the previous iteration (531dbd8) is untouched by any build work and
  PROGRESS records no blockers, so there is nothing to split, remove, or re-order.
- Validated the existing 18-task plan against ACCEPTANCE.md and DESIGN.md line by line: every
  functional criterion maps to tasks 1.1-1.4 / 3.1-3.10; type-level positives and all six
  negative @ts-expect-error cases map to 2.1 plus per-task type tests and the 4.1 sweep;
  quality maps to 0.1 / 4.1 / F.2; documentation to F.1 / F.3; process and completion signal
  to F.3. No task touches a DESIGN section 8 refusal; refusals are listed under "Later".
- DECISION — plan left byte-identical rather than regenerated: nothing has executed against it
  and its inputs (DESIGN, ACCEPTANCE) are unchanged, so a rewrite would be churn with no
  information gain. This entry exists so the verification itself is on record.
- Verified loop/config/loop.env is already in build mode (LOOP_PROMPT_FILE="loop/PROMPT.md")
  and no .loop/COMPLETE marker exists; docs/TOOLCHAIN.md and .claude/agents/judge.md referenced
  by the plan both exist.
- No code written; gate not run (still nothing to gate — package.json is task 0.1).
- Next: task 0.1 (toolchain scaffold, gate green) via the build loop.
