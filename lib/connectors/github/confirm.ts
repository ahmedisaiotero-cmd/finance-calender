import { randomUUID } from "node:crypto";

import { appendSourceConfirmedActivityEvent } from "@/lib/activity/ledger";
import type {
  ActivityEventStore,
  AppendActivityEventResult,
} from "@/lib/activity/ledger-types";
import {
  assertOwnerMatch,
  grantAllows,
} from "@/lib/agent-trust/invariants";
import type {
  Connection,
  IdentityAssuranceTier,
  PermissionGrant,
} from "@/lib/agent-trust/types";
import type { ActivityOwner } from "@/lib/activity/ledger-types";
import {
  fetchGithubCommit,
  githubCommitApiUrl,
  type GithubCommitQuery,
  type GithubFetch,
} from "@/lib/connectors/github/client";
import { GithubConnectorError } from "@/lib/connectors/github/errors";

export type GithubAccess = {
  connection: Connection;
  grant: PermissionGrant;
  accessToken: string;
};

export function assertGithubReadAccess(
  owner: ActivityOwner,
  access: GithubAccess,
  query: GithubCommitQuery,
  nowIso: string,
): void {
  assertOwnerMatch(owner, access.connection.owner);
  assertOwnerMatch(owner, access.grant.owner);
  if (access.connection.provider !== "github") {
    throw new GithubConnectorError("wrong_provider", "This is not a GitHub connection");
  }
  if (access.connection.revokedAt || access.connection.status === "revoked") {
    throw new GithubConnectorError(
      "connection_revoked",
      "GitHub access has been revoked",
      403,
    );
  }
  if (access.connection.status !== "healthy") {
    throw new GithubConnectorError(
      "connection_unhealthy",
      "GitHub connection is not live",
      403,
    );
  }
  if (!grantAllows(access.grant, "read", nowIso)) {
    throw new GithubConnectorError(
      "grant_inactive",
      "GitHub read grant is not active",
      403,
    );
  }
  const expected = `github:repo:${query.repoOwner}/${query.repo}`;
  if (access.grant.resource !== expected && access.grant.resource !== "github:public_commit") {
    throw new GithubConnectorError(
      "grant_resource_mismatch",
      "Grant does not cover this repository",
      403,
    );
  }
}

export function revokeGithubAccess(
  access: GithubAccess,
  nowIso: string,
): GithubAccess {
  return {
    accessToken: "",
    connection: {
      ...access.connection,
      status: "revoked",
      revokedAt: nowIso,
      tokenVaultRef: null,
    },
    grant: {
      ...access.grant,
      revokedAt: nowIso,
    },
  };
}

export async function confirmGithubCommit(input: {
  owner: ActivityOwner;
  access: GithubAccess;
  query: GithubCommitQuery;
  identityAssuranceAtTime: IdentityAssuranceTier;
  priorEventId?: string | null;
  idempotencyKey: string;
  nowIso: string;
  store: ActivityEventStore;
  fetchImpl?: GithubFetch;
}): Promise<AppendActivityEventResult> {
  void input.identityAssuranceAtTime;
  assertGithubReadAccess(input.owner, input.access, input.query, input.nowIso);

  const commit = await fetchGithubCommit({
    query: input.query,
    accessToken: input.access.accessToken,
    fetchImpl: input.fetchImpl,
  });

  return appendSourceConfirmedActivityEvent(
    {
      owner: input.owner,
      priorEventId: input.priorEventId,
      idempotencyKey: input.idempotencyKey,
      event: {
        id: `gh-confirm-${randomUUID()}`,
        kind: "context_access",
        actor: {
          kind: "connector",
          id: input.access.connection.id,
          label: "GitHub",
        },
        source: {
          service: "github",
          connectionId: input.access.connection.id,
          external: true,
        },
        timestamp: commit.committedAt ?? input.nowIso,
        affectedAreas: ["work"],
        summary: `GitHub confirmed the referenced commit exists in ${commit.repoFullName}.`,
        evidence: [
          {
            kind: "source_record",
            description: `Official GET ${githubCommitApiUrl({
              repoOwner: input.query.repoOwner,
              repo: input.query.repo,
              sha: commit.sha,
            })} returned this SHA. This confirms only that GitHub returned the referenced resource.`,
            sourceRef: commit.sourceRef,
            capturedAt: input.nowIso,
          },
        ],
        verification: "source_confirmed",
        confidence: 0.95,
        reversibility: "reversible",
        permission: {
          scope: "github.commit.read",
          state: "granted",
        },
        visibility: "visible",
        correlationId: input.priorEventId ?? input.access.connection.id,
        relatedEventIds: input.priorEventId ? [input.priorEventId] : undefined,
        detail: {
          provider: "github",
          repoFullName: commit.repoFullName,
          sha: commit.sha,
          htmlUrl: commit.htmlUrl,
          apiEndpoint: commit.apiUrl,
          confirmedAt: input.nowIso,
          grantId: input.access.grant.id,
        },
      },
    },
    { store: input.store, now: () => new Date(input.nowIso) },
  );
}
