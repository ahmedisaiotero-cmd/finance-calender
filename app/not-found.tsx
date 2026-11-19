import Link from "next/link";

import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { SITE_PRODUCT } from "@/lib/site/product";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
        <p className="text-[13px] text-muted-foreground">404</p>
        <h1 className="mt-2 text-[2rem] font-medium tracking-[-0.04em]">
          This page is not here.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          The link may be old, or the page may have moved. {SITE_PRODUCT.name}{" "}
          is still at the home page.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/">Back to Sync</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
