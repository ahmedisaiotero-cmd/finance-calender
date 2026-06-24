"use client";

import { APP_IN_SYNC } from "@/lib/mobile-prototype/sync-voice";

export function SyncHomeFooter() {
  return (
    <footer className="sync-home-footer" aria-hidden="true">
      {APP_IN_SYNC}
    </footer>
  );
}
