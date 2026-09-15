# Sync Trust Layer

**Status:** active product direction (2026-09-15). This document supersedes briefing-first product framing when the two conflict. The intelligence pipeline is kept; the product question changes.

Read alongside `SYNC_ACTIVITY_PASSPORT.md`, `AGENTS.md`, `SYNC_VISION.md`, and `SYNC_ENGINE_ROADMAP.md`.

---

## What Sync is now

Sync is a **user-controlled trust layer** between a person and AI systems.

It lets connected agents know, at minimum necessary scope:

- who they are acting for
- what they are allowed to do
- what is already known, and how strongly
- what actually happened, and who confirmed it

The product is still **trust**. Trust now means **provenance and permission**, not a daily life briefing and not a reputation score.

**Core question:** *Did this agent have permission, and what is the evidence?*

The existing engine stays as **internal machinery**:

| Stage | Trust-layer job |
|---|---|
| Memory | Evidence and events |
| Understanding | Claims derived from evidence |
| Consequences | Risk of sharing or acting |
| Judgment | Allow, deny, limit, or request approval |
| Response | Quiet receipts and permission language |

Life briefing (Today, My Life, Capture) remains in the repo as a proving ground. It is **not** the north star. Do not grow it unless it helps verify identity, permission, provenance, or receipts.

---

## What Sync is not

- a planner, dashboard, chatbot, or productivity app
- a universal “AI reputation score”
- a custom identity protocol or blockchain
- a claim that activity is “verified” because it appeared in a conversation
- a silent collector of full AI chat histories

Quiet is correct. Opaque is not. Users must still inspect, revoke, correct, delete, and require approval.

---

## Evidence levels (never upgrade in place)

Every stored fact needs a provenance label. Map product language onto the existing Activity / Passport enums — do not invent a second type system.

| Product language | Activity `verification` / Passport `basis` | May call “verified”? |
|---|---|---|
| User-confirmed | `self_reported` / `user_stated` | No |
| Sync-observed | `system_logged`, actor `sync` | No |
| Agent-reported | `self_reported`, actor `assistant` | No |
| Externally verified | `source_confirmed` **and** `isVerifiedClaim` / event `source_confirmed` | Yes |
| Sync-inferred | `inferred` | No |

Agent-reported and user-stated must stay distinguishable by **actor**, not by inflating verification.

A signature proves a key signed data. It does not prove the claim is true. GitHub (or another source) confirming a check is stronger than Cursor saying “tests passed.”

---

## What to record (narrow events, not a score)

For each agent action, prefer these fields (already mostly on `ActivityEvent`):

- which human authorized
- which agent/model requested or performed
- what information was shared
- what permission and limits were granted
- which tool or service was used
- what action was attempted
- whether it succeeded (as reported vs as confirmed)
- which system confirmed the result
- when the grant expires
- whether it was revoked

An external agent should be able to ask only:

- “May I modify this repository?”
- “Does this user require confirmation before spending money?”
- “Has this task already been completed?”
- “Which preferences are user-confirmed versus inferred?”
- “Did the previous coding agent actually run the tests?”

Sync returns the **minimum necessary** answer — never the full history by default.

---

## Architecture (one account, many doorways)

```
Human  →  Sync website (account, grants, revoke, correct)
              │
              ├── Evidence ledger (append-only ActivityEvent)
              ├── Passport claims (derived, correctable)
              ├── Policies (narrow, time-bound grants)
              │
              ├── OAuth  (ChatGPT app, other hosts)
              ├── MCP    (Cursor and any remote-MCP client)
              └── Connectors (GitHub and later sources confirm outcomes)
```

Installing Sync inside ChatGPT, Cursor, or another host is a **doorway** into the same account. It does **not** give Sync omniscience over that host. The host still controls what the plugin receives and whether the agent actually calls Sync.

**Existing foundation to reuse (do not fork):**

- `lib/activity/*` — event contract, redaction, `createActivityEvent`
- `lib/passport/*` — claims, `isVerifiedClaim`, never-upgrade
- `lib/auth/request-identity.ts` — trusted human identity
- `decision-engine.ts` — judgment for sharing risk / approval, not a second ranker
- Capture/memory pipeline — user-confirmed and inferred **memory**, not the ledger

**Do not treat as verification:** `lib/sync-connections.ts` (labels only).  
**Do not extend as the agent protocol:** `/api/chat`.

---

## Standards to follow (do not invent a protocol)

Build the product on existing rails. Standardization of Sync’s event format can wait until there is real usage.

| Use | Standard |
|---|---|
| Human login | Existing Supabase Auth (passkeys later) |
| Plugin login | OAuth 2.0 authorize/token issued by Sync |
| Agent tools | MCP (remote), OAuth-style authorization |
| Allow/deny API | Align with OpenID AuthZEN shapes when exposing policy |
| Portable claims later | W3C Verifiable Credentials 2.0 + OpenID for VP |
| Agent discovery later | A2A Agent Cards |
| Industry problem space | NIST AI agent identity and authorization |
| Constraints / provenance research | IETF Agent Identity Protocol (experimental draft only) |

---

## Closed-loop demonstration (definition of done for the pivot)

1. Ahmed signs into one Sync account.
2. Cursor connects through Sync MCP + OAuth.
3. ChatGPT connects through a Sync app (same account).
4. Cursor requests narrowly scoped GitHub authority.
5. Sync records authorization as evidence.
6. Cursor performs a repository task.
7. GitHub independently confirms commits/checks/PR state.
8. ChatGPT can retrieve a **limited, evidence-labeled** summary of the outcome.
9. Ahmed can revoke both connections from the Sync site.

Until GitHub (or another source) confirms, the result stays **agent-reported**.

---

## Build sequence (authoritative for this direction)

Do not start with a universal protocol, a ChatGPT marketplace polish pass, or a website redesign.

0. **Docs / agent rules** — this file plus AGENTS/vision/roadmap (so agents do not refuse product MCP).
1. **Schemas** — persist ActivityEvent; OAuth clients; agent connections; policies. Corrections = new events, not row mutation.
2. **Evidence ledger** — append-only writes only via `createActivityEvent`.
3. **Permission engine** — narrow, expiring grants; human confirmation for sensitive actions.
4. **GitHub verification connector** — the first `source_confirmed` path.
5. **MCP adapter** — thin tools: `get_relevant_context`, `check_permission`, `request_approval`, `record_user_instruction`, `report_agent_action`, `verify_task_outcome`, `get_previous_task_state`.
6. **Cursor connection** — same MCP + same account.
7. **ChatGPT Sync app** — install + Sign in with Sync.
8. **Quiet control center** — connections, pending approvals, recent receipts, revoke, “why does this agent know that?”
9. **Signed receipts** — tamper-evident bundles of user + agent + grant + action + result (after the loop works).
10. **Additional platforms** — only with a concrete use case and enough API access.

Legacy briefing work is frozen unless it unblocks this loop.

---

## Privacy and safety rules

- Do not ingest full conversations by default.
- Tokens never live on `ActivityEvent`; hash or secret-store only.
- `/api/*` is not gated by page middleware — every new route must authenticate (human session or OAuth connection).
- Demo mode must not write real receipts for a real user.
- Memory and ledger stay separate: correcting a preference must not rewrite history.
- Never present inferred or agent-reported information as verified.

---

## Honest scope

| Horizon | Realistic? |
|---|---|
| Private beta of the Cursor ↔ Sync ↔ GitHub loop | Yes |
| ChatGPT + Cursor + GitHub on one account | Yes, host-limited |
| Cross-platform trust with several integrations | Difficult, cooperation-required |
| Universally recognized AI identity / passport | Long-term ecosystem bet |

The opportunity now is **the trustworthy bridge that stops every agent from starting blind, repeating work, or acting with unclear authority** — not owning everyone’s AI identity.
