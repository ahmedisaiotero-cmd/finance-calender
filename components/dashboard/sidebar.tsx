"use client";

import { CalendarDays } from "lucide-react";

import { NavLinks } from "@/components/dashboard/nav-links";
import { UserProfile } from "@/components/dashboard/user-profile";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <CalendarDays className="size-4" strokeWidth={2.25} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Finance</p>
          <p className="text-xs text-muted-foreground">Calendar</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 py-2">
        <NavLinks className="flex-1" />
      </div>

      <div className="border-t border-border/60 p-4">
        <UserProfile />
      </div>
    </aside>
  );
}
