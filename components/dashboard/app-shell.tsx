import { MobileHeader } from "@/components/dashboard/mobile-header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SYNC_PRODUCT } from "@/lib/sync-copy";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  eyebrow?: string;
  layout?: "default" | "dashboard" | "wide";
};

export function AppShell({
  children,
  title,
  description,
  eyebrow = SYNC_PRODUCT.name,
  layout = "default",
}: AppShellProps) {
  const isDashboard = layout === "dashboard";
  const isWide = layout === "wide";

  return (
    <div className="sync-app-shell flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-auto">
          <div
            className={cn(
              "sync-app-main mx-auto",
              isDashboard && "sync-app-main--narrow",
              isWide && "sync-app-main--wide",
            )}
          >
            {!isDashboard && (
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
