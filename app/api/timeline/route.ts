import { NextResponse } from "next/server";

import { getTimelineForMonthFromDb } from "@/lib/db/timeline";
import { isDatabaseConfigured } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTimelineItemsFromSupabase } from "@/lib/supabase/timeline-items";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 0 ||
      month > 11
    ) {
      return NextResponse.json(
        { error: "Valid year and month (0-11) are required" },
        { status: 400 },
      );
    }

    if (isSupabaseConfigured()) {
      const events = await getTimelineItemsFromSupabase(year, month);
      return NextResponse.json({ events, source: "supabase" });
    }

    if (isDatabaseConfigured()) {
      const events = await getTimelineForMonthFromDb(year, month);
      return NextResponse.json({ events, source: "prisma" });
    }

    return NextResponse.json({ events: [], source: "none" });
  } catch (error) {
    console.error("GET /api/timeline", error);
    return NextResponse.json(
      { error: "Failed to load timeline" },
      { status: 500 },
    );
  }
}
