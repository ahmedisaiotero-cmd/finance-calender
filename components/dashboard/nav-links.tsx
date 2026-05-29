"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartPie,
  Dumbbell,
  LayoutDashboard,
  Receipt,
  Settings,
  Wallet,
} from "lucide-react";

import { SidebarNavItem } from "@/components/dashboard/sidebar-nav-item";
import { navItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: LayoutDashboard,
  Calendar: CalendarDays,
  Transactions: Receipt,
  Budgets: Wallet,
  Fitness: Dumbbell,
  Insights: ChartPie,
} as const;

type NavLinksProps = {
  onNavigate?: () => void;
  className?: string;
  showSectionLabel?: boolean;
};

export function NavLinks({
  onNavigate,
  className,
  showSectionLabel = true,
}: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {showSectionLabel && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Menu
        </p>
      )}

      {navItems.map((item) => {
        const Icon = iconMap[item.label as keyof typeof iconMap];
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : item.href !== "#" && pathname.startsWith(item.href);

        return (
          <SidebarNavItem
            key={item.label}
            href={item.href}
            label={item.label}
            icon={Icon}
            isActive={isActive}
            onNavigate={onNavigate}
          />
        );
      })}

      <div className="my-3 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />

      <Link
        href="#"
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium tracking-tight text-muted-foreground",
          "transition-[color,transform,background-color] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          "hover:translate-x-0.5 hover:text-foreground active:scale-[0.98]",
        )}
      >
        <span className="absolute inset-0 rounded-xl bg-accent/0 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:bg-accent/55 group-hover:opacity-100" />
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-105 group-hover:bg-background/60 group-hover:shadow-sm">
          <Settings className="size-[18px]" strokeWidth={2} />
        </span>
        <span className="relative">Settings</span>
      </Link>
    </nav>
  );
}
