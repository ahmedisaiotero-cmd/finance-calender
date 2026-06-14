"use client";

import { usePathname } from "next/navigation";

import { SyncCenteredNav } from "@/components/sync/sync-centered-nav";
import { getAppShellRoute } from "@/lib/app-shell-routes";
import { SYNC_PRODUCT } from "@/lib/sync-copy";
import { cn } from "@/lib/utils";

export function PersistentAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { layout, title, description } = getAppShellRoute(pathname);
  const eyebrow = SYNC_PRODUCT.name;

  const isDashboard = layout === "dashboard";
  const isHome = layout === "home";
  const isHealth = layout === "health";
  const isFinance = layout === "finance";
  const isCalendar = layout === "calendar";
  const isWide = layout === "wide";
  const showDefaultHeader =
    !isDashboard && !isHome && !isFinance && !isHealth && !isCalendar;

  return (
    <div className="sync-app-shell flex min-h-screen bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <SyncCenteredNav />
        <main className="flex-1 overflow-auto">
          <div
            className={cn(
              "sync-app-main mx-auto",
              isDashboard && "sync-app-main--narrow",
              isHome && "sync-app-main--home",
              isHealth && "sync-app-main--health",
              isFinance && "sync-app-main--finance",
              isCalendar && "sync-app-main--calendar",
              isWide && "sync-app-main--wide",
            )}
          >
            {showDefaultHeader && (
              <header className="sync-page-header">
                <p className="sync-page-eyebrow">{eyebrow}</p>
                <h1 className="sync-page-title">{title}</h1>
                {description && (
                  <p className="sync-page-description">{description}</p>
                )}
              </header>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
