"use client";

import { useEffect, useState } from "react";

import { LifeProfileScreen } from "@/components/mobile-prototype/life-profile-screen";
import {
  MobileTabBar,
  type MobileTab,
} from "@/components/mobile-prototype/mobile-tab-bar";
import { MemoryScreen } from "@/components/mobile-prototype/memory-screen";
import { OnboardingFlow } from "@/components/mobile-prototype/onboarding-flow";
import { SyncBrandMark } from "@/components/mobile-prototype/sync-ui";
import { TodayScreen } from "@/components/mobile-prototype/today-screen";
import { loadProfileDisplayName } from "@/lib/mobile-prototype/build-daily-brief";
import { isOnboardingComplete } from "@/lib/mobile-prototype/life-profile";

type AppView = "onboarding" | "app" | "life";

type SyncMobileAppProps = {
  initialTab?: MobileTab;
};

export function SyncMobileApp({ initialTab = "today" }: SyncMobileAppProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>(initialTab);
  const [view, setView] = useState<AppView>("app");
  const [mounted, setMounted] = useState(false);
  const [lifeLinkLabel, setLifeLinkLabel] = useState("My Life");

  useEffect(() => {
    setMounted(true);
    setView(isOnboardingComplete() ? "app" : "onboarding");
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (view === "app" || view === "life") {
      setLifeLinkLabel(loadProfileDisplayName() ?? "My Life");
    }
  }, [mounted, view]);

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
      <div className="mobile-prototype sync-app sync-app--onboarding" data-theme="dark">
        <div className="mobile-prototype-shell">
          <OnboardingFlow onComplete={() => setView("app")} />
        </div>
      </div>
    );
  }

  if (view === "life") {
    return (
      <div className="mobile-prototype sync-app" data-theme="dark">
        <div className="mobile-prototype-shell">
          <LifeProfileScreen onClose={() => setView("app")} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="mobile-prototype sync-app"
      data-theme="dark"
      data-tab={activeTab}
    >
      <div className="mobile-prototype-shell">
        <header
          className="sync-app-header mobile-prototype-pad-x"
          data-brief={activeTab === "today" ? "true" : undefined}
        >
          <SyncBrandMark size="sm" />
          <button
            type="button"
            onClick={() => setView("life")}
            className={`sync-life-link${lifeLinkLabel !== "My Life" ? " sync-life-link--name" : ""}`}
          >
            {lifeLinkLabel}
          </button>
        </header>

        <div className="sync-app-screen">
          <main className="sync-app-main">
            {activeTab === "today" && <TodayScreen />}
            {activeTab === "memory" && <MemoryScreen />}
          </main>

          <MobileTabBar active={activeTab} onChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
