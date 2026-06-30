"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const PREVIEW_QUERY_PARAM = "sync-device-preview";
const FRAME_QUERY_VALUE = "frame";
const BROWSER_VIEW_VALUES = new Set(["0", "false", "off", "browser"]);

type DevDevicePreviewProps = {
  children: ReactNode;
};

const subscribe = () => () => {};

function getServerSnapshot() {
  return "loading";
}

function getPreviewSnapshot() {
  const url = new URL(window.location.href);
  const previewMode = url.searchParams.get(PREVIEW_QUERY_PARAM);

  if (
    previewMode === FRAME_QUERY_VALUE ||
    BROWSER_VIEW_VALUES.has(previewMode ?? "")
  ) {
    return "browser";
  }

  url.searchParams.set(PREVIEW_QUERY_PARAM, FRAME_QUERY_VALUE);
  return `device:${url.pathname}${url.search}${url.hash}`;
}

export function DevDevicePreview({ children }: DevDevicePreviewProps) {
  const previewSnapshot = useSyncExternalStore(
    subscribe,
    getPreviewSnapshot,
    getServerSnapshot,
  );

  if (process.env.NODE_ENV !== "development" || previewSnapshot === "browser") {
    return <>{children}</>;
  }

  if (previewSnapshot === "loading") {
    return null;
  }

  return (
    <div className="dev-device-preview" data-sync-device-preview>
      <div className="dev-device-preview__device" aria-label="Mobile device preview">
        <div className="dev-device-preview__screen">
          <iframe
            className="dev-device-preview__viewport"
            src={previewSnapshot.replace(/^device:/, "")}
            title="Sync mobile device preview"
          />
        </div>
      </div>
    </div>
  );
}
