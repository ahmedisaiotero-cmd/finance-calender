/** How the user entered capture text — same pipeline for both. */
export type CaptureSource = "typed" | "voice";

/** Unified capture input: typing and voice both resolve to text + optional metadata. */
export type SyncCaptureInput = {
  text: string;
  source?: CaptureSource;
  /** Raw speech transcript when source is voice. */
  transcript?: string;
};

export type CaptureSourceMetadata = {
  captureSource: CaptureSource;
  voiceTranscript?: string;
};

export function resolveCaptureText(input: SyncCaptureInput | string): string {
  return (typeof input === "string" ? input : input.text).trim();
}

export function captureSourceMetadata(
  input: SyncCaptureInput | string,
): CaptureSourceMetadata {
  if (typeof input === "string") {
    return { captureSource: "typed" };
  }

  const source = input.source ?? "typed";
  return {
    captureSource: source,
    voiceTranscript:
      source === "voice" ? (input.transcript ?? input.text).trim() : undefined,
  };
}

export function toSyncCaptureInput(
  text: string,
  metadata?: CaptureSourceMetadata,
): SyncCaptureInput {
  if (!metadata || metadata.captureSource === "typed") {
    return { text };
  }

  return {
    text,
    source: "voice",
    transcript: metadata.voiceTranscript ?? text,
  };
}
