"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronUp, LogOut, Moon, Sun } from "lucide-react";

import {
  isUtilityNavItemActive,
  useUtilityNavHash,
  utilityNavItems,
} from "@/components/dashboard/sidebar-utility-nav";
import { UserProfile } from "@/components/dashboard/user-profile";
import { useTheme } from "@/components/theme-provider";
import type { OptionalAreaItem } from "@/lib/user-life-areas";
import { cn } from "@/lib/utils";

type SyncOptionsMenuProps = {
  variant?: "dropdown" | "panel";
  optionalAreas?: OptionalAreaItem[];
  onNavigate?: () => void;
  className?: string;
};

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sync-options-section">
      <h3 className="sync-options-section-label">{title}</h3>
      <div className="sync-options-section-items">{children}</div>
    </section>
  );
}

function MenuLink({
  href,
  label,
  description,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  description?: string;
  isActive?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn("sync-options-item", isActive && "sync-options-item--active")}
    >
      <span className="sync-options-item-label">{label}</span>
      {description ? (
        <span className="sync-options-item-description">{description}</span>
      ) : null}
    </Link>
  );
}

function MenuButton({
  label,
  description,
  icon: Icon,
  onClick,
}: {
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="sync-options-item">
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {Icon ? (
          <Icon className="size-3.5 shrink-0 opacity-50" strokeWidth={1.75} />
        ) : null}
        <span className="min-w-0 text-left">
          <span className="sync-options-item-label">{label}</span>
          {description ? (
            <span className="sync-options-item-description">{description}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function SyncOptionsMenuContent({
  optionalAreas = [],
  onNavigate,
}: Pick<SyncOptionsMenuProps, "optionalAreas" | "onNavigate">) {
  const { pathname, hash } = useUtilityNavHash();
  const { theme, toggleTheme, mounted } = useTheme();
  const settingsItem = utilityNavItems[0];
  const connectionsItem = utilityNavItems[1];

  const appearanceLabel =
    mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div className="sync-options-menu">
      <MenuSection title="Account">
        <MenuLink
          href="/settings"
          label="Profile"
          description="Your account details"
          isActive={pathname === "/settings" && hash === ""}
          onNavigate={onNavigate}
        />
        <MenuButton
          label="Sign out"
          icon={LogOut}
          onClick={() => {}}
        />
      </MenuSection>

      <MenuSection title="App">
        <MenuButton
          label="Appearance"
          description={appearanceLabel}
          icon={mounted && theme === "dark" ? Sun : Moon}
          onClick={() => {
            toggleTheme();
          }}
        />
        <MenuLink
          href={settingsItem.href}
          label={settingsItem.label}
          description="Preferences and life areas"
          isActive={isUtilityNavItemActive(settingsItem, pathname, hash)}
          onNavigate={onNavigate}
        />
      </MenuSection>

      <MenuSection title="Connections">
        <MenuLink
          href={connectionsItem.href}
          label={connectionsItem.label}
          description="Manage connected tools"
          isActive={isUtilityNavItemActive(connectionsItem, pathname, hash)}
          onNavigate={onNavigate}
        />
        {optionalAreas.map((area) => (
          <Link
            key={area.id}
            href={area.href}
            onClick={onNavigate}
            className="sync-options-item sync-options-item--secondary"
          >
            <span className="sync-options-item-label">
              {area.label}
              <span className="text-muted-foreground/45"> — Connect</span>
            </span>
          </Link>
        ))}
      </MenuSection>
    </div>
  );
}

export function SyncOptionsMenu({
  variant = "panel",
  optionalAreas = [],
  onNavigate,
  className,
}: SyncOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "dropdown" || !open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, variant]);

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  if (variant === "panel") {
    return (
      <div className={cn("sync-options-panel", className)}>
        <SyncOptionsMenuContent
          optionalAreas={optionalAreas}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="sync-options-trigger group w-full rounded-xl border border-transparent text-left transition-colors hover:border-border/30 hover:bg-foreground/[0.03]"
      >
        <UserProfile variant="minimal" showThemeToggle={false} />
        <ChevronUp
          className={cn(
            "absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/45 transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Sync options"
          className="sync-options-dropdown absolute bottom-full left-0 right-0 z-50 mb-2"
        >
          <SyncOptionsMenuContent
            optionalAreas={optionalAreas}
            onNavigate={handleNavigate}
          />
        </div>
      ) : null}
    </div>
  );
}
