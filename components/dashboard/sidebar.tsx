"use client";

import {
  CalendarDays,
  Dumbbell,
  Home,
  Menu,
  Settings,
  Target,
  Wallet,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { useSidebarNavigation } from "@/hooks/use-user-life-areas";
import { type CapturedSyncItem, useCapturedItems } from "@/lib/captured-items";
import { cn } from "@/lib/utils";

type DockItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  destination: CapturedSyncItem["destinations"][number] | null;
  disabled?: boolean;
};

const MENU_ITEMS: DockItem[] = [
  { id: "home", label: "Home", href: "/", icon: Home, destination: null },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    destination: "Calendar",
  },
  {
    id: "finance",
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    destination: "Finance",
  },
  {
    id: "health",
    label: "Health",
    href: "/health",
    icon: Dumbbell,
    destination: "Health",
  },
  {
    id: "goals",
    label: "Goals",
    href: "/goals",
    icon: Target,
    destination: "Goals",
  },
  { id: "work", label: "Work", href: "/work", icon: Briefcase, destination: "Work" },
];

function destinationForNav(id: string): DockItem["destination"] {
  if (id === "calendar") return "Calendar";
  if (id === "finance") return "Finance";
  if (id === "health") return "Health";
  if (id === "goals") return "Goals";
  if (id === "work") return "Work";
  if (id === "school") return "School";
  return null;
}

function pulseState(id: string, itemCount: number) {
  if (id === "home") return "quiet";
  if (itemCount > 0) return "recent";
  return "quiet";
}

function itemMeta(item: CapturedSyncItem) {
  return [item.dateLabel, item.timeLabel]
    .filter((value) => value && value !== "Upcoming" && value !== "Flexible")
    .join(" • ");
}

function getWidgetItems(
  items: CapturedSyncItem[],
  destination: DockItem["destination"],
) {
  if (!destination) return [];
  return items.filter((captured) => captured.destinations.includes(destination));
}

export function Sidebar() {
  const pathname = usePathname();
  const { primary } = useSidebarNavigation();
  const { items } = useCapturedItems();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDockId, setActiveDockId] = useState<string | null>(null);

  const dockItems = useMemo<DockItem[]>(
    () =>
      primary.map((item) => ({
        id: item.id,
        label: item.id === "finance" ? "Finance" : item.label,
        href: item.href,
        icon: item.icon,
        destination: destinationForNav(item.id),
      })),
    [primary],
  );

  const activeWidgetItem =
    menuOpen ? null : dockItems.find((item) => item.id === activeDockId);

  return (
    <aside
      className="sync-pulse-nav"
      aria-label="Life areas"
      onMouseLeave={() => setActiveDockId(null)}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={cn(
            "sync-pulse-nav-trigger",
            menuOpen && "sync-pulse-nav-trigger--active",
          )}
          aria-label="Open Sync menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((current) => !current);
            setActiveDockId(null);
          }}
          onMouseEnter={() => setActiveDockId(null)}
          onFocus={() => setActiveDockId(null)}
        >
          <Menu className="size-4" strokeWidth={1.7} />
        </button>

        <nav className="flex items-center gap-1" aria-label="Life areas">
          {dockItems.map((item) => {
            const Icon = item.icon;
            const destination = item.destination;
            const matchingItems = destination
              ? items.filter((captured) =>
                  captured.destinations.includes(destination),
                )
              : [];
            const state = pulseState(item.id, matchingItems.length);
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "sync-pulse-nav-item group",
                  active && "sync-pulse-nav-item--active",
                )}
                onMouseEnter={() => setActiveDockId(item.id)}
                onFocus={() => setActiveDockId(item.id)}
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.7} />
                <span className="sync-pulse-nav-label">{item.label}</span>
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
      </div>

      {activeWidgetItem && (
        <PulseDockWidget
          item={activeWidgetItem}
          items={getWidgetItems(items, activeWidgetItem.destination)}
        />
      )}

      {menuOpen && (
        <div className="sync-pulse-menu">
          <div className="grid gap-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "sync-pulse-menu-item",
                    active && "sync-pulse-menu-item--active",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon className="size-4" strokeWidth={1.7} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              className={cn(
                "sync-pulse-menu-item",
                pathname === "/settings" && "sync-pulse-menu-item--active",
              )}
              onClick={() => setMenuOpen(false)}
            >
              <Settings className="size-4" strokeWidth={1.7} />
              <span>Settings</span>
            </Link>
          </div>
          <div className="mt-2 border-t border-border/15 pt-2">
            <ThemeToggle />
          </div>
        </div>
      )}
    </aside>
  );
}

function PulseDockWidget({
  item,
  items,
}: {
  item: DockItem;
  items: CapturedSyncItem[];
}) {
  const visibleItems = items.slice(0, 3);

  return (
    <div className="sync-pulse-widget">
      <p className="text-[13px] font-medium tracking-[-0.02em] text-foreground/90">
        {item.label}
      </p>
      {visibleItems.length === 0 ? (
        <p className="mt-2 text-[12px] text-muted-foreground/58">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {visibleItems.map((captured) => (
            <li key={captured.id} className="min-w-0">
              <p className="truncate text-[12px] font-medium text-foreground/82">
                {captured.title}
              </p>
              {itemMeta(captured) && (
                <p className="text-[11px] text-muted-foreground/55">
                  {itemMeta(captured)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={item.href}
        className="mt-3 inline-flex text-[12px] font-medium text-muted-foreground/72 transition-colors hover:text-foreground/88"
      >
        View →
      </Link>
    </div>
  );
}
