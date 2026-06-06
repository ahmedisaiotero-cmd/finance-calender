import type { LucideIcon } from "lucide-react";

import { SYNC_CATEGORY_SOON_LABEL } from "@/lib/sync-copy";
import { cn } from "@/lib/utils";

type SidebarNavItemSoonProps = {
  label: string;
  icon: LucideIcon;
};

export function SidebarNavItemSoon({ label, icon: Icon }: SidebarNavItemSoonProps) {
  return (
    <div
      aria-disabled="true"
      className="sync-nav-item sync-nav-item--soon"
    >
      <Icon className="size-[17px] shrink-0 opacity-50" strokeWidth={2} />
      <span className="truncate">{label}</span>
      <span className="ml-auto text-[10px] font-medium text-muted-foreground/50">
        {SYNC_CATEGORY_SOON_LABEL}
      </span>
    </div>
  );
}
