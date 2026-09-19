# GitHub OAuth → source-confirmed receipt

**Status:** implemented as a local vertical slice. Live GitHub OAuth still needs a local OAuth App (`GITHUB_CLIENT_ID` / `SECRET` / redirect). Isolated Postgres is required for Prisma tests.

Do not apply ledger or GitHub migrations to production Neon from this work.

## What is proven

1. Signed-in Sync identity (`requireRequestIdentity`) owns the connection.
2. Official GitHub HTTP API (`GET /repos/{owner}/{repo}/commits/{sha}`) is the only confirmation source. Fetch is injectable in tests.
3. OAuth start uses PKCE (`S256`) and `read:user` only. Classic `repo` is not requested (it is write-capable).
4. Tokens sit in AES-256-GCM (`SYNC_TOKEN_VAULT_KEY`). They never appear on `ActivityEvent`.
5. `confirmGithubCommit` → `appendSourceConfirmedActivityEvent`. Agent “tests passed” stays `self_reported`; GitHub writes a **new** row and may set `priorEventId`.
6. Revoke destroys ciphertext and blocks later `get` / confirm (`connection_revoked`).
7. Public `POST /api/activity` still cannot mint `source_confirmed`.
8. Cross-owner connection reads fail.

## Isolated database

`prisma migrate deploy` **cannot** bootstrap empty Postgres in this repo: `20250601000000_add_timeline_item` assumes `Workspace` already exists (no baseline). Isolated setup:

```
docker compose -f docker-compose.test.yml up -d
# SYNC_TEST_DATABASE_URL=postgresql://sync:sync_test_only@127.0.0.1:5433/sync_test
npm run db:test:migrate
```

`db:test:migrate` runs `prisma db push` against that localhost URL only. The existing ledger SQL is also applied in `tests/ledger-migration-sql.integration.test.ts` onto a throwaway `User`/`Workspace` database.

## Routes

| Method | Path | Role |
|---|---|---|
| POST | `/api/connections/github` | Start OAuth (503 if unset) |
| GET | `/api/connections/github/callback` | Finish OAuth, persist connection |
| POST | `/api/connections/github/verify` | Official commit read → receipt |
| POST | `/api/connections/github/revoke` | Destroy token, revoke grant |

## Limitation

Private repositories need a later, narrower GitHub App permission (`contents:read` / `checks:read`). This slice confirms **public** commits after the user is bound with `read:user`.

## Not in this slice

ChatGPT/MCP, identity proofing, other agents, production Neon migrate, desktop rewrite.
