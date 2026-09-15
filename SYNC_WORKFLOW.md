# Sync Workflow Guardrails

Read this before making changes. Also read `SYNC_VISION.md`, `SYNC_PRINCIPLES.md`, `SYNC_VOICE.md` when language is involved, and `.cursor/rules/sync-product-workflow.mdc`.

## Before building

Every change must improve at least one of:

- **Trust**
- **Activity**
- **Passport**
- **Safety**
- **Memory** (evidence)
- **Understanding** (claims)
- **Consequences** (sharing/acting risk)
- **Judgment** (allow / deny / limit / ask)

If it does not improve one of these, **do not build it.**

Do not grow Today / My Life / Capture as the product. ChatGPT and Cursor apps are clients of the trust layer, not a chatbot product.

1. Reuse existing Sync intelligence before creating new logic.
2. Test with messy real-life examples.
3. Avoid dashboards, productivity-app patterns, widget overload, category sprawl, empty states, database-style interfaces, and chatbot experiences.

## Core promise

**One Sync account. Narrow permission. Evidence-labeled receipts.**

Sync is a user-controlled trust layer between a person and AI systems.
The website is the account and control center. MCP/OAuth plugins are doorways into that account.
Connecting a host is not the same as verifying everything that host does.

Canonical direction: `SYNC_TRUST_LAYER.md`.

## Intelligence pipeline

**Capture → Memory → Understanding → Consequence → Decision → Sync Engine → UI**

## Layered architecture (direction)

| Layer | Owns | Notes |
|-------|------|-------|
| Sync Intelligence | memory, life graph, reasoning, consequence detection, pattern intelligence, prioritization, narrative context | Core reusable product layer |
| Adapters | translation for Home, Life Timeline, My Life, Capture, area views, and future outputs (chat/voice/domain) | Keep thin and explicit |
| Surfaces | web app, mobile app, iOS shell, future dedicated apps | Present intelligence; do not re-rank |
| Integrations | OAuth/MCP doorways and outcome verifiers (GitHub first), auth/permissions, privacy boundaries | User-approved; not omniscient host observers |

Integration rule: connecting Sync inside a host requires that host’s app model. Sync must remain useful from its own site (grants, receipts, revoke) even when a host sends little.

**Next major milestone:** Phase T1 evidence ledger — persist `ActivityEvent` — then OAuth + GitHub + MCP per `SYNC_ENGINE_ROADMAP.md`.

| Layer | Question | Primary modules | Status |
|-------|----------|-----------------|--------|
| Memory | What happened? | `lib/sync-capture/*`, `lib/captured-items.tsx`, `memory-profile.ts`, `memory-aging.ts` | Implemented |
| Understanding | Why does it matter? | `meaning-engine.ts`, `memory-understanding.ts`, `importance-scoring.ts` | Implemented |
| Consequence | What changes? | `consequence-engine.ts`, `sync-consequences.ts` | Implemented |
| Decision | What matters today? | `decision-engine.ts`, `build-home-priorities.ts` adapter | V1.5 implemented |
| Sync Engine | How should Sync help the user understand this moment? | `sync-engine.ts` target, `SYNC_PRINCIPLES.md`, `SYNC_VOICE.md`, shared narrative/explainability rules | Next refinement |

Decision Engine owns ranking and allow/deny/approval scoring. Sync Engine owns voice. Today UI is frozen.

**Next major milestone:** persist Activity + Passport (Phase T1). Phase 1.75 briefing refinement is frozen unless it unblocks the trust loop.

## Primary user loop

1. User or agent requests context, permission, or records an action.
2. Sync labels evidence and decides allow / deny / ask.
3. Sync appends a receipt.
4. Another agent may receive a minimum-necessary answer.
5. User may revoke, correct, or delete without rewriting history.

Every feature should support this loop.

## Canonical app structure

1. **Control center** — connections, grants, receipts, revoke (quiet)
2. **`/sync-lab`** — inspect ledger and claims
3. **Legacy Home / My Life / Timeline / Capture / area views** — frozen proving ground

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

Sync is primarily a **trust layer** (permission, provenance, receipts). The intelligence pipeline stays; the product question is no longer the daily briefing.

Before implementing any change, ask:

> “Does this improve Sync’s ability to verify identity, permission, provenance, or action receipts without fabricating trust?”

If not, do not implement it yet.

Future prompts should begin with:

> “Improve Sync’s trust layer by…”

**Source of truth for this direction:**

- `SYNC_TRUST_LAYER.md` — product direction
- `SYNC_ENGINE_MANIFESTO.md` — mission, constitution, philosophy
- `SYNC_REASONING_SPEC.md` — required reasoning pipeline per input
- `SYNC_EVALUATION.md` — trust metrics and weekly review
- `SYNC_ENGINE_ROADMAP.md` — phased roadmap
