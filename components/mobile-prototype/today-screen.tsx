"use client";

import { useEffect, useMemo, useState } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import {
  attemptBriefCapture,
  formatCaptureAcknowledgment,
} from "@/lib/mobile-prototype/capture-brief-input";
import {
  buildDailyBrief,
  formatBriefDate,
  greetingForHour,
  type BriefSection,
} from "@/lib/mobile-prototype/build-daily-brief";
import {
  briefParagraphKey,
  briefSectionKey,
} from "@/lib/mobile-prototype/brief-render-keys";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import {
  BRIEF_LOADING,
  CAPTURE_FOLLOWUP_PLACEHOLDER,
  CAPTURE_PLACEHOLDER,
  CAPTURE_PROMPT,
  CAPTURE_REMEMBER,
} from "@/lib/mobile-prototype/sync-voice";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

function BriefPassage({
  section,
  sectionIndex,
}: {
  section: BriefSection;
  sectionIndex: number;
}) {
  return (
    <div
      className={`sync-brief-passage${section.id === "noticing" ? " sync-brief-passage--soon" : ""}`}
    >
      {section.label && <p className="sync-brief-whisper">{section.label}</p>}
      {section.paragraphs.map((paragraph, index) => (
        <p
          key={briefParagraphKey(section, sectionIndex, index)}
          className="sync-brief-paragraph"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

type ClientClock = {
  dateTime: string;
  dateLabel: string;
  greeting: string;
};

export function TodayScreen() {
  const {
    activeItems,
    addCapturedItem,
    updateCapturedItem,
    softDeleteCapturedItem,
  } = useCapturedItems();
  const [mounted, setMounted] = useState(false);
  const [clientClock, setClientClock] = useState<ClientClock | null>(null);
  const [input, setInput] = useState("");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<{
    message: string;
    suggestions: string[];
  } | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const brief = useMemo(() => {
    if (!mounted) {
      return {
        userName: null,
        lede: BRIEF_LOADING,
        sections: [],
        isEmpty: true,
      };
    }

    return buildDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      lifeProfile: loadLifeProfile(),
    });
  }, [mounted, activeItems]);

  useEffect(() => {
    if (!mounted) return;

    const now = new Date();
    setClientClock({
      dateTime: now.toISOString(),
      dateLabel: formatBriefDate(now),
      greeting: greetingForHour(now.getHours()),
    });
  }, [mounted]);

  useEffect(() => {
    if (!confirmation) return;
    const timer = window.setTimeout(() => setConfirmation(null), 6000);
    return () => window.clearTimeout(timer);
  }, [confirmation]);

  const submitCapture = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setCaptureNotice(null);

    const attempt = attemptBriefCapture(
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

    if (attempt.status === "empty") return;

    if (attempt.status === "too_vague") {
      setCaptureNotice(attempt.message);
      return;
    }

    if (attempt.status === "duplicate") {
      setCaptureNotice(attempt.message);
      setInput("");
      setDraftText(null);
      setFollowUp(null);
      return;
    }

    if (attempt.status === "saved") {
      setConfirmation(
        formatCaptureAcknowledgment(attempt.result, attempt.kind),
      );
      if (attempt.overlapNotice) {
        setCaptureNotice(attempt.overlapNotice);
      }
      setInput("");
      setDraftText(null);
      setFollowUp(null);
      return;
    }

    setDraftText(attempt.draftText);
    setFollowUp({
      message: attempt.message,
      suggestions: attempt.suggestions,
    });
    setInput("");
  };

  const applySuggestion = (suggestion: string) => {
    const base = draftText ?? input;
    if (!base.trim()) return;
    submitCapture(`${base.trim()} ${suggestion}`);
  };

  const handleSubmit = () => {
    if (followUp && draftText) {
      submitCapture(`${draftText} ${input}`.trim());
      return;
    }
    submitCapture(input);
  };

  return (
    <article className="sync-screen-scroll sync-brief-screen mobile-prototype-pad-x">
      <header className="sync-brief-head">
        {clientClock ? (
          <time className="sync-brief-date" dateTime={clientClock.dateTime}>
            {clientClock.dateLabel}
          </time>
        ) : (
          <p className="sync-brief-date" aria-hidden="true">
            &nbsp;
          </p>
        )}

        <h1 className="sync-brief-greeting mobile-prototype-display">
          {clientClock?.greeting ?? "Good day."}
        </h1>
      </header>

      {brief.isEmpty ? (
        <div className="sync-brief-empty">
          <p className="sync-brief-lede">{brief.lede}</p>
        </div>
      ) : (
        <div className="sync-brief-body">
          <p className="sync-brief-lede mobile-prototype-display">{brief.lede}</p>
          {brief.sections.map((section, index) => (
            <BriefPassage
              key={briefSectionKey(section, index)}
              section={section}
              sectionIndex={index}
            />
          ))}
        </div>
      )}

      <section className="sync-brief-capture" aria-label={CAPTURE_PROMPT}>
        <p className="sync-brief-capture-prompt">{CAPTURE_PROMPT}</p>

        <div className="sync-brief-capture-field">
          <textarea
            id="sync-brief-capture-input"
            aria-label={CAPTURE_PROMPT}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (captureNotice) setCaptureNotice(null);
            }}
            placeholder={
              followUp ? CAPTURE_FOLLOWUP_PLACEHOLDER : CAPTURE_PLACEHOLDER
            }
            rows={3}
            className="sync-brief-capture-input"
          />
        </div>

        {followUp && (
          <div className="sync-brief-capture-followup">
            <p className="sync-brief-capture-notice" role="status">
              {followUp.message}
            </p>
            {draftText && <p className="sync-capture-draft">&ldquo;{draftText}&rdquo;</p>}
            <div className="sync-capture-suggestions">
              {followUp.suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  className="sync-capture-chip"
                  onClick={() => applySuggestion(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {captureNotice && (
          <p className="sync-brief-capture-notice" role="status">
            {captureNotice}
          </p>
        )}

        {confirmation && (
          <p className="sync-brief-capture-confirmation" role="status">
            {confirmation}
          </p>
        )}

        <div className="sync-brief-capture-actions">
          <button
            type="button"
            className="sync-brief-capture-submit"
            disabled={!input.trim() && !(followUp && draftText)}
            onClick={handleSubmit}
          >
            {CAPTURE_REMEMBER}
          </button>
        </div>
      </section>
    </article>
  );
}
