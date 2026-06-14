"use client";

import Link from "next/link";

import {
  SyncLifeStream,
  type SyncLifeStreamLens,
} from "@/components/sync/sync-life-stream";
import type { CapturedSyncItem } from "@/lib/captured-items";

type SyncDomainPageProps = {
  title: string;
  supportingCopy: string;
  items: CapturedSyncItem[];
  insights: string[];
  lens?: SyncLifeStreamLens;
};

export function SyncDomainPage({
  title,
  supportingCopy,
  items,
  insights,
  lens = "all",
}: SyncDomainPageProps) {
  const summary = insights[0];

  return (
    <div className="sync-domain-page">
      <header className="sync-domain-header">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary/60" aria-hidden />
          <p className="text-[12px] font-medium text-muted-foreground/62">
            In Sync
          </p>
        </div>
        <h1 className="mt-3 text-[2rem] font-medium tracking-[-0.045em] text-foreground/95">
          {title}
        </h1>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-muted-foreground/70">
          {supportingCopy}
        </p>
      </header>

      <section className="sync-domain-section">
        <h2 className="sync-domain-section-title">What matters</h2>
        {summary && (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground/62">
            {summary}
          </p>
        )}
        <div className="mt-4">
          <SyncLifeStream items={items} activeLens={lens} />
        </div>
      </section>

      <footer className="flex flex-wrap gap-3">
        <Link href="/" className="sync-domain-action">
          + Add something
        </Link>
        <Link href="/calendar" className="sync-domain-action sync-domain-action--quiet">
          View Calendar →
        </Link>
      </footer>
    </div>
  );
}
