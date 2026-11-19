"use client";

import Link from "next/link";

import { SyncLogo } from "@/components/brand/sync-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LEGAL_PATHS } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";
import { cn } from "@/lib/utils";

export function SiteHeader({
  signedIn = false,
  className,
}: {
  signedIn?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-4 sm:px-8",
        className,
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
      >
        <SyncLogo size="sm" />
        <span className="text-[15px] font-medium tracking-[-0.03em]">
          {SITE_PRODUCT.name}
        </span>
      </Link>
      <nav
        className="flex items-center gap-1 sm:gap-2"
        aria-label="Site"
      >
        <Link
          href={LEGAL_PATHS.privacy}
          className="hidden rounded-full px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground sm:inline"
        >
          Privacy
        </Link>
        <Link
          href={LEGAL_PATHS.terms}
          className="hidden rounded-full px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground sm:inline"
        >
          Terms
        </Link>
        <ThemeToggle />
        {signedIn ? (
          <Button asChild size="sm">
            <Link href="/">Open Sync</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
