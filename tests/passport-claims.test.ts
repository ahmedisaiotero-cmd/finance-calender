import assert from "node:assert/strict";

import { createActivityEvent } from "@/lib/activity/activity-event";
import type { ActivityEventInput } from "@/lib/activity";
import {
  basisForEvent,
  deriveClaimCandidatesFromEvents,
  isVerifiedClaim,
  reconcilePassportClaims,
} from "@/lib/passport/claims";
import type { PassportClaim } from "@/lib/passport/types";

let seq = 0;
function claim(partial: Partial<PassportClaim>): PassportClaim {
  seq += 1;
  return {
    id: partial.id ?? `claim-${seq}`,
    subject: partial.subject ?? "employer",
    value: partial.value ?? "Acme",
    basis: partial.basis ?? "user_stated",
    status: partial.status ?? "active",
    areas: partial.areas ?? ["work"],
    confidence: partial.confidence ?? 0.7,
    verification: partial.verification ?? "self_reported",
    evidence: partial.evidence ?? [],
    source: partial.source ?? null,
    assertedAt: partial.assertedAt ?? "2026-09-01T09:00:00.000Z",
    updatedAt: partial.updatedAt ?? null,
    expiresAt: partial.expiresAt ?? null,
    visibility: partial.visibility ?? "visible",
    supersedesClaimId: partial.supersedesClaimId ?? null,
  };
}

function evt(partial: Partial<ActivityEventInput>): ReturnType<typeof createActivityEvent> {
  seq += 1;
  return createActivityEvent({
    id: partial.id ?? `evt-${seq}`,
    kind: partial.kind ?? "import",
    actor: partial.actor ?? { kind: "connector" },
    source: partial.source ?? { service: "hr" },
    timestamp: partial.timestamp ?? "2026-09-01T09:00:00.000Z",
    affectedAreas: partial.affectedAreas ?? ["work"],
    summary: partial.summary ?? "Imported employment record.",
    evidence: partial.evidence ?? [],
    verification: partial.verification ?? "system_logged",
    confidence: partial.confidence ?? 0.8,
    reversibility: partial.reversibility ?? "reversible",
    permission: partial.permission ?? { scope: "work.read", state: "granted" },
    visibility: partial.visibility ?? "visible",
    correlationId: partial.correlationId ?? null,
    detail: partial.detail,
  });
}

// Basis reflects the strongest support the evidence actually justifies.
{
  assert.equal(
    basisForEvent(evt({ verification: "source_confirmed" })),
    "source_confirmed",
  );
  assert.equal(
    basisForEvent(
      evt({ verification: "system_logged", source: { service: "bank", external: true, connectionId: "c1" } }),
    ),
    "account_linked",
  );
  assert.equal(
    basisForEvent(evt({ actor: { kind: "user" }, verification: "self_reported", source: { service: "manual" } })),
    "user_stated",
  );
  assert.equal(
    basisForEvent(evt({ actor: { kind: "sync" }, verification: "system_logged", source: { service: "manual" } })),
    "inferred",
  );
}

// Candidates only come from events that explicitly carry claim fields.
{
  const withClaim = evt({
    verification: "source_confirmed",
    detail: { claimSubject: "employer", claimValue: "Acme" },
  });
  const withoutClaim = evt({ summary: "Read your calendar." });

  const candidates = deriveClaimCandidatesFromEvents([withClaim, withoutClaim]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].subject, "employer");
  assert.equal(candidates[0].value, "Acme");
  assert.equal(candidates[0].basis, "source_confirmed");
  assert.equal(candidates[0].status, "active");
}

// A revoked-permission event yields a revoked candidate, excluded from the live Passport.
{
  const revoked = evt({
    permission: { scope: "work.read", state: "revoked" },
    detail: { claimSubject: "employer", claimValue: "Acme" },
  });
  const candidates = deriveClaimCandidatesFromEvents([revoked]);
  assert.equal(candidates[0].status, "revoked");

  const { resolved } = reconcilePassportClaims(candidates);
  assert.equal(resolved.length, 0); // revoked never participates
}

// Conflicting claims: source-confirmed beats user-stated, and the conflict is surfaced.
{
  const stated = claim({ subject: "employer", value: "Globex", basis: "user_stated", verification: "self_reported" });
  const confirmed = claim({ subject: "Employer", value: "Acme", basis: "source_confirmed", verification: "source_confirmed" });

  const { resolved, conflicts } = reconcilePassportClaims([stated, confirmed]);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].value, "Acme");
  assert.equal(resolved[0].basis, "source_confirmed");
  assert.equal(resolved[0].conflicting, true);
  assert.equal(resolved[0].conflicts.length, 1);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].claims.length, 2);
}

// Same value from different bases corroborates rather than conflicts.
{
  const linked = claim({ subject: "home city", value: "Lisbon", basis: "account_linked", verification: "system_logged" });
  const stated = claim({ subject: "home city", value: "  lisbon ", basis: "user_stated", verification: "self_reported" });

  const { resolved, conflicts } = reconcilePassportClaims([linked, stated]);
  assert.equal(conflicts.length, 0);
  assert.equal(resolved[0].conflicting, false);
  assert.equal(resolved[0].basis, "account_linked");
  assert.equal(resolved[0].corroborations.length, 1);
}

// Reconciliation never fabricates verification.
{
  const a = claim({ subject: "gym", value: "FitClub", basis: "user_stated", verification: "self_reported" });
  const b = claim({ subject: "gym", value: "FitClub", basis: "inferred", verification: "unverified" });
  const { resolved } = reconcilePassportClaims([a, b]);
  assert.equal(isVerifiedClaim(resolved[0].claim), false);
  assert.equal(resolved[0].verification, "self_reported"); // not upgraded
}

// Revoked and expired claims are dropped from the live Passport.
{
  const active = claim({ subject: "employer", value: "Acme", status: "active" });
  const revoked = claim({ subject: "former employer", value: "Initech", status: "revoked" });
  const expired = claim({ subject: "parking permit", value: "Zone A", status: "expired" });

  const { resolved } = reconcilePassportClaims([active, revoked, expired]);
  assert.deepEqual(resolved.map((r) => r.subject), ["employer"]);
}

// A verified claim requires both a source-confirmed basis and verification.
{
  assert.equal(
    isVerifiedClaim(claim({ basis: "source_confirmed", verification: "source_confirmed" })),
    true,
  );
  assert.equal(
    isVerifiedClaim(claim({ basis: "source_confirmed", verification: "system_logged" })),
    false,
  );
}

console.log("passport-claims tests passed");
