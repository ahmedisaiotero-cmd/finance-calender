import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { ensureUserAndWorkspace } from "@/lib/db/workspace";
import { isDatabaseConfigured } from "@/lib/prisma";
import {
  EMPTY_USER_PROFILE,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";
import {
  loadRemoteProfile,
  saveRemoteProfile,
} from "@/lib/sync-profile/remote-profile";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ profile: null, source: "anonymous" });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      profile: null,
      source: "local-only",
      userId: user.id,
    });
  }

  try {
    await ensureUserAndWorkspace(user);
    const profile = await loadRemoteProfile(user.id);
    return NextResponse.json({
      profile,
      source: "database",
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("GET /api/profile", error);
    return NextResponse.json({ profile: null, source: "error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SyncUserProfile;
  try {
    body = { ...EMPTY_USER_PROFILE, ...(await request.json()) };
  } catch {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      profile: body,
      source: "local-only",
      userId: user.id,
    });
  }

  try {
    // Profile ownership is always the authenticated session id — never body.userId.
    await ensureUserAndWorkspace(user);
    const saved = await saveRemoteProfile(user.id, body);
    return NextResponse.json({
      profile: saved,
      source: "database",
      userId: user.id,
    });
  } catch (error) {
    console.error("PUT /api/profile", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
