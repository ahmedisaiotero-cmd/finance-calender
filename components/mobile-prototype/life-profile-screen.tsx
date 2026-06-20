"use client";

import { useState } from "react";

import {
  OnboardingShell,
  SyncBrandMark,
  SyncChipGrid,
  SyncGhostButton,
  SyncPrimaryButton,
  SyncTextField,
} from "@/components/mobile-prototype/sync-ui";
import { useCapturedItems } from "@/lib/captured-items";
import { applyLifeProfile } from "@/lib/mobile-prototype/apply-life-profile";
import {
  AWARENESS_OPTIONS,
  loadLifeProfile,
  PRIORITY_OPTIONS,
  toggleProfileChip,
  type LifeProfile,
} from "@/lib/mobile-prototype/life-profile";
import {
  LIFE_AWARENESS_LABEL,
  LIFE_BACK,
  LIFE_CLOSE,
  LIFE_COMING_UP_LABEL,
  LIFE_COMING_UP_PLACEHOLDER,
  LIFE_NAME_LABEL,
  LIFE_NAME_PLACEHOLDER,
  LIFE_PRIORITIES_LABEL,
  LIFE_SAVE,
  LIFE_SAVED,
  LIFE_SUBTITLE,
  LIFE_TITLE,
  LIFE_WEEK_LABEL,
  LIFE_WEEK_PLACEHOLDER,
} from "@/lib/mobile-prototype/sync-voice";

type LifeProfileScreenProps = {
  onClose: () => void;
};

export function LifeProfileScreen({ onClose }: LifeProfileScreenProps) {
  const { activeItems, addCapturedItem } = useCapturedItems();
  const [profile, setProfile] = useState<LifeProfile>(() => loadLifeProfile());
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<LifeProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const handleSave = () => {
    applyLifeProfile(
      { ...profile, onboardingComplete: true },
      { items: activeItems, addCapturedItem },
    );
    setSaved(true);
  };

  return (
    <div className="sync-life-screen">
      <div className="sync-screen-scroll mobile-prototype-pad-x">
        <header className="sync-life-header">
          <button type="button" onClick={onClose} className="sync-life-back">
            {LIFE_BACK}
          </button>
          <SyncBrandMark size="sm" />
          <h1 className="sync-life-title mobile-prototype-display">{LIFE_TITLE}</h1>
          <p className="sync-life-subtitle">{LIFE_SUBTITLE}</p>
        </header>

        <section className="sync-life-section">
          <label className="sync-life-label" htmlFor="life-name">
            {LIFE_NAME_LABEL}
          </label>
          <SyncTextField
            value={profile.name}
            onChange={(value) => update({ name: value })}
            placeholder={LIFE_NAME_PLACEHOLDER}
          />
        </section>

        <section className="sync-life-section">
          <label className="sync-life-label" htmlFor="life-week">
            {LIFE_WEEK_LABEL}
          </label>
          <SyncTextField
            multiline
            value={profile.typicalWeek}
            onChange={(value) => update({ typicalWeek: value })}
            placeholder={LIFE_WEEK_PLACEHOLDER}
          />
        </section>

        <section className="sync-life-section">
          <p className="sync-life-label">{LIFE_PRIORITIES_LABEL}</p>
          <SyncChipGrid
            options={PRIORITY_OPTIONS}
            selected={profile.priorities}
            onToggle={(value) =>
              update({
                priorities: toggleProfileChip(profile.priorities, value),
              })
            }
          />
        </section>

        <section className="sync-life-section">
          <p className="sync-life-label">{LIFE_AWARENESS_LABEL}</p>
          <SyncChipGrid
            options={AWARENESS_OPTIONS}
            selected={profile.awareness}
            onToggle={(value) =>
              update({
                awareness: toggleProfileChip(profile.awareness, value),
              })
            }
          />
        </section>

        <section className="sync-life-section">
          <label className="sync-life-label" htmlFor="life-coming-up">
            {LIFE_COMING_UP_LABEL}
          </label>
          <SyncTextField
            multiline
            value={profile.comingUp}
            onChange={(value) => update({ comingUp: value })}
            placeholder={LIFE_COMING_UP_PLACEHOLDER}
          />
        </section>

        {saved && (
          <p className="sync-life-saved" role="status">
            {LIFE_SAVED}
          </p>
        )}
      </div>

      <footer className="sync-life-footer mobile-prototype-pad-x">
        <SyncPrimaryButton onClick={handleSave}>{LIFE_SAVE}</SyncPrimaryButton>
        <div className="sync-life-footer-secondary">
          <SyncGhostButton onClick={onClose}>{LIFE_CLOSE}</SyncGhostButton>
        </div>
      </footer>
    </div>
  );
}
