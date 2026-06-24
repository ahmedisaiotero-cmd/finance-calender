"use client";

type MobileTab = "today";

type MobileTabBarProps = {
  active: MobileTab;
  onChange?: (tab: MobileTab) => void;
};

const TABS: { id: MobileTab; label: string }[] = [{ id: "today", label: "Today" }];

export function MobileTabBar({ active }: MobileTabBarProps) {
  return (
    <nav className="sync-tab-bar sync-tab-bar--single" aria-label="Sync navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="sync-tab-bar-item"
          data-active={active === tab.id}
          aria-current="page"
          disabled
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export type { MobileTab };
