import { GithubConnectorError } from "@/lib/connectors/github/errors";

export type GithubCommitQuery = {
  repoOwner: string;
  repo: string;
  sha: string;
};

export type GithubCommitRecord = {
  sha: string;
  committedAt: string | null;
  sourceRef: string;
  apiUrl: string;
  htmlUrl: string;
  repoFullName: string;
};

export type GithubFetch = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

const SHA_RE = /^[0-9a-f]{7,40}$/i;
const REPO_NAME_RE = /^[A-Za-z0-9_.-]+$/;

export function assertGithubCommitQuery(query: GithubCommitQuery): void {
  if (!REPO_NAME_RE.test(query.repoOwner) || !REPO_NAME_RE.test(query.repo)) {
    throw new GithubConnectorError(
      "invalid_repo",
      "Repository owner and name are invalid",
    );
  }
  if (!SHA_RE.test(query.sha)) {
    throw new GithubConnectorError("invalid_sha", "Commit SHA is invalid");
  }
}

export function githubCommitApiUrl(query: GithubCommitQuery): string {
  assertGithubCommitQuery(query);
  return `https://api.github.com/repos/${query.repoOwner}/${query.repo}/commits/${query.sha}`;
}

export function githubCommitHtmlUrl(query: GithubCommitQuery, sha: string): string {
  assertGithubCommitQuery({ ...query, sha });
  return `https://github.com/${query.repoOwner}/${query.repo}/commit/${sha}`;
}

export async function fetchGithubCommit(input: {
  query: GithubCommitQuery;
  accessToken: string;
  fetchImpl?: GithubFetch;
}): Promise<GithubCommitRecord> {
  assertGithubCommitQuery(input.query);
  if (!input.accessToken.trim()) {
    throw new GithubConnectorError("missing_token", "GitHub access is missing", 403);
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(githubCommitApiUrl(input.query), {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${input.accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sync-github-vertical-slice",
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new GithubConnectorError(
      "github_denied",
      "GitHub refused this read",
      403,
    );
  }
  if (response.status === 404) {
    throw new GithubConnectorError(
      "commit_not_found",
      "GitHub did not confirm that commit",
      404,
    );
  }
  if (!response.ok) {
    throw new GithubConnectorError(
      "github_unreachable",
      "GitHub commit lookup failed",
      502,
    );
  }

  const body = (await response.json()) as {
    sha?: unknown;
    commit?: { committer?: { date?: unknown } };
  };
  if (typeof body.sha !== "string" || !SHA_RE.test(body.sha)) {
    throw new GithubConnectorError(
      "github_malformed",
      "GitHub commit payload was not usable",
      502,
    );
  }
  if (!body.sha.toLowerCase().startsWith(input.query.sha.toLowerCase())) {
    throw new GithubConnectorError(
      "sha_mismatch",
      "GitHub returned a different commit",
      502,
    );
  }

  const committedAt =
    typeof body.commit?.committer?.date === "string"
      ? body.commit.committer.date
      : null;

  const repoFullName = `${input.query.repoOwner}/${input.query.repo}`;
  return {
    sha: body.sha,
    committedAt,
    sourceRef: `github:${repoFullName}/commit/${body.sha}`,
    apiUrl: githubCommitApiUrl({ ...input.query, sha: body.sha }),
    htmlUrl: githubCommitHtmlUrl(input.query, body.sha),
    repoFullName,
  };
}
