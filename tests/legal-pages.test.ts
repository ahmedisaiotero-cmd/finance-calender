import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  LEGAL_HARD_BLOCK_AGE,
  LEGAL_MINIMUM_AGE,
  LEGAL_OPERATOR,
  LEGAL_POLICY_VERSION,
  LEGAL_SUBPROCESSORS,
  isLegalPlaceholder,
} from "@/lib/site/legal";

{
  assert.equal(LEGAL_MINIMUM_AGE, 18);
  assert.equal(LEGAL_HARD_BLOCK_AGE, 13);
  assert.match(LEGAL_POLICY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(isLegalPlaceholder(LEGAL_OPERATOR.legalName), true);
  assert.equal(isLegalPlaceholder(LEGAL_OPERATOR.contactEmail), true);
  assert.equal(isLegalPlaceholder(LEGAL_OPERATOR.mailingAddress), true);
  assert.equal(isLegalPlaceholder(LEGAL_OPERATOR.effectiveDate), true);
}

{
  const names = LEGAL_SUBPROCESSORS.map((item) => item.name);
  assert.ok(names.includes("Vercel"));
  assert.ok(names.includes("Supabase"));
  assert.ok(names.includes("OpenAI"));
  const openai = LEGAL_SUBPROCESSORS.find((item) => item.name === "OpenAI");
  assert.equal(openai?.alwaysOn, false);
}

{
  const privacy = readFileSync(
    join(process.cwd(), "app/(marketing)/privacy/page.tsx"),
    "utf8",
  );
  assert.match(privacy, /Chrome Web Store User Data Policy/);
  assert.match(privacy, /Limited Use/);
  assert.match(privacy, /encrypted at rest/);
  assert.equal(privacy.includes("NOT LEGAL ADVICE"), false);
}

{
  const legalSource = readFileSync(
    join(process.cwd(), "lib/site/legal.ts"),
    "utf8",
  );
  assert.match(legalSource, /NOT LEGAL ADVICE/);
}

{
  const footer = readFileSync(
    join(process.cwd(), "components/site/site-footer.tsx"),
    "utf8",
  );
  assert.equal(footer.includes("privacy"), true);
  assert.equal(footer.includes("terms"), true);
  assert.equal(footer.includes("cookies"), true);
}

{
  const life = readFileSync(
    join(process.cwd(), "app/(app)/life/page.tsx"),
    "utf8",
  );
  assert.equal(life.includes('href="/finance"'), false);
  assert.equal(life.includes('href="/calendar"'), false);
  assert.equal(life.includes('href="/health"'), false);
}

{
  const settings = readFileSync(
    join(process.cwd(), "components/settings/settings-connections.tsx"),
    "utf8",
  );
  assert.equal(settings.includes('href="/finance"'), false);
}

{
  const login = readFileSync(
    join(process.cwd(), "components/auth/login-form.tsx"),
    "utf8",
  );
  assert.match(login, /By continuing you agree/);
  assert.match(login, /LEGAL_PATHS.terms/);
  assert.match(login, /LEGAL_PATHS.privacy/);
}

console.log("legal-pages tests passed");
