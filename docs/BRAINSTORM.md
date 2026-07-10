# Brainstorm Capture — jsonq

> Human-only phase, completed 2026-07-10 in an interactive session (maintainer: cevheri).
> Outcome ratified into `MANIFESTO.md` and `docs/DESIGN.md`.

## Problem statement

Querying in-memory JSON arrays in TypeScript is either untyped spaghetti (chained array methods
with inline lambdas) or a helper library that loses type safety at string paths. There is no
small, readable engine where the QUERY ITSELF is compile-time verified. Secondary goal: this
project is the first dogfood run of the loop-engineering template.

## Assumptions to challenge

| Assumption | Valid? | If wrong, then |
|------------|--------|----------------|
| Full type safety fits in ~400-600 lines | plausible, tested by the build | relax operator constraints to pragmatic keyof (fallback documented) |
| The loop can implement type-level machinery via TDD | to be proven — this is the dogfood bet | human intervenes via plan/spec, records friction in TEMPLATE-FEEDBACK |
| String-operator API is worth it over pure lambdas | yes — it is the showcase for inference | predicate overload already exists as the escape hatch |

## Alternatives considered

### Type-safety depth

- **A. Full type safety** — operators constrained per value type, select/groupBy narrow result
  types, type-level tests in the gate. **CHOSEN.**
- B. Pragmatic keyof — keys/values typed, operator set unconstrained. Rejected: hides the very
  thing the project exists to showcase.
- C. Predicate-first hybrid — lambdas primary, string API as sugar. Rejected: makes the fluent
  operator face second-class.

### Evaluation model

- **A. Immutable op-list** — Query = source + frozen op list; execute runs pipeline once in
  call order; branching queries share prefixes. **CHOSEN** (plan is inspectable — `explain()`).
- B. Eager per-call evaluation. Rejected: O(n) copies per call, no reusable query value.
- C. Lazy iterator pipeline. Rejected: laziness machinery spends the budget the type layer
  needs; sort/groupBy materialize anyway.

## Wedge (one sentence)

> We compete with untyped filter/sort spaghetti and `any`-degrading query helpers, not with
> lodash or a database.

## Deliberate refusals (v1)

Dot-path/nested access; contains/regex/fuzzy; offset; Date; lazy/streaming; deep-freeze;
indexes/optimization; async; multi-key sort varargs; npm publish (human decision post-M1).

## Success shape

- The full API of DESIGN.md section 6 works with 100% line+function coverage.
- Every "MUST NOT compile" example is locked by `@ts-expect-error` type tests in the gate.
- The loop builds it autonomously; human touches only spec/plan/prompt.
- `loop/TEMPLATE-FEEDBACK.md` captures every template friction for the template's maturation.

## Verification oracle

`tsc --noEmit` (including type-tests) + ESLint + bun test with 100% coverage threshold + build.
Subjective readability: fresh-context judge agent at milestone close.

## Milestone sketch

| Milestone | Outcome | Acceptance hint |
|-----------|---------|-----------------|
| M1 | Entire v1 scope (single milestone) | `loop/ACCEPTANCE.md`; sentinel JSONQ-M1-DONE |

## Open questions for DESIGN.md

- [x] All resolved in the session; only npm-publish timing left open (human, post-M1).

## Sign-off

- [x] Manifesto drafted from this doc
- [x] DESIGN.md locked from this doc
- [x] Ready for planning mode
