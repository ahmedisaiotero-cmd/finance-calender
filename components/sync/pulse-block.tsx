import type { SyncPulse } from "@/lib/sync-pulse";
import { cn } from "@/lib/utils";

import { Pulse, pulseFromSync } from "@/components/sync/pulse";

type PulseBlockProps = {
  pulse: SyncPulse;
  className?: string;
};

/** @deprecated Prefer `<Pulse />` with explicit props. */
export function PulseBlock({ pulse, className }: PulseBlockProps) {
  return <Pulse {...pulseFromSync(pulse)} className={className} />;
}
