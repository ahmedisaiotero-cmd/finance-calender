# Sync v1 Plan

**Status:** docs-only planning source for the v1 pivot.

**Supersedes for v1 planning:** `SYNC_PRODUCT.md`, `SYNC_ENGINE_ROADMAP.md`, and
`ROADMAP.md` remain useful for principles, reasoning rules, and module status, but
this file is the current v1 implementation plan.

---

## Product definition

Sync v1 is Ahmed's personal AI activity and context layer.

It connects the AIs Ahmed already uses -- ChatGPT, Grok, Claude, Cursor, and
Gemini -- and shows in one place:

- what each AI did for him;
- what conversation or action caused another action;
- what changed across those AIs over time;
- what matters today because of those cross-AI effects.

The first version is single-user and owner-only. It must not block a later
multi-user version, but it should optimize for Ahmed installing a Chrome
extension, using his AIs normally, and seeing a unified timeline, a cause/effect
view, and Today on the live Vercel site.

Sync is still not a chatbot, planner, productivity dashboard, or replacement for
those AIs. It is the place that remembers and proves what happened across them.

---

## v1 thesis

The current repository already has useful Sync intelligence, but it is aimed at
manual life capture and Today briefing. v1 keeps the shared reasoning and proof
foundations, adapts them to AI activity, and parks surfaces or schema that only
serve the older briefing/demo app.

The v1 product layers become:

1. **Capture** -- browser extension or paste/import records AI conversations and
   visible actions.
2. **Proof** -- every captured item has source, evidence, timestamp, provider,
   privacy status, and provenance.
3. **Context** -- Sync extracts durable user-relevant facts, decisions, plans,
   and artifacts from AI conversations.
4. **Reasoning** -- Sync links causes and effects across AIs and decides what
   matters now.
5. **Outputs** -- unified timeline, cause/effect view, and Today.

---

## Core user loop

1. Ahmed installs the Sync Chrome extension and signs into Sync.
2. He uses ChatGPT, Grok, Claude, Cursor, and Gemini normally.
3. The extension detects supported AI chat pages and lets him capture a
   conversation, selected message, or visible AI action.
4. Sync stores a redacted, owner-only record with source, provider, page URL
   origin, captured text, timestamps, and evidence metadata.
5. Sync classifies what happened:
   - advice received;
   - plan made;
   - artifact built;
   - code change discussed;
   - personal context shared;
   - follow-up or unresolved item created.
6. Sync links related activity across AIs:
   - planned with Grok;
   - built with Cursor;
   - got advice from Claude;
   - chatted personally in ChatGPT.
7. Ahmed opens the site and sees:
   - a unified timeline of AI activity;
   - cause/effect chains across providers;
   - Today: the few items that matter now.
8. Ahmed can inspect, correct, delete, or disconnect the captured data.

---

## v1 scope

### In scope

- Single owner account for Ahmed first.
- Website on Vercel using the existing Next.js app.
- Chrome Manifest V3 extension for:
  - `chatgpt.com`;
  - `claude.ai`;
  - `grok.com`;
  - Grok on `x.com`;
  - `gemini.google.com`.
- Paste/import fallback for unsupported pages and mobile gaps.
- Cursor activity enters v1 through paste/import first unless Ahmed chooses a
  specific Cursor/GitHub capture path.
- Owner-only authentication between extension and app.
- AI conversation/activity ingestion API.
- Redaction before persistence where possible, plus server-side redaction.
- Unified AI activity timeline.
- Cause/effect linking across providers and conversations.
- Today output powered by shared reasoning.
- Minimal inspect/correct/delete controls for captured AI records and links.
- Small, revertable PRs.

### Non-goals

- No iPhone app for v1. `sync-ios` stays parked until the web + extension loop
  works.
- No multi-user product UX, teams, workspaces, or onboarding polish.
- No dashboards, analytics, charts, productivity scores, or AI usage scoring.
- No chatbot-first Sync surface.
- No official OAuth/API integrations to AI providers unless a later milestone
  explicitly approves them.
- No cookie copying, password storage, or hidden browser automation.
- No automatic capture of all personal chats without an explicit owner-controlled
  capture setting.
- No broad web scraping beyond the user's active, supported AI chat pages.
- No deletion of legacy code in v1 planning PRs.

---

## Data model

This is the target model for the first implementation pass. It should start in
Prisma/Postgres and remain compatible with future Supabase/RLS hardening.

### `AiProvider`

Provider identity and capture support.

- `id`
- `slug`: `chatgpt | claude | grok | cursor | gemini | paste_import`
- `displayName`
- `supportedOrigins`
- `createdAt`

### `AiCaptureSource`

A browser extension install, paste/import flow, or future official connector.

- `id`
- `ownerId`
- `kind`: `chrome_extension | paste_import | future_connector`
- `providerId`
- `external`: boolean
- `connectionId`: opaque non-secret reference
- `permissionState`: `granted | revoked | expired | pending`
- `lastSeenAt`
- `createdAt`
- `revokedAt`

### `AiConversation`

One captured conversation or imported thread.

- `id`
- `ownerId`
- `providerId`
- `sourceId`
- `providerConversationRef`: opaque hash/reference, not a secret URL
- `title`
- `origin`
- `startedAt`
- `lastMessageAt`
- `capturedAt`
- `captureMethod`: `extension | paste_import`
- `visibility`: `visible | summary_only | sensitive | hidden`
- `rawTextRef`: optional encrypted/blob reference if raw text is retained
- `summary`
- `createdAt`
- `updatedAt`

### `AiMessage`

Message-level evidence. Store only what v1 needs; avoid storing secrets by
default.

- `id`
- `conversationId`
- `providerMessageRef`: opaque hash/reference
- `role`: `user | assistant | tool | system | unknown`
- `text`
- `redactedText`
- `sentAt`
- `capturedAt`
- `confidence`
- `visibility`
- `metadata`: JSON for non-secret page/provider facts

### `AiActivityEvent`

Provider-neutral proof record, aligned with `lib/activity/types.ts`.

- `id`
- `ownerId`
- `conversationId`
- `messageId`
- `kind`: `context_access | import | request | approval | execution | result | failure`
- `actorKind`: `user | assistant | sync | connector | external_service | system`
- `providerId`
- `sourceId`
- `timestamp`
- `summary`
- `affectedAreas`
- `evidence`
- `verification`: `unverified | self_reported | system_logged | source_confirmed`
- `confidence`
- `reversibility`
- `permissionScope`
- `permissionState`
- `visibility`
- `correlationId`
- `detail`: scalar JSON only

### `AiArtifact`

Things produced or changed by an AI.

- `id`
- `ownerId`
- `providerId`
- `conversationId`
- `activityEventId`
- `kind`: `code | document | plan | advice | image | link | other`
- `title`
- `summary`
- `artifactRef`: URL/hash/path reference without credentials
- `createdAt`
- `visibility`

### `AiLink`

Cause/effect links across providers and conversations.

- `id`
- `ownerId`
- `fromEventId`
- `toEventId`
- `relationship`: `caused | informed | followed_up | implemented | contradicted | refined | referenced`
- `confidence`
- `basis`: `explicit_reference | same_artifact | temporal_sequence | user_confirmed | inferred`
- `evidence`
- `createdAt`
- `confirmedAt`
- `rejectedAt`

### `AiInsight`

Reasoned outputs for Today and cause/effect views.

- `id`
- `ownerId`
- `kind`: `today_priority | unresolved_follow_up | cross_ai_chain | pattern`
- `summary`
- `sourceEventIds`
- `sourceLinkIds`
- `horizon`: `today | tomorrow | this_week | later | background`
- `priority`
- `confidence`
- `createdAt`
- `expiresAt`

### Model rules

- Every row is owner-scoped even while there is one owner.
- Use append-only events for proof; corrections create new events or update
  derived links, not silent history rewrites.
- Store provider refs as opaque hashes or ids, never access tokens.
- Prefer summaries and redacted message text. Raw text retention must be explicit.
- Links can be inferred, but UI must label inferred vs confirmed.
- Activity and Passport contracts remain the shared vocabulary for proof and
  claim basis.

---

## Extension architecture

### Components

- **Manifest V3 extension**
  - content scripts for supported AI domains;
  - service worker for auth/session, queueing, and retries;
  - popup for capture status, pause/resume, and paste/import fallback;
  - options page for owner-only settings and revocation.
- **Content scripts**
  - detect provider and conversation container;
  - extract visible conversation text and message boundaries;
  - never read unrelated pages;
  - never access cookies or provider credentials;
  - send structured capture payloads to the service worker.
- **Service worker**
  - holds short-lived Sync auth session;
  - redacts obvious secrets before upload;
  - queues failed uploads locally;
  - retries with idempotency keys;
  - clears local queue on sign-out/revoke.
- **Next.js app API**
  - receives extension capture payloads;
  - verifies owner session or extension device token;
  - performs server-side redaction and validation;
  - writes conversation/message/activity rows;
  - runs classification/linking jobs synchronously at first, then async later if
    needed.

### Privacy rules

- Owner-only data. Treat all AI chats as sensitive by default.
- Capture must be visible and controllable from the extension.
- Default to manual capture or clearly enabled per-site capture; no surprise
  background collection.
- Redact secrets client-side and server-side.
- Store the minimum useful content for v1. Prefer summary + selected evidence
  over full raw transcript retention.
- Raw transcript retention, if enabled, must be explicit and reversible.
- Delete removes stored content from active views and tombstones proof metadata
  only where needed for audit integrity.
- Extension revocation stops new capture immediately and invalidates the device
  token.

### Extension-to-app auth

v1 should support Ahmed-only auth without painting the architecture into a
corner:

1. Ahmed signs into the Vercel site.
2. The site creates an extension device record and a short-lived pairing code.
3. The extension opens the pairing URL or accepts the code.
4. The app exchanges the code for an extension device token scoped to:
   - owner id;
   - allowed origins/providers;
   - capture write only;
   - expiration/rotation window.
5. Extension uploads include:
   - device id;
   - bearer token or signed request;
   - idempotency key;
   - provider slug;
   - origin;
   - capture timestamp.
6. Server rejects uploads when the device is revoked, expired, origin-mismatched,
   or payload validation fails.

Later multi-user support can replace the owner-only pairing policy with normal
account/device management while keeping the same source/device boundary.

---

## Audit against v1 vision

### Keep

- `lib/activity/*` -- provider-neutral event contract, redaction, lifecycle
  grouping, and daily snapshot logic already match AI activity proof.
- `lib/passport/*` -- claim basis, verification, conflicts, and non-upgrading
  reconciliation are directly useful for facts learned from AI conversations.
- `lib/intelligence/meaning-engine.ts`, `memory-understanding.ts`,
  `importance-scoring.ts`, `memory-profile.ts`, `memory-thread.ts`,
  `pattern-intelligence.ts` -- reuse for extracting durable context from AI
  chats.
- `lib/intelligence/sync-consequences.ts`, `consequence-engine.ts`,
  `consequence-link.ts`, `consequence-timing.ts`, `life-load.ts` -- reuse for
  "what changed because of this AI interaction?"
- `lib/intelligence/decision-engine.ts` and `sync-engine.ts` -- keep as the
  shared Today/Judgment and response layer.
- `lib/sync-engine/*` -- keep the orchestration, lab fixtures, sensitive input,
  privacy command, contradiction, and correction-target seams.
- `app/sync-lab/*` -- keep as the evaluation surface for reasoning and future
  AI-activity fixtures.
- Existing intelligence tests and Activity/Passport tests -- keep as the safety
  net while adding AI-activity cases.
- Supabase Auth middleware and auth helpers -- keep the session boundary for
  owner-only access.

### Adapt

- `CapturedSyncItem` / `lib/captured-items.tsx` -- adapt or replace with
  persisted `AiConversation`, `AiMessage`, and `AiActivityEvent`; localStorage is
  not enough for owner-only cross-device AI history.
- `lib/sync-capture/*` -- adapt from typed life capture to paste/import and
  extension-ingested AI conversation capture.
- Today and brief adapters (`build-home-priorities.ts`, `build-today-view.ts`,
  `build-daily-brief.ts`) -- adapt inputs from life memories to AI activity
  consequences while preserving Decision Engine ownership of ranking.
- `app/api/chat` -- do not make it the product chat surface; adapt useful auth,
  rate-limit, safety, and persistence patterns for extension ingestion APIs.
- Prisma schema -- adapt from finance/calendar/demo models toward owner-scoped
  AI activity tables.
- Supabase usage -- keep Auth, but define RLS/owner scoping before any direct
  Supabase table reads. The existing disabled unscoped timeline read is the
  right caution.
- `SYNC_*.md` and `ROADMAP.md` -- retain principles and history, but point v1
  planning here.

### Park

- `sync-ios/*` -- iPhone later, after the live site + extension loop is working.
- Legacy finance/calendar/health dashboard components and routes -- not v1
  expansion targets.
- Workspace/team concepts -- keep schema compatibility where already present,
  but do not build team UX in v1.
- Official provider integrations/OAuth/MCP/A2A -- defer until the extension and
  proof model work for the owner.
- Full raw transcript retention -- defer until the privacy policy and owner
  controls are explicit.

### Remove later, not in v1 planning

- Unused dashboard widgets and duplicate legacy briefing/demo scaffolding can be
  removed only after the AI activity loop has replacement coverage and tests.
- Legacy finance/calendar tables can be retired only after migrations and live
  data needs are understood.

---

## Milestone plan

Each milestone should be one small PR unless its acceptance criteria require a
split. Tests should use messy, realistic examples.

### 1. Lock v1 contracts

Define TypeScript contracts and tests for `AiConversation`, `AiMessage`,
`AiActivityEvent`, `AiArtifact`, `AiLink`, and extension capture payloads.

**Acceptance criteria**

- Contracts live in shared lib files with no UI dependency.
- Activity events map cleanly to `lib/activity/types.ts`.
- Link basis distinguishes explicit, confirmed, and inferred links.

**Tests**

- Unit tests for payload validation, redaction, idempotency keys, and
  event/link shape.

### 2. Owner-only persistence

Add Prisma models and server helpers for owner-scoped AI conversations,
messages, activity events, artifacts, and links.

**Acceptance criteria**

- Every query is owner-scoped.
- No provider token or raw credential can be stored in structured detail.
- Existing app routes still build.

**Tests**

- Model/helper tests for create/read/delete, owner isolation, and redaction.

### 3. Extension ingestion API

Create a Next.js API endpoint for extension/paste imports.

**Acceptance criteria**

- Authenticated owner or paired extension device can write captures.
- Payloads are validated and redacted server-side.
- Duplicate uploads are idempotent.
- Invalid origin/provider/device combinations are rejected.

**Tests**

- Route tests for auth failure, happy path, duplicate upload, revoked device,
  and secret redaction.

### 4. Paste/import fallback

Add a minimal web import path that uses the same ingestion API as the extension.

**Acceptance criteria**

- Ahmed can paste an AI conversation and choose provider/source.
- The import creates conversation, message, and activity records.
- It does not fork capture intelligence.

**Tests**

- Integration/unit test with a pasted Grok plan that becomes activity events.

### 5. Chrome extension skeleton

Add a Manifest V3 extension package with provider detection, popup, service
worker queue, and no automatic data upload yet.

**Acceptance criteria**

- Extension loads unpacked in Chrome.
- Supported domains are declared narrowly.
- Popup shows detected provider and capture status.
- Queue is local and clearable.

**Tests**

- Static manifest validation and unit tests for provider/origin detection.

### 6. Extension pairing and upload

Implement owner-only device pairing and capture upload from extension to app.

**Acceptance criteria**

- Site can issue a short-lived pairing code.
- Extension receives a scoped device token.
- Uploads include idempotency key, provider, origin, and timestamp.
- Revocation blocks further uploads.

**Tests**

- Pairing success/expiry/revocation tests and upload auth tests.

### 7. Provider content adapters

Implement content-script adapters for ChatGPT, Claude, Grok, Grok on X, and
Gemini.

**Acceptance criteria**

- Each adapter extracts visible conversation title/messages without cookies or
  hidden browser automation.
- Each adapter fails closed when DOM structure is unknown.
- User can manually trigger capture.

**Tests**

- Fixture DOM tests for each provider, including changed/unknown DOM fallback.

### 8. AI activity classification

Classify captured conversations into advice, plan, artifact, code/build,
personal context, follow-up, unresolved, and noise.

**Acceptance criteria**

- Classification reuses existing meaning/consequence modules where possible.
- Low-confidence classifications stay unverified.
- Sensitive content is marked sensitive or summary-only.

**Tests**

- Messy fixtures:
  - planned with Grok;
  - built with Cursor;
  - got advice from Claude;
  - personal ChatGPT conversation;
  - Gemini research summary.

### 9. Cross-AI linking

Create `AiLink` inference and confirmation flow.

**Acceptance criteria**

- Links can connect events across providers.
- Inferred links are labeled as inferred.
- User-confirmed links upgrade basis without inventing source confirmation.
- Rejected links stop affecting Today.

**Tests**

- Grok plan -> Cursor build -> Claude advice chain.
- False-positive near-time conversations stay unlinked or low confidence.

### 10. Unified timeline

Build a minimal timeline output from persisted AI activity.

**Acceptance criteria**

- Timeline shows provider, action summary, timestamp, and proof status.
- Sensitive rows are summary-only by default.
- Delete/correction controls are available.

**Tests**

- View-model tests for mixed providers, sensitive rows, deletion, and ordering.

### 11. Cause/effect view

Build a minimal cause/effect output from `AiLink`.

**Acceptance criteria**

- Shows chain direction and link basis.
- Separates confirmed from inferred links.
- Lets Ahmed reject a bad inferred link.

**Tests**

- View-model tests for complete chain, missing middle event, contradiction, and
  rejected link.

### 12. Today from AI activity

Feed AI activity consequences into the existing Decision Engine for Today.

**Acceptance criteria**

- Today surfaces at most one primary and two supporting items.
- Ranking is owned by `decision-engine.ts`.
- Today explains what matters because of AI activity, not raw transcript dumps.

**Tests**

- 100+ AI activity fixture with only three relevant Today items.
- Quiet day produces a calm empty/quiet state.

### 13. Live owner flow

Deploy the owner-only web flow and test the unpacked extension end to end.

**Acceptance criteria**

- Ahmed installs the extension.
- Ahmed uses supported AIs normally.
- Captured activity appears on the live site.
- Unified timeline, cause/effect view, and Today are populated from real
  captured records.
- Ahmed can inspect, correct, delete, and revoke extension access.

**Tests**

- Manual end-to-end checklist on Vercel.
- Route/helper tests remain passing.
- Intelligence suite remains passing.

---

## Open questions

1. Should v1 default to manual capture per conversation, or allow opt-in
   automatic capture per supported AI site?
2. Should Sync store full raw transcripts, redacted transcripts, or summaries +
   selected evidence by default?
3. For Cursor, is v1 capture limited to Cursor web/chat pages, or should it also
   ingest GitHub PR/commit metadata created from Cursor work?
4. What is the minimum acceptable auth for Ahmed-only extension pairing:
   Supabase session plus device token, or a simpler owner secret during private
   v1?
5. Which view should be the first live proof of value after ingestion: unified
   timeline, cause/effect chains, or Today?
