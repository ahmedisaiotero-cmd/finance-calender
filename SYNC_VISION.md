# SYNC: Product Vision & Design Principles

This document is the product constitution for Sync development. Read it alongside `.cursor/rules/sync-vision.mdc` and `.cursor/rules/sync-product-workflow.mdc`.

---

## What Sync Is

Sync is a **personal life briefing and memory system**.

Its purpose is to reduce mental load by helping people understand what matters **right now** — without making them organize, plan, or manage another app.

**Core question:** *What do I need to know right now?*

**Core loop:**

1. Tell Sync what happened or what is coming.
2. Sync understands it.
3. Sync remembers it.
4. Sync organizes the consequences.
5. Sync surfaces what matters when it matters.

The value of Sync is **understanding life**, not storing information.

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

If a feature turns Sync into something on this list, stop and rethink it.

---

## Canonical App Structure

Sync has three primary areas. Do not add new main tabs without explicit approval.

### 1. Today

**What matters now.**

Today is a **life briefing**, not a reporting engine. It answers the core question with:

- a clear headline (load-aware when relevant)
- curated consequences grouped by time (Tomorrow, This Week, Later)
- specific, observant language — not generic insights or database dumps

Today shows **consequences**, not raw memories. It filters noise. It explains what events mean.

**Bad:** twelve lines listing everything in the database.  
**Good:** *Tomorrow looks busy.* → Flight at 6:00 AM → Take daughter to school → Your friend's birthday.

### 2. Memory

**What Sync remembers.**

Memory is where captured life input lives. Each memory preserves:

- **what the user said** (raw input)
- **what Sync understood** (interpretation)
- trust metadata the user can inspect and correct

Sync remembers; the user does not need to file, tag, or organize manually.

### 3. My Life

**What Sync knows about the user.**

Work schedule, priorities (Money, Health, Family, Work, etc.), typical week, and coming-up context. This profile **must affect Today** — priorities should change what ranks higher in the briefing.

---

## Build Principles

These override feature requests and implementation habits.

1. **Intelligence before UI** — never build a surface before the shared brain exists.
2. **Shared Sync brain before mobile-only logic** — reuse `meaning-engine`, `sync-consequences`, `briefing-composer`, `memory-understanding`, and related modules; do not fork intelligence into the mobile shell.
3. **Consequences over raw memories** — Today interprets; it does not replay captures.
4. **Specific briefings over generic insights** — prefer *Rent is due Friday* over *worth keeping in view*.
5. **No new main tabs without approval** — Today, Memory, My Life are the structure.
6. **Tests for messy real-life input** — typos, vague phrasing, overlapping commitments.
7. **Useful before bigger** — intelligence quality beats new pages.

**Build order:**

1. Shared intelligence / domain layer  
2. Tests  
3. Mobile shell integration  
4. Minimal UI  
5. Polish  

---

## Foundational Philosophy

These ideas remain true regardless of surface area.

### Tell Sync what happened. Sync handles the details.

Users speak naturally. Sync normalizes typos, resolves time, assigns meaning, and stores understanding. The user should not parse dates, pick categories, or maintain structure.

### Immediate value before integrations

Sync must be useful with **manual capture alone**. Integrations are later — only after the core loop proves value.

### Memory before management

Sync is for **remembering and understanding**, not for the user to manage tasks, projects, or lists. No inbox zero. No productivity coaching.

### Clarity over clutter

Default to what matters. Hide the rest until the user asks for it.

**Information hierarchy:**

| Level | Purpose |
|-------|---------|
| **1** | Tell me what matters |
| **2** | Explain it |
| **3** | Show me everything |

Never show Level 3 by default.

### User control and trust

Users must be able to see why Sync remembered something, edit it, and delete it. Raw input stays preserved alongside Sync's interpretation. Trust is a product feature, not a settings afterthought.

### Progressive reveal

Start with the briefing. Offer detail on demand. Do not front-load metadata, scores, or configuration.

### Integrations later

Sync **connects** to tools users trust — it does not replace them. Google Calendar, banks, Apple Health, and similar sources come **after** capture → understanding → consequence → briefing works on its own.

**Interpretation over information. Clarity over completeness.**

---

## Understanding & Consequences

Sync's job is not to repeat what was entered. It is to understand **what it means** and **what follows**.

Examples:

| Input | Sync understands | Consequence |
|-------|------------------|-------------|
| Flight tomorrow 6 AM | Early travel | Tomorrow starts early; load increases |
| Take daughter to school | Family commitment | Ranks higher when Family is prioritized |
| Rent due Friday | Financial deadline | Surfaces in This Week, not as noise today |
| Friend's birthday tomorrow | Relationship moment | *Your friend's birthday is tomorrow.* |

**Life load** matters: a flight + school + work + birthday is a **busy tomorrow**, and the headline and phrasing should reflect that.

---

## Voice & Language

Sync should sound **calm, observant, concise, trustworthy**.

**Prefer specific:**

- Rent is due Friday.
- Tomorrow starts early.
- Tomorrow looks busy.
- You're off tomorrow.
- Your friend's birthday is tomorrow.
- Work begins at 11:00 AM after a busy morning.

**Avoid:**

- corporate SaaS language (*worth keeping in view*, *looks important*)
- productivity coaching (*stay on track*, *manage your tasks*)
- motivational slogans
- generic AI wording
- shame-based or fear-based framing

**Prefer over punitive:**

| Avoid | Prefer |
|-------|--------|
| Failed · Missed · Bad · Behind | Needs attention · Here's what matters next |
| You exceeded your budget | Spending is a little higher than planned |

Users should leave Sync feeling **informed, supported, and capable** — never overwhelmed, never judged.

---

## Compassion

Many people carry stress about money, health, work, and relationships. Sync acknowledges reality without adding anxiety.

- The goal is not perfection. The goal is **progress**.
- Sync guides — it does not punish, score, or gamify.
- No streaks, life scores, leaderboards, or habit-tracking systems unless explicitly approved (they conflict with this vision).

Sync should feel like a **trusted guide** — not a strict manager, not a judge.

---

## The Sync Test

Before implementing any feature, ask:

1. Does this reduce mental load?
2. Can the user understand this in under five seconds?
3. Does this help answer *What do I need to know right now?*
4. Does this improve Today, Memory, My Life, Understanding, Consequences, or Trust?
5. Is this the simplest possible version?

If any answer is "no," rethink the implementation.

---

## Do Not Build (Unless Explicitly Approved)

- new main tabs
- dashboards, analytics, charts
- productivity pages or task manager UI
- full chatbot UI
- standalone calendar, finance, or health pages
- social features, gamification, streak systems
- habit tracking systems
- life scores or productivity scores

If a proposal includes any of the above, explain why before building.

---

## Definition of Done

A feature is complete only when it:

- supports this vision
- improves Today, Memory, My Life, Understanding, Consequences, or Trust
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

Make Sync **useful** before making it bigger.

Focus:

- intelligence quality
- consequence ranking
- life load detection
- memory understanding
- My Life model (priorities affecting Today)
- trust / edit / delete
- real-life messy input testing

---

## Engineering Principles

- Prefer reusable shared modules; favor consistency over novelty
- Do not redesign existing screens unless they violate this vision
- Avoid features because other apps have them
- Build slowly and deliberately; ship before polishing endlessly
- When uncertain, choose what makes life feel **calmer**

---

## The Sync Mission

Sync exists to reduce mental load.

Tell it what happened or what's coming. It understands, remembers, organizes the consequences, and tells you what matters — when it matters — so you can spend less time managing life and more time living it.

Whenever uncertain, choose the option that makes life feel **calmer**.
