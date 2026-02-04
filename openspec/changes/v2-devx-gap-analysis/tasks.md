# v2 — DevX Tasks

## Phase 1: Onboarding and First Run

### T1: `clawde init` wizard (in-app)
- Create `.clawde/config.json` from prompts
- Detect/initialize OpenSpec + Beads
- Verify Git repo + show identity warnings
- **Deps:** none

### T2: Doctor/diagnostics command
- `clawde doctor` returns actionable checks:
  - agents connectivity
  - chatCompletions enabled
  - openspec/beads presence
  - write permissions
- **Deps:** T1

## Phase 2: Agent Runtime Adapters

### T3: Agent runtime abstraction
- Define `AgentRuntimeAdapter` runtime types: `openclaw`, `claude-code`, `codex/opencode`
- Normalize ping/connect/run
- **Deps:** T1

### T4: Claude Code adapter (PoC)
- Connect/run via local process adapter
- Provide minimal `/run` integration
- **Deps:** T3

## Phase 3: Skill Bootstrap

### T5: Repo-local `agent-context.md`
- Generate `.clawde/agent-context.md` from templates
- Include OpenSpec/Beads cheat sheet + safety rules + conductor rules
- **Deps:** T1

### T6: Priming handshake
- On agent connect, send the repo context + required skills references
- Show UI warnings for unprimed agents
- **Deps:** T3, T5

## Phase 4: Execution Loop

### T7: Implement `/run` task execution pipeline
- Validate assigned task + permissions
- Mark `in_progress`
- Spawn agent run w/ deterministic prompt
- Capture evidence bundle (logs, tests, notes)
- **Deps:** T3, T6

### T8: Review artifacts & evidence binding
- Surface evidence in Review Queue
- Connect approve/reject to artifact state
- **Deps:** T7

---

## Beads plan
Seed these as a separate epic after approval and stamp IDs back here.
