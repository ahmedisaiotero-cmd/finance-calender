# Sync Repository Guide

This document maps the repository structure for the Sync Foundation Release and clarifies ownership boundaries.

For mission, trust rules, and sequencing, read:

- `SYNC_VISION.md`
- `SYNC_WORKFLOW.md`
- `SYNC_INTELLIGENCE.md`
- `SYNC_ENGINE_MANIFESTO.md`
- `SYNC_ENGINE_ROADMAP.md`

## 0. Architecture framing (current naming preserved)

Sync is a personal intelligence engine for life.
The Sync app is the first product surface powered by that engine and remains the proving ground.

Current repository organization should be read through four layers:

1. **Sync Intelligence** (`lib/intelligence/*`, `lib/sync-capture/*`)
2. **Adapters** (`lib/mobile-prototype/*`, surface view-model builders, bridge modules)
3. **Surfaces** (`app/*`, `components/*`, `sync-ios/*`)
4. **Integrations** (optional external data connectors; user-approved only; no forced defaults)

This is a direction-alignment guide only. Do not move folders or rename modules by default.

## 1. Major folder structure

- `app/`
  - Next.js routes and UI surfaces.
  - Includes product routes and lab/debug routes (`app/sync-lab/*`).
- `components/`
  - Presentation components only.
  - Should not own intelligence logic.
- `lib/`
  - Shared system logic.
  - Core intelligence, capture, decision, sync engine, adapters.
- `lib/intelligence/`
  - Shared intelligence modules (meaning, consequences, decision, sync engine, life-graph).
- `lib/intelligence/life-graph/`
  - Foundation phases 2-11: observations, normalization, graph projection, learning, contexts, diagnostics.
- `lib/sync-capture/`
  - Capture parsing/normalization/input handling.
- `lib/mobile-prototype/`
  - Shared adapters for Home/brief/timeline/mobile shell consumption.
  - Name retained for stability; acts as adapter layer in current architecture.
- `sync-ios/`
  - Mobile client shell and thin re-exports to shared logic.
- `tests/`
  - Intelligence and surface stability tests.
- `prisma/`
  - Database schema/migrations (not part of foundation activation work).

## 2. End-to-end intelligence flow (foundation)

Capture entry:

- `lib/sync-capture/*`
- `lib/mobile-prototype/capture-brief-input.ts`
- `lib/sync-engine/input/process-sync-message.ts` (conversation/capture dry-run path)

Observations:

- `lib/intelligence/life-graph/observations.ts`

Normalization:

- `lib/intelligence/life-graph/normalize-observation.ts`

Life Graph projection:

- `lib/intelligence/life-graph/build-life-graph.ts`
- `lib/intelligence/life-graph/connect-life-graph.ts`

Learning Engine behavior:

- Continuity signals: `lib/intelligence/life-graph/continuity.ts`
- Continuity resolution: `lib/intelligence/life-graph/resolve-continuity.ts`
- Interpretation: `lib/intelligence/life-graph/interpretation.ts`
- Beliefs: `lib/intelligence/life-graph/beliefs.ts`
- Orchestration: `lib/intelligence/life-graph/reasoning-engine.ts`

Decision context preparation:

- `lib/intelligence/life-graph/decision-context.ts`

Narrative context preparation:

- `lib/intelligence/life-graph/narrative-context.ts`

Lab/debug diagnostics chain:

- `lib/intelligence/life-graph/life-graph-diagnostics.ts`
- Exported in `lib/intelligence/life-graph/index.ts`

## 3. Ranking and language boundaries

Decision ranking owner:

- `lib/intelligence/decision-engine.ts`

Narrative/response ownership:

- Response engine: `lib/intelligence/sync-engine.ts`
- Narrative context adapter: `lib/intelligence/life-graph/narrative-context.ts`

Boundary rule:

- Life Graph and Learning modules prepare context/evidence.
- They do not rank priorities.
- They do not change production copy directly.

## 4. Surface ownership

Product-facing surfaces:

- Today: `app/(app)/page.tsx` and mobile Today adapters in `lib/mobile-prototype/*`
- Memory/My Life/Pulse/Timeline routes and components under `app/` and `components/`

Lab/debug surfaces:

- `app/sync-lab/*`

Surface constraint:

- Surfaces render prepared intelligence.
- Surfaces do not own ranking/continuity/belief logic.
- Surfaces do not implement hidden intelligence forks.

## 5. Core vs adapter/presentation files

Core intelligence (edit with high caution):

- `lib/intelligence/decision-engine.ts`
- `lib/intelligence/sync-consequences.ts`
- `lib/intelligence/sync-engine.ts`
- `lib/intelligence/life-graph/*.ts`
- `lib/sync-capture/*`

Adapter/shim/presentation:

- `lib/mobile-prototype/*` (view-model adapters)
- `sync-ios/lib/engine/*` (thin shared re-exports)
- `components/*`, `app/*` route components

## 6. Files not to edit casually

- `lib/intelligence/decision-engine.ts` (ranking ownership)
- `lib/intelligence/life-graph/types.ts` (shared contracts)
- `lib/intelligence/life-graph/reasoning-engine.ts` (orchestration boundary)
- `lib/intelligence/life-graph/decision-context.ts` and `narrative-context.ts` (Activation boundaries)
- `tests/life-graph-phase1-regression.test.ts` and `tests/sync-engine-judgment-ranking.test.ts` (guardrails)

## 7. Legacy / prototype guidance

- Keep `app/sync-lab/*` as teaching/evaluation infrastructure.
- Keep `sync-ios/` as first client shell.
- Do not delete experimental-looking files without first proving:
  - no imports/use,
  - no test dependency,
  - no documented roadmap dependency.

If uncertain, mark as legacy in docs rather than deleting.

## 8. How future features should plug in

1. Add/extend evidence capture (Observation/Normalization) in shared `lib`.
2. Add/extend Learning behavior in `lib/intelligence/life-graph/*`.
3. Add tests first for messy real-life cases.
4. Expose to lab/debug adapters first.
5. Only after trust checks pass, wire to production adapters/surfaces.

Do not skip directly to UI changes.

Integration rule:

- External sources (calendar, finance, health, email/messages) are optional plugins/sources.
- Require explicit user consent, clear permissions, and privacy boundaries before use.
