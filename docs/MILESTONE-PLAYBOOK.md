# Milestone Playbook — human workflow between loop runs

Use this between autonomous build cycles. The loop builds; you **steer inputs** and **verify outputs**.

---

## Before milestone 0 (bootstrap)

1. Complete [`SETUP-CHECKLIST.md`](SETUP-CHECKLIST.md)
2. Ratify `MANIFESTO.md` and `docs/DESIGN.md`
3. Scaffold minimal project structure (agent or human) so gate can exist
4. Define `loop/scripts/gate.sh` and prove it runs (even if tests are empty initially)

---

## Starting a milestone

### Step 1 — Write acceptance criteria

Copy `loop/ACCEPTANCE.md.template` → `loop/ACCEPTANCE.md`.

Every criterion must be **testable** or **machine-checkable**. If you cannot test it, move it to human review checklist, not loop acceptance.

### Step 2 — Planning mode

Switch the prompt via config — never overwrite prompt files:

```bash
# loop/config/loop.env
LOOP_PROMPT_FILE="loop/PROMPT-PLANNING.md"
```

```bash
./loop/scripts/loop.sh 3
```

Review `loop/IMPLEMENTATION_PLAN.md`. Regenerate until tasks are one-iteration sized.

### Step 3 — Switch to build mode and specialize the prompt

```bash
# loop/config/loop.env
LOOP_PROMPT_FILE="loop/PROMPT.md"
```

Then **specialize `loop/PROMPT.md` step 2 for this milestone**: add one or two lines naming
what this milestone's tests must genuinely exercise (the reference build did this every cycle —
e.g. "for the catalog: reserved-prefix isolation and validate-on-reopen; for DST: the
crash/recovery invariant under a seeded simulated filesystem"). Leave the guardrails (section
999) unchanged.

Update `loop/config/loop.env`:

- New `LOOP_COMPLETION_SENTINEL` (unique string per milestone)
- Remove stale `.loop/COMPLETE`

### Step 4 — Run

```bash
git checkout -b loop/milestone-1
./loop/scripts/loop.sh 50
```

**Watch iterations 1–10.** Common first-iteration fixes:

- Prompt too vague → sharpen step 2 in PROMPT.md
- Tasks too large → replan
- Gate too slow → split CI vs local gate (document in TOOLCHAIN)
- Agent commits without green → strengthen 999b

---

## During a milestone

| Do | Don't |
|----|-------|
| Monitor `loop/PROGRESS.md` and git log | Edit code while loop runs |
| Pause loop to fix spec/plan/prompt | Hand-fix agent code (steer inputs instead) |
| Check risky commits as they land | Assume green gate means correct design |

Pause loop: `Ctrl+C`. Resume: same command (same iteration counter resets from script start — note last completed iteration in PROGRESS).

---

## Closing a milestone

1. Agent created `.loop/COMPLETE` → **verify yourself**
2. Run gate on clean tree
3. Read highest-risk tests and PROGRESS decisions flagged for review
4. Check the fresh-context judge verdicts recorded in PROGRESS for subjective criteria
   (readability etc.) — see `.claude/agents/judge.md.template`
5. Update `loop/HANDOFF.md`, tag release if applicable
6. Merge branch

---

## Starting the next milestone

1. Amend `docs/DESIGN.md` only for **new locked decisions** (human)
2. New `loop/ACCEPTANCE.md`
3. Planning mode → new `IMPLEMENTATION_PLAN.md`
4. Repeat

---

## When to use dynamic workflows

See [`.claude/workflows/README.md`](../.claude/workflows/README.md).

Rule of thumb: if a **single checkbox** says "review all files in X", add workflow guidance to that task — not a separate milestone.

---

## Phase ordering template

Typical greenfield order (adapt in DESIGN.md):

| Phase | Focus |
|-------|--------|
| 0 | Toolchain, gate, empty scaffold |
| 1 | Core / proof of architecture |
| 2 | Primary differentiator feature |
| 3 | Secondary features / reach |
| 4 | Hardening (simulation, property tests, perf) |
| F | Docs, close-out, ACCEPTANCE verification |

LibreDB mapping: kv kernel → document → relational → catalog → DST.

---

## Token budget guidance

- Each iteration re-reads spec + plan + relevant code
- Long builds = hundreds of iterations — budget accordingly
- Cheaper models for planning regeneration; stronger models for guarded core tasks (set per `LOOP_MODEL` or agent config)
- Cursor research: match model to role ([blog](https://cursor.com/blog/scaling-agents))
