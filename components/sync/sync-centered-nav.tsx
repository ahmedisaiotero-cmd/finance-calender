"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { id: "brief", label: "Brief", href: "/" },
  { id: "chat", label: "Chat", href: "/chat" },
  { id: "life", label: "Life", href: "/life" },
] as const;

export function SyncCenteredNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-2 px-6 py-4"
      aria-label="Sync navigation"
    >
      {PRIMARY_NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "border-primary/25 bg-primary/10 text-foreground/85"
                : "border-border/25 bg-muted/10 text-muted-foreground/65 hover:text-foreground/80",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/settings"
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={cn(
          "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
          pathname === "/settings"
            ? "border-primary/25 bg-primary/10 text-foreground/85"
            : "border-border/25 bg-muted/10 text-muted-foreground/65 hover:text-foreground/80",
        )}
      >
        Settings
      </Link>
    </nav>
  );
}
