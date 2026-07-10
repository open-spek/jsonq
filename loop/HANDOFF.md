# HANDOFF

> A note from the previous session to the next.
> Update at milestone boundaries and human review sessions.
> **Orientation only** — authoritative state is code + IMPLEMENTATION_PLAN ticks + PROGRESS + git.

## TL;DR — where we are

Spec is locked (2026-07-10): MANIFESTO.md and docs/DESIGN.md are ratified, toolchain decided
(docs/TOOLCHAIN.md), M1 acceptance written (loop/ACCEPTANCE.md). Planning mode has generated
the M1 plan (loop/IMPLEMENTATION_PLAN.md — 18 tasks, 6 phases). NO CODE EXISTS YET — not even
package.json; plan task 0.1 scaffolds the toolchain. Next: run the build loop on M1.

## Locked context (do not re-litigate)

See `docs/DESIGN.md` and "Deliberately rejected" there.

## Open questions

- npm publish + package name — human decision after M1 (DESIGN.md section 10)

## Immediate next step

Build mode: LOOP_PROMPT_FILE is set to loop/PROMPT.md in loop/config/loop.env. Run
`./loop/scripts/loop.sh`; the loop works loop/IMPLEMENTATION_PLAN.md top-down starting at
task 0.1 (toolchain scaffold, gate green).

## Pointers

- Spec: `docs/DESIGN.md`
- Plan: `loop/IMPLEMENTATION_PLAN.md`
- Acceptance: `loop/ACCEPTANCE.md`
- Run loop: `./loop/scripts/loop.sh`
