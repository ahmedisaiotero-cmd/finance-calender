"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: {
    isFinal: boolean;
    0: { transcript: string };
  };
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function isVoiceCaptureSupported(): boolean {
  return getSpeechRecognitionCtor() != null;
}

export type UseVoiceCaptureOptions = {
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onError?: (message: string) => void;
};

export function useVoiceCapture(options: UseVoiceCaptureOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => isVoiceCaptureSupported());

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      optionsRef.current.onError?.("Voice capture isn't available in this browser.");
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      const draft = (finalText || interim).trim();
      if (draft) {
        optionsRef.current.onInterimTranscript?.(draft);
      }

      if (finalText.trim()) {
        optionsRef.current.onFinalTranscript(finalText.trim());
        stop();
      }
    };

    recognition.onerror = () => {
      setListening(false);
      optionsRef.current.onError?.("Sync couldn't hear that. Try again or type it.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      optionsRef.current.onError?.("Voice capture couldn't start. Try again.");
      setListening(false);
    }
  }, [stop]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    start();
  }, [listening, start, stop]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  return {
    supported,
    listening,
    start,
    stop,
    toggle,
  };
}
