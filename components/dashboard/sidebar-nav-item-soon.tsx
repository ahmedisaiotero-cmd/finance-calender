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
      className={cn(
        "relative flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5",
        "text-[13px] font-medium tracking-tight text-muted-foreground/50",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground/40">
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="truncate">{label}</span>
      <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {SYNC_CATEGORY_SOON_LABEL}
      </span>
    </div>
  );
}
