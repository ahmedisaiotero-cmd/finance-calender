"use client";

import { useMemo } from "react";

import { useSyncTimeline } from "@/hooks/use-sync-timeline";
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
  const { usingDatabase } = useSyncTimeline(
    new Date().getFullYear(),
    new Date().getMonth(),
  );
  const { usingDatabase: txDb } = useTransactions();

  return useMemo(() => {
    const financeDb = txDb || usingDatabase;

    const signals = deriveStableNavConnectionSignals({
      financeDb,
      // Future: healthAccountConnected from OAuth registry
    });

    const states = resolveLifeAreaStates(mockLifeAreaEnabled, signals);

    return buildSidebarNavigation(states, true, signals);
  }, [txDb, usingDatabase]);
}

/** Active life areas for Pulse and feature gating. */
export function useUserLifeAreas(): ActiveLifeAreas {
  const { activeAreas } = useSidebarNavigation();
  return activeAreas;
}
