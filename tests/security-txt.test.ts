import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { isAuthPublicPath } from "@/lib/auth/app-auth-gate";
import { LEGAL_OPERATOR, LEGAL_PATHS } from "@/lib/site/legal";
import { publicSiteUrl } from "@/lib/site/public-url";
import { buildSecurityTxt } from "@/lib/site/security-txt";

{
  assert.equal(isAuthPublicPath("/contact"), true);
  assert.equal(isAuthPublicPath("/.well-known/security.txt"), true);
  assert.equal(existsSync(join(process.cwd(), "app/(marketing)/contact/page.tsx")), true);
}

{
  assert.equal(publicSiteUrl({}), undefined);
  assert.equal(
    publicSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://sync.example" }),
    "https://sync.example",
  );
}

{
  const body = buildSecurityTxt({
    NEXT_PUBLIC_SITE_URL: "https://sync.example",
  });
  assert.match(body, /^Contact: mailto:/m);
  assert.match(body, /Expires: \d{4}-/);
  assert.match(body, /Preferred-Languages: en/);
  assert.match(body, /Canonical: https:\/\/sync.example\/.well-known\/security.txt/);
  assert.match(body, new RegExp(`Policy: https://sync.example${LEGAL_PATHS.privacy}`));
  assert.match(body, /Acknowledgments: https:\/\/sync.example\/contact/);
  assert.equal(body.includes("Rent is due"), false);
  const contact = LEGAL_OPERATOR.securityEmail.startsWith("[")
    ? LEGAL_OPERATOR.contactEmail
    : LEGAL_OPERATOR.securityEmail;
  assert.equal(body.includes(`mailto:${contact}`), true);
}

console.log("security-txt tests passed");
