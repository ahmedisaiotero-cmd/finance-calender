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

- Prisma finance/calendar/transactions APIs still use a shared demo workspace (`getDefaultWorkspace`)
- Legacy money/calendar/health dashboard pages remain in `app/` and `src/data/*` mock data
- `/api/chat` is optional OpenAI with local fallback; not the Sync Engine pipeline
- Onboarding/profile remote sync exists when Supabase + DB are configured

## Placeholder / deferred

- Full Goals product loop (roadmap after Decision/Life Graph trust)
- Forced integrations (calendar/bank/health APIs)
- Multi-user workspace authorization for demo Prisma routes

## Documentation vs code

- Authoritative sequencing: `SYNC_ENGINE_ROADMAP.md`
- Repository map: `SYNC_REPOSITORY.md`
- Root README previously drifted to create-next-app boilerplate; replaced with Sync-accurate guidance

## Known open risks

1. Unauthenticated demo Prisma write/read routes (`/api/transactions`, `/api/calendar`, `/api/user`)
2. Unauthenticated `/api/chat` (now length-guarded; still no auth/rate limit)
3. Transitive npm audit findings (hono / js-yaml / ip-address / jsondiffpatch) — no forced upgrades applied
4. sync-ios full `tsc` still struggles with `@/` path resolution against linked shared `lib`
