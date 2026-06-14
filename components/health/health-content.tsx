"use client";

import { SyncDomainPage } from "@/components/domain/sync-domain-page";
import { useCapturedItems } from "@/lib/captured-items";

export function HealthContent() {
  const { activeItems, getItemsForDestination } = useCapturedItems();
  const capturedHealthItems = getItemsForDestination("Health");

  return (
    <SyncDomainPage
      title="Health"
      supportingCopy="Movement, recovery, and health moments Sync has helped you plan."
      items={activeItems}
      lens="health"
      insights={[
        capturedHealthItems.length > 0
          ? "You've made space for your body this week."
          : "Health moments will appear here when you capture them.",
        "Small plans count. Sync keeps them visible without pressure.",
      ]}
    />
  );
}
