# SYNC: Vision & Design Principles

This document defines Sync's voice, surfaces, and design stance. For mission and sequencing, read `SYNC_ENGINE_MANIFESTO.md` and `SYNC_ENGINE_ROADMAP.md` first.

Also read: `SYNC_WORKFLOW.md`, `SYNC_REASONING_SPEC.md`, `SYNC_EVALUATION.md`, `AGENTS.md`, `.cursor/rules/sync-vision.mdc`, `.cursor/rules/sync-product-workflow.mdc`.

---

## What Sync Is

Sync is a **personal reasoning engine**.

It helps people make better day-to-day decisions by understanding context, consequences, memory, and timing.

**The product is trust.**

The UI exists to test, teach, and eventually expose the engine — not to compete with planners, dashboards, or domain apps.

**Core question:** *What do I need to know right now?*

**Core loop:**

1. Tell Sync what happened or what is coming.
2. Sync understands it.
3. Sync decides whether to remember, ask, surface later, or stay quiet.
4. Sync organizes the consequences.
5. Sync judges what deserves attention.
6. Sync helps the user understand the moment clearly and calmly.

The value of Sync is **trustworthy judgment**, not storage or feature breadth.

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

If a feature turns Sync into something on this list, stop and rethink it.

---

## Surfaces (Teaching & Output)

### `/sync-lab` — teaching/evaluation surface

The lab is where reasoning is inspected, corrected, and stress-tested. It is **not the product**.

Debug explainability belongs here — not in normal user replies.

### Mobile prototype — first engine client

The mobile prototype is the **first consumer of the Sync Engine**. It renders judgment output through Today, Memory, and My Life. Do not delete it. Do not treat it as a feature playground — it validates trustworthy decisions in a minimal shell.

### Today — briefing output of judgment

**What matters now** — as decided by the Judgment stage (`decision-engine.ts`).

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
