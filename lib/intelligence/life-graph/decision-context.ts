import type {
  ContinuityResolutionStatus,
  DecisionGraphContext,
  LifeGraphSnapshot,
  SyncInterpretation,
} from "@/lib/intelligence/life-graph/types";
import type { ReasoningEngineOutput } from "@/lib/intelligence/life-graph/reasoning-engine";

const RELEVANT_RESOLUTION_STATUSES = new Set<ContinuityResolutionStatus>([
  "stalled",
  "resurfacing",
  "active",
  "completed",
  "archived",
  "contradicted",
  "no_longer_relevant",
]);

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function isMeaningfulInterpretation(interpretation: SyncInterpretation) {
  if (interpretation.confidence === "medium" || interpretation.confidence === "high") {
    return true;
  }
  return interpretation.evidenceNodeIds.length > 1;
}

export function buildDecisionGraphContext(
  snapshot: LifeGraphSnapshot,
  reasoning: ReasoningEngineOutput,
): DecisionGraphContext {
  const relevantNodeIds = new Set<string>();

  for (const signal of reasoning.continuitySignals) {
    if (signal.decisionRelevance === "high" || signal.decisionRelevance === "medium") {
      for (const nodeId of signal.nodeIds) {
        relevantNodeIds.add(nodeId);
      }
    }
  }

  for (const resolution of reasoning.continuityResolutions) {
    if (!RELEVANT_RESOLUTION_STATUSES.has(resolution.status)) continue;
    relevantNodeIds.add(resolution.targetNodeId);
    for (const evidenceNodeId of resolution.evidenceNodeIds) {
      relevantNodeIds.add(evidenceNodeId);
    }
  }

  for (const belief of reasoning.beliefs) {
    if (belief.status !== "active" && belief.status !== "watching") continue;
    for (const evidenceNodeId of belief.evidenceNodeIds) {
      relevantNodeIds.add(evidenceNodeId);
    }
  }

  const meaningfulInterpretations = reasoning.interpretations.filter(
    isMeaningfulInterpretation,
  );
  for (const interpretation of meaningfulInterpretations) {
    relevantNodeIds.add(interpretation.nodeId);
    for (const evidenceNodeId of interpretation.evidenceNodeIds) {
      relevantNodeIds.add(evidenceNodeId);
    }
  }

  return {
    snapshotId: snapshot.id,
    relevantNodeIds: uniqueSorted([...relevantNodeIds]),
    continuitySignals: [...reasoning.continuitySignals].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    continuityResolutions: [...reasoning.continuityResolutions].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    beliefs: [...reasoning.beliefs].sort((left, right) => left.id.localeCompare(right.id)),
    interpretationIds: uniqueSorted(
      meaningfulInterpretations.map((interpretation) => interpretation.id),
    ),
  };
}
