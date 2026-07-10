# Template Feedback — dogfood log

> Written by the HUMAN observer while jsonq is built with the loop-engineering template.
> The loop agent does not edit this file. Every friction, gap, or pleasant surprise in the
> template goes here, then flows back into `~/projects/open-spek/loop (github.com/open-spek/loop)`.

## Format

- DATE — [friction | gap | works-well] — what happened — template change it suggests

## Log

- 2026-07-10 — friction — `scaffold.sh` copies the template's own README.md as the new
  project's README; had to replace it by hand — scaffold should generate a minimal project
  README stub instead.
- 2026-07-10 — friction — `examples/libredb/` is copied into every scaffolded project; noise
  for a non-libredb project, removed by hand — make the examples pointer opt-in.
- 2026-07-10 — gap — no `TEMPLATE-FEEDBACK.md` concept in the template itself; a dogfood/
  friction log seems broadly useful for early template adopters — consider adding an optional
  template file.
- 2026-07-10 — works-well — machine vs human placeholder split in scaffold worked exactly as
  designed: sentinel/gate substituted, `{{TYPECHECK_CMD}}`-style human fills remained visible
  in CLAUDE.md until the human wrote real commands.
- 2026-07-10 — friction — PROGRESS.md.template's starter log entry mixes placeholder classes
  in one line ("{{DATE}}" is human-fill but "{{MILESTONE_NAME}}" got machine-substituted),
  producing a half-filled sentence — starter entry should use human-fill placeholders only.
- 2026-07-10 — friction — planning mode has no self-stop: with max iterations 2, iteration 2
  re-ran planning on an already-fresh plan (honest "plan unchanged" commit, but a wasted
  iteration) — document "run planning with max 1 iteration" in MILESTONE-PLAYBOOK, or give
  planning mode its own completion marker.
- 2026-07-10 — friction — a planning run always ends with loop.sh exit 1 ("max iterations
  without completion marker"), which reads as failure to any wrapper/automation — planning
  runs need a distinct success signal.
- 2026-07-10 — works-well — the planning agent exceeded expectations: verified greenfield by
  inventory, mapped every ACCEPTANCE criterion to a task, assigned DESIGN's semantic gaps to
  specific build tasks as decisions-to-pin, and flipped LOOP_PROMPT_FILE back to build mode
  per the planning prompt's footer instruction.
- 2026-07-10 — gap (HIGH, FIXED same day) — account usage limit hit mid-iteration: the
  `claude -p` process HUNG instead of exiting (74 minutes, zero file/log activity), so
  loop.sh's classify() never ran — it only inspects output after the process exits. The
  usage_limit branch is therefore unreachable for this failure shape. Happened TWICE in one
  build. Fix applied to both jsonq and the template after the second occurrence:
  `timeout --foreground --kill-after=30 $LOOP_ITERATION_TIMEOUT` (default 1800s) around the
  claude invocation; exit 124 classified as transient (bounded retries, then stop for a
  human). Recovery both times was manual: kill processes, `git checkout` the half-done
  uncommitted work (fresh-context discipline made this safe — nothing committed mid-task),
  restart the loop.
- 2026-07-10 — open consideration — after a timeout/kill, the half-done iteration's
  uncommitted changes stay in the tree; the next fresh-context agent re-works the SAME top
  task over a dirty tree. Harmless in practice (same task, orient step reads state) but worth
  a template note; auto-reset was rejected as too dangerous (could wipe human edits).
- 2026-07-10 — gap — an iteration can commit its code but exit before ticking the plan /
  writing PROGRESS (observed at task 3.5): the next iteration detected it, committed the
  tick, then REWROTE HISTORY (`git reset --soft HEAD~2` + recommit) to restore
  one-task-one-commit. Trees verified identical, so no loss — but history rewrite inside an
  autonomous loop is unacceptable risk (breaks remotes/observers). PROMPT needs a guardrail:
  "never rewrite committed history; repair a missed tick with a forward-only docs commit."
  (Guardrail 999h added to jsonq and the template mid-run; no recurrence after.)

## Milestone close (M1 done — summary entries)

- 2026-07-10 — works-well — END-TO-END RESULT: M1 completed fully autonomously in 21 build
  iterations across 4 runner launches (3 usage-limit interruptions, zero code lost). 252
  runtime tests + 54 negative type locks at 100% line+function coverage; gate independently
  re-run green by the human; runtime semantics and a must-not-compile case independently
  smoke-tested. No hand-fixing of agent output at any point — all interventions were inputs
  (prompt guardrail, runner timeout) or process recovery (kill hung agent, discard
  uncommitted half-work).
- 2026-07-10 — works-well — the milestone-specialized PROMPT step 2 (type-layer RED
  discipline) visibly shaped behavior: the loop probe-verified its negative type tests
  against a loosened type (vacuity check) without being told to, mirroring its gate
  coverage probe.
- 2026-07-10 — works-well — the fresh-context judge agent worked as designed on first
  in-loop use (F.2): PASS WITH NOTES, one genuine prose-contradicts-code MEDIUM caught and
  fixed, one LOW declined with recorded reasoning.
- 2026-07-10 — works-well — the empty-plan/unmet-acceptance branch and gate-repair exception
  added to PROMPT were never needed, but the sweep task (4.1) resolved the line-budget
  tension exactly per the honesty contract: measured code-vs-comment lines, pinned an
  interpretation, flagged for human review, changed no code.
- 2026-07-10 — suggestion — LOOP_ITERATION_TIMEOUT default 1800s means a usage-limit hang
  costs up to 30 min before auto-recovery; consider 900s default, or document tuning it
  down for interactive dogfood runs.
- 2026-07-10 — friction — human's editor created `.vscode/` while the loop ran; the template's
  .gitignore does not cover editor dirs, so a loop `git add -A` could sweep it into a task
  commit — add `.vscode/` (and `.idea/`) to `.gitignore.template`.
