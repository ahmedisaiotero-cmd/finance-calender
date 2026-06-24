# Sync Workflow Guardrails

Read this before making changes. Also read `SYNC_VISION.md` and `.cursor/rules/sync-product-workflow.mdc`.

## Before building

Every change must improve at least one of:

- **Memory**
- **Understanding**
- **Consequences**
- **Today**
- **My Life**
- **Trust**

If it does not improve one of these, **do not build it.**

1. Reuse existing Sync intelligence before creating new logic.
2. Test with messy real-life examples.
3. Avoid dashboards, productivity-app patterns, widget overload, category sprawl, empty states, database-style interfaces, and chatbot experiences.

## Core promise

**Tell Sync what happened. Sync understands what it means.**

Sync is a life understanding system — not a planner, journal, notes app, productivity tool, or database.

The value of Sync should **increase as more life is captured**. The goal is understanding, not storage.

## Intelligence pipeline

**Memory → Understanding → Consequence → Decision**

| Layer | Question | Primary modules | Status |
|-------|----------|-----------------|--------|
| Memory | What happened? | `lib/sync-capture/*`, `lib/captured-items.tsx`, `memory-profile.ts`, `memory-aging.ts` | Implemented |
| Understanding | Why does it matter? | `meaning-engine.ts`, `memory-understanding.ts`, `importance-scoring.ts` | Implemented |
| Consequence | What changes? | `consequence-engine.ts`, `sync-consequences.ts` | Implemented |
| Decision | What matters today? | `briefing-composer.ts`, `build-home-priorities.ts` (partial) | **Missing shared layer** |

**Next major intelligence milestone:** `lib/intelligence/decision-engine.ts` — rank the 1–3 items that matter most today from many memories/consequences. Today UI and Pulse should consume it; they should not own ranking logic.

## Primary user loop

1. User tells Sync something.
2. Sync understands it.
3. Sync organizes it.
4. Sync connects it to existing context.
5. Sync surfaces it when relevant.
6. Sync learns patterns over time.

Every feature should support this loop.

## Canonical structure

1. **Today** — greeting, one insight, one short briefing, capture
2. **Memory** — what Sync remembers (interpreted, connected, aged)
3. **My Life** — what Sync knows about the user

## Build order

1. Shared intelligence / domain layer (`lib/intelligence/*`)
2. Tests
3. Mobile shell integration
4. Minimal UI
5. Polish

When adding ranking or briefing logic, put it in the shared intelligence layer first — not in page components or mobile-only helpers.

## Memory intelligence (internal)

Every memory has: Area, Type, Importance/Weight, Time relevance, Confidence, Potential future meaning, Thread, Aging.

Users should not manage categories. Sync determines them.

## Do not expand until core is magical

Deprioritize: goals, productivity systems, streaks, analytics, advanced settings, additional life areas.

Focus: Capture, Memory, Understanding, Consequences, **Decision**.

## Definition of done

- Supports the Sync vision
- Reuses shared modules
- Includes tests
- Reduces clutter
- Does not turn Sync into a dashboard
