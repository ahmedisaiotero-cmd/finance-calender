import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildDecisionGraphContext } from "@/lib/intelligence/life-graph/decision-context";
import { buildLifeGraphSnapshot } from "@/lib/intelligence/life-graph/build-life-graph";
import { buildNarrativeContext } from "@/lib/intelligence/life-graph/narrative-context";
import { normalizeCapturedItems } from "@/lib/intelligence/life-graph/normalize-observation";
import {
  runReasoningEngine,
  type ReasoningEngineOutput,
} from "@/lib/intelligence/life-graph/reasoning-engine";
import type {
  LifeGraphSnapshot,
  NarrativeTone,
} from "@/lib/intelligence/life-graph/types";

export type LifeGraphDiagnostics = {
  snapshotId: string;
  observationCount: number;
  normalizedObjectCount: number;
  nodeCount: number;
  edgeCount: number;
  continuitySignalSummaries: string[];
  continuityResolutionStatuses: string[];
  interpretationSummaries: string[];
  beliefStatements: string[];
  relevantNodeCount: number;
  narrativePreferredTone: NarrativeTone;
  narrativeEvidenceLines: string[];
  narrativeForbiddenClaims: string[];
};

export type BuildLifeGraphDiagnosticsInput = {
  items: CapturedSyncItem[];
  referenceDate?: string;
  generatedAt?: string;
};

function isoDateOnly(value: string) {
  return value.slice(0, 10);
}

function fallbackDateFromItems(items: CapturedSyncItem[]) {
  if (items.length === 0) return "1970-01-01";

  const sorted = items
    .map((item) => item.createdAt || item.updatedAt)
    .filter(Boolean)
    .sort();
  const last = sorted.at(-1);
  return last ? isoDateOnly(last) : "1970-01-01";
}

function fallbackGeneratedAt(items: CapturedSyncItem[], referenceDate: string) {
  if (items.length === 0) return `${referenceDate}T00:00:00.000Z`;

  const sorted = items
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .sort();
  return sorted.at(-1) ?? `${referenceDate}T00:00:00.000Z`;
}

function buildSnapshot(input: BuildLifeGraphDiagnosticsInput): LifeGraphSnapshot {
  const referenceDate = input.referenceDate ?? fallbackDateFromItems(input.items);
  const generatedAt =
    input.generatedAt ?? fallbackGeneratedAt(input.items, referenceDate);

  return buildLifeGraphSnapshot({
    normalizations: normalizeCapturedItems(input.items),
    referenceDate,
    generatedAt,
  });
}

function buildInterpretationSummary(reasoning: ReasoningEngineOutput) {
  return reasoning.interpretations.map(
    (item) => `${item.factualUnderstanding} ${item.interpretation}`,
  );
}

export function buildLifeGraphDiagnostics(
  input: BuildLifeGraphDiagnosticsInput,
): LifeGraphDiagnostics {
  const snapshot = buildSnapshot(input);
  const reasoning = runReasoningEngine(snapshot);
  const decisionContext = buildDecisionGraphContext(snapshot, reasoning);
  const narrativeContext = buildNarrativeContext(
    decisionContext,
    snapshot,
    reasoning,
  );

  return {
    snapshotId: snapshot.id,
    observationCount: snapshot.observations.length,
    normalizedObjectCount: snapshot.normalizedObjects.length,
    nodeCount: snapshot.nodes.length,
    edgeCount: snapshot.edges.length,
    continuitySignalSummaries: reasoning.continuitySignals
      .map((signal) => signal.summary)
      .sort((left, right) => left.localeCompare(right)),
    continuityResolutionStatuses: reasoning.continuityResolutions
      .map((resolution) => resolution.status)
      .sort((left, right) => left.localeCompare(right)),
    interpretationSummaries: buildInterpretationSummary(reasoning).sort(
      (left, right) => left.localeCompare(right),
    ),
    beliefStatements: reasoning.beliefs
      .map((belief) => belief.statement)
      .sort((left, right) => left.localeCompare(right)),
    relevantNodeCount: decisionContext.relevantNodeIds.length,
    narrativePreferredTone: narrativeContext.preferredTone,
    narrativeEvidenceLines: [...narrativeContext.evidenceLines].sort((left, right) =>
      left.localeCompare(right),
    ),
    narrativeForbiddenClaims: [...narrativeContext.forbiddenClaims].sort(
      (left, right) => left.localeCompare(right),
    ),
  };
}
