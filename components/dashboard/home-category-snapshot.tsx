import Link from "next/link";

import { CategoryPill } from "@/components/sync/category-pill";
import { SectionEyebrow } from "@/components/sync/section-panel";

type HomeCategorySnapshotProps = {
  moneyLabel: string;
  healthLabel: string;
  careerLabel: string;
};

export function HomeCategorySnapshot({
  moneyLabel,
  healthLabel,
  careerLabel,
}: HomeCategorySnapshotProps) {
  const rows = [
    { category: "money" as const, label: moneyLabel, href: "/money" },
    { category: "health" as const, label: healthLabel, href: "/fitness" },
    { category: "career" as const, label: careerLabel, href: "/calendar" },
  ];

  return (
    <section>
      <SectionEyebrow title="Your life" meta="On one timeline" />

      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.category}>
            <Link
              href={row.href}
              className="group flex items-baseline justify-between gap-4 rounded-lg py-1 transition-colors hover:text-foreground"
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <CategoryPill category={row.category} />
                <span className="text-[13px] text-muted-foreground/70 transition-colors group-hover:text-muted-foreground/90">
                  {row.label}
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground/45 transition-colors group-hover:text-muted-foreground/70">
                Open
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
