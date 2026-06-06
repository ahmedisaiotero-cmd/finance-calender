import { toDateKey } from "@/lib/calendar-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TimelineEvent, TimelineEventDetail } from "@/lib/timeline-events";

export type SupabaseTimelineItemRow = {
  id: string;
  title: string;
  category: string;
  date: string;
  status: string;
  detail: TimelineEventDetail | null;
  created_at?: string;
  workspace_id?: string | null;
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

export function supabaseTimelineRowToEvent(
  row: SupabaseTimelineItemRow,
): TimelineEvent {
  const detail =
    row.detail && typeof row.detail === "object" && !Array.isArray(row.detail)
      ? row.detail
      : undefined;

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
    .select("id, title, category, date, status, detail, created_at, workspace_id")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase timeline_items query failed:", error.message);
    return [];
  }

  return (data as SupabaseTimelineItemRow[] | null)?.map(supabaseTimelineRowToEvent) ?? [];
}
