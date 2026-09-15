# Sync Engine Roadmap

This roadmap defines how Sync becomes a trusted permission, context, and action-receipt layer.

It supersedes product-expansion sequencing in `ROADMAP.md` when the two conflict. Canonical product direction: `SYNC_TRUST_LAYER.md`.

Read alongside `SYNC_ENGINE_MANIFESTO.md`, `SYNC_REASONING_SPEC.md`, `SYNC_ACTIVITY_PASSPORT.md`, and `SYNC_EVALUATION.md`.

---

## North Star

**Never-fabricated verification** plus a working **Cursor ↔ Sync ↔ GitHub** loop (then ChatGPT on the same account).

Do not expand life dashboards, reputation scores, or a custom identity protocol. Briefing TDR work may continue as engine tests; it is not the product gate.

---

## Approved Build Sequence

This sequence is authoritative.

0. **Direction lock** — `SYNC_TRUST_LAYER.md` and agent rules (done when those docs are current)
1. **Persist the Activity + Passport contracts** — append-only ledger, OAuth clients, agent connections (reuse `lib/activity`, `lib/passport`; do not dump into `SyncProfile.data`)
2. **Permission engine** — narrow, expiring grants; human confirmation for sensitive actions
3. **GitHub verification connector** — first `source_confirmed` path
4. **MCP adapter** — thin tools over the same account; no parallel brain
5. **Cursor connection**
6. **ChatGPT Sync app** (same OAuth account)
7. **Quiet control center** — connections, approvals, receipts, revoke
8. **Signed receipts** — after the loop works
9. **Additional platforms** — only with a concrete use case and enough API access

Legacy sequence (Life Graph, briefing TDR, goals, consumer Today polish) is **frozen** unless it unblocks this loop.

Integrations are no longer “step 7 after TDR ≥ 85%.” GitHub + MCP **are** the product path. Calendar/bank/health APIs remain deferred.

---

## Phase T1: Evidence ledger

**Goal:** Activity events survive a process restart without claiming extra verification.

- Prisma insert-only rows matching `ActivityEvent`
- Writes only through `createActivityEvent`
- Corrections = new events (`correlationId`, supersede in detail)
- Tests: persist + never-upgrade + redaction

**Exit:** events round-trip; agent-reported cannot become `source_confirmed` in place.

---

## Phase T2: OAuth + permission grants

**Goal:** A host can Sign in with Sync and receive a narrow, expiring grant.

- Human login stays Supabase
- Sync-issued OAuth authorize/token for plugins
- `PermissionState` + scopes on `AgentConnection`
- Minimal pending-approval UI (not a dashboard)

**Exit:** grant, expire, revoke recorded as activity events.

---

## Phase T3: GitHub confirmation

**Goal:** An outside system can upgrade a *new* event to `source_confirmed`.

**Exit:** Cursor-reported “tests passed” stays agent-reported until GitHub checks confirm.

---

## Phase T4: MCP + Cursor

**Goal:** Cursor calls Sync tools against the same account.

Tools: context, permission, approval, record instruction, report action, verify outcome, previous task state.

**Exit:** closed loop without ChatGPT still counts.

---

## Phase T5: ChatGPT app + revocation

**Goal:** Second host retrieves a limited verified summary; user revokes both from the website.

**Exit:** the demonstration in `SYNC_TRUST_LAYER.md`.

---

## Explicitly deprioritized

- New main tabs, analytics, streaks, reputation scores
- Sync Health / Sync Money standalone apps
- Custom cryptographic protocol or blockchain
- Ten shallow integrations
- Chatbot-first UI (`/api/chat` is not the protocol)
- Today / Daily Brief redesign
- Ingesting full conversation histories by default

---

## Current Position

| Phase | Status |
|---|---|
| Direction lock | **In progress** (docs) |
| Activity + Passport contracts | **Done** (pure TS, not persisted) |
| Phase T1: Evidence ledger | Next |
| Phase T2–T5 | Not started |
| Legacy briefing phases 1–5 | Frozen unless they unblock T1–T5 |

**Immediate focus:** persist `ActivityEvent`, then OAuth-bound MCP, then GitHub as the only external verifier.

---

## How This Relates to `ROADMAP.md`

`ROADMAP.md` describes historical MVP and intelligence architecture work. This document plus `SYNC_TRUST_LAYER.md` define **what comes next**.

When planning work:

1. Read `SYNC_TRUST_LAYER.md` for product direction
2. Read `SYNC_ENGINE_ROADMAP.md` for sequencing
3. Read `ROADMAP.md` for module status and completed milestones
4. If conflict: **never-fabricated verification and the closed loop win over briefing expansion**
