# Sync Reasoning Spec

This document defines the required reasoning pipeline for every user input.

It is the engineering contract for the Sync Engine. All capture, memory, consequence, judgment, and briefing logic should align with these stages.

Read alongside `SYNC_ENGINE_MANIFESTO.md` and `SYNC_EVALUATION.md`.

---

## Pipeline Overview

```
Input
  ↓
Understanding
  ↓
Memory Decision
  ↓
Consequence Reasoning
  ↓
Judgment
  ↓
Response
  ↓
Future Follow-up
  ↓
Briefing Effect
```

**Code mapping:** Understanding → `meaning-engine`; Memory Decision → capture + `memory-dedup` + `memory-profile`; Consequence Reasoning → `consequence-engine` + `sync-consequences`; Judgment → `decision-engine`; Response → `sync-engine`; Briefing Effect → `briefing-composer` + Today adapters.

Judgment must not be duplicated in UI or page-specific modules.

---

## 1. Input

**Question:** What did the user say?

### Capture

- Raw text, voice transcript, or structured edit
- Timestamp and capture context (when, where in the app)
- Prior memories available for dedupe and update

### Classify input quality

| Signal | Examples |
|---|---|
| **Clear** | “Flight tomorrow at 6am”, “Rent due Friday” |
| **Vague** | “Something tomorrow”, “family stuff”, “might do something later” |
| **Emotional** | “Stressed again”, “rough day” |
| **Factual** | “Payday at 5am”, “Dentist Tuesday 3pm” |
| **Time-based** | Explicit date, relative time, recurring pattern |
| **Sensitive** | Health symptoms, money stress, relationship conflict, identity |
| **Incomplete** | Missing time, person, amount, or commitment level |

### Output

- Normalized text (typos corrected where confident)
- Input quality flags: `{ clear, vague, emotional, factual, timeBased, sensitive, incomplete }`
- Ambiguity markers when resolution would change memory or consequences

---

## 2. Understanding

**Question:** What happened?

### Classify domain

One primary area (secondary tags allowed):

- health
- money
- work
- family
- relationships
- routines
- schedule
- idea
- emotional
- other

### Extract meaning

- **Event** — something happening at a time
- **Log** — something that already happened
- **Commitment** — obligation or promise
- **Worry** — concern without fixed timing
- **Preference** — stable tendency or priority
- **Pattern signal** — repetition across memories
- **Noise** — disposable chatter with no future decision value

### Rules

- Prefer interpretation over repetition of user text
- Do not over-classify; one primary domain is enough
- Mark confidence: high / medium / low
- Sensitive domains require conservative confidence

### Output

- `MeaningAnalysis` (category, type, entities, time hints)
- Confidence level
- Whether understanding is stable enough to act on

---

## 3. Memory Decision

**Question:** Should Sync remember this, update something, ask, or ignore?

### Options

| Decision | When |
|---|---|
| **remember** | Creates durable memory with clear future decision value |
| **ignore** | Disposable chatter; no consequence or pattern value |
| **update existing memory** | Same fact, better detail, or correction of prior capture |
| **ask follow-up** | Missing info would change memory, consequences, or judgment |
| **temporary/internal only** | Useful for session context but not durable storage |

### Remember when

- Consequences for today, tomorrow, this week, or recurring obligations
- Stable preferences and priorities
- Important dates and commitments
- Patterns that affect future judgment (stress, spending, family load)
- User explicitly wants it kept

### Ignore when

- Light habits with no timing pressure (coffee, shower, one-off snacks)
- Duplicate of a stronger, more specific memory
- Stale logs with no remaining decision value
- Emotional venting with no new pattern (unless pattern threshold met)

### Rules

- **Do not remember every message.**
- Prefer **update** over **duplicate**.
- Ask only when the answer changes memory, consequences, or future decisions.
- User must be able to inspect, correct, and delete the result.

### Output

- Memory action: `remember | ignore | update | ask | temporary`
- Target memory ID if updating
- Dedupe rationale
- Retention weight hint (light → critical)

---

## 4. Consequence Reasoning

**Question:** What changes because of this?

### Ask

- What is different now that Sync knows this?
- Does this affect **today**, **tomorrow**, **this week**, or **long-term**?
- Does it connect to an existing memory, thread, or obligation?
- Does it create **risk**, **opportunity**, **obligation**, or **timing pressure**?
- Does life load increase (stacked commitments, early start, conflicting domains)?

### Horizon tags

| Horizon | Typical `daysUntil` |
|---|---|
| today | 0 |
| tomorrow | 1 |
| this_week | 2–7 |
| later | 8+ |
| background | no active timing |

### Rules

- Consequences are not event replay — they are **what follows**
- Connect related memories (payday + rent, flight + early morning load)
- Do not invent consequences the input does not support
- Light memories should not generate briefing-eligible consequences

### Output

- `SyncConsequence[]` with kind, horizon, priority, surface text candidate
- Links to source memory IDs
- Life-load contribution if applicable

---

## 5. Judgment

**Question:** What deserves attention — now, later, or never?

Maps to **Decision Engine** (`decision-engine.ts`).

### Decide

| Question | Options |
|---|---|
| Should Sync say something **now**? | yes / no |
| Should Sync surface this **later**? | today / tomorrow / this week / later |
| Should Sync **stay quiet**? | when no clear value |
| Should Sync **ask**? | only when answer changes downstream reasoning |
| Is confidence **high enough**? | surface / hold / ask |

### Ranking rules

- **1 primary + max 2 supporting** on Today surfaces
- Specific timed items outrank vague summaries when both exist
- Load headlines belong in forecast/context unless no specific item exists
- Profile priorities (Family, Money, etc.) **influence** ranking; they do not override urgent specifics irresponsibly
- Patterns surface only when repetition earns it

### Output

- Ranked candidates with score breakdowns
- Primary + supporting selection
- Quiet / empty flags
- Metadata for explainability (dev only)

---

## 6. Response

**Question:** How should Sync communicate the judgment?

Maps to **Sync Engine** (`sync-engine.ts`, `SYNC_VOICE.md`).

### Requirements

Response should be:

- **short**
- **useful**
- **familiar** (Sync voice — calm, observant, concise)
- **non-dramatic**
- **not fake-smart**
- **not over-explained**

### Rules

- Preserve Decision Engine ordering — never rerank in Response
- Do not invent facts
- Use uncertainty language when confidence is low
- Normal user replies do **not** include debug reasoning
- Explainability belongs in dev/lab mode only

### Output

- Surface text (headline, supporting lines, brief lede)
- Communication intent metadata
- Confidence language
- Surfacing reason (dev)

---

## 7. Future Follow-up

**Question:** What should Sync do after this input?

### Options

| Follow-up | When |
|---|---|
| **none** | Decision complete; no pending action |
| **remind** | Time-based nudge before consequence |
| **check_in** | Pattern or emotional thread warrants gentle revisit |
| **surface_in_brief** | Include in next briefing when horizon arrives |
| **ask_now** | Blocking ambiguity; answer needed before memory/consequence finalize |

### Rules

- Default to **none** unless follow-up creates clear value
- Do not schedule reminders for light memories
- Ask now only when the answer changes memory, consequences, or judgment

### Output

- Follow-up type
- Trigger timing (if any)
- Linked memory / consequence IDs

---

## 8. Briefing Effect

**Question:** Would this input change what Sync says when the user opens the app?

### Define

```typescript
{
  changed: boolean;       // true if briefing/Today output would differ
  why: string;            // human-readable reason (dev)
  priorityImpact: "none" | "low" | "medium" | "high";
}
```

### Priority impact guide

| Impact | Examples |
|---|---|
| **none** | Light log, stale note, ignored chatter |
| **low** | Background context, distant future item |
| **medium** | This-week obligation, pattern signal |
| **high** | Today/tomorrow timed item, money due, family commitment under load |

### Rules

- Briefing shows **consequences**, not raw memory dumps
- Load-aware lede is separate from specific primary selection
- If `changed: false`, Sync should not add noise to Today or Brief

---

## Stage Failure Modes

When trust breaks, identify the failed stage:

| Symptom | Likely stage |
|---|---|
| Remembered something useless | Memory Decision |
| Missed obvious commitment | Understanding or Consequence |
| Surfaced coffee as primary | Judgment |
| Generic summary replaced specific flight | Judgment |
| Robotic or overconfident copy | Response |
| Unnecessary question | Memory Decision or Judgment |
| Brief dumped everything | Briefing Effect |
| Sensitive info stored carelessly | Memory Decision / Safety |

Use `SYNC_EVALUATION.md` to turn failures into weekly reviews and tests.
