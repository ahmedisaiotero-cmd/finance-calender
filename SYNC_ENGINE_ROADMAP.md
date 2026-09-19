# Sync Engine Roadmap

This roadmap sequences Sync as the identity, permission, and provenance layer for AI agents.

Canonical mission: `SYNC_TRUST_LAYER.md`. ADRs: `docs/adr/`. Legal/privacy: `docs/SYNC_PRIVACY_LEGAL_CHECKLIST.md`. Next slice: `SYNC_GITHUB_VERTICAL_SLICE.md`.

Today / Daily Brief is an **optional** later output. It is not the product gate.

---

## North Star

A verified person can connect a supported agent, grant narrow permissions, and see evidence-labeled receipts — with **In Sync** only when identity, connection, permission, and health are all valid.

---

## Completed

| Phase | Commit | Notes |
|---|---|---|
| Direction lock | `104db32` | Trust-layer docs |
| T1 Evidence ledger | `5012a9b` | Append-only `ActivityEvent` |
| T1.1 Verification hardening | `acb37ce` | Public POST cannot mint `source_confirmed` |
| Agent-identity mission lock | this change | Two trust scales, contracts, legal checklist |

Ledger migration `20260915000000_activity_event_ledger` is **not** applied to Neon.

---

## Next (authoritative)

1. Isolated Postgres via `SYNC_TEST_DATABASE_URL` (blocked until a local test DB exists).
2. Apply the ledger migration **only** to that isolated DB.
3. GitHub OAuth read-only → `appendSourceConfirmedActivityEvent` (`SYNC_GITHUB_VERTICAL_SLICE.md`).
4. Permission persist + revoke UI (quiet control center).
5. MCP doorway for Cursor/ChatGPT against the same grants.
6. Passkeys/MFA and optional identity-proofing **after** counsel + vendor review.
7. Portable Sync-issued attestations (VC/OpenID4VC) only when a receiver exists.

Frozen: briefing redesign, finance/health dashboards, desktop rewrite, EU identity-proofing launch.

---

## Current position

Foundation of the identity/permission product exists. The complete connection → permission → receipt user flow does **not**. Human identity tiers, agent bindings, OAuth connections, and signed cards are designed, not shipped.
