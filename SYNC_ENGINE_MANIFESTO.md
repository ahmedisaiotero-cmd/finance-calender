# Sync Engine Manifesto

This document defines what Sync is becoming. It supersedes product-first framing when the two conflict.

Read alongside `SYNC_REASONING_SPEC.md`, `SYNC_EVALUATION.md`, and `SYNC_ENGINE_ROADMAP.md`.

---

## What Sync Is

Sync is a **personal reasoning engine**.

It helps people make better day-to-day decisions by understanding context, consequences, memory, and timing.

Sync should:

- understand what happened
- decide whether it matters
- understand what changes because of it
- decide whether to remember, ask, surface later, or stay quiet
- help the user know what deserves attention

The product is **trust**.

The UI exists only to test, teach, and eventually expose the engine.

---

## What Sync Is Not

Sync is not:

- a productivity dashboard
- a planner
- a chatbot clone
- a habit tracker
- a finance app
- a health app
- a notes app
- a calendar skin
- a motivational coach
- a place for endless widgets

If a feature makes Sync feel like one of these, it waits.

---

## Core Mission

**Build the most trusted personal reasoning engine.**

Not the smartest assistant. Not the most feature-rich life app. The most **trustworthy** reasoning system a person would rely on for day-to-day judgment.

---

## The Villain

**Mental fragmentation.**

People have notes, calendars, reminders, messages, health apps, bank apps, ideas, worries, and obligations scattered everywhere. None of it understands how it connects.

Sync exists to connect what matters — not to add another pile of information.

---

## The Hero

**Clarity and confidence.**

The user should feel:

> “I know what matters today.”

Not overwhelmed. Not coached. Not managed. **Clear.**

---

## Sync Constitution v1

These principles govern all engine work:

1. **Trust is more important than intelligence.**
2. **Judgment is more important than features.**
3. **Consequences are more important than events.**
4. **Patterns are more important than isolated moments.**
5. **Remember only what earns the right to be remembered.**
6. **Prefer updating existing memories over creating duplicates.**
7. **Ask questions only when the answer changes memory, consequences, or future decisions.**
8. **Interrupt only when interruption creates clear value.**
9. **Stay quiet when there is no clear value.**
10. **Use uncertainty instead of fake confidence.**
11. **Personal data should be treated as sensitive by default.**
12. **Health, money, relationship, and identity-related information require extra care.**
13. **The user must be able to inspect, correct, and delete what Sync thinks.**
14. **Explain reasoning in development/debug mode, not normal user replies.**
15. **Every improvement must increase trust.**

---

## Product Philosophy

Every future change must answer:

> “Does this improve the Sync Engine’s ability to make trustworthy decisions?”

If the answer is no, the change waits.

Features do not ship for their own sake. Surfaces do not expand until the engine earns trust.

---

## Relationship to the Codebase

The implemented pipeline maps to this manifesto:

| Manifesto concern | Engine stage | Primary modules |
|---|---|---|
| What happened | Memory | `lib/sync-capture/*`, `memory-profile.ts`, `memory-aging.ts` |
| Why it matters | Understanding | `meaning-engine.ts`, `memory-understanding.ts` |
| What changes | Consequence | `consequence-engine.ts`, `sync-consequences.ts` |
| What deserves attention | Judgment | `decision-engine.ts` |
| How Sync communicates | Response | `sync-engine.ts`, `SYNC_VOICE.md` |
| What happens next | Future follow-up | capture actions, consequence timing |
| What the user sees later | Briefing effect | `briefing-composer.ts`, Today adapters |

The lab UI (`/sync-lab`, mobile prototype) is a **teaching surface**, not the product.

---

## What Success Looks Like

- A thoughtful human agrees with what Sync remembered, ignored, asked, surfaced, and stayed quiet about.
- Messy real-life input produces calm, specific, evidence-based judgment — not database dumps.
- Users can inspect and correct Sync’s reasoning without breaking trust.
- Every week, failed examples become tests — not shame, not dashboards.

See `SYNC_EVALUATION.md` for how trust is measured.
