#!/usr/bin/env bash
#
# Gate script — mechanical definition of "done" for one loop iteration.
# Referenced from docs/TOOLCHAIN.md and loop/PROMPT.md.
#
# Exit 0 only if all checks pass. Any failure stops the script (set -e).
# Until loop Phase 0 scaffolds package.json with these scripts, every step
# fails — that is correct backpressure, not a bug.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "=== gate: typecheck ==="
bun run typecheck

echo "=== gate: lint ==="
bun run lint

echo "=== gate: test ==="
bun run test

echo "=== gate: build ==="
bun run build

echo "=== gate: ALL GREEN ==="
