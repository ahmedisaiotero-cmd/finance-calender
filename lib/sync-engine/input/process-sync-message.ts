import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  analyzeConsequences,
  type ConsequenceAnalysis,
} from "@/lib/intelligence/consequence-engine";
import { buildMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import {
  emptyRuntimeBrainEvaluation,
  evaluateRuntimeBrain,
  type SyncRuntimeBrainEvaluation,
} from "@/lib/sync-engine/brain/build-runtime-brain";
import {
  detectSensitiveInput,
  SENSITIVE_INPUT_PLACEHOLDER,
} from "@/lib/sync-engine/security/sensitive-input";
import {
  detectPrivacyCommand,
  type PrivacyCommandDetection,
} from "@/lib/sync-engine/security/privacy-command";
import {
  detectVagueInput,
  type VagueInputDetection,
} from "@/lib/sync-engine/input/vague-input";
import {
  detectConversationIntent,
  type ConversationIntent,
} from "@/lib/sync-engine/input/conversation-intent";
import {
  buildConversationState,
  type ConversationTurn,
  type ConversationState,
} from "@/lib/sync-engine/input/conversation-state";
import { detectTrivialInput } from "@/lib/sync-engine/input/trivial-input";
import {
  detectRelationshipPreference,
  applyRelationshipPreferenceContext,
} from "@/lib/sync-engine/reasoning/relationship-preference";
import {
  detectContradiction,
  type ContradictionDetection,
} from "@/lib/sync-engine/reasoning/contradiction";
import {
  detectCorrectionTarget,
  type CorrectionTarget,
} from "@/lib/sync-engine/reasoning/correction-target";
import {
  selectConversationGoal,
  type ConversationGoal,
} from "@/lib/sync-engine/response/conversation-goal";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { isCaptureInputVague } from "@/lib/sync-capture/apply-capture-input";
import {
  isSilentCaptureReady,
  prepareUniversalCapture,
  type PreparedCapture,
} from "@/lib/sync-capture/save-capture";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type CapturedItem = CapturedSyncItem;
export type SyncEngineMode = "dryRun" | "commit";

export type SyncEngineMemoryDecision =
  | "remember"
  | "update_existing"
  | "ignore"
  | "ask_follow_up";

export type SyncEngineAffectedTimeframe =
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "unscheduled";

export type SyncEngineDebugDecision = {
  remembered: boolean;
  memoryDecision: SyncEngineMemoryDecision;
  category: string;
  importance: string;
  consequenceSummary: string;
  affectedTimeframe: SyncEngineAffectedTimeframe;
  shouldSurfaceLater: boolean;
  relatedMemoryIds: string[];
  relatedMemoriesFound: number;
  duplicateUpdateCandidate: {
    id: string;
    title: string;
    score: number;
    reasons: string[];
  } | null;
  wouldCreateMemory: boolean;
  wouldUpdateExistingMemory: boolean;
  dryRun: boolean;
  confidence: number;
};

export type SyncEngineFutureFollowUpDecision = {
  decision: "none" | "remind" | "check_in" | "surface_in_brief" | "ask_now";
  reason: string;
  suggestedTiming?: SyncEngineAffectedTimeframe;
  confidence: number;
};

export type SyncEngineBriefingEffect = {
  changed: boolean;
  reason: string;
  affectedSection?: "today" | "noticing" | "possibility";
  priorityImpact: "none" | "low" | "medium" | "high";
};

export type SyncEngineReasoningTraceStep =
  | "parsed_input"
  | "classified_meaning"
  | "memory_decision"
  | "consequence_detection"
  | "judgment_decision"
  | "response_generation";

export type SyncEngineReasoningTrace = Array<{
  step: SyncEngineReasoningTraceStep;
  summary: string;
}>;

export type SyncEngineContextUse = {
  usedStoredMemories: boolean;
  usedLabMemories: boolean;
  memoryCount: number;
  relatedMemoryCount: number;
  duplicateCandidateFound: boolean;
};

export type SyncEnginePrivacyCommand = PrivacyCommandDetection;
export type SyncEngineVagueInput = VagueInputDetection;
export type SyncEngineConversationIntent = ConversationIntent;
export type SyncEngineContradiction = ContradictionDetection;
export type SyncEngineCorrectionTarget = CorrectionTarget;
export type SyncEngineConversationTurn = ConversationTurn;
export type SyncEngineConversationState = {
  activeTopic?: string;
  recentCategories: string[];
  repeatedJudgment?: string;
  staleJudgmentRisk: boolean;
  continuationLikely: boolean;
};
export type SyncEngineConversationGoal = {
  type: string;
  reason: string;
  confidence: number;
  shouldUseJudgmentPrimary: boolean;
  shouldAvoidStaleJudgment: boolean;
};

export type SyncEngineMessageResult = {
  input: {
    raw: string;
    normalized: string;
  };
  response: string;
  prepared: PreparedCapture | null;
  consequence: ConsequenceAnalysis | null;
  debug: SyncEngineDebugDecision;
  engineMode: SyncEngineMode;
  futureFollowUpDecision: SyncEngineFutureFollowUpDecision;
  briefingEffect: SyncEngineBriefingEffect;
  reasoningTrace: SyncEngineReasoningTrace;
  contextUse: SyncEngineContextUse;
  runtime: SyncRuntimeBrainEvaluation;
  privacyCommand: SyncEnginePrivacyCommand;
  vagueInput: SyncEngineVagueInput;
  conversationIntent: SyncEngineConversationIntent;
  contradiction: SyncEngineContradiction;
  correctionTarget: SyncEngineCorrectionTarget;
  conversationState?: SyncEngineConversationState;
  conversationGoal?: SyncEngineConversationGoal;
};

export type ProcessSyncMessageInput = {
  text: string;
  items?: CapturedSyncItem[];
  storedMemories?: CapturedSyncItem[];
  labMemories?: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  engineMode?: SyncEngineMode;
  priorities?: string[];
  conversation?: {
    turns?: ConversationTurn[];
  };
  context?: {
    capturedItems?: CapturedItem[];
    storedMemories?: CapturedItem[];
    labMemories?: CapturedItem[];
    currentDate?: Date;
    dryRun?: boolean;
    engineMode?: SyncEngineMode;
  };
};

type ResolvedContext = {
  items: CapturedSyncItem[];
  storedMemories: CapturedSyncItem[];
  labMemories: CapturedSyncItem[];
  usedStoredMemories: boolean;
  usedLabMemories: boolean;
};

function daysUntilDateKey(dateKey: string | null | undefined, reference: Date) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function affectedTimeframe(
  prepared: PreparedCapture,
  reference: Date,
): SyncEngineAffectedTimeframe {
  const dateKey =
    prepared.plan.timeline?.timelineRole === "deadline"
      ? prepared.plan.timeline.deadlineDate ?? prepared.plan.timeline.startDate
      : prepared.plan.timeline?.startDate ?? prepared.plan.timeline?.deadlineDate;
  const days = daysUntilDateKey(dateKey, reference);

  if (days == null) return "unscheduled";
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "this_week";
  return "later";
}

function confidenceScore(prepared: PreparedCapture, consequence: ConsequenceAnalysis) {
  const timelineConfidence = prepared.plan.timeline?.confidence ?? 0.5;
  const previewConfidence = prepared.preview.confidence.score;
  return Math.min(
    1,
    Math.max(0, (timelineConfidence + previewConfidence + consequence.confidence) / 3),
  );
}

function relatedMemoryIds(prepared: PreparedCapture) {
  return prepared.duplicate.matches.map((match) => match.item.id);
}

function duplicateUpdateCandidate(prepared: PreparedCapture) {
  const match = prepared.duplicate.bestMatch;
  if (!match) return null;

  return {
    id: match.item.id,
    title: displayMemoryTitle(match.item),
    score: match.score,
    reasons: match.reasons,
  };
}

function shouldSurfaceLater(
  prepared: PreparedCapture,
  consequence: ConsequenceAnalysis,
  timeframe: SyncEngineAffectedTimeframe,
) {
  if (prepared.meaning.importance === "critical" || prepared.meaning.importance === "high") {
    return true;
  }
  if (timeframe === "tomorrow" || timeframe === "this_week") return true;
  return consequence.insights.some((insight) => insight.severity !== "info");
}

function briefPreview(items: CapturedSyncItem[], input: ProcessSyncMessageInput, reference: Date) {
  const brief = buildDailyBrief({
    items,
    workSchedule: input.workSchedule ?? null,
    reference,
  });

  return {
    lede: brief.lede,
    lines: brief.sections.flatMap((section) => section.paragraphs),
  };
}

function briefFingerprint(brief: ReturnType<typeof briefPreview>) {
  return [brief.lede, ...brief.lines]
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function prospectiveMemoryFromPrepared(
  prepared: PreparedCapture,
  response: string,
  createdAt: Date,
): CapturedSyncItem {
  const timestamp = createdAt.toISOString();

  return {
    id: prepared.plan.id,
    title: prepared.title,
    category: prepared.plan.category,
    prompt: prepared.plan.prompt,
    originalPrompt: prepared.plan.originalPrompt,
    normalizationCorrections: prepared.plan.normalizationCorrections,
    destinations: prepared.destinations,
    dateLabel: prepared.plan.dateLabel,
    timeLabel: prepared.plan.timeLabel,
    amount: prepared.plan.parsedInput?.amount ?? null,
    frequency: prepared.plan.parsedInput?.frequency,
    moneyType: prepared.plan.parsedInput?.moneyType,
    workAvailability: prepared.plan.parsedInput?.workAvailability,
    timeline: prepared.plan.timeline,
    meaning: prepared.meaning,
    understanding: response,
    captureSource: "typed",
    status: "active",
    createdAt: prepared.plan.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

function priorityImpactFor(input: {
  changed: boolean;
  prepared: PreparedCapture | null;
  timeframe: SyncEngineAffectedTimeframe;
}): SyncEngineBriefingEffect["priorityImpact"] {
  if (!input.changed || !input.prepared) return "none";
  if (
    input.prepared.meaning.importance === "critical" ||
    input.prepared.meaning.importance === "high"
  ) {
    return "high";
  }
  if (input.timeframe === "today" || input.timeframe === "tomorrow") {
    return "medium";
  }
  return "low";
}

function affectedSectionFor(
  timeframe: SyncEngineAffectedTimeframe,
): SyncEngineBriefingEffect["affectedSection"] {
  if (timeframe === "today") return "today";
  if (timeframe === "tomorrow" || timeframe === "this_week") return "noticing";
  return undefined;
}

function buildBriefingEffect(input: {
  beforeItems: CapturedSyncItem[];
  afterItems: CapturedSyncItem[];
  request: ProcessSyncMessageInput;
  reference: Date;
  prepared: PreparedCapture | null;
  remembered: boolean;
  timeframe: SyncEngineAffectedTimeframe;
}): SyncEngineBriefingEffect {
  const before = briefPreview(input.beforeItems, input.request, input.reference);
  const after = briefPreview(input.afterItems, input.request, input.reference);
  const changed = briefFingerprint(before) !== briefFingerprint(after);

  if (changed) {
    return {
      changed,
      reason:
        "This input changed the memories or consequences feeding today's brief.",
      affectedSection: affectedSectionFor(input.timeframe),
      priorityImpact: priorityImpactFor({
        changed,
        prepared: input.prepared,
        timeframe: input.timeframe,
      }),
    };
  }

  if (!input.remembered) {
    return {
      changed,
      reason:
        "Sync did not remember this yet, so the briefing input stayed the same.",
      priorityImpact: "none",
    };
  }

  return {
    changed,
    reason:
      "Sync would remember this, but it is not strong enough to change today's brief.",
    priorityImpact: "none",
  };
}

function buildFutureFollowUpDecision(input: {
  memoryDecision: SyncEngineMemoryDecision;
  shouldSurface: boolean;
  timeframe: SyncEngineAffectedTimeframe;
  prepared: PreparedCapture | null;
  confidence: number;
}): SyncEngineFutureFollowUpDecision {
  if (input.memoryDecision === "ask_follow_up") {
    return {
      decision: "ask_now",
      reason: "Sync needs more detail before it can place this confidently.",
      confidence: Math.min(input.confidence, 0.55),
    };
  }

  if (!input.prepared) {
    return {
      decision: "none",
      reason: "There is no processed input to follow up on.",
      confidence: input.confidence,
    };
  }

  if (input.shouldSurface) {
    return {
      decision: "surface_in_brief",
      reason: "The input is relevant enough to keep available for a future brief.",
      suggestedTiming:
        input.timeframe === "unscheduled" ? undefined : input.timeframe,
      confidence: input.confidence,
    };
  }

  if (input.prepared.plan.category === "reminder") {
    return {
      decision: "remind",
      reason: "This looks like a reminder, but Sync needs timing before surfacing it.",
      suggestedTiming: input.timeframe === "unscheduled" ? undefined : input.timeframe,
      confidence: input.confidence,
    };
  }

  if (input.prepared.destinations.includes("Health")) {
    return {
      decision: "check_in",
      reason: "This may become useful if the pattern repeats.",
      confidence: Math.min(input.confidence, 0.7),
    };
  }

  return {
    decision: "none",
    reason: "No future follow-up is needed right now.",
    confidence: input.confidence,
  };
}

function resolveEngineMode(input: ProcessSyncMessageInput): SyncEngineMode {
  if (input.engineMode) return input.engineMode;
  if (input.context?.engineMode) return input.context.engineMode;
  if (input.context?.dryRun === true) return "dryRun";
  return "commit";
}

function resolveContext(input: ProcessSyncMessageInput): ResolvedContext {
  const explicitStored = input.context?.storedMemories ?? input.storedMemories;
  const explicitLab = input.context?.labMemories ?? input.labMemories;
  const legacyItems = input.context?.capturedItems ?? input.items ?? [];
  const storedMemories = explicitStored ?? (explicitLab ? [] : legacyItems);
  const labMemories = explicitLab ?? [];

  return {
    items: [...labMemories, ...storedMemories],
    storedMemories,
    labMemories,
    usedStoredMemories: storedMemories.length > 0,
    usedLabMemories: labMemories.length > 0,
  };
}

function buildContextUse(input: {
  context: ResolvedContext;
  relatedMemoryCount: number;
  duplicateCandidateFound: boolean;
}): SyncEngineContextUse {
  return {
    usedStoredMemories: input.context.usedStoredMemories,
    usedLabMemories: input.context.usedLabMemories,
    memoryCount: input.context.items.length,
    relatedMemoryCount: input.relatedMemoryCount,
    duplicateCandidateFound: input.duplicateCandidateFound,
  };
}

function noPrivacyCommand(): SyncEnginePrivacyCommand {
  return {
    detected: false,
    type: "unknown",
    requiresConfirmation: false,
    safeToExecuteInDryRun: true,
  };
}

function noVagueInput(): SyncEngineVagueInput {
  return {
    detected: false,
    missing: [],
    reason: "Input was specific enough for normal processing.",
    recommendedAction: "low_confidence_memory",
  };
}

function defaultConversationIntent(): SyncEngineConversationIntent {
  return {
    type: "capture",
    confidence: 0.9,
    routedBeforeCapture: false,
    reason: "No conversational shortcut was detected.",
  };
}

function noContradiction(): SyncEngineContradiction {
  return {
    detected: false,
    type: "unknown",
    relatedMemoryIds: [],
    recommendedAction: "low_confidence_memory",
    reason: "No contradiction signal detected.",
  };
}

function noCorrectionTarget(): SyncEngineCorrectionTarget {
  return {
    detected: false,
    confidence: 0,
    action: "none",
    candidateMemoryIds: [],
    reason: "No correction target detected.",
  };
}

function noConversationState(): SyncEngineConversationState {
  return {
    recentCategories: [],
    staleJudgmentRisk: false,
    continuationLikely: false,
  };
}

function noConversationGoal(): SyncEngineConversationGoal {
  return {
    type: "quiet_confirmation",
    reason: "No conversation-goal orchestration was needed.",
    confidence: 0.5,
    shouldUseJudgmentPrimary: false,
    shouldAvoidStaleJudgment: false,
  };
}

function detectHealthRiskSignal(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    /\bi have chest pain\b/.test(normalized) ||
    /\bmy chest hurts\b/.test(normalized) ||
    /\bi feel dizzy\b/.test(normalized)
  );
}

function hasExplicitCancellationTarget(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!/\b(cancel|canceled|cancelled)\b/.test(normalized)) return false;
  if (/\b(cancel|canceled|cancelled)\s+(something|it|that)\b/.test(normalized)) {
    return false;
  }
  return /\b(cancel|canceled|cancelled)\s+[a-z]/.test(normalized);
}

function compactConversationState(state: ConversationState): SyncEngineConversationState {
  return {
    activeTopic: state.activeTopic,
    recentCategories: state.recentCategories,
    repeatedJudgment: state.repeatedJudgment,
    staleJudgmentRisk: state.staleJudgmentRisk,
    continuationLikely: state.continuationLikely,
  };
}

function compactConversationGoal(goal: ConversationGoal): SyncEngineConversationGoal {
  return {
    type: goal.type,
    reason: goal.reason,
    confidence: goal.confidence,
    shouldUseJudgmentPrimary: goal.shouldUseJudgmentPrimary,
    shouldAvoidStaleJudgment: goal.shouldAvoidStaleJudgment,
  };
}

function emptyBriefingEffect(): SyncEngineBriefingEffect {
  return {
    changed: false,
    reason: "No input was processed, so today's brief did not change.",
    priorityImpact: "none",
  };
}

function emptyFutureFollowUp(confidence: number): SyncEngineFutureFollowUpDecision {
  return {
    decision: "none",
    reason: "There is no processed input to follow up on.",
    confidence,
  };
}

function traceForEmpty(): SyncEngineReasoningTrace {
  return [
    { step: "parsed_input", summary: "Input was empty." },
    { step: "classified_meaning", summary: "No meaning classification was attempted." },
    { step: "memory_decision", summary: "Sync ignored the empty input." },
    { step: "consequence_detection", summary: "No consequences were detected." },
    { step: "judgment_decision", summary: "Nothing should surface later." },
    { step: "response_generation", summary: "No response was generated." },
  ];
}

function traceForFollowUp(text: string): SyncEngineReasoningTrace {
  return [
    { step: "parsed_input", summary: `Parsed "${text.trim()}".` },
    { step: "classified_meaning", summary: "Input was too vague to classify confidently." },
    { step: "memory_decision", summary: "Sync should ask for clarification now." },
    { step: "consequence_detection", summary: "No reliable consequence was detected." },
    { step: "judgment_decision", summary: "Do not surface this until it is clearer." },
    { step: "response_generation", summary: "Generated a short clarification response." },
  ];
}

function traceForPrepared(input: {
  prepared: PreparedCapture;
  memoryDecision: SyncEngineMemoryDecision;
  consequence: ConsequenceAnalysis;
  timeframe: SyncEngineAffectedTimeframe;
  shouldSurface: boolean;
  runtime: SyncRuntimeBrainEvaluation;
}): SyncEngineReasoningTrace {
  const judgmentSummary = input.runtime.judgmentChanged
    ? `Today primary would change to "${input.runtime.after.judgment.primary}".`
    : input.runtime.after.judgment.primary
      ? `Today primary stays "${input.runtime.after.judgment.primary}".`
      : input.shouldSurface
        ? `Keep available for ${input.timeframe}.`
        : "Keep quiet unless more context appears.";

  return [
    {
      step: "parsed_input",
      summary: `Parsed input as ${input.prepared.plan.category}.`,
    },
    {
      step: "classified_meaning",
      summary: `Classified importance as ${input.prepared.meaning.importance}.`,
    },
    {
      step: "memory_decision",
      summary: `Memory decision: ${input.memoryDecision}.`,
    },
    {
      step: "consequence_detection",
      summary: input.consequence.summary,
    },
    {
      step: "judgment_decision",
      summary: judgmentSummary,
    },
    {
      step: "response_generation",
      summary: "Generated a short Sync response from the processed input.",
    },
  ];
}

function buildRuntimeEvaluation(input: {
  beforeItems: CapturedSyncItem[];
  afterItems: CapturedSyncItem[];
  request: ProcessSyncMessageInput;
  reference: Date;
  focusItem?: CapturedSyncItem | null;
}): SyncRuntimeBrainEvaluation {
  return evaluateRuntimeBrain({
    beforeItems: input.beforeItems,
    afterItems: input.afterItems,
    workSchedule: input.request.workSchedule,
    reference: input.reference,
    priorities: input.request.priorities,
    focusItem: input.focusItem ?? null,
  });
}

function responseForPrepared(
  prepared: PreparedCapture,
  consequence: ConsequenceAnalysis,
  timeframe: SyncEngineAffectedTimeframe,
  reference: Date,
) {
  const understanding = buildMemoryUnderstanding(
    {
      title: prepared.title,
      prompt: prepared.plan.prompt,
      originalPrompt: prepared.plan.originalPrompt,
      destinations: prepared.destinations,
      timeline: prepared.plan.timeline,
      category: prepared.plan.category,
      workAvailability: prepared.plan.parsedInput?.workAvailability,
      moneyType: prepared.plan.parsedInput?.moneyType,
    },
    reference,
  );

  if (timeframe === "today" || timeframe === "tomorrow") return understanding;
  if (consequence.summary !== "No major ripple effects detected.") {
    return consequence.summary;
  }
  if (prepared.destinations.includes("Health")) {
    return "Sync will keep this in your health context.";
  }
  if (prepared.destinations.includes("Finance")) {
    return "Sync will keep this in your money context.";
  }
  if (prepared.destinations.includes("Relationships") || prepared.destinations.includes("Family")) {
    return "Sync will keep this with the people context that matters.";
  }
  return "Sync will hold this quietly.";
}

function textTimeToken(text: string) {
  const match = text.match(/\b(\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/i);
  return match?.[1] ?? null;
}

function responseForCaptureGoal(input: {
  text: string;
  prepared: PreparedCapture;
  consequence: ConsequenceAnalysis;
  baseResponse: string;
  goal: ConversationGoal;
  state: ConversationState;
}): string {
  const normalized = input.text.trim().toLowerCase();
  const destinations = input.prepared.destinations;
  const timeToken = textTimeToken(input.text);

  if (
    /\bpaid\b/.test(normalized) &&
    /\bspent\b/.test(normalized) &&
    destinations.includes("Finance")
  ) {
    return "That spending after payday is worth tracking.";
  }

  if (/\brent\b/.test(normalized) && /\bdue\b/.test(normalized)) {
    const dayMatch = input.text.match(
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/i,
    );
    const day = dayMatch?.[1];
    return day ? `Got it. Rent is due ${day}.` : "Got it. Rent is due.";
  }

  if (
    /\bwork\b/.test(normalized) &&
    /\btomorrow\b/.test(normalized) &&
    timeToken
  ) {
    return `Got it. Work tomorrow starts at ${timeToken}.`;
  }

  if (/\bwoke up at\b/.test(normalized)) {
    return timeToken
      ? `Noted. You've been up since ${timeToken}.`
      : "Noted. That gives Sync more context for today.";
  }

  if (/\bhungry\b/.test(normalized)) {
    return "Noted. That gives Sync context for today.";
  }

  if (destinations.includes("Relationships") || destinations.includes("Family")) {
    return "Got it. I'll keep this with your people context.";
  }

  if (input.goal.type === "quiet_confirmation") {
    return "Noted. That gives Sync more context for today.";
  }

  if (input.goal.type === "connect_recent_context" || input.state.continuationLikely) {
    return "Noted. That gives Sync more context for today.";
  }

  if (input.goal.shouldAvoidStaleJudgment) {
    return input.baseResponse;
  }

  return input.baseResponse;
}

function emptyDebug(engineMode: SyncEngineMode): SyncEngineDebugDecision {
  return {
    remembered: false,
    memoryDecision: "ignore",
    category: "empty",
    importance: "low",
    consequenceSummary: "No input to process.",
    affectedTimeframe: "unscheduled",
    shouldSurfaceLater: false,
    relatedMemoryIds: [],
    relatedMemoriesFound: 0,
    duplicateUpdateCandidate: null,
    wouldCreateMemory: false,
    wouldUpdateExistingMemory: false,
    dryRun: engineMode === "dryRun",
    confidence: 1,
  };
}

function followUpResult(input: {
  text: string;
  engineMode: SyncEngineMode;
  contextUse: SyncEngineContextUse;
  request: ProcessSyncMessageInput;
  items: CapturedSyncItem[];
  reference: Date;
  vagueInput?: SyncEngineVagueInput;
  conversationIntent?: SyncEngineConversationIntent;
  contradiction?: SyncEngineContradiction;
  correctionTarget?: SyncEngineCorrectionTarget;
  conversationState?: SyncEngineConversationState;
  conversationGoal?: SyncEngineConversationGoal;
}): SyncEngineMessageResult {
  const confidence = 0.35;
  const vagueInput = input.vagueInput ?? {
    detected: true,
    missing: ["object"],
    reason: "Input was too vague to place confidently.",
    recommendedAction: "ask_follow_up" as const,
    followUpQuestion: "Say a little more and Sync can place it.",
  };
  const runtime = buildRuntimeEvaluation({
    beforeItems: input.items,
    afterItems: input.items,
    request: input.request,
    reference: input.reference,
  });

  return {
    input: { raw: input.text, normalized: input.text.trim() },
    response: vagueInput.followUpQuestion ?? "Say a little more and Sync can place it.",
    prepared: null,
    consequence: null,
    debug: {
      remembered: false,
      memoryDecision: "ask_follow_up",
      category: "unclear",
      importance: "low",
      consequenceSummary: vagueInput.reason,
      affectedTimeframe: "unscheduled",
      shouldSurfaceLater: false,
      relatedMemoryIds: [],
      relatedMemoriesFound: 0,
      duplicateUpdateCandidate: null,
      wouldCreateMemory: false,
      wouldUpdateExistingMemory: false,
      dryRun: input.engineMode === "dryRun",
      confidence,
    },
    engineMode: input.engineMode,
    futureFollowUpDecision: buildFutureFollowUpDecision({
      memoryDecision: "ask_follow_up",
      shouldSurface: false,
      timeframe: "unscheduled",
      prepared: null,
      confidence,
    }),
    briefingEffect: emptyBriefingEffect(),
    reasoningTrace: traceForFollowUp(input.text),
    contextUse: input.contextUse,
    runtime,
    privacyCommand: noPrivacyCommand(),
    vagueInput,
    conversationIntent: input.conversationIntent ?? defaultConversationIntent(),
    contradiction: input.contradiction ?? noContradiction(),
    correctionTarget: input.correctionTarget ?? noCorrectionTarget(),
    conversationState: input.conversationState ?? noConversationState(),
    conversationGoal: input.conversationGoal ?? noConversationGoal(),
  };
}

function sensitiveRejectedResult(input: {
  engineMode: SyncEngineMode;
  contextUse: SyncEngineContextUse;
  request: ProcessSyncMessageInput;
  items: CapturedSyncItem[];
  reference: Date;
  conversationState?: SyncEngineConversationState;
  conversationGoal?: SyncEngineConversationGoal;
}): SyncEngineMessageResult {
  const confidence = 0.2;
  const runtime = buildRuntimeEvaluation({
    beforeItems: input.items,
    afterItems: input.items,
    request: input.request,
    reference: input.reference,
  });

  return {
    input: {
      raw: SENSITIVE_INPUT_PLACEHOLDER,
      normalized: SENSITIVE_INPUT_PLACEHOLDER,
    },
    response: "I can't store secrets like passwords, keys, or account numbers.",
    prepared: null,
    consequence: null,
    debug: {
      remembered: false,
      memoryDecision: "ignore",
      category: "sensitive",
      importance: "critical",
      consequenceSummary: "Sensitive credential or identifier was not stored.",
      affectedTimeframe: "unscheduled",
      shouldSurfaceLater: false,
      relatedMemoryIds: [],
      relatedMemoriesFound: 0,
      duplicateUpdateCandidate: null,
      wouldCreateMemory: false,
      wouldUpdateExistingMemory: false,
      dryRun: input.engineMode === "dryRun",
      confidence,
    },
    engineMode: input.engineMode,
    futureFollowUpDecision: {
      decision: "none",
      reason: "Sensitive credentials should not become Sync memory.",
      confidence,
    },
    briefingEffect: {
      changed: false,
      reason: "Sensitive input was rejected before memory or briefing changes.",
      priorityImpact: "none",
    },
    reasoningTrace: [
      {
        step: "parsed_input",
        summary: "Sensitive input was detected and withheld from normal processing.",
      },
      {
        step: "classified_meaning",
        summary: "Classified as sensitive credential or identifier.",
      },
      {
        step: "memory_decision",
        summary: "Sync ignored this input because it contained sensitive content.",
      },
      {
        step: "consequence_detection",
        summary: "No consequences were generated from sensitive content.",
      },
      {
        step: "judgment_decision",
        summary: "Do not surface sensitive content in Today or Brief.",
      },
      {
        step: "response_generation",
        summary: "Generated a short refusal without repeating the secret.",
      },
    ],
    contextUse: input.contextUse,
    runtime,
    privacyCommand: noPrivacyCommand(),
    vagueInput: noVagueInput(),
    conversationIntent: defaultConversationIntent(),
    contradiction: noContradiction(),
    correctionTarget: noCorrectionTarget(),
    conversationState: input.conversationState ?? noConversationState(),
    conversationGoal: input.conversationGoal ?? noConversationGoal(),
  };
}

function privacyCommandResponse(command: SyncEnginePrivacyCommand) {
  if (command.type === "delete_all") {
    return "I can’t delete everything from here yet. This needs explicit confirmation in a safe memory control flow.";
  }
  if (command.type === "delete_topic") {
    return "I can’t delete that memory group from here yet. This needs confirmation before anything is removed.";
  }
  if (command.type === "export_all") {
    return "I can’t show or export all memories in this reply. That needs a safe review/export flow.";
  }
  if (command.type === "show_topic") {
    return "I can’t reveal memory details directly here. Use a safe review flow to inspect that area.";
  }
  return "This looks like a memory privacy request. It needs a safer control flow before Sync acts.";
}

function privacyCommandResult(input: {
  engineMode: SyncEngineMode;
  contextUse: SyncEngineContextUse;
  command: SyncEnginePrivacyCommand;
  conversationState?: SyncEngineConversationState;
  conversationGoal?: SyncEngineConversationGoal;
}): SyncEngineMessageResult {
  const confidence = 0.82;

  return {
    input: {
      raw: input.command.detected ? "[privacy command]" : "",
      normalized: input.command.type,
    },
    response: privacyCommandResponse(input.command),
    prepared: null,
    consequence: null,
    debug: {
      remembered: false,
      memoryDecision: "ignore",
      category: "privacy_control",
      importance: "critical",
      consequenceSummary: "Privacy/control command was routed without changing memory.",
      affectedTimeframe: "unscheduled",
      shouldSurfaceLater: false,
      relatedMemoryIds: [],
      relatedMemoriesFound: 0,
      duplicateUpdateCandidate: null,
      wouldCreateMemory: false,
      wouldUpdateExistingMemory: false,
      dryRun: input.engineMode === "dryRun",
      confidence,
    },
    engineMode: input.engineMode,
    futureFollowUpDecision: {
      decision: "ask_now",
      reason: "Privacy and deletion requests require explicit confirmation in a safe flow.",
      confidence,
    },
    briefingEffect: {
      changed: false,
      reason: "Privacy/control commands do not change Today or Brief.",
      priorityImpact: "none",
    },
    reasoningTrace: [
      {
        step: "parsed_input",
        summary: "Detected a privacy/control command.",
      },
      {
        step: "classified_meaning",
        summary: `Classified privacy command as ${input.command.type}.`,
      },
      {
        step: "memory_decision",
        summary: "Sync did not create, update, reveal, or delete memory from this message.",
      },
      {
        step: "consequence_detection",
        summary: "No life consequences were generated from the control command.",
      },
      {
        step: "judgment_decision",
        summary: "Do not surface this command in Today or Brief.",
      },
      {
        step: "response_generation",
        summary: "Generated a short safe-control response.",
      },
    ],
    contextUse: input.contextUse,
    runtime: emptyRuntimeBrainEvaluation(),
    privacyCommand: input.command,
    vagueInput: noVagueInput(),
    conversationIntent: {
      type: "privacy_command",
      confidence: 0.95,
      routedBeforeCapture: true,
      reason: "Command was routed through privacy controls.",
    },
    contradiction: noContradiction(),
    correctionTarget: noCorrectionTarget(),
    conversationState: input.conversationState ?? noConversationState(),
    conversationGoal: input.conversationGoal ?? noConversationGoal(),
  };
}

function greetingConversationResponse(text: string) {
  if (/hey sync/i.test(text.trim())) {
    return "Here. Drop what happened, and I'll help place it.";
  }
  return "Hey. Tell me what changed, or ask what matters today.";
}

function placeholderBriefText(text: string) {
  const value = text.trim().toLowerCase();
  if (!value) return true;
  return (
    value === "nothing needs your attention right now." ||
    /tell sync what's on your mind/.test(value) ||
    /still learning/.test(value) ||
    /what matters tod[a-z]*\s+today/.test(value) ||
    /today\s+today/.test(value)
  );
}

function fallbackBriefFromItems(items: CapturedSyncItem[]) {
  const active = items.filter((item) => item.status !== "cancelled" && !item.deletedAt);
  if (active.length === 0) return "";
  const textFor = (item: CapturedSyncItem) =>
    `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  const scored = active
    .map((item) => {
      const text = textFor(item);
      let score = 0;
      if (/\brent\b|\bdue\b|\bbill\b/.test(text)) score += 6;
      if (/\bspent\b|\bspending\b|\boverspend\b|\boverspending\b|\bpayday\b|\bpaid\b/.test(text)) {
        score += 5;
      }
      if (/\bwork\b|\bmeeting\b|\bshift\b|\btomorrow\b/.test(text)) score += 4;
      if (/\bexhausted\b|\banxious\b|\bstressed\b|\bworkout\b|\bhealth\b/.test(text)) score += 4;
      if (item.timeline?.isTimed || item.timeline?.timelineRole === "deadline") score += 3;
      score += Date.parse(item.updatedAt ?? item.createdAt ?? "") / 1_000_000_000_000;
      return { item, score, text };
    })
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) return "";
  if (/\brent\b|\bdue\b|\bbill\b/.test(top.text)) {
    return top.item.understanding?.trim() || "A bill deadline is coming up soon.";
  }
  if (/\bspent\b|\bspending\b|\boverspend\b|\boverspending\b|\bpayday\b|\bpaid\b/.test(top.text)) {
    return "Money context needs attention today.";
  }
  if (/\bexhausted\b|\banxious\b|\bstressed\b|\bworkout\b|\bhealth\b/.test(top.text)) {
    return "Health and emotional strain context needs attention today.";
  }
  return top.item.understanding?.trim() || displayMemoryTitle(top.item);
}

function briefingConversationResponse(runtime: SyncRuntimeBrainEvaluation, items: CapturedSyncItem[]) {
  const primary = runtime.after.judgment.primary?.trim() ?? "";
  const briefLede = runtime.after.brief.lede?.trim() ?? "";
  const hasBrief = briefLede.length > 0 && !runtime.after.brief.isEmpty;
  const supporting = runtime.after.judgment.supporting[0]?.trim() ?? "";
  const hasDuplicateSupporting =
    supporting.length > 0 &&
    (supporting.toLowerCase() === primary.toLowerCase() ||
      primary.toLowerCase().includes(supporting.toLowerCase()) ||
      supporting.toLowerCase().includes(primary.toLowerCase()));
  const isPlaceholderPrimary = placeholderBriefText(primary);
  const isPlaceholderLede = placeholderBriefText(briefLede);
  const fallback = fallbackBriefFromItems(items);

  if (isPlaceholderPrimary && !hasBrief) {
    return fallback || "There is not enough context yet. Tell me what changed, and I can show what matters today.";
  }

  if (primary && !isPlaceholderPrimary) {
    return supporting && !hasDuplicateSupporting ? `${primary} ${supporting}` : primary;
  }
  if (supporting && !placeholderBriefText(supporting)) return supporting;
  if (hasBrief && !isPlaceholderLede) return briefLede;
  if (fallback) return fallback;
  return "There is not enough context yet. Tell me what changed, and I can show what matters today.";
}

function memoryReviewConversationResponse(items: CapturedSyncItem[]) {
  const areas = new Set<string>();
  for (const item of items) {
    if (item.status === "cancelled" || item.deletedAt) continue;
    for (const destination of item.destinations ?? []) {
      if (destination === "Calendar") continue;
      areas.add(destination);
    }
  }

  if (areas.size === 0) {
    return "I do not have much stored yet. Tell me what changed, or open Memory when you add context.";
  }

  const summary = [...areas].slice(0, 4).join(", ");
  return `I have context on ${summary}. Open Review or Memory to inspect details safely — I will not dump everything here.`;
}

function conversationIntentResponse(input: {
  text: string;
  intent: SyncEngineConversationIntent;
  runtime: SyncRuntimeBrainEvaluation;
  items: CapturedSyncItem[];
}) {
  switch (input.intent.type) {
    case "greeting":
      return greetingConversationResponse(input.text);
    case "small_talk":
      return "I'm here. Tell me what's going on, or ask what matters today.";
    case "briefing_request":
      return briefingConversationResponse(input.runtime, input.items);
    case "memory_review_request":
      return memoryReviewConversationResponse(input.items);
    case "explanation_request":
      return "I need the specific memory or decision to explain. Point me to what you want clarified.";
    case "correction_request":
      return "What memory should I correct? Tell me which item or date changed.";
    default:
      return "Tell me what happened, and I will process it.";
  }
}

function conversationIntentResult(input: {
  text: string;
  intent: SyncEngineConversationIntent;
  engineMode: SyncEngineMode;
  contextUse: SyncEngineContextUse;
  request: ProcessSyncMessageInput;
  items: CapturedSyncItem[];
  reference: Date;
  conversationState: ConversationState;
  conversationGoal: ConversationGoal;
}): SyncEngineMessageResult {
  const runtime = buildRuntimeEvaluation({
    beforeItems: input.items,
    afterItems: input.items,
    request: input.request,
    reference: input.reference,
  });

  const response = conversationIntentResponse({
    text: input.text,
    intent: input.intent,
    runtime,
    items: input.items,
  });

  return {
    input: { raw: input.text, normalized: input.text.trim() },
    response,
    prepared: null,
    consequence: null,
    debug: {
      remembered: false,
      memoryDecision: "ignore",
      category: "conversation",
      importance: "low",
      consequenceSummary: "Conversational intent was routed before capture.",
      affectedTimeframe: "unscheduled",
      shouldSurfaceLater: false,
      relatedMemoryIds: [],
      relatedMemoriesFound: 0,
      duplicateUpdateCandidate: null,
      wouldCreateMemory: false,
      wouldUpdateExistingMemory: false,
      dryRun: input.engineMode === "dryRun",
      confidence: Math.max(0.45, input.intent.confidence),
    },
    engineMode: input.engineMode,
    futureFollowUpDecision: {
      decision:
        input.intent.type === "correction_request" ? "ask_now" : "none",
      reason:
        input.intent.type === "correction_request"
          ? "Correction requests need a specific target."
          : "Conversational routing does not create memory follow-up.",
      confidence: Math.max(0.45, input.intent.confidence),
    },
    briefingEffect: {
      changed: false,
      reason: "Conversational intent does not mutate memory.",
      priorityImpact: "none",
    },
    reasoningTrace: [
      { step: "parsed_input", summary: `Detected ${input.intent.type} intent.` },
      {
        step: "classified_meaning",
        summary: "Routed as conversational input before memory capture.",
      },
      {
        step: "memory_decision",
        summary: "Sync did not create memory from this conversational input.",
      },
      {
        step: "consequence_detection",
        summary: "No new life consequence was added.",
      },
      {
        step: "judgment_decision",
        summary:
          input.intent.type === "briefing_request"
            ? "Returned current judgment/brief context."
            : "Left Today judgment unchanged.",
      },
      {
        step: "response_generation",
        summary: "Generated a short conversational response.",
      },
    ],
    contextUse: input.contextUse,
    runtime,
    privacyCommand: noPrivacyCommand(),
    vagueInput: noVagueInput(),
    conversationIntent: input.intent,
    contradiction: noContradiction(),
    correctionTarget: noCorrectionTarget(),
    conversationState: compactConversationState(input.conversationState),
    conversationGoal: compactConversationGoal(input.conversationGoal),
  };
}

function trivialInputResult(input: {
  text: string;
  engineMode: SyncEngineMode;
  contextUse: SyncEngineContextUse;
  request: ProcessSyncMessageInput;
  items: CapturedSyncItem[];
  reference: Date;
  reason: string;
  conversationState?: SyncEngineConversationState;
  conversationGoal?: SyncEngineConversationGoal;
}): SyncEngineMessageResult {
  const confidence = 0.4;
  const runtime = buildRuntimeEvaluation({
    beforeItems: input.items,
    afterItems: input.items,
    request: input.request,
    reference: input.reference,
  });

  return {
    input: { raw: input.text, normalized: input.text.trim() },
    response: "Noted. I'll keep focus on higher-impact items.",
    prepared: null,
    consequence: null,
    debug: {
      remembered: false,
      memoryDecision: "ignore",
      category: "trivial_observation",
      importance: "low",
      consequenceSummary: input.reason,
      affectedTimeframe: "unscheduled",
      shouldSurfaceLater: false,
      relatedMemoryIds: [],
      relatedMemoriesFound: 0,
      duplicateUpdateCandidate: null,
      wouldCreateMemory: false,
      wouldUpdateExistingMemory: false,
      dryRun: input.engineMode === "dryRun",
      confidence,
    },
    engineMode: input.engineMode,
    futureFollowUpDecision: emptyFutureFollowUp(confidence),
    briefingEffect: {
      changed: false,
      reason: "Trivial observation was intentionally kept out of priority flow.",
      priorityImpact: "none",
    },
    reasoningTrace: [
      { step: "parsed_input", summary: "Parsed low-value observation." },
      { step: "classified_meaning", summary: "Classified as trivial context." },
      {
        step: "memory_decision",
        summary: "Ignored to avoid trivial notes dominating Today.",
      },
      {
        step: "consequence_detection",
        summary: "No consequence with decision value was detected.",
      },
      {
        step: "judgment_decision",
        summary: "Do not surface this in Today or Brief.",
      },
      {
        step: "response_generation",
        summary: "Generated a short acknowledgment.",
      },
    ],
    contextUse: input.contextUse,
    runtime,
    privacyCommand: noPrivacyCommand(),
    vagueInput: noVagueInput(),
    conversationIntent: defaultConversationIntent(),
    contradiction: noContradiction(),
    correctionTarget: noCorrectionTarget(),
    conversationState: input.conversationState ?? noConversationState(),
    conversationGoal: input.conversationGoal ?? noConversationGoal(),
  };
}

function healthRiskResult(input: {
  text: string;
  engineMode: SyncEngineMode;
  contextUse: SyncEngineContextUse;
  request: ProcessSyncMessageInput;
  items: CapturedSyncItem[];
  reference: Date;
  conversationIntent: SyncEngineConversationIntent;
  conversationState: ConversationState;
  conversationGoal: ConversationGoal;
}): SyncEngineMessageResult {
  const confidence = 0.9;
  const runtime = buildRuntimeEvaluation({
    beforeItems: input.items,
    afterItems: input.items,
    request: input.request,
    reference: input.reference,
  });

  return {
    input: { raw: input.text, normalized: input.text.trim() },
    response:
      "That could be important. If this feels severe, sudden, or unusual, get medical help.",
    prepared: null,
    consequence: null,
    debug: {
      remembered: false,
      memoryDecision: "ignore",
      category: "health_safety",
      importance: "critical",
      consequenceSummary: "Potentially serious health symptom language needs careful handling.",
      affectedTimeframe: "unscheduled",
      shouldSurfaceLater: false,
      relatedMemoryIds: [],
      relatedMemoriesFound: 0,
      duplicateUpdateCandidate: null,
      wouldCreateMemory: false,
      wouldUpdateExistingMemory: false,
      dryRun: input.engineMode === "dryRun",
      confidence,
    },
    engineMode: input.engineMode,
    futureFollowUpDecision: {
      decision: "none",
      reason: "Safety-first symptom language should not become normal capture memory.",
      confidence,
    },
    briefingEffect: {
      changed: false,
      reason: "Potentially serious symptom input is handled directly without memory mutation.",
      priorityImpact: "none",
    },
    reasoningTrace: [
      {
        step: "parsed_input",
        summary: "Detected potentially serious health symptom language.",
      },
      {
        step: "classified_meaning",
        summary: "Classified as safety-sensitive health context.",
      },
      {
        step: "memory_decision",
        summary: "Did not store this as normal memory.",
      },
      {
        step: "consequence_detection",
        summary: "Skipped normal consequence scoring for safety handling.",
      },
      {
        step: "judgment_decision",
        summary: "Did not add this to Today or Brief ranking.",
      },
      {
        step: "response_generation",
        summary: "Returned a careful, direct safety response without medical advice.",
      },
    ],
    contextUse: input.contextUse,
    runtime,
    privacyCommand: noPrivacyCommand(),
    vagueInput: noVagueInput(),
    conversationIntent: input.conversationIntent,
    contradiction: noContradiction(),
    correctionTarget: noCorrectionTarget(),
    conversationState: compactConversationState(input.conversationState),
    conversationGoal: compactConversationGoal(input.conversationGoal),
  };
}

export function processSyncMessage(
  input: ProcessSyncMessageInput,
): SyncEngineMessageResult {
  const reference = input.context?.currentDate ?? input.reference ?? new Date();
  const text = input.text.trim();
  const engineMode = resolveEngineMode(input);
  const resolvedContext = resolveContext(input);
  const items = resolvedContext.items;
  const conversationTurns = input.conversation?.turns ?? [];
  const baseContextUse = buildContextUse({
    context: resolvedContext,
    relatedMemoryCount: 0,
    duplicateCandidateFound: false,
  });

  if (!text) {
    const confidence = 1;
    return {
      input: { raw: input.text, normalized: "" },
      response: "",
      prepared: null,
      consequence: null,
      debug: emptyDebug(engineMode),
      engineMode,
      futureFollowUpDecision: emptyFutureFollowUp(confidence),
      briefingEffect: emptyBriefingEffect(),
      reasoningTrace: traceForEmpty(),
      contextUse: baseContextUse,
      runtime: emptyRuntimeBrainEvaluation(),
      privacyCommand: noPrivacyCommand(),
      vagueInput: noVagueInput(),
      conversationIntent: defaultConversationIntent(),
      contradiction: noContradiction(),
      correctionTarget: noCorrectionTarget(),
      conversationState: noConversationState(),
      conversationGoal: noConversationGoal(),
    };
  }

  const conversationIntent = detectConversationIntent(text);
  const baseConversationState = buildConversationState({
    turns: conversationTurns,
    currentInput: text,
  });

  const sensitive = detectSensitiveInput(text);
  if (sensitive.sensitive) {
    const conversationGoal = selectConversationGoal({
      intent: conversationIntent,
      state: baseConversationState,
      memoryDecision: "ignore",
      category: "sensitive",
      importance: "critical",
      shouldSurfaceLater: false,
    });
    return sensitiveRejectedResult({
      engineMode,
      contextUse: baseContextUse,
      request: input,
      items,
      reference,
      conversationState: compactConversationState(baseConversationState),
      conversationGoal: compactConversationGoal(conversationGoal),
    });
  }

  const privacyCommand = detectPrivacyCommand(text);
  if (privacyCommand.detected) {
    const conversationGoal = selectConversationGoal({
      intent: conversationIntent,
      state: baseConversationState,
      memoryDecision: "ignore",
      category: "privacy_control",
      importance: "critical",
      shouldSurfaceLater: false,
    });
    return privacyCommandResult({
      engineMode,
      contextUse: baseContextUse,
      command: privacyCommand,
      conversationState: compactConversationState(baseConversationState),
      conversationGoal: compactConversationGoal(conversationGoal),
    });
  }

  if (detectHealthRiskSignal(text)) {
    const conversationGoal = selectConversationGoal({
      intent: conversationIntent,
      state: baseConversationState,
      memoryDecision: "ignore",
      category: "health_safety",
      importance: "critical",
      shouldSurfaceLater: false,
    });
    return healthRiskResult({
      text: input.text,
      engineMode,
      contextUse: baseContextUse,
      request: input,
      items,
      reference,
      conversationIntent,
      conversationState: baseConversationState,
      conversationGoal,
    });
  }

  const shouldRouteBeforeCapture =
    conversationIntent.routedBeforeCapture &&
    (conversationIntent.type !== "correction_request" || items.length === 0);

  if (shouldRouteBeforeCapture) {
    const runtime = buildRuntimeEvaluation({
      beforeItems: items,
      afterItems: items,
      request: input,
      reference,
    });
    const conversationState = buildConversationState({
      turns: conversationTurns,
      currentInput: text,
      currentResultCandidate: {
        category: "conversation",
        judgmentPrimary: runtime.after.judgment.primary,
      },
    });
    const conversationGoal = selectConversationGoal({
      intent: conversationIntent,
      state: conversationState,
      memoryDecision: "ignore",
      category: "conversation",
      importance: "low",
      shouldSurfaceLater: false,
    });
    return conversationIntentResult({
      text: input.text,
      intent: conversationIntent,
      engineMode,
      contextUse: baseContextUse,
      request: input,
      items,
      reference,
      conversationState,
      conversationGoal,
    });
  }

  const trivialInput = detectTrivialInput(text);
  if (trivialInput.detected) {
    const conversationGoal = selectConversationGoal({
      intent: conversationIntent,
      state: baseConversationState,
      memoryDecision: "ignore",
      category: "trivial_observation",
      importance: "low",
      shouldSurfaceLater: false,
    });
    return trivialInputResult({
      text: input.text,
      engineMode,
      contextUse: baseContextUse,
      request: input,
      items,
      reference,
      reason: trivialInput.reason,
      conversationState: compactConversationState(baseConversationState),
      conversationGoal: compactConversationGoal(conversationGoal),
    });
  }

  const preContradiction = detectContradiction({ text, items });
  const preCorrectionTarget = detectCorrectionTarget({
    text,
    items,
    contradiction: preContradiction,
    conversationTurns,
  });

  const vagueInput = detectVagueInput(text);
  if (
    vagueInput.detected &&
    vagueInput.recommendedAction === "ask_follow_up" &&
    !preCorrectionTarget.detected
  ) {
    const conversationGoal = selectConversationGoal({
      intent: conversationIntent,
      state: baseConversationState,
      memoryDecision: "ask_follow_up",
      category: "unclear",
      importance: "low",
      shouldSurfaceLater: false,
    });
    return followUpResult({
      text: input.text,
      engineMode,
      contextUse: baseContextUse,
      request: input,
      items,
      reference,
      vagueInput,
      conversationIntent,
      conversationState: compactConversationState(baseConversationState),
      conversationGoal: compactConversationGoal(conversationGoal),
    });
  }

  if (
    isCaptureInputVague(text) &&
    !preCorrectionTarget.detected &&
    !hasExplicitCancellationTarget(text)
  ) {
    const conversationGoal = selectConversationGoal({
      intent: conversationIntent,
      state: baseConversationState,
      memoryDecision: "ask_follow_up",
      category: "unclear",
      importance: "low",
      shouldSurfaceLater: false,
    });
    return followUpResult({
      text: input.text,
      engineMode,
      contextUse: baseContextUse,
      request: input,
      items,
      reference,
      conversationIntent,
      conversationState: compactConversationState(baseConversationState),
      conversationGoal: compactConversationGoal(conversationGoal),
    });
  }

  const prepared = prepareUniversalCapture(text, {
    items,
    workSchedule: input.workSchedule,
    reference,
  });
  const consequence = analyzeConsequences({
    captureText: prepared.plan.prompt,
    category: prepared.plan.category,
    destinations: prepared.destinations,
    timeline: prepared.plan.timeline,
  });
  const timeframe = affectedTimeframe(prepared, reference);
  const duplicateIds = relatedMemoryIds(prepared);
  const candidate = duplicateUpdateCandidate(prepared);
  const relationshipPreference = detectRelationshipPreference(text);
  applyRelationshipPreferenceContext(prepared, relationshipPreference);
  if (relationshipPreference.detected) {
    prepared.destinations = prepared.destinations.filter(
      (destination) => destination !== "Calendar",
    );
    prepared.meaning.importance = "medium";
    prepared.plan.timeline = undefined;
    prepared.plan.dateLabel = "Upcoming";
    prepared.plan.timeLabel = "Flexible";
  }
  const contradiction = preContradiction;
  const correctionTarget = preCorrectionTarget;
  let memoryDecision: SyncEngineMemoryDecision = prepared.duplicate.isDuplicate
    ? "update_existing"
    : isSilentCaptureReady(prepared)
      ? "remember"
      : "ask_follow_up";
  if (relationshipPreference.detected && memoryDecision === "ask_follow_up") {
    memoryDecision = "remember";
  }
  if (contradiction.detected) {
    if (contradiction.recommendedAction === "ask_follow_up") {
      memoryDecision = "ask_follow_up";
    } else if (contradiction.recommendedAction === "update_existing") {
      memoryDecision = "update_existing";
    }
  }
  if (correctionTarget.detected) {
    if (correctionTarget.action === "update_existing") {
      memoryDecision = "update_existing";
    } else if (correctionTarget.action === "ask_follow_up") {
      memoryDecision = "ask_follow_up";
    }
  }
  const remembered = memoryDecision === "remember" || memoryDecision === "update_existing";
  const wouldCreateMemory = memoryDecision === "remember";
  const wouldUpdateExistingMemory = memoryDecision === "update_existing";
  const baseConfidence = confidenceScore(prepared, consequence);
  const contradictionLimited = contradiction.detected ? Math.min(baseConfidence, 0.58) : baseConfidence;
  const confidence = correctionTarget.detected
    ? Math.min(contradictionLimited, correctionTarget.confidence)
    : contradictionLimited;
  const shouldSurfaceBase = shouldSurfaceLater(prepared, consequence, timeframe);
  const shouldSurface = relationshipPreference.detected && timeframe === "unscheduled"
    ? false
    : contradiction.detected
      ? false
      : shouldSurfaceBase;
  const preliminaryResponse = memoryDecision === "ask_follow_up" && correctionTarget.detected
    ? correctionTarget.candidateMemoryIds.length > 1
      ? "I found a few memories this might refer to. Which one should I update?"
      : "I may be missing the exact memory to correct. What should I update?"
    : contradiction.detected && memoryDecision === "ask_follow_up"
      ? "That may conflict with what I already remember. Can you clarify which one is current?"
      : memoryDecision === "update_existing" && correctionTarget.targetMemoryId
        ? "Got it. I'll update that existing memory."
        : responseForPrepared(prepared, consequence, timeframe, reference);
  const beforeItems = items;
  const afterItems =
    remembered && wouldCreateMemory
      ? [prospectiveMemoryFromPrepared(prepared, preliminaryResponse, reference), ...items]
      : items;
  const candidateFromCorrection =
    correctionTarget.targetMemoryId != null
      ? items.find((item) => item.id === correctionTarget.targetMemoryId) ?? null
      : null;
  const effectiveCandidate = candidateFromCorrection
    ? {
        id: candidateFromCorrection.id,
        title: displayMemoryTitle(candidateFromCorrection),
        score: correctionTarget.confidence,
        reasons: [correctionTarget.reason],
      }
    : candidate;
  const contextUse = buildContextUse({
    context: resolvedContext,
    relatedMemoryCount: correctionTarget.detected
      ? correctionTarget.candidateMemoryIds.length
      : duplicateIds.length,
    duplicateCandidateFound: Boolean(effectiveCandidate),
  });
  const focusItem =
    remembered && wouldCreateMemory
      ? prospectiveMemoryFromPrepared(prepared, preliminaryResponse, reference)
      : null;
  const runtime = buildRuntimeEvaluation({
    beforeItems,
    afterItems,
    request: input,
    reference,
    focusItem,
  });
  const conversationState = buildConversationState({
    turns: conversationTurns,
    currentInput: text,
    currentResultCandidate: {
      category: prepared.plan.category,
      judgmentPrimary: runtime.after.judgment.primary,
    },
  });
  const conversationGoal = selectConversationGoal({
    intent: conversationIntent,
    state: conversationState,
    memoryDecision,
    category: prepared.plan.category,
    importance: prepared.meaning.importance,
    shouldSurfaceLater: shouldSurface,
  });
  const response =
    memoryDecision === "ask_follow_up"
      ? preliminaryResponse
      : responseForCaptureGoal({
          text,
          prepared,
          consequence,
          baseResponse: preliminaryResponse,
          goal: conversationGoal,
          state: conversationState,
        });

  return {
    input: {
      raw: input.text,
      normalized: prepared.plan.prompt,
    },
    response,
    prepared,
    consequence,
    debug: {
      remembered,
      memoryDecision,
      category: prepared.plan.category,
      importance: prepared.meaning.importance,
      consequenceSummary: consequence.summary,
      affectedTimeframe: timeframe,
      shouldSurfaceLater: shouldSurface,
      relatedMemoryIds: correctionTarget.detected
        ? correctionTarget.candidateMemoryIds
        : duplicateIds,
      relatedMemoriesFound: correctionTarget.detected
        ? correctionTarget.candidateMemoryIds.length
        : duplicateIds.length,
      duplicateUpdateCandidate: effectiveCandidate,
      wouldCreateMemory,
      wouldUpdateExistingMemory,
      dryRun: engineMode === "dryRun",
      confidence,
    },
    engineMode,
    futureFollowUpDecision: buildFutureFollowUpDecision({
      memoryDecision,
      shouldSurface,
      timeframe,
      prepared,
      confidence,
    }),
    briefingEffect: buildBriefingEffect({
      beforeItems,
      afterItems,
      request: input,
      reference,
      prepared,
      remembered,
      timeframe,
    }),
    reasoningTrace: traceForPrepared({
      prepared,
      memoryDecision,
      consequence,
      timeframe,
      shouldSurface,
      runtime,
    }),
    contextUse,
    runtime,
    privacyCommand: noPrivacyCommand(),
    vagueInput: noVagueInput(),
    conversationIntent,
    contradiction,
    correctionTarget,
    conversationState: compactConversationState(conversationState),
    conversationGoal: compactConversationGoal(conversationGoal),
  };
}
