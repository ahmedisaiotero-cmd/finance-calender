import {
  LEGAL_HARD_BLOCK_AGE,
  LEGAL_MINIMUM_AGE,
  LEGAL_POLICY_VERSION,
} from "@/lib/site/legal";

export const LEGAL_ACCEPTANCE_ERROR = {
  under13: "Sync is not available for this age.",
  under18: `You must be ${LEGAL_MINIMUM_AGE} or older to create a Sync account.`,
  birthYear: "Enter a valid birth year.",
  terms: "You need to agree to the Terms of Service.",
  privacy: "You need to agree to the Privacy Policy.",
} as const;

export type LegalAcceptanceInput = {
  birthYear: number;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  now?: Date;
};

export type LegalAcceptanceFailure = {
  ok: false;
  error: string;
  blocked: boolean;
};

export type LegalAcceptanceSuccess = {
  ok: true;
  birthYear: number;
  policyVersion: string;
  acceptedAt: string;
};

export type LegalAcceptanceResult =
  | LegalAcceptanceSuccess
  | LegalAcceptanceFailure;

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}

export function evaluateLegalAcceptance(
  input: LegalAcceptanceInput,
): LegalAcceptanceResult {
  const now = input.now ?? new Date();
  const year = Number(input.birthYear);
  const currentYear = now.getFullYear();

  if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
    return { ok: false, error: LEGAL_ACCEPTANCE_ERROR.birthYear, blocked: false };
  }

  const age = ageFromBirthYear(year, now);
  if (age < LEGAL_HARD_BLOCK_AGE) {
    return { ok: false, error: LEGAL_ACCEPTANCE_ERROR.under13, blocked: true };
  }
  if (age < LEGAL_MINIMUM_AGE) {
    return { ok: false, error: LEGAL_ACCEPTANCE_ERROR.under18, blocked: true };
  }

  if (!input.acceptedTerms) {
    return { ok: false, error: LEGAL_ACCEPTANCE_ERROR.terms, blocked: false };
  }
  if (!input.acceptedPrivacy) {
    return { ok: false, error: LEGAL_ACCEPTANCE_ERROR.privacy, blocked: false };
  }

  return {
    ok: true,
    birthYear: year,
    policyVersion: LEGAL_POLICY_VERSION,
    acceptedAt: now.toISOString(),
  };
}

export type LegalAcceptanceRecord = {
  birthYear: number;
  legalPolicyVersion: string;
  legalAcceptedAt: Date;
  privacyAcceptedAt: Date;
  termsAcceptedAt: Date;
  ageConfirmedAt: Date;
};

export function legalAcceptanceRecord(
  accepted: LegalAcceptanceSuccess,
): LegalAcceptanceRecord {
  const at = new Date(accepted.acceptedAt);
  return {
    birthYear: accepted.birthYear,
    legalPolicyVersion: accepted.policyVersion,
    legalAcceptedAt: at,
    privacyAcceptedAt: at,
    termsAcceptedAt: at,
    ageConfirmedAt: at,
  };
}
