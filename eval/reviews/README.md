# Weekly TDR Review

Trustworthy Decision Rate (TDR) reviews for the Sync Brain.

Read first: `SYNC_EVALUATION.md`, `SYNC_ENGINE_MANIFESTO.md`, `AGENTS.md`.

---

## Purpose

Each week, evaluate **50 Sync decisions** from real or lab inputs. Mark whether a thoughtful human agrees with what Sync did. Track trust over time. Turn failures into tests **before** production fixes.

**Do not change engine behavior during the review.** Review first. Test second. Fix third.

---

## Quick start

1. Copy `TEMPLATE.md` to `YYYY-MM-DD.md` (week ending date or review date).
2. Collect decisions from `/sync-lab` (Decision panel + Advanced → `runtime brain`) or `processSyncMessage` exports.
3. Fill all 50 rows across five buckets (10 each).
4. Mark each row: **correct** / **wrong** / **uncertain**.
5. Calculate TDR (see below).
6. Pick the **first wrong** row → add regression test → then consider a production fix.

---

## Where decisions come from

| Source | What to capture |
|---|---|
| **`/sync-lab`** | Send messy input → open **Decision** → Advanced: `memoryDecision`, `runtime.after.judgment`, `briefingEffect`, `pattern insight` |
| **Export JSON** | Lab tools → Export JSON → `conversation[].result` |
| **Tests as fixtures** | Re-run known inputs through `npx tsx tests/sync-engine-brain.test.ts` patterns |

Suggested lab settings for review sessions:

- Turn on **Use current Sync memory context** when testing dedupe/update.
- Use **Reset Test Memory** between unrelated scenarios.
- Keep engine in **dry run** (default).

---

## The 50-decision buckets

| Bucket | Count | What to evaluate |
|---|---|---|
| **Memory decisions** | 10 | Remember / update / ignore / ask |
| **Ignored / quiet** | 10 | Should stay quiet; light logs not promoted |
| **Follow-up** | 10 | none / remind / check_in / surface_in_brief / ask_now |
| **Briefing / judgment** | 10 | Today primary, supporting cap, brief lede change |
| **Pattern / consequence** | 10 | Threads, load, timing, consequence quality |

---

## Row fields

Each row in the weekly file includes:

| Field | Meaning |
|---|---|
| **User input** | Raw capture text |
| **Expected decision** | What a thoughtful human would want |
| **Actual Sync decision** | What the engine did (from lab or `runtime`) |
| **Verdict** | `correct` / `wrong` / `uncertain` |
| **Failed stage** | Input, Understanding, Memory Decision, Consequence Reasoning, Judgment, Response, Future Follow-up, Briefing Effect |
| **Notes** | Why it matters; evidence |
| **Should become test** | `yes` / `no` — **first `wrong` each week must be `yes`** |

---

## Trustworthy Decision Rate (TDR)

```
TDR = correct / (correct + wrong + uncertain)
```

Report as a percentage. Example: 42 correct, 5 wrong, 3 uncertain → TDR = 42/50 = **84%**.

| TDR | Action |
|---|---|
| **≥ 85%** | Continue refinement; add tests for wrong/uncertain rows |
| **Flat or falling** | Stop new surfaces; fix failed stages |
| **Many uncertain** | Clarify rules in `SYNC_REASONING_SPEC.md` before coding |

**Uncertain counts against trust** until the rule is clarified and the row is re-reviewed.

Weekly file summary section must include:

- Correct / wrong / uncertain counts
- TDR %
- Failed stages (count by stage)
- First wrong → test file name added

---

## Rule: test before fix

> **The first `wrong` item each week becomes a regression test before any production fix.**

Workflow:

1. Log the failure in the weekly review.
2. Add a failing (or guarding) case to the appropriate test file:
   - Memory / follow-up / capture → `tests/sync-engine-message.test.ts`
   - Judgment / brief / runtime → `tests/sync-engine-brain.test.ts`
   - Corpus stress → `tests/decision-stress.test.ts`
3. Run tests (see commands below).
4. Fix production only if the test proves the engine is wrong — not if the expectation was unrealistic.

---

## Commands (run after adding tests)

```bash
# Full intelligence safety net (22 files)
npm run test:intelligence:all

# Sync Brain runtime orchestration
npx tsx tests/sync-engine-brain.test.ts

# Per-message capture pipeline
npx tsx tests/sync-engine-message.test.ts

# Full check (lint + intelligence)
npm run check
```

---

## Example messy inputs (starter set)

Use these in lab when you need realistic review material:

```
coffee this morning
i have a flight tomorrow at 6am
payday is tomorrow at 5am
rent due friday
something important tomorrow
i was sad today
stressed again
i skipped my workout again
take daughter to school tomorrow at 7:30am
i don't want to forget to cancel Uber
```

---

## File naming

| File | Purpose |
|---|---|
| `README.md` | This workflow |
| `TEMPLATE.md` | Copy each week |
| `YYYY-MM-DD.md` | Completed weekly reviews (keep history) |

---

## Next steps after each review

1. File the completed `YYYY-MM-DD.md`.
2. Open a task: **Improve the Sync Engine's ability to make trustworthy decisions by…** (cite failed stage + input).
3. Add regression test for first wrong item.
4. Re-run `npm run test:intelligence:all`.
5. Do not expand product UI until TDR trends up for two consecutive weeks (`SYNC_ENGINE_ROADMAP.md` Phase 3).
