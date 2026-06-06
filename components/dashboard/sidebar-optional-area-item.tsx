"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SidebarOptionalAreaItemProps = {
  label: string;
  href: string;
  icon: LucideIcon;
  onNavigate?: () => void;
};

export function SidebarOptionalAreaItem({
  label,
  href,
  icon: Icon,
  onNavigate,
}: SidebarOptionalAreaItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("sync-nav-item sync-nav-item--optional w-full")}
    >
      <span className="sync-nav-optional-bullet" aria-hidden>
        •
      </span>
      <Icon className="size-[12px] shrink-0 opacity-40" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
      <span className="sync-nav-optional-connect ml-auto shrink-0">Connect</span>
    </Link>
  );
}
