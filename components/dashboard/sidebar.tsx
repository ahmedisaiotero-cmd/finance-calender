import { NavLinks } from "@/components/dashboard/nav-links";
import { SidebarUtilityNav } from "@/components/dashboard/sidebar-utility-nav";
import { UserProfile } from "@/components/dashboard/user-profile";
import { SYNC_PRODUCT } from "@/lib/sync-copy";

export function Sidebar() {
  return (
    <aside className="sidebar-glass hidden w-[10.25rem] shrink-0 flex-col md:flex">
      <div className="sync-sidebar-brand px-3 pb-5 pt-6">
        <p className="sync-sidebar-logo">SYNC</p>
        <p className="sync-sidebar-tagline">{SYNC_PRODUCT.tagline}</p>
      </div>

      <div className="flex flex-1 flex-col px-3">
        <NavLinks />
      </div>

      <div className="sync-sidebar-utility px-3 pb-4 pt-2">
        <SidebarUtilityNav compact />
        <UserProfile
          className="sync-sidebar-profile mt-2"
          variant="minimal"
          showThemeToggle
        />
      </div>
    </aside>
  );
}
