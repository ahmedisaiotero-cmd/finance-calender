"use client";

import { useEffect, useMemo, useState } from "react";

import { LifeAreaScreen } from "@/components/mobile-prototype/life-area-screen";
import { LifeTimelineScreen } from "@/components/mobile-prototype/life-timeline-screen";
import { SyncHomeFooter } from "@/components/mobile-prototype/sync-home-footer";
import { MyLifeScreen } from "@/components/mobile-prototype/my-life-screen";
import { OnboardingFlow } from "@/components/mobile-prototype/onboarding-flow";
import { SyncBrandMark } from "@/components/mobile-prototype/sync-ui";
import { TodayScreen } from "@/components/mobile-prototype/today-screen";
import { useCapturedItems } from "@/lib/captured-items";
import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildLifeDrilldownView } from "@/lib/mobile-prototype/build-life-drilldown";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import { resolveLifeScreenForTarget } from "@/lib/mobile-prototype/build-my-life";
import { isOnboardingComplete, loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import {
  DRILLDOWN_BACK,
  LIFE_AREA_BACK,
  LIFE_TIMELINE_BACK,
  MY_LIFE_TITLE,
} from "@/lib/mobile-prototype/sync-voice";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type AppView = "onboarding" | "app";

type LifeRoute =
  | { name: "today" }
  | { name: "my-life" }
  | {
      name: "timeline";
      target: LifeDrilldownTarget;
      from: "today" | "my-life";
    }
  | {
      name: "area";
      target: LifeDrilldownTarget;
      from: "today" | "my-life";
    };

export function SyncMobileApp() {
  const [view, setView] = useState<AppView>("app");
  const [mounted, setMounted] = useState(false);
  const [route, setRoute] = useState<LifeRoute>({ name: "today" });
  const { activeItems } = useCapturedItems();

  useEffect(() => {
    setMounted(true);
    setView(isOnboardingComplete() ? "app" : "onboarding");
  }, []);

  const reference = useMemo(() => new Date(), [activeItems.length, route.name]);

  const brief = useMemo(() => {
    if (!mounted) return { consequences: [] as NonNullable<ReturnType<typeof buildDailyBrief>["consequences"]> };
    return buildDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      lifeProfile: loadLifeProfile(),
      reference,
    });
  }, [mounted, activeItems, reference]);

  const consequences = brief.consequences ?? [];

  const openTarget = (target: LifeDrilldownTarget, from: "today" | "my-life") => {
    const screen = resolveLifeScreenForTarget(target);
    if (screen === "timeline") {
      setRoute({ name: "timeline", target, from });
      return;
    }
    setRoute({ name: "area", target, from });
  };

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

  if (route.name === "my-life") {
    return (
      <div className="mobile-prototype sync-app" data-theme="dark">
        <div className="mobile-prototype-shell">
          <div className="sync-app-screen">
            <MyLifeScreen
              onBack={() => setRoute({ name: "today" })}
              onOpenTarget={(target) => openTarget(target, "my-life")}
            />
          </div>
        </div>
      </div>
    );
  }

  if (route.name === "timeline") {
    const timelineView = buildLifeTimelineView({
      consequences,
      items: activeItems,
      reference,
      focusDayOffset: route.target.kind === "day" ? route.target.dayOffset : null,
      focusDateKey: route.target.dateKey,
    });

    return (
      <div className="mobile-prototype sync-app" data-theme="dark">
        <div className="mobile-prototype-shell">
          <div className="sync-app-screen">
            <LifeTimelineScreen
              view={timelineView}
              backLabel={route.from === "today" ? DRILLDOWN_BACK : LIFE_TIMELINE_BACK}
              onBack={() =>
                setRoute(route.from === "today" ? { name: "today" } : { name: "my-life" })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (route.name === "area") {
    const areaView = buildLifeDrilldownView(route.target, {
      items: activeItems,
      consequences,
      reference,
      backLabel: route.from === "today" ? DRILLDOWN_BACK : LIFE_AREA_BACK,
    });

    return (
      <div className="mobile-prototype sync-app" data-theme="dark">
        <div className="mobile-prototype-shell">
          <div className="sync-app-screen">
            <LifeAreaScreen
              view={areaView}
              onBack={() =>
                setRoute(route.from === "today" ? { name: "today" } : { name: "my-life" })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-prototype sync-app" data-theme="dark" data-tab="today">
      <div className="mobile-prototype-shell">
        <header className="sync-app-header mobile-prototype-pad-x" data-brief="true">
          <SyncBrandMark size="sm" />
          <button
            type="button"
            onClick={() => setRoute({ name: "my-life" })}
            className="sync-life-link"
          >
            {MY_LIFE_TITLE}
          </button>
        </header>

        <div className="sync-app-screen">
          <main className="sync-app-main">
            <TodayScreen onOpenTarget={(target) => openTarget(target, "today")} />
          </main>

          <SyncHomeFooter />
        </div>
      </div>
    </div>
  );
}
