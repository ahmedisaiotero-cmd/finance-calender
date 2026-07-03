import type { CapturedSyncItem } from "@/lib/captured-items";

export type PatternType =
  | "routine_drift"
  | "financial_pressure"
  | "emotional_strain"
  | "health_decline"
  | "work_pressure"
  | "relationship_strain"
  | "recovery"
  | "cross_domain_pressure";

export type PatternDomain =
  | "routine"
  | "finance"
  | "emotional"
  | "health"
  | "work"
  | "relationships"
  | "cross_domain";

export type PatternHorizon =
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "background";

export type PatternMomentum =
  | "emerging"
  | "growing"
  | "stable"
  | "escalating"
  | "recovering"
  | "resolved";

export type PatternLifecycle =
  | "candidate"
  | "active"
  | "watching"
  | "dormant"
  | "resolved";

export type PatternSignal = {
  id: string;
  memoryId: string;
  signalKind: string;
  domain: PatternDomain;
  severity: "low" | "medium" | "high";
  polarity: "negative" | "positive";
  timestamp: string;
  contribution: number;
};

export type Pattern = {
  id: string;
  type: PatternType;
  domain: PatternDomain;
  involvedMemoryIds: string[];
  supportingEvidence: Array<{
    memoryId: string;
    signalKind: string;
    timestamp: string;
    weightContribution: number;
  }>;
  confidence: {
    level: "low" | "medium" | "high";
    score: number;
  };
  strength: number;
  momentum: PatternMomentum;
  lifecycle: PatternLifecycle;
  firstSeen: string;
  lastUpdated: string;
  horizon: PatternHorizon;
  status: "quiet" | "monitor";
  privacySensitivity: "normal" | "sensitive" | "high_sensitive";
  explanation: string;
  momentumScore?: number;
  recoveryScore?: number;
  severityScore?: number;
  recencyScore?: number;
  evidenceCount?: number;
  lastSignalAt?: string;
  lifecycleReason?: string;
};

export type PatternStateSnapshot = {
  generatedAt: string;
  patterns: Pattern[];
  signals: PatternSignal[];
};

type CandidateAccumulator = {
  type: PatternType;
  domain: PatternDomain;
  evidence: PatternSignal[];
  explanation: string;
  privacySensitivity: Pattern["privacySensitivity"];
};

type MomentumScores = {
  frequencyScore: number;
  recencyScore: number;
  severityScore: number;
  recoveryScore: number;
  momentumScore: number;
  evidenceCount: number;
  lastSignalAt: string;
  recentRecoveryCount: number;
};

const LOW_VALUE_PATTERN =
  /\b(coffee|brushed teeth|brush(?:ed)? teeth|random video|watched random video|watched a video|drank coffee)\b/i;
const SENSITIVE_PATTERN =
  /\b(password|passcode|api key|sk-(?:test|live)-|credit card|ssn|social security)\b/i;

const RECENT_WINDOW_DAYS = 14;
const STALE_THRESHOLD_DAYS = 21;
const RESOLVE_RECOVERY_RATIO = 0.65;

function isActive(item: CapturedSyncItem) {
  return item.status !== "cancelled" && !item.deletedAt;
}

function normalizeText(item: CapturedSyncItem) {
  return `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
}

function daysSince(iso: string, reference: Date) {
  const date = new Date(iso);
  return Math.max(
    0,
    Math.floor((reference.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

function daysUntil(dateKey: string | null | undefined, reference: Date) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function horizonFor(items: CapturedSyncItem[], reference: Date): PatternHorizon {
  const horizons = items
    .map((item) => {
      const dateKey = item.timeline?.startDate ?? item.timeline?.deadlineDate ?? null;
      return daysUntil(dateKey, reference);
    })
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  const soonest = horizons[0];
  if (soonest == null) return "background";
  if (soonest <= 0) return "today";
  if (soonest === 1) return "tomorrow";
  if (soonest <= 7) return "this_week";
  return "later";
}

function severityWeight(severity: PatternSignal["severity"]) {
  if (severity === "high") return 1;
  if (severity === "medium") return 0.65;
  return 0.35;
}

function recencyWeight(ageDays: number) {
  if (ageDays <= 2) return 1;
  if (ageDays <= 7) return 0.85;
  if (ageDays <= RECENT_WINDOW_DAYS) return 0.6;
  if (ageDays <= 30) return 0.35;
  return 0.15;
}

function confidenceFrom(
  strength: number,
  recoveryPenalty = 0,
): { level: "low" | "medium" | "high"; score: number } {
  const adjusted = Math.max(0, strength - recoveryPenalty);
  const score = Math.max(0.2, Math.min(0.92, adjusted / 100));
  const level = score >= 0.76 ? "high" : score >= 0.5 ? "medium" : "low";
  return { level, score };
}

function relatedRecoveryKinds(type: PatternType): string[] {
  switch (type) {
    case "routine_drift":
      return ["routine_recovery", "recovery_signal"];
    case "financial_pressure":
      return ["financial_recovery", "recovery_signal"];
    case "emotional_strain":
      return ["emotional_recovery", "recovery_signal"];
    case "health_decline":
      return ["health_recovery", "recovery_signal"];
    case "work_pressure":
      return ["work_recovery", "recovery_signal"];
    case "relationship_strain":
      return ["relationship_recovery", "recovery_signal"];
    case "recovery":
      return ["recovery_signal", "routine_recovery", "health_recovery", "financial_recovery", "emotional_recovery"];
    default:
      return ["recovery_signal"];
  }
}

function computeMomentumScores(input: {
  type: PatternType;
  evidence: PatternSignal[];
  allSignals: PatternSignal[];
  reference: Date;
}): MomentumScores {
  const negativeEvidence = input.evidence.filter((signal) => signal.polarity === "negative");
  const recoveryKinds = relatedRecoveryKinds(input.type);
  const recoveryEvidence = input.allSignals.filter(
    (signal) =>
      signal.polarity === "positive" && recoveryKinds.includes(signal.signalKind),
  );

  const evidenceCount = negativeEvidence.length;
  const recentNegative = negativeEvidence.filter(
    (signal) => daysSince(signal.timestamp, input.reference) <= RECENT_WINDOW_DAYS,
  );

  const recencyScore =
    negativeEvidence.length === 0
      ? 0
      : Math.round(
          (negativeEvidence.reduce(
            (sum, signal) =>
              sum + recencyWeight(daysSince(signal.timestamp, input.reference)) * 100,
            0,
          ) /
            negativeEvidence.length) *
            10,
        ) / 10;

  const severityScore =
    negativeEvidence.length === 0
      ? 0
      : Math.round(
          (negativeEvidence.reduce((sum, signal) => sum + severityWeight(signal.severity), 0) /
            negativeEvidence.length) *
            100,
        );

  const frequencyScore = Math.min(
    100,
    Math.round(
      (recentNegative.length / Math.max(1, RECENT_WINDOW_DAYS / 7)) * 35 +
        evidenceCount * 12,
    ),
  );

  const recoveryScore =
    recoveryEvidence.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            recoveryEvidence.reduce(
              (sum, signal) =>
                sum +
                severityWeight(signal.severity) *
                  recencyWeight(daysSince(signal.timestamp, input.reference)) *
                  30,
              0,
            ),
          ),
        );

  const recentRecoveryCount = recoveryEvidence.filter(
    (signal) => daysSince(signal.timestamp, input.reference) <= 7,
  ).length;

  const momentumScore = Math.min(
    100,
    Math.round(frequencyScore * 0.35 + recencyScore * 0.3 + severityScore * 0.35),
  );

  const timestamps = [...negativeEvidence, ...recoveryEvidence]
    .map((signal) => signal.timestamp)
    .sort();
  const lastSignalAt = timestamps[timestamps.length - 1] ?? input.reference.toISOString();

  return {
    frequencyScore,
    recencyScore,
    severityScore,
    recoveryScore,
    momentumScore,
    evidenceCount,
    lastSignalAt,
    recentRecoveryCount,
  };
}

function resolveMomentum(input: {
  type: PatternType;
  scores: MomentumScores;
  reference: Date;
}): { momentum: PatternMomentum; lifecycleReason: string } {
  const { scores } = input;
  const daysSinceLast = daysSince(scores.lastSignalAt, input.reference);
  const recoveryRatio =
    scores.recoveryScore / Math.max(1, scores.momentumScore + scores.recoveryScore);

  if (
    scores.recoveryScore >= 45 &&
    recoveryRatio >= RESOLVE_RECOVERY_RATIO &&
    scores.evidenceCount <= 3
  ) {
    return {
      momentum: "resolved",
      lifecycleReason: "Recovery signals outweigh remaining pressure evidence.",
    };
  }

  if (scores.recoveryScore >= 25 && scores.recentRecoveryCount >= 2) {
    return {
      momentum: "recovering",
      lifecycleReason: "Recent recovery signals are offsetting earlier pressure.",
    };
  }

  if (scores.recoveryScore >= 25 && recoveryRatio >= 0.4) {
    return {
      momentum: "recovering",
      lifecycleReason: "Recent recovery signals are offsetting earlier pressure.",
    };
  }

  if (daysSinceLast >= STALE_THRESHOLD_DAYS && scores.recoveryScore < 20) {
    return {
      momentum: "stable",
      lifecycleReason: "No recent reinforcing signals; pattern may be dormant.",
    };
  }

  const hasHighSeverity = scores.severityScore >= 70;
  const isEscalating =
    scores.recoveryScore < 30 &&
    scores.recentRecoveryCount < 2 &&
    scores.evidenceCount >= 4 &&
    scores.recencyScore >= 55 &&
    (hasHighSeverity || scores.frequencyScore >= 55);

  if (isEscalating) {
    return {
      momentum: "escalating",
      lifecycleReason: "Repeated recent signals with elevated severity.",
    };
  }

  if (scores.evidenceCount >= 3 && scores.recencyScore >= 50 && scores.momentumScore >= 45) {
    return {
      momentum: "growing",
      lifecycleReason: "Signal frequency and recency are increasing.",
    };
  }

  if (
    scores.evidenceCount >= 3 &&
    scores.recencyScore >= 35 &&
    scores.momentumScore >= 35 &&
    scores.recoveryScore < 15
  ) {
    return {
      momentum: "stable",
      lifecycleReason: "Pattern holds but is not clearly intensifying.",
    };
  }

  return {
    momentum: "emerging",
    lifecycleReason: "Early candidate pattern with limited repeated evidence.",
  };
}

function resolveLifecycle(input: {
  momentum: PatternMomentum;
  scores: MomentumScores;
  strength: number;
  reference: Date;
}): { lifecycle: PatternLifecycle; status: Pattern["status"]; lifecycleReason: string } {
  const daysSinceLast = daysSince(input.scores.lastSignalAt, input.reference);

  if (input.momentum === "resolved") {
    return {
      lifecycle: "resolved",
      status: "quiet",
      lifecycleReason: "Pattern appears resolved based on recovery evidence.",
    };
  }

  if (daysSinceLast >= STALE_THRESHOLD_DAYS && input.scores.recoveryScore < 20) {
    return {
      lifecycle: "dormant",
      status: "quiet",
      lifecycleReason: "No recent signals within the observation window.",
    };
  }

  if (input.momentum === "recovering") {
    return {
      lifecycle: "watching",
      status: "monitor",
      lifecycleReason: "Monitoring recovery without clearing prior pressure.",
    };
  }

  if (input.strength >= 70 || input.momentum === "escalating") {
    return {
      lifecycle: "active",
      status: "monitor",
      lifecycleReason: "Sustained or escalating evidence warrants active monitoring.",
    };
  }

  if (input.momentum === "growing" || input.momentum === "stable") {
    if (input.strength >= 55) {
      return {
        lifecycle: "active",
        status: "monitor",
        lifecycleReason: "Growing pattern with meaningful repeated evidence.",
      };
    }
    return {
      lifecycle: input.momentum === "stable" ? "watching" : "candidate",
      status: "quiet",
      lifecycleReason:
        input.momentum === "stable"
          ? "Pattern holds but is not clearly intensifying."
          : "Candidate pattern with early repeated evidence.",
    };
  }

  return {
    lifecycle: "candidate",
    status: "quiet",
    lifecycleReason: "Candidate pattern awaiting stronger repeated evidence.",
  };
}

function signalFor(item: CapturedSyncItem, reference: Date): PatternSignal[] {
  const text = normalizeText(item);
  const ageDays = daysSince(item.updatedAt ?? item.createdAt, reference);
  const recencyBoost = ageDays <= 2 ? 8 : ageDays <= 7 ? 4 : 0;
  const signals: PatternSignal[] = [];

  const push = (
    signalKind: string,
    domain: PatternDomain,
    severity: PatternSignal["severity"],
    polarity: PatternSignal["polarity"],
    contribution: number,
  ) => {
    signals.push({
      id: `${item.id}-${signalKind}`,
      memoryId: item.id,
      signalKind,
      domain,
      severity,
      polarity,
      timestamp: item.updatedAt ?? item.createdAt,
      contribution: contribution + recencyBoost,
    });
  };

  if (/\b(skipped workout|missed workout|missed gym|skipped gym|stopped exercising)\b/.test(text)) {
    push("skipped_workout", "routine", "medium", "negative", 20);
  }
  if (/\b(still tired|slept badly|poor sleep)\b/.test(text)) {
    push("health_strain", "health", "medium", "negative", 18);
  }
  if (/\b(spent too much|overspending|overspend|impulse bought|impulse purchase|debt|bill due|rent is due)\b/.test(text)) {
    push("money_pressure", "finance", "high", "negative", 24);
  }
  if (/\b(might miss rent|missed rent|credit bill due)\b/.test(text)) {
    push("rent_risk", "finance", "high", "negative", 28);
  }
  if (/\b(stressed|anxious|overwhelmed|burned out|burnt out)\b/.test(text)) {
    push("emotional_distress", "emotional", "medium", "negative", 18);
  }
  if (/\b(slept \d+ hours|poor sleep|exhausted|headache|low energy)\b/.test(text)) {
    push("health_strain", "health", "high", "negative", 22);
  }
  if (/\b(chest pain|chest hurts|dizzy)\b/.test(text)) {
    push("health_risk", "health", "high", "negative", 30);
  }
  if (/\b(late to work|running late)\b/.test(text)) {
    push("work_late", "work", "low", "negative", 14);
  }
  if (/\b(call in sick)\b/.test(text)) {
    push("work_attendance_risk", "work", "high", "negative", 20);
  }
  if (/\b(quit my job|quitting|want to quit)\b/.test(text)) {
    push("quit_thought", "work", "high", "negative", 24);
  }
  if (/\b(work stress|overtime)\b/.test(text)) {
    push("work_stress", "work", "medium", "negative", 16);
  }
  if (/\b(argument|argued|tension|tense|fight|canceled plans)\b/.test(text)) {
    push("relationship_tension", "relationships", "medium", "negative", 18);
  }
  if (/\b(anniversary|birthday)\b/.test(text)) {
    push("relationship_date", "relationships", "low", "negative", 12);
  }
  if (/\b(feel better|feeling better|went for a walk|ate real food|sleeping better|calmer today)\b/.test(text)) {
    push("recovery_signal", "health", "medium", "positive", 16);
    push("emotional_recovery", "emotional", "medium", "positive", 14);
    push("health_recovery", "health", "medium", "positive", 14);
  }
  if (/\b(worked out today|worked out again|i worked out)\b/.test(text)) {
    push("routine_recovery", "routine", "medium", "positive", 18);
    push("health_recovery", "health", "medium", "positive", 14);
  }
  if (/\b(slept well|sleeping well)\b/.test(text)) {
    push("health_recovery", "health", "medium", "positive", 16);
  }
  if (/\b(spent less|paid rent)\b/.test(text)) {
    push("financial_recovery", "finance", "medium", "positive", 20);
  }
  if (/\b(we talked|things are better|apologized|apology)\b/.test(text)) {
    push("relationship_recovery", "relationships", "medium", "positive", 18);
  }
  if (/\b(shift is settled|work was fine)\b/.test(text)) {
    push("work_recovery", "work", "medium", "positive", 16);
  }
  if (/\b(payday)\b/.test(text)) {
    push("payday_context", "finance", "low", "negative", 10);
  }
  if (/\b(rent is due|bill due)\b/.test(text) && !/\b(paid rent)\b/.test(text)) {
    push("due_context", "finance", "medium", "negative", 14);
  }

  return signals;
}

function buildPattern(input: {
  type: PatternType;
  domain: PatternDomain;
  evidence: PatternSignal[];
  allSignals: PatternSignal[];
  explanation: string;
  privacySensitivity: Pattern["privacySensitivity"];
  reference: Date;
  itemsById: Map<string, CapturedSyncItem>;
}): Pattern {
  const involvedMemoryIds = Array.from(
    new Set(input.evidence.map((entry) => entry.memoryId)),
  );
  const involvedItems = involvedMemoryIds
    .map((id) => input.itemsById.get(id))
    .filter((item): item is CapturedSyncItem => item != null);

  const scores = computeMomentumScores({
    type: input.type,
    evidence: input.evidence,
    allSignals: input.allSignals,
    reference: input.reference,
  });

  const weightedContribution = input.evidence.reduce((sum, entry) => {
    const ageDays = daysSince(entry.timestamp, input.reference);
    return sum + entry.contribution * recencyWeight(ageDays);
  }, 0);

  const strength = Math.min(
    96,
    Math.round(
      weightedContribution / Math.max(1, involvedMemoryIds.length) +
        scores.momentumScore * 0.15,
    ),
  );

  const recoveryPenalty = Math.round(scores.recoveryScore * 0.25);
  const confidence = confidenceFrom(strength, recoveryPenalty);

  const firstSeen = [...input.evidence]
    .map((entry) => entry.timestamp)
    .sort()[0];
  const lastUpdated = scores.lastSignalAt;

  const { momentum, lifecycleReason: momentumReason } = resolveMomentum({
    type: input.type,
    scores,
    reference: input.reference,
  });

  const {
    lifecycle,
    status,
    lifecycleReason: lifecycleResolvedReason,
  } = resolveLifecycle({
    momentum,
    scores,
    strength,
    reference: input.reference,
  });

  const horizon = horizonFor(involvedItems, input.reference);

  return {
    id: `${input.type}:${firstSeen}`,
    type: input.type,
    domain: input.domain,
    involvedMemoryIds,
    supportingEvidence: input.evidence.map((entry) => ({
      memoryId: entry.memoryId,
      signalKind: entry.signalKind,
      timestamp: entry.timestamp,
      weightContribution: Math.round(entry.contribution * recencyWeight(daysSince(entry.timestamp, input.reference))),
    })),
    confidence,
    strength,
    momentum,
    lifecycle,
    firstSeen,
    lastUpdated,
    horizon,
    status,
    privacySensitivity: input.privacySensitivity,
    explanation: input.explanation,
    momentumScore: scores.momentumScore,
    recoveryScore: scores.recoveryScore,
    severityScore: scores.severityScore,
    recencyScore: scores.recencyScore,
    evidenceCount: scores.evidenceCount,
    lastSignalAt: scores.lastSignalAt,
    lifecycleReason: lifecycleResolvedReason || momentumReason,
  };
}

function candidatePatterns(signals: PatternSignal[]) {
  const byKind = (kind: string) => signals.filter((signal) => signal.signalKind === kind);
  const byDomain = (domain: PatternDomain) => signals.filter((signal) => signal.domain === domain);
  const candidates: CandidateAccumulator[] = [];

  const routine = byKind("skipped_workout");
  if (routine.length >= 3) {
    candidates.push({
      type: "routine_drift",
      domain: "routine",
      evidence: routine,
      explanation: "Recurring routine misses suggest a possible routine drift.",
      privacySensitivity: "normal",
    });
  }

  const moneyPressure = [...byKind("money_pressure"), ...byKind("rent_risk")];
  const moneyContext = [...byKind("due_context"), ...byKind("payday_context")];
  if ((moneyPressure.length >= 2 && moneyContext.length >= 1) || moneyPressure.length >= 3) {
    candidates.push({
      type: "financial_pressure",
      domain: "finance",
      evidence: [...moneyPressure, ...moneyContext],
      explanation: "Repeated spending pressure appears near money obligations.",
      privacySensitivity: "sensitive",
    });
  }

  const emotional = byKind("emotional_distress");
  if (emotional.length >= 3) {
    candidates.push({
      type: "emotional_strain",
      domain: "emotional",
      evidence: emotional,
      explanation: "Repeated emotional strain signals are accumulating.",
      privacySensitivity: "sensitive",
    });
  }

  const health = [...byKind("health_strain"), ...byKind("health_risk")];
  if (health.length >= 3 || (health.length >= 2 && health.some((signal) => signal.severity === "high"))) {
    candidates.push({
      type: "health_decline",
      domain: "health",
      evidence: health,
      explanation: "Health strain signals are repeating in recent context.",
      privacySensitivity: "high_sensitive",
    });
  }

  const work = [
    ...byKind("work_late"),
    ...byKind("work_attendance_risk"),
    ...byKind("quit_thought"),
    ...byKind("work_stress"),
  ];
  if (
    work.length >= 3 ||
    (work.length >= 2 &&
      work.some(
        (signal) =>
          signal.signalKind === "work_attendance_risk" ||
          signal.signalKind === "quit_thought",
      ))
  ) {
    candidates.push({
      type: "work_pressure",
      domain: "work",
      evidence: work,
      explanation: "Work pressure signals are becoming recurrent.",
      privacySensitivity: "sensitive",
    });
  }

  const relationshipTension = byKind("relationship_tension");
  const relationshipDate = byKind("relationship_date");
  if ((relationshipTension.length >= 2 && relationshipDate.length >= 1) || relationshipTension.length >= 3) {
    candidates.push({
      type: "relationship_strain",
      domain: "relationships",
      evidence: [...relationshipTension, ...relationshipDate],
      explanation: "Relationship tension appears alongside important relationship timing.",
      privacySensitivity: "sensitive",
    });
  }

  const recovery = byKind("recovery_signal");
  const pressureCount =
    byKind("emotional_distress").length +
    byKind("health_strain").length +
    byKind("health_risk").length +
    work.length +
    moneyPressure.length;
  if (recovery.length >= 3 && pressureCount <= 3) {
    candidates.push({
      type: "recovery",
      domain: "health",
      evidence: recovery,
      explanation: "Recent positive signals may indicate early recovery.",
      privacySensitivity: "normal",
    });
  }

  const pressureDomains = ["finance", "emotional", "health", "work", "relationships"] as const;
  const activePressureDomains = pressureDomains.filter(
    (domain) => byDomain(domain).filter((signal) => signal.polarity === "negative").length >= 2,
  );
  if (activePressureDomains.length >= 2) {
    const evidence = signals.filter(
      (signal) =>
        activePressureDomains.includes(signal.domain as (typeof activePressureDomains)[number]) &&
        signal.polarity === "negative",
    );
    candidates.push({
      type: "cross_domain_pressure",
      domain: "cross_domain",
      evidence,
      explanation: "Multiple domains show reinforcing pressure signals.",
      privacySensitivity: "sensitive",
    });
  }

  return candidates;
}

export function buildPatternStateSnapshot(input: {
  items: CapturedSyncItem[];
  reference?: Date;
}): PatternStateSnapshot {
  const reference = input.reference ?? new Date("1970-01-01T00:00:00.000Z");
  const activeItems = input.items.filter(isActive);
  const filteredItems = activeItems.filter((item) => {
    const text = normalizeText(item);
    if (LOW_VALUE_PATTERN.test(text)) return false;
    if (SENSITIVE_PATTERN.test(text)) return false;
    return true;
  });

  const itemsById = new Map(filteredItems.map((item) => [item.id, item]));
  const signals = filteredItems.flatMap((item) => signalFor(item, reference));
  const patterns = candidatePatterns(signals).map((candidate) =>
    buildPattern({
      type: candidate.type,
      domain: candidate.domain,
      evidence: candidate.evidence,
      allSignals: signals,
      explanation: candidate.explanation,
      privacySensitivity: candidate.privacySensitivity,
      reference,
      itemsById,
    }),
  );

  return {
    generatedAt: reference.toISOString(),
    patterns,
    signals,
  };
}
