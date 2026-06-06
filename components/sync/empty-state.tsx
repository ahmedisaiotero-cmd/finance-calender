import type { ReactNode } from "react";

type EmptyStateProps = {
  message: string;
  action?: ReactNode;
};

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <p className="text-[12px] text-muted-foreground/55">
      {message}
      {action && <> {action}</>}
    </p>
  );
}
