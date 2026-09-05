/**
 * Construction, normalization, and de-duplication helpers for activity events.
 *
 * These are pure and side-effect free. The factory is the single safe entry
 * point: it redacts secrets, clamps confidence, and fills conservative
 * defaults so no caller can accidentally persist a raw token or an
 * out-of-range confidence.
 */

import { redactSecrets, sanitizeDetail } from "@/lib/activity/redaction";
import type {
  ActivityEvent,
  ActivityEventKind,
  ActivityEvidence,
} from "@/lib/activity/types";

/**
 * Canonical lifecycle ordering used to break timestamp ties so a `request` is
 * never sorted after its own `result` when they share a timestamp.
 */
export const LIFECYCLE_ORDER: Record<ActivityEventKind, number> = {
  request: 0,
  approval: 1,
  execution: 2,
  import: 3,
  context_access: 4,
  result: 5,
  failure: 6,
};

function clampConfidence(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function sanitizeEvidence(evidence: ActivityEvidence[]): ActivityEvidence[] {
  return evidence.map((item) => ({
    ...item,
    description: redactSecrets(item.description ?? ""),
    sourceRef: item.sourceRef ? redactSecrets(item.sourceRef) : item.sourceRef,
  }));
}

export type ActivityEventInput = Omit<
  ActivityEvent,
  "affectedAreas" | "evidence" | "confidence"
> & {
  affectedAreas?: ActivityEvent["affectedAreas"];
  evidence?: ActivityEvidence[];
  confidence?: number;
};

/**
 * Build a safe {@link ActivityEvent}. Applies redaction to every
 * human-readable field, clamps confidence to [0, 1], and de-duplicates
 * affected areas. This is the only sanctioned way for connectors to mint
 * events.
 */
export function createActivityEvent(input: ActivityEventInput): ActivityEvent {
  return {
    ...input,
    summary: redactSecrets(input.summary ?? ""),
    affectedAreas: Array.from(new Set(input.affectedAreas ?? [])),
    evidence: sanitizeEvidence(input.evidence ?? []),
    confidence: clampConfidence(input.confidence),
    detail: sanitizeDetail(input.detail),
    actor: {
      ...input.actor,
      label: input.actor.label ? redactSecrets(input.actor.label) : input.actor.label,
    },
  };
}

/**
 * Sort events chronologically, breaking ties by lifecycle stage. Returns a new
 * array; the input is not mutated.
 */
export function normalizeActivityEvents(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.timestamp);
    const tb = Date.parse(b.timestamp);
    const aValid = !Number.isNaN(ta);
    const bValid = !Number.isNaN(tb);

    // Events with unparseable timestamps sort last but keep relative order.
    if (aValid && bValid && ta !== tb) return ta - tb;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;

    return LIFECYCLE_ORDER[a.kind] - LIFECYCLE_ORDER[b.kind];
  });
}

function dedupeKey(event: ActivityEvent): string {
  return [
    event.kind,
    event.correlationId ?? "",
    event.source.service,
    event.timestamp,
    event.summary,
  ].join("|");
}

/**
 * Remove duplicate events. Two events collide when they share an `id`, or when
 * they share kind + correlationId + source + timestamp + summary (the shape a
 * flaky connector produces when it re-delivers the same event). The first
 * occurrence wins so provenance is preserved.
 */
export function dedupeActivityEvents(events: ActivityEvent[]): ActivityEvent[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const out: ActivityEvent[] = [];

  for (const event of events) {
    if (event.id && seenIds.has(event.id)) continue;
    const key = dedupeKey(event);
    if (seenKeys.has(key)) continue;

    if (event.id) seenIds.add(event.id);
    seenKeys.add(key);
    out.push(event);
  }

  return out;
}
