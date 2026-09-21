# SYNC: Vision & Design Principles

**Product identity is `SYNC_PRODUCT.md`.** Technical trust is `SYNC_STANDARDS.md`. This file governs the **experience contract**, voice, and surfaces. Surfaces here are **outputs**, not the product.

For mission and sequencing, read `SYNC_PRODUCT.md`, then `SYNC_STANDARDS.md`, `SYNC_ENGINE_MANIFESTO.md`, and `SYNC_ENGINE_ROADMAP.md`.

Also read: `SYNC_WORKFLOW.md`, `SYNC_REASONING_SPEC.md`, `SYNC_EVALUATION.md`, `AGENTS.md`, `.cursor/rules/sync-vision.mdc`, `.cursor/rules/sync-product-workflow.mdc`.

---

## What Sync Is

Sync is becoming a **personal AI context and trust layer**.

It builds an accurate, user-controlled understanding of a life, helps AI make better decisions, and keeps a verifiable record of what AI systems saw, decided, and did.

**The product is trusted personal context** — Context, Reasoning, and Proof — not a briefing screen.

The reusable intelligence layer is how that product is implemented.
The Sync app is a proving-ground **output**: it can show the value of that layer. It is not what Sync is becoming.

**Core questions:**

- What is true about me?
- What does it mean?
- What did AI see and do?

“What do I need to know right now?” remains a valid **briefing** question. It is not the product definition.

**Core loop:**

1. Tell Sync what happened or what is coming.
2. Sync understands it.
3. Sync decides whether to remember, ask, surface later, or stay quiet.
4. Sync organizes the consequences.
5. Sync judges what deserves attention.
6. Sync helps the user understand the moment clearly and calmly.

The value of Sync is **trusted context, reasoning, and proof**, not storage, feature breadth, or a polished briefing.

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

## Experience contract

This is how Sync should feel. Technical trust rules live in `SYNC_STANDARDS.md`. This contract is **appearance and interaction**, not a dashboard spec.

1. **Calm, minimal, text-first.** Prefer readable sentences over cards, charts, and control panels.
2. **Important before comprehensive.** Show what matters; keep the rest available on inspect, not on the first screen.
3. **Progressive reveal, not dashboards.** Details unfold when the user asks. Do not tile life into widgets.
4. **Every claim is inspectable and correctable.** The user can see what Sync thinks, why, and can edit or delete it.
5. **Label epistemic status clearly.** Distinguish **known**, **inferred**, **unverified**, and **confirmed**. Do not dress inferences as facts.
6. **Context and proof should be understandable.** Receipts and claims are for the person, not developer logs. Lab/debug may show internals; normal UI may not.
7. **Today is one useful output.** It is not the homepage’s entire identity and not the product.
8. **No enterprise-security aesthetic, widget sprawl, or generic chatbot interface.** Sync should not look like a CISO console, a productivity suite, or a chat app with extra tabs.

If a UI change violates this contract, it is not a design improvement.

---

## Surfaces (outputs & teaching)

### Sync app — proving-ground output, not the product

The current app shows whether context, reasoning, and proof are working. Its screens are consumers:

- **Home / Today** — one briefing output of judgment
- **My Life** — inspectable context (what Sync knows)
- **Life Timeline** — when it matters
- **Capture** — how Sync learns
- **Area views** — focused views powered by shared intelligence

Do not optimize these as if they were the product. Improve them only when they prove Context, Reasoning, or Proof.

### `/sync-lab` — teaching/evaluation surface

The lab is where reasoning is inspected, corrected, and stress-tested. It is **not the product**.

Debug explainability belongs here — not in normal user replies.

### Mobile prototype — current app client shell

The mobile prototype is a current shell for the first app surface. Do not delete it. Do not treat it as a feature playground — it validates trustworthy decisions in a minimal shell.

### Today — briefing output of judgment

**What matters now** — as decided by the Judgment stage (`decision-engine.ts`).

Today is **one output**, not the product. It is a life briefing that displays:

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

> **Does this strengthen Sync as a personal AI context and trust layer?**

Default prompt prefix:

> **Improve Sync as a personal AI context and trust layer by…**

Product/UI expansion is **deferred until context, reasoning, and proof are unified enough to trust** — see `SYNC_PRODUCT.md` and `SYNC_ENGINE_ROADMAP.md`. **`SYNC_PRODUCT.md` supersedes older identity language. `SYNC_ENGINE_ROADMAP.md` supersedes `ROADMAP.md` for sequencing.**

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
