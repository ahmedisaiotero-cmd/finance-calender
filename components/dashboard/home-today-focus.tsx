"use client";

import Link from "next/link";

import type { HomeFocusItem } from "@/lib/home-focus";
import { CategoryPill, EmptyState, SectionPanel } from "@/components/sync";
import { cn } from "@/lib/utils";

type HomeTodayFocusProps = {
  items: HomeFocusItem[];
  loading?: boolean;
};

export function HomeTodayFocus({ items, loading }: HomeTodayFocusProps) {
  return (
    <SectionPanel
      title="Today's Focus"
      subtitle="Here's what matters next"
      action={
        <Link
          href="/calendar"
          className="text-[11px] text-muted-foreground/55 transition-colors hover:text-muted-foreground/80"
        >
          Full timeline
        </Link>
      }
    >
      {loading ? (
        <EmptyState message="Loading your timeline…" />
      ) : items.length === 0 ? (
        <EmptyState
          message="Your slate is clear."
          action={
            <Link
              href="/calendar"
              className="text-foreground/75 transition-colors hover:text-foreground"
            >
              Open Calendar
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-baseline gap-x-2 gap-y-1 py-3.5",
                index > 0 && "border-t border-border/25",
              )}
            >
              <span className="text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                {item.title}
              </span>
              {item.segment && (
                <>
                  <span className="text-muted-foreground/40" aria-hidden>
                    ·
                  </span>
                  <span
                    className={cn(
                      "text-[13px] tabular-nums text-muted-foreground/65",
                      item.category === "money" && "text-muted-foreground/65",
                    )}
                  >
                    {item.segment}
                  </span>
                </>
              )}
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <CategoryPill category={item.category} />
            </li>
          ))}
        </ul>
      )}
    </SectionPanel>
  );
}
