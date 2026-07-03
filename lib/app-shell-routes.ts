import { SYNC_PRODUCT } from "@/lib/sync-copy";

export type ShellLayout = "default" | "home" | "workspace";

export type AppShellRouteConfig = {
  layout: ShellLayout;
  title: string;
  description?: string;
};

const BRIEF_HOME: AppShellRouteConfig = {
  layout: "home",
  title: "Brief",
};

const WORKSPACE_LAYOUT: AppShellRouteConfig = {
  layout: "workspace",
  title: SYNC_PRODUCT.name,
};

export const APP_SHELL_ROUTES: Record<string, AppShellRouteConfig> = {
  "/": BRIEF_HOME,
  "/chat": { layout: "default", title: "Chat", description: "Curious, not pushy." },
  "/life": {
    layout: "default",
    title: "Life",
    description: "Calendar, money, and health when you want more context.",
  },
  "/calendar": WORKSPACE_LAYOUT,
  "/finance": WORKSPACE_LAYOUT,
  "/health": WORKSPACE_LAYOUT,
  "/fitness": WORKSPACE_LAYOUT,
  "/work": WORKSPACE_LAYOUT,
  "/relationships": WORKSPACE_LAYOUT,
  "/family": WORKSPACE_LAYOUT,
  "/school": WORKSPACE_LAYOUT,
  "/goals": WORKSPACE_LAYOUT,
  "/settings": {
    layout: "default",
    title: "Settings",
    description: "Manage how Sync connects to the tools you already use.",
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
