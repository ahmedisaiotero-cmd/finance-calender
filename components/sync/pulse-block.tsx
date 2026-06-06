import type { SyncPulse } from "@/lib/sync-pulse";
import { cn } from "@/lib/utils";

type PulseBlockProps = {
  pulse: SyncPulse;
  className?: string;
};

const KIND_ACCENT: Record<SyncPulse["kind"], string> = {
  steady: "text-income/85",
  refocus: "text-muted-foreground/75",
  "building-momentum": "text-income/90",
  recover: "text-muted-foreground/80",
};

export function PulseBlock({ pulse, className }: PulseBlockProps) {
  return (
    <section
      className={cn("rounded-lg border border-border/35 px-5 py-5 sm:px-6", className)}
      aria-label={`Pulse: ${pulse.label}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/55">
        Pulse
      </p>
      <p
        className={cn(
          "mt-2 text-[15px] font-medium tracking-[-0.02em]",
          KIND_ACCENT[pulse.kind],
        )}
      >
        {pulse.label}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed tracking-[-0.01em] text-muted-foreground/75">
        {pulse.message}
      </p>
    </section>
  );
}
