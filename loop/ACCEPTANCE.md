# Acceptance Criteria — M1 (the whole v1 scope)

> Current milestone definition of "done" for the build loop.
> The agent may create `.loop/COMPLETE` only when **every** criterion below is true and the gate is green.
> Reference: `docs/DESIGN.md` sections 6 (API contract), 7 (pinned semantics), 8 (refusals).

## Functional

- [ ] `query(source)` returns a `Query<T>`; the engine NEVER mutates the source array or its
      rows (proven by tests that snapshot and re-compare the source after execute).
- [ ] `where(key, op, value)`: full operator set (`==`, `!=`, `<`, `<=`, `>`, `>=`, `in`) with
      DESIGN 6 semantics — deep structural type-sensitive equality for `==`/`!=`/`in`;
      relational ops on `number | string` only; `NaN` comparisons false.
- [ ] `where(predicate)` overload works and is typed (`(row: T) => boolean`).
- [ ] `sort(key, direction?)`: stable; chained calls compose as tie-breakers (first call
      primary); `null`/`undefined` sort last regardless of direction.
- [ ] `limit(n)`: applies at its pipeline position; throws `TypeError` at call time for
      negative or non-integer n; `limit(0)` yields empty.
- [ ] Ops apply in CALL order (e.g. `limit` before `where` truncates first) and `explain()`
      returns serializable op descriptions in exactly that order.
- [ ] `select(...keys)`: projects rows to exactly the named keys; result type is
      `Pick<T, K>`; querying a selected-away key afterwards does not compile.
- [ ] `groupBy(key).execute()`: `Map<T[K], T[]>`, SameValueZero grouping, first-seen group
      order, pipeline order within groups.
- [ ] `groupBy(key).aggregate(spec)` with `agg.count/sum/avg/min/max`: result rows
      `{ key } & { [name]: number }`, names and types inferred from the spec.
- [ ] Ungrouped aggregates `count/sum/avg/min/max` on `Query<T>`; number-keyed only;
      empty-set semantics per DESIGN 7 (`count`/`sum` -> 0; `avg`/`min`/`max` throw
      `RangeError` naming the aggregate and key).
- [ ] Branching works: two queries extended from one shared prefix are independent.

## Type-level (checked by `tsc --noEmit` on `src/type-tests.ts`)

- [ ] Positive: `select` -> `Pick`, `groupBy().execute()` -> `Map<T[K], T[]>`,
      `aggregate` -> inferred named numbers, `where` value locked to `T[K]`
      (`in` -> `readonly T[K][]`) — asserted with an `Expect<Equal<...>>` helper.
- [ ] Negative (each with `@ts-expect-error`): unknown key; relational op on
      boolean/null/object field; value type mismatch (`where("name", ">", 5)`);
      non-number key passed to `sum`/`avg`/`min`/`max`; sorting a non-sortable key;
      `where` on a selected-away key.

## Quality

- [ ] Built test-first; every new behavior has tests derived from the criteria above
- [ ] Full gate green on a clean working tree: `./loop/scripts/gate.sh`
- [ ] 100% line + function coverage across all `src/` runtime files (bunfig threshold)
- [ ] No placeholder/stub implementations in shipped code paths
- [ ] Zero runtime dependencies (`dependencies` empty in package.json)
- [ ] "Readable in one sitting" verdict PASS from a fresh-context judge over `src/`
      (see `.claude/agents/judge.md`); verdict and applied findings recorded in
      `loop/PROGRESS.md`

## Documentation

- [ ] `README.md` usage examples match the actual API and were executed before being written
      down (measured, not aspirational)
- [ ] `docs/DESIGN.md` open questions updated for anything resolved
- [ ] `loop/PROGRESS.md` and `loop/HANDOFF.md` reflect actual state

## Process

- [ ] All tasks in `loop/IMPLEMENTATION_PLAN.md` for this milestone are `[x]`
- [ ] Decisions made autonomously during the loop are recorded in `loop/PROGRESS.md`
      with reasoning, flagged for human review where non-obvious

## Completion signal

When all above are satisfied:

1. Update `loop/HANDOFF.md`
2. Create file `.loop/COMPLETE`
3. Print sentinel (informational only): `JSONQ-M1-DONE`

**The marker file is the only machine-detected stop signal.**
