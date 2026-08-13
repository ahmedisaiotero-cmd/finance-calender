import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { getCalendarEventsForMonthFromDb } from "@/lib/db/calendar";

export async function GET(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
      return NextResponse.json(
        { error: "Valid year and month (0-11) are required" },
        { status: 400 },
      );
    }

    const events = await getCalendarEventsForMonthFromDb(
      year,
      month,
      loaded.identity.workspace.id,
    );
    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET /api/calendar", error);
    return NextResponse.json(
      { error: "Failed to load calendar events" },
      { status: 500 },
    );
  }
}
