import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import {
  mergeOnboardingProfile,
  sanitizeSyncUserProfile,
} from "@/lib/sync-profile/complete-onboarding";
import {
  loadRemoteProfile,
  saveRemoteProfile,
} from "@/lib/sync-profile/remote-profile";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";

export type ProfileHandlerDeps = {
  loadIdentity: () => ReturnType<typeof loadRequestIdentity>;
  loadProfile: (userId: string) => Promise<SyncUserProfile | null>;
  saveProfile: (userId: string, profile: SyncUserProfile) => Promise<SyncUserProfile>;
};

const defaultDeps: ProfileHandlerDeps = {
  loadIdentity: loadRequestIdentity,
  loadProfile: loadRemoteProfile,
  saveProfile: saveRemoteProfile,
};

export async function handleProfileGet(
  deps: Partial<ProfileHandlerDeps> = {},
): Promise<NextResponse> {
  const { loadIdentity, loadProfile } = {
    ...defaultDeps,
    ...deps,
  };

  const loaded = await loadIdentity();
  if (!loaded.ok) return loaded.response;

  try {
    const profile = await loadProfile(loaded.identity.user.id);
    return NextResponse.json({
      profile,
      source: "database",
    });
  } catch {
    return NextResponse.json({ profile: null, source: "error" }, { status: 500 });
  }
}

export async function handleProfilePut(
  request: Request,
  deps: Partial<ProfileHandlerDeps> = {},
): Promise<NextResponse> {
  const { loadIdentity, loadProfile, saveProfile } = {
    ...defaultDeps,
    ...deps,
  };

  const loaded = await loadIdentity();
  if (!loaded.ok) return loaded.response;

  const userId = loaded.identity.user.id;

  let incoming: unknown;
  try {
    incoming = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  try {
    const sanitized = sanitizeSyncUserProfile(incoming);
    const existing = await loadProfile(userId);
    const merged = mergeOnboardingProfile(existing, sanitized);
    const saved = await saveProfile(userId, merged);

    return NextResponse.json({
      profile: saved,
      source: "database",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save your profile. Please try again." },
      { status: 500 },
    );
  }
}
