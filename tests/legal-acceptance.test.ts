import assert from "node:assert/strict";

import {
  LEGAL_ACCEPTANCE_ERROR,
  evaluateLegalAcceptance,
} from "@/lib/auth/legal-acceptance";
import { LEGAL_POLICY_VERSION } from "@/lib/site/legal";

const now = new Date("2026-11-19T00:00:00.000Z");

{
  const blocked = evaluateLegalAcceptance({
    birthYear: 2018,
    acceptedTerms: true,
    acceptedPrivacy: true,
    now,
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.error, LEGAL_ACCEPTANCE_ERROR.under13);
    assert.equal(blocked.blocked, true);
  }
}

{
  const teen = evaluateLegalAcceptance({
    birthYear: 2010,
    acceptedTerms: true,
    acceptedPrivacy: true,
    now,
  });
  assert.equal(teen.ok, false);
  if (!teen.ok) {
    assert.equal(teen.error, LEGAL_ACCEPTANCE_ERROR.under18);
    assert.equal(teen.blocked, true);
  }
}

{
  const missingTerms = evaluateLegalAcceptance({
    birthYear: 1990,
    acceptedTerms: false,
    acceptedPrivacy: true,
    now,
  });
  assert.equal(missingTerms.ok, false);
  if (!missingTerms.ok) {
    assert.equal(missingTerms.error, LEGAL_ACCEPTANCE_ERROR.terms);
  }
}

{
  const accepted = evaluateLegalAcceptance({
    birthYear: 1990,
    acceptedTerms: true,
    acceptedPrivacy: true,
    now,
  });
  assert.equal(accepted.ok, true);
  if (accepted.ok) {
    assert.equal(accepted.policyVersion, LEGAL_POLICY_VERSION);
    assert.equal(accepted.birthYear, 1990);
    assert.equal(accepted.acceptedAt, now.toISOString());
  }
}

console.log("legal-acceptance tests passed");
