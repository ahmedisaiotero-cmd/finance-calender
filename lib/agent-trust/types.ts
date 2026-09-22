/**
 * Agent-identity and permission contracts.
 *
 * These are compile-safe domain types only. They are not persisted yet.
 * Human identity assurance is never the same enum as Activity verification.
 */

import type { VerificationLevel } from "@/lib/activity/types";

export type IdentityAssuranceTier =
  | "account_verified"
  | "self_attested"
  | "source_linked"
  | "identity_proofed";

export type IdentityAssuranceStatus =
  | "pending"
  | "verified"
  | "failed"
  | "expired"
  | "revoked";

export type AdapterSupportState =
  | "native"
  | "mcp"
  | "a2a"
  | "manual"
  | "unsupported";

export type PermissionAction =
  | "read"
  | "append"
  | "update"
  | "delete"
  | "execute"
  | "share";

export type ConnectionStatus =
  | "pending"
  | "healthy"
  | "degraded"
  | "expired"
  | "revoked"
  | "manual_only";

export type OwnerRef = {
  userId: string;
  workspaceId: string;
};

export type PrincipalIdentity = {
  id: string;
  owner: OwnerRef;
  assuranceTier: IdentityAssuranceTier;
  assuranceStatus: IdentityAssuranceStatus;
  proofingMethod?: string | null;
  /** Opaque processor reference. Never a document number or SSN. */
  proofingProviderRef?: string | null;
  subjectBindingKeyRef?: string | null;
  jurisdiction?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
};

export type AgentIdentity = {
  id: string;
  owner: OwnerRef;
  principalId: string;
  provider: string;
  providerAccountSubject?: string | null;
  displayName: string;
  agentType: string;
  declaredCapabilities: string[];
  supportedProtocols: AdapterSupportState[];
  publicMetadata: Record<string, string>;
  privateMetadata: Record<string, string>;
  signingKeyRef?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  status: "active" | "paused" | "revoked" | "expired";
  revokedAt?: string | null;
};

export type AgentCard = {
  agentId: string;
  name: string;
  description: string;
  capabilities: string[];
  skills: string[];
  interfaces: string[];
  securityRequirements: string[];
  signatureRef?: string | null;
};

export type Connection = {
  id: string;
  owner: OwnerRef;
  principalId: string;
  agentId?: string | null;
  adapter: AdapterSupportState;
  provider: string;
  externalSubjectId?: string | null;
  protocol: string;
  grantedScopes: string[];
  status: ConnectionStatus;
  tokenVaultRef?: string | null;
  consentReceiptId?: string | null;
  lastVerifiedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
};

export type PermissionGrant = {
  id: string;
  owner: OwnerRef;
  agentId: string;
  resource: string;
  actions: PermissionAction[];
  purpose: string;
  source?: string | null;
  destination?: string | null;
  constraints?: {
    expiresAt?: string | null;
    environment?: string | null;
    spendLimit?: number | null;
    requiresFreshApproval?: boolean;
  };
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  consentVersion: string;
  syncEnforced: boolean;
  providerEnforced: boolean;
};

export type Delegation = {
  id: string;
  owner: OwnerRef;
  principalId: string;
  agentId: string;
  audience: string;
  grantIds: string[];
  purpose: string;
  issuedAt: string;
  expiresAt: string;
  depth: number;
  redelegationAllowed: boolean;
  revokedAt?: string | null;
  proofRef?: string | null;
};

export type ContextPackage = {
  id: string;
  owner: OwnerRef;
  audienceAgentId: string;
  purpose: string;
  version: number;
  claims: Array<{ key: string; value: string; provenance: VerificationLevel }>;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
};

export type ActivityReceipt = {
  activityEventId: string;
  owner: OwnerRef;
  principalId: string;
  agentId?: string | null;
  connectionId?: string | null;
  grantId?: string | null;
  delegationId?: string | null;
  provenance: VerificationLevel;
  identityAssuranceAtTime: IdentityAssuranceTier;
};

export type CredentialAttestation = {
  id: string;
  issuer: "sync";
  subjectPrincipalId: string;
  claims: Record<string, string>;
  audience?: string | null;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  proofRef?: string | null;
  schemaVersion: number;
  governmentIssued: false;
};
