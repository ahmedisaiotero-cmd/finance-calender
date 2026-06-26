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
- **Communication**

If it does not improve one of these, **do not build it.**

1. Reuse existing Sync intelligence before creating new logic.
2. Test with messy real-life examples.
3. Avoid dashboards, productivity-app patterns, widget overload, category sprawl, empty states, database-style interfaces, and chatbot experiences.

## Core promise

**Tell Sync what happened. Sync understands what it means.**

Sync is a life understanding system — not a planner, journal, notes app, productivity tool, or database.

The value of Sync should **increase as more life is captured**. The goal is understanding, not storage.

## Intelligence pipeline

**Memory → Understanding → Consequence → Decision → Communication**

| Layer | Question | Primary modules | Status |
|-------|----------|-----------------|--------|
| Memory | What happened? | `lib/sync-capture/*`, `lib/captured-items.tsx`, `memory-profile.ts`, `memory-aging.ts` | Implemented |
| Understanding | Why does it matter? | `meaning-engine.ts`, `memory-understanding.ts`, `importance-scoring.ts` | Implemented |
| Consequence | What changes? | `consequence-engine.ts`, `sync-consequences.ts` | Implemented |
| Decision | What matters today? | `decision-engine.ts`, `build-home-priorities.ts` adapter | V1.5 implemented |
| Communication | How should Sync say this? | Sync copy, briefing, and future shared communication rules | Next refinement |

Decision Engine v1.5 is profile-aware, returns ranked candidate metadata, and has basic intelligence validation scripts. Today UI consumes the shared engine; Daily Brief and Pulse consolidation remain later work.

**Next major intelligence milestone:** Phase 1.75 Intelligence Refinement — improve the brain of Sync before adding new pages or integrations.

Phase 1.75 focuses on:

- **Decision Quality:** reliably choose the 1–3 memories/consequences that matter most today from many possible inputs.
- **Universal Understanding:** recognize events, tasks, worries, goals, relationships, preferences, routines, money details, health signals, family context, ideas, emotions, commitments, vague life notes, and non-calendar captures.
- **Communication Engine:** decide how Sync should say things clearly, specifically, respectfully, positively, calmly, and without vague/robotic/judgmental language.
- **Trust and Explainability:** explain why something surfaced, why it was remembered, why it faded, why it was not shown, and confidence when unsure.
- **Stress Testing:** validate messy real-life sets with 100+ memories, duplicates, vague notes, emotional entries, quiet weeks, overloaded weeks, cross-domain conflicts, ambiguous captures, and lightweight memories that should not surface.

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

Focus: Capture, Memory, Understanding, Consequences, **Decision**, and **Communication**.

## Definition of done

- Supports the Sync vision
- Reuses shared modules
- Includes tests
- Reduces clutter
- Does not turn Sync into a dashboard
