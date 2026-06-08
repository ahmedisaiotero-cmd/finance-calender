import { Mail } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { userProfile } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type UserProfileProps = {
  className?: string;
  showEmail?: boolean;
  showThemeToggle?: boolean;
  size?: "default" | "compact";
  variant?: "default" | "minimal";
};

export function UserProfile({
  className,
  showEmail = false,
  showThemeToggle = true,
  size = "default",
  variant = "default",
}: UserProfileProps) {
  const isCompact = size === "compact" || variant === "minimal";
  const isMinimal = variant === "minimal";

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-xl border border-transparent transition-colors duration-200",
        !isMinimal &&
          "ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-border/25 hover:bg-foreground/[0.03]",
        isMinimal && "bg-transparent",
        isCompact ? "gap-2.5 px-1 py-1.5" : "px-3 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full font-medium",
            isMinimal ? "size-7 text-[10px]" : isCompact ? "size-12 text-sm" : "size-9 text-xs",
          )}
          style={{
            background: `linear-gradient(to bottom right, var(--avatar-from), var(--avatar-to))`,
            color: "var(--avatar-text)",
          }}
        >
          {userProfile.initials}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-medium tracking-[-0.01em]",
              isMinimal ? "text-[12px] text-foreground/88" : "text-sm",
            )}
          >
            {userProfile.name}
          </p>
          {!isMinimal && (
            <p className="truncate text-xs text-muted-foreground/75">
              {userProfile.plan}
            </p>
          )}
          {showEmail && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="size-3 shrink-0" />
              {userProfile.email}
            </p>
          )}
        </div>
      </div>
      {showThemeToggle && (
        <div className="transition-opacity duration-300 group-hover:opacity-100">
          <ThemeToggle />
        </div>
      )}
    </div>
  );
}
