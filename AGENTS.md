# Sync Intelligence System

Sync is the **user-controlled identity, permission, and provenance layer** that binds a verified person to their AI agents, tells each agent what it may know or do, and records trustworthy receipts. It is not a planner, dashboard, chatbot, or universal AI reputation score.

Human identity assurance and event provenance are **separate scales** (`docs/adr/001-two-trust-scales.md`). Do not store them in one field.

The reusable intelligence layer remains the long-term product. The Sync website is the account and control center; MCP/OAuth plugins are doorways into that account. Life briefing surfaces stay in the repo as a proving ground, not the north star.

Canonical product direction: **`SYNC_TRUST_LAYER.md`**. Activity + Passport contracts: **`SYNC_ACTIVITY_PASSPORT.md`**.

Before making changes, read:

- **SYNC_TRUST_LAYER.md**
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

> **Does this improve Sync’s ability to verify identity, permission, provenance, or action receipts without fabricating trust?**

If the answer is no, do not implement it yet.

## Default prompt prefix

Future work should be framed as:

> **Improve Sync’s trust layer by…**

Then specify the reasoning stage (evidence, claims, sharing risk, allow/deny/approval), a messy real-life example, and the test that proves the improvement.

## Cursor Agent workflow

This is a **repository development workflow** only. Do not add Cursor-runtime agents, extra model SDKs, n8n, or editor MCP servers as application scaffolding.

**Product MCP/OAuth is in scope:** Sync may host a remote MCP server and OAuth so ChatGPT, Cursor, and other hosts attach to the trust layer. Do not install n8n or a parallel agent runtime inside the app. Do not treat `/api/chat` as the agent protocol.

The main Cursor Agent is the **only implementation owner**. Follow `.cursor/skills/sync-change/SKILL.md` for modification requests. Invoke `/sync-change` when the complete procedure should be loaded explicitly.

Use at most two project subagents, and only when they help:

| Subagent | Role | When |
|---|---|---|
| `sync-architect` | Read-only architecture and mission analysis | Before implementation, only if the change is cross-boundary, ownership-shifting, duplication-prone, ambiguous, or touches auth/privacy/sensitive data |
| `sync-verifier` | Independent post-change validation | After every meaningful code change. If unavailable, the main agent must still perform equivalent independent verification |

Do not invoke subagents merely because they exist. Do not let subagents edit files, and never let them edit the same files concurrently. Small, well-scoped changes stay on the main agent.

### Operating rules

- Read and follow `SYNC_WORKFLOW.md` and `SYNC_VISION.md` before meaningful product or architecture changes.
- Treat Sync as a trust layer (permission, provenance, receipts), not a planner, generic dashboard, or chatbot-first product. ChatGPT/Cursor apps are **clients** of that layer, not a chatbot product.
- Preserve the intelligence sequence **Memory → Understanding → Consequences → Decision/Judgment**. Map it to evidence, claims, sharing risk, and allow/deny/approval. Do not fork a second brain. Today/briefing is an optional later output, not the product question.
- A requested product change must improve at least one of: **Trust, Activity, Passport, Safety**, or the internal stages Memory, Understanding, Consequences, Judgment. If none apply, pause and explain. Do not grow Today/My Life unless it unblocks the trust loop. Goals remain deferred — do not build a Goals planner.
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

## Shared GitHub work

Canonical remote: `https://github.com/ahmedisaiotero-cmd/finance-calender.git` (GitHub spelling is `finance-calender`). The local folder name may differ. Environments stay synchronized **only through Git** on that repository.

- If uncommitted local work could conflict, stop. Do not reset, discard, or overwrite unrelated changes.
- Do not push secrets or `.env` files.
- Do not add n8n, extra model SDKs, or Cursor-only agent runtimes to the Sync **application**. A product MCP server and OAuth for external agents **are allowed** (see `SYNC_TRUST_LAYER.md`). GitHub, Vercel, and editor plugins belong in the agent environment, not as a parallel app brain.
- Do not change Vercel production settings or deploy unless the user explicitly asks. Linked deploy project: `finance-calender-g6ay` on Vercel team `ahmedisaiotero-cmds-projects` (GitHub org `ahmedisaiotero-cmd`).

## Working approach (main-first)

Supervised Sync development happens **directly on `main`**.

- Before every task, pull `main` and confirm the working-tree state. Preserve unrelated local work.
- Make small, focused commits so every completed step is an easy rollback point.
- Never combine unrelated changes in one commit.
- Never rewrite `main` history or force-push.
- Do not apply destructive database migrations or production changes without asking first.
- Unattended Cloud/background agents should use temporary branches when Cursor requires them, then merge only after verification.
- Do not delete historical save/reference branches unless asked. Keep `cursor/ai-activity-foundation` as the Activity + Passport foundation reference.

## Engine-first priorities

- **Trust before features** — evidence and permission beat new surfaces
- **Never upgrade verification** — agent-reported is not source-confirmed
- **`/sync-lab` is the teaching/evaluation surface**, not the product
- **The Sync website is a quiet control center** — connections, grants, receipts, revoke, correct — not a daily dashboard
- **Today is frozen** unless it unblocks the trust loop — do not redesign it unless explicitly requested
- **Failed trust decisions become tests** before production fixes whenever possible (see `SYNC_EVALUATION.md`)
- Sequencing: `SYNC_TRUST_LAYER.md` and `SYNC_ENGINE_ROADMAP.md`

## Product identity

Sync is not:

- a planner
- a dashboard
- a chatbot
- a productivity app with endless tabs
- a habit tracker, finance app, health app, notes app, or calendar skin
- a universal AI-user score or custom identity blockchain

Sync is:

- a user-owned permission, context, and action-receipt layer for connected AI tools
- an evidence ledger that distinguishes user-confirmed, observed, agent-reported, externally verified, and inferred information
- a judgment engine that allows, denies, limits, or asks before an agent acts

## Layered architecture (current direction)

1. **Sync Intelligence** — activity events, passport claims, memory, consequence/sharing-risk, allow/deny judgment
2. **Adapters** — MCP tools, OAuth, GitHub (and later) connectors, thin view models
3. **Surfaces** — Sync website control center; ChatGPT/Cursor/other hosts as doorways; lab for inspection
4. **Integrations** — user-approved connectors that **confirm** outcomes (GitHub first). Host plugins are not omniscient observers.

Rules:

- Intelligence should not be trapped inside UI components or MCP handlers.
- App pages and MCP tools consume intelligence; they do not create their own brains.
- Connecting an account is not the same as verifying everything that host does.
- No hidden external data usage, no full-conversation scrape by default, no forced account connections.

## Core rule

Prefer intelligence over UI.

Do not add pages, dashboards, category sprawl, chatbot framing, or extra widgets unless **explicitly requested**.

Every change must improve at least one engine stage:

- Memory (evidence)
- Understanding (claims)
- Consequences (sharing/acting risk)
- Judgment (allow / deny / limit / ask)
- Safety
- Trust
- Activity
- Passport

A requested **product** change must improve Trust, Activity, Passport, or Safety (or the internal stages above). Do not expand briefing UI as the product. Goals remain deferred.

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

- **Reuse intelligence** — search `lib/activity/*`, `lib/passport/*`, `lib/intelligence/*`, and `lib/sync-capture/*` before adding logic
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
- add onboarding, themes, analytics, charts, streaks, gamification, or a reputation score
- invent a custom identity protocol or blockchain
- claim activity is “verified” when it is only imported, inferred, or agent-reported
- scrape full AI conversations by default
- redesign `/sync-lab`, Today, or Daily Brief
- polish consumer UI ahead of the Cursor ↔ Sync ↔ GitHub loop
- create finance/calendar/health agents as separate intelligence layers
- force integrations by default or assume a host gives Sync omniscience
- turn Sync into a dashboard
- turn capture or MCP into a chatbot
- fork ranking or evidence types into MCP handlers or page-specific modules
- extend `/api/chat` into the trust protocol
