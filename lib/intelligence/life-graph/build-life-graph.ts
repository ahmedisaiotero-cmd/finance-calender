import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import type {
  LifeGraphNode,
  LifeGraphSnapshot,
  NormalizedSyncObject,
  NormalizedSyncObjectKind,
} from "@/lib/intelligence/life-graph/types";
import type { CapturedItemNormalization } from "@/lib/intelligence/life-graph/normalize-observation";
import {
  buildMemoryNodeLookup,
  connectConsequences,
  connectNormalizedObjects,
  nodeIdForConsequence,
  nodeIdForNormalizedObject,
} from "@/lib/intelligence/life-graph/connect-life-graph";

export type BuildLifeGraphInput = {
  normalizations: CapturedItemNormalization[];
  consequences?: SyncConsequence[];
  referenceDate: string;
  generatedAt?: string;
};

const NORMALIZED_TO_NODE_KIND: Record<
  NormalizedSyncObjectKind,
  LifeGraphNode["kind"]
> = {
  event: "event",
  memory: "memory",
  person: "person",
  goal: "goal",
  decision: "decision",
  project: "project",
  routine: "routine",
  place: "place",
  financial_signal: "financial_signal",
  health_signal: "health_signal",
  relationship_signal: "relationship_signal",
  consequence: "consequence",
};

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function createSnapshotId(
  observationIds: string[],
  consequenceIds: string[],
  referenceDate: string,
) {
  const identity = [
    ...observationIds.sort(),
    ...consequenceIds.sort(),
    referenceDate,
  ].join("|");

  return `snapshot_${stableHash(identity)}`;
}

function normalizedObjectToNode(object: NormalizedSyncObject): LifeGraphNode {
  return {
    id: nodeIdForNormalizedObject(object.id),
    kind: NORMALIZED_TO_NODE_KIND[object.kind],
    label: object.label,
    summary: object.summary,
    confidence: object.confidence,
    observationIds: [object.observationId],
    evidenceMemoryIds: object.memoryId ? [object.memoryId] : [],
    metadata: {
      normalizedObjectId: object.id,
      dateKey: object.dateKey,
      attributes: object.attributes,
    },
  };
}

function consequenceToNode(consequence: SyncConsequence): LifeGraphNode {
  return {
    id: nodeIdForConsequence(consequence.id),
    kind: "consequence",
    label: consequence.surfaceText,
    summary: consequence.surfaceText,
    confidence: "medium",
    observationIds: [],
    evidenceMemoryIds: consequence.sourceMemoryId
      ? [consequence.sourceMemoryId]
      : [],
    metadata: {
      consequenceId: consequence.id,
      kind: consequence.kind,
      dateKey: consequence.dateKey,
      priority: consequence.priority,
      horizon: consequence.horizon,
      area: consequence.area,
      briefEligible: consequence.briefEligible,
    },
  };
}

function sortNodes(nodes: LifeGraphNode[]) {
  return [...nodes].sort((left, right) => left.id.localeCompare(right.id));
}

export function buildLifeGraphSnapshot(
  input: BuildLifeGraphInput,
): LifeGraphSnapshot {
  const observations = input.normalizations.map(
    (normalization) => normalization.observation,
  );
  const normalizedObjects = input.normalizations.flatMap(
    (normalization) => normalization.objects,
  );
  const consequences = input.consequences ?? [];
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const objectNodes = normalizedObjects.map(normalizedObjectToNode);
  const consequenceNodes = consequences.map(consequenceToNode);
  const nodes = sortNodes([...objectNodes, ...consequenceNodes]);

  const memoryNodeByMemoryId = buildMemoryNodeLookup(nodes);
  const edges = [
    ...connectNormalizedObjects(normalizedObjects, generatedAt),
    ...connectConsequences(consequences, memoryNodeByMemoryId, generatedAt),
  ].sort((left, right) => left.id.localeCompare(right.id));

  return {
    id: createSnapshotId(
      observations.map((observation) => observation.id),
      consequences.map((consequence) => consequence.id),
      input.referenceDate,
    ),
    generatedAt,
    referenceDate: input.referenceDate,
    observations,
    normalizedObjects,
    nodes,
    edges,
    interpretations: [],
    continuitySignals: [],
    continuityResolutions: [],
    beliefs: [],
  };
}
