import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/site/legal-document";
import { LEGAL_OPERATOR, LEGAL_PATHS } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export const metadata = {
  title: `Accessibility — ${SITE_PRODUCT.name}`,
  description: `How ${SITE_PRODUCT.name} aims to stay usable with keyboard, screen readers, and reduced motion.`,
};

export default function AccessibilityPage() {
  return (
    <LegalDocument title="Accessibility">
      <p>
        {SITE_PRODUCT.name} should be usable with a keyboard, a screen reader,
        and the text size or contrast you already prefer. This page describes
        the current intent, not a certified audit.
      </p>

      <LegalSection title="What we aim for">
        <ul className="list-disc space-y-2 pl-5">
          <li>A skip link to the main content on every page.</li>
          <li>Text that stays readable when you zoom.</li>
          <li>Focus rings on controls, not mouse-only actions.</li>
          <li>Legal and account pages that work without color alone.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Known limits">
        <p>
          The signed-in briefing and capture surfaces are still being proven.
          Charts and dense financial tables from earlier modules are not the
          product and may be harder with a screen reader. If something blocks
          you, say so.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Accessibility requests: {LEGAL_OPERATOR.supportEmail}. Privacy
          questions:{" "}
          <Link href={LEGAL_PATHS.contact} className="underline underline-offset-2">
            Contact
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
