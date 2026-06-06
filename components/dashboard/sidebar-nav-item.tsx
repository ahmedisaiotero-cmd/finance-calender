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
      className={cn(
        "sync-nav-item w-full",
        isActive && "sync-nav-item--active",
        className,
      )}
    >
      <Icon
        className={cn(
          "sync-nav-icon size-[15px] shrink-0",
          isActive ? "opacity-100" : "opacity-55",
        )}
        strokeWidth={isActive ? 2.25 : 1.75}
      />
      <span className="truncate">{label}</span>
      {isActive ? (
        <span className="sync-nav-active-dot" aria-hidden />
      ) : null}
    </Link>
  );
}
