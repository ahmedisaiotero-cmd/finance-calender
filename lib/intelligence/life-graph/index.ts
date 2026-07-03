export type {
  BeliefDomain,
  BeliefStatus,
  BeliefTrend,
  ContinuityResolution,
  ContinuityResolutionStatus,
  ContinuitySignal,
  ContinuitySignalKind,
  DecisionGraphContext,
  DecisionRelevance,
  LifeGraphConfidence,
  LifeGraphEdge,
  LifeGraphEdgeKind,
  LifeGraphNode,
  LifeGraphNodeKind,
  LifeGraphSnapshot,
  NarrativeContext,
  NarrativeTone,
  NormalizedSyncObject,
  NormalizedSyncObjectKind,
  SyncBelief,
  SyncInterpretation,
  SyncObservation,
  SyncObservationSource,
} from "@/lib/intelligence/life-graph/types";

export {
  createManualTextObservation,
  createObservationId,
  type ManualTextObservationInput,
} from "@/lib/intelligence/life-graph/observations";

export {
  normalizeCapturedItem,
  normalizeCapturedItems,
  normalizeCapturedItemToObservation,
  type CapturedItemNormalization,
} from "@/lib/intelligence/life-graph/normalize-observation";

export {
  buildLifeGraphSnapshot,
  type BuildLifeGraphInput,
} from "@/lib/intelligence/life-graph/build-life-graph";

export {
  connectConsequences,
  connectNormalizedObjects,
  createEdgeId,
  nodeIdForConsequence,
  nodeIdForNormalizedObject,
} from "@/lib/intelligence/life-graph/connect-life-graph";

export { deriveContinuitySignals } from "@/lib/intelligence/life-graph/continuity";

export {
  resolveContinuity,
  type ResolveContinuityOptions,
} from "@/lib/intelligence/life-graph/resolve-continuity";

export { deriveInterpretations } from "@/lib/intelligence/life-graph/interpretation";
export { deriveBeliefs } from "@/lib/intelligence/life-graph/beliefs";
export { buildDecisionGraphContext } from "@/lib/intelligence/life-graph/decision-context";
export { buildNarrativeContext } from "@/lib/intelligence/life-graph/narrative-context";
export {
  buildLifeGraphDiagnostics,
  type BuildLifeGraphDiagnosticsInput,
  type LifeGraphDiagnostics,
} from "@/lib/intelligence/life-graph/life-graph-diagnostics";

export {
  runReasoningEngine,
  type ReasoningEngineOutput,
} from "@/lib/intelligence/life-graph/reasoning-engine";
