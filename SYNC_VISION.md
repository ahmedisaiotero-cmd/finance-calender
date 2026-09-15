# SYNC: Vision & Design Principles

This document defines Sync's voice, surfaces, and design stance. For mission and sequencing, read `SYNC_ENGINE_MANIFESTO.md` and `SYNC_ENGINE_ROADMAP.md` first.

Also read: `SYNC_WORKFLOW.md`, `SYNC_REASONING_SPEC.md`, `SYNC_EVALUATION.md`, `AGENTS.md`, `.cursor/rules/sync-vision.mdc`, `.cursor/rules/sync-product-workflow.mdc`.

---

## What Sync Is

Sync is a **user-controlled trust layer** between a person and AI systems.

It records who authorized an action, what an agent may do, what was shared, and what an outside system actually confirmed.

**The product is trust** — provenance and permission, not a reputation score and not a daily briefing.

Canonical direction: `SYNC_TRUST_LAYER.md`.

The reusable intelligence layer remains the long-term product. The Sync website is a quiet control center. ChatGPT, Cursor, and other hosts connect to the **same** account through OAuth/MCP. They do not get a private copy of Sync, and connecting is not the same as observing everything on that host.

**Core question:** *Did this agent have permission, and what is the evidence?*

**Core loop:**

1. An agent or the user requests context, permission, or to record an action.
2. Sync understands the claim and its evidence level.
3. Sync decides allow, deny, limit, or ask.
4. Sync appends an evidence record (never silently upgrades verification).
5. Sync may later expose a minimum-necessary receipt or claim to another agent.
6. The user can inspect, revoke, correct, or delete without rewriting history.

Life briefing (Home, Capture, My Life) remains as a proving ground. Do not grow it as the product.

---

## What Sync Is Not

Sync is **not**:

- a task manager
- a productivity dashboard
- a planner
- a notes app
- a chatbot
- a calendar clone
- a habit tracker
- a finance app, fitness app, or collection of widgets
- a motivational coach
- a universal AI reputation score
- a custom identity protocol or blockchain

If a feature turns Sync into something on this list, stop and rethink it.

---

## Surfaces (Teaching & Output)

### Sync website — control center (quiet, not opaque)

The authenticated site is where the human manages the trust layer:

- connected agents and services
- pending approvals and narrow grants
- recent receipts with evidence labels
- revoke, correct, delete, export
- “Why does this agent know that?”

Do not turn this into a daily dashboard. Legacy Home / My Life / Capture / Timeline / area views stay in the repo; freeze them unless they unblock the trust loop.

### `/sync-lab` — teaching/evaluation surface

The lab is where reasoning is inspected, corrected, and stress-tested. It is **not the product**.

Debug explainability belongs here — not in normal user replies.

### Mobile prototype — current app client shell

The mobile prototype is a current shell for the first app surface. Do not delete it. Do not treat it as a feature playground — it validates trustworthy decisions in a minimal shell.

### Today — frozen briefing output (not the north star)

**Legacy:** what matters now, as decided by the Judgment stage (`decision-engine.ts`). Do not expand this surface unless it unblocks the trust loop.

Today is a **life briefing**, not a reporting engine or design canvas. It displays:

- 1 primary + max 2 supporting lines (Judgment output)
- load context when relevant (forecast, not a substitute for specific primaries)
- curated consequences — not raw memory dumps

Today shows **consequences**, not raw memories. It filters noise. It explains what events mean.

**Bad:** twelve lines listing everything in the database.  
**Good:** specific primary (*Flight at 6:00 AM.*) with load in context → supporting payday/work → drilldown on demand.

Brief lede (*Tomorrow looks busy.*) is Brief structure — not a license to override specific Judgment without reason.

### Memory

**What Sync remembers.**

Each memory preserves:

- **what the user said** (raw input)
- **what Sync understood** (interpretation)
- trust metadata the user can inspect and correct

Sync remembers only what earns the right to be remembered.

### My Life

**What Sync knows about the user** — text-first, calm, not a dashboard.

Work schedule, priorities (Money, Health, Family, Work, etc.), and profile context **influence Judgment** — they do not replace urgent specifics irresponsibly.

---

## Engine-first gate

Before any change, ask:

> **Does this improve the Sync Engine's ability to make trustworthy decisions?**

Default prompt prefix:

> **Improve the Sync Engine's ability to make trustworthy decisions by…**

Product/UI expansion is **deferred until trust improves** — see `SYNC_ENGINE_ROADMAP.md`. **`SYNC_ENGINE_ROADMAP.md` supersedes `ROADMAP.md` for sequencing.**

---

## Build Principles

These override feature requests and implementation habits.

1. **Trust before features** — judgment quality beats new surfaces.
2. **Intelligence before UI** — never build a surface before the shared brain exists.
3. **Shared Sync brain before client-only logic** — reuse `meaning-engine`, `sync-consequences`, `decision-engine`, `sync-engine`, and related modules; do not fork intelligence into shells.
4. **Consequences over raw memories** — surfaces interpret; they do not replay captures.
5. **Specific briefings over generic insights** — prefer *Rent is due Friday* over *worth keeping in view*.
6. **No new main tabs without approval** — Today, Memory, My Life remain the mobile structure; no expansion until Phase 5.
7. **Tests for messy real-life input** — typos, vague phrasing, overlapping commitments.
8. **Failed decisions become tests** before production fixes when possible.

**Build order:**

1. Shared intelligence / reasoning layer  
2. Tests  
3. Lab + mobile client integration  
4. Minimal UI  
5. Polish (deferred until trust milestones)

---

## Reasoning Pipeline

Every input follows:

```
Input → Understanding → Memory Decision → Consequence Reasoning
  → Judgment → Response → Future Follow-up → Briefing Effect
```

Full spec: `SYNC_REASONING_SPEC.md`. Evaluation: `SYNC_EVALUATION.md`.

Money, Health, Family, Work, and Relationships are **categories**, not agents or standalone products.

---

## Foundational Philosophy

### Tell Sync what happened. Sync handles the details.

Users speak naturally. Sync normalizes typos, resolves time, assigns meaning, and stores understanding. The user should not parse dates, pick categories, or maintain structure.

### Immediate value before integrations

Sync must be useful with **manual capture alone**. Integrations are deferred — only after trustworthy judgment is proven.

### Memory before management

Sync is for **remembering and understanding**, not for the user to manage tasks, projects, or lists. No inbox zero. No productivity coaching.

### Clarity over clutter

Default to what matters. Hide the rest until the user asks for it.

| Level | Purpose |
|-------|---------|
| **1** | Tell me what matters |
| **2** | Explain it |
| **3** | Show me everything |

Never show Level 3 by default.

### User control and trust

Users must inspect, correct, and delete what Sync thinks. Raw input stays preserved alongside Sync's interpretation. Trust is the product — not a settings afterthought.

### Progressive reveal

Start with the briefing. Offer detail on demand. Do not front-load metadata, scores, or configuration.

### Integrations later

Sync **connects** to tools users trust — it does not replace them. External sources come **after** the reasoning pipeline proves trustworthy on manual capture alone.
Integrations are optional, user-approved plugins/sources (calendar, finance, health, email/messages, and future connectors), never forced defaults.
No hidden external data usage and no privacy-invasive assumptions.

---

## Layered architecture

1. **Layer 1: Sync Intelligence** — memory, life graph, reasoning, consequence detection, pattern intelligence, prioritization, narrative context
2. **Layer 2: Adapters** — translate intelligence into outputs for Home, Timeline, My Life, Chat, Voice, Calendar, Finance, Health
3. **Layer 3: Surfaces** — UI and interaction for web app, mobile app, iOS shell, and future dedicated apps
4. **Layer 4: Integrations** — optional external connectors, authentication/permissions, and privacy boundaries

Rules:

- Intelligence should not be trapped inside UI components.
- App pages consume intelligence; they do not create their own brains.
- Do not rebuild around an abstract platform at the cost of shipping the app.
- No dashboard creep.

**Interpretation over information. Clarity over completeness.**

---

## Understanding & Consequences

Sync's job is not to repeat what was entered. It is to understand **what it means** and **what follows**.

| Input | Sync understands | Consequence |
|-------|------------------|-------------|
| Flight tomorrow 6 AM | Early travel | Tomorrow starts early; load increases |
| Take daughter to school | Family commitment | Ranks higher when Family is prioritized |
| Rent due Friday | Financial deadline | Surfaces in This Week, not as noise today |
| Friend's birthday tomorrow | Relationship moment | *Your friend's birthday is tomorrow.* |

**Life load** matters: flight + school + work + birthday is a busy tomorrow — load appears in context; specific timed items lead Judgment when both exist.

---

## Voice & Language

Sync should sound **calm, observant, concise, trustworthy**.

**Judgment** answers: *What deserves attention?* (`decision-engine.ts`)

**Response** answers: *How should Sync communicate it?* (`sync-engine.ts`, `SYNC_VOICE.md`)

Response preserves Judgment ordering, avoids inventing facts, and knows when silence is better than saying more.

**Prefer specific:**

- Rent is due Friday.
- Flight at 6:00 AM.
- Tomorrow starts early.
- Work begins at 11:00 AM after a busy morning.

**Avoid:** corporate SaaS language, productivity coaching, motivational slogans, generic AI wording, shame-based framing.

Users should leave Sync feeling **informed, supported, and capable** — never overwhelmed, never judged.

---

## Compassion

Many people carry stress about money, health, work, and relationships. Sync acknowledges reality without adding anxiety.

- The goal is not perfection. The goal is **trustworthy clarity**.
- Sync guides — it does not punish, score, or gamify.
- No streaks, life scores, leaderboards, or habit-tracking systems unless explicitly approved.

Sync should feel like a **trusted guide** — not a strict manager, not a judge.

---

## The Sync Test

Before implementing any change:

1. Does this improve trustworthy decisions?
2. Does this reduce mental load?
3. Can the user understand this in under five seconds?
4. Does this improve Memory, Understanding, Consequences, Judgment, Briefing, Safety, or Trust?
5. Is this the simplest possible version?

If any answer is "no," do not implement it yet.

---

## Do Not Build (Unless Explicitly Approved)

- new main tabs
- dashboards, analytics, charts
- productivity pages or task manager UI
- full chatbot UI
- standalone calendar, finance, or health **products**
- Sync Health, Sync Money, onboarding, themes
- social features, gamification, streak systems
- habit tracking systems
- life scores or productivity scores
- consumer UI polish ahead of trust milestones

---

## Definition of Done

A change is complete only when it:

- improves trustworthy decisions (see `SYNC_EVALUATION.md`)
- reuses shared intelligence where possible
- includes tests (especially messy real-life input)
- reduces clutter
- does not turn Sync into a dashboard

---

## Design Stance

Design is **good enough for now**. Do not redesign unless fixing clarity.

When design is needed: calm, minimal, intentional, human. Whitespace and simplicity are features.

**Avoid:** gamification · excessive widgets · dashboard clutter · emoji-heavy UI · shame-based language · excessive warnings

**Inspired by clarity**, not by copying dashboard patterns from other product categories.

---

## Current Priority

Make Sync **trustworthy** before making it bigger.

Focus:

- judgment quality and stress testing
- memory decision quality (remember / ignore / update / ask)
- consequence reasoning and life load detection
- Sync Engine response quality
- trust / edit / delete / weekly evaluation reviews
- lab stability (`/sync-lab`)

See `SYNC_ENGINE_ROADMAP.md` for phase gates.

---

## Engineering Principles

- Prefer reusable shared modules; favor consistency over novelty
- Do not redesign existing screens unless explicitly requested
- Avoid features because other apps have them
- Build slowly and deliberately; ship reasoning improvements before polish
- When uncertain, choose what increases **trust**

---

## The Sync Mission

Sync exists to help people know what matters — with clarity and confidence.

Tell it what happened or what's coming. It understands, remembers, judges, and communicates — when it matters — so you spend less time managing life and more time living it.

Whenever uncertain, choose the option that makes life feel **calmer** and Sync feel **more trustworthy**.
