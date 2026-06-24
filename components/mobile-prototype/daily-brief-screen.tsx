"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import { captureFromBriefInput, formatCaptureAcknowledgment } from "@/lib/mobile-prototype/capture-brief-input";
import {
  buildDailyBrief,
  formatBriefDate,
  greetingForHour,
  loadPreferredName,
  type BriefSection,
} from "@/lib/mobile-prototype/build-daily-brief";
import {
  briefParagraphKey,
  briefSectionKey,
} from "@/lib/mobile-prototype/brief-render-keys";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type ThemeMode = "light" | "dark";

function BriefPassage({
  section,
  sectionIndex,
}: {
  section: BriefSection;
  sectionIndex: number;
}) {
  return (
    <div className="daily-brief-passage">
      {section.label && (
        <p className="daily-brief-whisper">{section.label}</p>
      )}
      {section.paragraphs.map((paragraph, index) => (
        <p
          key={briefParagraphKey(section, sectionIndex, index)}
          className="daily-brief-paragraph"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function DailyBriefScreen() {
  const {
    activeItems,
    addCapturedItem,
    updateCapturedItem,
    softDeleteCapturedItem,
  } = useCapturedItems();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [captureInput, setCaptureInput] = useState("");
  const [recentNote, setRecentNote] = useState<string | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const brief = useMemo(() => {
    if (!mounted) {
      return {
        userName: null,
        lede: "Loading your briefing...",
        sections: [],
        isEmpty: true,
      };
    }

    return buildDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      userName: loadPreferredName(),
    });
  }, [mounted, activeItems]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return greetingForHour(hour, brief.userName);
  }, [brief.userName]);

  const dateLabel = useMemo(() => formatBriefDate(), []);

  const handleCapture = () => {
    const trimmed = captureInput.trim();
    if (!trimmed) return;

    const captured = captureFromBriefInput(
      trimmed,
      {
        items: activeItems,
        workSchedule: loadActiveWorkSchedule() ?? null,
      },
      {
        addCapturedItem,
        updateCapturedItem,
        softDeleteCapturedItem,
      },
    );

    if (captured) {
      addCapturedItem(captured.plan, captured.destinations, captured.title, {
        meaning: captured.meaning,
      });
      setRecentNote(formatCaptureAcknowledgment(captured));
    } else {
      setRecentNote("Add when or what this is about so Sync can remember it.");
    }

    setCaptureInput("");
  };

  return (
    <div className="mobile-prototype daily-brief" data-theme={theme}>
      <button
        type="button"
        onClick={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
        className="daily-brief-theme"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <div className="mobile-prototype-shell">
        <div className="daily-brief-screen">
          <article className="daily-brief-scroll mobile-prototype-pad-x">
            <time className="daily-brief-date" dateTime={new Date().toISOString()}>
              {dateLabel}
            </time>

            <h1 className="daily-brief-greeting mobile-prototype-display">
              {greeting}
            </h1>

            <p className="daily-brief-lede">{brief.lede}</p>

            {brief.sections.map((section, index) => (
              <BriefPassage
                key={briefSectionKey(section, index)}
                section={section}
                sectionIndex={index}
              />
            ))}

            {recentNote && (
              <p className="daily-brief-note">{recentNote}</p>
            )}
          </article>

          <footer className="daily-brief-capture mobile-prototype-pad-x">
            <input
              id="brief-capture"
              type="text"
              value={captureInput}
              onChange={(event) => setCaptureInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleCapture();
              }}
              placeholder="What's on your mind?"
              aria-label="What's on your mind?"
              className="daily-brief-input"
            />
          </footer>
        </div>
      </div>
    </div>
  );
}
