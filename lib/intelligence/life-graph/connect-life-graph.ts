import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import type {
  LifeGraphEdge,
  LifeGraphEdgeKind,
  LifeGraphNode,
  NormalizedSyncObject,
  NormalizedSyncObjectKind,
} from "@/lib/intelligence/life-graph/types";

const MEMORY_TO_TARGET_EDGE: Partial<
  Record<NormalizedSyncObjectKind, LifeGraphEdgeKind>
> = {
  event: "mentions",
  financial_signal: "belongs_to",
  health_signal: "belongs_to",
  relationship_signal: "belongs_to",
  goal: "belongs_to",
};

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function nodeIdForNormalizedObject(objectId: string): string {
  return `node_${objectId}`;
}

export function nodeIdForConsequence(consequenceId: string): string {
  return `node_consequence_${consequenceId}`;
}

export function createEdgeId(
  kind: LifeGraphEdgeKind,
  fromNodeId: string,
  toNodeId: string,
) {
  return `edge_${kind}_${stableHash(`${fromNodeId}:${toNodeId}`)}`;
}

function buildMemoryToTargetReason(
  edgeKind: LifeGraphEdgeKind,
  memory: NormalizedSyncObject,
  target: NormalizedSyncObject,
): string {
  if (edgeKind === "mentions") {
    return "The memory mentions a timed or dated event from the same capture.";
  }

  if (edgeKind === "belongs_to") {
    return `The memory belongs to the ${target.label} life area from capture destinations.`;
  }

  return `The memory connects to ${target.label} from the same capture.`;
}

function groupObjectsByMemoryId(objects: NormalizedSyncObject[]) {
  const groups = new Map<string, NormalizedSyncObject[]>();

  for (const object of objects) {
    if (!object.memoryId) continue;
    const group = groups.get(object.memoryId) ?? [];
    group.push(object);
    groups.set(object.memoryId, group);
  }

  return groups;
}

export function connectNormalizedObjects(
  objects: NormalizedSyncObject[],
  createdAt: string,
): LifeGraphEdge[] {
  const edges: LifeGraphEdge[] = [];

  for (const group of groupObjectsByMemoryId(objects).values()) {
    const memoryObject = group.find((object) => object.kind === "memory");
    if (!memoryObject) continue;

    const fromNodeId = nodeIdForNormalizedObject(memoryObject.id);

    for (const target of group) {
      if (target.kind === "memory") continue;

      const edgeKind = MEMORY_TO_TARGET_EDGE[target.kind];
      if (!edgeKind) continue;

      const toNodeId = nodeIdForNormalizedObject(target.id);
      edges.push({
        id: createEdgeId(edgeKind, fromNodeId, toNodeId),
        kind: edgeKind,
        fromNodeId,
        toNodeId,
        confidence: target.confidence,
        evidenceMemoryIds: memoryObject.memoryId ? [memoryObject.memoryId] : [],
        reason: buildMemoryToTargetReason(edgeKind, memoryObject, target),
        createdAt,
      });
    }
  }

  return edges.sort((left, right) => left.id.localeCompare(right.id));
}

export function connectConsequences(
  consequences: SyncConsequence[],
  memoryNodeByMemoryId: Map<string, string>,
  createdAt: string,
): LifeGraphEdge[] {
  const edges: LifeGraphEdge[] = [];

  for (const consequence of consequences) {
    if (!consequence.sourceMemoryId) continue;

    const memoryNodeId = memoryNodeByMemoryId.get(consequence.sourceMemoryId);
    if (!memoryNodeId) continue;

    const fromNodeId = nodeIdForConsequence(consequence.id);
    edges.push({
      id: createEdgeId("consequence_of", fromNodeId, memoryNodeId),
      kind: "consequence_of",
      fromNodeId,
      toNodeId: memoryNodeId,
      confidence: "medium",
      evidenceMemoryIds: [consequence.sourceMemoryId],
      reason: "Consequence derived from captured memory evidence.",
      createdAt,
    });
  }

  return edges.sort((left, right) => left.id.localeCompare(right.id));
}

export function buildMemoryNodeLookup(nodes: LifeGraphNode[]) {
  const lookup = new Map<string, string>();

  for (const node of nodes) {
    if (node.kind !== "memory") continue;
    const memoryId = node.evidenceMemoryIds[0];
    if (memoryId) {
      lookup.set(memoryId, node.id);
    }
  }

  return lookup;
}
