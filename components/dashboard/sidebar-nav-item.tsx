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
  className?: string;
};

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
  className,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn("sync-nav-item", isActive && "sync-nav-item--active", className)}
    >
      <Icon
        className="size-[17px] shrink-0 opacity-90"
        strokeWidth={isActive ? 2.25 : 2}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
