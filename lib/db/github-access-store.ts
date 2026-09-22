/**
 * Prisma persistence for GitHub connection + grant + vault.
 * Only this module writes ConnectionRecord / PermissionGrantRecord / TokenVaultRecord
 * for the GitHub slice.
 */

import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import type { ActivityOwner } from "@/lib/activity/ledger-types";
import type {
  AdapterSupportState,
  Connection,
  ConnectionStatus,
  PermissionAction,
  PermissionGrant,
} from "@/lib/agent-trust/types";
import type { GithubAccess } from "@/lib/connectors/github/confirm";
import type { GithubAccessStore } from "@/lib/connectors/github/memory-access-store";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import { decryptToken, encryptToken } from "@/lib/secrets/token-vault";

function toConnection(row: {
  id: string;
  userId: string;
  workspaceId: string;
  provider: string;
  adapter: string;
  protocol: string;
  status: string;
  externalSubjectId: string | null;
  grantedScopes: unknown;
  tokenVaultId: string | null;
  lastVerifiedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
}): Connection {
  return {
    id: row.id,
    owner: { userId: row.userId, workspaceId: row.workspaceId },
    principalId: `principal-${row.userId}`,
    agentId: "agent-github",
    adapter: row.adapter as AdapterSupportState,
    provider: row.provider,
    externalSubjectId: row.externalSubjectId,
    protocol: row.protocol,
    grantedScopes: Array.isArray(row.grantedScopes)
      ? (row.grantedScopes as string[])
      : [],
    status: row.status as ConnectionStatus,
    tokenVaultRef: row.tokenVaultId,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

function toGrant(row: {
  id: string;
  userId: string;
  workspaceId: string;
  connectionId: string;
  agentId: string;
  resource: string;
  actions: unknown;
  purpose: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  consentVersion: string;
  syncEnforced: boolean;
  providerEnforced: boolean;
}): PermissionGrant {
  return {
    id: row.id,
    owner: { userId: row.userId, workspaceId: row.workspaceId },
    agentId: row.agentId,
    resource: row.resource,
    actions: Array.isArray(row.actions) ? (row.actions as PermissionAction[]) : [],
    purpose: row.purpose,
    source: row.connectionId,
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    consentVersion: row.consentVersion,
    syncEnforced: row.syncEnforced,
    providerEnforced: row.providerEnforced,
  };
}

export function createPrismaGithubAccessStore(
  client: PrismaClient,
): GithubAccessStore {
  return {
    async put(access, vaultKey) {
      let vaultId = access.connection.tokenVaultRef ?? `vault-${randomUUID()}`;
      const existingVault = await client.tokenVaultRecord.findUnique({
        where: { id: vaultId },
      });
      if (
        existingVault &&
        (existingVault.userId !== access.connection.owner.userId ||
          existingVault.workspaceId !== access.connection.owner.workspaceId)
      ) {
        vaultId = `vault-${randomUUID()}`;
      }
      const ciphertext = encryptToken(access.accessToken, vaultKey);
      await client.tokenVaultRecord.upsert({
        where: { id: vaultId },
        create: {
          id: vaultId,
          userId: access.connection.owner.userId,
          workspaceId: access.connection.owner.workspaceId,
          ciphertext,
        },
        update: { ciphertext, destroyedAt: null },
      });
      await client.connectionRecord.upsert({
        where: { id: access.connection.id },
        create: {
          id: access.connection.id,
          userId: access.connection.owner.userId,
          workspaceId: access.connection.owner.workspaceId,
          provider: access.connection.provider,
          adapter: access.connection.adapter,
          protocol: access.connection.protocol,
          status: access.connection.status,
          externalSubjectId: access.connection.externalSubjectId ?? null,
          grantedScopes: access.connection.grantedScopes,
          tokenVaultId: vaultId,
          lastVerifiedAt: access.connection.lastVerifiedAt
            ? new Date(access.connection.lastVerifiedAt)
            : null,
          expiresAt: access.connection.expiresAt
            ? new Date(access.connection.expiresAt)
            : null,
          revokedAt: null,
        },
        update: {
          status: access.connection.status,
          tokenVaultId: vaultId,
          revokedAt: null,
          externalSubjectId: access.connection.externalSubjectId ?? null,
          grantedScopes: access.connection.grantedScopes,
        },
      });
      await client.permissionGrantRecord.upsert({
        where: { id: access.grant.id },
        create: {
          id: access.grant.id,
          userId: access.grant.owner.userId,
          workspaceId: access.grant.owner.workspaceId,
          connectionId: access.connection.id,
          agentId: access.grant.agentId,
          resource: access.grant.resource,
          actions: access.grant.actions,
          purpose: access.grant.purpose,
          issuedAt: new Date(access.grant.issuedAt),
          expiresAt: new Date(access.grant.expiresAt),
          revokedAt: null,
          consentVersion: access.grant.consentVersion,
          syncEnforced: access.grant.syncEnforced,
          providerEnforced: access.grant.providerEnforced,
        },
        update: {
          resource: access.grant.resource,
          actions: access.grant.actions,
          expiresAt: new Date(access.grant.expiresAt),
          revokedAt: null,
        },
      });
      return {
        ...access,
        connection: { ...access.connection, tokenVaultRef: vaultId },
      };
    },

    async get(owner, connectionId, vaultKey) {
      const row = await client.connectionRecord.findFirst({
        where: {
          id: connectionId,
          userId: owner.userId,
          workspaceId: owner.workspaceId,
        },
        include: { grants: true },
      });
      if (!row) {
        throw new GithubConnectorError(
          "connection_not_found",
          "Connection was not found",
          404,
        );
      }
      const grantRow = row.grants[0];
      if (!grantRow) {
        throw new GithubConnectorError("grant_not_found", "Grant was not found", 404);
      }
      if (!row.tokenVaultId || row.revokedAt) {
        throw new GithubConnectorError(
          "connection_revoked",
          "GitHub access has been revoked",
          403,
        );
      }
      const vault = await client.tokenVaultRecord.findFirst({
        where: {
          id: row.tokenVaultId,
          userId: owner.userId,
          workspaceId: owner.workspaceId,
          destroyedAt: null,
        },
      });
      if (!vault) {
        throw new GithubConnectorError(
          "connection_revoked",
          "GitHub access has been revoked",
          403,
        );
      }
      return {
        connection: toConnection(row),
        grant: toGrant(grantRow),
        accessToken: decryptToken(vault.ciphertext, vaultKey),
      };
    },

    async revoke(owner, connectionId, nowIso) {
      const existing = await client.connectionRecord.findFirst({
        where: {
          id: connectionId,
          userId: owner.userId,
          workspaceId: owner.workspaceId,
        },
        include: { grants: true },
      });
      if (!existing) {
        throw new GithubConnectorError(
          "connection_not_found",
          "Connection was not found",
          404,
        );
      }
      const now = new Date(nowIso);
      if (existing.tokenVaultId) {
        await client.tokenVaultRecord.updateMany({
          where: {
            id: existing.tokenVaultId,
            userId: owner.userId,
            workspaceId: owner.workspaceId,
          },
          data: { ciphertext: "", destroyedAt: now },
        });
      }
      const connection = await client.connectionRecord.update({
        where: { id: connectionId },
        data: { status: "revoked", revokedAt: now, tokenVaultId: null },
      });
      await client.permissionGrantRecord.updateMany({
        where: {
          connectionId,
          userId: owner.userId,
          workspaceId: owner.workspaceId,
        },
        data: { revokedAt: now },
      });
      const grantRow = existing.grants[0];
      if (!grantRow) {
        throw new GithubConnectorError("grant_not_found", "Grant was not found", 404);
      }
      return {
        connection: toConnection(connection),
        grant: toGrant({ ...grantRow, revokedAt: now }),
        accessToken: "",
      };
    },
  };
}

export async function findLatestGithubConnection(
  client: PrismaClient,
  owner: ActivityOwner,
): Promise<{ connectionId: string; status: string } | null> {
  const row = await client.connectionRecord.findFirst({
    where: {
      userId: owner.userId,
      workspaceId: owner.workspaceId,
      provider: "github",
      revokedAt: null,
      status: "healthy",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (!row) return null;
  return { connectionId: row.id, status: row.status };
}

export async function putGithubOAuthHandshake(
  client: PrismaClient,
  input: {
    owner: ActivityOwner;
    state: string;
    codeVerifierCipher: string;
    redirectUri: string;
    expiresAt: Date;
  },
) {
  await client.githubOAuthHandshake.create({
    data: {
      state: input.state,
      userId: input.owner.userId,
      workspaceId: input.owner.workspaceId,
      codeVerifierCipher: input.codeVerifierCipher,
      redirectUri: input.redirectUri,
      expiresAt: input.expiresAt,
    },
  });
}

export async function takeGithubOAuthHandshake(
  client: PrismaClient,
  owner: ActivityOwner,
  state: string,
) {
  const row = await client.githubOAuthHandshake.findFirst({
    where: { state, userId: owner.userId, workspaceId: owner.workspaceId },
  });
  if (!row) return null;
  await client.githubOAuthHandshake.delete({ where: { state } });
  return row;
}
