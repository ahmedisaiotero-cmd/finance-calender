"use client";

import { usePathname } from "next/navigation";

import { SidebarNavItem } from "@/components/dashboard/sidebar-nav-item";
import { SidebarOptionalAreas } from "@/components/dashboard/sidebar-optional-areas";
import { useSidebarNavigation } from "@/hooks/use-user-life-areas";
import { isNavItemActive } from "@/lib/user-life-areas";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  onNavigate?: () => void;
  className?: string;
};

export function NavLinks({ onNavigate, className }: NavLinksProps) {
  const pathname = usePathname();
  const { primary, optional } = useSidebarNavigation();

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <nav className="flex flex-col gap-0.5" aria-label="Primary navigation">
        {primary.map((item) => (
          <SidebarNavItem
            key={item.id}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isNavItemActive(item, pathname)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <SidebarOptionalAreas areas={optional} onNavigate={onNavigate} />
    </div>
  );
}
