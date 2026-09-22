# Sync Trust Layer

**Status:** active product mission (updated 2026-09-19). This document is the canonical product definition.

Read alongside `SYNC_ACTIVITY_PASSPORT.md`, `docs/adr/001-two-trust-scales.md`, `docs/adr/002-oauth-mcp-a2a-vc.md`, `docs/SYNC_PRIVACY_LEGAL_CHECKLIST.md`, `AGENTS.md`, and `SYNC_ENGINE_ROADMAP.md`.

---

## Product definition

> **Sync is the user-controlled identity, permission, and provenance layer that binds a verified person to their AI agents, tells each agent what it may know or do, and records trustworthy receipts of what happened.**

Distributed by **AOT Creatives** (legal entity: **AOT LLC**). The existing Next.js app is the Sync control plane. AOT marketing/download lives on a separate site unless a deliberate monorepo is created later.

**Core questions:**

1. How strongly do we know this account belongs to this person? *(human identity assurance)*
2. Did this agent have permission, and what is the evidence? *(event/claim provenance)*

These are **two different trust scales**. Never store them in one field. See `docs/adr/001-two-trust-scales.md`.

---

## Intended experience

1. Download or install Sync from AOT Creatives (web/PWA first).
2. Create and secure one Sync account (email + passkey/MFA).
3. Optionally choose a higher identity-verification tier. Government-ID proofing is the highest **optional** tier.
4. Connect a **supported** AI host or agent through official OAuth, MCP, API, or A2A.
5. Review exactly what that connection may read, write, or do.
6. Approve limited, expiring permissions. Sync records the user grant; the provider must also authorize what it can technically enforce.
7. Sync binds person, agent, provider account, permissions, and activity history.
8. The UI shows **In Sync** only while identity/account, live connection, current permission, and last health check are all valid.
9. The user can inspect, narrow, pause, revoke, export, or delete access at any time.

Today/briefing may remain as an optional benefit. It is **not** the product identity.

---

## What Sync is not

- an AI model or another general-purpose agent
- a password manager or government identity issuer
- a claim that every consumer AI account can be connected
- an autonomous system with unlimited standing permission
- a productivity dashboard or daily briefing product
- a universal “AI reputation score”
- NIST-certified (unless independently assessed — do not advertise this)

---

## Honest interoperability

> Connect supported AI hosts and agents using their official interfaces. Sync provides one identity and permission control plane, and portable credentials where the receiving platform supports open standards.

Adapter support states (`lib/agent-trust`):

| State | Meaning |
|---|---|
| `native` | Official OAuth/API with enforceable scopes |
| `mcp` | Host connects to Sync’s authenticated MCP server |
| `a2a` | Agent discoverable through A2A |
| `manual` | User recorded an agent; no live control or verification |
| `unsupported` | No safe official integration |

Never scrape sessions, copy cookies, or collect provider passwords. Manual records must not use a live **In Sync** badge.

---

## Two trust scales (do not collapse)

### A. Human identity assurance

Answers: *How strongly has Sync established that this account belongs to a particular person?*

| Tier | Meaning |
|---|---|
| `account_verified` | Email plus passkey/MFA. No real-world identity claim. |
| `self_attested` | User-supplied profile claims, labeled as such. |
| `source_linked` | Official OAuth/federation proved control of an external account. Not government-ID proofing. |
| `identity_proofed` | Approved third-party processor verified government ID (and lawful selfie/liveness if chosen). Sync stores the **result and provider reference only**. |

Status: `pending` | `verified` | `failed` | `expired` | `revoked`.

NIST SP 800-63A is vocabulary/guidance, not a certification claim.

### B. Event / claim provenance

Answers: *How strongly is this particular activity or claim supported?*

Preserve the existing Activity / Passport ladder. Do not invent a second event enum.

| Product language | Activity `verification` | Public POST may create? |
|---|---|---|
| Unverified | `unverified` | Yes |
| User- or agent-reported | `self_reported` | Yes |
| Sync-observed | `system_logged` | No — trusted server path only |
| Externally confirmed | `source_confirmed` | No — `appendSourceConfirmedActivityEvent` only |

An identity-proofed user can still make an unverified statement. A `source_confirmed` event can belong to a user who never completed government-ID proofing.

---

## Core domain objects

Contracts live in `lib/agent-trust/` (TypeScript only; no Prisma persistence yet):

| Object | Role |
|---|---|
| `PrincipalIdentity` | Human owner and identity-assurance record |
| `AgentIdentity` | Agent bound to a principal — not the human |
| `AgentCard` | Public A2A-style manifest (no secrets) |
| `Connection` | Official provider/MCP/A2A link + health |
| `PermissionGrant` | Least-privilege, expiring grant |
| `Delegation` | Person authorizes agent under limits |
| `ContextPackage` | Minimal, purpose-bound disclosure |
| `ActivityReceipt` | Envelope over append-only `ActivityEvent` |
| `CredentialAttestation` | Sync-issued signed claim (not government-issued) |

Reuse `lib/activity/*` and `lib/passport/*`. Do not dump this into `SyncProfile.data` or `captured-items`.

---

## Architecture (preserve the foundation)

```
AOT Creatives (marketing / download)
        │
Human → Sync cloud control plane (this repo)
              ├── Principal identity + optional proofing result
              ├── Agent identities, cards, connections
              ├── Permission grants + delegations
              ├── Encrypted token vault (not in the ledger)
              ├── Evidence ledger (append-only ActivityEvent)
              ├── Passport claims (correctable; not history)
              ├── OAuth / MCP / later A2A
              └── Verifiers (GitHub first) → source_confirmed receipts
```

**Reuse:** `createActivityEvent`, `appendActivityEvent` (public), `appendSourceConfirmedActivityEvent` (trusted), `requireRequestIdentity`, `trustedWorkspaceId`, Decision Engine for allow/deny/approval scoring.

**Do not treat as verification:** `lib/sync-connections.ts`.  
**Do not use as the agent protocol:** `/api/chat`.

---

## Surfaces (quiet control center)

Primary navigation when built (minimal, not a dashboard):

- **Identity** — assurance tier, security, recovery
- **Agents** — cards, capabilities, status
- **Connections** — health, protocol, last check
- **Permissions** — pause/revoke
- **Activity** — provenance-aware receipts
- **Settings & Data** — export, delete, notices

Legacy Home / Capture / My Life stay frozen unless they unblock this loop. `/sync-lab` remains a teaching surface.

---

## Downloadable software

Web/PWA first. Identity callbacks, OAuth, token vault, attestations, revocation, and the ledger stay in the cloud. No Electron/Tauri rewrite now. See `docs/adr/003-downloadable-pwa-desktop.md`.

---

## Build sequence

T0–T1.1 are done on `main` (`104db32`, `5012a9b`, `acb37ce`). Ledger migration is **not** applied to Neon.

Next: isolated test-database (blocked until `SYNC_TEST_DATABASE_URL` exists) → GitHub OAuth read-only vertical slice. Plan: `SYNC_GITHUB_VERTICAL_SLICE.md`.

Do not invent a custom identity protocol, blockchain, or reputation score.

---

## Privacy baseline

Adults-only, US-first. Government-ID proofing optional. No advertising-data business. Specialist processor for IDs/biometrics; Sync must not store raw IDs, selfies, templates, document numbers, or SSNs. Counsel review is a **launch blocker**. See `docs/SYNC_PRIVACY_LEGAL_CHECKLIST.md`.
