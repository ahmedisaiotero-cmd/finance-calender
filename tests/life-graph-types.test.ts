import assert from "node:assert/strict";

import {
  createManualTextObservation,
  createObservationId,
  type ContinuityResolution,
  type ContinuitySignal,
  type DecisionGraphContext,
  type LifeGraphEdge,
  type LifeGraphNode,
  type LifeGraphSnapshot,
  type NarrativeContext,
  type NormalizedSyncObject,
  type SyncBelief,
  type SyncInterpretation,
  type SyncObservation,
} from "@/lib/intelligence/life-graph";

const observedAt = "2026-06-14T20:00:00.000Z";

{
  const observation = createManualTextObservation({
    rawContent: "  I worked on Sync   from 8pm to 10pm  ",
    observedAt,
    metadata: { surface: "phase-2-test" },
  });
  const sameObservation = createManualTextObservation({
    rawContent: "I worked on Sync from 8pm to 10pm",
    observedAt,
    metadata: { surface: "different-metadata-does-not-change-id" },
  });

  assert.equal(observation.id, sameObservation.id);
  assert.equal(observation.source, "manual_text");
  assert.equal(observation.rawContent, "I worked on Sync from 8pm to 10pm");
  assert.equal(observation.observedAt, observedAt);
  assert.equal(observation.receivedAt, observedAt);
  assert.equal(observation.confidence, "high");
  assert.deepEqual(observation.metadata, { surface: "phase-2-test" });
}

{
  const withoutSourceId = createObservationId({
    source: "manual_text",
    observedAt,
    rawContent: "Payday is Friday",
  });
  const withSourceId = createObservationId({
    source: "manual_text",
    observedAt,
    rawContent: "Payday is Friday",
    sourceId: "capture-1",
  });

  assert.match(withoutSourceId, /^obs_[a-z0-9]+$/);
  assert.match(withSourceId, /^obs_[a-z0-9]+$/);
  assert.notEqual(withoutSourceId, withSourceId);
}

{
  const observation: SyncObservation = createManualTextObservation({
    rawContent: "Mom's birthday is tomorrow",
    observedAt,
    confidence: "medium",
    sourceId: "manual-test",
  });

  const normalized: NormalizedSyncObject = {
    id: "normalized-mom-birthday",
    kind: "event",
    label: "Mom's birthday",
    summary: "A family birthday was captured.",
    observationId: observation.id,
    memoryId: "memory-mom-birthday",
    dateKey: "2026-06-15",
    confidence: "medium",
    attributes: { area: "family" },
  };

  const memoryNode: LifeGraphNode = {
    id: "node-memory-mom-birthday",
    kind: "memory",
    label: "Mom's Birthday",
    confidence: "medium",
    observationIds: [observation.id],
    evidenceMemoryIds: ["memory-mom-birthday"],
  };

  const eventNode: LifeGraphNode = {
    id: "node-event-mom-birthday",
    kind: "event",
    label: "Mom's birthday",
    confidence: "medium",
    observationIds: [observation.id],
    evidenceMemoryIds: ["memory-mom-birthday"],
  };

  const edge: LifeGraphEdge = {
    id: "edge-memory-event",
    kind: "mentions",
    fromNodeId: memoryNode.id,
    toNodeId: eventNode.id,
    confidence: "medium",
    evidenceMemoryIds: ["memory-mom-birthday"],
    reason: "The memory mentions the birthday event.",
    createdAt: observedAt,
  };

  const interpretation: SyncInterpretation = {
    id: "interpretation-mom-birthday",
    nodeId: eventNode.id,
    factualUnderstanding: "Mom's birthday is tomorrow.",
    interpretation: "This is a family relationship moment.",
    confidence: "medium",
    evidenceNodeIds: [eventNode.id],
    caveats: [],
  };

  const continuitySignal: ContinuitySignal = {
    id: "continuity-mom-birthday",
    kind: "recurring_theme",
    summary: "Family dates can matter when close in time.",
    confidence: "medium",
    nodeIds: [eventNode.id],
    memoryIds: ["memory-mom-birthday"],
    decisionRelevance: "medium",
  };

  const continuityResolution: ContinuityResolution = {
    id: "resolution-mom-birthday",
    targetNodeId: eventNode.id,
    status: "active",
    reason: "The birthday is tomorrow.",
    confidence: "high",
    evidenceNodeIds: [eventNode.id],
    resolvedAt: observedAt,
  };

  const belief: SyncBelief = {
    id: "belief-family-dates",
    statement: "Family dates may be worth surfacing when close in time.",
    domain: "family",
    confidence: "low",
    evidenceNodeIds: [eventNode.id],
    contradictedByNodeIds: [],
    firstObserved: observedAt,
    lastReinforced: observedAt,
    trend: "unclear",
    status: "candidate",
  };

  const snapshot: LifeGraphSnapshot = {
    id: "snapshot-phase-2",
    generatedAt: observedAt,
    referenceDate: "2026-06-14",
    observations: [observation],
    normalizedObjects: [normalized],
    nodes: [memoryNode, eventNode],
    edges: [edge],
    interpretations: [interpretation],
    continuitySignals: [continuitySignal],
    continuityResolutions: [continuityResolution],
    beliefs: [belief],
  };

  const decisionContext: DecisionGraphContext = {
    snapshotId: snapshot.id,
    relevantNodeIds: [eventNode.id],
    continuitySignals: snapshot.continuitySignals,
    continuityResolutions: snapshot.continuityResolutions,
    beliefs: snapshot.beliefs,
    interpretationIds: [interpretation.id],
  };

  const narrativeContext: NarrativeContext = {
    decisionContext,
    preferredTone: "calm",
    evidenceLines: ["Mom's birthday is tomorrow."],
    forbiddenClaims: ["graph", "node", "edge"],
    preserveDecisionOrder: true,
  };

  assert.equal(snapshot.observations[0]?.id, observation.id);
  assert.equal(snapshot.normalizedObjects[0]?.kind, "event");
  assert.equal(snapshot.edges[0]?.kind, "mentions");
  assert.equal(snapshot.continuityResolutions[0]?.status, "active");
  assert.equal(snapshot.beliefs[0]?.status, "candidate");
  assert.equal(narrativeContext.preserveDecisionOrder, true);
}

console.log("life-graph type tests passed");
