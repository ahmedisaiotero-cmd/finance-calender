"use client";

import { HealthRecentActivity } from "@/components/health/health-recent-activity";
import { HealthSummaryBar } from "@/components/health/health-summary-bar";
import { HealthTodayTracker } from "@/components/health/health-today-tracker";
import { HealthWeeklySplit } from "@/components/health/health-weekly-split";

export function HealthContent() {
  return (
    <div
      className="flex w-full flex-col gap-10 sm:gap-12"
      data-page="health"
    >
      <HealthSummaryBar />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-14 xl:gap-16">
        <HealthWeeklySplit />

        <aside className="flex flex-col gap-10 lg:gap-12">
          <HealthTodayTracker />
          <HealthRecentActivity />
        </aside>
      </div>
    </div>
  );
}
