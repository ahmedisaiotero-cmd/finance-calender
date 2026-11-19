import Link from "next/link";

import { LEGAL_OPERATOR, LEGAL_PATHS } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

const FOOTER_LINKS = [
  { href: LEGAL_PATHS.privacy, label: "Privacy" },
  { href: LEGAL_PATHS.terms, label: "Terms" },
  { href: LEGAL_PATHS.cookies, label: "Cookies" },
  { href: LEGAL_PATHS.chromePrivacy, label: "Chrome add-on privacy" },
  { href: LEGAL_PATHS.contact, label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/30 px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-muted-foreground">
          {SITE_PRODUCT.name}
          {LEGAL_OPERATOR.legalName.startsWith("[")
            ? ""
            : ` · ${LEGAL_OPERATOR.legalName}`}
        </p>
        <nav
          className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted-foreground"
          aria-label="Legal"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
