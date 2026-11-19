import { LEGAL_OPERATOR, LEGAL_PATHS, LEGAL_POLICY_VERSION } from "@/lib/site/legal";
import { publicSiteUrl } from "@/lib/site/public-url";

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

function securityTxtExpires(policyVersion: string, now = new Date()): string {
  const match = policyVersion.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const base = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : now;
  const expires = new Date(base);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return expires.toISOString();
}

export function buildSecurityTxt(env: EnvLike = process.env): string {
  const origin = publicSiteUrl(env);
  const contact = LEGAL_OPERATOR.securityEmail.startsWith("[")
    ? LEGAL_OPERATOR.contactEmail
    : LEGAL_OPERATOR.securityEmail;
  const lines = [
    `Contact: mailto:${contact}`,
    `Expires: ${securityTxtExpires(LEGAL_POLICY_VERSION)}`,
    "Preferred-Languages: en",
  ];
  if (origin) {
    lines.push(`Canonical: ${origin}/.well-known/security.txt`);
    lines.push(`Policy: ${origin}${LEGAL_PATHS.privacy}`);
    lines.push(`Acknowledgments: ${origin}${LEGAL_PATHS.contact}`);
  }
  return `${lines.join("\n")}\n`;
}
