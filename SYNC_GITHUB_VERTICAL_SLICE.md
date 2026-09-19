# GitHub OAuth → source-confirmed receipt (next vertical slice)

**Status:** implementation-ready plan. **Not implemented.** No GitHub OAuth app credentials are assumed.

Do not apply the ledger migration to production Neon as part of this slice. Apply it only to an isolated test or explicitly reviewed non-prod database.

## Goal

Prove one official connection can create a **new** `source_confirmed` activity event through trusted server code:

1. Signed-in Sync user (`requireRequestIdentity`).
2. GitHub OAuth (official API) with **read-only** scopes (start with `repo` read or `public_repo` as appropriate; prefer the narrowest available).
3. `Connection` + `PermissionGrant` (read checks/commits only, short expiry).
4. Fetch a check or commit the user asked Sync to verify.
5. `appendSourceConfirmedActivityEvent` with `priorEventId` if an agent already reported the same action.
6. Visible receipt with `verification: source_confirmed`.
7. Revoke connection + grant; further GitHub fetches and privileged writes fail.
8. Tests: spoof via public POST blocked; cross-user denied; idempotent replay; post-revoke denied.

## Files to add (when implementing)

| Area | Likely path |
|---|---|
| OAuth start/callback | `app/api/connections/github/route.ts` (PKCE, `state`, exact redirect allowlist) |
| Token vault | `lib/secrets/token-vault.ts` — encrypt; never log |
| GitHub client | `lib/connectors/github/verify-check.ts` |
| Grant enforcement | `lib/agent-trust/invariants.ts` + future persist |
| Receipt | existing `appendSourceConfirmedActivityEvent` |
| UI | one quiet Connections/Activity view — not a dashboard |
| Tests | spoof, owner scope, revoke, idempotency |
| Migration | only after isolated test DB exists |

## Security checklist

- PKCE + `state` + nonce; HTTPS only.
- Tokens never on `ActivityEvent` or in client storage.
- Callback must bind to the session user, not a client-supplied `userId`.
- Public `/api/activity` still cannot create `source_confirmed`.
- Manual “I connected GitHub” text is `manual` / `self_reported`, never `source_confirmed`.

## Stop conditions

Do not implement this slice until:

- `SYNC_TEST_DATABASE_URL` points at isolated Postgres **or** the implementer documents a reviewed exception;
- GitHub OAuth app client ID/secret exist in the **local/non-prod** environment;
- ledger migration has been applied to that isolated DB, not silently to production.

## Acceptance checks

- Agent-reported “tests passed” stays `self_reported`.
- GitHub confirmation is a **new** row with `priorEventId`.
- Revoked grant cannot fetch or confirm.
- Foreign workspace cannot read the receipt.
