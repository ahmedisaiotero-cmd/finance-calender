import type {
  DecisionCandidate,
  DecisionCandidateSource,
  TodayDecision,
} from "@/lib/intelligence/decision-engine";

export type SyncIntent =
  | "inform"
  | "prepare"
  | "warn"
  | "protect"
  | "reflect"
  | "celebrate"
  | "reconnect"
  | "clarify"
  | "explain"
  | "encourage";

export type SyncConfidence = "high" | "medium" | "low";

export type SyncSurfacingReason =
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "time_sensitive"
  | "profile_priority"
  | "specific"
  | "context"
  | "pattern"
  | "life_load"
  | "quiet"
  | "empty"
  | "decision_ranked";

export type SyncEvidence = {
  type:
    | "decision_candidate"
    | "consequence"
    | "memory"
    | "score_breakdown"
    | "timing"
    | "area"
    | "source";
  label: string;
  value?: string | number | boolean | null;
};

export type SyncExplanationTone = "direct" | "gentle" | "uncertain";

export type SyncExplanationDetail = {
  reason: SyncSurfacingReason;
  label: string;
  summary: string;
  confidence: SyncConfidence;
  tone: SyncExplanationTone;
  evidence: SyncEvidence[];
};

export type SyncLineExplanation = {
  headline: string;
  details: SyncExplanationDetail[];
  evidence: SyncEvidence[];
  confidence: SyncConfidence;
  isExplainable: boolean;
};

export type SyncLineSource = {
  decisionSource: DecisionCandidateSource;
  consequenceId?: string;
  memoryId?: string;
  area?: string;
  dateKey?: string | null;
  daysUntil?: number | null;
  sortMinutes?: number | null;
};

export type SyncLineQuality = {
  preservesVisibleText: boolean;
  hasIntent: boolean;
  hasConfidence: boolean;
  hasReason: boolean;
  hasEvidence: boolean;
  forbiddenPhraseFound: boolean;
};

export type SyncEngineLine = {
  text: string;
  intent: SyncIntent;
  confidence: SyncConfidence;
  reasons: SyncSurfacingReason[];
  evidence: SyncEvidence[];
  explanation: SyncLineExplanation;
  source: SyncLineSource;
  quality: SyncLineQuality;
};

export type SyncEngineArc = {
  theme:
    | "money"
    | "health"
    | "family"
    | "work"
    | "relationships"
    | "energy"
    | "quiet"
    | "mixed"
    | "unknown";
  summary: string;
  confidence: SyncConfidence;
  evidence: SyncEvidence[];
};

export type SyncEngineQuality = {
  preservesDecisionOrdering: boolean;
  preservesVisibleCopy: boolean;
  lineCount: number;
  warnings: string[];
};

export type SyncEngineInput = {
  decision: TodayDecision;
  reference?: Date;
};

export type SyncEngineOutput = {
  primary: SyncEngineLine;
  supporting: SyncEngineLine[];
  rankedLines: SyncEngineLine[];
  arc: SyncEngineArc | null;
  quality: SyncEngineQuality;
  isEmpty: boolean;
  isQuiet: boolean;
};

const FORBIDDEN_PHRASES = [
  /\byou need to\b/i,
  /\byou should\b/i,
  /\bstay on track\b/i,
  /\byou got this\b/i,
  /\bimportant items\b/i,
  /\bworth keeping in view\b/i,
  /\bcrush your day\b/i,
  /\bmanage your tasks\b/i,
  /\boptimi[sz]e productivity\b/i,
];

function hasForbiddenPhrase(text: string) {
  return FORBIDDEN_PHRASES.some((pattern) => pattern.test(text));
}

function textMentionsHealth(text: string) {
  return /\b(workout|gym|doctor|health|sleep|run|running)\b/i.test(text);
}

function textMentionsRelationship(text: string) {
  return /\b(birthday|anniversary|friend|partner|mom|dad|mother|father)\b/i.test(
    text,
  );
}

function inferIntent(candidate: DecisionCandidate): SyncIntent {
  if (candidate.source === "tomorrow_summary") return "prepare";
  if (candidate.source === "life_context" || candidate.isContext) return "reflect";
  if (candidate.source === "today_timed" && textMentionsHealth(candidate.text)) {
    return "protect";
  }
  if (candidate.daysUntil === 1) return "prepare";
  if (
    candidate.area?.toLowerCase() === "relationships" ||
    textMentionsRelationship(candidate.text)
  ) {
    return "reconnect";
  }
  return "inform";
}

function inferConfidence(candidate: DecisionCandidate): SyncConfidence {
  if (candidate.source === "empty" || candidate.source === "quiet") return "high";
  if (candidate.source === "today_timed") return "high";
  if (candidate.dateKey && candidate.daysUntil != null) return "high";
  if (candidate.consequence) return "medium";
  if (candidate.source === "life_context" || candidate.isContext) return "medium";
  return "low";
}

function inferReasons(candidate: DecisionCandidate): SyncSurfacingReason[] {
  const reasons: SyncSurfacingReason[] = [];
  const days = candidate.daysUntil;

  if (days === 0) reasons.push("today");
  if (days === 1) reasons.push("tomorrow");
  if (days != null && days > 1 && days <= 7) reasons.push("this_week");
  if (days != null && days > 7) reasons.push("later");
  if (candidate.sortMinutes != null) reasons.push("time_sensitive");
  if ((candidate.scoreBreakdown?.profilePriority ?? 0) > 0) {
    reasons.push("profile_priority");
  }
  if (candidate.isSpecific) reasons.push("specific");
  if (candidate.isContext) reasons.push("context");
  if (candidate.source === "life_context") reasons.push("pattern");
  if (candidate.source === "tomorrow_summary") reasons.push("life_load");
  if (candidate.source === "quiet") reasons.push("quiet");
  if (candidate.source === "empty") reasons.push("empty");
  if (candidate.source !== "empty" && candidate.source !== "quiet") {
    reasons.push("decision_ranked");
  }

  return [...new Set(reasons)];
}

function collectEvidence(candidate: DecisionCandidate): SyncEvidence[] {
  const evidence: SyncEvidence[] = [
    {
      type: "decision_candidate",
      label: "Decision source",
      value: candidate.source,
    },
    {
      type: "score_breakdown",
      label: "Decision score",
      value: candidate.score,
    },
  ];

  if (candidate.consequence?.id) {
    evidence.push({
      type: "consequence",
      label: "Consequence id",
      value: candidate.consequence.id,
    });
  }
  if (candidate.consequence?.kind) {
    evidence.push({
      type: "consequence",
      label: "Consequence kind",
      value: candidate.consequence.kind,
    });
  }
  if (candidate.consequence?.sourceMemoryId) {
    evidence.push({
      type: "memory",
      label: "Source memory id",
      value: candidate.consequence.sourceMemoryId,
    });
  }
  if (candidate.area) {
    evidence.push({ type: "area", label: "Area", value: candidate.area });
  }
  if (candidate.daysUntil != null) {
    evidence.push({
      type: "timing",
      label: "Days until",
      value: candidate.daysUntil,
    });
  }
  if (candidate.dateKey) {
    evidence.push({
      type: "timing",
      label: "Date key",
      value: candidate.dateKey,
    });
  }
  if (candidate.sortMinutes != null) {
    evidence.push({
      type: "timing",
      label: "Sort minutes",
      value: candidate.sortMinutes,
    });
  }
  if (candidate.scoreBreakdown) {
    evidence.push({
      type: "score_breakdown",
      label: "Profile priority boost",
      value: candidate.scoreBreakdown.profilePriority,
    });
    evidence.push({
      type: "score_breakdown",
      label: "Specificity score",
      value: candidate.scoreBreakdown.specificity,
    });
  }

  return evidence;
}

const REASON_EXPLANATIONS: Record<
  SyncSurfacingReason,
  { label: string; summary: string }
> = {
  today: {
    label: "Today",
    summary: "This is happening today.",
  },
  tomorrow: {
    label: "Tomorrow",
    summary: "This affects tomorrow.",
  },
  this_week: {
    label: "This week",
    summary: "This is coming up this week.",
  },
  later: {
    label: "Later",
    summary: "This is farther out, but still relevant.",
  },
  time_sensitive: {
    label: "Time-sensitive",
    summary: "This has a specific time.",
  },
  profile_priority: {
    label: "Profile priority",
    summary: "This matches a current profile priority.",
  },
  specific: {
    label: "Specific",
    summary: "This is a concrete item, not a vague signal.",
  },
  context: {
    label: "Context",
    summary: "This adds useful context to today.",
  },
  pattern: {
    label: "Pattern",
    summary: "This appears to connect to a repeated pattern.",
  },
  life_load: {
    label: "Life load",
    summary: "This helps explain the shape of tomorrow.",
  },
  quiet: {
    label: "Quiet",
    summary: "Sync did not find anything pressing.",
  },
  empty: {
    label: "Empty",
    summary: "Sync does not have enough context yet.",
  },
  decision_ranked: {
    label: "Selected",
    summary: "This was selected by the Decision Engine.",
  },
};

const HEADLINE_REASON_ORDER: SyncSurfacingReason[] = [
  "time_sensitive",
  "today",
  "tomorrow",
  "profile_priority",
  "life_load",
  "pattern",
  "context",
  "specific",
  "decision_ranked",
  "quiet",
  "empty",
  "this_week",
  "later",
];

function explanationToneForConfidence(
  confidence: SyncConfidence,
  reason: SyncSurfacingReason,
): SyncExplanationTone {
  if (confidence === "low") return "uncertain";
  if (reason === "quiet" || reason === "empty" || reason === "pattern") {
    return "gentle";
  }
  return "direct";
}

function evidenceForReason(
  reason: SyncSurfacingReason,
  evidence: SyncEvidence[],
): SyncEvidence[] {
  switch (reason) {
    case "today":
    case "tomorrow":
    case "this_week":
    case "later":
      return evidence.filter((item) => item.type === "timing");
    case "time_sensitive":
      return evidence.filter(
        (item) => item.type === "timing" && item.label === "Sort minutes",
      );
    case "profile_priority":
      return evidence.filter(
        (item) =>
          (item.type === "score_breakdown" &&
            item.label === "Profile priority boost") ||
          item.type === "area",
      );
    case "specific":
      return evidence.filter(
        (item) =>
          item.type === "decision_candidate" ||
          item.type === "consequence" ||
          (item.type === "score_breakdown" &&
            item.label === "Specificity score"),
      );
    case "context":
    case "pattern":
      return evidence.filter(
        (item) =>
          item.type === "decision_candidate" ||
          item.type === "area" ||
          item.type === "memory",
      );
    case "life_load":
      return evidence.filter(
        (item) =>
          item.type === "decision_candidate" ||
          item.type === "consequence" ||
          item.type === "timing",
      );
    case "quiet":
    case "empty":
      return evidence.filter((item) => item.type === "decision_candidate");
    case "decision_ranked":
      return evidence.filter(
        (item) =>
          item.type === "decision_candidate" ||
          item.label === "Decision score",
      );
    default:
      return [];
  }
}

function headlineForReasons(reasons: SyncSurfacingReason[]) {
  const headlineReason =
    HEADLINE_REASON_ORDER.find((reason) => reasons.includes(reason)) ??
    reasons[0];
  return headlineReason
    ? REASON_EXPLANATIONS[headlineReason].summary
    : "Sync has evidence for why this appeared.";
}

function explainLine(
  reasons: SyncSurfacingReason[],
  evidence: SyncEvidence[],
  confidence: SyncConfidence,
): SyncLineExplanation {
  const details = reasons.map((reason) => {
    const explanation = REASON_EXPLANATIONS[reason];
    return {
      reason,
      label: explanation.label,
      summary: explanation.summary,
      confidence,
      tone: explanationToneForConfidence(confidence, reason),
      evidence: evidenceForReason(reason, evidence),
    };
  });

  return {
    headline: headlineForReasons(reasons),
    details,
    evidence,
    confidence,
    isExplainable: details.length > 0,
  };
}

function sourceForCandidate(candidate: DecisionCandidate): SyncLineSource {
  return {
    decisionSource: candidate.source,
    consequenceId: candidate.consequence?.id,
    memoryId: candidate.consequence?.sourceMemoryId ?? undefined,
    area: candidate.area,
    dateKey: candidate.dateKey,
    daysUntil: candidate.daysUntil,
    sortMinutes: candidate.sortMinutes,
  };
}

function evaluateLineQuality(
  candidate: DecisionCandidate,
  line: Omit<SyncEngineLine, "quality">,
): SyncLineQuality {
  return {
    preservesVisibleText: line.text === candidate.text,
    hasIntent: Boolean(line.intent),
    hasConfidence: Boolean(line.confidence),
    hasReason: line.reasons.length > 0,
    hasEvidence: line.evidence.length > 0,
    forbiddenPhraseFound: hasForbiddenPhrase(line.text),
  };
}

function narrateCandidate(candidate: DecisionCandidate): SyncEngineLine {
  const reasons = inferReasons(candidate);
  const evidence = collectEvidence(candidate);
  const confidence = inferConfidence(candidate);
  const line = {
    text: candidate.text,
    intent: inferIntent(candidate),
    confidence,
    reasons,
    evidence,
    explanation: explainLine(reasons, evidence, confidence),
    source: sourceForCandidate(candidate),
  };

  return {
    ...line,
    quality: evaluateLineQuality(candidate, line),
  };
}

function arcThemeForArea(area: string): SyncEngineArc["theme"] | null {
  switch (area.toLowerCase()) {
    case "finance":
    case "money":
      return "money";
    case "health":
      return "health";
    case "family":
    case "school":
      return "family";
    case "work":
      return "work";
    case "relationships":
      return "relationships";
    default:
      return null;
  }
}

function inferArc(
  lines: SyncEngineLine[],
  decision: TodayDecision,
): SyncEngineArc | null {
  if (decision.isEmpty) return null;
  if (decision.isQuiet) {
    return {
      theme: "quiet",
      summary: "Today is quiet.",
      confidence: "high",
      evidence: [{ type: "source", label: "Decision state", value: "quiet" }],
    };
  }

  const themeCounts = new Map<SyncEngineArc["theme"], number>();
  for (const line of lines) {
    if (!line.source.area) continue;
    const theme = arcThemeForArea(line.source.area);
    if (!theme) continue;
    themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
  }

  const rankedThemes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top = rankedThemes[0];
  if (!top || top[1] < 2) return null;
  if (rankedThemes[1] && rankedThemes[1][1] === top[1]) return null;

  return {
    theme: top[0],
    summary: `${top[0]} is the clearest theme in the selected decisions.`,
    confidence: "medium",
    evidence: [
      {
        type: "area",
        label: "Selected decision area count",
        value: top[1],
      },
    ],
  };
}

function evaluateOutputQuality(
  decision: TodayDecision,
  primary: SyncEngineLine,
  supporting: SyncEngineLine[],
  rankedLines: SyncEngineLine[],
): SyncEngineQuality {
  const decisionVisible = [
    decision.primary.text,
    ...decision.supporting.map((candidate) => candidate.text),
  ];
  const outputVisible = [
    primary.text,
    ...supporting.map((line) => line.text),
  ];
  const rankedDecisionText = decision.rankedCandidates.map(
    (candidate) => candidate.text,
  );
  const rankedOutputText = rankedLines.map((line) => line.text);
  const warnings: string[] = [];

  const preservesVisibleCopy =
    decisionVisible.length === outputVisible.length &&
    decisionVisible.every((text, index) => text === outputVisible[index]);
  const preservesDecisionOrdering =
    rankedDecisionText.length === rankedOutputText.length &&
    rankedDecisionText.every((text, index) => text === rankedOutputText[index]);

  if (!preservesVisibleCopy) warnings.push("visible_copy_changed");
  if (!preservesDecisionOrdering) warnings.push("decision_order_changed");
  if ([primary, ...supporting, ...rankedLines].some((line) => line.quality.forbiddenPhraseFound)) {
    warnings.push("forbidden_phrase_found");
  }

  return {
    preservesDecisionOrdering,
    preservesVisibleCopy,
    lineCount: outputVisible.length,
    warnings,
  };
}

export function runSyncEngine(input: SyncEngineInput): SyncEngineOutput {
  const { decision } = input;
  const primary = narrateCandidate(decision.primary);
  const supporting = decision.supporting.map(narrateCandidate);
  const rankedLines = decision.rankedCandidates.map(narrateCandidate);
  const arc = inferArc([primary, ...supporting], decision);
  const quality = evaluateOutputQuality(
    decision,
    primary,
    supporting,
    rankedLines,
  );

  return {
    primary,
    supporting,
    rankedLines,
    arc,
    quality,
    isEmpty: decision.isEmpty,
    isQuiet: decision.isQuiet,
  };
}
