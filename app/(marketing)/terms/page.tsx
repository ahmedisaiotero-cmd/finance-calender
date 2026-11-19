import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/site/legal-document";
import {
  LEGAL_HARD_BLOCK_AGE,
  LEGAL_MINIMUM_AGE,
  LEGAL_OPERATOR,
  LEGAL_PATHS,
  LEGAL_POLICY_VERSION,
} from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export const metadata = {
  title: `Terms of Service — ${SITE_PRODUCT.name}`,
  description: `Terms for using ${SITE_PRODUCT.name}.`,
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service">
      <p>
        These Terms govern your use of {LEGAL_OPERATOR.productName}, operated by{" "}
        {LEGAL_OPERATOR.legalName}. Policy version {LEGAL_POLICY_VERSION}.
        Related privacy terms are in the{" "}
        <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>

      <LegalSection title="The service">
        <p>
          Sync is a personal context and trust layer. You can create an
          account, pair a browser add-on, and save AI conversations you choose
          to capture. Positioning of consumer features may change. We may
          modify or discontinue parts of the service with reasonable notice
          when we can.
        </p>
      </LegalSection>

      <LegalSection title="Eligibility and age">
        <p>
          You must be at least {LEGAL_MINIMUM_AGE} years old to create an
          account. Sync is not offered to children under {LEGAL_HARD_BLOCK_AGE},
          and we do not provide a parental-consent flow. If we learn that
          someone under {LEGAL_HARD_BLOCK_AGE} created an account, we will
          delete it.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You are responsible for the email address and devices you use to
          sign in. Keep pairing codes and device tokens private. You may sign
          out, export your data, or delete your account from Settings.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Capture only conversations you are a party to — your own chats,
            not someone else’s screen or account.
          </li>
          <li>
            Not use Sync to collect, store, or share another person’s private
            messages without their permission.
          </li>
          <li>Not attempt to break into other accounts, devices, or our systems.</li>
          <li>
            Not upload illegal content, malware, or material you do not have
            the right to store.
          </li>
        </ul>
        <p>We may suspend or delete accounts that violate these rules.</p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You retain rights in the conversations you capture. You grant us a
          limited license to store, display, and process that content solely
          to provide Sync to you (including export and deletion). We do not
          claim ownership of your chats.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <p>
          Sync is provided “as is.” We do not warrant that captures are
          complete, that every provider page will remain supported, or that
          the service will be uninterrupted. To the extent allowed by law,{" "}
          {LEGAL_OPERATOR.legalName} is not liable for indirect, incidental, or
          consequential damages, or for decisions you make based on stored
          captures.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may delete your account at any time. We may terminate access if
          you breach these Terms or if we shut down the service. After
          deletion, we keep only what the Privacy Policy says we must.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          {LEGAL_OPERATOR.legalName}
          <br />
          {LEGAL_OPERATOR.mailingAddress}
          <br />
          {LEGAL_OPERATOR.contactEmail}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
