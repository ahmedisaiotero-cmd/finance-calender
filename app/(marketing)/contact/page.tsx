import { LegalDocument, LegalSection } from "@/components/site/legal-document";
import { LEGAL_OPERATOR } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export const metadata = {
  title: `Contact — ${SITE_PRODUCT.name}`,
  description: `How to reach ${SITE_PRODUCT.name}.`,
};

export default function ContactPage() {
  return (
    <LegalDocument title="Contact">
      <p>Use these addresses for the matching purpose. Replace the placeholders before launch.</p>
      <LegalSection title="Support">
        <p>{LEGAL_OPERATOR.supportEmail}</p>
      </LegalSection>
      <LegalSection title="Privacy">
        <p>{LEGAL_OPERATOR.privacyEmail}</p>
      </LegalSection>
      <LegalSection title="Security">
        <p>{LEGAL_OPERATOR.securityEmail}</p>
      </LegalSection>
      <LegalSection title="Mail">
        <p>
          {LEGAL_OPERATOR.legalName}
          <br />
          {LEGAL_OPERATOR.mailingAddress}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
