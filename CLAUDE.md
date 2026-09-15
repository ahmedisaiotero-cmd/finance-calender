# Claude / Cursor agent entry point

Before making changes, read:

- **SYNC_TRUST_LAYER.md** — current product direction
- **AGENTS.md** — engine-first rules, pipeline, forbidden moves
- **SYNC_WORKFLOW.md** — workflow guardrails
- **SYNC_ENGINE_MANIFESTO.md** — mission, constitution, philosophy
- **SYNC_REASONING_SPEC.md** — required reasoning pipeline per input
- **SYNC_EVALUATION.md** — trust metrics
- **SYNC_ENGINE_ROADMAP.md** — phased sequencing (**supersedes ROADMAP.md**)
- **SYNC_VISION.md** — voice, surfaces, design stance
- **SYNC_ACTIVITY_PASSPORT.md** — activity + claim contracts
- **SYNC_PRINCIPLES.md**, **SYNC_VOICE.md** when language is involved
- **ROADMAP.md** — module status and historical milestones only

## Gate question

> **Does this improve Sync’s ability to verify identity, permission, provenance, or action receipts without fabricating trust?**

## Default prompt prefix

> **Improve Sync’s trust layer by…**

Sync is a **user-controlled trust layer** (one account, OAuth/MCP doorways, evidence ledger). The product is **trust**. `/sync-lab` teaches the engine. Do not present agent-reported information as verified.

See **AGENTS.md** for full engineering rules.
