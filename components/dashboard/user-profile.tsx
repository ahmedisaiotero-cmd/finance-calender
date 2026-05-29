import { Mail } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { userProfile } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type UserProfileProps = {
  className?: string;
  showEmail?: boolean;
  showThemeToggle?: boolean;
  size?: "default" | "compact";
};

export function UserProfile({
  className,
  showEmail = false,
  showThemeToggle = true,
  size = "default",
}: UserProfileProps) {
  const isCompact = size === "compact";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl bg-accent/50",
        isCompact ? "gap-3 px-3 py-3" : "px-3 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full font-semibold",
            isCompact ? "size-12 text-sm" : "size-9 text-xs",
          )}
          style={{
            background: `linear-gradient(to bottom right, var(--avatar-from), var(--avatar-to))`,
            color: "var(--avatar-text)",
          }}
        >
          {userProfile.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{userProfile.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {userProfile.plan}
          </p>
          {showEmail && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="size-3 shrink-0" />
              {userProfile.email}
            </p>
          )}
        </div>
      </div>
      {showThemeToggle && <ThemeToggle />}
    </div>
  );
}
