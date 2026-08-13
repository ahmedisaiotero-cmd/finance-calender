# Change checklist

Use before merging intelligence or surface changes.

## Gate

- [ ] Does this improve Sync’s ability to make trustworthy decisions?
- [ ] Which stage? Memory / Understanding / Consequences / Judgment / Response / Briefing / Safety / Trust

## Boundaries

- [ ] No new ranking outside `decision-engine.ts`
- [ ] No duplicate intelligence in page/mobile-only helpers when shared logic exists
- [ ] No React Native deps added to the root Next.js app
- [ ] `sync-ios` remains excluded from root `tsc` / root lint
- [ ] No Goals product expansion unless roadmap phase is ready
- [ ] Avoid dashboards, analytics, streaks, or UI redesign unless explicitly requested

## Validation

- [ ] `npm run typecheck`
- [ ] Relevant focused tests for the touched area
- [ ] `npm run test:all` or at least `npm run test:intelligence:all` + related Life Graph/capture tests
- [ ] `npm run build` for web-affecting changes
- [ ] `npm run validate:ios` if engine wrappers or shared link behavior changed

## Regression priorities

Always consider tests around:

- vague / low-confidence capture → clarification
- duplicate memory handling
- Today vs Daily Brief ranking parity
- secret/sensitive input refusal
- Life Graph continuity / contradiction cases
- clear-memory / soft-delete behavior

## Do not

- Weaken TypeScript strictness or set `ignoreBuildErrors`
- Skip failing tests or broaden ignores to hide defects
- Commit secrets or expand `.env.example` with real values
- Force `npm audit fix --force`
