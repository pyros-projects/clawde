# ClawDE v0 — Tasks

## Phase 1: Scaffold (v0.1)

### T1: Initialize Next.js project
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router, ESLint
- Configure dark theme defaults in Tailwind config
- Set up project structure: `src/app/`, `src/components/`, `src/lib/`, `src/data/`
- **Deps:** none

### T2: Define core data types
- Create `src/lib/types.ts` with all entity interfaces: Task, Artifact, Evidence, Agent, Event, Change
- Create adapter interfaces: TaskGraphAdapter, SpecAdapter, VCSAdapter, AgentRuntimeAdapter
- **Deps:** T1

### T3: Create mock data layer
- Create `src/data/mock/` with realistic JSON fixtures for all entities
- Implement mock adapters that return fixture data
- Include: 3 agents (different models), 12-15 tasks with DAG dependencies, 2 active changes with artifacts, event stream with ~30 events, evidence entries for 2-3 completed tasks (commitSha, test output)
- **Deps:** T2

### T4: Set up routing and layout shell
- App layout: sidebar nav + main content area
- Routes: `/` (Mission Control), `/tasks` (Task Graph), `/review` (Review Queue), `/specs` (Spec Studio), `/agents` (Agent Registry)
- Cmd+K command palette stub
- Responsive sidebar (collapsible)
- **Deps:** T1

### T5: Design system foundations
- Color palette (CSS variables): dark base, accent colors for status states
- Typography: distinctive display font + refined body font (per frontend-design skill)
- Status color mapping: ready=cyan, in-progress=amber, blocked=red, done=green, review=purple
- Component primitives: Card, Badge, StatusDot, Panel
- **Deps:** T1

## Phase 2: Mission Control (v0.2)

### T6: Agent status cards
- Card per agent: name, model, provider, status indicator, current task (if any)
- Animated status dot (pulse for working, static for idle, flash for blocked)
- Click to expand → agent details
- **Deps:** T3, T5

### T7: Activity feed
- Timestamped event stream, auto-scrolling
- Event type icons (commit, task-claimed, review-requested, status-change)
- Agent avatar/color coding per event
- "Now" indicator at top
- **Deps:** T3, T5

### T8: Quick stats bar
- Tasks: open / in-progress / in-review / blocked / done
- Completion percentage with progress bar
- Active agents count
- Current change/feature name
- **Deps:** T3, T5

### T9: Task graph mini-map
- Small DAG preview on Mission Control (click → full Task Graph)
- Colored nodes by status
- Simplified layout (no labels, just topology)
- **Deps:** T3, T5

## Phase 3: Task Graph (v0.3)

### T10: Interactive DAG visualization
- Full-screen DAG using React Flow or D3
- Nodes = tasks (colored by status, labeled with title)
- Edges = dependency arrows
- Zoom, pan, fit-to-screen
- DAG view is client-only component (no SSR — avoids React Flow/D3 hydration issues)
- **Deps:** T3, T5

### T11: Task detail panel
- Click node → slide-out panel with: title, description, status, assignee, dependencies, evidence list
- Spec link (clickable → Spec Studio)
- Status change buttons (claim, start, complete, request-review) — update Zustand state + append Event for real-time feel
- Evidence section always visible (empty state: "No evidence yet")
- **Deps:** T2, T10

### T12: Filter and highlight
- Filter by: status, agent, change/feature
- "Ready" queue highlight (tasks with all deps met)
- Critical path highlight
- **Deps:** T10

## Phase 4: Review Queue (v0.4)

### T13: Review list
- List of tasks in "review" status
- Per item: task title, agent who completed it, time since submitted, spec reference
- Sort by: oldest first, priority, agent
- **Deps:** T3, T5

### T14: Diff viewer
- Side-by-side or unified diff view (mock diffs)
- Syntax highlighting
- File-by-file navigation
- **Deps:** T13

### T15: Approve/reject flow
- Approve button (→ moves task to done)
- Request changes (→ moves task back to in-progress with comment)
- Reject (→ moves task to blocked with reason)
- Batch approve for clean implementations
- **Deps:** T13, T14

### T16: Evidence panel
- Test output display
- Agent reasoning/explanation
- Commit info
- Spec requirement cross-reference
- **Deps:** T13

## Phase 5: Stubs + Polish (v0.5)

### T17: Spec Studio stub
- Route exists, shows change list with artifact pipeline visualization
- "Coming soon" state for interactive editing
- Pipeline diagram: Proposal → Specs → Design → Tasks (artifacts) and Implementing → In Review → Verified → Archived (states)
- **Deps:** T4, T5

### T18: Agent Registry stub
- Route exists, shows agent list with connection status
- Basic agent cards (model, provider, capabilities)
- "Coming soon" for configuration/access controls
- **Deps:** T4, T5

### T19: Keyboard shortcuts
- Cmd+K → command palette (navigate screens, filter tasks, quick actions)
- Number keys 1-5 → switch screens
- Arrow keys → navigate task list/review list
- **Deps:** T4

### T20: Visual polish
- Page transition animations
- Loading states
- Status change micro-animations
- Consistent spacing and alignment pass
- **Deps:** T6-T18

## Phase 6: Ship (v0.6)

### T21: README and documentation
- Update README with screenshots
- Add "Getting Started" (clone, install, run)
- Architecture overview for contributors
- **Deps:** T20

### T22: Deploy demo
- Vercel deployment for shareable demo URL
- OG image / social preview
- **Deps:** T21
