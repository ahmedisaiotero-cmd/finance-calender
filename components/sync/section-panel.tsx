import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionPanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  highlightToday?: boolean;
};

export function SectionPanel({
  title,
  subtitle,
  action,
  children,
  className,
}: SectionPanelProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border/35 px-5 py-6 sm:px-7 sm:py-8",
        className,
      )}
    >
      <header className="mb-6 flex items-baseline justify-between gap-4 sm:mb-7">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.02em] text-foreground/90">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[13px] tracking-[-0.01em] text-muted-foreground/70">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function SectionEyebrow({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
          {title}
        </h2>
        {meta && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/55">{meta}</p>
        )}
      </div>
      {action}
    </header>
  );
}
