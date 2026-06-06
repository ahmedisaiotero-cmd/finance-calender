"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Link2, Settings, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type UtilityLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string, hash: string) => boolean;
};

const utilityLinks: UtilityLink[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    isActive: (pathname, hash) =>
      pathname === "/settings" && hash !== "#connections",
  },
  {
    label: "Manage connections",
    href: "/settings#connections",
    icon: Link2,
    isActive: (pathname, hash) =>
      pathname === "/settings" && hash === "#connections",
  },
];

type SidebarUtilityNavProps = {
  compact?: boolean;
  onNavigate?: () => void;
};

export function SidebarUtilityNav({
  compact = false,
  onNavigate,
}: SidebarUtilityNavProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return (
    <div className={cn("flex flex-col gap-0.5", compact && "gap-0")}>
      {utilityLinks.map((item) => {
        const Icon = item.icon;
        const isActive = item.isActive(pathname, hash);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "sync-nav-item sync-nav-item--utility w-full",
              isActive && "sync-nav-item--active",
            )}
          >
            <Icon
              className={cn(
                "size-[13px] shrink-0",
                isActive ? "opacity-80" : "opacity-45",
              )}
              strokeWidth={1.75}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
