# jsonq — Design & Decision Record

> Status: RATIFIED 2026-07-10. The loop treats this as **frozen ground truth**.
> Pairs with [`MANIFESTO.md`](../MANIFESTO.md): manifesto = public intent; this = engineering record.
> Do not re-litigate locked rows without explicit human amendment to this file.

## 1. What this project is

jsonq is a small, readable, fully type-safe query engine for in-memory JSON arrays, written in
pure TypeScript with zero runtime dependencies. You build a query fluently, the compiler verifies
it (keys, operators, value types, result shapes), and `execute()` runs it in one pass over the
pipeline — without ever mutating the source data.

The primary value is the TYPE LAYER: an invalid query must not compile. The runtime is
deliberately simple; the engineering interest is API design, generics, and type inference.

This project is also the first dogfood build of the loop-engineering template: it is built
fully autonomously by a test-gated agent loop. Frictions found in the template are recorded in
`loop/TEMPLATE-FEEDBACK.md` (by the human observer, not the loop).

## 2. The wedge

> **We compete with ad-hoc `data.filter(x => ...).sort(...)` spaghetti and untyped query
> helpers — not with lodash, not with a database.**

The empty space: a query over a typed array should be as verifiable as the array's type itself.
Existing helpers either give up type safety (string paths, `any` values) or give up the fluent
query shape (raw array methods).

## 3. Locked decisions

| Decision | Lock |
|----------|------|
| Product scope | Library: in-memory JSON array query engine. No IO, no persistence, no server. |
| Primary language | TypeScript, strict mode. Zero runtime dependencies. |
| Distribution | Buildable to `dist/` (tsc). npm publish is a HUMAN decision after M1, not a loop task. |
| Architecture | Immutable op-list core: a `Query<T>` = source ref + frozen list of pending ops; every fluent call returns a NEW `Query`; `execute()` runs the pipeline once, in call order. |
| API style | Fluent, synchronous, immutable. String-key operator API with full type constraints, plus a typed predicate overload as the escape hatch. |
| Type-safety bar | FULL: invalid key, operator/value-type mismatch, or wrong aggregate key must be a COMPILE ERROR, locked by compile-time tests. |
| Reliability bar | Every line tested: 100% line + function coverage; type-level tests (positive and `@ts-expect-error` negative) run in the typecheck gate. |
| Test runner | bun test (with coverage threshold in bunfig.toml); typecheck = `tsc --noEmit`. |
| Size budget | ~400-600 source lines (excluding tests). Comprehension time is the real metric; no code-golf. |
| Beachhead | A learning/dogfood project first; production-quality discipline anyway. |

## 4. Principles

1. **Invalid queries do not compile.** The type layer is the product; the compiler is the first
   test suite.
2. **Plans are visible.** `explain()` shows the op pipeline; ops apply in call order, no hidden
   reordering, no magic.
3. **The engine never mutates.** Source array and rows are never written to; every fluent call
   returns a new `Query`; `execute()` returns a new array.
4. **Conscious omission.** Strength comes from the refusals list (section 8). Small enough to
   read in one sitting.
5. **Errors are not hidden.** The few runtime errors that can exist throw loudly with clear
   messages; nothing returns silent garbage.

## 5. Architecture

```
src/types.ts       type machinery: OperatorFor<V>, KeysOfType<T,V>, aggregate
                   spec inference. Compile-time only (erased at runtime).
src/ops.ts         GUARDED CORE: compare(), deepEqual(), predicate evaluation,
                   aggregate computations. Wrong answers are born here, so this
                   file gets the strictest tests and decision records.
src/query.ts       fluent builder: Query<T> op-list, GroupedQuery, pipeline
                   executor, explain().
src/index.ts       public surface: query(), agg, and public types.
src/type-tests.ts  compile-time assertions (positive cases + @ts-expect-error
                   negatives). Checked by `tsc --noEmit`; contains no runtime
                   test and never ships.
```

### Trust boundaries

| Boundary | Modules | Gate |
|----------|---------|------|
| Guarded core | `src/ops.ts` | 100% coverage, every semantic in section 7 pinned by a test, decisions recorded in PROGRESS |
| Open edges | `src/query.ts`, `src/index.ts`, `src/types.ts` | standard gate (still 100% coverage; types locked by type-tests) |

**Honesty discipline:** `ops.ts` stays small because comparison/equality/aggregation is genuinely
minimal — never by sweeping complexity into `query.ts`.

## 6. Public API (the contract)

```ts
function query<T extends object>(source: readonly T[]): Query<T>;

interface Query<T> {
  // filtering
  where<K extends keyof T & string>(key: K, op: OperatorFor<T[K]>, value: ...): Query<T>;
  //   value type: for "in" -> readonly T[K][]; for every other op -> T[K]
  where(predicate: (row: T) => boolean): Query<T>;   // typed escape hatch

  // ordering / slicing
  sort(key: SortableKey<T>, direction?: "asc" | "desc"): Query<T>;
  limit(n: number): Query<T>;

  // shaping
  select<K extends keyof T & string>(...keys: K[]): Query<Pick<T, K>>;
  groupBy<K extends keyof T & string>(key: K): GroupedQuery<T, K>;

  // aggregates (ungrouped)
  count(): number;
  sum(key: KeysOfType<T, number>): number;
  avg(key: KeysOfType<T, number>): number;
  min(key: KeysOfType<T, number>): number;
  max(key: KeysOfType<T, number>): number;

  // terminals
  execute(): T[];
  explain(): readonly OpDescription[];
}

interface GroupedQuery<T, K extends keyof T> {
  execute(): Map<T[K], T[]>;
  aggregate<S extends AggSpec<T>>(spec: S): Array<{ key: T[K] } & AggResult<S>>;
}

// aggregate spec constructors (the `agg` namespace)
agg.count(): AggCount;
agg.sum<T>(key: KeysOfType<T, number>): ...;   // likewise avg / min / max
```

### Operator set (v1, complete)

| Operator | Allowed on `T[K]` | Semantics |
|----------|-------------------|-----------|
| `==`, `!=` | any JSON value | DEEP STRUCTURAL, TYPE-SENSITIVE equality: `1 != "1"`; objects compared by structure (key order irrelevant); arrays element-wise and order-sensitive |
| `<`, `<=`, `>`, `>=` | `number \| string` only | JS relational semantics; `NaN` comparisons are `false` |
| `in` | any JSON value | value is `readonly T[K][]`; membership via the same deep equality |

`OperatorFor<V>` enforces the "allowed on" column at compile time:
`where("active", ">", true)` and `where("name", ">", 5)` MUST NOT compile.

## 7. Pinned runtime semantics (each row is a required test)

| Behavior | Pin |
|----------|-----|
| Pipeline order | Ops apply in CALL order. `limit(10).where(...)` truncates first, filters second. `explain()` reflects exactly this order. |
| Immutability | Source array and its rows are never mutated. `execute()` returns a NEW array whose elements are the ORIGINAL row references (no deep copy — documented). Each fluent call returns a NEW Query; the receiver is unchanged (branching two queries off one shared prefix must work). |
| Sort | Stable. Repeated `.sort()` calls compose as tie-breakers: FIRST call is the primary key (SQL `ORDER BY a, b`). Only `number \| string` keys are sortable (`SortableKey<T>`). `null`/`undefined` values sort LAST regardless of direction. |
| select | Projects each row to a new object with exactly the named keys; result element type is `Pick<T, K>`. Selecting the same key twice is harmless. A later `where` on a selected-away key must not compile. |
| groupBy | Groups by SameValueZero on the raw key value (native `Map` key semantics). Key values that are objects therefore group by reference — a documented limitation, not deep equality. `execute()` returns `Map<T[K], T[]>` in first-seen group order; rows keep pipeline order within a group. |
| aggregate | `aggregate(spec)` result rows appear in first-seen group order; each row is `{ key } & { [name]: number }` with names and result types inferred from the spec. |
| Empty-set aggregates | `count()` -> 0, `sum()` -> 0. `avg`/`min`/`max` over an EMPTY set THROW `RangeError` whose message names the aggregate and the key. (Grouped aggregates never see an empty group by construction, so this bites only ungrouped.) |
| limit | `limit(n)` keeps the first n rows at its pipeline position. Non-integer or negative n throws `TypeError` at CALL time (fail fast, not at execute). `limit(0)` is valid and yields an empty result. |
| explain | Returns plain, serializable op descriptions (discriminated by `kind`), one per fluent call, in call order. No hidden ops. |
| Runtime errors | ONLY the two above (limit TypeError, empty-set RangeError). Everything else that could be wrong is a compile error instead. |

## 8. Deliberately rejected (v1 — the loop may not reopen these)

- **Dot-path / nested field access** (`where("address.city", ...)`) — template-literal-type
  machinery would blow the size and comprehension budget. Top-level keys only.
- **`contains` / regex / fuzzy operators** — the operator set in section 6 is closed.
- **`offset` / pagination** — `limit` only.
- **`Date` support** — JSON has no Date; rows are JSON values.
- **Lazy / streaming / iterator evaluation** — `execute()` materializes once; the op-list is the
  only laziness.
- **Deep-freezing results** — immutability is a discipline of the engine, not a runtime cost.
- **Indexes / query optimization / reordering** — the pipeline is literal; O(n) per op is
  documented, not fixed.
- **Async API** — in-memory arrays are synchronous.
- **Multi-key sort varargs** (`sort("a", "b")`) — chained `.sort()` tie-breakers cover it.
- **npm publish** — human decision after M1.

## 9. Testing strategy

- **TDD per loop discipline**: failing test first, then implementation.
- **Runtime tests** (bun test): every pinned semantic in section 7, every operator row in
  section 6, immutability proofs (source and rows unchanged after execute), branching-query
  proof, stable-sort proof, empty/edge cases. Coverage threshold 100% line + function
  (bunfig.toml).
- **Type-level tests** (`src/type-tests.ts`, checked by `tsc --noEmit` in the gate):
  - positive: inferred result types (`select` -> `Pick`, `aggregate` -> named numbers,
    `groupBy().execute()` -> `Map<T[K], T[]>`) asserted with an `Expect<Equal<...>>` helper;
  - negative: every "MUST NOT compile" example in sections 6-7 locked with `@ts-expect-error`.
- **Subjective bar**: "readable in one sitting" judged at milestone close by the fresh-context
  judge agent (`.claude/agents/judge.md`); verdict recorded in `loop/PROGRESS.md`.

## 10. Open questions

- [x] npm publish + package name — RESOLVED 2026-07-10 by the maintainer: the package is
      `@open-spek/jsonq` (the unscoped `jsonq` is taken on npm; the scope keeps the project
      name intact and ties it to the open-spek organization, github.com/open-spek/jsonq).
      `publishConfig.access: public` is set; publish timing remains the maintainer's call.

## 11. References

- LibreDB (`~/projects/libredb/libredb-database`) — the reference loop-engineered build; its
  deep-equality and honest-omission decisions are deliberately echoed here.
- Loop-engineering template (`~/projects/open-spek/loop (github.com/open-spek/loop)`) — the machinery
  this project dogfoods.
