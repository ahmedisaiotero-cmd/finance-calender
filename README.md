# Sync

Sync is becoming a **personal AI context and trust layer** — not a chatbot, dashboard, planner, or briefing app.

It builds an accurate, user-controlled understanding of a life, helps AI make better decisions, and keeps a verifiable record of what AI systems saw, decided, and did.

- Identity: [`SYNC_PRODUCT.md`](./SYNC_PRODUCT.md)
- Trust / integrations: [`SYNC_STANDARDS.md`](./SYNC_STANDARDS.md)
- Experience: [`SYNC_VISION.md`](./SYNC_VISION.md)

Older roadmap language is subordinate. Articles are supporting evidence only.

```text
Context (Life Graph + memory)
Reasoning (meaning → consequences → judgment → response)
Proof (Activity / Passport)
        └── outputs: briefing, advice, actions, other AIs
```

The app (`/` mobile prototype, `/sync-lab`) is a proving-ground **output**. Shared intelligence lives in `lib/`. `sync-ios/` is a separate Expo client that re-exports shared modules.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/mobile](http://localhost:3000/mobile) for the product shell and [http://localhost:3000/sync-lab](http://localhost:3000/sync-lab) for the teaching surface.

## Canonical validation

| Command | Scope |
|---|---|
| `npm run validate` | Root web + sync-ios boundary checks |
| `npm run validate:web` | `typecheck` + `lint` + `test:all` + `build` |
| `npm run validate:ios` | Thin engine-wrapper verification in `sync-ios` |
| `npm run check` | Legacy lint + core intelligence suite (subset) |
| `npm run typecheck` | Root TypeScript only (`sync-ios` excluded) |

Root TypeScript and ESLint intentionally exclude `sync-ios`. Do not add React Native packages to the root app to satisfy the web build.

## Architecture boundaries

- **Decision Engine** owns prioritization/ranking (`lib/intelligence/decision-engine.ts`).
- **Life Graph** is context infrastructure (deterministic projection), not the product destination.
- Vague / low-confidence input should clarify instead of becoming unreliable memory.
- Surfaces consume shared intelligence; they do not invent ranking or Sync voice.
- Briefing/Today is an output. Do not treat it as the thing being built (`SYNC_PRODUCT.md`).

Read before changing intelligence:

- `SYNC_PRODUCT.md`
- `SYNC_STANDARDS.md`
- `SYNC_VISION.md`
- `AGENTS.md`
- `SYNC_WORKFLOW.md`
- `SYNC_ENGINE_MANIFESTO.md`
- `SYNC_REASONING_SPEC.md`
- `SYNC_ENGINE_ROADMAP.md`
- `SYNC_STATUS.md`
- `CHANGE_CHECKLIST.md`

## iOS client

```bash
cd sync-ios
npm install          # links ../lib as shared/
npm run validate     # verifies engine wrappers stay thin re-exports
npm run ios
```

## Environment

See `.env.example` for placeholders only. Never commit real secrets. Never put service-role keys in `NEXT_PUBLIC_*` variables.
