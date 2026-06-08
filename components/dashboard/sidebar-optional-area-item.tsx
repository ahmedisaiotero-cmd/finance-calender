"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type SidebarOptionalAreaItemProps = {
  label: string;
  href: string;
  onNavigate?: () => void;
};

export function SidebarOptionalAreaItem({
  label,
  href,
  onNavigate,
}: SidebarOptionalAreaItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("sync-nav-item sync-nav-item--optional w-full")}
    >
      <span className="truncate">
        {label}
        <span className="text-muted-foreground/42"> — Connect</span>
      </span>
    </Link>
  );
}
