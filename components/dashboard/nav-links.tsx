"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { SidebarNavItem } from "@/components/dashboard/sidebar-nav-item";
import { SidebarNavItemSoon } from "@/components/dashboard/sidebar-nav-item-soon";
import {
  lifeCategoryNavItems,
  moneySubNavItems,
  primaryNavItems,
} from "@/lib/sync-categories";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  onNavigate?: () => void;
  className?: string;
  showSectionLabel?: boolean;
};

function isNavItemActive(pathname: string, hash: string, href: string) {
  const [path, itemHash] = href.split("#");

  if (itemHash) {
    return pathname === path && hash === `#${itemHash}`;
  }

  return pathname === path || (path !== "/" && pathname.startsWith(path));
}

function isCalendarNavActive(pathname: string) {
  return pathname === "/calendar";
}

export function NavLinks({
  onNavigate,
  className,
  showSectionLabel = true,
}: NavLinksProps) {
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
      {showSectionLabel && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Workspace
        </p>
      )}

      {primaryNavItems.map((item) => (
        <SidebarNavItem
          key={item.label}
          href={item.href}
          label={item.label}
          icon={item.icon}
          isActive={
            item.href === "/calendar"
              ? isCalendarNavActive(pathname)
              : isNavItemActive(pathname, hash, item.href)
          }
          onNavigate={onNavigate}
        />
      ))}

      <p className="mb-2 mt-4 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Categories
      </p>

      {lifeCategoryNavItems.map((category) => {
        if (!category.enabled || !category.href) {
          return (
            <SidebarNavItemSoon
              key={category.id}
              label={category.label}
              icon={category.icon}
            />
          );
        }

        const isActive =
          category.id === "money"
            ? false
            : isNavItemActive(pathname, hash, category.href);

        return (
          <div key={category.id}>
            <SidebarNavItem
              href={category.href}
              label={category.label}
              icon={category.icon}
              isActive={isActive}
              onNavigate={onNavigate}
            />
            {category.id === "money" &&
              moneySubNavItems.map((item) => (
                <SidebarNavItem
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isNavItemActive(pathname, hash, item.href)}
                  onNavigate={onNavigate}
                  className="ml-3 w-[calc(100%-0.75rem)] py-2 text-[12px]"
                />
              ))}
          </div>
        );
      })}

      <div className="my-3 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />

      <SidebarNavItemSoon label="Settings" icon={Settings} />
    </nav>
  );
}
