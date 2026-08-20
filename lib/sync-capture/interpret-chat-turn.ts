import { classifyLifeNote } from "@/lib/intelligence/life-note-classifier";
import type { CaptureCategoryHint } from "@/lib/sync-capture/capture-hint";
import { detectSyncCommandIntent } from "@/lib/sync-command-intent";

export type ChatTurnClauseKind =
  | "fact"
  | "belief_state"
  | "correction"
  | "ignore";

export type ChatTurnClause = {
  text: string;
  kind: ChatTurnClauseKind;
  categoryHint?: CaptureCategoryHint;
  captureText: string;
};

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export function splitChatClauses(text: string): string[] {
  const trimmed = normalize(text);
  if (!trimmed) return [];

  return trimmed
    .split(/\s*(?:,\s+and\s+|;\s+|\.\s+|\s+but\s+)\s*/i)
    .map((part) => part.replace(/^and\s+/i, "").trim())
    .filter((part) => part.length > 1);
}

export function assistantAskedAboutDebt(text: string | undefined) {
  return /\b(debt|approach (the )?debt|how (will|do|would) you plan|plan to (pay|handle|approach))\b/i.test(
    text ?? "",
  );
}

export function isNoPlanLanguage(text: string) {
  return /\b((don'?t|do not|does not|didn't|did not|no|not)\b.{0,24}\b(much\s+)?plans?|nothing planned|no plans|no current plan)\b/i.test(
    text,
  );
}

export function isStandaloneNoPlansToday(text: string) {
  return /\b((don'?t|do not|no)\b.{0,16}\bplans?\s+today|no plans today)\b/i.test(
    text,
  );
}

function isCorrection(text: string) {
  const intent = detectSyncCommandIntent(text);
  if (intent.type === "edit") return true;
  return /^(actually|wait,)\b/i.test(text.trim());
}

function isFinancialState(text: string) {
  return Boolean(
    classifyLifeNote(text)?.kind === "financial_state" ||
      classifyLifeNote(text)?.kind === "no_plan" ||
      /\b(a lot of debt|lots of debt|in debt|comfortable for now)\b/i.test(text),
  );
}

function withEvidence(summary: string, original: string) {
  const left = normalize(summary);
  const right = normalize(original);
  if (!left || left === right) return original;
  return `${summary} ${original}`;
}

function contextualizeBelief(
  text: string,
  priorAssistantText: string | undefined,
): string {
  if (assistantAskedAboutDebt(priorAssistantText) && isNoPlanLanguage(text)) {
    return withEvidence("No current plan for approaching the debt.", text);
  }
  if (/\bcomfortable for now\b/i.test(text)) {
    return withEvidence("Currently financially comfortable.", text);
  }
  if (/\b(a lot of debt|lots of debt|in debt)\b/i.test(text)) {
    return withEvidence("Has significant debt.", text);
  }
  if (isNoPlanLanguage(text)) {
    return withEvidence("No current plan.", text);
  }
  return text;
}

export function interpretChatTurn(input: {
  text: string;
  priorAssistantText?: string;
}): ChatTurnClause[] {
  const trimmed = normalize(input.text);
  if (!trimmed) return [];

  if (isCorrection(trimmed)) {
    return [
      {
        text: trimmed,
        kind: "correction",
        categoryHint: "Money",
        captureText: trimmed.replace(/^(actually|wait,)[, ]*/i, "").trim() || trimmed,
      },
    ];
  }

  if (
    assistantAskedAboutDebt(input.priorAssistantText) &&
    isNoPlanLanguage(trimmed)
  ) {
    return [
      {
        text: trimmed,
        kind: "belief_state",
        categoryHint: "Money",
        captureText: contextualizeBelief(trimmed, input.priorAssistantText),
      },
    ];
  }

  if (isStandaloneNoPlansToday(trimmed)) {
    return [
      {
        text: trimmed,
        kind: "belief_state",
        captureText: withEvidence("No plans today.", trimmed),
      },
    ];
  }

  return splitChatClauses(trimmed).map((clause) => {
    if (isFinancialState(clause) || isNoPlanLanguage(clause)) {
      return {
        text: clause,
        kind: "belief_state" as const,
        categoryHint: "Money" as const,
        captureText: contextualizeBelief(clause, input.priorAssistantText),
      };
    }

    return {
      text: clause,
      kind: "fact" as const,
      categoryHint: /\b(paid|rent|debt|money|paycheck)\b/i.test(clause)
        ? ("Money" as const)
        : undefined,
      captureText: clause,
    };
  });
}
