"use client";

import { useMemo } from "react";

import { FinanceConnectedSources } from "@/components/finance/finance-connected-sources";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { FinancePrimaryCard } from "@/components/finance/finance-primary-card";
import { Pulse } from "@/components/sync";
import {
  financeSnapshot,
  financeSources,
  spendingRhythm,
  upcomingObligations,
} from "@/components/finance/finance-mock-data";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";
import { useTransactions } from "@/hooks/use-transactions";
import { resolveHomeConnections } from "@/lib/sync-connections";
import { buildFinancePulse } from "@/lib/sync-pulse";
import { SYNC_LOADING_LABEL } from "@/lib/sync-copy";

export function FinanceContent() {
  const now = new Date();
  const { ready: txReady, usingDatabase } = useTransactions();
  const { ready: timelineReady, usingLiveTimeline } = useSyncTimeline(
    now.getFullYear(),
    now.getMonth(),
  );

  const ready = txReady && timelineReady;

  const connections = useMemo(
    () =>
      resolveHomeConnections({
        usingLiveTimeline,
        usingDatabase,
        healthSessions: 0,
        hasHealthEvents: false,
      }),
    [usingLiveTimeline, usingDatabase],
  );

  const financeConnected = connections.money.status === "connected";
  const isFinancePreview = !usingLiveTimeline && ready;
  const showFinanceData = financeConnected || isFinancePreview;

  const financePulse = useMemo(
    () =>
      buildFinancePulse({
        financeConnected: showFinanceData,
        diningElevated: spendingRhythm.some((item) =>
          item.state.toLowerCase().includes("elevated"),
        ),
        billsCovered: financeSnapshot.availableToSpend > 0,
        savingsOnPace: financeSnapshot.savingsGoalsStatus
          .toLowerCase()
          .includes("pace"),
        cashFlowHealthy: financeSnapshot.cashFlowStatus
          .toLowerCase()
          .includes("healthy"),
        billsUpcoming: upcomingObligations.length > 0,
      }),
    [showFinanceData],
  );

  if (!ready) {
    return (
      <p className="text-[13px] text-muted-foreground/72">{SYNC_LOADING_LABEL}</p>
    );
  }

  return (
    <div className="sync-finance-page" data-page="finance">
      <header className="sync-briefing">
        <FinancePageHeader
          institutions={financeSources.institutions}
          lastUpdatedMinutes={financeSources.lastUpdatedMinutes}
          showSource={showFinanceData}
        />
        <Pulse
          state={financePulse.state}
          title={financePulse.title}
          message={financePulse.message}
          contributingSignals={financePulse.contributingSignals}
        />
      </header>

      {showFinanceData ? (
        <FinancePrimaryCard
          snapshot={financeSnapshot}
          obligations={upcomingObligations}
        />
      ) : (
        <FinanceConnectedSources
          connection={connections.money}
          institutions={financeSources.institutions}
          lastUpdatedMinutes={financeSources.lastUpdatedMinutes}
          showEmpty
        />
      )}
    </div>
  );
}
