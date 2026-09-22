# Sync Standards

**Technical trust and integration rules.** Product identity stays in `SYNC_PRODUCT.md`. Appearance stays in `SYNC_VISION.md`. Reasoning stays in `SYNC_REASONING_SPEC.md`.

This file is **rules**, not a research dump. Articles, vendor blogs, and interviews are **supporting evidence only**. They never redefine the product.

Do not implement OAuth, MCP, A2A, or verifiable-credential stacks because this document exists. Integrations remain deferred until context, reasoning, and proof are unified enough to trust (`SYNC_ENGINE_ROADMAP.md`). When that work is approved, it must obey these rules.

Existing Activity / Passport contracts (`lib/activity/*`, `lib/passport/*`) already encode parts of the proof chain. Reuse them. Do not invent a parallel trust model.

---

## How agents should use sources

| Kind of source | Role |
|---|---|
| `SYNC_PRODUCT.md` | What Sync is becoming |
| This file | What Sync must obey for trust, permissions, and integrations |
| `SYNC_VISION.md` | How it should feel |
| Reasoning specs | How a single input is understood and judged |
| Code and tests | What is implemented today |
| Articles / vendors | Supporting evidence for a rule — never product authority |

If an article conflicts with `SYNC_PRODUCT.md` or this file, keep the rule, discard the article’s product implication.

---

## Research adopted vs rejected

Translate outside ideas into the columns below. Do not paste source articles into the repo or into prompts.

| Source | What Sync adopts | What Sync rejects / defers |
|---|---|---|
| Cognizant / Salvi (AI agents and trust) | Provable trust; context as a security asset; receipts of what was seen, decided, and done; human accountability | CISO dashboard; guardian-agent product; enterprise control-plane UI |
| OAuth / MCP | Permissioned, user-approved connections with scoped access | Unlimited background access; hidden tools; stuffing MCP into the app as agent runtime |
| A2A (agent-to-agent) | Future exchange of trusted context between agents | Building agent-to-agent integrations before judgment and proof work |
| VC / OpenID4VC | Portable verified claims when a real issuer exists | Treating every inference or self-report as verified |
| Login.gov pattern | Separate **authentication** (who is signed in) from **identity proofing** (who they are in the world) | Mandatory government-ID verification to use Sync |
| Stripe Identity pattern | Optional, outsourced verification when the user chooses it | Storing biometric or government-ID payloads ourselves |

### Dated evidence (not product authority)

| Date | Signal | What Sync adopts | What Sync rejects |
|---|---|---|---|
| 2026-09-22 | Baselayer Series A / Know Your Agent, MCP business context, counterparty checks | The trust problem is real: permissioned context and verifiable activity matter | Roadmap change, enterprise dashboard, trust score, agent runtime, A2A, redesign |
| 2026-09-22 | Credential Broker for Agents and agent-authorization research | Short-lived scoped access, policy at the moment of action, trace to a human principal, provenance, auditable evidence | Treating draft papers as shipped standards; building a generic agent-security platform |

---

## 1. Permissioned access (OAuth / MCP)

When Sync connects to another system, access is **user-approved, scoped, and revocable**.

- Official OAuth (or equivalent) for accounts; MCP (or equivalent) only as a **permissioned tool boundary**, not as a hidden brain.
- Each connection has a verifiable identity, a minimum scope, and an expiry or revocation path.
- Deny-by-default: no scope means no access.
- Do not add MCP servers, n8n, or AI SDKs to the Sync **application runtime** as Cursor agent setup. That remains a development-workflow rule in `AGENTS.md`.

---

## 2. Agent communication (A2A)

Other AIs may eventually consume Sync context. That is an **output of the trust layer**, not a reason to ship integrations early.

- Any future agent exchange must carry provenance, scopes, and receipts.
- Do not build A2A, multi-agent meshes, or “guardian agents” until proof and judgment are trustworthy.

---

## 3. Portable verification (VC / OpenID4VC)

A **verified claim** requires an issuer, evidence, and a verification level. Inferences are not verified claims.

- Reuse Passport `basis` and `verification` (`user_stated`, `inferred`, `account_linked`, `source_confirmed`; unverified → self_reported → system_logged → source_confirmed).
- Never upgrade verification without new evidence.
- Portable credentials are optional later. Do not pretend Sync’s own inferences are credentials.

---

## 4. Authentication vs identity proofing

- **Authentication** answers: is this the signed-in user of this Sync account?
- **Identity proofing** answers: has a trusted issuer confirmed a real-world identity attribute?

Login must not require government ID, biometrics, or third-party identity proofing. Optional proofing, if ever offered, is outsourced and must not store sensitive biometric or ID payloads in Sync.

---

## 5. Proof chain

Every meaningful assertion follows:

**Source → event → evidence → claim → verification**

- **Source** — who or what produced it (user, Sync, a named connector). Opaque `connectionId`; never a token.
- **Event** — what happened (read, suggested, wrote, failed). Activity events.
- **Evidence** — what supports it, redacted of secrets.
- **Claim** — what Sync believes about the person (Passport).
- **Verification** — how strongly that is backed. Not a vibe.

Confidence, freshness, provenance, and revocation are first-class:

- Confidence is explicit and clamped; never fabricated.
- Stale evidence weakens or expires claims; it does not stay “confirmed” forever.
- Provenance is inspectable by the user in calm language — not only in lab logs.
- Users can revoke a connection, dispute a claim, or delete memory. Revocation must stop further use of that source.

Append-only **receipts** record what AI **saw**, **decided**, and **did**. Corrections add new events; they do not silently rewrite history. Secrets never appear on receipts.

---

## 6. Permissions and step-up

- **Deny by default.** Read, write, and share are separate permissions.
- **Step-up approval** before: payments, sending messages, deletion of user data, or sharing sensitive context with another person or AI.
- Higher-risk actions need stronger evidence and a clearer receipt than read-only questions.
- Unverified payments are not treated as settled.

---

## 7. Official integrations only

Allowed, when approved: official APIs, OAuth, user-consented connectors.

Forbidden:

- Copied cookies or session theft
- Stored user passwords for third-party sites
- Hidden browser automation to impersonate the user
- Scraping authenticated pages without an official, consented integration
- Assuming calendar, bank, or health access because it would be useful

Manual capture must keep working without any integration.

---

## 8. What these rules are not

These rules do not authorize:

- a security operations dashboard
- productivity or trust **scores**
- storing raw government ID or biometrics
- implementing MCP/A2A/VC in this change
- treating a news article as a spec

If a proposed integration cannot obey deny-by-default, receipts, and official access, it waits.
