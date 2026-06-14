"use client";

import { usePathname } from "next/navigation";

import { SyncCenteredNav } from "@/components/sync/sync-centered-nav";
import { getAppShellRoute } from "@/lib/app-shell-routes";
import { cn } from "@/lib/utils";

export function PersistentAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { layout, title, description } = getAppShellRoute(pathname);

  const isHome = layout === "home";
  const isWorkspace = layout === "workspace";
  const showDefaultHeader = layout === "default";

  return (
    <div className="sync-app-shell flex min-h-screen bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <SyncCenteredNav />
        <main className="flex-1 overflow-auto">
          <div
            className={cn(
              "sync-app-main mx-auto",
              isHome && "sync-app-main--home",
              isWorkspace && "sync-app-main--workspace",
            )}
          >
            {showDefaultHeader && (
              <header className="sync-page-header">
                <p className="sync-page-eyebrow">Sync</p>
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
