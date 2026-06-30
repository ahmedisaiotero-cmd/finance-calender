# BeliefStore Specification

## What a belief is

A **belief** is a durable proposition Sync treats as true enough to reason from. Beliefs are the current model of the user's world — not raw captures, not one-off observations, but synthesized claims that downstream reasoning can depend on.

```
Memory      → evidence (what was observed or stated)
Belief      → current model (what Sync treats as true enough)
Pattern     → repeated/cross-memory trend
Consequence → what changes if a belief holds
Judgment    → what deserves attention right now
```

Beliefs sit between evidence (memories, patterns) and action-oriented layers (consequences, judgment, brief, chat, review). They give Sync a stable, inspectable model instead of re-deriving propositions from scratch on every run.

## How beliefs differ from memories

| Dimension | Memory | Belief |
|-----------|--------|--------|
| Role | Evidence — a captured fact, note, or event | Model — a proposition Sync reasons from |
| Durability | Point-in-time record | Current best model, may supersede earlier beliefs |
| Confidence | Implicit in capture quality | Explicit confidence and score |
| Merging | Each memory is distinct | Duplicate propositions merge into one belief |
| Corrections | May carry correction metadata | Superseded beliefs retain lineage via `supersedesBeliefIds` |
| Privacy | May contain raw text | Keeps raw text out of evidence where possible |

Memories are inputs. Beliefs are computed outputs. A single belief may cite many memory IDs as `evidenceIds` without embedding their raw text.

## Belief kinds

| Kind | Description | Typical source |
|------|-------------|----------------|
| `fact` | Stable world state (dates, names, amounts) | Committed factual memories |
| `preference` | What the user likes, dislikes, or prefers | Preference memories, relationship notes |
| `commitment` | Scheduled or recurring obligations the user chose | Work schedule, appointments |
| `obligation` | External or financial duties with consequences | Rent, bills, deadlines |
| `concern` | Risks, worries, or attention-worthy tensions | Patterns, conflicting evidence |
| `pattern` | Repeated cross-memory trends | Active pattern records |
| `profile` | Stable user model from onboarding/settings | Profile priorities, goals |
| `correction` | Explicit update that supersedes prior beliefs | Correction metadata on memories |
| `sensitive` | High-privacy belief (rare; usually filtered at build) | Normally excluded at build time |

## Confidence

Each belief carries:

- **`confidence`** — categorical band: `low`, `medium`, `high`, `certain`
- **`confidenceScore`** — numeric 0–1 for ordering and thresholding

Confidence is derived from evidence count, memory commitment strength, pattern recurrence, and whether corrections have settled the proposition. A single committed memory yields medium confidence; multiple corroborating memories raise it; corrections reset lineage and may lower confidence on superseded beliefs.

## Evidence

`evidenceIds` links a belief to supporting memories (and optionally pattern IDs encoded as evidence). The build layer:

- Aggregates evidence when merging duplicate propositions
- Does not copy raw memory text into the belief payload
- Uses `explanation` for a short, human-readable summary of why the belief exists

## Correction semantics

When a memory carries correction metadata (`correction.supersedesMemoryIds`):

1. Beliefs built from superseded memories are marked `status: superseded`
2. A new belief (often `kind: correction` or the corrected kind) is created with updated proposition
3. `supersedesBeliefIds` links the new belief to the old
4. Evidence from both the correction memory and any still-valid memories is merged

Corrections are authoritative: the superseded belief remains in the store for traceability but is excluded from active reasoning.

## Privacy sensitivity

`privacySensitivity`: `none` | `low` | `medium` | `high` | `restricted`

- Memories flagged `securityRejected`, `sensitive`, or matching credential patterns never become beliefs
- Beliefs inherit elevated sensitivity from relationship, health, or financial domains
- Raw secrets, passwords, and API keys are blocked at build time, not stored as beliefs
- Evidence references IDs only — not raw sensitive text

## How beliefs feed downstream layers

| Layer | How beliefs are used |
|-------|----------------------|
| **Patterns** | Beliefs provide stable propositions patterns can reference; pattern beliefs re-enter the store |
| **Consequences** | "If belief X holds, what changes?" — obligations and commitments drive consequence rules |
| **Judgment** | Attention scoring weights active, high-confidence beliefs (not wired in this phase) |
| **Brief** | Daily brief draws from top active beliefs by domain and horizon (future) |
| **Chat** | Agent answers from belief model + fresh memories (future) |
| **Review** | Weekly review surfaces superseded beliefs, low-confidence items, and correction history (future) |

This phase computes beliefs only. No downstream layer is routed through BeliefStore yet.

## Why beliefs are computed first, persisted later

1. **Correctness before storage** — Merge rules, correction semantics, and privacy filters must be proven in tests before writing to durable storage.
2. **Determinism** — `buildBeliefStore` must return identical output for identical inputs; computing on demand makes regression testing straightforward.
3. **Schema evolution** — Belief shape will change as judgment, brief, and chat integrate; a computed layer avoids migration churn.
4. **Traceability** — The runtime trace can log belief snapshots per run without committing to a persistence format.
5. **Minimal scope** — No UI, mobile, Brief, or Chat changes; beliefs are an internal reasoning artifact.

## Build API

```typescript
buildBeliefStore({
  memories,
  profile,
  patterns,
  reference,
}): BeliefStore
```

Returns `{ beliefs: Belief[], builtAt: string }` sorted deterministically by belief `id`.

## Belief fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable deterministic identifier |
| `kind` | BeliefKind | One of the kinds above |
| `domain` | string | Reasoning domain (money, work, relationships, …) |
| `proposition` | string | Normalized claim Sync treats as true |
| `confidence` | ConfidenceBand | Categorical confidence |
| `confidenceScore` | number | 0–1 numeric confidence |
| `horizon` | BeliefHorizon | Time relevance |
| `status` | BeliefStatus | `active`, `superseded`, `expired`, `uncertain` |
| `evidenceIds` | string[] | Supporting memory/pattern IDs |
| `supersedesBeliefIds` | string[] | Prior beliefs this one replaces |
| `createdAt` | string | ISO timestamp |
| `updatedAt` | string | ISO timestamp |
| `expiresAt` | string? | Optional expiry |
| `privacySensitivity` | PrivacySensitivity | Privacy tier |
| `explanation` | string | Short rationale without raw evidence text |
