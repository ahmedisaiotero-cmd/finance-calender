# ADR 002 — OAuth, MCP, A2A, and verifiable credentials

**Status:** accepted  
**Date:** 2026-09-19

## Decision

Use existing standards as **boundaries**, not as a reason to invent a Sync protocol. Do not implement every standard in v1.

| Concern | Standard | Sync’s job |
|---|---|---|
| Host/agent access | OAuth 2.1-style + PKCE; MCP authorization | Issue/validate tokens and scopes on every call |
| Fine-grained consent | RFC 9396 RAR (`authorization_details`) | Structured grants, not a blob of prose |
| Sender-constrained tokens | DPoP (RFC 9449) where supported | Reduce bearer replay |
| Agent discovery | A2A Agent Cards | Public capabilities + security requirements |
| Portable attestations | W3C VC 2.0, OpenID4VCI, OpenID4VP | Sync-issued claims, clearly labeled |
| Revocation at scale | W3C Bitstring Status List (later) | Status of credentials, not activity history |

None of these alone is the product. OAuth/MCP governs access. A2A describes agents. VCs express portable claims. **Sync defines and enforces the user’s authorization policy.**

Review this mapping at least quarterly so protocol and legal changes do not silently stale the architecture.

## v1 vs later

**v1:** official OAuth/MCP connections, internal signed attestations labeled Sync-issued, GitHub as first source-confirmed verifier.

**Later:** OpenID4VC presentation, DPoP everywhere it is supported, A2A task exchange, status lists.

## Forbidden substitutes

Browser scraping, copied cookies, user passwords for third-party AIs, and unofficial automation are unsupported — never simulated as `native` or `mcp`.
