# jsonq Toolchain — Decision Record

> Status: decided (locked with DESIGN.md); package scaffolding is loop Phase 0 work.
> Every adopted tool must plug into the **gate**. The loop commits nothing unless the gate is green.

## Fit rubric (from MANIFESTO + DESIGN)

1. Serves reliability or honesty (tests, types, lint — not slogans)
2. Zero runtime dependencies; dev-only tooling
3. Bun-native (Bun 1.3.x is the runtime for tests/scripts)
4. Machine-enforced by the gate
5. English-only artifacts; no emoji in configs/commits

## Gate definition (authoritative)

The loop runs exactly this via `./loop/scripts/gate.sh`:

```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

Order: typecheck first (it also validates `src/type-tests.ts` — the type-level suite), then
lint, then tests (with coverage threshold), then build.

## Decision summary

| Category | Decision | Tool | Reason |
|----------|----------|------|--------|
| Language | TypeScript strict | typescript (tsc) | the type layer is the product |
| Runtime (dev/test) | Bun 1.3.x | bun | reference-build parity; built-in test runner + coverage |
| Test runner | bun test | bun | zero extra deps; coverage threshold in bunfig.toml |
| Typecheck | tsc --noEmit | typescript | checks src incl. type-tests.ts (`@ts-expect-error` negatives) |
| Linter | ESLint 9 flat config | eslint + typescript-eslint | reference-build parity |
| Formatter | none in v1 | - | lint covers style bar; conscious omission |
| Build | tsc -p tsconfig.build.json | typescript | emit dist/ with .d.ts; excludes tests and type-tests |
| Coverage | 100% line + function | bunfig.toml coverageThreshold | reliability bar from DESIGN.md section 3 |
| Git hooks | none | - | the loop runs the gate explicitly; CI later if repo goes remote |
| CI | none in M1 | - | local gate only; human decision post-M1 |

## Package scripts (target shape — loop Phase 0 creates these)

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "bun test --coverage",
    "build": "tsc -p tsconfig.build.json",
    "gate": "./loop/scripts/gate.sh"
  }
}
```

Notes for Phase 0:

- `tsconfig.json` covers all of `src/` (so `type-tests.ts` is typechecked); strict true,
  `noUncheckedIndexedAccess` true.
- `tsconfig.build.json` excludes `src/type-tests.ts` and `src/**/*.test.ts` from emit.
- `bunfig.toml` sets `coverageThreshold = { line = 1.0, function = 1.0 }` and skips test files
  from coverage accounting if needed (`coverageSkipTestFiles`).
- Zero runtime dependencies: `dependencies` stays empty; only devDependencies (typescript,
  eslint, typescript-eslint).

## Coverage / quality thresholds

- 100% line + function coverage across all `src/` runtime files.
- No `any` in `src/` (lint-enforced); `unknown` + narrowing where needed.

## Deviations found during Phase 0 (task 0.1, 2026-07-10)

Recorded per the plan; the decision table above stands, these are corrections met in practice:

1. **`@types/bun` added to devDependencies.** `tsconfig.json` covers all of `src/`, so
   `tsc --noEmit` typechecks `src/**/*.test.ts`, whose `import ... from "bun:test"` needs
   Bun's type declarations. Dev-only; runtime dependency count is still zero.
2. **`coverageThreshold` keys are PLURAL.** The sketch above says
   `{ line = 1.0, function = 1.0 }`, but Bun 1.3.14 silently ignores singular keys (probe:
   an uncovered function passed the gate). The enforced syntax is
   `coverageThreshold = { lines = 1.0, functions = 1.0 }` — verified failing (exit 1) on an
   uncovered function and passing at 100%.
3. **Versions pinned to `typescript@^5` and `eslint@^9`.** A bare install resolved
   typescript@7 and eslint@10; typescript-eslint@8 (latest) declares a TypeScript <6 peer
   range, and this file locks "ESLint 9 flat config". Installed: typescript 5.9.3,
   eslint 9.39.4, typescript-eslint 8.63.0, @types/bun 1.3.14 on Bun 1.3.14.

## Notes for the loop agent

- Do not add tools or dependencies without updating this file and the gate.
- Do not disable checks to pass the gate.
- `src/type-tests.ts` is compile-time only: it must contain no runtime assertions and must not
  be imported by shipped code.
