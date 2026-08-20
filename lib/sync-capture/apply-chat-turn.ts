import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  applyCaptureInput,
  type ApplyCaptureContext,
  type ApplyCaptureHandlers,
  type ApplyCaptureResult,
} from "@/lib/sync-capture/apply-capture-input";
import {
  interpretChatTurn,
  type ChatTurnClause,
} from "@/lib/sync-capture/interpret-chat-turn";
import {
  buildUpdatedCaptureFromPlan,
  resolveCaptureAction,
} from "@/lib/capture-action-resolver";
import { compactCaptureTitle, enrichCapturePlan } from "@/lib/sync-capture/save-capture";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import { detectContradiction } from "@/lib/sync-engine/reasoning/contradiction";
import { detectCorrectionTarget } from "@/lib/sync-engine/reasoning/correction-target";

export type AppliedChatTurn = {
  clauses: ChatTurnClause[];
  results: ApplyCaptureResult[];
  items: CapturedSyncItem[];
};

function applyClause(
  clause: ChatTurnClause,
  items: CapturedSyncItem[],
  context: ApplyCaptureContext,
  handlers: ApplyCaptureHandlers,
): ApplyCaptureResult {
  const captureContext: ApplyCaptureContext = {
    ...context,
    items,
    categoryHint: clause.categoryHint ?? context.categoryHint,
    forceSaveUncertain: false,
  };

  if (clause.kind === "correction") {
    const contradiction = detectContradiction({ text: clause.text, items });
    const target = detectCorrectionTarget({
      text: clause.text,
      items,
      contradiction,
    });
    const action = resolveCaptureAction(clause.text, items);
    const existing =
      items.find((item) => item.id === target.targetMemoryId) ??
      (action.intent === "edit" ? action.primaryTarget : undefined) ??
      items.find((item) => /\brent\b/i.test(`${item.title} ${item.prompt}`));

    if (existing) {
      const restated = clause.captureText;
      const plan = createPulsePlan(restated, {
        timeline: {
          now: context.reference,
          timeZone: context.timeZone,
        },
        categoryHint: clause.categoryHint,
      });
      const enriched = enrichCapturePlan(plan, context.reference ?? new Date());
      const destinations = sanitizeSyncDestinations(
        existing.destinations.includes("Finance")
          ? [...existing.destinations]
          : [...existing.destinations, "Finance"],
      );
      const title = compactCaptureTitle(enriched);
      handlers.updateCapturedItem(
        existing.id,
        buildUpdatedCaptureFromPlan(existing, enriched, destinations, title),
      );
      return {
        status: "saved",
        kind: "edit",
        title,
        itemId: existing.id,
      };
    }
  }

  return applyCaptureInput(clause.captureText, captureContext, handlers);
}

export function applyChatTurn(
  text: string,
  context: ApplyCaptureContext & { priorAssistantText?: string },
  handlers: ApplyCaptureHandlers,
): AppliedChatTurn {
  const clauses = interpretChatTurn({
    text,
    priorAssistantText: context.priorAssistantText,
  }).filter((clause) => clause.kind !== "ignore");

  const results: ApplyCaptureResult[] = [];
  let items = [...context.items];

  const liveHandlers: ApplyCaptureHandlers = {
    addCapturedItem: (plan, destinations, title, extras) => {
      const captured = handlers.addCapturedItem(plan, destinations, title, extras);
      items = [captured, ...items.filter((item) => item.id !== captured.id)];
      return captured;
    },
    updateCapturedItem: (id, updates) => {
      const updated = handlers.updateCapturedItem(id, updates);
      if (updated) {
        items = items.map((item) => (item.id === id ? updated : item));
      }
      return updated;
    },
    softDeleteCapturedItem: (id) => {
      handlers.softDeleteCapturedItem(id);
      items = items.map((item) =>
        item.id === id
          ? {
              ...item,
              deletedAt: new Date().toISOString(),
              status: "cancelled" as const,
            }
          : item,
      );
    },
  };

  for (const clause of clauses) {
    results.push(applyClause(clause, items, context, liveHandlers));
  }

  return { clauses, results, items };
}
