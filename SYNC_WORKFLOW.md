# Sync Workflow Guardrails

Read this before making changes. Also read `SYNC_PRODUCT.md` first (identity), `SYNC_STANDARDS.md` (trust), then `SYNC_VISION.md` (experience), `SYNC_PRINCIPLES.md`, `SYNC_VOICE.md` when language is involved, and `.cursor/rules/sync-product-workflow.mdc`.

## Before building

Every change must improve at least one of:

- **Context** (what is true about the user; user-controlled)
- **Reasoning** (Memory, Understanding, Consequences, Judgment, Response)
- **Proof** (Activity, Passport — what AI saw, decided, did)
- **Trust / Safety** (inspect, correct, delete)

Today, My Life, and Briefings are **outputs**. If the change only improves those screens, **do not build it** unless it proves one of the layers above.

1. Reuse existing Sync intelligence before creating new logic.
2. Test with messy real-life examples.
3. Avoid dashboards, productivity-app patterns, widget overload, category sprawl, empty states, database-style interfaces, and chatbot experiences.

## Core promise

**Sync is a personal AI context and trust layer.**

It builds an accurate, user-controlled understanding of your life, helps AI make better decisions, and keeps a verifiable record of what AI systems saw, decided, and did.

The app may present a calm briefing as one output. That briefing is not the product.
Sync is not a planner, journal, notes app, productivity tool, or database.

The value of Sync should **increase as more life is captured and as proof of AI action becomes inspectable**. The goal is trusted context, not storage and not a better Today page.

## Intelligence pipeline

**Capture → Memory → Understanding → Consequence → Decision → Sync Engine → UI**

## Layered architecture (direction)

| Layer | Owns | Notes |
|-------|------|-------|
| Sync Intelligence | memory, life graph, reasoning, consequence detection, pattern intelligence, prioritization, narrative context | Core reusable product layer |
| Adapters | translation for Home, Life Timeline, My Life, Capture, area views, and future outputs (chat/voice/domain) | Keep thin and explicit |
| Surfaces | web app, mobile app, iOS shell, future dedicated apps | Present intelligence; do not re-rank |
| Integrations | optional external connectors (calendar, finance, health, email/messages), auth/permissions, privacy boundaries | User-approved plugins/sources only |

Integration rule: external sources are optional. Sync must remain useful through manual capture alone.

| Layer | Question | Primary modules | Status |
|-------|----------|-----------------|--------|
| Memory | What happened? | `lib/sync-capture/*`, `lib/captured-items.tsx`, `memory-profile.ts`, `memory-aging.ts` | Implemented |
| Understanding | Why does it matter? | `meaning-engine.ts`, `memory-understanding.ts`, `importance-scoring.ts` | Implemented |
| Consequence | What changes? | `consequence-engine.ts`, `sync-consequences.ts` | Implemented |
| Decision | What matters today? | `decision-engine.ts`, `build-home-priorities.ts` adapter | V1.5 implemented |
| Sync Engine | How should Sync help the user understand this moment? | `sync-engine.ts` target, `SYNC_PRINCIPLES.md`, `SYNC_VOICE.md`, shared narrative/explainability rules | Next refinement |

Decision Engine v1.5 is profile-aware, returns ranked candidate metadata, and has basic intelligence validation scripts. Decision decides what matters and must own ranking. The Sync Engine decides how Sync helps the user understand those decisions; it must preserve Decision ordering, avoid inventing facts, support continuity across days and weeks, and know when silence is better than saying more. Today UI consumes the shared Decision Engine today; Daily Brief, Pulse, and Sync Engine consolidation remain later work.

**Next major intelligence milestone:** Phase 1.75 Intelligence Refinement — improve the brain of Sync before adding new pages or integrations.

Phase 1.75 focuses on:

- **Decision Quality:** reliably choose the 1–3 memories/consequences that matter most today from many possible inputs.
- **Universal Understanding:** recognize events, tasks, worries, goals, relationships, preferences, routines, money details, health signals, family context, ideas, emotions, commitments, vague life notes, and non-calendar captures.
- **Sync Engine:** translate Sync's intelligence into human understanding through voice, tone, confidence language, communication intent, surfacing reasons, explainability, narrative continuity, respectful coaching, silence/noise control, evidence-based personalization, and story arc.
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

## Canonical app structure

1. **Home** — what matters now
2. **My Life** — what Sync knows
3. **Life Timeline** — when it matters
4. **Capture** — how Sync learns
5. **Area views** — category-specific perspective from shared intelligence

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

Focus: Capture, Memory, Understanding, Consequences, **Decision**, and **Sync Engine**.

## Definition of done

- Supports the Sync vision
- Reuses shared modules
- Includes tests
- Reduces clutter
- Does not turn Sync into a dashboard

---

## Sync Engine Direction

**Source of truth for identity:** `SYNC_PRODUCT.md`.

Sync is becoming a **personal AI context and trust layer**. The reasoning engine is a supporting system. The app is a proving-ground output, not the destination.

All future Sync work must strengthen **Context, Reasoning, or Proof**, measured by **trustworthy decisions**.

Before implementing any change, ask:

> “Does this strengthen Sync as a personal AI context and trust layer?”

If it only improves a briefing surface, do not implement it yet.

Future prompts should begin with:

> “Improve Sync as a personal AI context and trust layer by…”

Do not build features for their own sake.

Do not rebuild around an abstract platform at the cost of unifying the existing pieces.

**Other sources of truth:**

- `SYNC_PRODUCT.md` — product identity
- `SYNC_STANDARDS.md` — technical trust (articles are evidence only)
- `SYNC_VISION.md` — experience contract
- `SYNC_ENGINE_MANIFESTO.md` — constitution
- `SYNC_REASONING_SPEC.md` — required reasoning pipeline per input
- `SYNC_EVALUATION.md` — trust metrics and weekly review
- `SYNC_ENGINE_ROADMAP.md` — phased sequencing (subordinate to identity)
