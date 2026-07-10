# HANDOFF

> A note from the previous session to the next.
> Update at milestone boundaries and human review sessions.
> **Orientation only** — authoritative state is code + IMPLEMENTATION_PLAN ticks + PROGRESS + git.

## TL;DR — where we are

Spec is locked (2026-07-10): MANIFESTO.md and docs/DESIGN.md are ratified, toolchain decided
(docs/TOOLCHAIN.md), M1 acceptance written (loop/ACCEPTANCE.md). NO CODE EXISTS YET — not even
package.json; loop Phase 0 scaffolds the toolchain. Next: planning mode generates
loop/IMPLEMENTATION_PLAN.md, then the build loop runs M1.

## Locked context (do not re-litigate)

See `docs/DESIGN.md` and "Deliberately rejected" there.

## Open questions

- npm publish + package name — human decision after M1 (DESIGN.md section 10)

## Immediate next step

Planning mode: generate loop/IMPLEMENTATION_PLAN.md from docs/DESIGN.md + loop/ACCEPTANCE.md
(greenfield — nothing is built). Then switch LOOP_PROMPT_FILE back to loop/PROMPT.md and run
the build loop.

## Pointers

- Spec: `docs/DESIGN.md`
- Plan: `loop/IMPLEMENTATION_PLAN.md`
- Acceptance: `loop/ACCEPTANCE.md`
- Run loop: `./loop/scripts/loop.sh`
