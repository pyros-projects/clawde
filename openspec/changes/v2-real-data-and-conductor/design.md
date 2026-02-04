# v2 — Design Notes

## 1) UI Store Hydration (finish T7 gap)

### Problem
The UI store still initializes from mock fixtures (`src/data/mock/*`). This makes the dashboard unreliable once server adapters/APIs are live.

### Design
Introduce a single “source of truth” loader for client state:

- `src/lib/state-loader.ts` (client-safe)
  - `fetchProjectState(): { project, tasks, changes, events, agents }`
  - uses `/api/project`, `/api/tasks`, `/api/changes`, `/api/events`
  - tolerant of partial failures (show empty states + warnings)

- `src/stores/app-store.ts`
  - boots with *empty* data (or minimal skeleton)
  - on mount: hydrates once via loader
  - on SSE update: re-hydrates (or selectively refreshes)

Keep mock fixtures only behind `CLAWDE_MOCK=true`.

### Acceptance checks
- No screen shows mock data when `CLAWDE_MOCK` is unset.
- “No config / no beads / no openspec” states are explicit.

## 2) SSE → Refresh

### Design
Use existing `useRealtimeUpdates(onRefresh)` hook:
- `onRefresh` calls `fetchProjectState()` and updates Zustand.
- fallback polling stays as-is.

### Implementation note
- Ensure SSE endpoint cleans up listeners/intervals on disconnect (already addressed).

## 3) Conductor / Floor Control (productized)

### Goal
Make the collaboration safety rules enforceable:
- single active “speaker”
- explicit baton pass
- queue and interrupt
- “one consolidated answer per turn”

### Approach (incremental)

**Phase A (in-app conductor):**
- Extend chat state to support:
  - `activeAgentId`
  - `speakerLock` (who has floor)
  - `queue[]` of pending requests
  - `pendingConfirmations[]` (token-based)
- Commands:
  - `clawde handoff <agent>`
  - `clawde queue "..."`
  - `clawde next`
  - `clawde interrupt`
  - `clawde confirm <token>` / `clawde cancel <token>`

**Phase B (Discord integration):**
- Design the interface as an adapter so a Discord relay can use it later.
- (May require OpenClaw gateway/channel middleware; keep as follow-up change if needed.)

## 4) Demo / README

Update capture scripts so the demo GIF shows the marquee loop. Minimum safe version:
- `/new` creates `openspec/changes/demo-chat-flow/`
- `/plan demo-chat-flow --dry-run` (preview tasks)
- `/seed demo-chat-flow --dry-run` (preview Beads import)

If we want a real graph mutation in the demo, do it in a dedicated “demo sandbox” repo, not the ClawDE repo.
