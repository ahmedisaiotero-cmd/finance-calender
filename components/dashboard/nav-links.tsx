"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartPie,
  LayoutDashboard,
  Receipt,
  Settings,
  Wallet,
} from "lucide-react";

import { navItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: LayoutDashboard,
  Calendar: CalendarDays,
  Transactions: Receipt,
  Budgets: Wallet,
  Insights: ChartPie,
} as const;

type NavLinksProps = {
  onNavigate?: () => void;
  className?: string;
};

export function NavLinks({ onNavigate, className }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const Icon = iconMap[item.label as keyof typeof iconMap];
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="#"
        onClick={onNavigate}
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <Settings className="size-4 shrink-0" strokeWidth={2} />
        Settings
      </Link>
    </nav>
  );
}
