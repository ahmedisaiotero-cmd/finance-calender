import { cn } from "@/lib/utils";

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "hero" | "stat";
};

export function DashboardCard({
  children,
  className,
  variant = "default",
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "sync-dash-card",
        variant === "hero" && "sync-dash-card--upcoming",
        variant === "stat" && "sync-dash-card--stat",
        variant === "default" && "sync-dash-card--today",
        className,
      )}
    >
      {children}
    </div>
  );
}
