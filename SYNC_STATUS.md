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
- `/api/chat` is optional OpenAI with local fallback; not the Sync Engine pipeline
- Onboarding/profile remote sync exists when Supabase + DB are configured

## Placeholder / deferred

- Full Goals product loop (roadmap after Decision/Life Graph trust)
- Forced integrations (calendar/bank/health APIs)
- Supabase `timeline_items` owner column + RLS (currently disabled on `/api/timeline`)
- `/api/chat` authentication and rate limiting

## Documentation vs code

- Authoritative sequencing: `SYNC_ENGINE_ROADMAP.md`
- Repository map: `SYNC_REPOSITORY.md`
- Root README previously drifted to create-next-app boilerplate; replaced with Sync-accurate guidance

## Known open risks

1. Unscoped Supabase timeline path remains available as a library helper but is not used by `/api/timeline`
2. Unauthenticated `/api/chat` (length-guarded; still no auth/rate limit)
3. Transitive npm audit findings (hono / js-yaml / ip-address / jsondiffpatch) — no forced upgrades applied
4. sync-ios full `tsc` still struggles with `@/` path resolution against linked shared `lib`
