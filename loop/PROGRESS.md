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

### 2026-07-10 — 0.1 Toolchain scaffold, gate green end to end (DONE)

- Tests first: `src/index.test.ts` (1 seed case) written before any config or source; watched
  RED twice — gate: `error: Script not found "typecheck"`; bun test: `Cannot find module
  './index'` — before scaffolding.
- Built the full Phase 0 scaffold: `package.json` (scripts exactly per docs/TOOLCHAIN.md;
  `dependencies` explicitly `{}`), `tsconfig.json` (strict, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`, covers all of `src/`), `tsconfig.build.json` (emits `dist/` with
  `.d.ts`; excludes `src/type-tests.ts` and `src/**/*.test.ts` — verified dist contains only
  `index.js` + `index.d.ts`), `bunfig.toml` (coverage threshold), ESLint 9 flat config
  (eslint + typescript-eslint recommended; `no-explicit-any` is an error via recommended),
  seed `src/index.ts` (one const export, replaced from task 3.1) and empty `src/type-tests.ts`.
- DECISION — gate honesty probed, not assumed: added a deliberately uncovered function and
  required the test step to FAIL before trusting the threshold. First attempt passed (bad):
  Bun 1.3.14 silently ignores the singular `{ line, function }` threshold keys sketched in
  TOOLCHAIN.md. Enforced syntax is plural `{ lines = 1.0, functions = 1.0 }` — verified
  exit 1 with the probe, exit 0 at 100% after removing it. Deviation recorded in TOOLCHAIN.md.
- DECISION — versions pinned `typescript@^5` + `eslint@^9` (resolved 5.9.3 / 9.39.4): a bare
  install gave typescript@7 + eslint@10, but typescript-eslint@8 (latest) peer-requires TS <6
  and TOOLCHAIN.md locks "ESLint 9 flat config". Rejected keeping latest majors because the
  lint stack would run outside its supported peer range. Flagged for human review (upgrading
  to TS 7 / ESLint 10 is a post-M1 toolchain decision).
- DECISION — `@types/bun` added to devDependencies (deviation recorded in TOOLCHAIN.md):
  tsc typechecks `src/**/*.test.ts` (tsconfig covers all of src/), and `bun:test` imports do
  not resolve without it. Rejected excluding tests from tsconfig — untypechecked tests would
  weaken the gate.
- KNOWN LIMITATION (recorded): bun coverage only counts files LOADED by tests — a src/ file
  never imported by any test silently escapes the 100% threshold. Acceptable now (every
  Phase 1-3 module gets direct tests); the 4.1 sweep must re-check that all runtime src/
  files appear in the coverage table.
- Gate: typecheck OK, lint clean, 1 test passes (was 0; +1) at 100% line + function coverage,
  build OK — `./loop/scripts/gate.sh` exit 0.
- Next: task 1.1 (`deepEqual` in src/ops.ts, guarded core).

### 2026-07-10 — 1.1 deepEqual: deep structural, type-sensitive equality (DONE)

- Tests first: `src/ops.test.ts`, 27 new cases across six describe groups (type-sensitive
  primitives; null/undefined/0 distinctness; SameValueZero numbers; structural objects;
  order-sensitive arrays; mixed nesting and empty containers); watched RED (`error: Cannot
  find module './ops'`) before implementing.
- Built `src/ops.ts` (guarded core, first content): `deepEqual(a: unknown, b: unknown)` —
  fast-path `===`, SameValueZero number branch, array element-wise recursion, object
  own-enumerable-key recursion with key-count + `Object.hasOwn` checks. ~25 lines.
- DECISION — number equality is SameValueZero (`NaN` equals `NaN`, `+0` equals `-0`): DESIGN
  section 7 already locks groupBy to SameValueZero via native Map keys, so this keeps ONE
  equality notion for values across the engine; it also matches `Array.prototype.includes`
  and mainstream deep-equal libraries, and avoids `where("x", "==", NaN)` silently never
  matching. Rejected strict `===` NaN semantics (NaN never equal) because it would split
  equality between where and groupBy. Distinct from the DESIGN-locked rule that RELATIONAL
  comparisons involving NaN are false (that lands in task 1.2). Flagged for human review.
- DECISION — a key explicitly set to `undefined` is structurally present: `{a: undefined}`
  is NOT equal to `{}` (own-enumerable-key sets are compared, not defined-value sets).
  Rationale: key sets are part of structure; dropping undefined-valued keys would be a
  hidden JSON.stringify-style normalization the engine does not perform anywhere else.
- KNOWN LIMITATION (recorded): non-plain objects (Date, Map, Set, class instances) get no
  special handling — they compare structurally by own enumerable keys (two Dates compare as
  empty objects, hence equal regardless of time). Acceptable: rows are JSON values by
  contract and DESIGN section 8 explicitly rejects Date support.
- Gate: typecheck OK, lint clean, 28 tests pass (was 1; +27) at 100% line + function
  coverage (src/index.ts and src/ops.ts both in the coverage table), build OK.
- Next: task 1.2 (relational comparison for `<`, `<=`, `>`, `>=` in src/ops.ts).

### 2026-07-10 — 1.2 Relational comparison for `<`, `<=`, `>`, `>=` (DONE)

- Tests first: `src/ops.test.ts`, 13 new cases across four describe groups (number
  ordering incl. equal/±0/infinity boundaries; NaN always false; string code-unit
  order; mixed number/string unordered); watched RED (`SyntaxError: Export named
  'compareRelational' not found in module 'src/ops.ts'`) before implementing.
- Built `compareRelational(a, op, b)` plus the `RelationalOperator` type in
  `src/ops.ts` (guarded core): a typeof-mismatch guard returning false, then an
  exhaustive switch delegating to the native JS operators. ~15 lines.
- DECISION — string comparison is plain JS code-unit order (no locale): it is
  deterministic and environment-independent with zero dependencies, whereas
  `localeCompare` depends on the ICU data the runtime ships and would make query
  results platform-dependent. Pinned by tests: `"Z" < "a"`, `"ä" > "z"`,
  `"10" < "9"` are all true.
- DECISION — mixed number/string operands are UNORDERED: all four operators return
  false, the same convention as NaN. Raw JS would coerce (`5 < "10"` is true in JS),
  which contradicts the engine's type-sensitive stance (`1` never equals `"1"`);
  throwing was rejected because DESIGN section 7 locks the runtime-error set to the
  limit TypeError and the empty-set RangeError. Mixed operands can only reach the
  runtime through a `number | string` union field, since `OperatorFor`/`T[K]`
  typing (task 2.1) blocks everything else. Flagged for human review.
- NaN-comparisons-false required no code: native relational operators are already
  IEEE-754 unordered on NaN; tests pin it for all four operators, NaN on either
  side and both.
- Gate: typecheck OK, lint clean, 41 tests pass (was 28; +13) at 100% line +
  function coverage, build OK.
- Next: task 1.3 (`evaluateWhere(rowValue, op, value)` — one entry point for all
  7 operators).
