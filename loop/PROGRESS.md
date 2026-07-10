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

### 2026-07-10 — 1.3 evaluateWhere: one entry point for all 7 operators (DONE)

- Tests first: `src/ops.test.ts`, 29 new tests across four describe groups (24-case
  table-driven sweep covering every operator; non-orderable relational operands;
  non-array `in` pools; readonly-array pool); watched RED (`SyntaxError: Export named
  'evaluateWhere' not found in module 'src/ops.ts'`) before implementing.
- Built `evaluateWhere(rowValue, op, value)` plus the `WhereOperator` type and an
  `isOrderable` guard in `src/ops.ts` (guarded core): exhaustive switch — `==`/`!=`
  via deepEqual, `in` via `Array.isArray` + `some(deepEqual)`, relational ops narrow
  both operands then delegate to compareRelational. No `default` case, so a future
  operator added to the union without a switch arm fails typecheck. ~20 lines.
- DECISION — relational ops on non-orderable operands (null/undefined/boolean/
  object/array, on either side) evaluate FALSE, never throw: DESIGN section 7 locks
  the runtime error set to the limit TypeError and the empty-set RangeError, and
  SQL's three-valued logic filters rows on unknown comparisons the same way. These
  operands are unreachable through the typed API (`OperatorFor` in task 2.1 allows
  relational only on `number | string`), so this only bites data that lies about its
  static type. Rejected throwing (breaks the locked error set) and coercion
  (contradicts the engine's type-sensitive stance). Flagged for human review.
- DECISION — `in` with a non-array pool evaluates FALSE, never throws: same locked
  error-set reasoning; the typed API pins the value to `readonly T[K][]` so a
  non-array pool is only reachable by lying to the type layer. An array-like object
  (`{ 0: 1, length: 1 }`) is also false — membership requires a real array.
- Delegation is tested, not assumed: the sweep re-proves type-sensitivity
  (`"1" not in [1,2,3]`), deep structural membership (object matched by structure,
  not reference), SameValueZero (`NaN in [NaN]`), and code-unit string order through
  the evaluateWhere entry point.
- Gate: typecheck OK, lint clean, 70 tests pass (was 41; +29) at 100% line +
  function coverage, build OK.
- Next: task 1.4 (aggregate computations: `count`, `sum`, `avg`, `min`, `max`).

### 2026-07-10 — 1.4 Aggregate computations: count, sum, avg, min, max (DONE)

- Tests first: `src/ops.test.ts`, 22 new tests across seven describe groups (count incl.
  degenerate values; sum incl. empty -> 0 pin and readonly input; avg; min/max incl.
  infinities; empty-set RangeError with exact messages; NaN/non-number poisoning); watched
  RED (`SyntaxError: Export named 'computeAggregate' not found in module 'src/ops.ts'`)
  before implementing.
- Built `computeAggregate(values, kind, key?)` plus the `AggregateKind` type in `src/ops.ts`
  (guarded core): count -> length, empty-set branch (sum -> 0, avg/min/max throw), then a
  non-number-to-NaN normalization pass and an exhaustive switch. ~30 lines.
- DECISION — interface takes extracted VALUES, not rows + key: the caller (query.ts, task
  3.8/3.10) extracts `row[key]` itself, which stays fully typed under `K extends keyof T`;
  a rows-based signature would force a `Record<string, unknown>` cast at every call site.
  Mirrors evaluateWhere receiving the extracted rowValue. The key parameter is carried only
  so the empty-set error can name it (DESIGN section 7). Overloads make `count` keyless and
  the numeric aggregates key-required at compile time.
- DECISION — empty-set RangeError message pinned EXACTLY as
  `Cannot compute avg("price") of an empty set` (kind and key interpolated): tests assert
  the full message, not a substring, so the message is now API surface. Rationale: DESIGN
  section 7 requires the message to name the aggregate and the key; pinning the exact shape
  prevents silent drift.
- DECISION — NaN and non-number values POISON numeric aggregates to NaN (never skip, never
  coerce, never throw): skipping is SQL-NULL-style normalization the engine performs nowhere
  else; raw JS coercion (`1 + null === 1`, `1 + "2" === "12"`) is silent garbage; throwing
  breaks the DESIGN section 7 locked error set. NaN is genuinely reachable through the typed
  API (NaN is a `number`), so this is not just a lying-data path. min/max need an explicit
  `some(Number.isNaN)` guard because `<` is always false on NaN and a plain reduce would
  skip it order-dependently; the guard matches Math.min/Math.max semantics. Flagged for
  human review.
- KNOWN LIMITATION (recorded): sum/avg use naive left-to-right IEEE-754 summation (no Kahan
  compensation) — float error on large or ill-conditioned inputs is accepted; a readable
  reduce beats a compensated loop for this engine's size budget.
- Gate: typecheck OK, lint clean, 92 tests pass (was 70; +22) at 100% line + function
  coverage, build OK.
- Next: task 2.1 (type machinery: `src/types.ts` + compile-time test harness).

### 2026-07-10 — 2.1 Type machinery and the compile-time test harness (DONE)

- Tests first: `src/type-tests.ts` populated with 20 positive `Expect<Equal<...>>` assertions
  (OperatorFor 9, WhereValue 5, KeysOfType 4, SortableKey 2) plus 17 `@ts-expect-error`
  negatives (relational on boolean/null/object/array/nullable 5, where-value mismatches 3,
  aggregate keys 4, sortable keys 5) via constraint-probe aliases; watched RED (`TS2307:
  Cannot find module './types'`, every positive `Type 'false' does not satisfy the constraint
  'true'`, every directive TS2578-unused) before implementing.
- Built `src/types.ts`: `OperatorFor<V>`, `WhereValue<V, Op>`, `KeysOfType<T, V>`,
  `SortableKey<T>`. Operator name unions are imported TYPE-ONLY from ops.ts (one source of
  truth with the runtime switch). Verified erased at runtime: `dist/types.js` is `export {};`
  and only `types.d.ts` carries declarations.
- DECISION — `Expect`/`Equal` live in type-tests.ts, NOT types.ts: they are test scaffolding,
  and types.ts ships in dist as a d.ts; keeping the harness in the build-excluded test file
  keeps the shipped surface product-only. All future type tests live in the same file, so
  locality is free.
- DECISION — `OperatorFor` is strict and non-distributive (`[V] extends [number | string]`):
  a `number | null` or optional number field gets only `==`/`!=`/`in` plus the predicate
  overload; a relational op on such a field would silently filter every null row. Matches the
  1.3 record ("non-orderable operands are unreachable through the typed API"). Flagged for
  human review: SQL-minded users may expect `where("rating", ">", 3)` on a nullable column.
- DECISION — `SortableKey` ALLOWS nullable orderable fields
  (`NonNullable<T[K]> extends number | string`): DESIGN section 7 pins "null/undefined sort
  LAST regardless of direction", which is reachable through the typed API only if nullable
  keys are sortable. A field that can ONLY be null/undefined is rejected via an explicit
  `[NonNullable<T[K]>] extends [never]` guard — never extends everything, so without the
  guard an always-null field would count as sortable (pinned by test `SortOnAlwaysNull`).
  The deliberate asymmetry with strict `OperatorFor` is recorded: sort has pinned null
  semantics, where-relational does not. Flagged for human review.
- DECISION — `KeysOfType` is exact-assignable (`[T[K]] extends [V]`, non-distributive):
  nullable/optional number fields are NOT aggregatable — computeAggregate poisons non-numbers
  to NaN (1.4), and a compile error beats silent NaN (DESIGN principle 5). The `& string`
  also strips the `undefined` optional properties leak into the mapped key union.
- Negative-test honesty probed, not assumed (0.1 precedent): temporarily loosening
  OperatorFor to the full operator set produced 11 typecheck errors (6 failed positives +
  5 unused directives); dropping the SortableKey never-guard produced 2. Restored, re-green.
  An unused `@ts-expect-error` is itself an error (TS2578), so negatives cannot silently rot.
- KNOWN LIMITATION (recorded): types.ts has no runtime code, so it never appears in the bun
  coverage table — its only gate is tsc over type-tests.ts. Coverage table unchanged
  (index.ts, ops.ts at 100%).
- Gate: typecheck OK, lint clean, 92 tests pass (unchanged — type-level task; its tests run
  in the typecheck step) at 100% line + function coverage, build OK (dist gains types.d.ts).
- Next: task 3.1 (`Query<T>` op-list skeleton: src/query.ts + src/index.ts).

### 2026-07-10 — 3.1 Query op-list skeleton: query(), execute(), explain() (DONE)

- Tests first: `src/query.test.ts` (10 new cases across four describe groups: new-array and
  original-row-reference proofs, fresh-array-per-call, result-mutation isolation, source
  immutability via structuredClone snapshot, frozen empty explain incl. push-throws, query
  independence), `src/index.test.ts` seed replaced with a public-surface end-to-end test,
  4 positive type-test cases + 1 `@ts-expect-error` negative; watched RED (`TS2307: Cannot
  find module './query'`, `Export named 'query' not found in module 'src/index.ts'`, positives
  `Type 'false' does not satisfy the constraint 'true'`) before implementing.
- Built `src/query.ts` (Query class holding source ref + frozen op list, execute() spreads the
  source into a new array of original row references, explain() returns the frozen list) and
  replaced the Phase 0 `src/index.ts` placeholder with the real surface (`query` value export,
  `Query`/`OpDescription` type-only exports). PACKAGE_NAME seed export is gone.
- DECISION — `OpDescription` starts as `never` (the empty union), not a `{ kind: string }`
  base shape: DESIGN section 7 promises a union DISCRIMINATED by `kind`, and an open
  `{ kind: string }` would let explain() typecheck against descriptions that never narrow.
  Each fluent task (3.2-3.10) adds its member; 3.2 must replace the `never`.
- DECISION — Query is a class whose constructor is NOT public surface: `src/index.ts`
  re-exports the class TYPE-ONLY, so consumers can name `Query<T>` but only query() constructs
  one. Extension mechanism for every later fluent method is `new Query(source, [...ops, op])`
  inside the module. Rejected an interface + closure factory (harder to grow nine methods on)
  and a public constructor (two entry points for one job).
- DECISION — the task's "branching proof" is DEFERRED to 3.2 and a precursor pinned instead:
  no extending fluent call exists at 3.1, and the 100% function-coverage gate itself forbids
  shipping an uncalled extension helper, so a genuine shared-prefix branching test is
  mechanically impossible this task. Pinned now: frozen op list (push throws), fresh array per
  execute, and two-queries-over-one-source independence. Task 3.2 MUST add the real proof
  (extend one prefix two ways, both stay independent) — recorded here so it cannot be missed.
- KNOWN LIMITATION (recorded): explain() returns the internal ops array itself (safe because
  frozen) — its object identity across calls is NOT pinned by tests, and 3.3's
  predicate-in-explain decision may force a mapped copy. Callers own nothing they can mutate
  either way.
- Gate: typecheck OK, lint clean, 102 tests pass (was 92; +10) at 100% line + function
  coverage (index.ts, ops.ts, query.ts all in the table), build OK (dist gains query.js/.d.ts).
- Next: task 3.2 (`where(key, op, value)` — typed operator filtering; includes the deferred
  branching proof).

### 2026-07-10 — 3.2 where(key, op, value): typed operator filtering (DONE)

- Tests first: `src/query.test.ts` 15 new cases across three describe groups (operator
  filtering incl. deep structural == on an array field, all four relationals, readonly `in`
  pool, original-reference and source-snapshot proofs; explain entries incl. JSON round-trip
  and frozen descriptions; the branching proofs deferred from 3.1), `src/index.test.ts`
  end-to-end test extended with a where chain, `src/type-tests.ts` gains 4 `Expect<Equal>`
  API positives, 7 positive call sites, 4 `@ts-expect-error` negatives; watched RED (`TS2339:
  Property 'where' does not exist on type 'Query<User>'`, bun: 16 fail) before implementing.
- Built `where()` on Query plus the first real pipeline: `OpDescription` union's `never`
  replaced by the `{ kind: "where", key, op, value }` member, module-level `applyOp` switch
  (exhaustive, no default — future kinds fail typecheck), `#extend` helper freezing both the
  new op list and the description object. Signature is
  `where<K extends keyof T & string, Op extends OperatorFor<T[K]>>(key: K, op: Op, value:
  WhereValue<T[K], Op>)` — Op captured as its own type parameter so the value type pivots on
  the operator literal (`in` -> `readonly T[K][]`, else `T[K]`).
- DECISION — descriptions store the key as a plain string and the value BY REFERENCE (no
  defensive copy, shallow freeze only): explain() must stay JSON-serializable, and deep
  copies/deep freezes are rejected by DESIGN section 8's no-deep-copy stance. Consequence:
  execute() re-reads the row field at the guarded-core boundary through one
  `row as Record<string, unknown>` cast — the honest place for it, since the typed key was
  verified at the where() call site and the description is deliberately stringly.
- DECISION — API-level type tests use `typeof productQuery.where<...>` instantiation
  expressions plus never-called call-site probe functions in type-tests.ts: the 2.1
  constraint probes check OperatorFor/WhereValue in isolation, but only call-site tests
  prove the METHOD is wired through them (a signature typed `op: WhereOperator` would pass
  every 2.1 probe). The `declare const` for typeof is exported because
  `@typescript-eslint/no-unused-vars` flags value bindings used only as types.
- Negative honesty probed, not assumed (0.1/2.1 precedent): re-ran the four negatives
  without directives in a scratch file — each fails at the intended parameter (unknown key
  rejected at key, `where("name", ">", 5)` at value `number` vs `string`, boolean relational
  at op `">"` vs `"==" | "!=" | "in"`, bare `in` value vs `readonly string[]`). Scratch
  removed before commit.
- KNOWN LIMITATION (recorded): a caller who mutates an object/array VALUE after passing it
  to where() changes the pipeline (descriptions hold references, freeze is shallow) —
  consistent with the engine-wide no-deep-copy semantics, to be documented in F.1 README.
- Gate: typecheck OK, lint clean, 117 tests pass (was 102; +15) at 100% line + function
  coverage, build OK.
- Next: task 3.3 (`where(predicate)` overload — typed escape hatch).

### 2026-07-10 — 3.3 where(predicate) overload: typed escape hatch (DONE)

- Tests first: `src/query.test.ts` 12 new cases across two describe groups (predicate
  filtering incl. original-reference, pipeline-position, arity-spy, no-match, source-snapshot
  and branching proofs; predicate explain incl. marker shape, no-function-leak, mixed-plan
  JSON round-trip, frozen plan), `src/index.test.ts` e2e extended with a predicate call,
  `src/type-tests.ts` gains 2 `Expect<Equal>` API positives, 3 call-site positives, 3
  `@ts-expect-error` negatives; watched RED (`TS2554: Expected 3 arguments, but got 1` at
  every predicate call site; bun: 10 fail) before implementing.
- Built the overload: `where(predicate)` declared after the keyed signature; the
  implementation signature is a rest-tuple union narrowed by `args.length` (no casts, no
  non-null assertions). The internal op list is now `PipelineOp<T>` — keyed ops are still
  their own frozen descriptions, a predicate op carries the actual function.
- DECISION — a predicate op appears in explain() as the frozen marker
  `{ kind: "where", predicate: true }`, and explain() returns a frozen MAPPED COPY of the
  internal op list (the mapped-copy possibility recorded at 3.1 is now fact): a function
  value on a description would be silently dropped by JSON.stringify, making the plan lie
  about its own length/shape. Rejected storing the function enumerably on the description
  (round-trip loses the op) and a non-enumerable function property (hidden state on a
  "plain" object). All predicate wheres share one module-level frozen marker. Explain()'s
  array identity across calls was never pinned (3.1 limitation), so no existing test changed
  meaning.
- DECISION — the predicate is invoked with the ROW ALONE (an explicit arrow shields
  Array.filter's index/array arguments): the public contract is `(row: T) => boolean`, and
  leaking filter's extra parameters would let arguments-sniffing JS callers depend on row
  position. Pinned by an arity-spy test.
- DECISION — overload order is keyed first, predicate LAST (matches the DESIGN section 6
  listing): the plain method type then resolves to the escape hatch under the
  Parameters/ReturnType last-overload rule, which is what lets type-tests pin the exact
  `(row: T) => boolean` shape without instantiation expressions.
- Negative honesty probed, not assumed (0.1/2.1/3.2 precedent): re-ran the three new
  negatives without directives — wrong return type fails TS2322 (string not boolean),
  unknown property fails TS2339 on Product, foreign row type fails TS2345 contravariantly
  at the argument. Directives restored, gate re-green.
- Gate: typecheck OK, lint clean, 129 tests pass (was 117; +12) at 100% line + function
  coverage, build OK.
- Next: task 3.4 (`limit(n)` + pipeline call-order pin).

### 2026-07-10 — 3.4 limit(n) + pipeline call-order pin (DONE)

- Tests first: `src/query.test.ts` 16 new cases across three describe groups (call-time
  validation incl. exact TypeError messages and receiver-untouched-after-throw; truncation
  semantics incl. limit(0) -> empty, original-reference proof, n beyond row count, the
  truncate-first vs filter-first discriminating pair, chained limits, source snapshot,
  branching; explain call order across a four-op mixed pipeline incl. JSON round-trip and
  frozen descriptions), `src/index.test.ts` e2e gains a limit call, `src/type-tests.ts`
  gains 2 `Expect<Equal>` API positives + 2 `@ts-expect-error` negatives; watched RED
  (`TS2339: Property 'limit' does not exist on type 'Query<User>'`; bun: 15 fail,
  `limit is not a function`) before implementing.
- Built `limit(n)` on Query: a call-time guard that throws BEFORE `#extend` (so a throwing
  call provably leaves the receiver untouched), the `{ kind: "limit", count }` member added
  to both `OpDescription` and `PipelineOp`, and a `rows.slice(0, op.count)` arm in the
  exhaustive applyOp switch. ~10 lines.
- DECISION — description field is `count`, not `n` (`{ kind: "limit", count: 3 }`): DESIGN
  pins only that descriptions are discriminated by `kind` and serializable; `count` is
  self-describing in a serialized plan where a bare `n` is not. Pinned by toEqual and
  JSON-round-trip tests, so the shape is now API surface.
- DECISION — TypeError message pinned EXACTLY as `limit(-1) requires a non-negative integer`
  (offending value interpolated, incl. `limit(NaN)`/`limit(Infinity)` via the same guard):
  follows the 1.4 precedent that runtime-error messages are API surface; tests assert the
  full message so drift is loud.
- DECISION — validation is the single guard `!Number.isInteger(n) || n < 0`:
  `Number.isInteger` rejects NaN, both infinities, and fractions in one coercion-free
  check. Consequence recorded: `limit(-0)` is accepted (an integer, not `< 0`) and behaves
  as `limit(0)` through slice — an IEEE-754 edge not worth a special case.
- Negative honesty probed, not assumed (0.1/2.1/3.2/3.3 precedent): both new negatives
  re-run without directives in a scratch file — `limit("3")` fails TS2345 (string not
  assignable to number), `limit()` fails TS2554 (expected 1 argument). Scratch removed
  before commit.
- Gate: typecheck OK, lint clean, 145 tests pass (was 129; +16) at 100% line + function
  coverage, build OK.
- Next: task 3.5 (`sort(key, direction?)` — single-key ordering).

### 2026-07-10 — 3.5 sort(key, direction?): stable single-key ordering (DONE)

- Tests first: `src/ops.test.ts` 13 new compareForSort cases across four describe groups
  (orderable order per direction incl. +0/-0 and code-unit strings; mixed number/string
  bucketing; nulls-last both directions; unorderable rank for NaN and type-lying values),
  `src/query.test.ts` 17 new cases across two describe groups (asc default, desc, stability,
  numeric-not-lexicographic, nulls/undefined last both directions, original-reference and
  source-snapshot proofs, sort-vs-limit call-order discriminating pair, branching; explain
  entries incl. explicit default direction, JSON round-trip, frozen plan), `src/index.test.ts`
  e2e gains a sort call, `src/type-tests.ts` gains 2 `Expect<Equal>` API positives, 4 positive
  call sites, 6 `@ts-expect-error` negatives; watched RED (`TS2305: no exported member
  'compareForSort'`, `TS2339: Property 'sort' does not exist on type 'Query<Track>'`; bun:
  19 fail + 1 error) before implementing.
- Built `compareForSort(a, b, direction)` + `SortDirection` in `src/ops.ts` (guarded core —
  DESIGN section 5 names compare() there) and `sort(key: SortableKey<T>, direction = "asc")`
  on Query with the `{ kind: "sort", key, direction }` description and a copy-then-sort
  applyOp arm (`[...rows].sort(...)`; rows and source never mutated).
- DECISION — sort order is a total preorder in three ranks that NEVER flip with direction:
  (0) orderable values, (1) present-but-unorderable values (NaN and type-lying booleans/
  objects/arrays), (2) null/undefined. DESIGN pins only nulls-last; NaN is reachable through
  the typed API (NaN is a number), and a partial comparator (NaN comparisons false, as in
  compareRelational) would hand Array.sort an intransitive comparator and produce
  implementation-defined orders. Rank 1 sits BEFORE rank 2 so "null/undefined sort LAST" stays
  literally true. Same-rank unorderables compare 0 — the stable sort keeps their pipeline
  order. Rejected throwing on NaN (breaks the DESIGN section 7 locked error set) and grouping
  NaN with nulls (a present number should not interleave with genuinely missing values).
  Flagged for human review.
- DECISION — mixed number/string values (reachable via a `number | string` union field,
  which SortableKey allows) bucket numbers BEFORE strings, and the bucket flips with desc
  like any orderable comparison: desc is the EXACT reverse of asc among orderable values,
  computed by swapping operands rather than negating (negation turns 0 into -0, which
  Object.is-based test matchers reject). compareRelational's "mixed operands are unordered"
  convention cannot serve a comparator that must be total. Flagged for human review.
- DECISION — the description records the RESOLVED direction (`direction: "asc"` even when
  the argument was omitted): a serialized plan should not require knowledge of the API
  default to be read back. Follows the 3.4 precedent that description shapes are API surface
  (pinned by toEqual + JSON round-trip tests).
- DECISION — stability is delegated to the native `Array.prototype.sort` (ES2019 requires it;
  Bun/JSC complies) and PINNED by tests on duplicate keys in both directions, rather than
  implementing a decorated (index-tagged) sort. A hand-rolled stability layer would duplicate
  what the runtime guarantees, against the size budget.
- Chained-sort behavior is NOT pinned this task: with independent per-op stable sorts, a
  chained `.sort(a).sort(b)` currently makes the LAST call primary, which contradicts the
  DESIGN "FIRST call is primary" pin — that composition is exactly task 3.6, so no test
  locks the interim behavior in.
- Negative honesty probed, not assumed (0.1/2.1/3.2/3.3/3.4 precedent): all six new
  negatives re-run without directives in a scratch file — five key rejections fail TS2345 at
  the key argument via SortableKey, the direction rejection fails TS2345 at the direction
  argument (`"descending"` not assignable to `SortDirection | undefined`). Scratch was
  outside the repo (/tmp) and truncated; `rm` is blocked by loop containment.
- Gate: typecheck OK, lint clean, 176 tests pass (was 145; +31) at 100% line + function
  coverage, build OK.
- Next: task 3.6 (chained `.sort()` tie-breakers — FIRST call primary).

### 2026-07-10 — 3.6 Chained .sort() tie-breakers: FIRST call primary (DONE)

- Tests first: `src/query.test.ts` 11 new cases across two describe groups (two-key,
  mixed-direction and three-key composition on a new Player fixture with ties at every level;
  full-tie stability; per-level nulls-last; null-tied primary falling through to the
  tie-breaker; intervening where and limit ending the chain; source-snapshot; branching;
  explain shows one description per call); watched RED (7 of 11 fail — chained sorts made
  the LAST call primary, exactly the 3.5-recorded gap) before implementing.
- Built interpretation-time composition in `src/query.ts`: `groupSortRuns` folds each maximal
  run of CONSECUTIVE sort ops into one step, `applySortRun` sorts once with a comparator that
  walks the run's keys in call order (each key keeps its own direction and nulls-last rank via
  `compareForSort`; all-key ties return 0 so the stable native sort keeps pipeline order).
  `applyOp` now takes `Exclude<PipelineOp<T>, SortDescription>` — no dead sort arm survives,
  so 100% coverage stays honest. `src/ops.ts` unchanged.
- DECISION — composition happens at EXECUTE time by grouping consecutive ops, not at call
  time by merging descriptions: DESIGN section 7 pins explain() to one serializable
  description per fluent call in call order, so the op list cannot merge; a composed
  comparator gives first-call-primary directly and sorts each run once. Rejected the
  reverse-order trick (apply stable sorts last-to-first) — it sorts N times and its
  correctness rides non-obviously on stability; rejected merging in #extend — explain()
  would lie about the call count. Pinned by the explain test: composition is invisible in
  the plan.
- DECISION — the comparator loop lives in query.ts, NOT ops.ts: compareForSort (single-value
  ordering semantics) stays the guarded core; walking op descriptions is pipeline
  interpretation, and ops.ts receives extracted values by convention (1.4/3.2 precedent) —
  it never sees keys or op lists.
- DECISION — a NON-SORT op between two sorts ENDS the run: `sort(a).where(p).sort(b)` sorts
  by a at its position, filters, then sorts by b alone — b is primary and a's order survives
  only through stability. Rationale: DESIGN section 7 pins pipeline ops to CALL order with no
  hidden reordering, and an intervening op can OBSERVE the first ordering (a limit between
  two sorts truncates the FIRST ordering — pinned by test), so the first sort must
  materialize at its own position; composing across the gap would change what limit sees.
  Reading of the DESIGN sort row: chained (adjacent) calls are one ORDER BY clause; a sort
  after other ops is a new ORDER BY over a subquery. Flagged for human review.
- Ties on a null primary key fall through to the tie-breaker (undefined and null both rank 2,
  compare 0, next key decides) — pinned by test; pipeline order holds only when EVERY chained
  key ties.
- Gate: typecheck OK, lint clean, 187 tests pass (was 176; +11) at 100% line + function
  coverage, build OK. No new type tests: 3.6 adds no API surface (sort signature unchanged).
- Next: task 3.7 (`select(...keys)` — projection).

### 2026-07-10 — 3.7 select(...keys): projection (DONE)

- Tests first: `src/query.test.ts` 16 new cases across two describe groups (projection incl.
  new-object and field-reference-copy proofs, duplicate key, zero-key, absent-vs-explicitly-
  undefined named keys, filter-before/after-select pipeline positions, predicate key
  visibility after projection, mixed sort/limit pipeline, source snapshot, branching; explain
  entries incl. verbatim duplicate keys, JSON round-trip, frozen keys array), `src/index.test.ts`
  e2e gains a select call (rows gain a second field so projection is observable),
  `src/type-tests.ts` gains 2 `Expect<Equal>` API positives (select -> `Query<Pick<T, K>>`,
  execute -> `Pick<T, K>[]`), 4 positive call sites, 4 `@ts-expect-error` negatives, and a
  zero-key inference pin; watched RED (`TS2339: Property 'select' does not exist on type
  'Query<User>'`; bun: 17 fail) before implementing.
- Built `select()` on Query plus the `{ kind: "select", keys }` member in
  `OpDescription`/`PipelineOp` and a projection arm in the exhaustive applyOp switch. select
  is the one fluent call that CHANGES the row type: it returns `Query<Pick<T, K>>` through a
  single `as unknown` re-branding cast (Query is invariant in T — the stored predicate member
  is contravariant), with the soundness argument in a code comment: ops interpret
  positionally, so every op recorded before the select still runs against the wider
  pre-projection rows. `src/ops.ts` unchanged (projection is pipeline interpretation, not
  value semantics — 3.6 precedent).
- DECISION — `K` carries the type-parameter default `= never`: the RED run for zero-key
  `select()` showed TS falls back to the CONSTRAINT (`keyof T & string`) when rest-param
  inference has no candidates, so without a default the type claims EVERY key survives while
  the runtime projects to empty objects — a type-layer lie. With `= never` the degenerate
  call types as `Query<Pick<T, never>>` (empty-object rows), matching the runtime exactly;
  calls with arguments infer from them as before. Zero-key select stays LEGAL and yields
  empty objects — rejecting it at runtime would break the DESIGN section 7 locked error set,
  and narrowing the pinned `(...keys: K[])` signature to require one key would deviate from
  DESIGN section 6. Flagged for human review.
- DECISION — projection copies PRESENCE, not schema: a named key ABSENT from a row stays
  absent from its projection (`Object.hasOwn` guard), while a key explicitly set to undefined
  stays an own key. Reading of the DESIGN "exactly the named keys" pin: it bounds the MAXIMUM
  key set (nothing else leaks through), it does not materialize missing keys. Rationale: 1.1
  pinned `{a: undefined}` != `{}` as structurally distinct, so a projection that invents an
  own key the row never had would erase a distinction the engine's own equality treats as
  significant — and a materialized `key: undefined` is not even JSON-representable. Field
  values copy BY REFERENCE (no deep copy — engine-wide stance, README duty noted at 3.2).
  Flagged for human review (the DESIGN sentence can be read either way).
- DECISION — description keys are recorded VERBATIM (duplicates included) and deep-frozen:
  explain() reflects the calls actually made, so `select("id", "id")` shows
  `keys: ["id", "id"]` while the projected object naturally carries the key once. The keys
  array is engine-created (a rest argument is always a fresh array), so freezing it in place
  costs nothing and keeps the plan tamper-proof — unlike caller-owned where values, which
  stay shallow-frozen by reference (3.2).
- Negative honesty probed, not assumed (0.1-3.5 precedent): the four new negatives re-run
  without directives in a /tmp scratch — the unknown key fails TS2345 at the key argument,
  and where/sort/select on a selected-away key each fail TS2345 with the narrowed key union
  (`"name" | "id"`, `"id"`). Scratch left outside the repo.
- Gate: typecheck OK, lint clean, 203 tests pass (was 187; +16) at 100% line + function
  coverage, build OK.
- Next: task 3.8 (ungrouped aggregates count/sum/avg/min/max on Query<T>).

### 2026-07-10 — 3.8 Ungrouped aggregates: count/sum/avg/min/max on Query<T> (DONE)

- Tests first: `src/query.test.ts` 16 new cases across two describe groups (pipeline-then-
  reduce incl. limit-before-where call-order proof, sum/avg/min/max normal cases, aggregates
  over projected rows, NaN poisoning reachable through the typed API, source-snapshot proof,
  terminal-read proof — five aggregate calls leave the receiver's plan and execute() intact;
  empty-set semantics through the pipeline incl. exact RangeError messages on two DIFFERENT
  keys and limit(0) as the emptier), `src/index.test.ts` e2e gains count and sum through the
  public surface, `src/type-tests.ts` gains 10 `Expect<Equal>` API positives (count keyless,
  four numeric aggregates locked to `[key: "id" | "price"]`, all returning number), 7 positive
  call sites, 6 `@ts-expect-error` negatives; watched RED (`TS2339: Property 'count' does not
  exist on type 'Query<Track>'` at every call site; bun: 17 fail) before implementing.
- Built five terminal methods on Query plus a private `#aggregate(kind, key)` helper:
  count() feeds whole pipeline rows to `computeAggregate(rows, "count")`; the numeric four
  extract `row[key]` per row (one `row as Record<string, unknown>` cast at the guarded-core
  boundary, 3.2 precedent) and delegate to `computeAggregate(values, kind, key)`. No op kind
  added — `OpDescription`, `PipelineOp`, and applyOp are untouched. ~35 lines.
- DECISION — aggregates are TERMINAL READS, not recorded ops: DESIGN section 6 types them
  `(): number`, so they cannot return Query and be part of a plan; they call execute()
  internally and the receiver stays reusable (pinned by test: five aggregate calls, then
  explain() and execute() unchanged). Consequence: an aggregate never appears in explain() —
  the plan describes the pipeline, and the reduction happens after it. Rejected recording a
  pseudo-op for explain visibility (an op that cannot be in an op LIST the fluent chain can
  extend past would be a lie about the pipeline shape).
- DECISION — empty-set RangeError propagates RAW from the guarded core (no catch/rewrap in
  query.ts): the 1.4 message already names the aggregate and the key exactly as DESIGN
  section 7 requires, and wrapping would either change the pinned message or add a second
  error type to the locked runtime-error set. Pinned through the pipeline with two different
  keys so the interpolation (not a fixed string) is what the tests prove.
- DECISION — delegation direction confirmed: extraction lives in query.ts (`#aggregate`),
  semantics in ops.ts — the 1.4-recorded interface (ops receives extracted VALUES) held with
  zero changes to ops.ts this task, which is the payoff of deciding it there. NaN poisoning
  and count-of-anything came through the surface for free (pinned by the NaN test).
- KNOWN LIMITATION (recorded): each aggregate call re-runs the FULL pipeline (count() then
  sum() executes twice) — consistent with execute() itself returning fresh runs; callers
  wanting both should execute() once and reduce themselves, or wait for grouped aggregate(),
  which computes a whole spec in one run (3.10). Acceptable: O(n) per op is documented and
  DESIGN section 8 rejects optimization.
- Gate: typecheck OK, lint clean, 219 tests pass (was 203; +16) at 100% line + function
  coverage, build OK.
- Next: task 3.9 (`groupBy(key)` -> `GroupedQuery<T, K>` and its execute()).

### 2026-07-10 — 3.9 groupBy(key) -> GroupedQuery and its execute() (DONE)

- Tests first: `src/query.test.ts` 15 new cases across two describe groups (Map grouping incl.
  first-seen key order, within-group pipeline order with original-reference proof, where-first
  and sort-first pipeline proofs, select composition, empty pipeline, fresh-Map-and-fresh-
  group-arrays per call with mutation isolation, source snapshot, receiver-untouched, branching
  two groupBys off one prefix; SameValueZero specifics — NaN one group, +0/-0 collide,
  null vs undefined DISTINCT groups via the Track rating fixture, object keys group by
  REFERENCE), `src/index.test.ts` e2e gains a groupBy through the public surface,
  `src/type-tests.ts` gains 6 `Expect<Equal>` API positives (groupBy -> `GroupedQuery<T, K>`,
  full groupable-key union, execute -> `Map<T[K], T[]>` for string/nullable/object keys,
  projected row type preserved through grouping), 6 positive call sites, 2 `@ts-expect-error`
  negatives; watched RED (`TS2339: Property 'groupBy' does not exist on type 'Query<Track>'`
  at every call site; bun: 16 fail) before implementing.
- Built `groupBy(key)` on Query and the `GroupedQuery<T, K extends keyof T>` class in
  `src/query.ts` (module-internal constructor, exported TYPE-ONLY from index.ts like Query):
  execute() runs the base pipeline via `Query.execute()`, then partitions rows into a native
  `Map<T[K], T[]>` in one pass. `src/ops.ts` untouched — grouping is pipeline interpretation
  plus native Map key semantics, no new value semantics (3.6/3.7 precedent). ~20 lines.
- DECISION — groupBy is a STAGE CHANGE, not a recorded op: DESIGN section 6 gives
  GroupedQuery only execute() and aggregate() (no explain), so a groupBy can never appear in
  a plan the fluent chain extends past; the receiver Query keeps its op list untouched and
  stays reusable (pinned by test: after `q.groupBy(...)`, q's explain() and execute() are
  unchanged, and two groupBys branch independently off one prefix). GroupedQuery therefore
  holds the base Query BY REFERENCE (safe: queries are immutable) instead of copying ops.
  Rejected recording a `{ kind: "groupBy" }` op inside Query — execute() would need a
  row-type-breaking arm for an op that can only ever be last.
- DECISION — SameValueZero comes from the native Map, not from code: `groups.get/set` on the
  raw `row[key]` value IS the DESIGN section 7 pin (NaN forms one group, +0/-0 collide),
  so tests pin the semantics without any comparison code existing. Consequences pinned by
  test: `null` and `undefined` keys are DISTINCT groups (deliberately unlike sort, where both
  share the nulls-last rank — grouping distinguishes values, ordering ranks them); object key
  values group by reference, with the documented-limitation code comment on GroupedQuery
  (README duty stays with F.1).
- DECISION — no key-type constraint on groupBy (`K extends keyof T & string`, any field):
  DESIGN section 6 constrains sort (SortableKey) and aggregates (KeysOfType) but pointedly
  not groupBy, and SameValueZero is total over all values, so boolean/object/array keys group
  fine. The type layer still narrows the key union after select (pinned negative).
- KNOWN LIMITATION (recorded): `row[this.#key]` types as `T[K]` directly (no boundary cast
  needed — the first keyed read in the engine that stays fully typed), but for a projected
  row a named key ABSENT from the row (3.7 presence semantics) reads as `undefined` and
  groups under the `undefined` key even though `T[K]` may not include undefined. Consistent
  with grouping the raw value; only bites optional-key projections.
- Gate: typecheck OK, lint clean, 234 tests pass (was 219; +15) at 100% line + function
  coverage, build OK.
- Next: task 3.10 (`agg` namespace + `GroupedQuery.aggregate(spec)`).

### 2026-07-10 — 3.10 agg namespace + GroupedQuery.aggregate(spec) (DONE)

- Tests first: `src/query.test.ts` 18 new cases across two describe groups (agg constructors —
  descriptor shapes, frozen namespace/descriptors, JSON-serializable; grouped aggregate — full
  five-kind spec with exact rows, first-seen row order incl. a sort-shaped variant, ops-before-
  groupBy proof, empty pipeline -> [], empty spec -> key-only rows, null/undefined group-key
  rows via toStrictEqual, NaN poisoning through a group, terminal-read/fresh-rows/receiver-
  reusable, base-query-untouched, source snapshot, spec-object and descriptor reuse, `key`-named
  spec collision, select composition, JSON round-trip of result rows), `src/index.test.ts` e2e
  gains a groupBy().aggregate() through the public surface, `src/type-tests.ts` gains 6
  `Expect<Equal>` positives (constructor return shapes; flat named-number result rows; exact
  group-key value type; `key`-collision typing), 4 positive call sites, 7 `@ts-expect-error`
  negatives; watched RED (`TS2305: Module '"./index"' has no exported member 'agg'`, `TS2339:
  Property 'aggregate' does not exist on type 'GroupedQuery<...>'`; bun: 2 fail + 2 module-load
  errors) before implementing.
- Built the `agg` frozen namespace + `numericSpec` helper in `src/query.ts`,
  `GroupedQuery.aggregate(spec)` iterating the grouped Map (first-seen order for free), and the
  descriptor/spec/result type machinery in `src/types.ts` (`AggCount`, `AggNumeric`,
  `AggSpecEntry<T>`, `AggSpec<T>`, `AggResult<S>`, `AggRow<KeyValue, S>`), all exported from
  `src/index.ts`. `src/ops.ts` untouched — computeAggregate (1.4) already carries the semantics;
  aggregate() extracts values per group at the same stringly boundary as where()/ungrouped
  aggregates.
- DECISION — spec keys are validated at the aggregate(spec) call site, NOT in the constructors:
  the DESIGN section 6 sketch `agg.sum<T>(key: KeysOfType<T, number>)` cannot infer T from a
  bare key argument (T appears only inside a mapped type), so taken literally every constructor
  call would need an explicit type argument (`agg.sum<Product>("price")`) — unusable as the
  primary form. Constructors are `<K extends string>(key: K)` capturing the key literal, and
  the `S extends AggSpec<T>` constraint rejects invalid keys exactly where a row type exists;
  the probe run shows the error still names the key and `KeysOfType<Product, number>`. The
  constraint the sketch expresses is fully enforced, just at the spec-meets-rows site. Flagged
  for human review (deviation from the DESIGN sketch's literal signature shape).
- DECISION — result rows are typed by a flat mapped type `AggRow<T[K], S>`, not the literal
  `{ key: T[K] } & AggResult<S>` intersection: the two are structurally identical for every
  non-degenerate spec, but the identity-based `Equal` in type-tests distinguishes intersections
  from flat shapes (so the ACCEPTANCE "inferred named numbers asserted with Expect<Equal>"
  needs the flat form), and hovers read as one named object. AggResult<S> stays exported and
  feeds AggRow, keeping the DESIGN names on the surface.
- DECISION — a spec name of `key` WINS the key slot, in both type and runtime: the DESIGN
  contract `{ key } & AggResult<S>` is degenerate for that one name (the intersection would be
  `T[K] & number`, a type no runtime value can honestly satisfy). Rejected forbidding the name
  via a `{ key?: never }` constraint intersection (it breaks index-signature assignability and
  yields opaque errors); chose spec-wins because runtime insertion order (key written first,
  spec columns after) then matches the AggRow conditional exactly — the type never lies. Pinned
  by a runtime test and an Expect<Equal> (`{ key: number }[]`). Flagged for human review (a
  caller shadowing `key` silently loses the group-key column — their explicit spec choice).
- DECISION — descriptors and the agg namespace are frozen; agg.count() returns one shared
  frozen constant (PREDICATE_DESCRIPTION precedent): descriptors are engine-created plain data
  (3.7 keys-array precedent), so freezing costs nothing and keeps specs tamper-proof.
- KNOWN LIMITATION (recorded): the spec CONTAINER is caller-owned and re-read on every
  aggregate() call — swapping a descriptor on a mutable spec object between calls changes
  results (the descriptors themselves are frozen). Consistent with where() holding values by
  reference. Also: aggregate() re-runs the full pipeline per call (3.8 precedent, documented
  O(n) stance).
- Gate: typecheck OK, lint clean, 252 tests pass (was 234; +18) at 100% line + function
  coverage, build OK.
- Next: task 4.1 (reconciliation sweep: every ACCEPTANCE bullet and DESIGN section 7 pin
  against the actual suite).

### 2026-07-10 — 4.1 Reconciliation sweep: ACCEPTANCE and DESIGN section 7 vs the suite (DONE)

- Verification-only iteration: walked every ACCEPTANCE.md functional and type-level bullet and
  every DESIGN section 7 pin against the actual suite. Nothing testable changed and NO test was
  added — every bullet already maps to at least one existing test, so adding more would be
  redundancy, not coverage. Anchors (test file : describe/site), so a later iteration can
  re-verify without re-deriving:
  - Immutability/branching -> query.test.ts skeleton + snapshot groups (18-97, 437-459) plus a
    per-op source-snapshot and branching test in every 3.x group.
  - Operator semantics -> ops.test.ts (deepEqual/compareRelational/evaluateWhere sweeps) plus
    the per-operator surface tests in query.test.ts 99-174; NaN-false and type-sensitivity
    pinned at both layers.
  - Predicate overload -> query.test.ts 199-309; exact (row: T) => boolean shape in
    WherePredicateApiCases.
  - Sort (stable, tie-breakers first-call primary, nulls last both directions) ->
    query.test.ts 486-693 + compareForSort groups in ops.test.ts.
  - limit (call-time TypeError, limit(0), pipeline position) -> query.test.ts 311-435.
  - Call order + explain serializability -> the discriminating pairs (355, 543, 837) and the
    JSON round-trip test in every explain group.
  - select / groupBy / aggregate / ungrouped aggregates / empty-set RangeError ->
    query.test.ts 695-1200 and 828-923; SameValueZero specifics 1008-1045.
  - Type-level positives all Expect<Equal>-asserted (WhereApiCases, SelectApiCases,
    GroupByApiCases, AggApiCases, AggregateApiCases, QuerySkeletonCases); ALL SIX ACCEPTANCE
    negatives are explicit @ts-expect-error sites: unknown key (type-tests.ts 132), relational
    on boolean/null/object (54-59 probes + 136 API), where("name", ">", 5) verbatim (134),
    non-number aggregate keys (289-300), non-sortable sort keys (208-219), selected-away
    where (244).
- Mechanical criteria re-verified: `dependencies` is `{}`; no TODO/FIXME/stub/placeholder
  markers anywhere in src/ (grep); the Phase 0 PACKAGE_NAME placeholder is fully replaced by
  the real surface in index.ts; the coverage table lists EVERY runtime src file (index.ts,
  ops.ts, query.ts at 100% funcs+lines — the 0.1 known limitation re-checked, no file escapes;
  types.ts is runtime-erased, recorded at 2.1); dist/ ships exactly the four modules with
  .d.ts, no type-tests and no test files.
- MEASUREMENT + DECISION — size budget read as CODE lines, and it holds: runtime source is
  396 non-blank non-comment lines (index 3, ops 122, query 243, types 28) against the DESIGN
  section 3 "~400-600 source lines" budget; raw line count is 685 because 289 lines are the
  comment documentation. Rationale: the budget's own gloss is "comprehension time is the real
  metric; no code-golf", and stripping decision-record comments to satisfy a raw-line reading
  would optimize the number by damaging the metric. Flagged for human review (the budget is
  ambiguous between raw and code lines; raw exceeds the band).
- Gate: typecheck OK, lint clean, 252 tests pass (unchanged — verification-only) at 100%
  line + function coverage, build OK.
- Next: task F.1 (README.md usage docs + docs/ARCHITECTURE.md tour; every example executed
  before transcription).

### 2026-07-10 — F.1 README usage docs + ARCHITECTURE guided tour (DONE)

- Measured first (the docs analogue of tests-first): every README example was written into a
  /tmp scratch runner (14 sections covering where operator/predicate, sort tie-breakers and
  nulls-last, limit call-order pair, select, groupBy execute, aggregate spec, all five
  ungrouped aggregates, empty-set RangeError, limit TypeError, explain JSON, branching,
  result-reference identity, groupBy object-key reference), EXECUTED with bun, and ALSO
  typechecked with the repo tsc flags (strict, noUncheckedIndexedAccess, verbatimModuleSyntax)
  before transcription. Comments in the README are the captured output verbatim (e.g.
  avg("age") 32.2, tie-break order Alan(41) before Ada(36), groupBy size 2-not-1). Scratch
  stayed outside the repo (3.5 precedent).
- Rewrote README.md (spec-time stub -> full usage doc): quick start, the six ACCEPTANCE
  non-compiling examples, operator table, every fluent call and terminal, the two runtime
  errors, explain plan, and a dedicated no-deep-copy section (result rows are original
  references; select copies field values by reference; where holds values by reference) plus
  the groupBy reference-key limitation — the two doc duties recorded at 3.2/3.7/3.9.
  Populated docs/ARCHITECTURE.md from the template stub: module map with trust levels,
  life-of-a-query flow, the ops.ts extracted-values boundary convention, type-layer summary,
  seven test-enforced invariants, suggested reading order, ASCII diagram.
- DECISION — README examples import `from "jsonq"` (the package.json name) while the status
  banner states plainly that the package is source-only until the human post-M1 publish
  decision: showing the real consumer form beats a relative-path import that would go stale
  the moment publishing lands, and the banner keeps it honest. Flagged for human review
  (publish decision may also want the banner reworded).
- DECISION — the six negative examples in the README mirror the ACCEPTANCE type-level bullet
  list one-to-one and say so: the README's compile-error claim is thereby anchored to
  gate-enforced @ts-expect-error tests instead of prose promises.
- KNOWN LIMITATION (recorded): README outputs are transcribed, not machine-extracted — a
  future semantic change can silently stale them; the scratch runner is not kept in the repo
  (gate lint would scan it, and a committed runner would need its own maintenance). Accepted:
  examples are re-runnable by hand from the README as written.
- Gate: typecheck OK, lint clean, 252 tests pass (unchanged — docs-only) at 100% line +
  function coverage, build OK.
- Next: task F.2 (fresh-context judge pass over src/ for the readable-in-one-sitting bar).

### 2026-07-10 — F.2 Fresh-context judge pass over src/ (DONE)

- Judge run first (the verification analogue of tests-first): dispatched the fresh-context
  judge agent (.claude/agents/judge.md) over the four shipped modules ONLY (index.ts,
  types.ts, ops.ts, query.ts; tests and docs explicitly excluded — the criterion is whether
  the shipped source stands alone). The judge's reconstruction section proved a genuine cold
  read: it independently re-derived the op-list mechanism, sort-run composition,
  stage-change groupBy, terminal aggregates, the two-error runtime surface, and every
  non-error hazard (NaN poisoning, relational-null filtering vs nulls-last, reference-keyed
  groups, shallow immutability) from source alone.
- VERDICT — PASS WITH NOTES: zero HIGH, one MEDIUM, five LOW. No stubs or dead code found;
  all exported ops.ts helpers confirmed consumed by query.ts.
- MEDIUM (applied) — query.ts #extend comment overclaimed that a description handed out by
  explain() "cannot be edited to alter the pipeline" and deferred the truth to a non-shipped
  PROGRESS note: freeze is shallow and keyed where descriptions hold values by REFERENCE, so
  mutating an `in` pool array obtained from explain() genuinely changes later execute()
  results (the 3.2 known limitation). Comment rewritten to state the caveat inline; the
  PROGRESS pointer removed. Prose contradicting code in shipped source is exactly what the
  judge exists to catch.
- LOW (applied, 3) — stale build-process narration removed from shipped comments: query.ts
  header "methods land one per task (3.2-3.10)" rewritten as a plain statement; the "1.4
  convention" numeral dropped from the #aggregate comment (the convention itself was already
  stated); ops.ts compareForSort comment fixed twice — the misleading "-0" parenthetical
  dropped (comparators treat -0 as 0; the real historical concern was Object.is-based test
  matchers, a build detail irrelevant to readers) and "numbers before strings" qualified
  with "in asc (reversed in desc)" so the bucketing claim is no longer unconditional.
- LOW (declined, with reason) — removing/reducing the pervasive "DESIGN section N"
  citations: they are this project's deliberate decision-record idiom, ARCHITECTURE.md ships
  the map to them, and the judge itself confirmed every rule is restated inline (the MEDIUM
  was the single case where a citation was the sole carrier — now fixed). Removing them
  would trade provenance for nothing.
- All changes are comment-only: no runtime behavior, type, or test changed; no test was
  added or weakened (nothing testable moved).
- Gate: typecheck OK, lint clean, 252 tests pass (unchanged — comment-only) at 100% line +
  function coverage, build OK.
- Next: task F.3 (final close-out: verify every ACCEPTANCE checkbox, update DESIGN section
  10 / HANDOFF, create .loop/COMPLETE, print the sentinel).
