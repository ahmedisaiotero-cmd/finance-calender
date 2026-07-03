import type {
  DecisionGraphContext,
  LifeGraphSnapshot,
  NarrativeContext,
  NarrativeTone,
} from "@/lib/intelligence/life-graph/types";
import type { ReasoningEngineOutput } from "@/lib/intelligence/life-graph/reasoning-engine";

function unique(values: string[]) {
  return [...new Set(values)];
}

function interpretationById(
  reasoning: ReasoningEngineOutput,
  interpretationId: string,
) {
  return reasoning.interpretations.find(
    (interpretation) => interpretation.id === interpretationId,
  );
}

function hasStatus(context: DecisionGraphContext, status: string) {
  return context.continuityResolutions.some(
    (resolution) => resolution.status === status,
  );
}

function hasText(values: string[], pattern: RegExp) {
  return values.some((value) => pattern.test(value));
}

function resolutionTargetsMention(
  context: DecisionGraphContext,
  snapshot: LifeGraphSnapshot,
  status: string,
  pattern: RegExp,
) {
  return context.continuityResolutions.some((resolution) => {
    if (resolution.status !== status) return false;
    const target = snapshot.nodes.find((node) => node.id === resolution.targetNodeId);
    if (!target) return false;
    const attributes = target.metadata?.attributes as
      | { prompt?: string; originalPrompt?: string }
      | undefined;
    const text = [target.label, target.summary, attributes?.prompt, attributes?.originalPrompt]
      .filter(Boolean)
      .join(" ");
    return pattern.test(text);
  });
}

function collectEvidenceLines(
  context: DecisionGraphContext,
  snapshot: LifeGraphSnapshot,
  reasoning: ReasoningEngineOutput,
) {
  const lines: string[] = [];
  const statements = context.beliefs.map((belief) => belief.statement);
  const interpretationLines = context.interpretationIds
    .map((interpretationId) => interpretationById(reasoning, interpretationId))
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .map((interpretation) => interpretation.interpretation);

  if (
    resolutionTargetsMention(context, snapshot, "stalled", /\buber\b/i)
  ) {
    lines.push("Uber cancellation appears unresolved.");
  }

  if (
    context.continuityResolutions.some(
      (resolution) =>
        resolution.status === "completed" &&
        /uber/i.test(resolution.reason),
    )
  ) {
    lines.push("Uber cancellation appears completed.");
  }

  if (
    hasText(statements, /mustang goal has resurfaced/i) ||
    context.continuityResolutions.some(
      (resolution) => resolution.status === "resurfacing",
    )
  ) {
    lines.push("The Mustang goal has resurfaced more than once.");
  }

  if (
    hasText(statements, /vending idea appears archived/i) ||
    context.continuityResolutions.some(
      (resolution) =>
        resolution.status === "archived" ||
        resolution.status === "historical_context",
    )
  ) {
    lines.push("The vending idea appears archived based on explicit wording.");
  }

  if (hasText(statements, /sync appears to be an active project/i)) {
    lines.push("Sync appears to be an active project.");
  }

  if (
    hasText(statements, /money has been a recurring area of attention/i) ||
    hasText(interpretationLines, /money timing/i)
  ) {
    lines.push("Money has been a recurring area of attention.");
    if (hasText(interpretationLines, /money timing/i)) {
      lines.push("Payday may matter because of upcoming money timing.");
    }
  }

  if (
    hasText(interpretationLines, /family timing|near-term family/i) ||
    context.continuitySignals.some((signal) => /family|relationship/i.test(signal.summary))
  ) {
    lines.push("Family timing may matter in the near term.");
  }

  // Keep weak/neutral contexts minimal.
  if (lines.length === 0 && snapshot.nodes.length <= 2) {
    return [];
  }

  return unique(lines).sort((left, right) => left.localeCompare(right));
}

function collectForbiddenClaims(context: DecisionGraphContext) {
  const claims = [
    "Do not say the user is bad with money.",
    "Do not make psychological claims from one memory.",
  ];

  if (hasStatus(context, "stalled")) {
    claims.push("Do not imply this loop is already complete.");
  }

  if (hasStatus(context, "completed")) {
    claims.push("Do not imply a loop is unresolved after completion evidence exists.");
  }

  if (
    context.beliefs.some((belief) => /mustang/i.test(belief.statement)) ||
    hasStatus(context, "resurfacing")
  ) {
    claims.push("Do not call a stated car goal a recommendation.");
  }

  if (hasStatus(context, "archived") || hasStatus(context, "historical_context")) {
    claims.push("Do not treat archived ideas as active goals.");
  }

  return unique(claims).sort((left, right) => left.localeCompare(right));
}

function resolvePreferredTone(
  context: DecisionGraphContext,
  evidenceLines: string[],
): NarrativeTone {
  if (hasStatus(context, "stalled") || hasStatus(context, "completed")) {
    return "direct";
  }

  if (hasText(evidenceLines, /family timing|relationship/i)) {
    return "gentle";
  }

  if (
    hasText(evidenceLines, /money timing|money has been a recurring area|active project|resurfaced/i)
  ) {
    return "calm";
  }

  return "uncertain";
}

export function buildNarrativeContext(
  decisionContext: DecisionGraphContext,
  snapshot: LifeGraphSnapshot,
  reasoning: ReasoningEngineOutput,
): NarrativeContext {
  const evidenceLines = collectEvidenceLines(decisionContext, snapshot, reasoning);
  const forbiddenClaims = collectForbiddenClaims(decisionContext);

  return {
    decisionContext,
    preferredTone: resolvePreferredTone(decisionContext, evidenceLines),
    evidenceLines,
    forbiddenClaims,
    preserveDecisionOrder: true,
  };
}
