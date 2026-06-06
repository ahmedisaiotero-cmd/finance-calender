import Link from "next/link";

import { SurfaceCard } from "@/components/ui/surface-card";
import { lifeCategoryNavItems } from "@/lib/sync-categories";
import { SYNC_CATEGORY_SOON_LABEL } from "@/lib/sync-copy";
import { cn } from "@/lib/utils";

const HINTS: Record<string, string> = {
  money: "Spending & budgets",
  health: "Training & wellness",
  career: "Work & deadlines",
  relationships: "People & plans",
  personal: "Habits & goals",
};

export function CategoryOverviewGrid() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Categories
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {lifeCategoryNavItems.map((category) => {
          const Icon = category.icon;
          const inner = (
            <>
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60">
                <Icon className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="font-medium tracking-tight">{category.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {HINTS[category.id]}
                </p>
              </div>
              {!category.enabled && (
                <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {SYNC_CATEGORY_SOON_LABEL}
                </span>
              )}
            </>
          );

          if (category.enabled && category.href) {
            return (
              <Link key={category.id} href={category.href}>
                <SurfaceCard
                  className={cn(
                    "flex items-center gap-3 p-4 transition-colors hover:bg-accent/40",
                  )}
                >
                  {inner}
                </SurfaceCard>
              </Link>
            );
          }

          return (
            <SurfaceCard
              key={category.id}
              className="flex cursor-not-allowed items-center gap-3 p-4 opacity-55"
            >
              {inner}
            </SurfaceCard>
          );
        })}
      </div>
    </section>
  );
}
