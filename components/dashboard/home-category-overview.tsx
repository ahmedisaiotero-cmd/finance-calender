import Link from "next/link";

import { CategoryPill } from "@/components/sync/category-pill";
import { SectionEyebrow } from "@/components/sync/section-panel";

type HomeCategoryOverviewProps = {
  moneyLabel: string;
  healthLabel: string;
};

export function HomeCategoryOverview({
  moneyLabel,
  healthLabel,
}: HomeCategoryOverviewProps) {
  return (
    <section>
      <SectionEyebrow title="Your life" meta="Connected on one timeline" />

      <ul className="flex flex-col gap-4">
        <li className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <CategoryPill category="money" />
            <span className="text-[13px] text-muted-foreground/70">
              {moneyLabel}
            </span>
          </div>
          <Link
            href="/finance"
            className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
          >
            Open
          </Link>
        </li>
        <li className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <CategoryPill category="health" />
            <span className="text-[13px] text-muted-foreground/70">
              {healthLabel}
            </span>
          </div>
          <Link
            href="/fitness"
            className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
          >
            Open
          </Link>
        </li>
        <li className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <CategoryPill category="career" />
            <span className="text-[13px] text-muted-foreground/70">
              View on calendar
            </span>
          </div>
          <Link
            href="/calendar"
            className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
          >
            Open
          </Link>
        </li>
      </ul>
    </section>
  );
}
