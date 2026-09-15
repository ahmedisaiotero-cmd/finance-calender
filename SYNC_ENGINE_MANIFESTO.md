# Sync Engine Manifesto

This document defines what Sync is becoming. It supersedes product-first framing when the two conflict.

Read alongside `SYNC_REASONING_SPEC.md`, `SYNC_EVALUATION.md`, and `SYNC_ENGINE_ROADMAP.md`.

---

## What Sync Is

Sync is a **user-controlled trust layer** for AI systems, powered by a personal reasoning engine.

It should:

- know who authorized an action
- decide what an agent may access or do
- distinguish user-confirmed, observed, agent-reported, externally verified, and inferred information
- record what happened without rewriting history
- stay quiet except when approval, revocation, or a receipt is needed

The product is **trust** (provenance and permission). Canonical direction: `SYNC_TRUST_LAYER.md`.

The website is a quiet control center. Host plugins (ChatGPT, Cursor) are doorways, not omniscient observers. The lab exists to test and teach the engine.

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

**Build the most trusted permission, context, and action-receipt layer a person can put between themselves and AI agents.**

Not the smartest assistant. Not the most feature-rich life app. Not a universal reputation score.

---

## The Villain

**Unverified agency.**

Every new agent starts blind, repeats work, or acts with unclear authority. Platforms do not share a common evidence of who approved what and what actually happened.

Sync exists to be the user-owned bridge — not another pile of AI chat history.

---

## The Hero

**Inspectable authority.**

The user should feel:

> “I can see what acted in my name, and I can stop it.”

Not scored. Not coached. Not watched in secret. **In control.**

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

> “Does this improve Sync’s ability to verify identity, permission, provenance, or action receipts without fabricating trust?”

If the answer is no, the change waits.

Features do not ship for their own sake. Surfaces do not expand until the engine earns trust.

---

## Relationship to the Codebase

The implemented pipeline maps to this manifesto:

| Manifesto concern | Engine stage | Primary modules |
|---|---|---|
| What happened | Memory / evidence | `lib/activity/*`, capture modules |
| Why it matters | Understanding / claims | `lib/passport/*`, `meaning-engine.ts` |
| Sharing or acting risk | Consequence | `consequence-engine.ts`, activity unresolved |
| Allow / deny / ask | Judgment | `decision-engine.ts` |
| How Sync communicates | Response | `sync-engine.ts`, `SYNC_VOICE.md` |
| Receipts and grants | Activity + Passport | `createActivityEvent`, `isVerifiedClaim` |

The lab UI (`/sync-lab`, mobile prototype) is a **teaching surface**, not the product.

---

## What Success Looks Like

- A second agent can retrieve a minimum-necessary, evidence-labeled answer about a prior action without reading the first agent’s conversation.
- GitHub (or another source) confirmation is the only path labeled externally verified.
- Users can inspect, revoke, correct, and delete without rewriting the ledger.
- Failed permission/provenance decisions become tests — not a louder UI.

See `SYNC_EVALUATION.md` for how trust is measured. The trust-layer demonstration is specified in `SYNC_TRUST_LAYER.md`.
