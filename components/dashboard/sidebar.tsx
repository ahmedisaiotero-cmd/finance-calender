import { Settings } from "lucide-react";

import { NavLinks } from "@/components/dashboard/nav-links";
import { SidebarNavItemSoon } from "@/components/dashboard/sidebar-nav-item-soon";
import { UserProfile } from "@/components/dashboard/user-profile";

export function Sidebar() {
  return (
    <aside className="sidebar-glass hidden w-[15rem] shrink-0 flex-col md:flex">
      <div className="sync-sidebar-brand px-5 pb-8 pt-7">
        <p className="sync-sidebar-logo">SYNC</p>
        <p className="sync-sidebar-tagline">Synchronize your life.</p>
      </div>

      <div className="flex flex-1 flex-col px-3">
        <NavLinks className="flex-1" />
        <div className="pb-4 pt-2">
          <SidebarNavItemSoon label="Settings" icon={Settings} />
        </div>
      </div>

      <div className="sync-sidebar-footer p-3">
        <UserProfile className="sidebar-profile-card" />
      </div>
    </aside>
  );
}
