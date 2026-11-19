import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { exportUserData } from "@/lib/db/export-user-data";

export async function GET() {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  const payload = await exportUserData(loaded.identity.user.id);
  if (!payload) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="sync-export.json"`,
    },
  });
}
