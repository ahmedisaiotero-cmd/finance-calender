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
        "rounded-3xl border border-border/60 bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
