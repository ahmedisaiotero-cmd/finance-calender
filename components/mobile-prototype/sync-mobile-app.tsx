"use client";

import { useState, useSyncExternalStore } from "react";

import { ConversationScreen } from "@/components/mobile-prototype/conversation-screen";
import { OnboardingFlow } from "@/components/mobile-prototype/onboarding-flow";
import { SettingsScreen } from "@/components/mobile-prototype/settings-screen";
import { SyncBrandMark } from "@/components/mobile-prototype/sync-ui";
import { UnderstandingScreen } from "@/components/mobile-prototype/understanding-screen";
import { WorkspaceTodayScreen } from "@/components/mobile-prototype/workspace-today-screen";
import { isOnboardingComplete } from "@/lib/mobile-prototype/life-profile";

type AppView = "onboarding" | "app";
type WorkspaceTab = "today" | "conversation" | "understanding" | "settings";
type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "sync.mobile.theme";

function persistThemePreference(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function tabLabel(tab: WorkspaceTab) {
  if (tab === "today") return "Today";
  if (tab === "conversation") return "Conversation";
  if (tab === "understanding") return "Understanding";
  return "Settings";
}

export function SyncMobileApp() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [viewOverride, setViewOverride] = useState<AppView | null>(null);
  const view =
    viewOverride ??
    (mounted ? (isOnboardingComplete() ? "app" : "onboarding") : "app");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("today");
  const [theme, setTheme] = useState<ThemeMode>("dark");

  if (!mounted) {
    return (
      <div className="mobile-prototype sync-app" data-theme="dark">
        <div className="mobile-prototype-shell">
          <div className="sync-app-screen sync-app-loading" />
        </div>
      </div>
    );
  }

  if (view === "onboarding") {
    return (
      <div className="mobile-prototype sync-app sync-app--onboarding" data-theme={theme}>
        <div className="mobile-prototype-shell">
          <OnboardingFlow onComplete={() => setViewOverride("app")} />
        </div>
      </div>
    );
  }
  const updateTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    persistThemePreference(nextTheme);
  };

  return (
    <div className="mobile-prototype sync-app" data-theme={theme} data-tab={activeTab}>
      <div className="mobile-prototype-shell">
        <header className="sync-ws-topbar">
          <SyncBrandMark size="sm" />
          <p className="sync-ws-topbar-label">{tabLabel(activeTab)}</p>
        </header>

        <main className="sync-ws-main">
          {activeTab === "today" && <WorkspaceTodayScreen />}
          {activeTab === "conversation" && <ConversationScreen />}
          {activeTab === "understanding" && <UnderstandingScreen />}
          {activeTab === "settings" && (
            <SettingsScreen theme={theme} onThemeChange={updateTheme} />
          )}
        </main>

        <footer className="sync-ws-nav">
          {(["today", "conversation", "understanding", "settings"] as WorkspaceTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className="sync-ws-nav-item"
              data-active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </footer>
      </div>
    </div>
  );
}
