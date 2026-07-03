import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import { createObservationId } from "@/lib/intelligence/life-graph/observations";
import type {
  LifeGraphConfidence,
  NormalizedSyncObject,
  NormalizedSyncObjectKind,
  SyncObservation,
  SyncObservationSource,
} from "@/lib/intelligence/life-graph/types";

export type CapturedItemNormalization = {
  observation: SyncObservation;
  objects: NormalizedSyncObject[];
};

const GENERIC_DATE_LABELS = new Set([
  "Upcoming",
  "No date",
  "Needs a timeline",
]);

const DESTINATION_SIGNAL_MAP: Partial<
  Record<SyncDestination, NormalizedSyncObjectKind>
> = {
  Finance: "financial_signal",
  Health: "health_signal",
  Relationships: "relationship_signal",
  Family: "relationship_signal",
  Goals: "goal",
};

function resolveObservationSource(
  item: CapturedSyncItem,
): SyncObservationSource {
  if (item.captureSource === "voice") return "voice_transcript";
  return "manual_text";
}

function resolveRawContent(item: CapturedSyncItem): string {
  return (item.voiceTranscript ?? item.originalPrompt ?? item.prompt).trim();
}

function importanceToConfidence(importance?: string): LifeGraphConfidence {
  if (importance === "high") return "high";
  if (importance === "low") return "low";
  return "medium";
}

function resolveConfidence(item: CapturedSyncItem): LifeGraphConfidence {
  if (item.meaning?.importance) {
    return importanceToConfidence(item.meaning.importance);
  }
  if (item.timeline?.confidenceLabel) {
    return item.timeline.confidenceLabel;
  }
  return "medium";
}

function resolveDateKey(item: CapturedSyncItem): string | null | undefined {
  const timeline = item.timeline;
  if (timeline?.startDate) return timeline.startDate;
  if (timeline?.deadlineDate) return timeline.deadlineDate;
  if (timeline?.endDate) return timeline.endDate;
  return null;
}

function hasEventEvidence(item: CapturedSyncItem): boolean {
  const timeline = item.timeline;
  if (timeline) {
    if (timeline.startDate || timeline.endDate || timeline.deadlineDate) {
      return true;
    }
    if (timeline.isTimed || timeline.kind !== "unknown") {
      return true;
    }
  }

  const dateLabel = item.dateLabel?.trim();
  if (dateLabel && !GENERIC_DATE_LABELS.has(dateLabel)) {
    return true;
  }

  return false;
}

function buildObservationMetadata(
  item: CapturedSyncItem,
): Record<string, unknown> {
  return {
    memoryId: item.id,
    title: item.title,
    prompt: item.prompt,
    originalPrompt: item.originalPrompt,
    normalizationCorrections: item.normalizationCorrections,
    destinations: item.destinations,
    category: item.category,
    dateLabel: item.dateLabel,
    timeLabel: item.timeLabel,
    amount: item.amount,
    frequency: item.frequency,
    moneyType: item.moneyType,
    workAvailability: item.workAvailability,
    timeline: item.timeline,
    meaning: item.meaning,
    understanding: item.understanding,
    protectedTime: item.protectedTime,
    notes: item.notes,
    status: item.status,
    captureSource: item.captureSource,
    voiceTranscript: item.voiceTranscript,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function createNormalizedObjectId(
  kind: NormalizedSyncObjectKind,
  memoryId: string,
  suffix?: string,
) {
  return suffix ? `norm_${kind}_${memoryId}_${suffix}` : `norm_${kind}_${memoryId}`;
}

export function normalizeCapturedItemToObservation(
  item: CapturedSyncItem,
): SyncObservation {
  const source = resolveObservationSource(item);
  const rawContent = resolveRawContent(item);
  const observedAt = item.createdAt;

  return {
    id: createObservationId({
      source,
      observedAt,
      rawContent,
      sourceId: item.id,
    }),
    source,
    observedAt,
    receivedAt: item.createdAt,
    rawContent,
    confidence: resolveConfidence(item),
    sourceId: item.id,
    metadata: buildObservationMetadata(item),
  };
}

function buildMemoryObject(
  item: CapturedSyncItem,
  observationId: string,
): NormalizedSyncObject {
  return {
    id: createNormalizedObjectId("memory", item.id),
    kind: "memory",
    label: item.title,
    summary: item.understanding ?? item.meaning?.summary ?? item.prompt,
    observationId,
    memoryId: item.id,
    dateKey: resolveDateKey(item),
    confidence: resolveConfidence(item),
    attributes: {
      prompt: item.prompt,
      originalPrompt: item.originalPrompt,
      destinations: item.destinations,
      category: item.category,
      importance: item.meaning?.importance,
      meaningLabel: item.meaning?.meaningLabel,
      understanding: item.understanding,
      status: item.status,
      createdAt: item.createdAt,
      dateLabel: item.dateLabel,
      timeLabel: item.timeLabel,
    },
  };
}

function buildEventObject(
  item: CapturedSyncItem,
  observationId: string,
): NormalizedSyncObject {
  const timeline = item.timeline;

  return {
    id: createNormalizedObjectId("event", item.id),
    kind: "event",
    label: item.title,
    summary: timeline?.label ?? item.dateLabel,
    observationId,
    memoryId: item.id,
    dateKey: resolveDateKey(item),
    confidence: timeline?.confidenceLabel ?? resolveConfidence(item),
    attributes: {
      dateLabel: item.dateLabel,
      timeLabel: item.timeLabel,
      timelineRole: timeline?.timelineRole,
      startDate: timeline?.startDate,
      endDate: timeline?.endDate,
      startTime: timeline?.startTime,
      endTime: timeline?.endTime,
      deadlineDate: timeline?.deadlineDate,
      deadlineTime: timeline?.deadlineTime,
      isTimed: timeline?.isTimed,
      tense: timeline?.tense,
      kind: timeline?.kind,
    },
  };
}

function buildDestinationSignalObject(
  item: CapturedSyncItem,
  observationId: string,
  destination: SyncDestination,
  kind: NormalizedSyncObjectKind,
): NormalizedSyncObject {
  return {
    id: createNormalizedObjectId(
      kind,
      item.id,
      destination.toLowerCase(),
    ),
    kind,
    label: destination,
    summary: item.meaning?.summary,
    observationId,
    memoryId: item.id,
    dateKey: resolveDateKey(item),
    confidence: resolveConfidence(item),
    attributes: {
      destination,
      importance: item.meaning?.importance,
      meaningLabel: item.meaning?.meaningLabel,
    },
  };
}

function buildNormalizedObjects(
  item: CapturedSyncItem,
  observationId: string,
): NormalizedSyncObject[] {
  const objects: NormalizedSyncObject[] = [
    buildMemoryObject(item, observationId),
  ];

  if (hasEventEvidence(item)) {
    objects.push(buildEventObject(item, observationId));
  }

  const seenKinds = new Set<NormalizedSyncObjectKind>();
  for (const destination of item.destinations) {
    const kind = DESTINATION_SIGNAL_MAP[destination];
    if (!kind || seenKinds.has(kind)) continue;
    seenKinds.add(kind);
    objects.push(
      buildDestinationSignalObject(item, observationId, destination, kind),
    );
  }

  return objects;
}

export function normalizeCapturedItem(
  item: CapturedSyncItem,
): CapturedItemNormalization {
  const observation = normalizeCapturedItemToObservation(item);
  const objects = buildNormalizedObjects(item, observation.id);
  return { observation, objects };
}

export function normalizeCapturedItems(
  items: CapturedSyncItem[],
): CapturedItemNormalization[] {
  return items.map(normalizeCapturedItem);
}
