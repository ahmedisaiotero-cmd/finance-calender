"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SidebarNavItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onNavigate?: () => void;
};

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium tracking-tight",
        "transition-[color,transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        "hover:translate-x-0.5 active:scale-[0.98] active:duration-150",
        isActive
          ? "text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          isActive
            ? "bg-accent/90 opacity-100"
            : "bg-accent/0 opacity-0 group-hover:bg-accent/55 group-hover:opacity-100",
        )}
      />

      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-lg",
          "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          isActive
            ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            : "bg-transparent text-muted-foreground group-hover:bg-background/60 group-hover:text-foreground group-hover:shadow-sm",
          "group-hover:scale-105",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={isActive ? 2.25 : 2} />
      </span>

      <span className="relative truncate">{label}</span>

      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        />
      )}
    </Link>
  );
}
