"use client";

import { useVoiceCapture } from "@/lib/mobile-prototype/use-voice-capture";
import {
  CAPTURE_VOICE_LABEL,
  CAPTURE_VOICE_LISTENING,
} from "@/lib/mobile-prototype/sync-voice";

type CaptureVoiceButtonProps = {
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export function CaptureVoiceButton({
  onInterimTranscript,
  onFinalTranscript,
  onError,
  disabled = false,
}: CaptureVoiceButtonProps) {
  const { supported, listening, toggle } = useVoiceCapture({
    onInterimTranscript,
    onFinalTranscript,
    onError,
  });

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      className={`sync-brief-capture-voice${listening ? " sync-brief-capture-voice--listening" : ""}`}
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? CAPTURE_VOICE_LISTENING : CAPTURE_VOICE_LABEL}
      aria-pressed={listening}
    >
      <span className="sync-brief-capture-voice-icon" aria-hidden="true">
        {listening ? "◉" : "◯"}
      </span>
    </button>
  );
}
