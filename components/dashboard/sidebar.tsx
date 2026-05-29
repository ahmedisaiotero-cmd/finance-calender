"use client";

import { CalendarDays } from "lucide-react";

import { NavLinks } from "@/components/dashboard/nav-links";
import { UserProfile } from "@/components/dashboard/user-profile";

export function Sidebar() {
  return (
    <aside className="sidebar-glass hidden w-[17rem] shrink-0 flex-col md:flex">
      <div className="flex h-[4.25rem] items-center gap-3 px-5">
        <div
          className={[
            "flex size-10 items-center justify-center rounded-[14px]",
            "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground",
            "shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]",
            "ring-1 ring-white/10 transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            "hover:scale-[1.03] active:scale-[0.97]",
          ].join(" ")}
        >
          <CalendarDays className="size-[18px]" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight">
            Finance
          </p>
          <p className="truncate text-xs text-muted-foreground">Calendar</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-1">
        <NavLinks className="flex-1" />
      </div>

      <div className="border-t border-border/40 p-3">
        <UserProfile className="sidebar-profile-card" />
      </div>
    </aside>
  );
}
