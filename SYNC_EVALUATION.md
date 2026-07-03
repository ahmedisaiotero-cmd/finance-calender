# Sync Evaluation

This document defines how we measure whether the Sync Engine is improving.

The goal is not feature velocity. The goal is **trustworthy decisions**.

Read alongside `SYNC_ENGINE_MANIFESTO.md` and `SYNC_REASONING_SPEC.md`.

---

## Core Metric

### Trustworthy Decision Rate (TDR)

A Sync decision is **trustworthy** if a thoughtful human would agree with:

- what Sync **remembered**
- what Sync **ignored**
- what Sync **asked**
- what Sync **surfaced**
- what Sync **stayed quiet** about
- what Sync **connected** to past context

```
TDR = trustworthy decisions / total decisions reviewed
```

Track TDR weekly. A rising TDR means the engine is earning trust. A flat or falling TDR means stop adding surfaces and fix reasoning.

---

## Evaluation Categories

### Memory Trust

**Questions:**

- Did Sync remember what mattered?
- Did Sync ignore what did not matter?
- Did Sync avoid duplicate memories?
- Did Sync allow correction?

**Failure signals:**

- Light habits stored as important memories
- Same event captured twice with different wording
- User cannot find or edit what Sync remembered
- Stale logs still influencing ranking

**Tests to strengthen:**

- Dedupe and update-over-create scenarios
- Light-memory exclusion in ranking
- Memory aging and visibility

---

### Understanding Trust

**Questions:**

- Did Sync classify the input correctly?
- Did it understand vague language?
- Did it avoid overconfidence?
- Did it handle sensitive info carefully?

**Failure signals:**

- “Something tomorrow” treated as specific commitment
- Money worry classified as calendar event
- High-confidence label on ambiguous input
- Health/relationship content stored without care flags

**Tests to strengthen:**

- Messy real-life input corpus (100+ memories)
- Vague vs specific disambiguation
- Sensitive domain handling

---

### Consequence Trust

**Questions:**

- Did Sync understand what changed?
- Did it connect timing correctly?
- Did it notice risk or obligation?
- Did it connect related memories?

**Failure signals:**

- Event replay instead of consequence (“Flight at 6am” with no timing meaning)
- Rent due Friday surfaced as today primary on Sunday evening
- Flight + school + work not reflected in load context
- Unrelated memories linked

**Tests to strengthen:**

- Horizon and `daysUntil` accuracy
- Life-load detection
- Cross-memory consequence linking

---

### Judgment Trust

**Questions:**

- Did Sync ask only when useful?
- Did it avoid unnecessary interruptions?
- Did it surface the right thing at the right time?
- Did it stay quiet when appropriate?

**Failure signals:**

- Generic load headline beats specific timed primary incorrectly (or vice versa without reason)
- More than 3 items surfaced on Today
- Light memory in primary or supporting
- Question asked when info would not change outcome

**Tests to strengthen:**

- `decision-stress.test.ts` (100-memory corpus)
- Profile priority vs urgency conflicts
- Quiet/stale week scenarios
- Overloaded tomorrow scenarios

---

### Briefing Trust

**Questions:**

- Did the brief focus on what matters?
- Did it avoid dumping everything?
- Did it prioritize consequences over events?

**Failure signals:**

- Twelve lines listing every memory
- Vague summaries without specific supporting lines
- Brief lede contradicts Today primary without reason
- Background noise in Tomorrow section

**Tests to strengthen:**

- `briefing-composer.test.ts` golden fixtures
- Brief ranking parity tests
- Curated line caps

---

### Safety / Privacy Trust

**Questions:**

- Did Sync avoid storing secrets unnecessarily?
- Did it treat health, money, relationships, and identity carefully?
- Did it expose debug reasoning only in dev contexts?
- Did it preserve user control?

**Failure signals:**

- Credentials or secrets persisted
- Sensitive content in normal user-facing explain text
- No delete/edit path for inferred understanding
- Over-sharing in lab that would not ship to users

**Tests to strengthen:**

- Voice compliance scans
- Explainability gated to dev/lab only
- Trust/edit/delete flows

---

## Weekly Review Checklist

Every week, review **50 decisions** across these buckets:

| Bucket | Count | Examples |
|---|---|---|
| Remembered items | 10 | Commitments, patterns, obligations |
| Ignored items | 10 | Coffee, vague notes, stale logs |
| Follow-up decisions | 10 | Ask, remind, check-in, none |
| Briefing items | 10 | Primary, supporting, lede, sections |
| Pattern / relationship / consequence decisions | 10 | Thread detection, linking, load |

### For each item, mark

- **correct** — thoughtful human agrees
- **wrong** — clear mistake
- **uncertain** — reasonable disagreement; needs rule clarification

### Then identify

1. **What rule failed?** (Constitution principle or reasoning spec stage)
2. **What engine stage failed?** (Input → Briefing Effect)
3. **What test should be added?** (file name + scenario description)

### Log format

```markdown
## Week of YYYY-MM-DD

| Item | Stage | Verdict | Rule failed | Test to add |
|------|-------|---------|-------------|-------------|
| "coffee this morning" remembered as important | Memory Decision | wrong | #5 Remember only what earns it | decision-stress: light exclusion |
```

Store weekly reviews in `eval/reviews/` when the folder exists, or in team notes until then.

---

## Automated Safety Net

Run before merging intelligence changes:

```bash
npm run test:intelligence        # decision-engine core
npm run test:intelligence:all    # full intelligence suite (20 files)
npm run check                    # lint + intelligence
```

Add a failed real-life example to the suite **before** fixing production logic when possible.

---

## When to Ship vs Wait

| Signal | Action |
|---|---|
| TDR rising on reviewed corpus | Continue refinement |
| TDR flat with new features proposed | Do not ship features; fix judgment |
| Same stage fails 3+ weeks in a row | Dedicated fix sprint for that stage |
| Uncertain verdicts dominate | Clarify rules in `SYNC_REASONING_SPEC.md` |

---

## Success Criteria

Sync is ready for private alpha when:

- TDR ≥ 85% on weekly reviewed corpus (50 items)
- No recurring wrong verdicts in Judgment or Memory Trust for 2 consecutive weeks
- 100-memory stress test passes consistently
- Users can inspect, correct, and delete Sync’s understanding
- Lab/debug explainability works; normal replies stay calm and short

See `SYNC_ENGINE_ROADMAP.md` for phase gates.
