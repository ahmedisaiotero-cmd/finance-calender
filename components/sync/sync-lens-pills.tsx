"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useSidebarNavigation } from "@/hooks/use-user-life-areas";
import { isNavItemActive } from "@/lib/user-life-areas";
import { cn } from "@/lib/utils";

import type { SyncWorkspaceLens } from "@/lib/sync-lenses";

const LENS_NAV_IDS: SyncWorkspaceLens[] = [
  "home",
  "calendar",
  "finance",
  "health",
  "work",
  "relationships",
  "family",
  "school",
  "goals",
];

type SyncLensPillsProps = {
  activeLens: SyncWorkspaceLens;
  className?: string;
};

export function SyncLensPills({ activeLens, className }: SyncLensPillsProps) {
  const pathname = usePathname();
  const { primary } = useSidebarNavigation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visible = mounted
    ? primary.filter((item) => LENS_NAV_IDS.includes(item.id as SyncWorkspaceLens))
    : primary.filter((item) => item.id === "home" || item.id === "calendar");

  if (visible.length <= 2) return null;

  return (
    <nav
      className={cn("flex flex-wrap justify-center gap-2", className)}
      aria-label="Life stream lenses"
    >
      {visible.map((item) => {
        const lens = item.id as SyncWorkspaceLens;
        const active = lens === activeLens || isNavItemActive(item, pathname);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              active
                ? "border-primary/30 bg-primary/12 text-foreground/88"
                : "border-border/25 bg-muted/10 text-muted-foreground/62 hover:text-foreground/78",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
