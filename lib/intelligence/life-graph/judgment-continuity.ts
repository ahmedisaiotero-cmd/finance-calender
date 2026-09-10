import type { CapturedSyncItem } from "@/lib/captured-items";
import { toDateKey } from "@/lib/calendar-utils";
import { buildLifeGraphSnapshot } from "@/lib/intelligence/life-graph/build-life-graph";
import { buildDecisionGraphContext } from "@/lib/intelligence/life-graph/decision-context";
import { normalizeCapturedItems } from "@/lib/intelligence/life-graph/normalize-observation";
import { runReasoningEngine } from "@/lib/intelligence/life-graph/reasoning-engine";
import type {
  ContinuityResolutionStatus,
  DecisionGraphContext,
  LifeGraphSnapshot,
} from "@/lib/intelligence/life-graph/types";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";

const TERMINAL_STATUSES = new Set<ContinuityResolutionStatus>([
  "completed",
  "archived",
  "no_longer_relevant",
  "contradicted",
  "historical_context",
]);

const OPEN_LOOP_STATUSES = new Set<ContinuityResolutionStatus>([
  "stalled",
  "resurfacing",
  "active",
]);

export type JudgmentGraphContext = {
  snapshot: LifeGraphSnapshot;
  context: DecisionGraphContext;
};

export function buildJudgmentGraphContext(input: {
  items: CapturedSyncItem[];
  consequences?: SyncConsequence[];
  reference: Date;
}): JudgmentGraphContext {
  const referenceDate = toDateKey(input.reference);
  const snapshot = buildLifeGraphSnapshot({
    normalizations: normalizeCapturedItems(input.items),
    consequences: input.consequences,
    referenceDate,
    generatedAt: input.reference.toISOString(),
  });
  const reasoning = runReasoningEngine(snapshot);
  return {
    snapshot,
    context: buildDecisionGraphContext(snapshot, reasoning),
  };
}

type ContinuityCandidate = {
  text: string;
  score: number;
  scoreBreakdown?: {
    base: number;
    todayBoost: number;
    tomorrowBoost: number;
    timeProximity: number;
    profilePriority: number;
    specificity: number;
    penalty: number;
  };
  consequence: { sourceMemoryId: string | null } | null;
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function memoryIdsForNodeIds(snapshot: LifeGraphSnapshot, nodeIds: string[]) {
  const wanted = new Set(nodeIds);
  return unique(
    snapshot.nodes
      .filter((node) => wanted.has(node.id))
      .flatMap((node) => node.evidenceMemoryIds),
  );
}

function candidateMemoryIds(
  candidate: ContinuityCandidate,
  items: CapturedSyncItem[],
): string[] {
  const ids: string[] = [];
  if (candidate.consequence?.sourceMemoryId) {
    ids.push(candidate.consequence.sourceMemoryId);
  }

  const text = candidate.text.toLowerCase();
  for (const item of items) {
    const titleTokens = item.title
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 3);
    if (titleTokens.length > 0 && titleTokens.every((token) => text.includes(token))) {
      ids.push(item.id);
      continue;
    }
    const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();
    if (prompt.length >= 12 && text.includes(prompt.slice(0, 18))) {
      ids.push(item.id);
    }
  }

  return unique(ids);
}

/**
 * Judgment adjustments from Life Graph continuity.
 * Terminal loops (completed, contradicted, archived) lose Today attention.
 * Open unfinished loops get a modest boost and never override a terminal mark.
 */
export function applyJudgmentGraphContinuity<T extends ContinuityCandidate>(
  candidates: T[],
  items: CapturedSyncItem[],
  graph: JudgmentGraphContext,
): T[] {
  const terminalMemoryIds = new Set<string>();
  const openMemoryIds = new Set<string>();

  for (const resolution of graph.context.continuityResolutions) {
    const memoryIds = memoryIdsForNodeIds(graph.snapshot, [
      resolution.targetNodeId,
      ...resolution.evidenceNodeIds,
    ]);
    const target = TERMINAL_STATUSES.has(resolution.status)
      ? terminalMemoryIds
      : OPEN_LOOP_STATUSES.has(resolution.status)
        ? openMemoryIds
        : null;
    if (!target) continue;
    for (const memoryId of memoryIds) {
      target.add(memoryId);
    }
  }

  for (const signal of graph.context.continuitySignals) {
    if (signal.decisionRelevance !== "high" && signal.decisionRelevance !== "medium") {
      continue;
    }
    if (
      signal.kind !== "delayed_decision" &&
      signal.kind !== "unfinished_loop" &&
      signal.kind !== "resurfaced_goal"
    ) {
      continue;
    }
    for (const memoryId of signal.memoryIds) {
      openMemoryIds.add(memoryId);
    }
  }

  for (const belief of graph.context.beliefs) {
    const contradicted = memoryIdsForNodeIds(graph.snapshot, belief.contradictedByNodeIds);
    for (const memoryId of contradicted) {
      terminalMemoryIds.add(memoryId);
    }
  }

  return candidates.map((candidate) => {
    const linked = candidateMemoryIds(candidate, items);
    const isTerminal = linked.some((id) => terminalMemoryIds.has(id));
    const isOpenLoop = !isTerminal && linked.some((id) => openMemoryIds.has(id));
    if (!isTerminal && !isOpenLoop) return candidate;

    const breakdown = candidate.scoreBreakdown
      ? { ...candidate.scoreBreakdown }
      : {
          base: candidate.score,
          todayBoost: 0,
          tomorrowBoost: 0,
          timeProximity: 0,
          profilePriority: 0,
          specificity: 0,
          penalty: 0,
        };

    if (isTerminal) {
      breakdown.penalty -= 80;
    } else {
      breakdown.specificity += 16;
    }

    const score =
      breakdown.base +
      breakdown.todayBoost +
      breakdown.tomorrowBoost +
      breakdown.timeProximity +
      breakdown.profilePriority +
      breakdown.specificity +
      breakdown.penalty;

    return {
      ...candidate,
      score,
      scoreBreakdown: breakdown,
    };
  });
}
