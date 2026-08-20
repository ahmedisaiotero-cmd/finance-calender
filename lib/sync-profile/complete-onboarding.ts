import {
  isOnboardingSubmissionReady,
} from "@/lib/sync-profile/onboarding-reading";
import {
  EMPTY_USER_PROFILE,
  saveUserProfile,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";

export const ONBOARDING_SAVE_ERROR =
  "Could not save your profile. Please try again.";
export const ONBOARDING_NETWORK_ERROR =
  "Could not save your profile. Check your connection and try again.";
export const ONBOARDING_INCOMPLETE_ERROR =
  "Tell Sync your name, what matters most, and how direct to be.";

const PROFILE_KEYS = Object.keys(EMPTY_USER_PROFILE) as (keyof SyncUserProfile)[];
const ARRAY_KEYS = new Set<keyof SyncUserProfile>([
  "priorities",
  "awareness",
  "constraints",
]);

/** Drop client identity fields. Only known profile keys are kept. */
export function sanitizeSyncUserProfile(raw: unknown): SyncUserProfile {
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next: SyncUserProfile = { ...EMPTY_USER_PROFILE };

  for (const key of PROFILE_KEYS) {
    if (!(key in input) || input[key] === undefined) continue;

    if (ARRAY_KEYS.has(key)) {
      const value = input[key];
      (next[key] as string[]) = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      continue;
    }

    (next[key] as SyncUserProfile[typeof key]) = input[
      key
    ] as SyncUserProfile[typeof key];
  }

  next.onboardingComplete = Boolean(next.onboardingComplete);
  next.name = typeof next.name === "string" ? next.name : "";
  next.currentStress =
    typeof next.currentStress === "string" ? next.currentStress : "";
  next.workingToward =
    typeof next.workingToward === "string" ? next.workingToward : "";
  next.comingUp = typeof next.comingUp === "string" ? next.comingUp : "";
  next.constraints = Array.isArray(next.constraints) ? next.constraints : [];
  next.goalTimeframe =
    next.goalTimeframe === "this-month" ||
    next.goalTimeframe === "this-quarter" ||
    next.goalTimeframe === "this-year"
      ? next.goalTimeframe
      : "";
  return next;
}

/** Retry-safe merge: completion stays true once recorded. */
export function mergeOnboardingProfile(
  existing: SyncUserProfile | null | undefined,
  incoming: SyncUserProfile,
): SyncUserProfile {
  const sanitizedIncoming = sanitizeSyncUserProfile(incoming);
  const sanitizedExisting = existing
    ? sanitizeSyncUserProfile(existing)
    : EMPTY_USER_PROFILE;

  return {
    ...EMPTY_USER_PROFILE,
    ...sanitizedExisting,
    ...sanitizedIncoming,
    onboardingComplete: Boolean(
      sanitizedExisting.onboardingComplete ||
        sanitizedIncoming.onboardingComplete,
    ),
  };
}

export function canEnterAuthenticatedHome(
  profile: { onboardingComplete?: boolean } | null | undefined,
): boolean {
  return Boolean(profile?.onboardingComplete);
}

export type RemoteProfileStatus = "idle" | "loading" | "ready" | "error";

export function decideAuthenticatedHomeEntry(input: {
  remoteStatus: RemoteProfileStatus;
  localProfile: { onboardingComplete?: boolean } | null | undefined;
  remoteProfile: { onboardingComplete?: boolean } | null | undefined;
}): "wait" | "enter" | "onboarding" {
  const localComplete = canEnterAuthenticatedHome(input.localProfile);
  const remoteComplete = canEnterAuthenticatedHome(input.remoteProfile);

  if (input.remoteStatus === "ready") {
    if (remoteComplete) return "enter";
    if (input.remoteProfile && !remoteComplete) return "onboarding";
    if (localComplete) return "enter";
    return "onboarding";
  }

  if (localComplete) return "enter";
  if (input.remoteStatus === "error") return "onboarding";
  return "wait";
}

export function interpretProfileGetResponse(input: {
  ok: boolean;
  status: number;
  body: { profile?: SyncUserProfile | null } | null;
}): {
  remoteStatus: Extract<RemoteProfileStatus, "ready" | "error">;
  profile: SyncUserProfile | null;
} {
  if (!input.ok || input.status >= 500) {
    return { remoteStatus: "error", profile: null };
  }

  const raw = input.body?.profile;
  if (!raw) {
    return { remoteStatus: "ready", profile: null };
  }

  return {
    remoteStatus: "ready",
    profile: sanitizeSyncUserProfile(raw),
  };
}

export async function completeOnboardingSubmission(input: {
  profile: SyncUserProfile;
  applyLocal: (profile: SyncUserProfile) => void;
  saveRemote: (profile: SyncUserProfile) => Promise<{
    ok: boolean;
    status: number;
    error?: string;
  }>;
}): Promise<
  | { ok: true; profile: SyncUserProfile }
  | { ok: false; error: string; profile: SyncUserProfile }
> {
  const sanitized = sanitizeSyncUserProfile(input.profile);

  if (!isOnboardingSubmissionReady(sanitized)) {
    return {
      ok: false,
      error: ONBOARDING_INCOMPLETE_ERROR,
      profile: { ...sanitized, onboardingComplete: false },
    };
  }

  const completed: SyncUserProfile = {
    ...sanitized,
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  };

  try {
    const result = await input.saveRemote(completed);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error?.trim() || ONBOARDING_SAVE_ERROR,
        profile: { ...sanitized, onboardingComplete: false },
      };
    }
  } catch {
    return {
      ok: false,
      error: ONBOARDING_NETWORK_ERROR,
      profile: { ...sanitized, onboardingComplete: false },
    };
  }

  try {
    input.applyLocal(completed);
  } catch {
    try {
      saveUserProfile(completed);
    } catch {
      // Remote save already succeeded.
    }
  }

  return { ok: true, profile: completed };
}
