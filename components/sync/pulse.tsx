"use client";

import type { PulseSignal, PulseState, SyncPulse } from "@/lib/sync-pulse";
import { cn } from "@/lib/utils";

export type PulseProps = {
  state: PulseState;
  title: string;
  message: string;
  contributingSignals?: PulseSignal[];
  className?: string;
};

export function Pulse({
  state,
  title,
  message,
  contributingSignals,
  className,
}: PulseProps) {
  const contentKey = `${state}-${title}-${message.slice(0, 32)}`;

  return (
    <div
      className={cn("sync-pulse", className)}
      data-state={state}
      aria-label={`${title}. ${message}`}
      aria-live="polite"
      data-signals={
        contributingSignals?.length
          ? contributingSignals.map((s) => s.key).join(",")
          : undefined
      }
    >
      <div key={contentKey} className="sync-pulse-content">
        <div className="sync-pulse-head">
          <span className="sync-pulse-live" aria-hidden />
          <p className="sync-pulse-title">{title}</p>
        </div>
        <p className="sync-pulse-message">{message}</p>
      </div>
    </div>
  );
}

/** Spread a resolved SyncPulse into Pulse props. */
export function pulseFromSync(pulse: SyncPulse): PulseProps {
  return {
    state: pulse.state,
    title: pulse.title,
    message: pulse.message,
    contributingSignals: pulse.contributingSignals,
  };
}
