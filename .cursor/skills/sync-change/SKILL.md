---
name: sync-change
description: >-
  Runs the Sync repository change workflow: preflight, optional architecture
  review, main-agent implementation, independent verification, and handoff.
  Invoke with /sync-change for product, intelligence, adapter, API, or
  validation changes in this repository.
disable-model-invocation: true
---

# Sync change workflow

Repository development workflow only. Do not add agents, SDKs, model APIs, n8n, or MCP servers to the Sync application.

The main Cursor Agent is the only implementation owner. Subagents inspect or verify; they do not edit. Do not invoke them merely because they exist.

Read `AGENTS.md`, `SYNC_WORKFLOW.md`, and `SYNC_VISION.md` first. Reuse existing Sync rules; do not contradict them.

## Phase A — Preflight

1. Check `git status`. Preserve all existing user changes. Never overwrite unrelated work.
2. Understand the requested outcome.
3. Inspect relevant existing code before proposing new code. Search shared intelligence and adapters first (`lib/intelligence/*`, `lib/sync-capture/*`).
4. Identify which Sync product pillar the change improves: Memory, Understanding, Consequences, Today, My Life, Goals, or Trust.
5. Identify the active pathway that currently owns the behavior.
6. State important risks or ambiguity.
7. If the change does not clearly support Sync’s mission, pause and explain rather than forcing implementation.

Sync is a personal reasoning engine and daily briefing, not a planner, generic dashboard, or chatbot-first product. Preserve **Memory → Understanding → Consequences → Decision/Judgment → Today**. Goals stay deferred as a product surface until `SYNC_ENGINE_ROADMAP.md` reaches that phase.

## Phase B — Decide whether delegation helps

Use the main agent alone for small, well-scoped changes.

Invoke `sync-architect` before implementation only when the task:

- Crosses intelligence, adapters, APIs, database, and UI boundaries
- Risks duplicating existing intelligence
- Changes architectural ownership
- Is ambiguous enough that implementation could go in multiple directions
- Affects authentication, privacy, permissions, or sensitive user data

`sync-architect` is read-only. It must not edit files, commit, or push.

## Phase C — Implementation

- The main agent makes all code edits.
- Produce the smallest coherent change that satisfies the request.
- Preserve established boundaries. Reuse shared intelligence and adapters before creating surface-specific or mobile-only logic.
- Avoid speculative abstractions and unrelated cleanup.
- Do not silently replace working behavior.
- Add realistic messy-life tests for changed behavior.
- Keep UI minimal. Avoid dashboards, productivity-page sprawl, unnecessary category tabs, excessive debug panels, and disconnected demo logic.
- Do not allow subagents to edit the same files concurrently.
- Never commit, push, alter credentials, change production data, or add dependencies unless the user explicitly requests it.

## Phase D — Verification

After every meaningful code change, invoke `sync-verifier` or perform equivalent independent verification if subagents are unavailable.

Verification must:

- Inspect the actual diff.
- Confirm the requested behavior is connected to the active product path.
- Look for duplicate or dead logic.
- Run the smallest relevant test first.
- Then run the appropriate repository validation command.
- Run iOS validation only when the change affects iOS, shared wrappers, or cross-platform behavior.
- Report warnings separately from failures.
- Never hide a failing result.

Documentation-only changes should receive a diff review and relevant lightweight checks without running unnecessary full builds.

Verified commands (from root `package.json` / `sync-ios/package.json`):

| Need | Command |
|---|---|
| Smallest intelligence check | `npm run test:intelligence` |
| Full intelligence suite | `npm run test:intelligence:all` |
| All tests | `npm run test:all` |
| Web validation | `npm run validate:web` |
| iOS validation | `npm run validate:ios` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Lint + core intelligence | `npm run check` |

`sync-verifier` must not implement fixes, edit source files, commit, or push.

## Phase E — Final handoff

Return:

- What changed
- Why it supports Sync’s mission
- Files changed
- Validation performed and exact results
- Any remaining warnings, partial behavior, or risks
- Whether the working tree is still uncommitted

Clearly distinguish functional work, partial/demo work, and deferred work. Never claim completion merely because code was written.
