"use client";

import { NavLinks } from "@/components/dashboard/nav-links";
import { SyncOptionsMenu } from "@/components/dashboard/sync-options-menu";
import { useSidebarNavigation } from "@/hooks/use-user-life-areas";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

export function Sidebar() {
  const { optional } = useSidebarNavigation();

  return (
    <aside className="sidebar-glass hidden w-[10.25rem] shrink-0 flex-col md:flex">
      <div className="sync-sidebar-brand px-3 pb-5 pt-6">
        <p className="sync-sidebar-logo">SYNC</p>
        <p className="sync-sidebar-tagline">{SYNC_PRODUCT.tagline}</p>
      </div>

      <div className="flex flex-1 flex-col px-3">
        <NavLinks />
      </div>

      <div className="sync-sidebar-utility px-3 pb-4 pt-3">
        <SyncOptionsMenu variant="dropdown" optionalAreas={optional} />
      </div>
    </aside>
  );
}
