# Sync Intelligence System

Sync is a **personal intelligence engine for life** — not primarily an app, planner, dashboard, or productivity tool.
The long-term product is the reusable intelligence layer and the trust it earns.
The Sync app is the **first product surface** powered by that engine. It remains the proving ground for shipping trustworthy decisions.

Before making changes, read:

- SYNC_WORKFLOW.md
- **SYNC_ENGINE_MANIFESTO.md**
- **SYNC_REASONING_SPEC.md**
- **SYNC_EVALUATION.md**
- **SYNC_ENGINE_ROADMAP.md**
- SYNC_VISION.md
- SYNC_PRINCIPLES.md
- SYNC_VOICE.md when communication or user-facing language is involved
- ROADMAP.md when relevant (module status; sequencing defers to `SYNC_ENGINE_ROADMAP.md`)

## Gate question

Every change must begin from:

> **Does this improve the Sync Engine’s ability to make trustworthy decisions?**

If the answer is no, do not implement it yet.

## Default prompt prefix

Future work should be framed as:

> **Improve the Sync Engine’s ability to make trustworthy decisions by…**

Then specify the reasoning stage, a messy real-life example, and the test that proves the improvement.

## Cursor Agent workflow

This is a **repository development workflow** only. Do not add agents to the Sync application runtime, install an AI SDK, call an external model API, add n8n, or add MCP servers as part of agent setup.

The main Cursor Agent is the **only implementation owner**. Follow `.cursor/skills/sync-change/SKILL.md` for modification requests. Invoke `/sync-change` when the complete procedure should be loaded explicitly.

Use at most two project subagents, and only when they help:

| Subagent | Role | When |
|---|---|---|
| `sync-architect` | Read-only architecture and mission analysis | Before implementation, only if the change is cross-boundary, ownership-shifting, duplication-prone, ambiguous, or touches auth/privacy/sensitive data |
| `sync-verifier` | Independent post-change validation | After every meaningful code change. If unavailable, the main agent must still perform equivalent independent verification |

Do not invoke subagents merely because they exist. Do not let subagents edit files, and never let them edit the same files concurrently. Small, well-scoped changes stay on the main agent.

### Operating rules

- Read and follow `SYNC_WORKFLOW.md` and `SYNC_VISION.md` before meaningful product or architecture changes.
- Treat Sync as a personal reasoning engine and daily briefing, not a planner, generic dashboard, or chatbot-first product.
- Preserve the intelligence sequence **Memory → Understanding → Consequences → Decision/Judgment → Today**. The full pipeline in `SYNC_REASONING_SPEC.md` implements this sequence; do not fork it.
- A requested product change must improve at least one of: **Memory, Understanding, Consequences, Today, My Life, Goals, Trust**. If none apply, pause and explain rather than forcing implementation. Goals remain a deferred product surface until `SYNC_ENGINE_ROADMAP.md` reaches that phase — do not build a Goals planner.
- Reuse shared intelligence and adapters before creating surface-specific or mobile-only logic.
- Keep UI minimal. Avoid dashboards, productivity-page sprawl, unnecessary category tabs, excessive debug panels, and disconnected demo logic.
- Add or update messy real-life tests for behavior changes.
- Never overwrite unrelated user changes.
- Never commit, push, alter credentials, change production data, or add dependencies unless the user explicitly requests it.
- Run appropriate validation before declaring work complete.
- Clearly distinguish **functional**, **partial/demo**, and **deferred** work. Never claim completion merely because code was written.

### Verified repository commands

Commands below are from root `package.json` and `sync-ios/package.json`. Do not invent scripts.

| Need | Command |
|---|---|
| Web validation | `npm run validate:web` |
| iOS validation | `npm run validate:ios` |
| Full web + iOS | `npm run validate` |
| Targeted intelligence (decision-engine core) | `npm run test:intelligence` |
| Full intelligence suite | `npm run test:intelligence:all` |
| All tests | `npm run test:all` |
| Lint + core intelligence | `npm run check` |
| Typecheck (root; excludes `sync-ios`) | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |

Focused Sync Engine suites also exist as `npm run test:sync-engine:*` (see root `package.json`). Run iOS validation only when the change affects iOS, shared wrappers, or cross-platform behavior. Documentation-only changes get a diff review and lightweight checks — not a full build.

## Engine-first priorities

- **Trust before features** — judgment quality beats new surfaces
- **Product/UI work is lower priority** until trust is proven (see `SYNC_ENGINE_ROADMAP.md` Phase 3 exit criteria)
- **`/sync-lab` is the teaching/evaluation surface**, not the product
- **The Sync app is the first product surface** — improve it by strengthening shared intelligence, not by adding page-local brains
- **Today is a briefing output of judgment**, not a feature playground — do not redesign or expand it unless explicitly requested
- **Failed decisions become evaluation/test cases before production fixes** whenever possible (see `SYNC_EVALUATION.md`)

## Product identity

Sync is not:

- a planner
- a dashboard
- a chatbot
- a productivity app with endless tabs
- a habit tracker, finance app, health app, notes app, or calendar skin

Sync is:

- a personal intelligence engine that captures life input, builds memory, understands meaning, reasons about consequences, detects patterns, and produces outputs
- a system that decides what deserves attention — and when to stay quiet
- a consequence engine with trustworthy judgment at its core

## Layered architecture (current direction)

1. **Sync Intelligence** — memory, life graph, reasoning, consequence detection, pattern intelligence, prioritization, narrative context
2. **Adapters** — translate intelligence into outputs for Home, My Life, Life Timeline, Capture, area views, and future chat/voice/domain outputs
3. **Surfaces** — web app, mobile app, iOS shell, and future dedicated apps that present outputs and handle interaction
4. **Integrations** — optional external connectors (calendar, finance, health, email/messages) with explicit user consent, authentication, and privacy boundaries

Rules:

- Intelligence should not be trapped inside UI components.
- App pages consume intelligence; they do not create their own brains.
- Integrations enrich Sync only after user approval.
- No hidden external data usage and no forced account connections.

## Core rule

Prefer intelligence over UI.

Do not add pages, dashboards, category sprawl, chatbot framing, or extra widgets unless **explicitly requested**.

Every change must improve at least one engine stage:

- Memory
- Understanding
- Consequences
- Judgment
- Briefing
- Safety
- Trust

A requested **product** change must improve at least one of: Memory, Understanding, Consequences, Today, My Life, Goals, or Trust. Goals product expansion waits until the intelligence foundation is stable (`SYNC_ENGINE_ROADMAP.md`).

Legacy surfaces Today and My Life consume engine output — improve them only when trust work requires it.

## Reasoning pipeline

Every user input follows this pipeline. Do not fork it.

```
Input
  ↓
Understanding
  ↓
Memory Decision
  ↓
Consequence Reasoning
  ↓
Judgment
  ↓
Response
  ↓
Future Follow-up
  ↓
Briefing Effect
```

Full stage definitions: `SYNC_REASONING_SPEC.md`.

### Code mapping

| Reasoning stage | Primary modules |
|---|---|
| Input | `lib/sync-capture/*`, `apply-capture-input.ts` |
| Understanding | `meaning-engine.ts`, `memory-understanding.ts`, `importance-scoring.ts` |
| Memory Decision | `memory-dedup.ts`, `memory-profile.ts`, `memory-weight.ts`, `memory-aging.ts` |
| Consequence Reasoning | `consequence-engine.ts`, `sync-consequences.ts`, `life-load.ts` |
| Judgment | `decision-engine.ts` (`decideTodayPriorities`, `rankBriefConsequences`) |
| Response | `sync-engine.ts`, `SYNC_VOICE.md` |
| Future Follow-up | capture actions, `consequence-timing.ts` |
| Briefing Effect | `briefing-composer.ts`, `build-today-view.ts`, `build-home-priorities.ts` |

Money, Health, Family, Work, and Relationships are **categories**, not agents.

### Judgment (Decision Engine) — decides WHAT matters

- Owns **ranking**, **prioritization**, **scoring**, and **selection**
- Today: 1 primary + 2 supporting via `decideTodayPriorities()` in `decision-engine.ts`
- Daily Brief: shared ranking via `rankBriefConsequences()` in `decision-engine.ts`; `briefing-composer.ts` handles sectioning and caps only
- Returns ranked candidate metadata and score breakdowns for downstream consumers

### Response (Sync Engine) — decides HOW Sync communicates

- Owns **voice**, **tone**, **confidence**, **explanation**, **continuity**, **narrative**, and **trust metadata**
- Translates Judgment output into human-readable understanding via `runSyncEngine()` in `sync-engine.ts`
- **Preserves Judgment ordering** — never reranks priorities
- **Never invents facts** — personalize only from memory, consequence, profile, timing, or pattern evidence
- Knows when silence is better than saying more
- Explain reasoning in dev/debug mode only — not normal user replies
- Follow `SYNC_PRINCIPLES.md`, `SYNC_VOICE.md`, and this file

The Sync Engine does **not** own memory storage, memory classification, consequence generation, priority ranking, duplicate filtering, UI layout, or domain-specific agents.

### UI — renders only

- Displays information; **never ranks**, **never interprets**, **never owns business logic**
- `/sync-lab` and mobile prototype are **teaching surfaces** for inspecting pipeline output
- Adapters (`build-home-priorities.ts`, `build-today-view.ts`, `build-daily-brief.ts`) stay thin: wire pipeline output to view models
- Components consume prepared copy and metadata — they do not score, filter consequences, or rewrite Sync voice

## Engineering rules

- **Reuse intelligence** — search `lib/intelligence/*` and `lib/sync-capture/*` before adding logic
- **Never duplicate ranking** — all prioritization belongs in `decision-engine.ts`
- **Never create another communication layer** — user-facing language flows through Sync Engine + `SYNC_VOICE.md`
- **Never invent facts** — evidence-based interpretation only
- **Tests before fixes** — when a decision fails review, add a failing test (or regression case) before changing production logic when possible
- **Preserve visible behavior during migrations** whenever possible — lock output with tests before changing internals
- **Prefer metadata-first migrations** — attach richer `scoreBreakdown`, intent, and explainability before changing visible copy
- **Keep adapters thin** — selection, scoring, and voice stay in shared intelligence, not page components or mobile-only helpers
- **Strengthen the single shared pipeline** — every change should reduce duplication, not add a parallel brain

## The intelligence layers

### 1. Memory

Question: What happened? Should we remember, update, ignore, or ask?

Responsibilities:

- Capture what the user said.
- Save it clearly.
- Avoid duplicate memories.
- Keep titles simple and human.
- Remember only what earns the right to be remembered.

**Implemented today** (`lib/sync-capture/*`, `lib/captured-items.tsx`):

- Capture pipeline: `save-capture.ts`, `apply-capture-input.ts`
- Titles & dedupe: `memory-title.ts`, `memory-dedup.ts`
- Memory intelligence: `memory-profile.ts`, `memory-weight.ts`, `memory-thread.ts`, `memory-aging.ts`

### 2. Understanding

Question: Why does it matter?

Responsibilities:

- Detect category and meaning.
- Notice patterns.
- Understand emotional, financial, health, family, work, routine, and relationship context.
- Separate light memories from important ones.
- Use uncertainty instead of fake confidence.

**Implemented today** (`lib/intelligence/*`):

- Capture-time meaning: `meaning-engine.ts`
- Per-memory interpretation: `memory-understanding.ts`
- Importance & context: `importance-scoring.ts`, `sync-user-context.ts`, `person-entities.ts`

### 3. Consequence

Question: What changes because of it?

Responsibilities:

- Identify time impact.
- Detect follow-up needs.
- Connect related memories.
- Surface future effects, not just stored facts.

**Implemented today** (`lib/intelligence/*`):

- Capture-time analysis: `consequence-engine.ts`
- Runtime briefing engine: `sync-consequences.ts` (`buildAllConsequences`, `deriveConsequencesFromMemory`)
- Support: `consequence-timing.ts`, `consequence-link.ts`, `sync-foresight.ts`, `life-load.ts`

### 4. Judgment (Decision Engine)

Question: What deserves attention now, later, or never?

Responsibilities:

- Rank what matters most — for Today, Daily Brief, and future surfaces
- Pick the top 1 to 3 useful items for Today; provide ordered pools for longer briefings
- Prefer specific time-sensitive items over vague summaries
- Prefer important people, deadlines, money, health, work, and commitments over light memories
- Stay quiet when there is no clear value
- Do not overwhelm the user

**Implemented today** (`lib/intelligence/decision-engine.ts`):

- Profile-aware Today ranking via `decideTodayPriorities()`
- Shared Brief ranking via `rankBriefConsequences()`
- Normal 1 primary + 2 supporting output
- Ranked candidate metadata and score breakdowns
- Intelligence validation through `npm run test:intelligence`, `npm run test:intelligence:all`, and `npm run check`

**Current milestone:** Phase 1–2 per `SYNC_ENGINE_ROADMAP.md` — stabilize lab, teach the engine, expand stress testing, track Trustworthy Decision Rate.

### 5. Response (Sync Engine)

Question: How should Sync help the user understand this moment?

**Implemented today** (`lib/intelligence/sync-engine.ts`):

- `runSyncEngine()` — intent, confidence, surfacing reasons, explainability, continuity, arc
- Quality checks: preserves visible copy and Judgment ordering
- Consumed by `build-home-priorities.ts` and `build-daily-brief.ts` (metadata layer)

See **Response (Sync Engine)** under Reasoning pipeline for permanent ownership rules.

## Design rules

Surfaces stay calm and short. They display judgment output — they do not drive it.

Today should answer:

- What matters now?
- What is coming up?
- What changed because of what I told Sync?

My Life should explain what Sync knows, not become a dashboard.

Memory should show why something was remembered, not just list saved text.

Do not redesign Today, add tabs, or polish UI unless explicitly requested.

## Development rules

Reuse existing Sync intelligence before creating new logic.

Before adding new code, inspect:

- capture pipeline (`lib/sync-capture/*`)
- memory storage & profiling (`lib/captured-items.tsx`, `memory-profile.ts`, `memory-aging.ts`)
- meaning engine (`meaning-engine.ts`, `memory-understanding.ts`)
- consequence engine (`sync-consequences.ts`, `consequence-engine.ts`)
- Judgment / Decision Engine (`decision-engine.ts`) — all ranking and selection
- Daily Brief presentation (`briefing-composer.ts`) — sectioning and caps only
- Today adapter (`build-home-priorities.ts`, `build-today-view.ts`) — thin wiring only
- Response / Sync Engine (`sync-engine.ts`, `SYNC_VOICE.md`, `SYNC_PRINCIPLES.md`)
- timeline & calendar forecast (`calendar-day-events.ts`, `buildCalendarPulse`)

Add messy real-life tests when changing intelligence. Run weekly reviews per `SYNC_EVALUATION.md`.

Good tests include:

- 100+ memories with only 3 relevant today
- duplicate vague and specific events
- vague notes and ambiguous captures
- emotional entries
- quiet weeks and overloaded weeks
- family, money, work, and health conflicts
- tomorrow event that matters tonight
- light memory that should not surface
- important family, money, work, or health item that should surface
- profile priority vs urgent specific conflicts

## Forbidden moves

Do not unless **explicitly requested**:

- add dashboards, tabs, or domain products (Sync Health, Sync Money, etc.)
- add onboarding, themes, analytics, charts, streaks, or gamification
- redesign `/sync-lab`, Today, or Daily Brief
- polish consumer UI ahead of trust milestones
- create finance/calendar/health agents as separate intelligence layers
- force integrations by default or assume external data access without clear user consent
- turn Sync into a dashboard
- turn capture into a chatbot
- bury Today under widgets
- make the UI louder to compensate for weak intelligence
- fork ranking logic into mobile-only or page-specific modules when it belongs in `lib/intelligence/`
