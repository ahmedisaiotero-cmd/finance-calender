import { SyncLogoMark } from "@/components/brand/sync-logo-mark";
import { cn } from "@/lib/utils";

const containerBase = [
  "relative flex shrink-0 items-center justify-center overflow-hidden",
  "rounded-[14px]",
  "bg-[linear-gradient(145deg,#faf9f7_0%,#ede9fe_32%,#ffedd5_58%,#ecfccb_100%)]",
  "shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_16px_rgba(139,92,246,0.12)]",
  "ring-1 ring-black/[0.06] dark:ring-white/10",
  "transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
  "hover:scale-[1.03] active:scale-[0.97]",
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
  "before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_55%)]",
];

const sizes = {
  sm: { box: "size-8 rounded-lg", mark: "size-[17px]" },
  md: { box: "size-10", mark: "size-[22px]" },
} as const;

type SyncLogoProps = {
  size?: keyof typeof sizes;
  className?: string;
};

export function SyncLogo({ size = "md", className }: SyncLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn(containerBase, s.box, className)}>
      <SyncLogoMark className={cn("relative z-[1]", s.mark)} />
    </div>
  );
}
