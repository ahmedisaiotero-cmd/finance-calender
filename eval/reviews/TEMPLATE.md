# TDR Review — YYYY-MM-DD

**Reviewer:**  
**Week ending:**  
**Lab context:** stored memory on/off · lab memories count · work schedule on/off  
**Corpus notes:** (e.g. quiet week, overloaded tomorrow, 100-memory stress export)

---

## Summary (fill after review)

| Metric | Count |
|---|---|
| Correct | |
| Wrong | |
| Uncertain | |
| **TDR** | **__%** (`correct / 50`) |

**Failed stages (wrong + uncertain):**

| Stage | Count |
|---|---|
| Input | |
| Understanding | |
| Memory Decision | |
| Consequence Reasoning | |
| Judgment | |
| Response | |
| Future Follow-up | |
| Briefing Effect | |

**First wrong → test added:** `tests/_____________.test.ts` — (describe case)  
**Production fix attempted:** yes / no — (link or PR if yes)

---

## 1. Memory decisions (10)

| # | User input | Expected decision | Actual Sync decision | Verdict | Failed stage | Notes | Test? |
|---|---|---|---|---|---|---|---|
| 1 | | | | correct / wrong / uncertain | | | yes / no |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

---

## 2. Ignored / quiet decisions (10)

Evaluate: light logs, stale notes, vague chatter — should **not** become primary or clutter brief.

| # | User input | Expected decision | Actual Sync decision | Verdict | Failed stage | Notes | Test? |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

---

## 3. Follow-up decisions (10)

Evaluate: `futureFollowUpDecision.decision` — none / remind / check_in / surface_in_brief / ask_now.

| # | User input | Expected decision | Actual Sync decision | Verdict | Failed stage | Notes | Test? |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

---

## 4. Briefing / judgment decisions (10)

Evaluate: `runtime.after.judgment` (primary + ≤2 supporting), `briefChanged`, brief lede.

| # | User input | Expected decision | Actual Sync decision | Verdict | Failed stage | Notes | Test? |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

---

## 5. Pattern / consequence decisions (10)

Evaluate: `runtime.pattern`, consequence summary, tomorrow load, thread peers.

| # | User input | Expected decision | Actual Sync decision | Verdict | Failed stage | Notes | Test? |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

---

## Review close-out

- [ ] 50 rows completed
- [ ] TDR calculated
- [ ] First wrong item has regression test
- [ ] `npm run test:intelligence:all` passed after test add
- [ ] Uncertain rows documented for rule clarification
