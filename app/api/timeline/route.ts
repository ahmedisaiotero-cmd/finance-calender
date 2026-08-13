import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { getTimelineForMonthFromDb } from "@/lib/db/timeline";

/**
 * Timeline API is identity-gated and Prisma workspace-scoped.
 * Unscoped Supabase `timeline_items` reads are disabled here until that
 * table has a reliable owner field + RLS.
 */
export async function GET(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

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

    const events = await getTimelineForMonthFromDb(
      year,
      month,
      loaded.identity.workspace.id,
    );
    return NextResponse.json({
      events,
      source: "prisma",
    });
  } catch (error) {
    console.error("GET /api/timeline", error);
    return NextResponse.json(
      { error: "Failed to load timeline" },
      { status: 500 },
    );
  }
}
