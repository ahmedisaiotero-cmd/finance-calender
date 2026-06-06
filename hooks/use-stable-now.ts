"use client";

import { useMemo } from "react";

/** Stable reference date for the current render session (avoids exhaustive-deps churn). */
export function useStableNow() {
  return useMemo(() => new Date(), []);
}
