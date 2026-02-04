# v2 — Tasks

## Phase 1: Real UI State (finish T7 gap)

### T1: Create client state loader
- Add `src/lib/state-loader.ts` that fetches:
  - `/api/project` (project + agents)
  - `/api/tasks`, `/api/changes`, `/api/events`
- Handle partial failures (return empty arrays + error messages)
- **Deps:** none

### T2: Boot store from real data (no mocks by default)
- Change `app-store.ts` initial state to empty/skeleton (not mock fixtures)
- If `CLAWDE_MOCK=true`, keep current mock boot behavior
- Add `hydrateFromApi()` action that calls the loader and sets store state
- **Deps:** T1

### T3: Wire hydration into app lifecycle
- Call `hydrateFromApi()` on app mount
- Ensure initial render shows a clear loading/empty state
- **Deps:** T2

### T4: Verify empty states across screens
- Confirm each screen has explicit empty messaging when:
  - no `.clawde/config.json`
  - no `openspec/`
  - no `.beads/`
- Add missing empty states if needed
- **Deps:** T3

## Phase 2: Real-time Refresh

### T5: Wire SSE updates to store hydration
- Use `useRealtimeUpdates` with `onRefresh = hydrateFromApi`
- Add a small UI indicator for SSE status (connected/disconnected)
- **Deps:** T3

## Phase 3: Conductor / Floor Control (in-app)

### T6: Conductor state model
- Add chat/conductor state to store:
  - `activeAgentId`, `speakerLock`, `queue[]`, `inFlight`, `confirmations[]`
- Define deterministic state transitions
- **Deps:** T2

### T7: Implement handoff/queue/next/interrupt commands
- Add commands (accepted in both `/` and `clawde` forms):
  - `handoff`, `queue`, `next`, `interrupt`
- Enforce: one in-flight execution at a time
- **Deps:** T6

### T8: Confirmation tokens (typed confirm/cancel)
- Add token issuance + expiry
- `confirm <token>` / `cancel <token>`
- Gate multi-write actions (future-safe)
- **Deps:** T6

## Phase 4: Demo + Docs

### T9: Update demo capture to show marquee v2 loop
- Update `scripts/capture-demo.mjs` to show:
  - open chat
  - `/new demo-chat-flow ...`
  - `/plan demo-chat-flow --dry-run`
  - `/seed demo-chat-flow --dry-run`
- Ensure output is legible (pause timings)
- **Deps:** T3

### T10: README “new features” highlight block
- Add short bullets directly under hero media:
  - “Chat commands write OpenSpec + Beads artifacts”
  - “Repo-native state; no mocks by default”
  - “Conductor mode prevents overlap”
- Link to chat screenshots section
- **Deps:** T9

---

## Beads plan (for Claude to seed when ready)

Once this change is approved, create Beads issues mirroring T1–T10, wire deps as above, and stamp Beads IDs back into this `tasks.md`.

Also reconcile existing Beads state:
- `clawde-vu8` (v1-T23 Conductor / floor control) is still **open** → either close it as “superseded by v2” or move/merge it.
- `clawde-qpj` (v1-T24 HQ demo assets redo) is still **open** → likely close as **done** (assets shipped).
