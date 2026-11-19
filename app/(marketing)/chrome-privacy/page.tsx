import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/site/legal-document";
import { LEGAL_OPERATOR, LEGAL_PATHS } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export const metadata = {
  title: `Chrome add-on privacy — ${SITE_PRODUCT.name}`,
  description: `Chrome Web Store privacy disclosure for the ${SITE_PRODUCT.name} capture add-on.`,
};

export default function ChromePrivacyPage() {
  return (
    <LegalDocument title="Chrome add-on privacy disclosure">
      <p>
        This disclosure is for the Sync AI Capture Chrome extension and is
        written to meet Chrome Web Store privacy and Limited Use
        requirements. It is part of the{" "}
        <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>

      <LegalSection title="Single purpose">
        <p>
          The add-on lets you click to save an AI conversation you are viewing
          (ChatGPT, Claude, Grok, Gemini, or Cursor) into your Sync account. It
          does not capture in the background, read other tabs, or inject ads.
        </p>
      </LegalSection>

      <LegalSection title="Data collected">
        <ul className="list-disc space-y-2 pl-5">
          <li>Conversation text you choose to save, after local secret redaction.</li>
          <li>Page origin, provider name, optional title, and capture time.</li>
          <li>
            A device pairing token issued by your Sync account (stored in
            extension storage; the server stores only a hash).
          </li>
        </ul>
        <p>The add-on does not collect browsing history, location, or payment data.</p>
      </LegalSection>

      <LegalSection title="Remote use">
        <p>
          Saved captures are sent only to the Sync site URL you configure
          (your own deployment). They are not sold, used for advertising, or
          used to train third-party models. In-app Chat, if you turn it on in
          Settings, is a separate feature and does not send these captures to a
          language model.
        </p>
      </LegalSection>

      <LegalSection title="Limited Use (Google user data)">
        <p>
          If you save a Gemini conversation, that Google user data is used
          solely to provide the capture feature you requested. It is not used
          for ads, not sold, and transferred only to Sync subprocessors listed
          in the Privacy Policy as needed to store your account data.
        </p>
      </LegalSection>

      <LegalSection title="Permissions">
        <p>
          `storage` keeps pairing state and a retry queue. `activeTab` reads
          the current chat page when you click Save.           Host access is limited to
          supported chat sites and your Sync origin. The add-on does not use
          {" "}
          {"<all_urls>"}.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          {LEGAL_OPERATOR.privacyEmail}
          <br />
          {LEGAL_OPERATOR.mailingAddress}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
