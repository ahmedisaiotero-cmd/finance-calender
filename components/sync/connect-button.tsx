import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ConnectButtonProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function ConnectButton({ href, children, className }: ConnectButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "sync-home-connect-btn inline-flex items-center rounded-md border border-border/40 px-2.5 py-1 text-[11px] font-medium tracking-[-0.01em] text-muted-foreground/78 transition-colors hover:border-border/55 hover:text-foreground/88",
        className,
      )}
    >
      {children}
    </Link>
  );
}
