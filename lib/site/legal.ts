/**
 * Operator and legal copy configuration.
 *
 * NOT LEGAL ADVICE. Review with qualified counsel before public launch.
 * Fill every `[OPERATOR_*]` / `[LEGAL_*]` placeholder before release.
 *
 * Product pages must import this file rather than hard-coding operator
 * identity, contact details, or policy dates.
 */

export const LEGAL_POLICY_VERSION = "2026-11-19";

/** Minimum age to create a Sync account. Terms default to 18+. Under-13 is always blocked; no COPPA parental flow. */
export const LEGAL_MINIMUM_AGE = 18;
export const LEGAL_HARD_BLOCK_AGE = 13;

export const LEGAL_OPERATOR = {
  productName: "Sync",
  legalName: "[OPERATOR_LEGAL_NAME]",
  contactEmail: "[OPERATOR_CONTACT_EMAIL]",
  supportEmail: "[OPERATOR_SUPPORT_EMAIL]",
  privacyEmail: "[OPERATOR_PRIVACY_EMAIL]",
  securityEmail: "[OPERATOR_SECURITY_EMAIL]",
  mailingAddress: "[OPERATOR_MAILING_ADDRESS]",
  siteUrl: "[OPERATOR_SITE_URL]",
  effectiveDate: "[LEGAL_EFFECTIVE_DATE]",
} as const;

export const LEGAL_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  chromePrivacy: "/chrome-privacy",
  contact: "/contact",
  accessibility: "/accessibility",
} as const;

export type LegalSubprocessor = {
  name: string;
  purpose: string;
  region: string;
  alwaysOn: boolean;
  notes?: string;
};

export const LEGAL_SUBPROCESSORS: readonly LegalSubprocessor[] = [
  {
    name: "Vercel",
    purpose: "Application hosting, edge delivery, and (if enabled) privacy-preserving web analytics",
    region: "United States and local edge regions",
    alwaysOn: true,
  },
  {
    name: "Supabase",
    purpose: "Authentication, PostgreSQL database, and session cookies",
    region: "Project region selected by the operator",
    alwaysOn: true,
  },
  {
    name: "Email delivery provider",
    purpose: "Transactional messages only: verification, password reset, and deletion confirmation",
    region: "Configured by the operator (Supabase Auth email or a connected SMTP provider)",
    alwaysOn: true,
    notes: "No marketing email.",
  },
  {
    name: "Error monitoring",
    purpose: "Application error reports with transcripts, emails, tokens, and secrets scrubbed",
    region: "Configured by the operator",
    alwaysOn: false,
    notes: "Only if a monitoring DSN is set.",
  },
  {
    name: "OpenAI",
    purpose: "Optional in-app chat replies",
    region: "United States",
    alwaysOn: false,
    notes:
      "Used only when in-app chat is enabled and the signed-in person has given separate, explicit consent. Captured browser conversations are not sent to OpenAI by default.",
  },
];

export const LEGAL_RETENTION = {
  account: "Until you delete your account.",
  captures:
    "Until you delete the conversation, revoke the device, or delete your account.",
  deviceTokens:
    "Until you revoke the device, the token expires, or you delete your account.",
  pairingCodes: "Until the code is used, expires (10 minutes), or you delete your account.",
  authLogs: "Short-lived authentication logs retained by the auth provider as needed to operate sign-in.",
  backups: "Backups, if any, are removed on the provider’s backup cycle after deletion (typically 30 days or less).",
} as const;

export function isLegalPlaceholder(value: string): boolean {
  return value.startsWith("[") && value.endsWith("]");
}
