# ClawDE v1 — Chat Control & Project Context

## Summary

Three foundational features that transform ClawDE from a static dashboard into a living development environment:

1. **Project Context** — ClawDE reads state from the repo it's launched in (OpenSpec changes, Beads tasks, git history). Single-project v1, designed to extend to multi-project later.
2. **Chat Interface** — An embedded chat panel that serves as the primary command surface. Natural language in → specs, tasks, and agent assignments out.

## Motivation

The v0 prototype proves the visual paradigm works. But it's a static demo with mock data. To become a real tool:

- ClawDE needs to read **real project state** from the filesystem (not hardcoded mocks)
- Users need to **drive the workflow from chat**, not just observe it
- The chat → spec → task → agent → review loop must be a single continuous experience

## Feature 1: Project Context

### Design

ClawDE launches inside a repo: `cd my-project && clawde` (or `npx clawde`).

It discovers state from well-known paths:

| Source | Path | What it provides |
|--------|------|-----------------|
| OpenSpec | `openspec/` | Changes, artifacts, pipeline state |
| Beads | `.beads/` | Task graph, dependencies, status |
| Git | `.git/` | Commits, diffs, branches, authorship |
| ClawDE config | `.clawde/config.json` | Agent definitions, adapter settings |

If a source doesn't exist, that section shows an empty/setup state (not an error).

**Config format**: JSON (`.clawde/config.json`), not YAML. Simpler, no extra dependency, already implemented.

### Data flow

```
Filesystem (repo)
    ↓ reads
Adapters (file-based implementations)
    ↓ normalizes
Zustand Store (same shape as v0)
    ↓ renders
UI (unchanged components)
```

The key insight: **the store interface doesn't change**. We replace mock adapters with file-reading adapters. The UI components are untouched.

### Project-scoped design

Even in single-project mode, all internal interfaces accept a `projectRoot: string` parameter. This costs nothing now and prevents rewrites later.

```typescript
interface ProjectContext {
  root: string;           // absolute path to repo
  name: string;           // from package.json or directory name
  hasOpenSpec: boolean;
  hasBeads: boolean;
  hasGit: boolean;
  config: ClawDEConfig;   // from .clawde/config.json
}
```

### Agent definitions

Agents are defined in `.clawde/config.json`:

```json
{
  "agents": [
    {
      "id": "claude",
      "name": "Claude",
      "provider": "Anthropic",
      "model": "claude-opus-4-5",
      "color": "#f97316",
      "capabilities": ["coding", "architecture", "review", "documentation", "git-write"],
      "connection": { "type": "openclaw", "gateway": "http://localhost:18789" }
    },
    {
      "id": "codie",
      "name": "Codie",
      "provider": "OpenAI",
      "model": "gpt-5.2",
      "color": "#06b6d4",
      "capabilities": ["coding", "review", "testing", "refactoring"],
      "connection": { "type": "openclaw", "gateway": "http://localhost:19789" }
    }
  ]
}
      gateway: http://localhost:19789
```

### File watching

ClawDE watches the filesystem for changes (via `chokidar` or native `fs.watch`):
- OpenSpec files change → re-read changes/artifacts
- Beads state changes → re-read task graph
- Git refs change → re-read commit history
- Config changes → reload agent definitions

This gives "live" behavior without WebSockets for v1.

## Feature 2: Chat Interface

### Design

An embedded chat panel (collapsible, docked right or bottom) that serves as the command surface. The chat connects to an agent (default: the first agent in config) which interprets intent and drives the OpenSpec/Beads workflow.

### Chat → Action Pipeline

```
User types: "Add OAuth2 authentication with GitHub and Google"
    ↓
Agent interprets intent
    ↓
Agent creates: openspec/changes/add-oauth2/proposal.md
    ↓
Agent runs: openspec plan → generates specs, design, tasks
    ↓
Agent runs: bd seed → imports tasks into Beads graph
    ↓
Dashboard updates reactively (file watcher picks up changes)
    ↓
User sees new change in Spec Studio, new tasks in Task Graph
```

### Explicit commands

The chat supports both natural language and explicit commands. In Discord/CLI, use the `clawde` prefix to avoid collision with normal chat. In the web UI, `/` prefix also works.

| Command | Action |
|---------|--------|
| `clawde new <description>` | Create a new OpenSpec change |
| `clawde plan [change-id]` | Run OpenSpec planning on current change |
| `clawde seed [change-id]` | Import tasks from OpenSpec into Beads |
| `clawde assign <task> <agent>` | Assign a task to an agent |
| `clawde status` | Show current project status summary |
| `clawde approve <task>` | Approve a task in review |
| `clawde reject <task> [reason]` | Reject a task with feedback |
| `clawde run <task>` | Tell an assigned agent to start a task |
| `clawde help [command]` | Show help and examples |
| `clawde confirm <token>` | Confirm a destructive action |
| `clawde cancel [token]` | Cancel a pending action |
| `clawde handoff <agent>` | Transfer floor to another agent |
| `clawde queue "<request>"` | Add to backlog without interrupting |
| `clawde interrupt` | Stop current work cleanly |

Natural language gets interpreted by the connected agent and mapped to these actions.

### Chat UI

- Collapsible panel (toggle with `Cmd+J` or sidebar button)
- Message history with agent/user distinction
- Streaming responses (SSE or polling)
- Command autocomplete (type `/` to see commands)
- Status indicators (agent connected/disconnected)
- Deep links in responses (task IDs → click to navigate to Task Graph node)

### Safety controls

- **Confirmation gates**: destructive actions require explicit confirmation. In the web UI: confirm/cancel buttons. In Discord/CLI: typed `clawde confirm <token>` / `clawde cancel` (no reliance on inline buttons)
- **Write ownership**: ClawDE enforces which agents can write to which paths (from config)
- **Rate limiting**: max N actions per minute per agent (configurable)
- **Audit trail**: every chat command creates an Event in the activity feed
- **Dry run mode**: `/plan --dry-run` shows what would be created without writing

## Feature 3: Conductor / Floor Control

Solves the "Discord chaos" problem — multiple agents talking over each other, fragmented messages, interleaved responses.

### Design

One agent (the **Conductor**) is the sole "mouth" at any time. Other agents can work behind the scenes, but only the Conductor produces user-visible output.

### Floor control rules

| Rule | Behavior |
|------|----------|
| **Speaker lock** | Only one agent produces output at a time. Others buffer. |
| **Baton pass** | `clawde handoff <agent>` explicitly transfers the floor |
| **Completion marker** | Agent signals "done" → floor is released |
| **TTL / force release** | If an agent holds the floor > N minutes with no output, floor auto-releases |
| **Queue** | `clawde queue "<request>"` adds to backlog without interrupting current work |
| **Interrupt** | `clawde interrupt` / `clawde cancel` stops current work cleanly |
| **Next** | `clawde next` pulls next queued item |

### Consolidated output

The Conductor composes **one final response** per turn, even if multiple agents contributed. If output is large: short summary + links to artifacts (specs/tasks/diffs), not walls of text.

### Multi-turn wizard mode

When information is missing, the Conductor asks 1-3 tight questions and maintains state across turns. The user answers naturally, but every answer resolves to a deterministic action.

## Non-goals (v1)

- Multi-project switching UI (v2)
- Real-time WebSocket streaming between agents (v2 — use file watching for v1)
- CI/CD integration
- Plugin/extension system
- Voice input

## Success criteria

1. `cd my-project && clawde` opens the dashboard with real data from the repo
2. Typing "add user authentication" in chat creates a spec change and task graph
3. The task graph updates live as agents work (via file watching)
4. Reviews can be approved/rejected from the dashboard, feeding back into the graph
5. The entire flow works without leaving ClawDE
