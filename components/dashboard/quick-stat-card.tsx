import { SurfaceCard } from "@/components/ui/surface-card";
import { cn } from "@/lib/utils";

type QuickStatCardProps = {
  label: string;
  value: string;
  hint: string;
  className?: string;
};

export function QuickStatCard({
  label,
  value,
  hint,
  className,
}: QuickStatCardProps) {
  return (
    <SurfaceCard as="div" className={cn("p-5", className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </SurfaceCard>
  );
}
