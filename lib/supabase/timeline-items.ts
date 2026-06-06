import { toDateKey } from "@/lib/calendar-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

function monthDateBounds(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

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

export async function getTimelineItemsFromSupabase(
  year: number,
  month: number,
): Promise<TimelineEvent[]> {
  const supabase = createSupabaseServerClient();
  const { start, end } = monthDateBounds(year, month);

  const { data, error } = await supabase
    .from("timeline_items")
    .select("id, title, category, date, status, detail, created_at")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      "Supabase timeline_items query failed:",
      error.code,
      error.message,
    );
    throw error;
  }

  return (data as SupabaseTimelineItemRow[] | null)?.map(supabaseTimelineRowToEvent) ?? [];
}
