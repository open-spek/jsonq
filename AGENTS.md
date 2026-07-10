# AGENTS.md

Guidance for coding agents (Claude Code, Cursor, Codex, Gemini CLI, OpenCode, etc.) working in **jsonq**.

> Claude Code loads `CLAUDE.md` by default. Other agents should treat this file as equivalent.

## Start here

Fresh context every iteration is intentional. Progress lives in **files and git**, not chat memory.

Read, in order:

1. `loop/HANDOFF.md` — orientation (not authoritative)
2. `MANIFESTO.md` — intent and refusals
3. `docs/DESIGN.md` — frozen spec
4. `loop/LOOP-ENGINEERING.md` — loop discipline
5. `docs/ARCHITECTURE.md` — tour (when populated)

Authoritative build state: `loop/IMPLEMENTATION_PLAN.md` + `loop/PROGRESS.md` + git log.

## Gate (definition of done)

```bash
./loop/scripts/gate.sh
```

All loop commits require full gate green. See `docs/TOOLCHAIN.md`.

## Loop operation

- One task per iteration from `loop/IMPLEMENTATION_PLAN.md`
- TDD: test first, then implementation
- Honesty contract in `loop/PROMPT.md` section 999
- Completion: create `.loop/COMPLETE` only when `loop/ACCEPTANCE.md` fully satisfied

## Agent-specific notes

| Agent | Fresh context | Unattended flag |
|-------|---------------|-----------------|
| Claude Code | `claude -p "$(cat loop/PROMPT.md)"` | `--dangerously-skip-permissions` |
| Cursor | New agent session per iteration | Configure in `loop/config/loop.env` |
| Codex | {{your invocation}} | {{}} |
| Gemini CLI | {{your invocation}} | {{}} |

Configure `AGENT_CMD` in `loop/config/loop.env`.

## Conventions

- English only in repo artifacts
- No emoji in code/commits/docs
- One task, one commit, English message
- {{project-specific}}
