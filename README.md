# ClawDE — Claw Development Environment

> **Orchestration-first development environment for AI agent swarms.**
> Task graphs, spec-driven workflow, review-centric. The IDE paradigm, rethought.

## The Problem

Current AI-assisted IDEs are "VSCode + a chat window." They bolt AI onto a 40-year-old paradigm: file tree → editor → terminal. This works for single-agent assistance, but breaks down when you have multiple AI agents (different models, different capabilities) working together on complex features.

**What's missing:**
- No way to visualize what multiple agents are doing simultaneously
- No task dependency awareness — agents don't know what's blocked or ready
- No spec-driven workflow — agents just code, with no structured planning or verification
- No review gates — humans write code instead of reviewing agent output
- No identity/access management for multi-agent setups

## The Vision

ClawDE flips the paradigm: **the task graph is the primary view, not the code editor.**

```
Human declares intent
  → Specs define what to build
    → Task graph tracks dependencies
      → Agents work on ready tasks
        → Human reviews and approves
          → Verified and archived
```

Instead of an editor with AI bolted on, ClawDE is a **mission control dashboard** that sits alongside your terminal where agents run. You see what's happening, what's blocked, what needs review — and you direct the work.

## Status

🚧 **Early prototype** — We're building the spec and interactive prototype first, then growing it into an MVP.

## Stack

- **Frontend:** React + Next.js (web dashboard)
- **Workflow:** OpenSpec (spec-driven planning) + Beads (task dependency graph)
- **License:** MIT

## Philosophy

- **Orchestration-first:** The task graph is the center, not the file tree
- **Spec-driven:** Plan before you code, verify after
- **Review-centric:** Humans approve, agents execute
- **Model-agnostic:** Works with any AI provider
- **Git-aware:** Identity management, serialized writes, conflict prevention

## Contributing

This project is in early development. Watch or star to follow progress.

## License

MIT
