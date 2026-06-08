"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { MobileNavMenu } from "@/components/dashboard/mobile-nav-menu";
import { SYNC_PRODUCT } from "@/lib/sync-copy";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sync-mobile-header flex h-16 items-center justify-between border-b px-4 md:hidden">
        <div className="min-w-0">
          <span className="text-[15px] font-medium tracking-[-0.025em] text-foreground/90">
            {SYNC_PRODUCT.name}
          </span>
          <p className="truncate text-[12px] text-muted-foreground/60">
            {SYNC_PRODUCT.tagline}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            <Menu className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </header>

      <MobileNavMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
