# v2 — DevX Gap Analysis (PoC → Real Software)

**Status:** Proposed
**Lead:** Codie
**Reviewer:** Claude

## Summary

A gap analysis of what’s still missing for ClawDE to be a practical daily driver for building **real software** with an agent swarm — without the chaos and coordination issues of a classic group chat.

This change focuses on:
- **Agent onboarding** (OpenClaw agents + Claude Code agents + others)
- **First-run workflow** (create the first change, plan, seed tasks, assign, run)
- **Skill distribution** (OpenSpec/Beads “skills” + repo conventions) 
- **Execution pipeline** (task → agent → artifacts/PR → review → merge)
- **Conductor / floor-control** (single mouth, queueing, handoffs)

> Note: This complements `openspec/changes/v2-real-data-and-conductor/` (which already targets real-data UI hydration + in-app conductor). This doc is the “end-to-end productization” view.

## Motivation

We now have a strong v1 foundation:
- repo-native state (OpenSpec/Beads/Git adapters)
- chat command surface (`/new`, `/plan`, `/seed`, etc.)
- Vercel SSR deployment

But to truly *use* ClawDE to build software, we need:
- predictable onboarding (no tribal knowledge)
- reliable agent connections + permission model
- an actual run loop (agents do work, produce diffs/evidence, and get reviewed)
- elimination of multi-agent chat failure modes (double-talk, interleaving, half-read)

## Gap Analysis

### A) First-run onboarding (project + repo)
**Current:** assumes `.clawde/config.json`, `openspec/`, `.beads/` exist or the user knows how to create them.

**Missing:**
- `clawde init` / onboarding wizard that:
  - creates `.clawde/config.json` (agents + defaults)
  - initializes OpenSpec (`openspec init`) or creates minimal folder structure
  - initializes Beads (`bd init`) and verifies it works
  - validates git repo presence and identity safety rules
- “Doctor” checks: actionable diagnostics + one-liners to fix.

### B) Agent onboarding + runtime adapters
**Current:** `/api/chat` can proxy to an OpenClaw gateway. Claude Code / other agents not yet integrated.

**Missing:**
- A unified **AgentRuntimeAdapter** interface that supports multiple runtime types:
  1) **OpenClaw gateway** (HTTP, streaming)
  2) **Claude Code** (local process / API) with a task runner contract
  3) **Codex CLI / OpenCode** (local process)
- Per-agent capabilities + permissions:
  - which agents can write where (repo paths)
  - who can run git operations
  - what requires confirmation gates

### C) Skill distribution (OpenSpec + Beads + house rules)
**Current:** humans/agents rely on out-of-band knowledge that “we use OpenSpec and Beads” and where to find skills.

**Missing:**
- A repo-local “skill bootstrap”:
  - `.clawde/agent-context.md` (concise rules + commands)
  - optional `.clawde/skills/` folder or references to shared skills dirs
  - per-agent system prompt template that points to OpenSpec/Beads workflows
- A mechanism to ensure every connected agent is “primed” consistently:
  - show a banner if an agent hasn’t acknowledged/loaded required context

### D) The execution loop (task → agent → review)
**Current:** commands can create OpenSpec changes/tasks and seed Beads. `/run` is still a placeholder.

**Missing:**
- A task execution protocol:
  - claim a task (`bd update --status in_progress --assignee ...`)
  - spawn agent work session with explicit inputs (task ID + acceptance criteria + links)
  - agent outputs **artifacts**:
    - commits/branch/PR (or patch)
    - evidence (tests run, screenshots, notes)
  - review gate in ClawDE:
    - approve/reject -> state updates
- A “work product” substrate:
  - where evidence lives (repo folder vs external links)
  - how diffs/PRs are surfaced in Review Queue

### E) Conductor / floor-control as product feature
**Current:** spec exists; some infrastructure exists; Discord pain still largely solved by *process* not *software*.

**Missing:**
- Enforced single speaker in the app (and later in Discord):
  - speaker lock + queue
  - explicit handoff
  - interrupt/cancel
  - one consolidated response per turn
- Consistent “turn semantics” across chat surfaces.

### F) Multi-project and workspace model
**Current:** single-project.

**Missing:**
- A project switcher/workspace model (future) OR a clear “run per repo” story.

## Success criteria (for “usable PoC”)

1) A new user can run:
   - `clawde init` and end up with working `.clawde/config.json`, OpenSpec, Beads, Git checks.
2) The chat can:
   - `/new` → `/plan` → `/seed` → `/assign` → `/run`
3) Agents can be onboarded in <5 minutes and show as “connected/ready”.
4) A completed task produces:
   - a diff/PR + evidence + a review item
5) Conductor prevents overlap / double responses.

## Non-goals (for this change)

- Full enterprise access controls
- Full multi-project support
- Full plugin ecosystem
