"use client";

import { useEffect } from "react";
import { Settings, X } from "lucide-react";

import { NavLinks } from "@/components/dashboard/nav-links";
import { SidebarNavItemSoon } from "@/components/dashboard/sidebar-nav-item-soon";
import { SYNC_PRODUCT } from "@/lib/sync-copy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileNavMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavMenu({ open, onClose }: MobileNavMenuProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        className={cn(
          "sync-mobile-nav fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-border/40 shadow-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
          <div className="min-w-0">
            <span className="text-sm font-bold tracking-tight">
              {SYNC_PRODUCT.name}
            </span>
            <p className="text-[11px] text-muted-foreground">
              Synchronize your life.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <NavLinks onNavigate={onClose} className="flex-1" />
          <div className="pb-2 pt-4">
            <SidebarNavItemSoon label="Settings" icon={Settings} />
          </div>
        </div>
      </aside>
    </>
  );
}
