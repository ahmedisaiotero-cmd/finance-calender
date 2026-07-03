# SYNC Roadmap

**Sequencing:** `SYNC_ENGINE_ROADMAP.md` **supersedes this document** for what to build next. This file records module status, completed milestones, and historical context.

Every item should pass the **Sync Test** in `SYNC_VISION.md` and the gate question in `SYNC_ENGINE_MANIFESTO.md`:

> Does this improve the Sync Engine's ability to make trustworthy decisions?

Default prompt prefix: **Improve the Sync Engine's ability to make trustworthy decisions by…**

Build slowly. Choose trust over features. Choose calm over clever.

---

## Active direction

Sync is a **personal reasoning engine**. The product is **trust**.

| Surface | Role |
|---|---|
| **`/sync-lab`** | Teaching/evaluation — inspect reasoning, debug decisions |
| **Mobile prototype** | First engine client — renders Judgment output (Today, Memory, My Life) |
| **Legacy web routes** (Home, Calendar, Money, Health) | Historical MVP scaffolding — **not** current expansion targets |

Product/UI expansion (consumer polish, domain apps, integrations) is **deferred** until `SYNC_ENGINE_ROADMAP.md` Phase 3 exit criteria are met.

---

## Reasoning pipeline

Every input follows:

```
Input → Understanding → Memory Decision → Consequence Reasoning
  → Judgment → Response → Future Follow-up → Briefing Effect
```

Full spec: `SYNC_REASONING_SPEC.md`.

### Module status

| Stage | Status | Key modules |
|-------|--------|-------------|
| Input | Done | `lib/sync-capture/*`, `apply-capture-input.ts` |
| Understanding | Done | `meaning-engine.ts`, `memory-understanding.ts`, `importance-scoring.ts` |
| Memory Decision | Done | `memory-dedup.ts`, `memory-profile.ts`, `memory-aging.ts` |
| Consequence Reasoning | Done | `consequence-engine.ts`, `sync-consequences.ts`, `life-load.ts` |
| Judgment | **V1.5 implemented** | `decision-engine.ts` — `decideTodayPriorities`, `rankBriefConsequences` |
| Response | Implemented | `sync-engine.ts`, `SYNC_VOICE.md` |
| Future Follow-up | Partial | capture actions, `consequence-timing.ts` |
| Briefing Effect | Implemented | `briefing-composer.ts`, Today adapters |

Money, Health, Family, Work, and Relationships are **categories** — not agents or standalone products.

Judgment decides what matters. Response communicates it — preserving Judgment ordering, avoiding invented facts, knowing when silence is better.

---

## Historical — Phase 1 Believable MVP (complete)

*Legacy web scaffolding. Not the current product direction.*

Early work established shared UI primitives, timeline hooks, and demo data for Home, Calendar, Money, and Health. That infrastructure remains in the repo but is **not** the focus for new work.

### Done (historical)

- [x] Shared UI primitives (`components/sync/*`)
- [x] Compassionate copy foundation (`SYNC_VISION.md`)
- [x] Unified timeline hook and API
- [x] Prisma schema + seed for demo data
- [x] Legacy routes and redirects

Do not expand Calendar, Money, or Health as MVP surfaces unless explicitly requested.

---

## Phase 1.5 — Judgment / Decision Engine (largely complete)

*Goal: Today and Brief consume shared Judgment.*

- [x] Add `lib/intelligence/decision-engine.ts`
- [x] Today primary/supporting via `build-home-priorities.ts`
- [x] Profile-aware ranking with 1 primary + 2 supporting
- [x] Ranked candidate metadata and score breakdowns
- [x] `npm run test:intelligence`, `test:intelligence:all`, `npm run check`
- [x] Brief ranking via `rankBriefConsequences()` in Decision Engine
- [x] `build-today-view.ts` wired through Decision Engine
- [x] 100-memory stress corpus (`tests/decision-stress.test.ts`)

### Remaining consolidation

- [ ] Derive Pulse state from shared Judgment + Response — not separate precedence in `sync-pulse.ts`
- [ ] Expand weekly Trustworthy Decision Rate reviews per `SYNC_EVALUATION.md`

---

## Phase 1.75 — Intelligence Refinement (in progress)

*Goal: improve trustworthy decision rate before any product expansion.*

See `SYNC_ENGINE_ROADMAP.md` Phases 1–3 for active sequencing.

### 1. Judgment quality

- [x] 100+ memory stress test with cap, light exclusion, profile vs urgency
- [ ] Track Trustworthy Decision Rate weekly on reviewed corpus
- [ ] Convert failed review items to tests before production fixes

### 2. Universal understanding

- [ ] Vague vs specific disambiguation under stress
- [ ] Sensitive domain handling (health, money, relationships, identity)

### 3. Response (Sync Engine)

- [x] `runSyncEngine()` — metadata, voice preservation, ordering checks
- [ ] Gate explainability to lab/dev only consistently
- [ ] Voice cleanup for legacy compliance violations

### 4. Trust and explainability

- [ ] Weekly review process running (`SYNC_EVALUATION.md`)
- [ ] Inspect / correct / delete flows validated in lab + mobile client

### 5. Stress testing

- [x] 100-memory messy corpus
- [x] Quiet/stale and overloaded tomorrow scenarios
- [x] 20-file `test:intelligence:all` safety net

---

## Deferred — Product expansion

The following phases are **frozen** until `SYNC_ENGINE_ROADMAP.md` Phase 3 trust exit criteria are met. Do not start unless explicitly requested.

### Phase 2 — Identity & real accounts

- Supabase Auth, workspace scoping, RLS
- Recurring rules engine
- Budget limits from database

### Phase 3 — Category expansion (legacy plan)

*Superseded by engine-first direction.* Categories remain reasoning domains — not nav expansion targets.

~~Enable Career sidebar, calendar lenses, Home category snapshot rows~~ → deferred

### Phase 4 — Settings & personalization

- Settings page, focus preferences → deferred

### Phase 5 — Integrations

- Bank import, calendar sync, health platform read → deferred until manual capture judgment is trustworthy

Each future integration must ship with clear source labeling, calm error states, and no shame language.

---

## Engineering hygiene

- [ ] Retire unused dashboard widgets and duplicate content components
- [ ] Expand voice compliance coverage
- [ ] Compassionate empty/loading states where surfaces remain
- [ ] Performance: indexed timeline queries where database mode is used

---

## How to use this document

1. Read `SYNC_ENGINE_MANIFESTO.md` and `SYNC_ENGINE_ROADMAP.md` for **what to build next**.
2. Use **this file** for module status and completed milestone checkboxes.
3. Run `npm run check` before merging intelligence changes.
4. Add failed real-life examples to tests before fixing production logic when possible.
5. Update checkboxes when work ships.

---

## North star

Sync exists to make **trustworthy decisions** about what matters in a person's life.

When uncertain, choose the option that increases **trust** and makes life feel **calmer**.
