"use client";

import { useState } from "react";
import { CalendarDays, Menu } from "lucide-react";

import { MobileNavMenu } from "@/components/dashboard/mobile-nav-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarDays className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Finance Calendar
          </span>
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
