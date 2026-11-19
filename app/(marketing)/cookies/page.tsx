import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/site/legal-document";
import { LEGAL_OPERATOR, LEGAL_PATHS } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export const metadata = {
  title: `Cookie notice — ${SITE_PRODUCT.name}`,
  description: `Cookies and local storage used by ${SITE_PRODUCT.name}.`,
};

export default function CookiesPage() {
  return (
    <LegalDocument title="Cookie notice">
      <p>
        {LEGAL_OPERATOR.productName} uses essential cookies to keep you signed
        in. We do not currently set non-essential or advertising cookies, so
        there is no tracking banner to accept. If that changes, we will update
        this notice and ask before setting non-essential cookies.
      </p>

      <LegalSection title="Essential cookies">
        <p>
          Authentication cookies from our sign-in provider (Supabase Auth) keep
          your session after you log in. They are required for the signed-in
          product to work. Clearing them signs you out.
        </p>
      </LegalSection>

      <LegalSection title="Local device storage">
        <p>
          Light/dark appearance is stored in localStorage on this browser
          (`theme`). The Chrome add-on stores pairing state and a local retry
          queue in extension storage on your device until upload succeeds or
          you clear it.
        </p>
      </LegalSection>

      <LegalSection title="Optional analytics">
        <p>
          If the operator turns on privacy-preserving Vercel Analytics, it
          counts page views without advertising identifiers. Query strings are
          stripped before send. It stays off unless{" "}
          <code>NEXT_PUBLIC_VERCEL_ANALYTICS=true</code>. We do not add
          advertising trackers.
        </p>
      </LegalSection>

      <LegalSection title="More">
        <p>
          See the{" "}
          <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          or email {LEGAL_OPERATOR.privacyEmail}.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
