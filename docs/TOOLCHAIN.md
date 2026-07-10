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

## Notes for the loop agent

- Do not add tools or dependencies without updating this file and the gate.
- Do not disable checks to pass the gate.
- `src/type-tests.ts` is compile-time only: it must contain no runtime assertions and must not
  be imported by shipped code.
