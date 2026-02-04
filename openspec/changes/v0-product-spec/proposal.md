# ClawDE v0 — Product Spec & Interactive Prototype

## Positioning

| | |
|---|---|
| **What it is** | An orchestration-first web dashboard for directing AI agent swarms — task graphs, spec artifacts, and review gates as the primary interface |
| **What it is NOT** | Another IDE, another kanban board, another chat sidebar. ClawDE is not trying to replace your editor — it's the orchestration/control plane *next to* your editor and terminal |
| **Why now** | Multi-agent workflows are real (Claude Code, Codex CLI, Gemini CLI), but every tool treats them as single-agent-with-chat. The orchestration layer doesn't exist yet |
| **Who it's for** | Developers running 2+ AI coding agents who need visibility into what's happening, what's blocked, and what needs review |
| **Key differentiator** | Task DAG + spec artifacts as first-class UI objects with review/verify gates — not kanban cards, not chat messages |

## Problem Statement

AI coding agents are powerful individually. But when you run multiple agents on the same project, you get:
- **Invisible work** — no way to see what each agent is doing right now
- **No dependency awareness** — agents don't know what's blocked or what unblocks what
- **No structured planning** — agents just code, with no spec → implement → verify pipeline
- **No review flow** — human writes code instead of reviewing agent output
- **Identity chaos** — which agent committed what? Which account? Merge conflicts?

Existing tools either have no visual layer (Claude Flow, Agency Swarm) or put the code editor at center (Cursor, JAT, Windsurf). The closest alternatives (ClawDeck, Mission Control) use kanban — which is the wrong abstraction for dependency-aware, spec-driven work.

## Prior Art — Why Insufficient

| Tool | Approach | Missing |
|------|----------|---------|
| **Cursor / Windsurf** | Editor + chat sidebar | Multi-agent, task graph, specs |
| **Claude Flow** | CLI orchestration, 60+ agents | No visual dashboard |
| **JAT** | Agentic IDE with Monaco editor | Still editor-centric |
| **ClawDeck** | Kanban for OpenClaw agents | No DAG, no specs, no verify |
| **Mission Control** | Next.js dashboard + kanban | No DAG, no spec artifacts |
| **GitHub Agent HQ** | Control tower for Copilot agents | Vendor-locked, no spec workflow |
| **Continue Mission Control** | Devtools → automated fixes/PRs | Not swarm orchestration, not spec+artifact-first |
| **CodeFRAME** | Autonomous multi-agent | No human-in-the-loop review |

## Vision — The Five Screens

ClawDE has five core views, organized around the workflow: **Plan → Execute → Review → Verify → Archive**.

### Screen 1: Mission Control (Home)
The primary dashboard. Shows:
- **Active agents** — who's running, what model, what they're working on, status (working/idle/blocked/waiting for review)
- **Task graph overview** — visual DAG of current work, colored by status (ready/in-progress/blocked/done/review)
- **Recent activity feed** — timestamped log of agent actions, commits, file changes
- **Quick stats** — tasks open, tasks in review, tasks blocked, completion %

### Screen 2: Task Graph
Interactive dependency graph (Beads-powered):
- **Nodes** = tasks, colored by status
- **Edges** = dependencies (what blocks what)
- **Click to expand** — see task details, assigned agent, related spec, evidence (commits, test results). Every node carries its evidence chain
- **"Ready" queue** — highlighted tasks with all dependencies met
- **Claim/assign** — assign a task to a specific agent or let auto-assign based on capability
- **Filter by** — agent, status, spec/feature, priority

### Screen 3: Spec Studio
Where planning happens (OpenSpec-powered):
- **Change browser** — list of active changes (feature branches / spec folders)
- **Artifact pipeline** — visual flow showing two layers:
  - **Artifacts:** Proposal → Specs → Design → Tasks (documents that exist on disk)
  - **States:** Implementing → In Review → Verified → Archived (workflow stages backed by evidence)
- **Each artifact is viewable/editable** — rich markdown editor for specs
- **Status indicators** — which artifacts exist, which are stale, which need review
- **"Generate tasks" action** — create Beads tasks from a spec's task list

### Screen 4: Review Queue
The human's primary work surface:
- **Pending reviews** — diffs, test results, agent explanations
- **Side-by-side view** — spec requirement vs. implementation
- **Approve / Request changes / Reject** — with comments
- **Evidence panel** — test output, lint results, agent reasoning
- **Batch actions** — approve multiple clean implementations at once

### Screen 5: Agent Registry
Configuration and monitoring:
- **Registered agents** — name, model, provider, capabilities, connection status
- **Agent history** — what has each agent worked on, success rate, average task time
- **Identity rules** — which GitHub account for which repo/org
- **Access controls** — which agents can write to which repos
- **Health monitoring** — uptime, error rate, cost tracking

## Core Data Model

The data model is the MVP bridge — mock it now, swap adapters later without rewriting UI.

### Entities

- **Task** — `id, title, status, deps[], priority, specLink, assignee, evidence[], createdAt, updatedAt`
- **Artifact** — `type (proposal|specs|design|tasks), path, content, lastUpdated, stale?, changeId`
- **Evidence** — `commitSha, prUrl, testRunOutput, screenshots[], agentId, timestamp`
- **Agent** — `id, name, provider, model, capabilities[], status (idle|working|blocked|review), currentTaskId, connectionStatus`
- **Event** — `id, type, payload, timestamp, agentId, taskId, correlationId` (append-only stream)
- **Change** — `id, name, status (active|verified|archived), artifacts[], taskIds[]`

### Adapter Interfaces (mock now, real later)

- **TaskGraphAdapter** — reads/writes task DAG (→ Beads in MVP)
- **SpecAdapter** — reads/writes spec artifacts (→ OpenSpec in MVP)
- **VCSAdapter** — git operations, diffs, PRs (→ GitHub API in MVP)
- **AgentRuntimeAdapter** — agent status, events, commands (→ OpenClaw gateway in MVP)

All UI components consume these interfaces, never the underlying implementation directly. Swapping mock → real is adapter replacement, not UI rewrite.

## Non-Goals (v0 Prototype)

- ❌ Actually running agents (we show mock/simulated agent events)
- ❌ Real git integration (we mock commits and diffs)
- ❌ Real Beads/OpenSpec CLI integration (v0 uses their schemas and concepts; MVP swaps in real adapters/CLIs)
- ❌ Authentication / multi-user (single-user dashboard)
- ❌ Mobile support (desktop web only)

## Design Principles

1. **Dark theme, mission-control aesthetic** — this is a control room, not a notes app
2. **Information density with hierarchy** — developers want data, not decoration, but density needs clear visual hierarchy to stay readable
3. **Keyboard-first** — Cmd+K command palette, shortcuts for common actions
4. **Real-time feel** — animations for state changes, live-updating activity feed
5. **No generic AI aesthetics** — distinctive design that looks intentionally crafted (see frontend-design skill)

## Technical Decisions

- **React + Next.js** (current stable at kickoff) — app router, server components where useful
- **Tailwind CSS** (current stable) — utility-first, dark theme
- **D3.js or React Flow** — for the task graph visualization
- **Zustand** — lightweight state management
- **Mock data layer** — JSON fixtures that match real Beads/OpenSpec schemas, swappable for real adapters later
- **Component architecture** — every screen is composable panels, reusable for MVP

## Success Criteria (v0)

1. Someone can open the prototype and understand ClawDE's vision in 60 seconds
2. All five screens are navigable with realistic mock data
3. Task graph is interactive (click nodes, see details, filter)
4. Review queue shows realistic diffs with approve/reject flow
5. Design is distinctive and memorable (not generic AI dashboard)
6. Codebase is structured for growth into MVP (real data adapters, component library)

## Milestones

**Strategy: Ship 3, frame 5.** The "wow" loop is Mission Control → Task Graph → Review Queue. Spec Studio and Agent Registry get stub UI with "coming soon" framing.

| Milestone | Deliverable | Timeframe |
|-----------|-------------|-----------|
| **v0.0** | Product spec (this document) + design direction | Day 1 |
| **v0.1** | Project scaffold (Next.js + Tailwind + routing + mock data + adapter interfaces) | Day 1-2 |
| **v0.2** | Mission Control screen (agent cards + activity feed + stats) | Day 2-3 |
| **v0.3** | Task Graph screen (interactive DAG visualization) | Day 3-4 |
| **v0.4** | Review Queue screen (diffs + approve/reject flow) | Day 4-5 |
| **v0.5** | Spec Studio + Agent Registry stubs + polish + keyboard shortcuts | Day 5-6 |
| **v0.6** | README + demo screenshots + share | Day 6-7 |
