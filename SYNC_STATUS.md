# Sync status (code-derived)

Last reviewed from repository inspection on the current `main` branch.

## Working and tested

- Capture → memory → meaning → consequences → Decision Engine → Today/Brief adapters
- Sync Engine conversation/security/vague-input paths (`lib/sync-engine/*`)
- Life Graph projection, continuity, beliefs, diagnostics (`lib/intelligence/life-graph/*`)
- `/sync-lab` teaching surface and mobile prototype adapters
- Root web typecheck/build with `sync-ios` excluded
- Large regression corpus under `tests/` (70+ files)

## Implemented but weakly gated in default `check`

- Many Life Graph / capture / trust tests exist but were historically outside `test:intelligence:all`
- Use `npm run test:all` / `npm run validate:web` for full coverage

## Partial / demo-oriented

- Prisma finance/calendar/transactions/timeline/user APIs require authenticated identity (or explicit non-production `SYNC_DEMO_MODE=true`); shared silent demo fallback removed
- Unscoped Supabase `timeline_items` reads are disabled on `/api/timeline` until owner field + RLS exist
- Legacy money/calendar/health dashboard pages remain in `app/` and `src/data/*` mock data
- `/api/chat` requires trusted identity + durable Prisma fixed-window rate limit (defaults 30/hour); OpenAI/fallback only after auth+limit; not Sync Engine pipeline
- App shell is gated on a real Supabase session (`/login` email/password); local profile/onboarding no longer counts as authentication
- Onboarding/profile remote sync exists when Supabase + DB are configured

## Placeholder / deferred

- Persist ActivityEvent ledger + OAuth/MCP (next; see `SYNC_TRUST_LAYER.md`)
- Full Goals product loop
- Calendar/bank/health APIs (not GitHub — GitHub is in-scope as verifier)
- Supabase `timeline_items` owner column + RLS (currently disabled on `/api/timeline`)
- Applying `ChatRateLimitWindow` migration in production (committed as `20260813000000_chat_rate_limit_window`; not applied by this repo change)

## Documentation vs code

- Authoritative product direction: `SYNC_TRUST_LAYER.md`
- Authoritative sequencing: `SYNC_ENGINE_ROADMAP.md`
- Repository map: `SYNC_REPOSITORY.md`
- Root README previously drifted to create-next-app boilerplate; replaced with Sync-accurate guidance

## Known open risks

1. Production must apply `ChatRateLimitWindow` migration before relying on chat metering in deploy
2. Remaining npm audit findings need breaking upgrades (`ai` v7, Prisma config / `deepmerge-ts`) — not applied
3. sync-ios full `tsc` still struggles with `@/` path resolution against linked shared `lib`
