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
