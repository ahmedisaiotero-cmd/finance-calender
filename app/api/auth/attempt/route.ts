import { NextResponse } from "next/server";

import { handleAuthAttemptPost } from "@/lib/api/auth-attempt-handler";
import { PUBLIC_AUTH_ERROR } from "@/lib/auth/app-auth-gate";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseRouteAuthClient } from "@/lib/supabase/route";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: PUBLIC_AUTH_ERROR.config }, { status: 503 });
  }
  const client = await createSupabaseRouteAuthClient();
  return handleAuthAttemptPost(request, {
    createClient: () => client,
  });
}
