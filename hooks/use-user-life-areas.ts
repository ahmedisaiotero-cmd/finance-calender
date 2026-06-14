"use client";

import { useMemo } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import { deriveStableNavConnectionSignals } from "@/lib/life-area-signals";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";
import {
  buildSidebarNavigation,
  type ExpandableLifeAreaId,
  mockLifeAreaEnabled,
  resolveLifeAreaStates,
  type ActiveLifeAreas,
  type SidebarNavigation,
} from "@/lib/user-life-areas";

/**
 * Nav life areas appear when captured content exists for that area,
 * or when manually enabled via mockLifeAreaEnabled / settings.
 */
export function useSidebarNavigation(): SidebarNavigation {
  const { activeItems } = useCapturedItems();

  const contentEnabled = useMemo<Record<ExpandableLifeAreaId, boolean>>(
    () => ({
      finance: activeItems.some((item) => item.destinations.includes("Finance")),
      health: activeItems.some((item) => item.destinations.includes("Health")),
      goals: activeItems.some((item) => item.destinations.includes("Goals")),
      work: activeItems.some((item) => item.destinations.includes("Work")),
      school: activeItems.some((item) => item.destinations.includes("School")),
      relationships: activeItems.some((item) =>
        item.destinations.includes("Relationships"),
      ),
    }),
    [activeItems],
  );

  const hasWorkSchedule = Boolean(loadActiveWorkSchedule());

  const enabledAreas = useMemo(
    () => ({
      finance: contentEnabled.finance || mockLifeAreaEnabled.finance,
      health: contentEnabled.health || mockLifeAreaEnabled.health,
      goals: contentEnabled.goals || mockLifeAreaEnabled.goals,
      work:
        contentEnabled.work || mockLifeAreaEnabled.work || hasWorkSchedule,
      school: contentEnabled.school || mockLifeAreaEnabled.school,
      relationships:
        contentEnabled.relationships || mockLifeAreaEnabled.relationships,
    }),
    [contentEnabled, hasWorkSchedule],
  );

  return useMemo(() => {
    const signals = deriveStableNavConnectionSignals({
      financeDb: contentEnabled.finance,
      healthAccountConnected: contentEnabled.health,
      workAccountConnected: contentEnabled.work || hasWorkSchedule,
      schoolAccountConnected: contentEnabled.school,
      hasGoals: contentEnabled.goals,
    });
    signals.hasRelationshipsConnection = contentEnabled.relationships;
    signals.hasFamilyConnection = activeItems.some((item) =>
      item.destinations.includes("Family"),
    );

    const states = resolveLifeAreaStates(enabledAreas, signals);

    return buildSidebarNavigation(states, true, signals);
  }, [activeItems, contentEnabled, enabledAreas, hasWorkSchedule]);
}

/** Active life areas for Pulse and feature gating. */
export function useUserLifeAreas(): ActiveLifeAreas {
  const { activeAreas } = useSidebarNavigation();
  return activeAreas;
}
