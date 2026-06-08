import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  CalendarDays,
  Dumbbell,
  GraduationCap,
  LayoutDashboard,
  Target,
  Wallet,
} from "lucide-react";

// —— Life area identifiers ——

export const LIFE_AREA_IDS = [
  "calendar",
  "finance",
  "health",
  "goals",
  "work",
  "school",
  "family",
  "travel",
] as const;

export type LifeAreaId = (typeof LIFE_AREA_IDS)[number];

/** @deprecated Use LifeAreaId */
export type LifeAreaKey = LifeAreaId;

/** Areas that can appear in primary nav or Optional Areas. */
export const EXPANDABLE_LIFE_AREA_IDS = [
  "finance",
  "health",
  "work",
  "school",
  "goals",
] as const;

export type ExpandableLifeAreaId = (typeof EXPANDABLE_LIFE_AREA_IDS)[number];

export type CoreLifeAreaId = "calendar" | "finance" | "health";

export const CORE_LIFE_AREA_IDS = [
  "calendar",
  "finance",
  "health",
] as const satisfies readonly CoreLifeAreaId[];

/** @deprecated Use EXPANDABLE_LIFE_AREA_IDS */
export const OPTIONAL_LIFE_AREA_IDS = ["goals", "work", "school"] as const;

// —— Enable + connect model ——

export type LifeAreaState = {
  enabled: boolean;
  connected: boolean;
};

export type LifeAreaStatus = "active" | "inactive";

/** Resolved map for expandable areas. */
export type LifeAreaStateMap = Record<ExpandableLifeAreaId, LifeAreaState>;

/** Used by Pulse — true when enabled or connected. */
export type ActiveLifeAreas = Record<LifeAreaId, boolean>;

/** @deprecated Use ActiveLifeAreas */
export type UserLifeAreas = ActiveLifeAreas;

// —— Preview / mock manual enable flags ——

/**
 * Manual enable flags for local preview.
 *
 * Preview primary nav — set any to `true`:
 *   mockLifeAreaEnabled.work   → Work moves to primary nav
 *   mockLifeAreaEnabled.school → School moves to primary nav
 *   mockLifeAreaEnabled.goals  → Goals moves to primary nav
 *
 * Account connections are merged in {@link deriveStableNavConnectionSignals}.
 * Nav never uses timeline events (see {@link mockAccountConnections}).
 */
export const mockLifeAreaEnabled: Record<ExpandableLifeAreaId, boolean> = {
  finance: false,
  health: false,
  work: false,
  school: false,
  goals: false,
};

/** @deprecated Use mockLifeAreaEnabled */
export const mockUserLifeAreas = {
  calendar: true,
  finance: mockLifeAreaEnabled.finance,
  health: mockLifeAreaEnabled.health,
  goals: mockLifeAreaEnabled.goals,
  work: mockLifeAreaEnabled.work,
  school: mockLifeAreaEnabled.school,
};

export type LifeAreaConnectionSignals = {
  financeConnected?: boolean;
  healthConnected?: boolean;
  hasGoals?: boolean;
  hasWorkConnection?: boolean;
  hasSchoolConnection?: boolean;
  hasFamilyConnection?: boolean;
  hasTravelConnection?: boolean;
};

const CONNECTION_SIGNAL_KEYS: Record<
  ExpandableLifeAreaId,
  keyof LifeAreaConnectionSignals
> = {
  finance: "financeConnected",
  health: "healthConnected",
  goals: "hasGoals",
  work: "hasWorkConnection",
  school: "hasSchoolConnection",
};

export function isLifeAreaInPrimary(state: LifeAreaState): boolean {
  return state.enabled || state.connected;
}

export function resolveLifeAreaStates(
  enabled: Record<ExpandableLifeAreaId, boolean> = mockLifeAreaEnabled,
  signals: LifeAreaConnectionSignals = {},
): LifeAreaStateMap {
  const states = {} as LifeAreaStateMap;

  for (const id of EXPANDABLE_LIFE_AREA_IDS) {
    const signalKey = CONNECTION_SIGNAL_KEYS[id];
    states[id] = {
      enabled: enabled[id],
      connected: signals[signalKey] === true,
    };
  }

  return states;
}

export function toActiveLifeAreas(
  states: LifeAreaStateMap,
  calendarConnected = true,
  futureSignals: Pick<
    LifeAreaConnectionSignals,
    "hasFamilyConnection" | "hasTravelConnection"
  > = {},
): ActiveLifeAreas {
  return {
    calendar: calendarConnected,
    finance: isLifeAreaInPrimary(states.finance),
    health: isLifeAreaInPrimary(states.health),
    goals: isLifeAreaInPrimary(states.goals),
    work: isLifeAreaInPrimary(states.work),
    school: isLifeAreaInPrimary(states.school),
    family: futureSignals.hasFamilyConnection === true,
    travel: futureSignals.hasTravelConnection === true,
  };
}

/** @deprecated Use resolveLifeAreaStates + toActiveLifeAreas */
export function resolveUserLifeAreas(
  manual = mockUserLifeAreas,
  signals: LifeAreaConnectionSignals = {},
): ActiveLifeAreas {
  const enabled: Record<ExpandableLifeAreaId, boolean> = {
    finance: manual.finance,
    health: manual.health,
    work: manual.work,
    school: manual.school,
    goals: manual.goals,
  };

  const states = resolveLifeAreaStates(enabled, signals);
  return toActiveLifeAreas(states, manual.calendar, signals);
}

export function isLifeAreaActive(
  areas: ActiveLifeAreas,
  id: LifeAreaId,
): boolean {
  return areas[id];
}

// —— Navigation ——

export type NavItemId =
  | "home"
  | "calendar"
  | "finance"
  | "health"
  | "work"
  | "school"
  | "goals";

export type NavItem = {
  id: NavItemId;
  label: string;
  href: string;
  icon: LucideIcon;
  lifeArea: ExpandableLifeAreaId | null;
};

export type OptionalAreaItem = {
  id: ExpandableLifeAreaId;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type SidebarNavigation = {
  primary: NavItem[];
  optional: OptionalAreaItem[];
  states: LifeAreaStateMap;
  activeAreas: ActiveLifeAreas;
};

const NAV_CATALOG: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    lifeArea: null,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    lifeArea: null,
  },
  {
    id: "finance",
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    lifeArea: "finance",
  },
  {
    id: "health",
    label: "Health",
    href: "/fitness",
    icon: Dumbbell,
    lifeArea: "health",
  },
  {
    id: "work",
    label: "Work",
    href: "/work",
    icon: Briefcase,
    lifeArea: "work",
  },
  {
    id: "school",
    label: "School",
    href: "/school",
    icon: GraduationCap,
    lifeArea: "school",
  },
  {
    id: "goals",
    label: "Goals",
    href: "/goals",
    icon: Target,
    lifeArea: "goals",
  },
];

const ALWAYS_PRIMARY_IDS: NavItemId[] = ["home"];

const NAV_PATH_MATCHERS: Record<NavItemId, (pathname: string) => boolean> = {
  home: (pathname) => pathname === "/",
  calendar: (pathname) => pathname === "/calendar",
  finance: (pathname) =>
    pathname === "/finance" ||
    pathname.startsWith("/finance/") ||
    pathname === "/money" ||
    pathname.startsWith("/money/"),
  health: (pathname) =>
    pathname === "/fitness" || pathname.startsWith("/fitness/"),
  work: (pathname) => pathname === "/work" || pathname.startsWith("/work/"),
  school: (pathname) =>
    pathname === "/school" || pathname.startsWith("/school/"),
  goals: (pathname) => pathname === "/goals" || pathname.startsWith("/goals/"),
};

export function enableAreaHref(areaId: ExpandableLifeAreaId): string {
  return `/settings#area-${areaId}`;
}

export function buildSidebarNavigation(
  states: LifeAreaStateMap,
  calendarConnected = true,
  futureSignals: Pick<
    LifeAreaConnectionSignals,
    "hasFamilyConnection" | "hasTravelConnection"
  > = {},
): SidebarNavigation {
  const primary: NavItem[] = [];
  const optional: OptionalAreaItem[] = [];

  for (const item of NAV_CATALOG) {
    if (ALWAYS_PRIMARY_IDS.includes(item.id)) {
      primary.push(item);
      continue;
    }

    if (item.id === "calendar") {
      if (calendarConnected) primary.push(item);
      continue;
    }

    if (!item.lifeArea) continue;

    const areaState = states[item.lifeArea];
    if (isLifeAreaInPrimary(areaState)) {
      primary.push(item);
    }
  }

  return {
    primary,
    optional,
    states,
    activeAreas: toActiveLifeAreas(states, calendarConnected, futureSignals),
  };
}

/** @deprecated Use buildSidebarNavigation */
export function getNavItemsForLifeAreas(areas: ActiveLifeAreas): NavItem[] {
  const states = resolveLifeAreaStates();
  for (const id of EXPANDABLE_LIFE_AREA_IDS) {
    states[id].enabled = areas[id];
    states[id].connected = areas[id] && !mockLifeAreaEnabled[id];
  }
  return buildSidebarNavigation(states, areas.calendar).primary;
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return NAV_PATH_MATCHERS[item.id](pathname);
}

export type PulseLifeDomain =
  | CoreLifeAreaId
  | "goals"
  | "work"
  | "school";

const PULSE_DOMAIN_TO_LIFE_AREA: Record<PulseLifeDomain, LifeAreaId> = {
  calendar: "calendar",
  finance: "finance",
  health: "health",
  goals: "goals",
  work: "work",
  school: "school",
};

export function isPulseDomainActive(
  areas: ActiveLifeAreas,
  domain: PulseLifeDomain,
): boolean {
  return isLifeAreaActive(areas, PULSE_DOMAIN_TO_LIFE_AREA[domain]);
}
