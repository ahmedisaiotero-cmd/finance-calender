import { NextResponse } from "next/server";

import { getDefaultWorkspace } from "@/lib/db/workspace";
import { isDatabaseConfigured } from "@/lib/prisma";
import { userProfile } from "@/lib/mock-data";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      name: userProfile.name,
      email: userProfile.email,
      source: "mock",
    });
  }

  try {
    const { user } = await getDefaultWorkspace();
    return NextResponse.json({
      name: user.name ?? userProfile.name,
      email: user.email,
      source: "database",
    });
  } catch (error) {
    console.error("GET /api/user", error);
    return NextResponse.json({
      name: userProfile.name,
      email: userProfile.email,
      source: "mock",
    });
  }
}
