# Sync Engine

Shared reasoning orchestration for Sync Lab and future clients.

`processSyncMessage()` is the conductor: every user message runs through the full
runtime brain evaluation while preserving existing capture-time response copy.

## Pipeline

```
Input
  → Understanding (meaning-engine via capture preview)
  → Memory Decision (dedupe, readiness, vague gate)
  → Consequence Reasoning (capture-time + runtime buildAllConsequences)
  → Judgment (decideTodayPriorities via buildHomePriorities)
  → Response (capture understanding for chat; runSyncEngine on judgment in runtime)
  → Future Follow-up
  → Briefing (buildDailyBrief before/after diff + runtime snapshot)
```

## Modules

| Path | Role |
|---|---|
| `input/process-sync-message.ts` | Message orchestrator |
| `brain/build-runtime-brain.ts` | Full runtime stack evaluation |
| `tools/lab-state.ts` | Lab memory/brief/review helpers |
| `testing/*` | Fixture suites against `processSyncMessage` |

Mobile Today still consumes `build-home-priorities.ts` directly. Lab evaluates the
same judgment path through `runtime.after.judgment`.
