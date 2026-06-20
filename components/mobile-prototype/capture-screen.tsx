"use client";

import { useState } from "react";

import { SyncScreenBrand } from "@/components/mobile-prototype/sync-ui";
import { useCapturedItems } from "@/lib/captured-items";
import {
  attemptBriefCapture,
  formatCaptureAcknowledgment,
} from "@/lib/mobile-prototype/capture-brief-input";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type CaptureScreenProps = {
  onCaptured: (message: string) => void;
};

export function CaptureScreen({ onCaptured }: CaptureScreenProps) {
  const { activeItems, addCapturedItem } = useCapturedItems();
  const [input, setInput] = useState("");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<{
    message: string;
    suggestions: string[];
  } | null>(null);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const attempt = attemptBriefCapture(trimmed, {
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
    });

    if (attempt.status === "empty") return;

    if (attempt.status === "saved") {
      addCapturedItem(
        attempt.result.plan,
        attempt.result.destinations,
        attempt.result.title,
        { meaning: attempt.result.meaning },
      );
      onCaptured(formatCaptureAcknowledgment(attempt.result));
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
    submit(`${base.trim()} ${suggestion}`);
  };

  const handleSubmit = () => {
    if (followUp && draftText) {
      submit(`${draftText} ${input}`.trim());
      return;
    }
    submit(input);
  };

  return (
    <article className="sync-screen-scroll mobile-prototype-pad-x">
      <SyncScreenBrand />
      <header className="sync-screen-header">
        <h1 className="sync-screen-title mobile-prototype-display">Capture</h1>
        <p className="sync-screen-subtitle">
          Tell me what happened, or what is coming up.
        </p>
      </header>

      <div className="sync-capture-field">
        <label htmlFor="sync-capture-input" className="sync-capture-label">
          {followUp ? "When is this?" : "In your words"}
        </label>
        <textarea
          id="sync-capture-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            followUp
              ? "e.g. Friday, June 22, tomorrow..."
              : "I get paid Friday. Mom's birthday is June 22."
          }
          rows={followUp ? 2 : 4}
          className="sync-capture-textarea"
        />
      </div>

      {followUp && (
        <div className="sync-capture-followup">
          <p className="sync-capture-followup-message">{followUp.message}</p>
          {draftText && (
            <p className="sync-capture-draft">"{draftText}"</p>
          )}
          <div className="sync-capture-suggestions">
            {followUp.suggestions.map((suggestion) => (
              <button
                key={suggestion}
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

      <button
        type="button"
        className="sync-capture-submit"
        disabled={!input.trim() && !(followUp && draftText)}
        onClick={handleSubmit}
      >
        Remember this
      </button>
    </article>
  );
}
