"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { NavLinks } from "@/components/dashboard/nav-links";
import { SyncOptionsMenu } from "@/components/dashboard/sync-options-menu";
import { useSidebarNavigation } from "@/hooks/use-user-life-areas";
import { SYNC_PRODUCT } from "@/lib/sync-copy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileNavMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavMenu({ open, onClose }: MobileNavMenuProps) {
  const { optional } = useSidebarNavigation();

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
          "fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity md:hidden",
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
          "sync-mobile-nav fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2.5rem,17.5rem)] flex-col border-r border-border/30 shadow-xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="min-w-0">
            <span className="text-[15px] font-medium tracking-[-0.02em] text-foreground/92">
              {SYNC_PRODUCT.name}
            </span>
            <p className="mt-0.5 text-[12px] text-muted-foreground/65">
              {SYNC_PRODUCT.tagline}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground/70"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6">
          <NavLinks onNavigate={onClose} className="flex-1" />
          <div className="mt-6 border-t border-border/25 pt-5">
            <SyncOptionsMenu
              variant="panel"
              optionalAreas={optional}
              onNavigate={onClose}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
