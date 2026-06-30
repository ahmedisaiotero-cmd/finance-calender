"use client";

import { useEffect, useState, type ReactNode } from "react";

const PREVIEW_QUERY_PARAM = "sync-device-preview";
const FRAME_QUERY_VALUE = "frame";
const BROWSER_VIEW_VALUES = new Set(["0", "false", "off", "browser"]);

type DevDevicePreviewProps = {
  children: ReactNode;
};

type PreviewState =
  | { mode: "loading" }
  | { mode: "browser" }
  | { mode: "device"; src: string };

export function DevDevicePreview({ children }: DevDevicePreviewProps) {
  const [previewState, setPreviewState] = useState<PreviewState>({
    mode: "loading",
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const previewMode = url.searchParams.get(PREVIEW_QUERY_PARAM);

    if (
      previewMode === FRAME_QUERY_VALUE ||
      BROWSER_VIEW_VALUES.has(previewMode ?? "")
    ) {
      setPreviewState({ mode: "browser" });
      return;
    }

    url.searchParams.set(PREVIEW_QUERY_PARAM, FRAME_QUERY_VALUE);
    setPreviewState({
      mode: "device",
      src: `${url.pathname}${url.search}${url.hash}`,
    });
  }, []);

  if (process.env.NODE_ENV !== "development" || previewState.mode === "browser") {
    return <>{children}</>;
  }

  if (previewState.mode === "loading") {
    return null;
  }

  return (
    <div className="dev-device-preview" data-sync-device-preview>
      <div className="dev-device-preview__device" aria-label="Mobile device preview">
        <div className="dev-device-preview__screen">
          <iframe
            className="dev-device-preview__viewport"
            src={previewState.src}
            title="Sync mobile device preview"
          />
        </div>
      </div>
    </div>
  );
}
