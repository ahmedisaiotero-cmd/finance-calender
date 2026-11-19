import Link from "next/link";

import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { LEGAL_PATHS } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export function LandingPage({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn={signedIn} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {SITE_PRODUCT.name}
        </p>
        <h1 className="mt-4 max-w-xl text-balance text-[2.4rem] font-medium leading-[1.12] tracking-[-0.045em] text-foreground sm:text-[3.15rem]">
          {SITE_PRODUCT.tagline}
        </h1>
        <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
          {SITE_PRODUCT.description}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {signedIn ? (
            <Button asChild size="lg">
              <Link href="/">Open Sync</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/login">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </>
          )}
        </div>
        <ul className="mt-14 grid gap-6 text-[15px] leading-relaxed text-muted-foreground sm:grid-cols-3">
          <li>
            <p className="font-medium text-foreground/88">Capture</p>
            <p className="mt-1">
              Save a conversation from ChatGPT, Claude, Grok, Gemini, or Cursor
              when you choose to.
            </p>
          </li>
          <li>
            <p className="font-medium text-foreground/88">Inspect</p>
            <p className="mt-1">
              See what was stored, which device sent it, and what Sync did with
              it.
            </p>
          </li>
          <li>
            <p className="font-medium text-foreground/88">Control</p>
            <p className="mt-1">
              Export your data or delete your account. Nothing is a black box.
            </p>
          </li>
        </ul>
        <p className="mt-12 text-[13px] text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link
            href={LEGAL_PATHS.terms}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href={LEGAL_PATHS.privacy}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          . Chrome Web Store data practices are in the{" "}
          <Link
            href={LEGAL_PATHS.chromePrivacy}
            className="underline underline-offset-2 hover:text-foreground"
          >
            add-on privacy disclosure
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
