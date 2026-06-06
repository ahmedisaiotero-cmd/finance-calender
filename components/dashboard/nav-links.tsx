"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { SidebarNavItem } from "@/components/dashboard/sidebar-nav-item";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  onNavigate?: () => void;
  className?: string;
};

type MainNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const mainNavItems: MainNavItem[] = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Money", href: "/money", icon: Wallet },
  { label: "Health", href: "/fitness", icon: Dumbbell },
];

function isMainNavActive(
  item: MainNavItem,
  pathname: string,
  hash: string,
) {
  if (item.label === "Home") {
    return pathname === "/";
  }

  if (item.label === "Calendar") {
    return pathname === "/calendar";
  }

  if (item.label === "Money") {
    return pathname === "/money" || pathname.startsWith("/money/");
  }

  if (item.label === "Health") {
    return pathname === "/fitness" || pathname.startsWith("/fitness/");
  }

  return false;
}

export function NavLinks({ onNavigate, className }: NavLinksProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {mainNavItems.map((item) => (
        <SidebarNavItem
          key={item.label}
          href={item.href}
          label={item.label}
          icon={item.icon}
          isActive={isMainNavActive(item, pathname, hash)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
