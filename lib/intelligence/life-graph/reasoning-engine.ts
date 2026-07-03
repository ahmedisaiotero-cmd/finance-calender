import type {
  ContinuityResolution,
  ContinuitySignal,
  LifeGraphSnapshot,
  SyncBelief,
  SyncInterpretation,
} from "@/lib/intelligence/life-graph/types";
import { deriveBeliefs } from "@/lib/intelligence/life-graph/beliefs";
import { deriveContinuitySignals } from "@/lib/intelligence/life-graph/continuity";
import { deriveInterpretations } from "@/lib/intelligence/life-graph/interpretation";
import { resolveContinuity } from "@/lib/intelligence/life-graph/resolve-continuity";

export type ReasoningEngineOutput = {
  continuitySignals: ContinuitySignal[];
  continuityResolutions: ContinuityResolution[];
  interpretations: SyncInterpretation[];
  beliefs: SyncBelief[];
};

export function runReasoningEngine(
  snapshot: LifeGraphSnapshot,
): ReasoningEngineOutput {
  const continuitySignals = deriveContinuitySignals(snapshot);
  const continuityResolutions = resolveContinuity(snapshot, continuitySignals);
  const interpretations = deriveInterpretations(
    snapshot,
    continuitySignals,
    continuityResolutions,
  );

  return {
    continuitySignals,
    continuityResolutions,
    interpretations,
    beliefs: deriveBeliefs(
      snapshot,
      continuitySignals,
      continuityResolutions,
      interpretations,
    ),
  };
}
