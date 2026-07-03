# Sync Intelligence Foundation

Repository layout and file ownership map: `SYNC_REPOSITORY.md`.

## 1. Sync's intelligence purpose

Sync exists to make trustworthy attention decisions from real life evidence over time.  
The product is trust, not feature volume.  
The reusable intelligence layer is Sync's long-term product.
The Sync app is the first product surface and proving ground for this intelligence.
The core question remains: what does this mean in the context of the user's life over time?

## 2. Core architecture

Life input  
-> Sync Intelligence (Observations, Knowledge, Life Graph, Learning, Decision, Narrative)  
-> Adapters  
-> Surfaces (Home, My Life, Life Timeline, Capture, Area views)  
-> Optional Integrations as user-approved sources/plugins

## 3. Layer responsibilities

- Sync Intelligence (Layer 1)
  - Owns memory, life graph, reasoning, consequence detection, pattern intelligence, prioritization, and narrative context.
  - Must remain reusable across surfaces.

- Adapters (Layer 2)
  - Translate intelligence outputs for Home, Timeline, My Life, Capture, area views, and future outputs such as chat/voice/domain views.
  - Do not own ranking, reasoning, or hidden business rules.

- Surfaces (Layer 3)
  - Own UI and interaction in web app, mobile app, iOS shell, and future dedicated apps.
  - Consume prepared intelligence rather than implementing their own intelligence.

- Integrations (Layer 4)
  - Own optional external connectors (calendar, finance, health, email/messages), auth/permissions, and privacy boundaries.
  - Must be user-approved and never forced defaults.

- Observation  
  - Capture raw reality with source, timestamp, and content fidelity.
  - Preserve raw prompt/transcript and source metadata before interpretation.

- Knowledge Engine  
  - Normalize observations into conservative typed objects (`memory`, `event`, `goal`, `*_signal`).
  - Build evidence-backed graph nodes/edges only from explicit data.

- Life Graph  
  - Store connected, persistent, inspectable knowledge.
  - Represent what is known, not what should be ranked.

- Learning Engine  
  - Derive continuity signals, continuity resolutions, interpretations, and beliefs.
  - Learn cautiously from repeated evidence and explicit wording.
  - Keep every conclusion traceable to evidence IDs.

- Continuity Signal  
  - Detect conservative patterns (`recurring_theme`, `resurfaced_goal`, `delayed_decision`, etc.).
  - Flag potential continuity relevance without resolving final state.

- Continuity Resolution  
  - Map signals and explicit wording to status (`stalled`, `completed`, `archived`, etc.).
  - Ensure completed/archived/contradicted items do not stay active.

- Interpretation  
  - Split factual understanding ("what happened") from cautious meaning ("what this may mean").
  - Include confidence, evidence IDs, and caveats.

- Belief  
  - Store conservative internal summaries backed by repeated or strong explicit evidence.
  - Track confidence, trend, status, contradiction evidence, and observation windows.

- DecisionGraphContext  
  - Package relevant graph + learning outputs for future decision consumption.
  - No ranking, no scoring, no copy generation.

- NarrativeContext  
  - Prepare tone, evidence lines, and overclaim guardrails for future narrative synthesis.
  - Preserve decision order; do not decide importance.

- Surface  
  - Display prepared intelligence.
  - Must stay thin: no ranking ownership, no hidden intelligence logic.

## 4. Evidence rules

- Explicit evidence  
  - Direct user wording ("I finally cancelled Uber", "That goal does not matter anymore").
  - Can justify medium confidence even from one memory when wording is explicit.

- Repeated evidence  
  - Multiple related memories/signals over time.
  - Required for most durable beliefs and strengthening trends.

- Weak evidence  
  - One-off or ambiguous notes without reinforcement.
  - Should stay low confidence, caveated, and often ignored.

- Contradiction  
  - Explicit reversals ("I changed my mind...").
  - Must be linked in `contradictedByNodeIds` and reflected in trend/status.

- Completion  
  - Explicit completion language.
  - Must retire unresolved-loop states for the same subject.

- Archival  
  - Explicit "done with / moving on" wording for larger ideas/projects.
  - Must stop treating archived ideas as active goals.

- Historical context  
  - Older evidence retained, but superseded by newer archive/dismissal.
  - Useful for continuity without re-activating retired goals.

- Uncertainty  
  - Use caveats when evidence is sparse, ambiguous, or single-memory.
  - Keep confidence conservative by default.

## 5. Trust rules

- Do not overclaim.
- Do not diagnose personality.
- Do not judge the user.
- Do not treat stated goals as recommendations.
- Do not keep archived goals active.
- Do not infer from missing data.
- Always preserve evidence links internally.
- Use caveats when confidence is low or evidence is thin.

## 6. Boundary rules

- Knowledge Engine builds knowledge.
- Life Graph stores connected knowledge.
- Learning Engine reasons and learns from evidence.
- Decision Engine ranks attention.
- Narrative Engine shapes language.
- Surfaces display prepared intelligence.
- Integrations enrich intelligence only after explicit user consent.

Decision and Narrative boundaries are strict:
- Decision remains ranking owner.
- Narrative shapes communication only.
- Context adapters (`DecisionGraphContext`, `NarrativeContext`) are preparatory, not behavioral.

## 7. Current foundation status

Completed phases:
- Phase 1: regression safety baseline.
- Phase 2: observation and Life Graph type vocabulary.
- Phase 3: conservative normalization from captured items.
- Phase 4: deterministic graph projection.
- Phase 5: conservative continuity signals.
- Phase 6: continuity resolution states.
- Phase 7: interpretation layer (factual vs meaning split).
- Phase 8: conservative beliefs with contradiction handling.
- Phase 9: `DecisionGraphContext` adapter.
- Phase 10: `NarrativeContext` adapter.

Current guarantees:
- Deterministic graph/reasoning adapters.
- No production surface wiring yet.
- No Decision Engine ranking change.
- No visible copy changes from these phases.

## 8. Activation readiness checklist

Before production wiring:
- Full test suite passes.
- No accidental runtime behavior changes.
- Graph and Learning outputs are deterministic.
- Decision ranking behavior unchanged.
- Surface copy unchanged.
- Beliefs do not overclaim.
- Completed loops do not remain unresolved.
- Archived ideas do not appear active.
- User-facing lines do not leak graph/node/edge language.
- Evidence traceability exists for signals, resolutions, interpretations, and beliefs.

Activation should proceed in controlled debug/lab-only steps first, then production after trust and regression checks remain green.
