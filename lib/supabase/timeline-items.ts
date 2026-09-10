import { toDateKey } from "@/lib/calendar-utils";
import type { TimelineEvent, TimelineEventDetail } from "@/lib/timeline-events";

export type SupabaseTimelineItemRow = {
  id: string;
  title: string;
  category: string;
  date: string;
  status: string;
  detail: (TimelineEventDetail & { duration?: string }) | null;
  created_at?: string;
};

const VALID_CATEGORIES = new Set([
  "money",
  "health",
  "career",
  "personal",
  "relationships",
]);

function normalizeStatus(status: string) {
  return status.toLowerCase();
}

function parseDurationMinutes(
  detail?: TimelineEventDetail & { duration?: string },
) {
  if (detail?.durationMinutes != null) return detail.durationMinutes;
  if (!detail?.duration) return undefined;
  const match = String(detail.duration).match(/(\d+)\s*min/i);
  return match ? Number(match[1]) : undefined;
}

function normalizeDetail(
  raw: SupabaseTimelineItemRow["detail"],
): TimelineEventDetail | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const durationMinutes = parseDurationMinutes(raw);
  return {
    ...raw,
    durationMinutes,
    segment:
      raw.segment ??
      (raw.remaining != null
        ? `${raw.remaining}g of protein remaining today`
        : undefined),
  };
}

export function supabaseTimelineRowToEvent(
  row: SupabaseTimelineItemRow,
): TimelineEvent {
  const detail = normalizeDetail(row.detail);

  const lifeCategory = VALID_CATEGORIES.has(row.category)
    ? (row.category as TimelineEvent["lifeCategory"])
    : "personal";

  const dateKey =
    row.date.length >= 10 ? row.date.slice(0, 10) : toDateKey(new Date(row.date));

  return {
    id: row.id,
    title: row.title,
    date: dateKey,
    lifeCategory,
    category: row.category,
    source: "supabase",
    status: normalizeStatus(row.status),
    amount: detail?.amount,
    durationMinutes: detail?.durationMinutes,
    detail,
  };
}

/**
 * Unscoped month-range reads are disabled. `/api/timeline` uses Prisma
 * workspace scope. Callers must not query `timeline_items` until the table
 * has an owner field and RLS.
 */
export async function getTimelineItemsFromSupabase(
  _year: number,
  _month: number,
): Promise<TimelineEvent[]> {
  throw new Error(
    "Unscoped Supabase timeline_items reads are disabled until owner + RLS exist.",
  );
}
