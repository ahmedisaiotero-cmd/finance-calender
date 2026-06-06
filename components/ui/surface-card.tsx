import { cn } from "@/lib/utils";

type SurfaceCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "aside" | "div";
};

export function SurfaceCard({
  children,
  className,
  as: Tag = "section",
}: SurfaceCardProps) {
  return (
    <Tag
      className={cn(
        "sync-surface-card rounded-lg border border-border/35",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
