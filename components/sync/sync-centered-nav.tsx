"use client";

import { CalendarDays, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { useSidebarNavigation } from "@/hooks/use-user-life-areas";
import { isNavItemActive, type NavItem } from "@/lib/user-life-areas";
import { cn } from "@/lib/utils";

const CENTERED_NAV_ORDER = [
  "home",
  "calendar",
  "finance",
  "health",
  "work",
  "relationships",
  "family",
  "goals",
  "school",
] as const;

const STABLE_NAV: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: LayoutDashboard,
    lifeArea: null,
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    lifeArea: null,
  },
];

function navLabel(item: NavItem) {
  return item.label;
}

export function SyncCenteredNav() {
  const pathname = usePathname();
  const { primary } = useSidebarNavigation();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const visiblePrimary = mounted
    ? primary
    : primary.filter((item) => item.id === "home" || item.id === "calendar");
  const orderedPrimary = [...(visiblePrimary.length > 0 ? visiblePrimary : STABLE_NAV)].sort(
    (a, b) =>
      CENTERED_NAV_ORDER.indexOf(a.id) - CENTERED_NAV_ORDER.indexOf(b.id),
  );

  return (
    <nav
      className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-2 px-6 py-4"
      aria-label="Sync navigation"
    >
      {orderedPrimary.map((item) => {
        const active = isNavItemActive(item, pathname);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              active
                ? "border-primary/25 bg-primary/10 text-foreground/85"
                : "border-border/25 bg-muted/10 text-muted-foreground/65 hover:text-foreground/80",
            )}
          >
            {navLabel(item)}
          </Link>
        );
      })}
      <Link
        href="/settings"
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
          pathname === "/settings"
            ? "border-primary/25 bg-primary/10 text-foreground/85"
            : "border-border/25 bg-muted/10 text-muted-foreground/65 hover:text-foreground/80",
        )}
      >
        <Settings className="size-3.5" strokeWidth={1.8} />
        Settings
      </Link>
    </nav>
  );
}
