import type {
  ContinuityResolution,
  ContinuitySignal,
  LifeGraphNode,
  LifeGraphSnapshot,
  SyncBelief,
  SyncInterpretation,
} from "@/lib/intelligence/life-graph/types";

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

function nodeById(snapshot: LifeGraphSnapshot, nodeId: string) {
  return snapshot.nodes.find((node) => node.id === nodeId);
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

function memoryCreatedAt(node: LifeGraphNode): string {
  const attributes = node.metadata?.attributes as { createdAt?: string } | undefined;
  return attributes?.createdAt ?? "";
}

function memoryNodes(snapshot: LifeGraphSnapshot) {
  return snapshot.nodes.filter((node) => node.kind === "memory");
}

function buildBeliefId(
  statement: string,
  evidenceNodeIds: string[],
  contradictedByNodeIds: string[],
) {
  const identity = [
    statement,
    ...uniqueSorted(evidenceNodeIds),
    ...uniqueSorted(contradictedByNodeIds),
  ].join("|");
  return `belief_${stableHash(identity)}`;
}

function dateBounds(snapshot: LifeGraphSnapshot, nodeIds: string[]) {
  const createdAt = nodeIds
    .map((nodeId) => nodeById(snapshot, nodeId))
    .filter((node): node is LifeGraphNode => Boolean(node))
    .map((node) => memoryCreatedAt(node))
    .filter(Boolean)
    .sort();

  const firstObserved = createdAt[0] ?? snapshot.generatedAt;
  const lastReinforced = createdAt.at(-1) ?? snapshot.generatedAt;
  return { firstObserved, lastReinforced };
}

function createBelief(input: {
  snapshot: LifeGraphSnapshot;
  statement: string;
  domain: SyncBelief["domain"];
  confidence: SyncBelief["confidence"];
  evidenceNodeIds: string[];
  contradictedByNodeIds?: string[];
  trend: SyncBelief["trend"];
  status: SyncBelief["status"];
}): SyncBelief | null {
  const evidenceNodeIds = uniqueSorted(input.evidenceNodeIds);
  if (evidenceNodeIds.length === 0) return null;

  const contradictedByNodeIds = uniqueSorted(input.contradictedByNodeIds ?? []);
  const { firstObserved, lastReinforced } = dateBounds(
    input.snapshot,
    evidenceNodeIds,
  );

  return {
    id: buildBeliefId(input.statement, evidenceNodeIds, contradictedByNodeIds),
    statement: input.statement,
    domain: input.domain,
    confidence: input.confidence,
    evidenceNodeIds,
    contradictedByNodeIds,
    firstObserved,
    lastReinforced,
    trend: input.trend,
    status: input.status,
  };
}

function deriveSyncActiveBelief(snapshot: LifeGraphSnapshot) {
  const nodes = memoryNodes(snapshot).filter((node) =>
    /\b(worked\s+on\s+sync|made\s+progress\s+on\s+sync)\b/i.test(
      nodeText(node, snapshot),
    ),
  );
  if (nodes.length < 2) return null;

  const evidenceNodeIds = nodes.map((node) => node.id);
  return createBelief({
    snapshot,
    statement: "Sync appears to be an active project.",
    domain: "work",
    confidence: nodes.length >= 3 ? "high" : "medium",
    evidenceNodeIds,
    trend: nodes.length >= 3 ? "strengthening" : "stable",
    status: "active",
  });
}

function deriveRecurringMoneyBelief(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
) {
  const moneySignal = signals.find(
    (signal) =>
      signal.kind === "recurring_theme" && /money/i.test(signal.summary),
  );
  if (!moneySignal) return null;

  return createBelief({
    snapshot,
    statement: "Money has been a recurring area of attention.",
    domain: "money",
    confidence: "medium",
    evidenceNodeIds: moneySignal.nodeIds,
    trend: moneySignal.nodeIds.length >= 3 ? "strengthening" : "stable",
    status: "active",
  });
}

function findMustangNodes(snapshot: LifeGraphSnapshot) {
  return memoryNodes(snapshot).filter((node) =>
    /\bmustang\b/i.test(nodeText(node, snapshot)),
  );
}

function deriveMustangBelief(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  resolutions: ContinuityResolution[],
) {
  const mustangNodes = findMustangNodes(snapshot);
  if (mustangNodes.length === 0) return null;

  const resurfaced = signals.find(
    (signal) =>
      signal.kind === "resurfaced_goal" && /mustang/i.test(signal.summary),
  );
  const contradiction = resolutions.find((resolution) => {
    if (resolution.status !== "contradicted" && resolution.status !== "no_longer_relevant") {
      return false;
    }
    const target = nodeById(snapshot, resolution.targetNodeId);
    return target ? /\bmustang\b/i.test(nodeText(target, snapshot)) : false;
  });

  // Keep this conservative: need repeated mentions or resurfacing signal.
  if (!resurfaced && mustangNodes.length < 2) return null;

  const evidenceNodeIds = uniqueSorted([
    ...mustangNodes.map((node) => node.id),
    ...(resurfaced?.nodeIds ?? []),
  ]);
  const contradictedByNodeIds = contradiction
    ? uniqueSorted([contradiction.targetNodeId, ...contradiction.evidenceNodeIds])
    : [];

  return createBelief({
    snapshot,
    statement: "The Mustang goal has resurfaced more than once.",
    domain: "goals",
    confidence: contradiction ? "medium" : mustangNodes.length >= 3 ? "high" : "medium",
    evidenceNodeIds,
    contradictedByNodeIds,
    trend: contradiction ? "weakening" : mustangNodes.length >= 3 ? "strengthening" : "stable",
    status: contradiction ? "retired" : "active",
  });
}

function uberEvidenceFrom(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  resolutions: ContinuityResolution[],
) {
  const stalledSignals = signals.filter(
    (signal) =>
      (signal.kind === "delayed_decision" || signal.kind === "unfinished_loop") &&
      /uber/i.test(signal.summary),
  );
  const stalledResolutions = resolutions.filter((resolution) => {
    if (resolution.status !== "stalled" && resolution.status !== "completed") return false;
    const target = nodeById(snapshot, resolution.targetNodeId);
    return target ? /\buber\b/i.test(nodeText(target, snapshot)) : false;
  });

  return { stalledSignals, stalledResolutions };
}

function deriveUberLoopBelief(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  resolutions: ContinuityResolution[],
) {
  const { stalledSignals, stalledResolutions } = uberEvidenceFrom(
    snapshot,
    signals,
    resolutions,
  );
  if (stalledSignals.length === 0 && stalledResolutions.length === 0) return null;

  const completed = stalledResolutions.some(
    (resolution) => resolution.status === "completed",
  );
  const evidenceNodeIds = uniqueSorted([
    ...stalledSignals.flatMap((signal) => signal.nodeIds),
    ...stalledResolutions.flatMap((resolution) => [
      resolution.targetNodeId,
      ...resolution.evidenceNodeIds,
    ]),
  ]);
  const contradictedByNodeIds = completed
    ? uniqueSorted(
        stalledResolutions
          .filter((resolution) => resolution.status === "completed")
          .flatMap((resolution) => [
            resolution.targetNodeId,
            ...resolution.evidenceNodeIds,
          ]),
      )
    : [];

  return createBelief({
    snapshot,
    statement: "Uber cancellation has been an unresolved loop.",
    domain: "routine",
    confidence: completed ? "medium" : evidenceNodeIds.length >= 3 ? "high" : "medium",
    evidenceNodeIds,
    contradictedByNodeIds,
    trend: completed ? "weakening" : evidenceNodeIds.length >= 3 ? "strengthening" : "stable",
    status: completed ? "retired" : "watching",
  });
}

function deriveVendingArchivedBelief(
  snapshot: LifeGraphSnapshot,
  resolutions: ContinuityResolution[],
) {
  const archived = resolutions.filter((resolution) => {
    if (resolution.status !== "archived" && resolution.status !== "historical_context") {
      return false;
    }
    const target = nodeById(snapshot, resolution.targetNodeId);
    return target ? /\bvending\b/i.test(nodeText(target, snapshot)) : false;
  });
  if (archived.length === 0) return null;

  const evidenceNodeIds = uniqueSorted(
    archived.flatMap((resolution) => [
      resolution.targetNodeId,
      ...resolution.evidenceNodeIds,
    ]),
  );
  return createBelief({
    snapshot,
    statement: "The vending idea appears archived based on explicit user wording.",
    domain: "goals",
    confidence: "medium",
    evidenceNodeIds,
    trend: "weakening",
    status: "retired",
  });
}

function deriveSubscriptionAmexBelief(snapshot: LifeGraphSnapshot) {
  const nodes = memoryNodes(snapshot).filter((node) =>
    /\bsubscriptions?\s+on\s+my\s+amex\b/i.test(nodeText(node, snapshot)),
  );
  if (nodes.length === 0) return null;

  return createBelief({
    snapshot,
    statement: "The user prefers subscriptions to be organized through Amex.",
    domain: "money",
    confidence: "medium",
    evidenceNodeIds: nodes.map((node) => node.id),
    trend: nodes.length >= 2 ? "strengthening" : "unclear",
    status: "active",
  });
}

function deriveInterpretationBackedBelief(
  snapshot: LifeGraphSnapshot,
  interpretations: SyncInterpretation[],
) {
  const recurring = interpretations.find((interpretation) =>
    /active project/i.test(interpretation.interpretation),
  );
  if (!recurring) return null;

  return createBelief({
    snapshot,
    statement: "Sync appears to be an active project.",
    domain: "work",
    confidence: recurring.evidenceNodeIds.length >= 2 ? "medium" : "low",
    evidenceNodeIds: recurring.evidenceNodeIds,
    trend: recurring.evidenceNodeIds.length >= 2 ? "stable" : "unclear",
    status: "candidate",
  });
}

export function deriveBeliefs(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  resolutions: ContinuityResolution[],
  interpretations: SyncInterpretation[],
): SyncBelief[] {
  const beliefs = [
    deriveSyncActiveBelief(snapshot),
    deriveRecurringMoneyBelief(snapshot, signals),
    deriveMustangBelief(snapshot, signals, resolutions),
    deriveUberLoopBelief(snapshot, signals, resolutions),
    deriveVendingArchivedBelief(snapshot, resolutions),
    deriveSubscriptionAmexBelief(snapshot),
    deriveInterpretationBackedBelief(snapshot, interpretations),
  ].filter((belief): belief is SyncBelief => Boolean(belief));

  const statusPriority: Record<SyncBelief["status"], number> = {
    retired: 4,
    active: 3,
    watching: 2,
    candidate: 1,
  };
  const confidencePriority: Record<SyncBelief["confidence"], number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const deduped = new Map<string, SyncBelief>();
  for (const belief of beliefs) {
    const existing = deduped.get(belief.statement);
    if (!existing) {
      deduped.set(belief.statement, belief);
      continue;
    }

    const existingStatus = statusPriority[existing.status];
    const nextStatus = statusPriority[belief.status];
    if (nextStatus > existingStatus) {
      deduped.set(belief.statement, belief);
      continue;
    }
    if (nextStatus < existingStatus) continue;

    const existingConfidence = confidencePriority[existing.confidence];
    const nextConfidence = confidencePriority[belief.confidence];
    if (nextConfidence > existingConfidence) {
      deduped.set(belief.statement, belief);
      continue;
    }

    if (
      nextConfidence === existingConfidence &&
      belief.evidenceNodeIds.length > existing.evidenceNodeIds.length
    ) {
      deduped.set(belief.statement, belief);
    }
  }

  return [...deduped.values()].sort((left, right) => left.id.localeCompare(right.id));
}
