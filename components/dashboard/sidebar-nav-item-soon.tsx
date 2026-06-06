import type { LucideIcon } from "lucide-react";

import { SYNC_CATEGORY_SOON_LABEL } from "@/lib/sync-copy";
import { cn } from "@/lib/utils";

type SidebarNavItemSoonProps = {
  label: string;
  icon: LucideIcon;
  compact?: boolean;
};

export function SidebarNavItemSoon({
  label,
  icon: Icon,
  compact = false,
}: SidebarNavItemSoonProps) {
  return (
    <div
      aria-disabled="true"
      className={cn(
        "sync-nav-item sync-nav-item--soon w-full",
        compact && "sync-nav-item--utility",
      )}
    >
      <Icon
        className="size-[14px] shrink-0 opacity-45"
        strokeWidth={1.75}
      />
      <span className="truncate">{label}</span>
      {!compact && (
        <span className="ml-auto text-[10px] font-medium text-muted-foreground/55">
          {SYNC_CATEGORY_SOON_LABEL}
        </span>
      )}
    </div>
  );
}
