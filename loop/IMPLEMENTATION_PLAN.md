# Implementation Plan — M1 (full v1 scope)

> Live task list for the build loop. The loop reads this, works the top unchecked task, ticks it
> off, appends to `loop/PROGRESS.md`. This plan is **DISPOSABLE** — regenerate from
> `docs/DESIGN.md` via planning mode if it goes stale.
> Acceptance: [`loop/ACCEPTANCE.md`](./ACCEPTANCE.md). Design: [`docs/DESIGN.md`](../docs/DESIGN.md).

M1 is the whole v1 surface: the toolchain gate, the guarded runtime core (`src/ops.ts`), the
compile-time type machinery (`src/types.ts` + `src/type-tests.ts`), the fluent builder
(`src/query.ts`, `src/index.ts`), and docs/judge close-out — per DESIGN sections 5–7 and every
criterion in ACCEPTANCE.md. Build order is bottom-up: gate first (nothing commits without it),
then the pure functions of the guarded core (easiest to TDD, and where wrong answers are born),
then the type machinery, then the fluent surface that composes both, then an acceptance sweep
and close-out. Every task: failing test first, one commit, `./loop/scripts/gate.sh` green.

## Phase 0 — toolchain and gate

- [x] 0.1 Scaffold the Bun + TypeScript toolchain so the gate runs green end to end.
      Build: `package.json` (scripts exactly per `docs/TOOLCHAIN.md`; devDependencies only:
      typescript, eslint, typescript-eslint; `dependencies` stays empty), `tsconfig.json`
      (strict, `noUncheckedIndexedAccess`, covers all of `src/`), `tsconfig.build.json`
      (emits `dist/` with `.d.ts`; excludes `src/type-tests.ts` and `src/**/*.test.ts`),
      `bunfig.toml` (100% line + function coverage threshold), ESLint 9 flat config (no `any`
      in `src/`). Seed a minimal `src/index.ts` placeholder export with one test and an empty
      `src/type-tests.ts` so all four gate steps pass. Test: `./loop/scripts/gate.sh` exits 0.
      Record any deviation from `docs/TOOLCHAIN.md` in that file. (TOOLCHAIN.md itself is
      already written — do not rewrite it, only note deviations.) (DESIGN §3 toolchain locks)

## Phase 1 — guarded core: `src/ops.ts` (DESIGN §5 trust boundary)

Pure functions, no builder yet. Strictest tests; every semantic decision recorded in PROGRESS.

- [x] 1.1 `deepEqual(a, b)` — deep structural, type-sensitive equality.
      Test first: primitives type-sensitive (`1` vs `"1"` unequal), `null` vs `undefined` vs `0`
      all distinct, objects structural with key order irrelevant, nested objects, arrays
      element-wise and order-sensitive, mixed nesting, empty object/array cases.
      DECISION to pin in PROGRESS: NaN-equality stance (JSON has no NaN, but runtime numbers
      can be — pick a behavior and record why). (DESIGN §6 operator table, `==`/`!=` row)
- [x] 1.2 Relational comparison for `<`, `<=`, `>`, `>=` on `number | string`.
      Test first: JS relational semantics for numbers and strings; every comparison involving
      NaN is `false`; mixed-direction cases. DECISION to pin: string comparison is plain JS
      code-unit order (no locale) — record it. (DESIGN §6 operator table, relational row)
- [x] 1.3 `evaluateWhere(rowValue, op, value)` — one entry point for all 7 operators.
      Test first: table-driven cases per DESIGN §6 — `==`/`!=` via deepEqual, relational via
      1.2, `in` membership via deepEqual over a readonly array. (DESIGN §6 complete operator set)
- [x] 1.4 Aggregate computations: `count`, `sum`, `avg`, `min`, `max` over rows + numeric key.
      Test first: normal cases; empty-set pins — `count` -> 0, `sum` -> 0, `avg`/`min`/`max`
      throw `RangeError` whose MESSAGE names the aggregate and the key (assert the message).
      (DESIGN §7 empty-set aggregates row)

## Phase 2 — type machinery: `src/types.ts` + type-test harness

- [x] 2.1 Type machinery and the compile-time test harness.
      Build: `Expect<Equal<...>>` helper; `OperatorFor<V>` (relational only on
      `number | string`); the op-dependent where-value type (`in` -> `readonly V[]`, all other
      ops -> `V`); `KeysOfType<T, V>`; `SortableKey<T>`. Test: seed `src/type-tests.ts` with
      positive cases plus `@ts-expect-error` negatives for the operator table (relational op on
      boolean/null/object field must not compile). `tsc --noEmit` in the gate is the test
      runner; `types.ts` is erased at runtime and never imported by tests at runtime.
      (DESIGN §5 types.ts, §6 OperatorFor, §9 type-level tests)

## Phase 3 — fluent builder: `src/query.ts` + `src/index.ts`

- [x] 3.1 `Query<T>` op-list skeleton: `query(source)`, frozen op list, every call returns a
      NEW Query, `execute()` with no ops returns a NEW array of the ORIGINAL row references,
      `explain()` returns the (empty) readonly op-description list. Public surface exported
      from `src/index.ts`. Test first: immutability proofs (snapshot source, execute, deep
      re-compare), result-is-new-array proof, branching proof (two queries extended from one
      shared prefix stay independent). (DESIGN §3 architecture lock, §7 immutability row)
- [x] 3.2 `where(key, op, value)` — typed operator filtering.
      Test first: runtime filtering per operator (delegates to `ops.evaluateWhere`); explain
      gains a serializable `{ kind: "where", ... }` entry per call. Type tests: unknown key,
      `where("name", ">", 5)`, `where("active", ">", true)` all `@ts-expect-error`; `in` value
      typed `readonly T[K][]`. (DESIGN §6 where signature; ACCEPTANCE type-level negatives)
- [x] 3.3 `where(predicate)` overload — typed escape hatch `(row: T) => boolean`.
      Test first: runtime filtering; overload resolution alongside 3.2 stays intact.
      DECISION to pin: how a predicate op is described in `explain()` while staying
      serializable (e.g. `{ kind: "where", predicate: true }`) — record it. (DESIGN §6)
- [ ] 3.4 `limit(n)` + pipeline call-order pin.
      Test first: `TypeError` at CALL time for negative and non-integer n; `limit(0)` -> empty;
      limit applies at its pipeline position — `limit(k).where(...)` truncates FIRST, filters
      second; `explain()` lists ops in exactly call order across mixed pipelines.
      (DESIGN §7 limit row + pipeline-order row + explain row)
- [ ] 3.5 `sort(key, direction?)` — single-key ordering.
      Test first: asc default, desc; stable (equal keys keep pipeline order); `null`/`undefined`
      values sort LAST regardless of direction; explain entry. Type tests: non-sortable key
      (boolean/object field) must not compile (`SortableKey<T>`). (DESIGN §7 sort row)
- [ ] 3.6 Chained `.sort()` tie-breakers — FIRST call is the primary key (SQL `ORDER BY a, b`).
      Test first: two- and three-key composition proofs; stability preserved. DECISION to pin:
      composition mechanics (collapse consecutive sort ops into one comparator vs other
      strategies) AND the behavior of non-adjacent sorts (`sort(a).where(...).sort(b)`) —
      record both with reasoning. (DESIGN §7 sort row)
- [ ] 3.7 `select(...keys)` — projection.
      Test first: rows projected to NEW objects with exactly the named keys; duplicate key
      harmless; result element type `Pick<T, K>`; explain entry. Type tests: `where` on a
      selected-away key must not compile; `select` result type asserted with `Expect<Equal>`.
      (DESIGN §7 select row)
- [ ] 3.8 Ungrouped aggregates on `Query<T>`: `count`, `sum`, `avg`, `min`, `max`.
      Test first: aggregates run the pipeline then delegate to ops (1.4); empty-set semantics
      surface through (RangeError propagates); keys constrained to `KeysOfType<T, number>`.
      Type tests: non-number key passed to `sum`/`avg`/`min`/`max` must not compile.
      (DESIGN §6 ungrouped aggregates; §7 empty-set row)
- [ ] 3.9 `groupBy(key)` -> `GroupedQuery<T, K>` and its `execute()`.
      Test first: `Map<T[K], T[]>` result; SameValueZero grouping via native Map; first-seen
      group order; rows keep pipeline order within a group; pipeline ops before groupBy apply
      first. Document (code comment + later README) the object-key-groups-by-reference
      limitation. Type tests: `groupBy().execute()` result type asserted. (DESIGN §7 groupBy row)
- [ ] 3.10 `agg` namespace + `GroupedQuery.aggregate(spec)`.
      Test first: `agg.count/sum/avg/min/max` spec constructors; result rows
      `{ key } & { [name]: number }` with names AND types inferred from the spec; rows in
      first-seen group order. Type tests: inferred named-number result asserted with
      `Expect<Equal>`; wrong aggregate key must not compile. (DESIGN §6 agg, §7 aggregate row)

## Phase 4 — acceptance sweep

- [ ] 4.1 Reconciliation sweep: walk EVERY ACCEPTANCE.md functional and type-level bullet and
      every DESIGN §7 pin against the actual test suite; add any missing test (positive
      type-level set and all six negative `@ts-expect-error` cases explicitly). Confirm no
      stub/placeholder code paths remain (Phase 0 placeholder fully replaced), `dependencies`
      still empty, source within the ~400-600 line budget. Fix only what the sweep flushes out.
      (ACCEPTANCE quality section; DESIGN §9)

## Phase F — close out

- [ ] F.1 `README.md` usage docs + `docs/ARCHITECTURE.md` guided tour.
      Every README example EXECUTED first (scratch file run with bun, then transcribed —
      measured, not aspirational); cover where/sort/limit/select/groupBy/aggregate/execute/
      explain; document the no-deep-copy result semantics and the groupBy reference-key
      limitation. ARCHITECTURE.md: one-page tour of the four modules and the trust boundary.
      (ACCEPTANCE documentation section)
- [ ] F.2 Fresh-context judge pass: run the judge agent (`.claude/agents/judge.md`) over `src/`
      for the "readable in one sitting" bar; record verdict AND applied findings in
      `loop/PROGRESS.md`; apply accepted findings with the gate green. (ACCEPTANCE quality;
      DESIGN §9 subjective bar)
- [ ] F.3 Final close-out: verify every ACCEPTANCE.md checkbox against code/tests on a clean
      tree with a green gate; update `docs/DESIGN.md` §10 open questions (npm publish stays
      human-owned), `loop/PROGRESS.md`, `loop/HANDOFF.md`; create `.loop/COMPLETE`; print
      `JSONQ-M1-DONE`. (ACCEPTANCE completion signal)

## Later (NOT this milestone)

Explicit deferrals — the loop may not reopen these (DESIGN §8 and §10):

- npm publish + package name — HUMAN decision after M1
- CI setup — human decision post-M1 (local gate only)
- Dot-path / nested field access; `contains` / regex / fuzzy operators; `offset` / pagination;
  `Date` support; lazy/streaming evaluation; deep-freezing results; indexes / query
  optimization; async API; multi-key sort varargs; code formatter
