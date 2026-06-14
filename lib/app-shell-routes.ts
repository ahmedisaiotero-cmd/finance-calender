import { SYNC_PRODUCT } from "@/lib/sync-copy";

export type ShellLayout =
  | "default"
  | "dashboard"
  | "wide"
  | "home"
  | "health"
  | "finance"
  | "calendar";

export type AppShellRouteConfig = {
  layout: ShellLayout;
  title: string;
  description?: string;
};

export const APP_SHELL_ROUTES: Record<string, AppShellRouteConfig> = {
  "/": { layout: "home", title: "Today" },
  "/calendar": { layout: "calendar", title: "Calendar" },
  "/finance": { layout: "finance", title: "Finance" },
  "/health": { layout: "health", title: "Health" },
  "/fitness": { layout: "health", title: "Health" },
  "/settings": {
    layout: "default",
    title: "Settings",
    description: "Manage how Sync connects to the tools you already use.",
  },
  "/goals": {
    layout: "home",
    title: "Goals",
  },
  "/work": {
    layout: "home",
    title: "Work",
  },
  "/relationships": {
    layout: "home",
    title: "Relationships",
  },
  "/school": {
    layout: "home",
    title: "School",
  },
};

export function getAppShellRoute(pathname: string): AppShellRouteConfig {
  return (
    APP_SHELL_ROUTES[pathname] ?? {
      layout: "default",
      title: SYNC_PRODUCT.name,
    }
  );
}
