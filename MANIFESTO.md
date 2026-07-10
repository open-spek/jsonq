# jsonq Manifesto

> Status: RATIFIED 2026-07-10. Pairs with `docs/DESIGN.md` (the engineering record).

**One sentence:** jsonq is the query engine where an invalid query does not compile.

## What we are against

Ad-hoc `data.filter(x => ...).sort((a, b) => ...)` spaghetti that loses its meaning within a
week, and "typed" query helpers that quietly degrade to `any` the moment you pass a string path.
Querying a typed array should be as verifiable as the array's type itself.

## What we are building

Our goal is not a data framework. Our goal is one small, readable, fully type-safe fluent query
engine for in-memory JSON arrays: filter, sort, select, group, aggregate — verified by the
compiler, executed in one visible pipeline, never mutating the source.

Our strength comes not from what we add, but from what we deliberately refuse.

## Core values

1. **Invalid queries do not compile** — the type layer is the product; the compiler is the
   first test suite.
2. **Plans are visible** — ops apply in call order and `explain()` shows exactly that; no
   hidden reordering, no magic.
3. **The engine never mutates** — every call returns a new query; `execute()` returns a new
   array; the source is untouchable.

## Trust model

- **Open at the edges:** the fluent builder, the public surface, the type machinery.
- **Guarded at the core:** `src/ops.ts` — comparison, equality, and aggregate semantics, where
  wrong answers are born. Strictest tests, decisions recorded.

## Scope boundaries

### In scope (v1 / M1)

- `query()` with typed `where` (operator API + predicate escape hatch), `sort` (stable,
  chainable tie-breakers), `limit`, `select`, `groupBy`, `aggregate`, ungrouped aggregates,
  `execute`, `explain`.

### Explicitly out of scope (do not build without human milestone reset)

- Dot-path / nested queries; contains/regex/fuzzy operators; offset/pagination; Date support;
  lazy/streaming evaluation; deep-freezing; indexes or query optimization; async API;
  multi-key sort varargs; npm publish.

## Our claim

You get compile-time certainty about a runtime query — and a codebase small enough to read in
one sitting that shows exactly how it earns that certainty.
