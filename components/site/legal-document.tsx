import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site/site-header";
import { LEGAL_OPERATOR } from "@/lib/site/legal";

export function LegalDocument({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <article className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-[12px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
          Effective {LEGAL_OPERATOR.effectiveDate}
        </p>
        <h1 className="mt-2 text-[2rem] font-medium tracking-[-0.04em] text-foreground sm:text-[2.25rem]">
          {title}
        </h1>
        <div className="legal-prose mt-8">{children}</div>
      </article>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-[1.05rem] font-medium tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-[1.65] text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
