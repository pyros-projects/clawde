# ClawDE v1 — Tasks

## Phase 1: Project Context Foundation

### T1: ProjectContext type and discovery
- Define `ProjectContext` interface in `src/lib/types.ts`
- Implement `discoverProject(root: string)` — scans for `.git/`, `openspec/`, `.beads/`, `.clawde/`
- Returns capabilities (hasGit, hasOpenSpec, hasBeads) and resolved config
- All adapter interfaces gain `projectRoot` parameter
- **Deps:** none

### T2: ClawDE config file
- Define `.clawde/config.yaml` schema (agents, settings, adapters)
- Parser with validation and defaults
- Create example config for ClawDE's own repo
- **Deps:** T1

### T3: File-based OpenSpec adapter
- Implement `SpecAdapter` that reads `openspec/changes/*/` directories
- Parse proposal.md, specs, design docs, tasks.md per change
- Map to existing `Change` and `Artifact` types in the store
- Detect stale artifacts (modified time comparison)
- **Deps:** T1, T2

### T4: File-based Beads adapter
- Implement `TaskGraphAdapter` that reads Beads state (`bd list --json`, `bd deps --json`)
- Map Beads tasks to existing `Task` type
- Extract dependency edges for the DAG
- Handle "no beads" gracefully (empty task list)
- **Deps:** T1, T2

### T5: Git adapter
- Implement `VCSAdapter` that reads git log, diff, and branch info
- Map commits to `Event` entries (commit events in activity feed)
- Extract diffs for the Review Queue (real diffs, not mock)
- Author mapping: git author → agent ID (via config)
- **Deps:** T1, T2

### T6: File watcher service
- Watch `openspec/`, `.beads/`, `.git/refs/`, `.clawde/` for changes
- Debounce and batch updates (100ms window)
- Trigger adapter re-reads on relevant file changes
- Update Zustand store reactively
- **Deps:** T3, T4, T5

### T7: Replace mock data with adapter reads
- Store initialization calls adapters instead of importing mocks
- Graceful fallback: if no real data found, show empty states (not mock data)
- Keep mock data as dev fixtures (env flag: `CLAWDE_MOCK=true`)
- **Deps:** T3, T4, T5, T6

## Phase 2: Server Layer

### T8: Next.js API routes / server actions
- Set up API layer for server-side file operations
- Routes: `GET /api/project` (context), `GET /api/tasks`, `GET /api/changes`, `GET /api/events`
- Server-side adapter reads (not client-side filesystem access)
- **Deps:** T7
- **Note:** This requires reverting `output: 'export'` to standard Next.js SSR. GitHub Pages deploy becomes Vercel/self-hosted.

### T9: Server-sent events (SSE) endpoint
- `GET /api/events/stream` — SSE endpoint for real-time updates
- File watcher pushes changes to SSE stream
- Client subscribes and updates store
- Fallback: polling every 2s if SSE fails
- **Deps:** T6, T8

## Phase 3: Chat Interface

### T10: Chat UI panel
- Collapsible right-side panel (toggle: `Cmd+J` or sidebar button)
- Message list with user/agent distinction
- Input field with send button
- Command autocomplete (prefix `/`)
- Markdown rendering in agent responses
- Deep links: task IDs and change IDs are clickable → navigate to relevant screen
- **Deps:** T8

### T11: Chat backend — agent connection
- Connect to agent via OpenClaw gateway (HTTP API)
- Send user messages, receive streaming responses
- Agent context: include project state summary in system prompt
- Handle connection failures gracefully (retry, offline indicator)
- **Deps:** T2, T8

### T12: Command parser
- Parse `/command arg1 arg2` syntax from chat input
- Command registry with validation and help text
- Map commands to adapter actions
- Natural language fallback: if not a `/command`, send to agent for interpretation
- **Deps:** T11

### T13: `/new` command — create change
- `/new <description>` creates an OpenSpec change directory
- Generates initial `proposal.md` from description (agent-assisted)
- File watcher picks up new change → appears in Spec Studio
- **Deps:** T3, T12

### T14: `/plan` command — generate tasks
- `/plan [change-id]` runs task decomposition on a change
- Agent reads the proposal, generates `tasks.md`
- Optionally: `--dry-run` to preview without writing
- **Deps:** T3, T12

### T15: `/seed` command — import to Beads
- `/seed [change-id]` parses tasks.md and creates Beads tasks with deps
- Runs `bd add` for each task, `bd dep` for edges
- File watcher picks up Beads changes → Task Graph updates
- **Deps:** T4, T12

### T16: `/assign` command
- `/assign <task-id> <agent-id>` assigns a task to an agent
- Updates Beads task metadata
- Creates assignment Event in activity feed
- **Deps:** T4, T12

### T17: `/approve` and `/reject` commands
- `/approve <task-id>` — moves task to done status
- `/reject <task-id> [reason]` — moves task back with feedback
- Updates Beads state + creates Event
- **Deps:** T4, T12

### T18: `/status` command
- Posts a summary of current project state to chat
- Tasks by status, agents by activity, pending reviews count
- Deep links to relevant screens
- **Deps:** T7, T12

## Phase 4: Safety & Polish

### T19: Confirmation gates
- Destructive commands require explicit confirmation in chat
- "Are you sure?" prompt with yes/no buttons
- Configurable: which actions need confirmation (in `.clawde/config.yaml`)
- **Deps:** T12

### T20: Audit trail
- Every chat command creates an Event with type `chat-command`
- Visible in Activity Feed with command details
- Links back to affected tasks/changes
- **Deps:** T10, T7

### T21: Empty states and onboarding
- When ClawDE opens in a repo with no config: guided setup flow
- "Create .clawde/config.yaml" wizard
- "Initialize OpenSpec" / "Initialize Beads" quick actions
- Each screen shows helpful empty states (not just blank)
- **Deps:** T7, T10

### T22: Deploy to Vercel
- Revert from static export to standard Next.js (SSR needed for API routes)
- Vercel deployment config
- Environment variables for agent gateway URLs
- **Deps:** T8

## Dependency DAG

```
T1 ──→ T2 ──→ T3 ──→ T6 ──→ T7 ──→ T8 ──→ T9
  │         ├→ T4 ──↗       ↗       ├→ T10 ──→ T11 ──→ T12
  │         └→ T5 ──↗               │                    ├→ T13
  │                                  │                    ├→ T14
  │                                  │                    ├→ T15
  │                                  │                    ├→ T16
  │                                  │                    ├→ T17
  │                                  │                    └→ T18
  │                                  │
  │                                  ├→ T20 (needs T10 + T7)
  │                                  ├→ T21 (needs T7 + T10)
  │                                  └→ T22
  │
  └→ T19 (needs T12)
```
