import Link from "next/link";

import { LegalDocument, LegalSection } from "@/components/site/legal-document";
import {
  LEGAL_HARD_BLOCK_AGE,
  LEGAL_MINIMUM_AGE,
  LEGAL_OPERATOR,
  LEGAL_PATHS,
  LEGAL_POLICY_VERSION,
  LEGAL_RETENTION,
  LEGAL_SUBPROCESSORS,
} from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export const metadata = {
  title: `Privacy Policy — ${SITE_PRODUCT.name}`,
  description: `How ${SITE_PRODUCT.name} collects, uses, and deletes your data.`,
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy">
      <p>
        {LEGAL_OPERATOR.productName} (“Sync,” “we,” “us”) is operated by{" "}
        {LEGAL_OPERATOR.legalName}. This policy describes what we collect, why,
        how long we keep it, and how you can access or delete it. Policy version{" "}
        {LEGAL_POLICY_VERSION}.
      </p>

      <LegalSection title="Who we are">
        <p>
          Legal name: {LEGAL_OPERATOR.legalName}
          <br />
          Postal address: {LEGAL_OPERATOR.mailingAddress}
          <br />
          Privacy contact: {LEGAL_OPERATOR.privacyEmail}
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>Sync collects only what it needs to run your account and the capture you choose to save:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground/80">Account information</strong> —
            email address, display name if you provide one, timezone, and
            authentication identifiers from Sign in with email, Apple, or Google
            when those providers are enabled.
          </li>
          <li>
            <strong className="text-foreground/80">AI chat captures</strong> —
            conversations you explicitly save from the Chrome add-on or paste
            into Sync. We store provider, title, origin URL, timestamps,
            redacted message text, and related activity records. Capture is
            click-to-save. The add-on does not record chats in the background.
          </li>
          <li>
            <strong className="text-foreground/80">Device pairing tokens</strong>{" "}
            — a hashed device token, optional device label, and last-seen time
            so your add-on can upload captures you approve. We never store the
            raw token after hashing.
          </li>
          <li>
            <strong className="text-foreground/80">Legal acceptance</strong> —
            the policy version and timestamp when you agree to the Terms and
            Privacy Policy, and confirmation that you meet the minimum age.
          </li>
        </ul>
        <p>
          We do not sell personal information. We do not use captured
          conversations for advertising. We do not scrape other people’s chats.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          To create and secure your account, save captures you send, show you
          what was stored, export or delete that data on request, and operate
          the service. Optional in-app chat, if you turn it on in Settings,
          sends those chat messages to a language model. Captured browser
          conversations stay in your account and are not sent to a language
          model.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and similar storage">
        <p>
          Sign-in uses essential session cookies from our authentication
          provider. Theme preference is stored in localStorage on your device.
          We do not set advertising cookies. See the{" "}
          <Link href={LEGAL_PATHS.cookies} className="underline underline-offset-2">
            Cookie notice
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Subprocessors">
        <ul className="list-disc space-y-2 pl-5">
          {LEGAL_SUBPROCESSORS.map((processor) => (
            <li key={processor.name}>
              <strong className="text-foreground/80">{processor.name}</strong> —{" "}
              {processor.purpose}. Region: {processor.region}.
              {processor.alwaysOn ? " In use for the hosted service." : " Used only when configured."}
              {processor.notes ? ` ${processor.notes}` : ""}
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="Retention">
        <ul className="list-disc space-y-2 pl-5">
          <li>Account: {LEGAL_RETENTION.account}</li>
          <li>Captures: {LEGAL_RETENTION.captures}</li>
          <li>Device tokens: {LEGAL_RETENTION.deviceTokens}</li>
          <li>Pairing codes: {LEGAL_RETENTION.pairingCodes}</li>
          <li>Request metering: {LEGAL_RETENTION.rateLimitWindows}</li>
          <li>Auth logs: {LEGAL_RETENTION.authLogs}</li>
          <li>Backups after deletion: {LEGAL_RETENTION.backups}</li>
        </ul>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Access to production systems is limited to operators who need it.
          Device tokens are stored hashed. Transport uses HTTPS. Captured
          conversation text, redacted copies, and related summaries are
          encrypted at rest with AES-256-GCM. Operators hold the encryption
          key outside the database. Treat captures as sensitive and delete
          anything you did not mean to keep.
        </p>
      </LegalSection>

      <LegalSection title="Access, export, and deletion">
        <p>
          You can view your profile, export a JSON copy of your account and
          captures, and delete your account from Settings. Deletion removes
          your profile, captures (including transcripts), devices, pairing
          codes, and related activity records. Authentication records at the
          identity provider are deleted as well. We may retain a minimal
          record that a deleted account existed if required to complete
          provider revocation (for example Sign in with Apple) or to comply
          with law. Backup copies fall off the backup cycle described above.
        </p>
      </LegalSection>

      <LegalSection title="Your rights (GDPR / CCPA-style)">
        <p>
          Depending on where you live, you may have the right to access,
          correct, delete, export, or restrict processing of your personal
          information, and to opt out of “sale” or “sharing” for cross-context
          advertising. Sync does not sell or share personal information for
          advertising. To exercise rights, use Settings or email{" "}
          {LEGAL_OPERATOR.privacyEmail}. You may also contact your local data
          protection authority.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Sync is not directed at children under {LEGAL_HARD_BLOCK_AGE}. We do
          not knowingly collect personal information from anyone under{" "}
          {LEGAL_HARD_BLOCK_AGE}, and we do not offer a parental-consent (COPPA)
          flow. Creating an account requires you to confirm you are at least{" "}
          {LEGAL_MINIMUM_AGE}.
        </p>
      </LegalSection>

      <LegalSection title="Chrome Web Store User Data Policy / Limited Use">
        <p>
          The Chrome add-on complies with the Chrome Web Store User Data
          Policy, including Limited Use requirements. Data collected from
          Google-owned properties (for example Gemini) is used only to provide
          or improve the user-facing capture features, is not used for
          advertising, is not sold, and is not transferred to third parties
          except as needed to operate Sync (the subprocessors listed above)
          or with your direction. Details:{" "}
          <Link
            href={LEGAL_PATHS.chromePrivacy}
            className="underline underline-offset-2"
          >
            Chrome add-on privacy disclosure
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          {LEGAL_OPERATOR.legalName}
          <br />
          {LEGAL_OPERATOR.mailingAddress}
          <br />
          {LEGAL_OPERATOR.privacyEmail}
          <br />
          <Link href={LEGAL_PATHS.contact} className="underline underline-offset-2">
            Contact page
          </Link>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
