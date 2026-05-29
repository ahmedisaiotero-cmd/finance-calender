import { MobileHeader } from "@/components/dashboard/mobile-header";
import { Sidebar } from "@/components/dashboard/sidebar";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
  eyebrow?: string;
};

export function AppShell({
  children,
  title,
  description,
  eyebrow = "Finance Calendar",
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
            <header className="mb-8 hidden md:block">
              <p className="text-sm font-medium text-muted-foreground">
                {eyebrow}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-lg text-muted-foreground">
                  {description}
                </p>
              )}
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
