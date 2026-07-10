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
