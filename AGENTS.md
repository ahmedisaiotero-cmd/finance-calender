# Sync Intelligence System

Before making changes, read:

- SYNC_WORKFLOW.md
- SYNC_VISION.md
- SYNC_PRINCIPLES.md
- SYNC_VOICE.md when communication or user-facing language is involved
- ROADMAP.md when relevant

## Product identity

Sync is not:

- a planner
- a dashboard
- a chatbot
- a productivity app with endless tabs

Sync is:

- a memory system
- a daily life briefing
- a consequence engine
- a calm way to answer: "What do I need to know today?"

## Core rule

Prefer intelligence over UI.

Do not add pages, dashboards, category sprawl, chatbot framing, or extra widgets unless absolutely necessary.

Every change must improve at least one of:

- Memory
- Understanding
- Consequences
- Today
- My Life
- Trust
- Sync Engine

## The intelligence layers

Current pipeline: **Capture → Memory → Understanding → Consequence → Decision → Sync Engine → UI**

Money, Health, Family, Work, and Relationships are **categories**, not agents.

### 1. Memory Agent

Question: What happened?

Responsibilities:

- Capture what the user said.
- Save it clearly.
- Avoid duplicate memories.
- Keep titles simple and human.

**Implemented today** (`lib/sync-capture/*`, `lib/captured-items.tsx`):

- Capture pipeline: `save-capture.ts`, `apply-capture-input.ts`
- Titles & dedupe: `memory-title.ts`, `memory-dedup.ts`
- Memory intelligence: `memory-profile.ts`, `memory-weight.ts`, `memory-thread.ts`, `memory-aging.ts`

### 2. Understanding Agent

Question: Why does it matter?

Responsibilities:

- Detect category and meaning.
- Notice patterns.
- Understand emotional, financial, health, family, work, routine, and relationship context.
- Separate light memories from important ones.

**Implemented today** (`lib/intelligence/*`):

- Capture-time meaning: `meaning-engine.ts`
- Per-memory interpretation: `memory-understanding.ts`
- Importance & context: `importance-scoring.ts`, `sync-user-context.ts`, `person-entities.ts`
- Preview wiring: `lib/pulse/sync-preview-view-model.ts`

### 3. Consequence Agent

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

### 4. Decision Agent

Question: What should the user do next?

Responsibilities:

- Rank what matters most today.
- Pick the top 1 to 3 useful items.
- Prefer specific time-sensitive items over vague summaries.
- Prefer important people, deadlines, money, health, work, and commitments over light memories.
- Do not overwhelm the user.

**Implemented today** (`lib/intelligence/decision-engine.ts`):

- Profile-aware Today ranking
- Normal 1 primary + 2 supporting output
- Ranked candidate metadata and score breakdowns
- Basic intelligence validation through `npm run test:intelligence` and `npm run check`

**Next major intelligence milestone:** Phase 1.75 Intelligence Refinement — improve decision quality, universal understanding, Sync Engine quality, trust/explainability, and messy real-life stress tests before adding new pages or integrations.

### 5. Sync Engine

Question: How should Sync help the user understand this moment?

Responsibilities:

- Translate selected decisions into human understanding.
- Preserve Decision Engine ordering; never rerank priorities.
- Use Sync's voice: calm, specific, respectful, useful, and evidence-based.
- Attach confidence language, communication intent, surfacing reasons, and explainability.
- Support continuity across days and weeks so Sync does not feel like it wakes up with amnesia.
- Know when silence is better than saying more.
- Follow `SYNC_PRINCIPLES.md`, `SYNC_VOICE.md`, and this file.

The Sync Engine does **not** own memory storage, memory classification, consequence generation, priority ranking, duplicate filtering, UI layout, or domain-specific agents.

## Design rules

Home should stay calm and short.

Today should answer:

- What matters now?
- What is coming up?
- What changed because of what I told Sync?

My Life should explain what Sync knows, not become a dashboard.

Memory should show why something was remembered, not just list saved text.

## Development rules

Reuse existing Sync intelligence before creating new logic.

Before adding new code, inspect:

- capture pipeline (`lib/sync-capture/*`)
- memory storage & profiling (`lib/captured-items.tsx`, `memory-profile.ts`, `memory-aging.ts`)
- meaning engine (`meaning-engine.ts`, `memory-understanding.ts`)
- consequence engine (`sync-consequences.ts`, `consequence-engine.ts`)
- decision/ranking (`briefing-composer.ts`, `build-home-priorities.ts` — migrate toward `decision-engine.ts`)
- Sync Engine / communication (`sync-engine.ts` when present, `SYNC_VOICE.md`, `SYNC_PRINCIPLES.md`)
- timeline & calendar forecast (`calendar-day-events.ts`, `buildCalendarPulse`)

Add messy real-life tests when changing intelligence.

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

## Forbidden moves

Do not:

- add new pages by default
- create finance/calendar/health agents as separate intelligence layers
- turn Sync into a dashboard
- turn capture into a chatbot
- bury Today under widgets
- make the UI louder to compensate for weak intelligence
- fork ranking logic into mobile-only or page-specific modules when it belongs in `lib/intelligence/`
