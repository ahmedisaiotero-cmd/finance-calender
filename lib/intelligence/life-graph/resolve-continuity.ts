import type {
  ContinuityResolution,
  ContinuityResolutionStatus,
  ContinuitySignal,
  LifeGraphConfidence,
  LifeGraphNode,
  LifeGraphSnapshot,
} from "@/lib/intelligence/life-graph/types";

const COMPLETED_PATTERNS = [
  /\bfinally\s+cancell?ed\b/i,
  /\bfinished\s+setting\s+up\b/i,
  /\b(?:i'?m|i am)\s+done\s+with\s+that\s+task\b/i,
];

const NO_LONGER_RELEVANT_PATTERNS = [
  /\bdoes\s+not\s+matter\s+anymore\b/i,
  /\bdo\s+not\s+care\s+about\b/i,
  /\bno\s+longer\s+relevant\b/i,
];

const ARCHIVED_PATTERNS = [
  /\b(?:i'?m|i am)\s+done\s+with\s+the\b/i,
  /\bmoving\s+on\s+from\b/i,
  /\bleaving\s+behind\b/i,
  /\bdone\s+with\s+the\s+vending\b/i,
];

const CONTRADICTED_PATTERNS = [
  /\bactually\s+i\s+do\s+not\s+want\b/i,
  /\bchanged\s+my\s+mind\s+about\b/i,
  /\bthat\s+was\s+wrong\b/i,
];

const ACTIVE_WORK_PATTERNS = [
  /\bworked\s+on\s+sync\s+again\b/i,
  /\bmade\s+progress\s+on\s+sync\b/i,
  /\bworked\s+on\s+.+\s+again\s+this\s+week\b/i,
];

const THEME_PATTERNS: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /\bmustang\b/i, theme: "mustang" },
  { pattern: /\bvending\s+business\b/i, theme: "vending business" },
  { pattern: /\bvending\s+idea\b/i, theme: "vending business" },
];

const STATUS_PRIORITY: Record<ContinuityResolutionStatus, number> = {
  contradicted: 8,
  completed: 7,
  no_longer_relevant: 6,
  archived: 5,
  historical_context: 4,
  resurfacing: 3,
  stalled: 2,
  active: 1,
};

const TERMINAL_STATUSES = new Set<ContinuityResolutionStatus>([
  "completed",
  "no_longer_relevant",
  "archived",
  "contradicted",
  "historical_context",
]);

type PendingResolution = Omit<ContinuityResolution, "id"> & {
  subjectKey?: string;
};

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

function memoryNodes(snapshot: LifeGraphSnapshot): LifeGraphNode[] {
  return snapshot.nodes.filter((node) => node.kind === "memory");
}

function observationText(
  snapshot: LifeGraphSnapshot,
  observationId: string,
): string {
  return (
    snapshot.observations.find((observation) => observation.id === observationId)
      ?.rawContent ?? ""
  );
}

function memoryText(node: LifeGraphNode, snapshot: LifeGraphSnapshot): string {
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

function matchesAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function extractTheme(text: string): string | null {
  for (const entry of THEME_PATTERNS) {
    if (entry.pattern.test(text)) {
      return entry.theme;
    }
  }
  return null;
}

function extractSubjectKey(text: string): string | null {
  if (/\b(?:cancell?ing|cancel)\s+uber\b/i.test(text) || /\buber\b/i.test(text)) {
    return "uber_cancellation";
  }

  const theme = extractTheme(text);
  if (theme) return `theme:${theme}`;

  if (/\bworked\s+on\s+sync\b/i.test(text) || /\bmade\s+progress\s+on\s+sync\b/i.test(text)) {
    return "sync_work";
  }

  return null;
}

function confidenceForEvidence(
  explicit: boolean,
  evidenceCount: number,
): LifeGraphConfidence {
  if (explicit && evidenceCount >= 2) return "high";
  if (explicit) return "medium";
  return "low";
}

function createResolutionId(
  status: ContinuityResolutionStatus,
  targetNodeId: string,
  evidenceNodeIds: string[],
) {
  const identity = [status, targetNodeId, ...uniqueSorted(evidenceNodeIds)].join("|");
  return `resolution_${status}_${stableHash(identity)}`;
}

function finalizeResolution(
  pending: PendingResolution,
): ContinuityResolution {
  const evidenceNodeIds = uniqueSorted(pending.evidenceNodeIds);
  return {
    id: createResolutionId(
      pending.status,
      pending.targetNodeId,
      evidenceNodeIds,
    ),
    targetNodeId: pending.targetNodeId,
    status: pending.status,
    reason: pending.reason,
    confidence: pending.confidence,
    evidenceNodeIds,
    resolvedAt: pending.resolvedAt,
  };
}

function upsertResolution(
  map: Map<string, PendingResolution>,
  pending: PendingResolution,
) {
  const existing = map.get(pending.targetNodeId);
  if (
    !existing ||
    STATUS_PRIORITY[pending.status] > STATUS_PRIORITY[existing.status]
  ) {
    map.set(pending.targetNodeId, pending);
  }
}

function reasonForCompleted(text: string) {
  if (/\buber\b/i.test(text)) return "Uber cancellation was explicitly completed.";
  if (/\bsubscriptions\s+on\s+my\s+amex\b/i.test(text)) {
    return "Setting up subscriptions on Amex was explicitly finished.";
  }
  return "The task was explicitly marked complete.";
}

function reasonForArchived(text: string) {
  if (/\bvending\b/i.test(text)) {
    return "The vending idea was explicitly left behind.";
  }
  return "A larger idea or project was explicitly archived.";
}

function reasonForNoLongerRelevant(text: string) {
  if (/\bmustang\b/i.test(text)) {
    return "The Mustang goal was explicitly dismissed.";
  }
  return "The goal was explicitly marked as no longer relevant.";
}

function reasonForContradicted(text: string) {
  if (/\bmustang\b/i.test(text)) {
    return "The Mustang goal was explicitly contradicted.";
  }
  return "Earlier intent was explicitly contradicted.";
}

function detectExplicitMemoryResolutions(
  snapshot: LifeGraphSnapshot,
  resolvedAt: string,
): PendingResolution[] {
  const resolutions: PendingResolution[] = [];

  for (const node of memoryNodes(snapshot)) {
    const text = memoryText(node, snapshot);
    const subjectKey = extractSubjectKey(text) ?? node.id;

    if (matchesAnyPattern(text, CONTRADICTED_PATTERNS)) {
      resolutions.push({
        targetNodeId: node.id,
        status: "contradicted",
        reason: reasonForContradicted(text),
        confidence: confidenceForEvidence(true, 1),
        evidenceNodeIds: [node.id],
        resolvedAt,
        subjectKey,
      });
      continue;
    }

    if (matchesAnyPattern(text, COMPLETED_PATTERNS)) {
      resolutions.push({
        targetNodeId: node.id,
        status: "completed",
        reason: reasonForCompleted(text),
        confidence: confidenceForEvidence(true, 1),
        evidenceNodeIds: [node.id],
        resolvedAt,
        subjectKey,
      });
      continue;
    }

    if (matchesAnyPattern(text, NO_LONGER_RELEVANT_PATTERNS)) {
      resolutions.push({
        targetNodeId: node.id,
        status: "no_longer_relevant",
        reason: reasonForNoLongerRelevant(text),
        confidence: confidenceForEvidence(true, 1),
        evidenceNodeIds: [node.id],
        resolvedAt,
        subjectKey,
      });
      continue;
    }

    if (matchesAnyPattern(text, ARCHIVED_PATTERNS)) {
      resolutions.push({
        targetNodeId: node.id,
        status: "archived",
        reason: reasonForArchived(text),
        confidence: confidenceForEvidence(true, 1),
        evidenceNodeIds: [node.id],
        resolvedAt,
        subjectKey,
      });
    }
  }

  return resolutions;
}

function detectHistoricalContextResolutions(
  snapshot: LifeGraphSnapshot,
  resolvedAt: string,
  existing: Map<string, PendingResolution>,
): PendingResolution[] {
  const resolutions: PendingResolution[] = [];
  const memories = memoryNodes(snapshot);

  const archivedNodes = memories.filter((node) => {
    const text = memoryText(node, snapshot);
    return matchesAnyPattern(text, ARCHIVED_PATTERNS);
  });

  for (const archivedNode of archivedNodes) {
    const archiveTheme = extractTheme(memoryText(archivedNode, snapshot));
    if (!archiveTheme) continue;

    const related = memories.filter((node) => {
      if (node.id === archivedNode.id) return false;
      const text = memoryText(node, snapshot);
      return extractTheme(text) === archiveTheme;
    });

    if (related.length === 0) continue;

    const sortedRelated = [...related].sort((left, right) =>
      memoryCreatedAt(left).localeCompare(memoryCreatedAt(right)),
    );
    const oldest = sortedRelated[0];
    if (!oldest) continue;

    const evidenceNodeIds = uniqueSorted([
      oldest.id,
      archivedNode.id,
      ...related.map((node) => node.id),
    ]);

    resolutions.push({
      targetNodeId: oldest.id,
      status: "historical_context",
      reason: `Earlier ${archiveTheme} evidence remains, but a newer memory explicitly archived it.`,
      confidence: confidenceForEvidence(true, evidenceNodeIds.length),
      evidenceNodeIds,
      resolvedAt,
      subjectKey: `theme:${archiveTheme}`,
    });

    for (const node of related) {
      if (node.id === oldest.id) continue;
      resolutions.push({
        targetNodeId: node.id,
        status: "historical_context",
        reason: `This ${archiveTheme} memory is now historical context after a newer archive.`,
        confidence: confidenceForEvidence(true, evidenceNodeIds.length),
        evidenceNodeIds,
        resolvedAt,
        subjectKey: `theme:${archiveTheme}`,
      });
    }
  }

  return resolutions.filter((resolution) => {
    const existingResolution = existing.get(resolution.targetNodeId);
    return existingResolution?.status !== "archived";
  });
}

function subjectHasTerminalResolution(
  subjectKey: string | undefined,
  resolutions: Map<string, PendingResolution>,
) {
  if (!subjectKey) return false;

  for (const resolution of resolutions.values()) {
    if (
      resolution.subjectKey === subjectKey &&
      TERMINAL_STATUSES.has(resolution.status)
    ) {
      return true;
    }
  }

  return false;
}

function mostRecentNodeId(nodeIds: string[], snapshot: LifeGraphSnapshot) {
  const nodes = nodeIds
    .map((nodeId) => snapshot.nodes.find((node) => node.id === nodeId))
    .filter((node): node is LifeGraphNode => Boolean(node));

  nodes.sort((left, right) =>
    memoryCreatedAt(right).localeCompare(memoryCreatedAt(left)),
  );

  return nodes[0]?.id ?? nodeIds[0];
}

function detectActiveWorkResolutions(
  snapshot: LifeGraphSnapshot,
  resolvedAt: string,
): PendingResolution[] {
  const resolutions: PendingResolution[] = [];

  for (const node of memoryNodes(snapshot)) {
    const text = memoryText(node, snapshot);
    if (!matchesAnyPattern(text, ACTIVE_WORK_PATTERNS)) continue;

    resolutions.push({
      targetNodeId: node.id,
      status: "active",
      reason: "Recent project work was explicitly described as continuing.",
      confidence: confidenceForEvidence(true, 1),
      evidenceNodeIds: [node.id],
      resolvedAt,
      subjectKey: extractSubjectKey(text) ?? "sync_work",
    });
  }

  return resolutions;
}

function detectSignalResolutions(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  resolvedAt: string,
  existing: Map<string, PendingResolution>,
): PendingResolution[] {
  const resolutions: PendingResolution[] = [];

  for (const signal of signals) {
    if (signal.kind === "delayed_decision" || signal.kind === "unfinished_loop") {
      const targetNodeId = signal.nodeIds[0];
      if (!targetNodeId) continue;

      const node = snapshot.nodes.find((entry) => entry.id === targetNodeId);
      const subjectKey = node
        ? extractSubjectKey(memoryText(node, snapshot)) ?? targetNodeId
        : targetNodeId;

      if (subjectHasTerminalResolution(subjectKey, existing)) continue;

      resolutions.push({
        targetNodeId,
        status: "stalled",
        reason:
          signal.kind === "delayed_decision"
            ? "A decision keeps getting delayed without completion evidence."
            : "An unresolved loop remains open without completion evidence.",
        confidence: signal.confidence,
        evidenceNodeIds: signal.nodeIds,
        resolvedAt,
        subjectKey,
      });
      continue;
    }

    if (signal.kind === "resurfaced_goal") {
      const targetNodeId = mostRecentNodeId(signal.nodeIds, snapshot);
      if (!targetNodeId) continue;

      const subjectKey = `theme:${signal.summary.toLowerCase().includes("mustang") ? "mustang" : signal.id}`;
      if (subjectHasTerminalResolution(subjectKey, existing)) continue;

      resolutions.push({
        targetNodeId,
        status: "resurfacing",
        reason: "A goal resurfaced across more than one memory.",
        confidence: signal.confidence,
        evidenceNodeIds: signal.nodeIds,
        resolvedAt,
        subjectKey,
      });
      continue;
    }

    if (signal.kind === "recurring_theme") {
      const targetNodeId = mostRecentNodeId(signal.nodeIds, snapshot);
      if (!targetNodeId) continue;

      resolutions.push({
        targetNodeId,
        status: "active",
        reason: "A life theme has recent repeated evidence.",
        confidence: signal.confidence,
        evidenceNodeIds: signal.nodeIds,
        resolvedAt,
        subjectKey: signal.id,
      });
    }
  }

  return resolutions;
}

export type ResolveContinuityOptions = {
  resolvedAt?: string;
};

export function resolveContinuity(
  snapshot: LifeGraphSnapshot,
  signals: ContinuitySignal[],
  options: ResolveContinuityOptions = {},
): ContinuityResolution[] {
  const resolvedAt = options.resolvedAt ?? snapshot.generatedAt;
  const resolutionMap = new Map<string, PendingResolution>();

  for (const pending of detectExplicitMemoryResolutions(snapshot, resolvedAt)) {
    upsertResolution(resolutionMap, pending);
  }

  for (const pending of detectHistoricalContextResolutions(
    snapshot,
    resolvedAt,
    resolutionMap,
  )) {
    upsertResolution(resolutionMap, pending);
  }

  for (const pending of detectActiveWorkResolutions(snapshot, resolvedAt)) {
    upsertResolution(resolutionMap, pending);
  }

  for (const pending of detectSignalResolutions(
    snapshot,
    signals,
    resolvedAt,
    resolutionMap,
  )) {
    upsertResolution(resolutionMap, pending);
  }

  return [...resolutionMap.values()]
    .map(finalizeResolution)
    .sort((left, right) => left.id.localeCompare(right.id));
}
