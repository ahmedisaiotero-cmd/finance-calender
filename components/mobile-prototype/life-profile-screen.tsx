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
            Back
          </button>
          <SyncBrandMark size="sm" />
          <h1 className="sync-life-title mobile-prototype-display">My Life</h1>
          <p className="sync-life-subtitle">
            What I know about you. Correct anything here.
          </p>
        </header>

        <section className="sync-life-section">
          <label className="sync-life-label" htmlFor="life-name">
            What I call you
          </label>
          <SyncTextField
            value={profile.name}
            onChange={(value) => update({ name: value })}
            placeholder="Your first name"
          />
        </section>

        <section className="sync-life-section">
          <label className="sync-life-label" htmlFor="life-week">
            Typical week
          </label>
          <SyncTextField
            multiline
            value={profile.typicalWeek}
            onChange={(value) => update({ typicalWeek: value })}
            placeholder="I work Sunday through Wednesday from 11 AM to 9 PM."
          />
        </section>

        <section className="sync-life-section">
          <p className="sync-life-label">What matters most right now</p>
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
          <p className="sync-life-label">Stay aware of</p>
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
            Important coming up
          </label>
          <SyncTextField
            multiline
            value={profile.comingUp}
            onChange={(value) => update({ comingUp: value })}
            placeholder={"Mom's birthday June 22.\nPayday Friday."}
          />
        </section>

        {saved && (
          <p className="sync-life-saved" role="status">
            Saved. I&apos;ll use this in future briefings.
          </p>
        )}
      </div>

      <footer className="sync-life-footer mobile-prototype-pad-x">
        <SyncPrimaryButton onClick={handleSave}>Save</SyncPrimaryButton>
        <div className="sync-life-footer-secondary">
          <SyncGhostButton onClick={onClose}>Close</SyncGhostButton>
        </div>
      </footer>
    </div>
  );
}
