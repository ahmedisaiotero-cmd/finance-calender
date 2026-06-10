"use client";

import { useMemo } from "react";

import { useTransactions } from "@/hooks/use-transactions";
import { useCapturedItems } from "@/lib/captured-items";
import { deriveStableNavConnectionSignals } from "@/lib/life-area-signals";
import {
  buildSidebarNavigation,
  mockLifeAreaEnabled,
  resolveLifeAreaStates,
  type ActiveLifeAreas,
  type SidebarNavigation,
} from "@/lib/user-life-areas";

/**
 * Resolves sidebar navigation from stable account signals only.
 * Timeline loading or event content never toggles nav items.
 */
export function useSidebarNavigation(): SidebarNavigation {
  const { usingDatabase: txDb } = useTransactions();
  const { items } = useCapturedItems();

  return useMemo(() => {
    const hasFinanceCaptures = items.some((item) =>
      item.destinations.includes("Finance"),
    );
    const hasHealthCaptures = items.some((item) =>
      item.destinations.includes("Health"),
    );
    const hasGoalCaptures = items.some((item) =>
      item.destinations.includes("Goals"),
    );
    const hasWorkCaptures = items.some((item) =>
      item.destinations.includes("Work"),
    );
    const hasSchoolCaptures = items.some((item) =>
      item.destinations.includes("School"),
    );
    const signals = deriveStableNavConnectionSignals({
      financeDb: txDb || hasFinanceCaptures,
      // Future: healthAccountConnected from OAuth registry
    });
    signals.healthConnected = hasHealthCaptures;
    signals.hasGoals = hasGoalCaptures;
    signals.hasWorkConnection = hasWorkCaptures;
    signals.hasSchoolConnection = hasSchoolCaptures;

    const states = resolveLifeAreaStates(mockLifeAreaEnabled, signals);

    return buildSidebarNavigation(states, true, signals);
  }, [items, txDb]);
}

/** Active life areas for Pulse and feature gating. */
export function useUserLifeAreas(): ActiveLifeAreas {
  const { activeAreas } = useSidebarNavigation();
  return activeAreas;
}
