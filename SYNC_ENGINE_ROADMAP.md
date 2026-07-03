# Sync Engine Roadmap

This roadmap defines how Sync becomes a trusted personal reasoning engine.

It supersedes product-expansion sequencing in `ROADMAP.md` when the two conflict. Consumer surfaces wait until trust is earned.

Read alongside `SYNC_ENGINE_MANIFESTO.md`, `SYNC_REASONING_SPEC.md`, and `SYNC_EVALUATION.md`.

---

## North Star

**Trustworthy Decision Rate** — see `SYNC_EVALUATION.md`.

The UI is a lab until Phase 5. Do not expand tabs, dashboards, or domain apps before then.

---

## Phase 1: Stabilize the Lab

**Goal:** Make `/sync-lab` and the mobile prototype reliable teaching surfaces — not product polish.

- Keep `/sync-lab` minimal
- Fix build/hydration issues
- Reduce information overload
- Make debug decision-focused
- Keep advanced internals collapsed
- Preserve existing intelligence pipeline; no parallel ranking forks

**Exit criteria:**

- Lab loads consistently without hydration errors
- Decision metadata visible in debug without overwhelming normal view
- `npm run check` passes
- 100-memory stress test passes

---

## Phase 2: Teach the Engine

**Goal:** Improve reasoning with real inputs and human correction.

- Feed real personal inputs through capture → full pipeline
- Review what Sync understood at each reasoning stage
- Correct bad memory, consequence, and judgment decisions
- Add failed examples to test suites before fixing logic
- Document weekly review findings per `SYNC_EVALUATION.md`

**Exit criteria:**

- Weekly review process running
- Failed examples converted to tests within 48 hours
- TDR tracked week over week

---

## Phase 3: Evaluate Trust

**Goal:** Measure and improve trustworthy decision rate systematically.

- Measure Trustworthy Decision Rate on reviewed corpus
- Build memory / consequence / judgment test coverage by reasoning stage
- Track failures by pipeline stage (Input → Briefing Effect)
- Expand stress corpus as real failures appear
- Gate merges on `test:intelligence:all`

**Exit criteria:**

- TDR ≥ 85% on 50-item weekly review
- Failures categorized by stage with owning tests
- No uncategorized recurring failure for 2 weeks

---

## Phase 4: Private Alpha

**Goal:** Real users as teachers — not customers.

- **1 user first** (founder / builder)
- Then **5 trusted users**
- Users correct Sync; corrections become tests
- No marketing, no onboarding flows, no theme polish
- Lab + minimal mobile shell only

**Exit criteria:**

- Alpha users report “I trust what Sync surfaces” more often than not
- Correction loop works (inspect, edit, delete)
- Sensitive domains handled conservatively

---

## Phase 5: Product Surface

**Only after trust improves.**

- Refine consumer UI (Today, Memory, My Life)
- Consider Sync Life as a coherent surface
- Later consider Sync Health or Sync Money — **as reasoning domains, not dashboard apps**

Do not revisit Phase 5 until Phase 3 exit criteria are met.

---

## Explicitly Deprioritized Until Phase 5

- New main tabs
- Sync Health / Sync Money standalone apps
- Onboarding flows and themes
- Dashboards, analytics, charts, streaks
- Integrations (calendar sync, bank sync, health APIs)
- Chatbot-first experiences
- Productivity coaching and gamification

---

## Current Position

| Phase | Status |
|---|---|
| Phase 1: Stabilize the Lab | **In progress** |
| Phase 2: Teach the Engine | Starting (weekly reviews, stress tests) |
| Phase 3: Evaluate Trust | Partial (`test:intelligence:all`, decision-stress 100-memory) |
| Phase 4: Private Alpha | Not started |
| Phase 5: Product Surface | Deferred |

**Immediate focus:** Phase 1 + Phase 2 — lab stability, decision quality, failed-example → test loop.

---

## How This Relates to `ROADMAP.md`

`ROADMAP.md` describes historical MVP and intelligence architecture work. This document defines **what comes next**.

When planning work:

1. Read `SYNC_ENGINE_ROADMAP.md` for sequencing
2. Read `ROADMAP.md` for module status and completed milestones
3. If conflict: **engine trust wins over product expansion**
