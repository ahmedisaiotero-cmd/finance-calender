"use client";

import { useMemo } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";

type ThemeMode = "dark" | "light";

type SettingsScreenProps = {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
};

export function SettingsScreen({ theme, onThemeChange }: SettingsScreenProps) {
  const { activeItems } = useCapturedItems();
  const profile = useMemo(() => loadLifeProfile(), []);

  return (
    <article className="sync-ws-screen sync-ws-screen--settings">
      <header className="sync-ws-header">
        <h1 className="sync-ws-title">Settings</h1>
        <p className="sync-ws-subtitle">Minimal controls only.</p>
      </header>

      <section className="sync-ws-settings-group">
        <h2 className="sync-ws-settings-heading">Profile</h2>
        <p className="sync-ws-settings-line">
          Name: <strong>{profile.name.trim() || "Not set yet"}</strong>
        </p>
        <p className="sync-ws-settings-line">Saved memory items: {activeItems.length}</p>
      </section>

      <section className="sync-ws-settings-group">
        <h2 className="sync-ws-settings-heading">Appearance</h2>
        <div className="sync-ws-settings-toggle">
          <button
            type="button"
            onClick={() => onThemeChange("dark")}
            className="sync-ws-settings-button"
            data-active={theme === "dark"}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => onThemeChange("light")}
            className="sync-ws-settings-button"
            data-active={theme === "light"}
          >
            Light
          </button>
        </div>
      </section>

      <section className="sync-ws-settings-group">
        <h2 className="sync-ws-settings-heading">Integrations</h2>
        <p className="sync-ws-settings-muted">
          Optional sources will live here when enabled safely with user approval.
        </p>
      </section>

      <section className="sync-ws-settings-group">
        <h2 className="sync-ws-settings-heading">Memory and Privacy</h2>
        <p className="sync-ws-settings-muted">
          Edit, export, and delete controls can be expanded here without changing core behavior.
        </p>
      </section>
    </article>
  );
}
