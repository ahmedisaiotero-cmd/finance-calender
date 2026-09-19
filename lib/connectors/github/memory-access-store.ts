import { randomUUID } from "node:crypto";

import type { ActivityOwner } from "@/lib/activity/ledger-types";
import { sameOwner } from "@/lib/agent-trust/invariants";
import type { Connection, PermissionGrant } from "@/lib/agent-trust/types";
import type { GithubAccess } from "@/lib/connectors/github/confirm";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import { decryptToken, encryptToken } from "@/lib/secrets/token-vault";

export type GithubAccessStore = {
  put(access: GithubAccess, vaultKey: string): Promise<GithubAccess>;
  get(owner: ActivityOwner, connectionId: string, vaultKey: string): Promise<GithubAccess>;
  revoke(owner: ActivityOwner, connectionId: string, nowIso: string): Promise<GithubAccess>;
};

export function createMemoryGithubAccessStore(): GithubAccessStore {
  const connections = new Map<string, Connection>();
  const grants = new Map<string, PermissionGrant>();
  const tokens = new Map<string, string>();

  return {
    async put(access, vaultKey) {
      const vaultRef = access.connection.tokenVaultRef ?? `vault-${randomUUID()}`;
      const connection = { ...access.connection, tokenVaultRef: vaultRef };
      const grant = { ...access.grant, source: connection.id };
      connections.set(connection.id, connection);
      grants.set(grant.id, grant);
      tokens.set(vaultRef, encryptToken(access.accessToken, vaultKey));
      return { connection, grant, accessToken: access.accessToken };
    },

    async get(owner, connectionId, vaultKey) {
      const connection = connections.get(connectionId);
      if (!connection || !sameOwner(owner, connection.owner)) {
        throw new GithubConnectorError(
          "connection_not_found",
          "Connection was not found",
          404,
        );
      }
      const grant = [...grants.values()].find(
        (item) => item.source === connectionId && sameOwner(owner, item.owner),
      );
      if (!grant) {
        throw new GithubConnectorError("grant_not_found", "Grant was not found", 404);
      }
      if (!connection.tokenVaultRef || !tokens.has(connection.tokenVaultRef)) {
        throw new GithubConnectorError(
          "connection_revoked",
          "GitHub access has been revoked",
          403,
        );
      }
      return {
        connection,
        grant,
        accessToken: decryptToken(tokens.get(connection.tokenVaultRef)!, vaultKey),
      };
    },

    async revoke(owner, connectionId, nowIso) {
      const connection = connections.get(connectionId);
      if (!connection || !sameOwner(owner, connection.owner)) {
        throw new GithubConnectorError(
          "connection_not_found",
          "Connection was not found",
          404,
        );
      }
      if (connection.tokenVaultRef) {
        tokens.delete(connection.tokenVaultRef);
      }
      const next: Connection = {
        ...connection,
        status: "revoked",
        revokedAt: nowIso,
        tokenVaultRef: null,
      };
      connections.set(connectionId, next);
      let grant: PermissionGrant | undefined;
      for (const [id, item] of grants) {
        if (item.source === connectionId && sameOwner(owner, item.owner)) {
          grant = { ...item, revokedAt: nowIso };
          grants.set(id, grant);
        }
      }
      if (!grant) {
        throw new GithubConnectorError("grant_not_found", "Grant was not found", 404);
      }
      return { connection: next, grant, accessToken: "" };
    },
  };
}
