"use client";

import { useEffect } from "react";
import { CalendarDays, X } from "lucide-react";

import { NavLinks } from "@/components/dashboard/nav-links";
import { UserProfile } from "@/components/dashboard/user-profile";
import { Button } from "@/components/ui/button";
import { userProfile } from "@/lib/mock-data";
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
          "fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-border/60 bg-sidebar shadow-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Finance Calendar
            </span>
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

        <div className="border-b border-border/60 p-4">
          <UserProfile showEmail size="compact" />
          <dl className="mt-4 grid gap-2 rounded-xl bg-muted/40 px-3 py-3 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Account</dt>
              <dd className="font-medium">{userProfile.plan}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{userProfile.email}</dd>
            </div>
          </dl>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}
