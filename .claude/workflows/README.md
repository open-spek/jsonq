# Dynamic Workflows in Loop Engineering

When to use Claude Code **dynamic workflows** (or LangChain **dynamic subagents** / RLM-style orchestration) **inside** the outer test-gated loop.

## Default: do not use workflows for the outer loop

The outer loop (`loop/scripts/loop.sh`) already provides:

- Fresh context per iteration
- One task per commit
- File-backed progress
- Gate as backpressure

Replacing the outer loop with a mega-workflow loses determinism and makes failures harder to bisect.

## When workflows help (inside one iteration)

Use a workflow when **one plan task** requires structural fan-out:

| Scenario | Pattern |
|----------|---------|
| Audit every file in `src/` for X | Fanout and synthesize |
| Security findings need verification | Adversarial verification |
| Migrate 100+ files with same transform | Fanout (isolated copies if needed) |
| Find all flaky tests | Loop until done |
| Compare 3 architecture options | Generate and filter |

The iteration still ends with: **one task ticked, one commit, gate green**.

## Claude Code setup

1. Claude Code v2.1.154+ with dynamic workflows enabled (`/config`)
2. In `loop/PROMPT.md` section 1b, workflow use is already permitted
3. Trigger words: `workflow`, `ultracode`, or "use a workflow to..."

Example task text in IMPLEMENTATION_PLAN.md:

```markdown
- [ ] Audit all route handlers under src/routes/ for missing auth (use a workflow: one reviewer per file, adversarially verify findings, then implement fixes for confirmed issues only)
```

## Saving reusable workflows

After a successful run: `/workflows` → select run → `s` to save.

Locations:

- `.claude/workflows/` — project-shared (commit to git)
- `~/.claude/workflows/` — personal

Saved workflows become `/<name>` commands for the next milestone.

## Subagent definitions

Copy templates from `.claude/agents/` and customize:

| Agent | Role |
|-------|------|
| `explore` | Read-only codebase mapping |
| `test-writer` | TDD test author from acceptance criteria |
| `reviewer` | Adversarial review before merge-quality commit |
| `judge` | Fresh-context cold-read verdict on subjective criteria (readability), after mechanical gates pass |

Reference: [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [agent teams](https://code.claude.com/docs/en/agent-teams).

## LangChain / other stacks

Deep Agents pattern:

```javascript
const results = await Promise.all(items.map(item =>
  task({ description: `...`, subagentType: "reviewer", responseSchema: {...} })
));
```

Requires code interpreter middleware. See [Dynamic Subagents blog](https://www.langchain.com/blog/introducing-dynamic-subagents-in-deep-agents).

## Cursor multi-agent research

For **human-supervised** parallel work between milestones (not unattended loop):

- Planners explore and write tasks
- Workers execute one task each
- Judge decides continue/stop

See [Cursor: Scaling long-running autonomous coding](https://cursor.com/blog/scaling-agents).

Do not flatten planner/worker into peer self-coordination without hierarchy — Cursor's research showed risk-aversion and lock contention.

## Cost and limits

- Workflows spawn many agents → higher token use
- Claude Code: up to 16 concurrent agents, 1000 per run ([docs](https://code.claude.com/docs/en/workflows))
- Start with a **small slice** (one directory) before whole-repo workflow

## Anti-patterns

- Using a workflow to complete **multiple plan checkboxes** in one commit
- Skipping the gate because "the workflow already verified"
- Grep-ing completion sentinel in workflow output instead of `.loop/COMPLETE` file
- Running workflows as a substitute for DESIGN.md / ACCEPTANCE.md
