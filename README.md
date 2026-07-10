# jsonq

> npm: [`@open-spek/jsonq`](https://www.npmjs.com/package/@open-spek/jsonq) — GitHub: [open-spek/jsonq](https://github.com/open-spek/jsonq)

> Status: M1 built; publishing as `@open-spek/jsonq` (name decided 2026-07-10, DESIGN
> section 10). Until the first release lands on npm, consume it from `src/` or a local
> `dist/` build.

**jsonq is the query engine where an invalid query does not compile.**

A small, readable, fully type-safe fluent query engine for in-memory JSON arrays, in pure
TypeScript with zero runtime dependencies. You build a query fluently, the compiler verifies
it (keys, operators, value types, result shapes), and `execute()` runs the pipeline once, in
call order, without ever mutating the source.

Every example below was executed against the current source before being written down; the
values in the comments are measured output, not aspiration.

## Quick start

```ts
import { agg, query } from "@open-spek/jsonq";

type User = {
  id: number;
  name: string;
  age: number;
  country: string;
  premium: boolean;
};

const users: User[] = [
  { id: 1, name: "Ada", age: 36, country: "UK", premium: true },
  { id: 2, name: "Grace", age: 45, country: "US", premium: false },
  { id: 3, name: "Linus", age: 22, country: "FI", premium: false },
  { id: 4, name: "Margaret", age: 17, country: "US", premium: true },
  { id: 5, name: "Alan", age: 41, country: "UK", premium: false },
];

const seniors = query(users)
  .where("age", ">=", 36) // ">=" compiles only on number | string fields
  .sort("name")           // stable; ascending by default
  .limit(2)
  .execute();             // User[] — a NEW array; the source is untouched
// [{ id: 1, name: "Ada", ... }, { id: 5, name: "Alan", ... }]
```

And the point of the whole exercise — none of these compile:

```ts
query(users).where("nmae", "==", "Ada");             // unknown key
query(users).where("name", ">", 5);                  // value type mismatch
query(users).where("premium", ">", true);            // relational op on a boolean field
query(users).sort("premium");                        // non-sortable key
query(users).sum("name");                            // non-number aggregate key
query(users).select("name").where("age", ">", 18);   // key selected away one call earlier
```

Each of these is locked as an `@ts-expect-error` test in
[`src/type-tests.ts`](./src/type-tests.ts) — a negative that starts compiling fails the gate.

## Filtering: `where`

Seven operators, each constrained by the field's type:

| Operator | Allowed on `T[K]` | Semantics |
|----------|-------------------|-----------|
| `==`, `!=` | any JSON value | deep structural, type-sensitive equality: `1` never equals `"1"`; objects by structure (key order irrelevant); arrays element-wise, order-sensitive |
| `<`, `<=`, `>`, `>=` | `number \| string` only | JS relational semantics; every comparison involving `NaN` is false; strings compare in code-unit order (no locale) |
| `in` | any JSON value | value is `readonly T[K][]`; membership via the same deep equality |

```ts
query(users).where("country", "==", "UK").execute();
// [Ada, Alan]

query(users).where("country", "in", ["UK", "US"]).execute();
// [Ada, Grace, Margaret, Alan]
```

For everything the operator table cannot express there is a typed predicate escape hatch,
`(row: T) => boolean`:

```ts
query(users).where((row) => row.premium && row.age >= 18).execute();
// [Ada]
```

## Ordering: `sort`

`sort(key, direction?)` is stable and defaults to `"asc"`. Only `number | string` keys are
sortable (nullable ones included). Directly chained calls compose as tie-breakers with the
FIRST call primary, like SQL `ORDER BY country, age DESC`:

```ts
query(users).sort("country").sort("age", "desc").execute();
// [Linus(FI, 22), Alan(UK, 41), Ada(UK, 36), Grace(US, 45), Margaret(US, 17)]
```

`null`/`undefined` values sort last regardless of direction:

```ts
type Track = { title: string; rating: number | null };
const tracks: Track[] = [
  { title: "b-side", rating: null },
  { title: "opener", rating: 5 },
  { title: "deep cut", rating: 3 },
];

query(tracks).sort("rating", "desc").execute();
// [opener(5), deep cut(3), b-side(null)]
```

A non-sort call between two sorts ends the tie-breaker chain: in
`sort(a).where(p).sort(b)` the first ordering materializes at its own pipeline position, and
the later sort starts fresh (the earlier order survives only through stability).

## Slicing: `limit`

`limit(n)` keeps the first `n` rows at its pipeline position. A negative or non-integer `n`
throws at CALL time, not at execute:

```ts
query(users).limit(-1);
// TypeError: limit(-1) requires a non-negative integer
```

Ops apply in call order — there is no hidden reordering, so where you put `limit` matters:

```ts
query(users).limit(2).where("country", "==", "US").execute();
// [Grace]           — truncate to [Ada, Grace] FIRST, then filter

query(users).where("country", "==", "US").limit(2).execute();
// [Grace, Margaret] — filter first, then truncate
```

## Shaping: `select`

`select(...keys)` projects each row to a new object with exactly the named keys; the element
type narrows to `Pick<T, K>`, so a later call on a selected-away key is a compile error:

```ts
const cards = query(users).select("name", "country").execute();
// [{ name: "Ada", country: "UK" }, { name: "Grace", country: "US" }, ...]
// element type: Pick<User, "name" | "country">
```

Projected objects are new, but field values copy by reference (see the no-deep-copy note
below).

## Grouping: `groupBy`

`groupBy(key).execute()` partitions the pipeline rows into a `Map<T[K], T[]>` — groups in
first-seen order, rows keeping pipeline order within each group:

```ts
query(users).groupBy("country").execute();
// Map(3) { "UK" => [Ada, Alan], "US" => [Grace, Margaret], "FI" => [Linus] }
```

Grouping uses SameValueZero (native `Map` key semantics): `NaN` forms one group, `+0`/`-0`
collide, and `null`/`undefined` are two distinct groups.

## Aggregates

Grouped, with a spec built from the `agg` constructors — result rows carry the group key
under `key` plus one number per spec name, with names AND types inferred from the spec:

```ts
query(users)
  .groupBy("country")
  .aggregate({ n: agg.count(), avgAge: agg.avg("age"), youngest: agg.min("age") });
// [
//   { key: "UK", n: 2, avgAge: 38.5, youngest: 36 },
//   { key: "US", n: 2, avgAge: 31,   youngest: 17 },
//   { key: "FI", n: 1, avgAge: 22,   youngest: 22 },
// ]
// element type: { key: string; n: number; avgAge: number; youngest: number }
```

Ungrouped, straight off the query — `count()` is keyless; the numeric four accept only keys
whose type is exactly `number`:

```ts
query(users).count();     // 5
query(users).sum("age");  // 161
query(users).avg("age");  // 32.2
query(users).min("age");  // 17
query(users).max("age");  // 45
```

Empty-set semantics are pinned: counting or summing nothing is 0, but an average, minimum,
or maximum of nothing has no honest value, so it throws:

```ts
const nobody = query(users).where("age", ">", 200);
nobody.count();    // 0
nobody.sum("age"); // 0
nobody.avg("age"); // RangeError: Cannot compute avg("age") of an empty set
```

That `RangeError` and the `limit` `TypeError` are the engine's ONLY runtime errors.
Everything else that could be wrong is a compile error instead.

## Plans: `explain`

`explain()` returns one plain, JSON-serializable description per fluent call, in exactly
call order. A predicate `where` appears as a `predicate: true` marker (functions do not
serialize):

```ts
const plan = query(users)
  .where("age", ">=", 18)
  .where((row) => row.premium)
  .sort("age", "desc")
  .limit(3)
  .select("name", "age")
  .explain();

JSON.stringify(plan, null, 2);
// [
//   { "kind": "where",  "key": "age", "op": ">=", "value": 18 },
//   { "kind": "where",  "predicate": true },
//   { "kind": "sort",   "key": "age", "direction": "desc" },
//   { "kind": "limit",  "count": 3 },
//   { "kind": "select", "keys": ["name", "age"] }
// ]
```

Aggregates and `groupBy` never appear in a plan: they are terminal reads over the pipeline,
not ops in it.

## Immutability and branching

Every fluent call returns a NEW query and leaves the receiver untouched, so queries branch
safely off a shared prefix:

```ts
const adults = query(users).where("age", ">=", 18);
const uk = adults.where("country", "==", "UK");
const us = adults.where("country", "==", "US");

uk.execute();     // [Ada, Alan]
us.execute();     // [Grace]
adults.count();   // 4 — the shared prefix is unaffected
```

### No deep copy — read this once

The engine never writes to your data, but it does not copy it either. `execute()` returns a
new ARRAY whose elements are the ORIGINAL row references:

```ts
const rows = query(users).limit(1).execute();
rows[0] === users[0]; // true
```

Consequences, all deliberate (immutability is a discipline of the engine, not a runtime
cost):

- Mutating a result row mutates the source row — treat results as read-only views.
- `select` builds new row objects, but their field values are the original references.
- A `where` value is held by reference too: mutating an object or array after passing it to
  `where(key, op, value)` changes what the pipeline compares against.

### groupBy keys: reference, not structure

Because grouping is SameValueZero, key values that are objects group by REFERENCE — not by
the deep structural equality that `where` uses:

```ts
const kitchen = { room: "kitchen" };
const readings = [
  { sensor: kitchen, value: 20 },
  { sensor: kitchen, value: 22 },
  { sensor: { room: "kitchen" }, value: 21 }, // structurally equal, different object
];

query(readings).groupBy("sensor").execute().size; // 2 — not 1
```

Group by a primitive key when you need structural grouping.

## Development

```bash
bun install
./loop/scripts/gate.sh   # typecheck + lint + test (100% coverage) + build
```

- Full API contract and pinned semantics: [`docs/DESIGN.md`](./docs/DESIGN.md)
- Guided tour of the source: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- What this refuses to be: [`MANIFESTO.md`](./MANIFESTO.md)
- How it was built (autonomous test-gated loop): [`loop/LOOP-ENGINEERING.md`](./loop/LOOP-ENGINEERING.md)
