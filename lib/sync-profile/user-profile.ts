import type { SyncUserContext } from "@/lib/intelligence/sync-user-context";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type DayStyle = "busy" | "calm" | "";
export type CheckInTime = "morning" | "midday" | "evening" | "";
export type Directness = "gentle" | "balanced" | "direct" | "";

export type SyncUserProfile = {
  name: string;
  typicalWeek: string;
  dayStyle: DayStyle;
  priorities: string[];
  awareness: string[];
  currentStress: string;
  workingToward: string;
  checkInTime: CheckInTime;
  directness: Directness;
  protectedCalendar: string;
  comingUp: string;
  onboardingComplete: boolean;
  updatedAt: string;
};

export const USER_PROFILE_KEY = "sync.userProfile";
const LEGACY_LIFE_PROFILE_KEY = "sync.lifeProfile";
const LEGACY_PREFERRED_NAME_KEY = "sync.preferredName";

export const PRIORITY_OPTIONS = [
  "Money",
  "Health",
  "Family",
  "Work",
  "Goals",
  "Home",
] as const;

export const AWARENESS_OPTIONS = [
  "Time",
  "Money",
  "Health",
  "Relationships",
  "Work",
  "Goals",
] as const;

export const DAY_STYLE_OPTIONS = [
  { id: "calm", label: "Calm with a few anchors" },
  { id: "busy", label: "Busy and full" },
] as const;

export const CHECK_IN_OPTIONS = [
  { id: "morning", label: "Morning" },
  { id: "midday", label: "Midday" },
  { id: "evening", label: "Evening" },
] as const;

export const DIRECTNESS_OPTIONS = [
  { id: "gentle", label: "Gentle nudges" },
  { id: "balanced", label: "Balanced" },
  { id: "direct", label: "Just tell me what matters" },
] as const;

export const EMPTY_USER_PROFILE: SyncUserProfile = {
  name: "",
  typicalWeek: "",
  dayStyle: "",
  priorities: [],
  awareness: [],
  currentStress: "",
  workingToward: "",
  checkInTime: "",
  directness: "",
  protectedCalendar: "",
  comingUp: "",
  onboardingComplete: false,
  updatedAt: "",
};

function readLegacyLifeProfile(): Partial<SyncUserProfile> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_LIFE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SyncUserProfile>;
  } catch {
    return null;
  }
}

function readLegacyPreferredName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LEGACY_PREFERRED_NAME_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

function migrateStoredProfile(): SyncUserProfile {
  if (typeof window === "undefined") return EMPTY_USER_PROFILE;

  try {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY);
    if (raw) {
      return { ...EMPTY_USER_PROFILE, ...JSON.parse(raw) } as SyncUserProfile;
    }
  } catch {
    // fall through to legacy migration
  }

  const legacy = readLegacyLifeProfile();
  const legacyName = readLegacyPreferredName();
  const migrated: SyncUserProfile = {
    ...EMPTY_USER_PROFILE,
    ...legacy,
    name: legacy?.name?.trim() || legacyName || "",
  };

  if (
    migrated.name ||
    migrated.typicalWeek ||
    migrated.priorities.length > 0 ||
    migrated.awareness.length > 0 ||
    migrated.comingUp ||
    migrated.onboardingComplete
  ) {
    saveUserProfile(migrated);
  }

  return migrated;
}

export function loadUserProfile(): SyncUserProfile {
  return migrateStoredProfile();
}

export function saveUserProfile(profile: SyncUserProfile): SyncUserProfile {
  if (typeof window === "undefined") return profile;
  const next: SyncUserProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(next));
  return next;
}

export function isOnboardingComplete(): boolean {
  return loadUserProfile().onboardingComplete;
}

export function toggleProfileChip(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function splitComingUpLines(text: string) {
  return text
    .split(/[\n.]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 3);
}

export function profileToSyncUserContext(
  profile: SyncUserProfile,
  workSchedule?: PersistedWorkSchedule | null,
): SyncUserContext {
  const context: SyncUserContext = {};

  if (workSchedule) {
    context.workSchedule = {
      days: workSchedule.days,
      startTime: workSchedule.startTime,
      endTime: workSchedule.endTime,
    };
  }

  const goals: NonNullable<SyncUserContext["goals"]> = [];
  if (profile.priorities.includes("Goals")) {
    goals.push({ id: "profile-goals", title: "Goals", area: "personal" });
  }
  if (profile.priorities.includes("Money")) {
    goals.push({ id: "profile-money", title: "Money", area: "finance" });
  }
  if (profile.workingToward.trim()) {
    goals.push({
      id: "profile-working-toward",
      title: profile.workingToward.trim(),
      area: "personal",
    });
  }

  if (goals.length > 0) {
    context.goals = goals;
  }

  const routines: NonNullable<SyncUserContext["routines"]> = [];
  if (
    profile.priorities.includes("Health") ||
    profile.awareness.includes("Health")
  ) {
    routines.push({
      id: "profile-health",
      title: "Health",
      area: "health",
    });
  }
  if (
    profile.priorities.includes("Work") ||
    profile.awareness.includes("Work")
  ) {
    routines.push({
      id: "profile-work",
      title: "Work",
      area: "work",
    });
  }
  if (profile.protectedCalendar.trim()) {
    routines.push({
      id: "profile-protected",
      title: profile.protectedCalendar.trim(),
      area: "personal",
    });
  }

  if (routines.length > 0) {
    context.routines = routines;
  }

  return context;
}

export function profileTone(profile: SyncUserProfile): Directness {
  return profile.directness || "balanced";
}

/** @deprecated Use SyncUserProfile */
export type LifeProfile = SyncUserProfile;

/** @deprecated Use EMPTY_USER_PROFILE */
export const EMPTY_LIFE_PROFILE = EMPTY_USER_PROFILE;

/** @deprecated Use USER_PROFILE_KEY */
export const LIFE_PROFILE_KEY = USER_PROFILE_KEY;

/** @deprecated Use loadUserProfile */
export const loadLifeProfile = loadUserProfile;

/** @deprecated Use saveUserProfile */
export const saveLifeProfile = saveUserProfile;
