# CLAUDE.md

Guidance for Claude Code working in the **jsonq** repository.

## Start here

This project is built across many sessions, each starting with a **fresh context**. Re-reading these files at session start is the design — you are continuing work, not beginning it.

The real state of the build is whatever the **code, git history, and `loop/IMPLEMENTATION_PLAN.md`** show. Verify by reading; never infer progress from narrative prose alone. If a document disagrees with the code, **the code wins**.

Read, in this order:

1. [`loop/HANDOFF.md`](./loop/HANDOFF.md) — cross-session baton (orientation only, not authoritative)
2. [`MANIFESTO.md`](./MANIFESTO.md) — what this project is and refuses to be
3. [`docs/DESIGN.md`](./docs/DESIGN.md) — locked engineering decisions
4. [`loop/LOOP-ENGINEERING.md`](./loop/LOOP-ENGINEERING.md) — test-gated loop discipline ([`loop/PROMPT.md`](./loop/PROMPT.md), [`loop/IMPLEMENTATION_PLAN.md`](./loop/IMPLEMENTATION_PLAN.md), [`loop/scripts/loop.sh`](./loop/scripts/loop.sh))
5. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — guided tour (when populated)

During an active build, authoritative "done / next" = `loop/IMPLEMENTATION_PLAN.md` ticks + `loop/PROGRESS.md` + git history.

Do not re-litigate decisions settled in `docs/DESIGN.md`. If you believe one is wrong, say so explicitly in `loop/PROGRESS.md` — do not silently diverge.

## What this is

- A small, readable, fully type-safe fluent query engine for in-memory JSON arrays
  (where/sort/limit/select/groupBy/aggregate/execute/explain), pure TypeScript, zero runtime deps.
- The type layer is the product: an invalid query (bad key, operator/value mismatch) must not compile.
- Immutable op-list core: every fluent call returns a new Query; execute() runs the pipeline once
  in call order; explain() shows the plan.
- First dogfood build of the loop-engineering template; built fully autonomously by the loop.

## Build and test

```bash
./loop/scripts/gate.sh
```

Individual steps (see `docs/TOOLCHAIN.md`):

```bash
bun run typecheck   # tsc --noEmit (includes src/type-tests.ts)
bun run lint        # eslint .
bun run test        # bun test --coverage (100% line+function threshold)
bun run build       # tsc -p tsconfig.build.json -> dist/
```

## Conventions

- **English only** for repo artifacts (code, comments, commits, docs)
- **No emoji** in code, comments, commits, docs
- **No `Co-Authored-By` / AI-attribution trailer** unless explicitly asked
- **Commit only when the loop prompt instructs** (one task, all-green gate)
- Zero runtime dependencies — `dependencies` stays empty; dev-only tooling
- `src/type-tests.ts` is compile-time only: no runtime assertions, never imported by shipped code

## Trust boundaries

See `docs/DESIGN.md` section 5. Guarded module: `src/ops.ts` (comparison, deep equality,
aggregate semantics — where wrong answers are born). Extra care + tests before changing.

## Dynamic workflows (optional)

For fan-out inside a single plan task (audit N files, parallel analysis), you may use Claude Code **workflows** (`workflow` / `ultracode` keyword). See `loop/LOOP-ENGINEERING.md` section 9 and `.claude/workflows/README.md`. The outer loop still commits one plan task per iteration.

## Related repositories

Standalone project. The loop-engineering template it dogfoods lives at
`~/projects/libredb/loop-engineering-template`; template frictions found while building jsonq
are recorded by the human observer in `loop/TEMPLATE-FEEDBACK.md` (the loop agent does not
edit that file).
