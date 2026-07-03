export type SyncObservationSource =
  | "manual_text"
  | "voice_transcript"
  | "calendar_event"
  | "finance_transaction"
  | "health_signal"
  | "email"
  | "file_note"
  | "location_signal"
  | "derived";

export type LifeGraphConfidence = "low" | "medium" | "high";

export type SyncObservation = {
  id: string;
  source: SyncObservationSource;
  observedAt: string;
  receivedAt: string;
  rawContent: string;
  confidence: LifeGraphConfidence;
  sourceId?: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedSyncObjectKind =
  | "event"
  | "memory"
  | "person"
  | "goal"
  | "decision"
  | "project"
  | "routine"
  | "place"
  | "financial_signal"
  | "health_signal"
  | "relationship_signal"
  | "consequence";

export type NormalizedSyncObject = {
  id: string;
  kind: NormalizedSyncObjectKind;
  label: string;
  summary?: string;
  observationId: string;
  memoryId?: string;
  dateKey?: string | null;
  confidence: LifeGraphConfidence;
  attributes?: Record<string, unknown>;
};

export type LifeGraphNodeKind =
  | "memory"
  | "event"
  | "person"
  | "goal"
  | "decision"
  | "project"
  | "routine"
  | "place"
  | "financial_signal"
  | "health_signal"
  | "relationship_signal"
  | "pattern"
  | "belief"
  | "consequence";

export type LifeGraphEdgeKind =
  | "mentions"
  | "involves"
  | "belongs_to"
  | "happens_at"
  | "located_at"
  | "evidence_for"
  | "consequence_of"
  | "updates"
  | "repeats"
  | "delays"
  | "resolves"
  | "contradicts"
  | "supports"
  | "conflicts_with"
  | "affects";

export type LifeGraphNode = {
  id: string;
  kind: LifeGraphNodeKind;
  label: string;
  summary?: string;
  confidence: LifeGraphConfidence;
  observationIds: string[];
  evidenceMemoryIds: string[];
  metadata?: Record<string, unknown>;
};

export type LifeGraphEdge = {
  id: string;
  kind: LifeGraphEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  confidence: LifeGraphConfidence;
  evidenceMemoryIds: string[];
  reason: string;
  createdAt: string;
};

export type SyncInterpretation = {
  id: string;
  nodeId: string;
  factualUnderstanding: string;
  interpretation: string;
  confidence: LifeGraphConfidence;
  evidenceNodeIds: string[];
  caveats: string[];
};

export type ContinuitySignalKind =
  | "repeated_pattern"
  | "resurfaced_goal"
  | "delayed_decision"
  | "unfinished_loop"
  | "improvement"
  | "regression"
  | "recurring_theme";

export type DecisionRelevance = "none" | "low" | "medium" | "high";

export type ContinuitySignal = {
  id: string;
  kind: ContinuitySignalKind;
  summary: string;
  confidence: LifeGraphConfidence;
  nodeIds: string[];
  memoryIds: string[];
  decisionRelevance: DecisionRelevance;
};

export type ContinuityResolutionStatus =
  | "active"
  | "resurfacing"
  | "stalled"
  | "completed"
  | "archived"
  | "historical_context"
  | "contradicted"
  | "no_longer_relevant";

export type ContinuityResolution = {
  id: string;
  targetNodeId: string;
  status: ContinuityResolutionStatus;
  reason: string;
  confidence: LifeGraphConfidence;
  evidenceNodeIds: string[];
  resolvedAt: string;
};

export type BeliefTrend = "strengthening" | "weakening" | "stable" | "unclear";
export type BeliefStatus = "candidate" | "active" | "watching" | "retired";

export type BeliefDomain =
  | "money"
  | "health"
  | "family"
  | "work"
  | "relationships"
  | "routine"
  | "goals"
  | "personal";

export type SyncBelief = {
  id: string;
  statement: string;
  domain: BeliefDomain;
  confidence: LifeGraphConfidence;
  evidenceNodeIds: string[];
  contradictedByNodeIds: string[];
  firstObserved: string;
  lastReinforced: string;
  trend: BeliefTrend;
  status: BeliefStatus;
};

export type LifeGraphSnapshot = {
  id: string;
  generatedAt: string;
  referenceDate: string;
  observations: SyncObservation[];
  normalizedObjects: NormalizedSyncObject[];
  nodes: LifeGraphNode[];
  edges: LifeGraphEdge[];
  interpretations: SyncInterpretation[];
  continuitySignals: ContinuitySignal[];
  continuityResolutions: ContinuityResolution[];
  beliefs: SyncBelief[];
};

export type DecisionGraphContext = {
  snapshotId: string;
  relevantNodeIds: string[];
  continuitySignals: ContinuitySignal[];
  continuityResolutions: ContinuityResolution[];
  beliefs: SyncBelief[];
  interpretationIds: string[];
};

export type NarrativeTone = "calm" | "direct" | "gentle" | "uncertain";

export type NarrativeContext = {
  decisionContext: DecisionGraphContext;
  preferredTone: NarrativeTone;
  evidenceLines: string[];
  forbiddenClaims: string[];
  preserveDecisionOrder: true;
};
