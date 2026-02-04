# v2 — DevX Design Notes

## 1) Onboarding UX: `clawde init` + Doctor

### Wizard steps
1) Detect repo root + show summary
2) Create `.clawde/config.json`:
   - agents list
   - default agent
   - safety policy (confirm gates)
3) OpenSpec setup:
   - if `openspec/` missing: offer to create minimal structure
   - optionally run `openspec init` if CLI present
4) Beads setup:
   - if `.beads/` missing: run `bd init`
   - verify `bd ready` works
5) Git identity safety checks:
   - show active git user + gh user
   - warn if mismatch for org rules
6) “Success screen”:
   - show first suggested command: `/new <idea>`

### Doctor checks
- gateway connectivity per agent
- `gateway.http.endpoints.chatCompletions` enabled
- required folders present
- ability to write to repo
- Beads executable present + functioning

## 2) Agent runtimes

### Runtime types
- `openclaw` (existing): HTTP proxy `/api/chat` -> gateway `/v1/chat/completions`
- `claude-code` (new): local runner adapter
- `codex` / `opencode` (new): local runner adapter

### Required contract (for any agent)
- `ping()` / `capabilities()`
- `runTask(taskId, context)` returns:
  - streaming log (optional)
  - produced artifacts (commits/patches)
  - evidence bundle

## 3) Skill bootstrap

### Repo-local context
- `.clawde/agent-context.md`
  - “how we work here”
  - OpenSpec/Beads command cheat sheet
  - how to format outputs (commit links, evidence)

### Priming
- On connect, ClawDE sends each agent a standard system message:
  - project root
  - where OpenSpec change folder is
  - what Beads IDs mean
  - safety rules + conductor rules

## 4) Execution loop (v2/v3)

### Minimal viable `/run`
- Requires:
  - task is assigned
  - confirms write permissions for chosen agent
- Actions:
  - marks task `in_progress`
  - creates a branch (optional)
  - spawns agent session with:
    - task title/AC
    - relevant OpenSpec artifact paths
    - repo guidelines

### Review gating
- `/approve` -> mark done + optionally merge
- `/reject` -> reopen/in_progress + attach reason

## 5) Conductor alignment

The conductor model should be identical whether the chat surface is:
- in-app
- Discord
- CLI

Meaning: same command names, same floor lock semantics, same queue.
