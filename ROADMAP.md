# SYNC Roadmap

This roadmap translates [SYNC_VISION.md](./SYNC_VISION.md) into sequenced work. Every item should pass the **Sync Test** before shipping: reduce mental load, be understandable in under 10 seconds, help users decide what matters, and make them feel capable—not anxious.

Build slowly. Ship incrementally. Choose calm over clever.

---

## Phase 1 — Believable MVP

**Goal:** Create a believable, usable Sync MVP.

### Definition of Done

| Criterion | What it means |
|-----------|---------------|
| **30-second understanding** | A new user opens Home and knows what Sync is, what matters today, and where to go next—without a tutorial. |
| **Cohesive pages** | Home, Calendar, Money, and Health share the same layout rhythm, copy tone, components, and visual language. |
| **Timeline connects everything** | One unified timeline drives Home focus, Calendar views, Money upcoming, and Health rhythm—not parallel mock silos. |
| **Data persists** | Transactions and timeline events survive refresh; database mode stores to Postgres; local mode uses localStorage. |

### Done

- [x] Four primary surfaces: Home, Calendar, Money, Health
- [x] Compassionate copy foundation (`SYNC_VISION.md`, `lib/sync-pulse.ts`)
- [x] Shared UI primitives (`components/sync/*`)
- [x] Pulse on Home
- [x] Prisma schema + seed for money data
- [x] Transaction API with localStorage fallback
- [x] Legacy `/budgets` and `/transactions` redirect to `/money`

### Done (MVP infrastructure)

- [x] Unified timeline hook (`useSyncTimeline`) consumed by Home, Calendar, Health, Money
- [x] Timeline API (`/api/timeline`) for health/career events when database is configured
- [x] Home Today's Focus from merged timeline (money + health + career)
- [x] Health rhythm derived from timeline sessions, not isolated mock stats
- [x] Money upcoming from live timeline when available
- [x] User name from `/api/user` (demo workspace), with mock fallback
- [x] Consistent page framing: SYNC eyebrow on Home, vision-aligned subtitles on all pages
- [x] Life events seeded to Postgres (`seedLifeTimeline`)

### Phase 1 exit checklist

Before closing Phase 1, verify:

1. Open Home → Pulse + Today's Focus reflect the same events visible on Calendar today.
2. Add a transaction → it appears on Money, Calendar, and Home after refresh.
3. Navigate Home → Calendar → Money → Health without layout or tone whiplash.
4. A teammate can explain Sync in one sentence after 30 seconds on Home.

---

## Phase 2 — Identity & real accounts

*Goal: Sync knows who you are; data is scoped to your workspace.*

- [ ] Supabase Auth: sign-in, session, protected routes
- [ ] User profile from session (replace demo user)
- [ ] Workspace scoping with row-level security
- [ ] Recurring rules engine generates upcoming items automatically
- [ ] Budget limits from database, not static mock

---

## Phase 3 — Category expansion

*Goal: The full life timeline—without dashboard bloat.*

Categories in vision: **Health · Money · Career · Relationships · Personal**

| Category | Nav | Calendar lens | Dedicated surface |
|----------|-----|---------------|-------------------|
| Money | ✅ | ✅ | `/money` |
| Health | ✅ | ✅ | `/fitness` |
| Career | Soon | — | — |
| Relationships | Soon | — | — |
| Personal | Soon | — | — |

- [ ] Enable Career in sidebar with a focused surface
- [ ] Calendar lenses for Career, Relationships, Personal
- [ ] Home category snapshot rows only when a category has signal

---

## Phase 4 — Settings & personalization

*Goal: Users can tune Sync without breaking simplicity.*

- [ ] Settings page (timezone, name, default calendar lens)
- [ ] Home focus preferences (which categories surface first)
- [ ] Budget category visibility

---

## Phase 5 — Thoughtful integrations

*Goal: Pull life data in automatically—only where it clearly reduces manual work.*

- [ ] Bank / card import for transactions
- [ ] External calendar sync (Google, Apple)
- [ ] Health platform read (Apple Health, etc.)
- [ ] Bill reminders as recurring money events

Each integration ships with clear source labeling, calm error states, and no shame language on sync failures.

---

## Engineering hygiene

- [ ] Retire unused dashboard widgets and duplicate content components
- [ ] Expand `lib/sync-copy.ts` as the single source for user-facing strings
- [ ] Compassionate empty/loading states everywhere data can be absent
- [ ] Performance: timeline queries indexed by `workspaceId` + date

---

## How to use this document

1. Read `SYNC_VISION.md` before starting any item.
2. **Phase 1 must pass all four Definition of Done criteria** before starting Phase 2.
3. For each feature, run the **Sync Test** from the vision doc.
4. Update checkboxes here when work ships.

---

## North star

Sync exists to reduce mental load. It synchronizes the parts of life that matter most and presents them with clarity, simplicity, and compassion so people spend less time managing life and more time living it.

When uncertain, choose the option that makes life feel **calmer**.
