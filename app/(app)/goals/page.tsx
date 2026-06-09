"use client";

import { SyncDomainPage } from "@/components/domain/sync-domain-page";
import { useCapturedItems } from "@/lib/captured-items";

export default function GoalsPage() {
  const { getItemsForDestination } = useCapturedItems();
  const goals = getItemsForDestination("Goals");

  return (
    <SyncDomainPage
      title="Goals"
      supportingCopy="Savings goals, intentions, and progress you have asked Sync to hold."
      items={goals}
      insights={[
        goals.length > 0
          ? `${goals.length} goal${goals.length === 1 ? "" : "s"} in view.`
          : "Goals will appear here when Sync has something to hold.",
        "Progress can stay gentle and visible.",
      ]}
    />
  );
}
