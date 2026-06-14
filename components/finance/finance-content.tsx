"use client";

import { SyncDomainPage } from "@/components/domain/sync-domain-page";
import { useCapturedItems } from "@/lib/captured-items";

export function FinanceContent() {
  const { activeItems, getItemsForDestination } = useCapturedItems();
  const capturedFinanceItems = getItemsForDestination("Finance");

  return (
    <SyncDomainPage
      title="Finance"
      supportingCopy="Bills, spending, subscriptions, and goals Sync has captured for you."
      items={activeItems}
      lens="finance"
      insights={[
        capturedFinanceItems.length > 0
          ? `${capturedFinanceItems.length} money item${capturedFinanceItems.length === 1 ? "" : "s"} captured.`
          : "Finance will appear here when Sync has something useful to show.",
        "Income, subscriptions, and expenses stay close to the moments you capture.",
      ]}
    />
  );
}
