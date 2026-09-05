/**
 * Provider-neutral AI activity layer.
 *
 * Foundation for Sync's permissioned AI activity + Passport pivot. Connectors
 * translate provider payloads into {@link ActivityEvent}s via
 * {@link createActivityEvent}; {@link buildActivitySnapshot} turns those into a
 * calm daily snapshot. No OAuth, network, or secrets live here.
 */

export * from "@/lib/activity/types";
export {
  createActivityEvent,
  normalizeActivityEvents,
  dedupeActivityEvents,
  LIFECYCLE_ORDER,
  type ActivityEventInput,
} from "@/lib/activity/activity-event";
export {
  redactSecrets,
  looksLikeSecret,
  sanitizeDetail,
} from "@/lib/activity/redaction";
export {
  buildActivitySnapshot,
  type ActivitySnapshot,
  type BuildActivitySnapshotOptions,
  type SnapshotDateRange,
  type SnapshotHappening,
  type SnapshotChange,
  type UnresolvedItem,
  type UnresolvedReason,
  type SuggestedNextStep,
} from "@/lib/activity/daily-snapshot";
