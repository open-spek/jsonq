# Template Feedback — dogfood log

> Written by the HUMAN observer while jsonq is built with the loop-engineering template.
> The loop agent does not edit this file. Every friction, gap, or pleasant surprise in the
> template goes here, then flows back into `~/projects/libredb/loop-engineering-template`.

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
- 2026-07-10 — gap (HIGH) — account usage limit hit mid-iteration: the `claude -p` process
  HUNG instead of exiting (74 minutes, zero file/log activity), so loop.sh's classify() never
  ran — it only inspects output after the process exits. The usage_limit branch is therefore
  unreachable for this failure shape. loop.sh needs a PER-ITERATION TIMEOUT (e.g. `timeout
  $LOOP_ITERATION_TIMEOUT` around the agent invocation, classified as transient/usage on
  expiry). Recovery was manual: kill processes, `git checkout` the half-done uncommitted work
  (fresh-context discipline made this safe — nothing committed mid-task), restart the loop.
- 2026-07-10 — friction — human's editor created `.vscode/` while the loop ran; the template's
  .gitignore does not cover editor dirs, so a loop `git add -A` could sweep it into a task
  commit — add `.vscode/` (and `.idea/`) to `.gitignore.template`.
