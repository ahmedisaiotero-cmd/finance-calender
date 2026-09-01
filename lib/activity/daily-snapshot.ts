/**
 * Pure activity → daily snapshot pipeline.
 *
 * Turns a raw stream of {@link ActivityEvent}s (from manual capture today, and
 * from permissioned connectors later) into a calm daily snapshot answering:
 *   - what happened
 *   - what changed
 *   - what was affected
 *   - what is unresolved
 *   - what to consider next
 *
 * This module is deliberately pure: no I/O, no clock, no network. It groups the
 * request → approval → execution → result/failure lifecycle by correlation id,
 * reconciles conflicting or incomplete evidence, and produces trust-preserving
 * output. It reuses shared Sync concepts (life areas, verification levels) and
 * does not rank Today priorities — that remains the Decision Engine's job.
 */

import { dedupeActivityEvents, normalizeActivityEvents } from "@/lib/activity/activity-event";
import type {
  ActivityEvent,
  ActivityEventKind,
  Reversibility,
  VerificationLevel,
} from "@/lib/activity/types";
import type { LifeAreaId } from "@/lib/user-life-areas";

export type SnapshotDateRange = {
  /** ISO inclusive start. */
  start: string;
  /** ISO exclusive end. */
  end: string;
  /** 'YYYY-MM-DD' label for the snapshot. */
  dateKey: string;
};

export type SnapshotHappening = {
  correlationId: string | null;
  eventId: string;
  summary: string;
  kind: ActivityEventKind;
  areas: LifeAreaId[];
  verification: VerificationLevel;
  confidence: number;
  reversibility: Reversibility;
  /** True when the action succeeded; false for failures and read-only access. */
  succeeded: boolean;
  /** True for context access — something Sync read, not a state change. */
  readOnly: boolean;
};

export type SnapshotChange = {
  area: LifeAreaId;
  changeCount: number;
  summaries: string[];
};

export type UnresolvedReason =
  | "awaiting_approval"
  | "approved_not_executed"
  | "executed_no_result"
  | "failed"
  | "permission_revoked"
  | "permission_pending"
  | "incomplete_evidence";

export type UnresolvedItem = {
  correlationId: string | null;
  eventId: string;
  reason: UnresolvedReason;
  summary: string;
  areas: LifeAreaId[];
  reversibility: Reversibility;
  needsUserAttention: boolean;
  /** Set when the reason is a conflict between contradictory events. */
  conflicting?: boolean;
};

export type SuggestedNextStep = {
  id: string;
  text: string;
  relatedCorrelationId: string | null;
  reason: UnresolvedReason;
  priority: number;
};

export type ActivitySnapshot = {
  range: SnapshotDateRange;
  whatHappened: SnapshotHappening[];
  whatChanged: SnapshotChange[];
  whatWasAffected: LifeAreaId[];
  unresolved: UnresolvedItem[];
  suggestedNextSteps: SuggestedNextStep[];
  totalEvents: number;
  consideredEvents: number;
  hiddenCount: number;
};

export type BuildActivitySnapshotOptions = {
  /** 'YYYY-MM-DD'. Keeps only events whose ISO timestamp starts with this key. */
  dateKey?: string;
  /** Explicit ISO window [start, end). Overrides dateKey when both are set. */
  range?: { start: string; end: string };
  /** Confidence below this (and irreversible) is treated as incomplete evidence. */
  lowConfidenceThreshold?: number;
  /** When true, hidden-visibility events are included in user-facing lists. */
  includeHidden?: boolean;
};

const DEFAULT_LOW_CONFIDENCE = 0.4;

type GroupOutcome =
  | "completed"
  | "failed"
  | "denied"
  | "read_only"
  | "executed_no_result"
  | "approved_not_executed"
  | "awaiting_approval"
  | "blocked_permission"
  | "permission_pending";

type ActivityGroup = {
  correlationId: string | null;
  events: ActivityEvent[];
  areas: LifeAreaId[];
};

function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

function resolveRange(
  events: ActivityEvent[],
  options: BuildActivitySnapshotOptions,
): { range: SnapshotDateRange; explicit: boolean } {
  if (options.range) {
    return {
      range: {
        start: options.range.start,
        end: options.range.end,
        dateKey: dateKeyOf(options.range.start),
      },
      explicit: true,
    };
  }

  if (options.dateKey) {
    const start = `${options.dateKey}T00:00:00.000Z`;
    const end = `${options.dateKey}T23:59:59.999Z`;
    return {
      range: { start, end, dateKey: options.dateKey },
      explicit: true,
    };
  }

  // Derive an informational range from the events themselves.
  const times = events
    .map((event) => event.timestamp)
    .filter((value) => !Number.isNaN(Date.parse(value)))
    .sort();
  const start = times[0] ?? "";
  const end = times[times.length - 1] ?? "";
  return {
    range: { start, end, dateKey: start ? dateKeyOf(start) : "" },
    explicit: false,
  };
}

function withinRange(
  event: ActivityEvent,
  range: SnapshotDateRange,
  explicit: boolean,
  dateKey: string | undefined,
): boolean {
  if (!explicit) return true;
  if (dateKey) return dateKeyOf(event.timestamp) === dateKey;

  const t = Date.parse(event.timestamp);
  if (Number.isNaN(t)) return false;
  const start = Date.parse(range.start);
  const end = Date.parse(range.end);
  return t >= start && t <= end;
}

function groupEvents(events: ActivityEvent[]): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>();

  for (const event of events) {
    const key = event.correlationId ?? `solo:${event.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
      for (const area of event.affectedAreas) {
        if (!existing.areas.includes(area)) existing.areas.push(area);
      }
    } else {
      groups.set(key, {
        correlationId: event.correlationId ?? null,
        events: [event],
        areas: [...event.affectedAreas],
      });
    }
  }

  return [...groups.values()];
}

function hasKind(group: ActivityGroup, kind: ActivityEventKind): boolean {
  return group.events.some((event) => event.kind === kind);
}

function lastOfKind(
  group: ActivityGroup,
  kind: ActivityEventKind,
): ActivityEvent | undefined {
  for (let i = group.events.length - 1; i >= 0; i -= 1) {
    if (group.events[i].kind === kind) return group.events[i];
  }
  return undefined;
}

function permissionBlocked(group: ActivityGroup): boolean {
  return group.events.some(
    (event) =>
      event.permission.state === "revoked" || event.permission.state === "expired",
  );
}

function permissionPending(group: ActivityGroup): boolean {
  return group.events.some((event) => event.permission.state === "pending");
}

function approvalDenied(group: ActivityGroup): boolean {
  const approval = lastOfKind(group, "approval");
  if (approval && approval.permission.state === "denied") return true;
  return group.events.some(
    (event) => event.kind === "approval" && event.detail?.decision === "denied",
  );
}

function resolveOutcome(group: ActivityGroup): { outcome: GroupOutcome; conflicting: boolean } {
  const hasResult = hasKind(group, "result");
  const hasFailure = hasKind(group, "failure");
  const hasExecution = hasKind(group, "execution");
  const hasImport = hasKind(group, "import");
  const hasContextAccess = hasKind(group, "context_access");
  const hasApproval = hasKind(group, "approval");
  const hasRequest = hasKind(group, "request");

  // Contradictory terminal states: both a success and a failure recorded.
  if (hasResult && hasFailure) return { outcome: "failed", conflicting: true };

  if (permissionBlocked(group) && !hasResult) {
    return { outcome: "blocked_permission", conflicting: false };
  }
  if (hasFailure) return { outcome: "failed", conflicting: false };
  if (hasResult) return { outcome: "completed", conflicting: false };
  if (hasImport) return { outcome: "completed", conflicting: false };
  if (hasContextAccess && !hasExecution && !hasRequest) {
    return { outcome: "read_only", conflicting: false };
  }
  if (hasExecution) return { outcome: "executed_no_result", conflicting: false };
  if (approvalDenied(group)) return { outcome: "denied", conflicting: false };
  if (hasApproval) return { outcome: "approved_not_executed", conflicting: false };
  if (permissionPending(group)) return { outcome: "permission_pending", conflicting: false };
  if (hasRequest) return { outcome: "awaiting_approval", conflicting: false };

  return { outcome: "read_only", conflicting: false };
}

function representativeEvent(group: ActivityGroup, outcome: GroupOutcome): ActivityEvent {
  const pick =
    outcome === "failed"
      ? lastOfKind(group, "failure") ?? lastOfKind(group, "result")
      : outcome === "completed"
        ? lastOfKind(group, "result") ??
          lastOfKind(group, "import") ??
          lastOfKind(group, "execution")
        : outcome === "read_only"
          ? lastOfKind(group, "context_access")
          : outcome === "executed_no_result"
            ? lastOfKind(group, "execution")
            : outcome === "approved_not_executed"
              ? lastOfKind(group, "approval")
              : outcome === "blocked_permission"
                ? group.events.find(
                    (e) =>
                      e.permission.state === "revoked" ||
                      e.permission.state === "expired",
                  )
                : outcome === "permission_pending"
                  ? group.events.find((e) => e.permission.state === "pending")
                  : lastOfKind(group, "request");

  return pick ?? group.events[group.events.length - 1];
}

const STATE_CHANGING_KINDS: ReadonlySet<ActivityEventKind> = new Set([
  "execution",
  "result",
  "import",
]);

function unresolvedReasonFor(outcome: GroupOutcome): UnresolvedReason | null {
  switch (outcome) {
    case "failed":
      return "failed";
    case "blocked_permission":
      return "permission_revoked";
    case "permission_pending":
      return "permission_pending";
    case "awaiting_approval":
      return "awaiting_approval";
    case "approved_not_executed":
      return "approved_not_executed";
    case "executed_no_result":
      return "executed_no_result";
    default:
      return null;
  }
}

function attentionFor(reason: UnresolvedReason, reversibility: Reversibility): boolean {
  if (reason === "incomplete_evidence") return reversibility === "irreversible";
  return true;
}

function priorityFor(reason: UnresolvedReason, reversibility: Reversibility): number {
  switch (reason) {
    case "failed":
      return reversibility === "irreversible" ? 100 : 80;
    case "permission_revoked":
      return 90;
    case "awaiting_approval":
      return 70;
    case "permission_pending":
      return 65;
    case "incomplete_evidence":
      return reversibility === "irreversible" ? 60 : 30;
    case "approved_not_executed":
      return 50;
    case "executed_no_result":
      return 40;
    default:
      return 10;
  }
}

function nextStepText(item: UnresolvedItem, scope: string | null): string {
  const s = item.summary || "This action";
  switch (item.reason) {
    case "awaiting_approval":
      return `${s} — waiting for your approval.`;
    case "approved_not_executed":
      return `${s} — approved, but not done yet.`;
    case "executed_no_result":
      return `${s} — started, but Sync hasn't confirmed how it finished.`;
    case "failed":
      if (item.conflicting) {
        return `${s} — Sync got conflicting signals. Worth confirming what actually happened.`;
      }
      return item.reversibility === "irreversible"
        ? `${s} — failed and can't be undone automatically.`
        : `${s} — didn't go through. You can try again.`;
    case "permission_revoked":
      return scope
        ? `${s} — needs ${scope} access again to continue.`
        : `${s} — needs access again to continue.`;
    case "permission_pending":
      return `${s} — waiting on permission you haven't granted yet.`;
    case "incomplete_evidence":
      return `${s} — Sync isn't sure this happened. Worth a quick check.`;
    default:
      return s;
  }
}

/**
 * Build a daily snapshot from a stream of activity events.
 *
 * The input is de-duplicated and sorted first, so callers may pass raw,
 * out-of-order, or repeated events (the shape a flaky connector produces).
 */
export function buildActivitySnapshot(
  events: ActivityEvent[],
  options: BuildActivitySnapshotOptions = {},
): ActivitySnapshot {
  const lowConfidence = options.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE;
  const totalEvents = events.length;

  const deduped = dedupeActivityEvents(events);
  const { range, explicit } = resolveRange(deduped, options);

  const inRange = deduped.filter((event) =>
    withinRange(event, range, explicit, options.dateKey),
  );

  const hiddenCount = inRange.filter(
    (event) => event.visibility === "hidden",
  ).length;
  const visible = options.includeHidden
    ? inRange
    : inRange.filter((event) => event.visibility !== "hidden");

  const ordered = normalizeActivityEvents(visible);
  const groups = groupEvents(ordered);

  const whatHappened: SnapshotHappening[] = [];
  const changeByArea = new Map<LifeAreaId, SnapshotChange>();
  const affected = new Set<LifeAreaId>();
  const unresolved: UnresolvedItem[] = [];

  for (const group of groups) {
    for (const area of group.areas) affected.add(area);

    const { outcome, conflicting } = resolveOutcome(group);
    const rep = representativeEvent(group, outcome);

    const isOccurrence =
      outcome === "completed" || outcome === "failed" || outcome === "read_only";

    if (isOccurrence) {
      whatHappened.push({
        correlationId: group.correlationId,
        eventId: rep.id,
        summary: rep.summary,
        kind: rep.kind,
        areas: group.areas,
        verification: rep.verification,
        confidence: rep.confidence,
        reversibility: rep.reversibility,
        succeeded: outcome === "completed",
        readOnly: outcome === "read_only",
      });
    }

    if (outcome === "completed") {
      const changingEvents = group.events.filter((event) =>
        STATE_CHANGING_KINDS.has(event.kind),
      );
      const changeAreas =
        changingEvents.length > 0
          ? Array.from(new Set(changingEvents.flatMap((e) => e.affectedAreas)))
          : group.areas;
      for (const area of changeAreas) {
        const entry = changeByArea.get(area) ?? {
          area,
          changeCount: 0,
          summaries: [],
        };
        entry.changeCount += 1;
        if (!entry.summaries.includes(rep.summary)) entry.summaries.push(rep.summary);
        changeByArea.set(area, entry);
      }
    }

    const reason = unresolvedReasonFor(outcome);
    if (reason) {
      unresolved.push({
        correlationId: group.correlationId,
        eventId: rep.id,
        reason,
        summary: rep.summary,
        areas: group.areas,
        reversibility: rep.reversibility,
        needsUserAttention: attentionFor(reason, rep.reversibility),
        ...(conflicting ? { conflicting: true } : {}),
      });
    }

    // Trust gap: Sync believes it completed but has no confirmation.
    if (
      outcome === "completed" &&
      (rep.verification === "unverified" || rep.confidence < lowConfidence)
    ) {
      unresolved.push({
        correlationId: group.correlationId,
        eventId: rep.id,
        reason: "incomplete_evidence",
        summary: rep.summary,
        areas: group.areas,
        reversibility: rep.reversibility,
        needsUserAttention: attentionFor("incomplete_evidence", rep.reversibility),
      });
    }
  }

  const suggestedNextSteps: SuggestedNextStep[] = unresolved
    .map((item, index) => {
      const scope = scopeForItem(groups, item);
      return {
        id: `${item.correlationId ?? item.eventId}:${item.reason}:${index}`,
        text: nextStepText(item, scope),
        relatedCorrelationId: item.correlationId,
        reason: item.reason,
        priority: priorityFor(item.reason, item.reversibility),
      };
    })
    .sort((a, b) => b.priority - a.priority);

  return {
    range,
    whatHappened,
    whatChanged: [...changeByArea.values()].sort((a, b) =>
      a.area.localeCompare(b.area),
    ),
    whatWasAffected: [...affected].sort((a, b) => a.localeCompare(b)),
    unresolved,
    suggestedNextSteps,
    totalEvents,
    consideredEvents: visible.length,
    hiddenCount,
  };
}

function scopeForItem(
  groups: ActivityGroup[],
  item: UnresolvedItem,
): string | null {
  const group = groups.find(
    (g) =>
      (g.correlationId ?? null) === item.correlationId &&
      g.events.some((e) => e.id === item.eventId),
  );
  if (!group) return null;
  const blocking = group.events.find(
    (e) => e.permission.state === "revoked" || e.permission.state === "expired",
  );
  return blocking?.permission.scope ?? null;
}
