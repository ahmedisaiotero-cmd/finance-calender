import type { ActivityEvent } from "@/lib/activity/types";

export type GithubCommitReceiptView = {
  heading: "Confirmed by GitHub";
  whatSyncRead: string;
  confirmedAt: string;
  verification: string;
  role: {
    read: string;
    decision: string;
    action: string;
  };
  evidence: Array<{ label: string; value: string }>;
  doesNotClaim: string[];
};

/**
 * Human-readable receipt for one official GitHub commit read.
 * Does not invent authorship, ownership, or legal identity.
 */
export function presentGithubCommitReceipt(event: ActivityEvent): GithubCommitReceiptView {
  const detail = event.detail ?? {};
  const repo = String(detail.repoFullName ?? detail.repo ?? "");
  const sha = String(detail.sha ?? "");
  const htmlUrl = String(detail.htmlUrl ?? "");
  const apiEndpoint = String(detail.apiEndpoint ?? "");
  const confirmedAt = String(detail.confirmedAt ?? event.timestamp);
  const evidenceCapturedAt =
    event.evidence.find((item) => item.capturedAt)?.capturedAt ?? confirmedAt;

  return {
    heading: "Confirmed by GitHub",
    whatSyncRead: apiEndpoint
      ? `Official GitHub API read of ${repo} commit ${sha}.`
      : event.summary,
    confirmedAt,
    verification: event.verification,
    role: {
      read: "Sync asked GitHub whether this commit exists and received a successful official response.",
      decision: "No judgment was made about whether the commit matters today.",
      action: "Nothing was written, merged, paid, messaged, or deleted.",
    },
    evidence: [
      { label: "Provider", value: "GitHub" },
      { label: "Repository", value: repo },
      { label: "Commit SHA", value: sha },
      { label: "Canonical URL", value: htmlUrl },
      { label: "Confirmed", value: evidenceCapturedAt },
      { label: "Endpoint", value: apiEndpoint },
      { label: "Verification", value: event.verification },
    ].filter((row) => row.value),
    doesNotClaim: [
      "This does not mean you authored the commit.",
      "This does not mean you own the repository.",
      "This does not verify your legal identity.",
      "This does not confirm that the commit contents are true.",
    ],
  };
}
