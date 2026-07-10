# jsonq — Architecture (guided tour)

> Status: living document, written at M1 close-out.
> During active loop builds, **code + tests** are authoritative; this file explains intent.

## Overview

jsonq is four small modules with one idea: a `Query<T>` is a reference to the source array
plus a frozen list of pending op descriptions. Fluent calls only append descriptions (every
call returns a NEW query); `execute()` interprets the list once, in call order. Value
semantics — what "equal", "less than", and "average" MEAN — live in one guarded module,
`src/ops.ts`, that the interpreter delegates to. The type layer (`src/types.ts`) is erased at
runtime; its job is to make invalid queries fail to compile, and it is tested by a
compile-time suite (`src/type-tests.ts`) that never ships.

## Module map

| Module | Role | Trust level |
|--------|------|-------------|
| `src/ops.ts` | value semantics: `deepEqual`, `compareRelational`, `evaluateWhere`, `compareForSort`, `computeAggregate` — where wrong answers are born | guarded |
| `src/query.ts` | fluent builder and pipeline interpreter: `Query<T>` op list, `GroupedQuery`, `agg`, `explain()` | open |
| `src/types.ts` | compile-time machinery: `OperatorFor`, `WhereValue`, `KeysOfType`, `SortableKey`, aggregate-spec inference (`AggSpec` -> `AggRow`); erased at runtime | open |
| `src/index.ts` | public surface: `query()`, `agg`, type-only exports of everything else | open |
| `src/type-tests.ts` | compile-time suite: `Expect<Equal<...>>` positives plus `@ts-expect-error` negatives, run by `tsc --noEmit` in the gate; never ships | tests |

## Key flows

### The life of a query

1. `query(source)` wraps the array with an empty frozen op list. The source is only ever
   read.
2. `where` / `sort` / `limit` / `select` each append ONE frozen op to a frozen copy of the
   list and return a new `Query` over the same source. The receiver never changes — that is
   the whole branching guarantee. `limit` validates at call time (the engine's only
   `TypeError`).
3. `execute()` spreads the source into a fresh array, then applies ops step by step in call
   order. One wrinkle: consecutive `sort` ops are grouped at interpretation time into a
   single multi-key comparison (first call primary, later calls tie-breakers), so chained
   sorts behave like one SQL `ORDER BY` while `explain()` still shows one entry per call.
   The rows coming out are the ORIGINAL row references — new array, no deep copy.
4. `explain()` maps the internal ops to plain serializable descriptions. Keyed ops ARE their
   own descriptions; a predicate `where` is reduced to a `predicate: true` marker so no
   function leaks into a JSON-ready plan.
5. `groupBy(key)` is a stage change, not an op: it returns a `GroupedQuery` holding the base
   query by reference (safe — queries are immutable). Its `execute()` runs the base pipeline,
   then partitions rows into a native `Map` (SameValueZero keys, first-seen order).
6. Aggregates — grouped `aggregate(spec)` and the ungrouped `count`/`sum`/`avg`/`min`/`max` —
   are terminal reads: they run the pipeline and reduce, recording nothing, so the receiver
   stays reusable and plans never contain aggregate ops.

### The trust boundary

`src/ops.ts` holds every decision about what values MEAN (equality is deep and
type-sensitive, NaN relational comparisons are false, empty-set `avg` throws, ...). The
convention pinning the boundary: ops.ts receives EXTRACTED VALUES — never rows, keys, or op
lists. `query.ts` does all interpretation (reading `row[key]`, walking op lists, grouping
sort runs) and crosses into ops.ts through one stringly `row as Record<string, unknown>`
re-read per site, because op descriptions store keys as plain serializable strings after the
call site already verified them at compile time. Complexity may not be swept from ops.ts
into query.ts to keep the guarded file looking small.

### The type layer

- `OperatorFor<V>` implements the operator table: relational ops exist only when the field
  type fits in `number | string` (non-distributive, so `number | null` is excluded).
- `WhereValue<V, Op>` pivots the value parameter on the operator: `in` takes
  `readonly V[]`, everything else takes `V`.
- `KeysOfType<T, number>` gates aggregate keys to exactly-number fields (a compile error
  beats a NaN-poisoned result); `SortableKey<T>` allows nullable orderable fields — the
  nulls-last pin needs them — but rejects always-null ones.
- `select` is the one call that changes the row type (`Query<Pick<T, K>>`); every later call
  checks against the narrowed type.
- `AggSpec<T>` validates an aggregate spec where it meets a row type, and `AggRow<T[K], S>`
  maps the spec back to the flat result-row shape, names and all.

## Invariants the tests enforce

1. The source array and its rows are never mutated; `execute()` returns a new array of the
   original row references, fresh per call.
2. Ops apply in CALL order — `limit` before `where` truncates first — and `explain()` mirrors
   that order, one serializable description per fluent call.
3. Sort is stable; chained sorts compose with the FIRST call primary; `null`/`undefined`
   sort last regardless of direction.
4. Equality is deep, structural, and type-sensitive (`1` never equals `"1"`); every
   relational comparison involving `NaN` is false.
5. Empty-set aggregates: `count`/`sum` -> 0; `avg`/`min`/`max` throw a `RangeError` naming
   the aggregate and the key.
6. Exactly two runtime errors exist (the `limit` `TypeError` and that `RangeError`);
   everything else wrong is a compile error, locked by `type-tests.ts` negatives.
7. 100% line + function coverage over all runtime `src/` files, enforced by the gate.

## How to read the codebase (suggested order)

1. `src/ops.ts` — the value semantics, dependency-free and pinned hardest; everything else
   is plumbing around these ~180 lines.
2. `src/types.ts` — the compile-time machinery; read it next so query.ts's signatures make
   sense on sight.
3. `src/query.ts` — the builder and interpreter composing both; the op-list architecture
   lives here.
4. `src/index.ts` — three lines of public surface; note what is exported type-only.
5. `src/type-tests.ts` — what must and must not compile; the negatives are the product's
   spec in executable form.

## Diagram

```
                 src/index.ts
          public surface: query(), agg
                      |
                 src/query.ts
     Query<T> op list + GroupedQuery + explain()
        (interpretation: rows, keys, op order)
            |                        |
   extracted values          compile-time constraints
            v                        v
       src/ops.ts               src/types.ts
     GUARDED CORE              OperatorFor / WhereValue
  deepEqual, relational,       KeysOfType / SortableKey
  sort comparator,             AggSpec -> AggRow inference
  aggregate semantics          (erased at runtime)
```
