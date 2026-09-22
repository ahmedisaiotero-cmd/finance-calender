# Sync privacy, data, and launch-blocking legal checklist

**Status:** engineering guidance, **not legal advice**. Counsel review is required before collecting government IDs or biometrics.

Canonical product: `SYNC_TRUST_LAYER.md`.

---

## Launch blockers (unresolved)

Mark these **blocked** until an owner closes them:

| ID | Item | Status |
|---|---|---|
| L1 | Privacy Policy, Terms, identity-proofing notice, subprocessor list, retention schedule, security contact published | **Blocked** |
| L2 | Privacy attorney review before any ID/biometric collection | **Blocked** |
| L3 | Identity-processor vendor review (privacy, retention, region, deletion, accuracy, accessibility, cost) | **Blocked** — no vendor selected |
| L4 | Adults-only enforcement and age gate designed and tested | **Blocked** |
| L5 | Production ledger migration reviewed and applied on purpose (not this task) | **Blocked** |
| L6 | Isolated non-production Postgres for integration tests (`SYNC_TEST_DATABASE_URL`) | **Blocked** |
| L7 | Encrypted token vault / KMS design implemented | **Blocked** |
| L8 | User export, correction, deletion, connection+credential revocation end-to-end | **Blocked** |
| L9 | Nationwide US state privacy/biometric counsel (beyond AZ/CA baseline notes) | **Blocked** |
| L10 | No EU/EEA identity-proofing launch without GDPR analysis and DPIA | **Blocked** (do not launch there) |

---

## Data map (minimum)

| Data | Where it should live | Must not |
|---|---|---|
| Account email, auth factors | Supabase Auth | Appear on activity events |
| Identity-assurance result | Future `PrincipalIdentity` | Share Activity `verification` field |
| Raw ID images, selfies, biometrics, SSN, DL/passport numbers | **Never in Sync** — processor only | Logs, prompts, fixtures, client storage |
| Provider OAuth tokens | Encrypted vault / KMS | Ledger JSON, URLs, analytics, `/api/chat` |
| Activity receipts | Append-only `ActivityEventRecord` | Contain tokens or raw ID evidence |
| Memory / captures | Existing capture store | Be treated as source-confirmed |
| Passport claims | Correctable claims, not history | Rewrite the ledger |

---

## Government ID and biometrics

- Optional unless a specific high-risk feature truly requires it.
- Specialist processor. Prefer a design where raw evidence never enters Sync.
- Store only outcome, provider reference, needed attributes, timestamps, expiry, jurisdiction, audit receipt.
- Separate notice/consent. No reuse for training, ads, or personality inference.
- Provide a non-biometric path when feasible.
- Do not claim fraud-proof, government verified, or NIST certified without precise evidence.

References for counsel (not compliance proof): FTC biometric warning; Arizona ARS 18-551/18-552; California CCPA; GDPR Art. 9 for EU.

---

## Product rules

- No sale of personal data; no cross-context behavioral advertising.
- Distinguish deleting Sync-held data vs revoking a third-party connection vs data the provider already has.
- Prompt injection and confused-deputy: untrusted retrieved content never expands permissions.
- An agent may never approve its own privilege escalation.
