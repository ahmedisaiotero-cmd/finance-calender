"use client";

import { SyncWorkspace } from "@/components/sync/sync-workspace";

/** @deprecated Use SyncWorkspace directly */
export function SyncDashboard() {
  return <SyncWorkspace activeLens="home" showInput />;
}
