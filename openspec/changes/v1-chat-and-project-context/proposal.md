# ClawDE v1 — Chat Control & Project Context

## Summary

Two foundational features that transform ClawDE from a static dashboard into a living development environment:

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
| ClawDE config | `.clawde/config.yaml` | Agent definitions, adapter settings |

If a source doesn't exist, that section shows an empty/setup state (not an error).

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
  config: ClawDEConfig;   // from .clawde/config.yaml
}
```

### Agent definitions

Agents are defined in `.clawde/config.yaml`:

```yaml
agents:
  - id: claude
    name: Claude
    provider: Anthropic
    model: claude-opus-4-5
    color: "#f97316"
    capabilities: [coding, architecture, review, documentation, git-write]
    connection:
      type: openclaw
      gateway: http://localhost:18789

  - id: codie
    name: Codie
    provider: OpenAI
    model: gpt-5.2
    color: "#06b6d4"
    capabilities: [coding, review, testing, refactoring]
    connection:
      type: openclaw
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

The chat supports both natural language and explicit commands:

| Command | Action |
|---------|--------|
| `/new <description>` | Create a new OpenSpec change |
| `/plan` | Run OpenSpec planning on current change |
| `/seed` | Import tasks from OpenSpec into Beads |
| `/assign <task> <agent>` | Assign a task to an agent |
| `/status` | Show current project status summary |
| `/approve <task>` | Approve a task in review |
| `/reject <task> [reason]` | Reject a task with feedback |
| `/run <task>` | Tell an assigned agent to start a task |

Natural language gets interpreted by the connected agent and mapped to these actions.

### Chat UI

- Collapsible panel (toggle with `Cmd+J` or sidebar button)
- Message history with agent/user distinction
- Streaming responses (SSE or polling)
- Command autocomplete (type `/` to see commands)
- Status indicators (agent connected/disconnected)
- Deep links in responses (task IDs → click to navigate to Task Graph node)

### Safety controls

- **Confirmation gates**: destructive actions (delete change, reject task, reassign) require explicit confirmation
- **Write ownership**: ClawDE enforces which agents can write to which paths (from config)
- **Rate limiting**: max N actions per minute per agent (configurable)
- **Audit trail**: every chat command creates an Event in the activity feed
- **Dry run mode**: `/plan --dry-run` shows what would be created without writing

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
