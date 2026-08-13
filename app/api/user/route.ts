import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";

export async function GET() {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  const { user, mode } = loaded.identity;
  return NextResponse.json({
    name: user.name,
    email: user.email,
    source: mode === "demo" ? "demo" : "database",
  });
}
