"use client";

import { useSidebarNavigation } from "@/hooks/use-user-life-areas";
import { useCapturedItems } from "@/lib/captured-items";
import { isNavItemActive } from "@/lib/user-life-areas";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

function destinationForNav(id: string) {
  if (id === "calendar") return "Calendar";
  if (id === "finance") return "Finance";
  if (id === "health") return "Health";
  if (id === "goals") return "Goals";
  return null;
}

function pulseState(id: string, itemCount: number) {
  if (id === "home") return "quiet";
  if (itemCount > 0) return "recent";
  return "quiet";
}

export function Sidebar() {
  const pathname = usePathname();
  const { primary } = useSidebarNavigation();
  const { items } = useCapturedItems();

  return (
    <aside
      className="sync-pulse-nav"
      aria-label="Life areas"
    >
      <nav className="flex flex-col gap-1.5">
        {primary.map((item) => {
          const Icon = item.icon;
          const destination = destinationForNav(item.id);
          const matchingItems = destination
            ? items.filter((captured) =>
                captured.destinations.includes(destination),
              )
            : [];
          const state = pulseState(item.id, matchingItems.length);
          const active = isNavItemActive(item, pathname);
          const label = item.id === "finance" ? "Money" : item.label;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "sync-pulse-nav-item group",
                active && "sync-pulse-nav-item--active",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.7} />
              <span className="sync-pulse-nav-label">{label}</span>
              <span
                className={cn(
                  "sync-pulse-dot",
                  state === "quiet" && "sync-pulse-dot--quiet",
                  state === "recent" && "sync-pulse-dot--recent",
                )}
                aria-hidden
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
