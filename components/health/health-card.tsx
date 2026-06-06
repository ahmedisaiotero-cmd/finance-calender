import { SurfaceCard } from "@/components/ui/surface-card";
import { cn } from "@/lib/utils";

type HealthCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
};

export function HealthCard({
  children,
  className,
  as: Tag = "section",
}: HealthCardProps) {
  return (
    <SurfaceCard as={Tag} className={cn("p-5 sm:p-6", className)}>
      {children}
    </SurfaceCard>
  );
}
