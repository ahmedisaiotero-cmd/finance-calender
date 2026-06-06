"use client";

import { SyncLogo } from "@/components/brand/sync-logo";
import { NavLinks } from "@/components/dashboard/nav-links";
import { UserProfile } from "@/components/dashboard/user-profile";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

export function Sidebar() {
  return (
    <aside className="sidebar-glass hidden w-[17rem] shrink-0 flex-col md:flex">
      <div className="flex h-[4.25rem] items-center gap-3 px-5">
        <SyncLogo size="md" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight">
            SYNC
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {SYNC_PRODUCT.tagline}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-1">
        <NavLinks className="flex-1" />
      </div>

      <div className="border-t border-border/40 p-3">
        <UserProfile className="sidebar-profile-card" />
      </div>
    </aside>
  );
}
