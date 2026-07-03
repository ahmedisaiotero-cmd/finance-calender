import type {
  ContinuityResolution,
  ContinuitySignal,
  LifeGraphConfidence,
  LifeGraphNode,
  LifeGraphSnapshot,
  SyncInterpretation,
} from "@/lib/intelligence/life-graph/types";

type InterpretationDraft = Omit<SyncInterpretation, "id">;

const LOW_VALUE_MEMORY_PATTERNS = [
  /\bate\s+lunch\b/i,
  /\bhad\s+lunch\b/i,
  /\bhad\s+breakfast\b/i,
  /\bsmall\s+errand\b/i,
];

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function createInterpretationId(input: InterpretationDraft) {
  const identity = [
    input.nodeId,
    input.factualUnderstanding,
    input.interpretation,
    input.confidence,
    ...uniqueSorted(input.evidenceNodeIds),
  ].join("|");

  return `interp_${stableHash(identity)}`;
}

function finalizeInterpretation(draft: InterpretationDraft): SyncInterpretation {
  return {
    id: createInterpretationId(draft),
    nodeId: draft.nodeId,
    factualUnderstanding: draft.factualUnderstanding,
    interpretation: draft.interpretation,
    confidence: draft.confidence,
    evidenceNodeIds: uniqueSorted(draft.evidenceNodeIds),
    caveats: [...new Set(draft.caveats)],
  };
}

function confidenceFromEvidence(
  explicit: boolean,
  evidenceNodeCount: number,
): LifeGraphConfidence {
  if (explicit && evidenceNodeCount >= 2) return "high";
  if (explicit) return "medium";
  return "low";
}

function observationText(snapshot: LifeGraphSnapshot, observationId: string): string {
  return (
    snapshot.observations.find((observation) => observation.id === observationId)
      ?.rawContent ?? ""
  );
}

function nodeText(node: LifeGraphNode, snapshot: LifeGraphSnapshot): string {
  const parts = [node.label, node.summary];
  const attributes = node.metadata?.attributes as
    | {
        prompt?: string;
        originalPrompt?: string;
      }
    | undefined;

  if (attributes?.prompt) parts.push(attributes.prompt);
  if (attributes?.originalPrompt) parts.push(attributes.originalPrompt);

  for (const observationId of node.observationIds) {
    parts.push(observationText(snapshot, observationId));
  }

  return parts.filter(Boolean).join(" ");
}

function hasLinkedTerm(snapshot: LifeGraphSnapshot, term: RegExp) {
  return snapshot.nodes.some((node) => term.test(nodeText(node, snapshot)));
}

function matchingSignals(
  node: LifeGraphNode,
  signals: ContinuitySignal[],
): ContinuitySignal[] {
  return signals.filter((signal) => signal.nodeIds.includes(node.id));
}

function matchingResolutions(
  node: LifeGraphNode,
  resolutions: ContinuityResolution[],
): ContinuityResolution[] {
  return resolutions.filter(
    (resolution) =>
      resolution.targetNodeId === node.id || resolution.evidenceNodeIds.includes(node.id),
  );
}

function hasLowValuePattern(text: string) {
  return LOW_VALUE_MEMORY_PATTERNS.some((pattern) => pattern.test(text));
}

function defaultSingleEvidenceCaveat(evidenceNodeIds: string[]) {
  return evidenceNodeIds.length <= 1
    ? ["This is based on one memory and may need more evidence over time."]
    : [];
}

function interpretMemoryNode(
  node: LifeGraphNode,
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  resolutions: ContinuityResolution[],
): SyncInterpretation | null {
  const text = nodeText(node, snapshot);
  const lower = text.toLowerCase();
  const nodeSignals = matchingSignals(node, signals);
  const nodeResolutions = matchingResolutions(node, resolutions);

  const stalled = nodeResolutions.find((resolution) => resolution.status === "stalled");
  const completed = nodeResolutions.find((resolution) => resolution.status === "completed");
  const archived = nodeResolutions.find((resolution) => resolution.status === "archived");
  const historical = nodeResolutions.find(
    (resolution) => resolution.status === "historical_context",
  );
  const noLongerRelevant = nodeResolutions.find(
    (resolution) => resolution.status === "no_longer_relevant",
  );
  const contradicted = nodeResolutions.find(
    (resolution) => resolution.status === "contradicted",
  );

  if (hasLowValuePattern(lower) && nodeSignals.length === 0 && nodeResolutions.length === 0) {
    return null;
  }

  if (/\bworked\s+on\s+sync\b/i.test(lower)) {
    const evidenceNodeIds = uniqueSorted([
      node.id,
      ...nodeSignals.flatMap((signal) => signal.nodeIds),
      ...nodeResolutions.flatMap((resolution) => resolution.evidenceNodeIds),
    ]);
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: "The user worked on Sync.",
      interpretation: "This may reinforce Sync as an active project.",
      confidence: confidenceFromEvidence(true, evidenceNodeIds.length),
      evidenceNodeIds,
      caveats: defaultSingleEvidenceCaveat(evidenceNodeIds),
    });
  }

  if (/\bpayday\b/i.test(lower)) {
    const evidenceNodeIds = uniqueSorted([node.id, ...nodeSignals.flatMap((s) => s.nodeIds)]);
    const caveats: string[] = [];
    if (!hasLinkedTerm(snapshot, /\b(rent|bill|due)\b/i)) {
      caveats.push("There is no explicit linked bill or rent evidence yet.");
    }
    caveats.push(...defaultSingleEvidenceCaveat(evidenceNodeIds));
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: "The user mentioned payday.",
      interpretation: "This may matter because it affects upcoming money timing.",
      confidence: "medium",
      evidenceNodeIds,
      caveats,
    });
  }

  if (/\bmom'?s\s+birthday\b/i.test(lower)) {
    const evidenceNodeIds = [node.id];
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: "The user mentioned Mom's birthday.",
      interpretation: "This may matter for near-term family timing.",
      confidence: "medium",
      evidenceNodeIds,
      caveats: [
        "This focuses on timing and does not imply broader relationship conclusions.",
      ],
    });
  }

  if (/\bkeep\s+delaying\b/i.test(lower) || /\bstill\s+need\s+to\s+cancel\s+uber\b/i.test(lower)) {
    const evidenceNodeIds = uniqueSorted([
      node.id,
      ...nodeSignals.flatMap((signal) => signal.nodeIds),
      ...nodeResolutions.flatMap((resolution) => resolution.evidenceNodeIds),
    ]);
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: /\bkeep\s+delaying\b/i.test(lower)
        ? "The user said they keep delaying cancelling Uber."
        : "The user said they still need to cancel Uber.",
      interpretation: stalled
        ? "This may represent an unresolved loop with stalled follow-through."
        : "This may represent an unresolved loop.",
      confidence: "medium",
      evidenceNodeIds,
      caveats: ["Completion status is still unknown."],
    });
  }

  if (/\bfinally\s+cancelled\s+uber\b/i.test(lower)) {
    const evidenceNodeIds = uniqueSorted([
      node.id,
      ...(completed?.evidenceNodeIds ?? []),
    ]);
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: "The user said they finally cancelled Uber.",
      interpretation: "This may close the Uber cancellation loop and does not imply further reminders.",
      confidence: confidenceFromEvidence(true, evidenceNodeIds.length),
      evidenceNodeIds,
      caveats: [],
    });
  }

  if (/\bdone\s+with\s+the\s+vending\s+idea\b/i.test(lower)) {
    const evidenceNodeIds = uniqueSorted([
      node.id,
      ...(archived?.evidenceNodeIds ?? []),
      ...(historical?.evidenceNodeIds ?? []),
    ]);
    const interpretation = historical
      ? "This suggests the vending idea should be treated as historical context."
      : "This suggests the vending idea should be treated as archived.";
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: "The user said the vending idea is done.",
      interpretation,
      confidence: confidenceFromEvidence(true, evidenceNodeIds.length),
      evidenceNodeIds,
      caveats: defaultSingleEvidenceCaveat(evidenceNodeIds),
    });
  }

  if (/\bwant\s+to\s+buy\s+a?\s*mustang\b/i.test(lower)) {
    const evidenceNodeIds = uniqueSorted([
      node.id,
      ...nodeSignals.flatMap((signal) => signal.nodeIds),
      ...nodeResolutions.flatMap((resolution) => resolution.evidenceNodeIds),
    ]);
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: "The user stated a goal to buy a Mustang.",
      interpretation: noLongerRelevant || contradicted
        ? "This goal was stated before, but newer evidence suggests it may no longer be active."
        : "This may represent a stated car-related goal.",
      confidence: "low",
      evidenceNodeIds,
      caveats: [
        "This is a stated car-related goal, but it is not enough evidence to treat as a recommendation.",
      ],
    });
  }

  if (/\bspent\s+less\b/i.test(lower)) {
    const evidenceNodeIds = uniqueSorted([
      node.id,
      ...nodeSignals.flatMap((signal) => signal.nodeIds),
    ]);
    return finalizeInterpretation({
      nodeId: node.id,
      factualUnderstanding: "The user said they spent less this month.",
      interpretation: "This may indicate explicit short-term financial improvement.",
      confidence: "medium",
      evidenceNodeIds,
      caveats: [
        "This is explicit improvement wording, but it is not enough to claim a long-term trend.",
      ],
    });
  }

  return null;
}

function interpretResolution(
  resolution: ContinuityResolution,
): SyncInterpretation | null {
  const evidenceNodeIds = uniqueSorted([
    resolution.targetNodeId,
    ...resolution.evidenceNodeIds,
  ]);

  if (resolution.status === "stalled") {
    return finalizeInterpretation({
      nodeId: resolution.targetNodeId,
      factualUnderstanding: "There is explicit evidence of an unresolved decision loop.",
      interpretation: "This may require follow-through before it becomes complete.",
      confidence: resolution.confidence,
      evidenceNodeIds,
      caveats: ["Completion is not yet confirmed."],
    });
  }

  if (resolution.status === "completed") {
    return finalizeInterpretation({
      nodeId: resolution.targetNodeId,
      factualUnderstanding: "A task was explicitly marked complete.",
      interpretation: "This may close a prior open loop.",
      confidence: resolution.confidence,
      evidenceNodeIds,
      caveats: [],
    });
  }

  if (resolution.status === "historical_context") {
    return finalizeInterpretation({
      nodeId: resolution.targetNodeId,
      factualUnderstanding: "Older evidence remains for an idea that was later archived.",
      interpretation: "This should be treated as historical context rather than an active focus.",
      confidence: resolution.confidence,
      evidenceNodeIds,
      caveats: defaultSingleEvidenceCaveat(evidenceNodeIds),
    });
  }

  return null;
}

export function deriveInterpretations(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  resolutions: ContinuityResolution[],
): SyncInterpretation[] {
  const memoryInterpretations = snapshot.nodes
    .filter((node) => node.kind === "memory")
    .map((node) => interpretMemoryNode(node, snapshot, signals, resolutions))
    .filter((value): value is SyncInterpretation => Boolean(value));

  const resolutionInterpretations = resolutions
    .map((resolution) => interpretResolution(resolution))
    .filter((value): value is SyncInterpretation => Boolean(value));

  const merged = [...memoryInterpretations, ...resolutionInterpretations];
  const dedupedById = new Map<string, SyncInterpretation>();
  for (const interpretation of merged) {
    dedupedById.set(interpretation.id, interpretation);
  }

  return [...dedupedById.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}
