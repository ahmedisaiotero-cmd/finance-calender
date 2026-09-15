# Sync Activity + Passport Foundation

Status: **active pathway** (contracts exist; persistence, OAuth, MCP, and GitHub verification are next). See `SYNC_TRUST_LAYER.md` for product direction.

Read alongside `AGENTS.md`, `SYNC_WORKFLOW.md`, `SYNC_VISION.md`, and `SYNC_REASONING_SPEC.md`.

## Why this exists

Sync is pivoting toward a **permissioned AI activity and Passport layer**: as AI and
connectors begin to act on the user's behalf, Sync must be able to answer, calmly and
trustworthily:

- *What did anything (you, Sync, an assistant, a future connector) actually do today?*
- *What changed, what was only read, and what is still unresolved?*
- *What does Sync claim to know about me, and how strongly is each claim supported?*

This is a **Trust and Safety** improvement first. It gives the engine a provider-neutral way
to record activity and provenance without inventing verification, storing secrets, or
building a dashboard.

## Gate check

> **Improve the Sync Engine's ability to make trustworthy decisions by** giving it a
> provider-neutral, secret-safe record of AI activity and identity claims, so future
> permissioned actions can be summarized, reversed, and trusted.

Engine stages improved: **Trust**, **Safety**, **Consequences** (unresolved items and next
steps are consequences of activity), and **Briefing** (the daily snapshot is a briefing
output).

## What was added

| Area | File | Role |
|---|---|---|
| Activity contract | `lib/activity/types.ts` | Provider-neutral `ActivityEvent` and its enums |
| Safety | `lib/activity/redaction.ts` | Redacts secrets/tokens from text and detail |
| Construction | `lib/activity/activity-event.ts` | Safe factory, normalize, de-dupe |
| Pipeline | `lib/activity/daily-snapshot.ts` | Pure events → daily snapshot |
| Barrel | `lib/activity/index.ts` | Public entry point |
| Passport contract | `lib/passport/types.ts` | `PassportClaim` and basis/status enums |
| Passport reasoning | `lib/passport/claims.ts` | Reconcile claims, derive candidates |
| Barrel | `lib/passport/index.ts` | Public entry point |
| Tests | `tests/activity-event-contract.test.ts`, `tests/activity-daily-snapshot.test.ts`, `tests/passport-claims.test.ts` | Messy real-life coverage |

All new files are pure TypeScript data + functions. They import **types only** from the rest
of the app, so nothing pulls UI, Prisma, Supabase, or network code into this layer.

## The activity event contract

A single logical action produces one or more events that share a `correlationId`:

```
request → approval → execution → result | failure
import            (data read into Sync)
context_access    (Sync/AI read existing context; no state change)
```

Every event carries the fields the pivot needs to reason about trust and reversibility:
`actor`, `source` (service + opaque `connectionId`), `timestamp`, `affectedAreas`,
`evidence`, `verification`, `confidence`, `reversibility`, `permission`, and `visibility`.

Two rules are enforced in code, not just documented:

1. **No secrets.** `createActivityEvent` runs every human-readable field through
   `redactSecrets` and drops sensitive keys from `detail`. `connectionId` and `sourceRef`
   are opaque references, never tokens.
2. **No fabricated confidence.** Confidence is clamped to `[0, 1]`; verification is a fixed
   ladder (`unverified < self_reported < system_logged < source_confirmed`).

## The daily snapshot pipeline

`buildActivitySnapshot(events, options)` is **pure**: no clock, no I/O. It de-dupes and
sorts events, groups them by `correlationId`, reconciles each lifecycle, and returns:

- **whatHappened** — occurrences (completed, failed, or read-only context access).
- **whatChanged** — per-area changes, from state-changing kinds only (`execution`,
  `result`, `import`). Context access never appears here.
- **whatWasAffected** — the union of touched life areas.
- **unresolved** — awaiting approval, approved-not-executed, executed-no-result, failures,
  revoked/expired permission, and incomplete evidence (a "completed" action Sync cannot
  confirm).
- **suggestedNextSteps** — calm, specific, Sync-voice prompts ranked by attention, with
  irreversible failures and revoked permissions ranked highest.

Messy input is expected: duplicate deliveries, conflicting success/failure for one action,
partial lifecycles, hidden events, and unverifiable "completions" are all handled and
covered by tests.

Judgment stays where it belongs: this pipeline does **not** rank Today priorities. It
prepares an honest activity record that the Decision Engine and Sync Engine can later
consume.

## The Passport claim contract

A `PassportClaim` is something Sync believes about the user, tagged by **basis**:

- `user_stated` — the user told Sync.
- `account_linked` — a linked account implies it.
- `source_confirmed` — an external source explicitly confirmed it.
- `inferred` — Sync derived it.

`reconcilePassportClaims` selects the best-supported claim per subject (basis, then
verification, recency, confidence), corroborates same-value claims, and surfaces
different-value **conflicts**. It never upgrades a claim's basis or verification —
`isVerifiedClaim` is true only when a claim is source-confirmed in both. Revoked and expired
claims never participate in the live Passport.

## How this reuses existing Sync intelligence

- **Affected areas** reuse the canonical `LifeAreaId` taxonomy from `lib/user-life-areas.ts`
  (type-only import) instead of a new area list.
- **Verification** is shared between activity events and Passport claims, so a
  source-confirmed event can honestly support a source-confirmed claim
  (`deriveClaimCandidatesFromEvents`).
- **Consequence framing** mirrors `SYNC_REASONING_SPEC.md`: unresolved items and next steps
  are *what follows* from activity, not an event replay — the same principle as
  `sync-consequences.ts`.
- **Voice**: next-step copy is calm, specific, and non-dramatic per `SYNC_VOICE.md`.

## Where connectors attach

1. A permissioned connector authenticates **outside** the pure contract (OAuth / MCP session) and holds tokens in a secure store — never in an `ActivityEvent`.
2. On each action or import, the connector calls `createActivityEvent(...)` with a provider-neutral `source.service`, an opaque `connectionId`, redacted summaries, and the appropriate `verification` and `permission` state. Agent self-reports stay `self_reported` with actor `assistant`. Only the source (e.g. GitHub) may emit `source_confirmed`.
3. Do **not** write agent context into `CapturedSyncItem` as if it were user memory. Derive Passport candidates via `deriveClaimCandidatesFromEvents`.
4. UI stays thin: pending approvals + recent receipts. No activity dashboard.

## Explicitly not done yet (next slices, in order)

- Persist ActivityEvent (append-only Prisma). **Do this next.**
- Real OAuth clients and agent connections.
- GitHub as the first `source_confirmed` verifier.
- Product MCP adapter (thin; no ranking in handlers).
- Quiet control-center UI.

Still forbidden: storing raw secrets on events, upgrading verification in place, treating `lib/sync-connections.ts` as real verification.

## Tests

- `tests/activity-event-contract.test.ts` — redaction, confidence clamping, area de-dupe,
  event de-dupe, chronological + lifecycle ordering.
- `tests/activity-daily-snapshot.test.ts` — clean lifecycle, duplicates, conflicting
  evidence, irreversible failure ranking, revoked/pending permission, partial lifecycles,
  context access, hidden events, incomplete evidence, date filtering, and a busy mixed day.
- `tests/passport-claims.test.ts` — basis derivation, candidate gating, conflict vs
  corroboration, no fabricated verification, and revoked/expired exclusion.

These are auto-discovered by `npm run test:all`.
