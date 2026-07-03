import type {
  LifeGraphConfidence,
  SyncObservation,
} from "@/lib/intelligence/life-graph/types";

export type ManualTextObservationInput = {
  rawContent: string;
  observedAt: string;
  receivedAt?: string;
  confidence?: LifeGraphConfidence;
  sourceId?: string;
  metadata?: Record<string, unknown>;
};

function normalizeObservationContent(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function createObservationId(input: {
  source: SyncObservation["source"];
  observedAt: string;
  rawContent: string;
  sourceId?: string;
}) {
  const normalized = normalizeObservationContent(input.rawContent).toLowerCase();
  const sourcePart = input.sourceId ? `:${input.sourceId}` : "";
  return `obs_${stableHash(`${input.source}:${input.observedAt}:${normalized}${sourcePart}`)}`;
}

export function createManualTextObservation(
  input: ManualTextObservationInput,
): SyncObservation {
  const rawContent = normalizeObservationContent(input.rawContent);
  const observedAt = input.observedAt;

  return {
    id: createObservationId({
      source: "manual_text",
      observedAt,
      rawContent,
      sourceId: input.sourceId,
    }),
    source: "manual_text",
    observedAt,
    receivedAt: input.receivedAt ?? observedAt,
    rawContent,
    confidence: input.confidence ?? "high",
    sourceId: input.sourceId,
    metadata: input.metadata,
  };
}
