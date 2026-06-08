"use client";

import { useMemo } from "react";

import { useTransactions } from "@/hooks/use-transactions";
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

  return useMemo(() => {
    const signals = deriveStableNavConnectionSignals({
      financeDb: txDb,
      // Future: healthAccountConnected from OAuth registry
    });

    const states = resolveLifeAreaStates(mockLifeAreaEnabled, signals);

    return buildSidebarNavigation(states, false, signals);
  }, [txDb]);
}

/** Active life areas for Pulse and feature gating. */
export function useUserLifeAreas(): ActiveLifeAreas {
  const { activeAreas } = useSidebarNavigation();
  return activeAreas;
}
