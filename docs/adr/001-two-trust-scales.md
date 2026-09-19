# ADR 001 — Two trust scales

**Status:** accepted  
**Date:** 2026-09-19

## Decision

Human identity assurance and event/claim provenance are separate domain concepts. They must never share a Prisma column, TypeScript enum, or API field.

## Context

Sync previously used one verification ladder for activity (`unverified` → `self_reported` → `system_logged` → `source_confirmed`). The product now also needs to express how strongly an *account* is bound to a *person*. Collapsing those scales would let an identity-proofed user appear to have source-confirmed activity, or treat a GitHub check as proof of legal identity.

## Identity assurance (person)

Internal tiers: `account_verified`, `self_attested`, `source_linked`, `identity_proofed`.

Statuses: `pending`, `verified`, `failed`, `expired`, `revoked`.

Guidance vocabulary may follow NIST SP 800-63A. **Do not claim NIST certification or exact IAL conformance.**

## Event provenance (claim)

Unchanged: `unverified`, `self_reported`, `system_logged`, `source_confirmed` on `ActivityEvent.verification`.

Public writes may only create `unverified` or `self_reported`. `source_confirmed` is created only by `appendSourceConfirmedActivityEvent`.

## Invariants

- Setting `identity_proofed` must not change any activity row’s `verification`.
- Creating `source_confirmed` must not change `PrincipalIdentity` assurance.
- Client-supplied assurance or verification fields are never trusted.
- No silent upgrades on either scale.

## Consequences

Passport `basis` stays claim-level (`user_stated`, `account_linked`, `source_confirmed`, `inferred`). It is not a government-ID tier.

New identity objects live in `lib/agent-trust/`, not in `lib/activity/types.ts`.
