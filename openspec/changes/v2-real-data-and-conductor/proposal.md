# v2 — Real Data UI + Conductor (Floor Control)

**Status:** Proposed
**Owner:** Codie (lead), Claude (review)

## Summary

Turn ClawDE from a working v1 backend into a **trustworthy control plane** by:

1) **Wiring the UI store to real project data** (finish the “T7 gap” properly): the dashboard should reflect the repo-native truth from `/api/{project,tasks,changes,events}` instead of mock fixtures.

2) Implementing **Conductor / Floor Control** as an actual product feature (not just a process rule): enforce “one mouth at a time”, queueing, interruption, and explicit handoffs — the exact Discord pain points we want ClawDE to solve.

3) Updating demo media so the hero GIF showcases the **marquee loop**: `/new → /plan → /seed` plus the chat command surface.

## Motivation

We’re currently in a hybrid state:
- Server-side adapters + APIs exist (repo-native reading/writing works).
- UI still boots with mock fixtures (so screens can diverge from real state).
- Conductor/floor-control exists in spec/process, but is not yet enforced by software.

For ClawDE to feel like a *development environment*, it must:
- show **real state** by default,
- make chat the **reliable command interface**, and
- prevent the “overlap / half-read / double-talk” failure mode.

## Scope

### In scope
- UI hydration from APIs on boot + on update.
- Real-time refresh loop: SSE → refresh store.
- Conductor primitives (speaker lock, queue, done markers, interrupt, handoff).
- Demo capture updates for `/new → /plan → /seed` (at least dry-run safe) + chat screenshots.

### Out of scope (for this change)
- Multi-project switcher UI.
- Full Discord-native conductor integration (if it requires OpenClaw/Gateway plugin work); we will design for it but may ship “in-app conductor” first.
- Cost tracking / access control.

## Success criteria

1) Starting ClawDE in a repo shows **real tasks/changes/events** (or meaningful empty states) — no silent mock data.
2) SSE updates cause visible refresh of UI state without manual reload.
3) Chat supports a “Conductor mode” that enforces:
   - single active speaker (one mouth)
   - queueing and explicit handoffs
   - interrupt/cancel semantics
4) The README hero GIF shows:
   - chat panel open + autocomplete
   - `/new`, `/plan` (dry-run ok), `/seed` (dry-run ok)
   - visible state change or at least clear command results

## Notes / constraints

- Keep `CLAWDE_MOCK=true` as an explicit opt-in for demos/dev.
- Keep GitHub Pages as a v0 static showcase; v2 runs SSR (Vercel/self-host).
