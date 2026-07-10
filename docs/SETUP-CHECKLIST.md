# Setup Checklist — before your first loop run

Complete every section. The loop is only as good as the inputs you give it.

---

## Phase 0 — Decide fit

Loop engineering works when:

- [ ] The project has a **verification oracle** (tests, typechecker, reference implementation, property tests)
- [ ] Tasks decompose into **small, test-first units** with mechanical "done" criteria
- [ ] A human has already made the **hard product and architecture decisions**
- [ ] You accept that **taste-only work** (visual design, marketing copy) does not belong in the loop

If any box is unchecked, resolve it before proceeding — or scope the loop to the testable subset only.

---

## Phase 1 — Vision and boundaries (human only)

- [ ] Copy `docs/BRAINSTORM.md.template` → `docs/BRAINSTORM.md` and complete the brainstorm (challenge assumptions before locking design)
- [ ] Copy `MANIFESTO.md.template` → `MANIFESTO.md` and fill every section
- [ ] Write explicit **"what we refuse"** list (scope control is the loop's best friend)
- [ ] Identify the **wedge** — one sentence on why this exists vs alternatives
- [ ] Record **deliberately rejected** alternatives (prevents the agent from re-litigating)

---

## Phase 2 — Frozen spec (human only)

- [ ] Copy `docs/DESIGN.md.template` → `docs/DESIGN.md`
- [ ] Lock decisions in a table (technology, architecture, API shape, reliability bar)
- [ ] Define **trust boundaries** (which files/modules are guarded vs open)
- [ ] Write **acceptance criteria** for milestone 1 (copy to `loop/ACCEPTANCE.md`)
- [ ] List **open questions** explicitly — agent may record new ones in PROGRESS, not silently decide product direction

---

## Phase 3 — Toolchain and gate (human only)

- [ ] Copy `docs/TOOLCHAIN.md.template` → `docs/TOOLCHAIN.md`
- [ ] Choose language, test runner, linter, formatter, build tool
- [ ] Implement a single **`gate` command** that runs typecheck + lint + test + build (adjust to stack)
- [ ] Verify gate passes on empty/minimal scaffold **before** the loop starts
- [ ] Copy `loop/scripts/gate.sh.example` → `loop/scripts/gate.sh`, wire to your stack, chmod +x
- [ ] Set `GATE_CMD` in `loop/config/loop.env`

Gate ordering matters: if size/bundle checks read `dist/`, build must run before them.

---

## Phase 4 — Agent orientation files

- [ ] Copy `CLAUDE.md.template` → `CLAUDE.md` (Claude Code) **or** `AGENTS.md.template` → `AGENTS.md`
- [ ] Set read order: HANDOFF → MANIFESTO → DESIGN → LOOP-ENGINEERING → ARCHITECTURE
- [ ] Document conventions (language, commit style, no emoji, etc.)
- [ ] Point to gate command and test commands

---

## Phase 5 — Loop files

- [ ] Copy all `loop/*.template` files to `loop/` (drop `.template` suffix)
- [ ] Customize `loop/PROMPT.md` — replace `jsonq`, gate command, project-specific guardrails
- [ ] Customize `loop/PROMPT-PLANNING.md` for planning mode
- [ ] Copy `loop/config/loop.env.example` → `loop/config/loop.env`
- [ ] Set `COMPLETION_SENTINEL` unique per milestone (e.g. `MYPROJECT-M1-DONE`)
- [ ] Add `.loop/` and agent log dirs to `.gitignore`

---

## Phase 6 — Planning mode (one loop run or interactive session)

- [ ] Point the agent at `loop/PROMPT-PLANNING.md` (set `LOOP_PROMPT_FILE` in `loop/config/loop.env` — do not overwrite `loop/PROMPT.md`)
- [ ] Agent compares `docs/DESIGN.md` to current code (empty repo = all greenfield)
- [ ] Agent produces `loop/IMPLEMENTATION_PLAN.md` with phased, ordered, test-first tasks
- [ ] Human reviews plan — **disposable**; regenerate if wrong
- [ ] Each task should be completable in **one iteration** (~one commit)

Task sizing guide:

| Too small | Just right | Too large |
|-----------|------------|-----------|
| "add import" | "FS seam + tests preserving behavior" | "implement entire auth system" |
| coordination cost > value | one commit, one gate run | will fail or fake progress |

---

## Phase 7 — Optional scale layer

For milestones with fan-out work (audit every file, migrate 200 files):

- [ ] Read `.claude/workflows/README.md`
- [ ] Copy relevant `.claude/agents/*.template` → `.claude/agents/`
- [ ] Add workflow guidance to `loop/PROMPT.md` section on when to use workflows vs single-task mode

---

## Phase 8 — Pre-flight

- [ ] `git status` clean (or only intentional scaffold commits)
- [ ] Agent logged in / API key set
- [ ] On a dedicated branch (e.g. `loop/milestone-1`)
- [ ] Iteration cap chosen (start with 20–50 for first milestone)
- [ ] You have 30–60 minutes to **watch the first 5–10 iterations**

---

## Phase 9 — Run

```bash
./loop/scripts/loop.sh 50
```

---

## Phase 10 — Milestone close (human verification)

- [ ] `.loop/COMPLETE` exists (agent created it deliberately)
- [ ] You run the gate yourself on a clean tree
- [ ] You read the **riskiest tests** and any PROGRESS decisions flagged for review
- [ ] Update `loop/HANDOFF.md`
- [ ] Tag or merge; start Phase 5–6 for next milestone

---

## When things go wrong

| Symptom | Fix the input, not the code |
|---------|----------------------------|
| Agent stubs / fakes tests | Sharpen honesty guardrails in PROMPT.md §999 |
| Agent stops early | Check completion marker logic; strengthen "one task" scope |
| Same task fails twice | Blocker in PROGRESS — human adjusts plan or spec |
| Agent re-litigates design | Add to DESIGN.md "deliberately rejected" |
| Loop stops iteration 1 | Agent quoted sentinel in prose — must use marker file only |
| Agent asks human questions | PROMPT must say: decide, record, commit, flag for review |

**Sit on the loop, not in it.**
