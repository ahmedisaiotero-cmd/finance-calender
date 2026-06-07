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
  "/fitness": { layout: "health", title: "Health" },
  "/settings": {
    layout: "default",
    title: "Settings",
    description: "Manage how Sync connects to the tools you already use.",
  },
  "/goals": {
    layout: "default",
    title: "Goals",
    description:
      "What you are working toward — when this area is active for you.",
  },
  "/work": {
    layout: "default",
    title: "Work",
    description:
      "Signals from your work tools — when this area is active for you.",
  },
  "/school": {
    layout: "default",
    title: "School",
    description:
      "Signals from your academic tools — when this area is active for you.",
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
