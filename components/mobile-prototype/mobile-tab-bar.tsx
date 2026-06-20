"use client";

type MobileTab = "today" | "memory";

type MobileTabBarProps = {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
};

const TABS: { id: MobileTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "memory", label: "Memory" },
];

export function MobileTabBar({ active, onChange }: MobileTabBarProps) {
  return (
    <nav className="sync-tab-bar" aria-label="Sync navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="sync-tab-bar-item"
          data-active={active === tab.id}
          aria-current={active === tab.id ? "page" : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export type { MobileTab };
