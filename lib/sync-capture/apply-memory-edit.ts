import { buildUpdatedCaptureFromPlan } from "@/lib/capture-action-resolver";
import { sanitizeSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import type { ApplyCaptureContext, ApplyCaptureHandlers } from "@/lib/sync-capture/apply-capture-input";
import {
  compactCaptureTitle,
  enrichCapturePlan,
  isSilentCaptureReady,
  prepareCaptureFromText,
  type CapturePipelineContext,
} from "@/lib/sync-capture/save-capture";

export type ApplyMemoryEditResult =
  | { status: "saved"; title: string; itemId: string }
  | { status: "empty" }
  | { status: "too_vague"; message: string }
  | {
      status: "needs_clarification";
      message: string;
    };

function pipelineContext(
  context: ApplyCaptureContext,
  itemId: string,
): CapturePipelineContext {
  return {
    items: context.items,
    workSchedule: context.workSchedule,
    reference: context.reference,
    categoryHint: context.categoryHint,
    excludeCaptureId: itemId,
  };
}

export function applyMemoryEdit(
  itemId: string,
  text: string,
  context: ApplyCaptureContext,
  handlers: Pick<ApplyCaptureHandlers, "updateCapturedItem">,
): ApplyMemoryEditResult {
  const trimmed = text.trim();
  if (!trimmed) return { status: "empty" };

  const existing = context.items.find((item) => item.id === itemId);
  if (!existing || existing.deletedAt || existing.status === "cancelled") {
    return { status: "empty" };
  }

  const reference = context.reference ?? new Date();
  const prepared = prepareCaptureFromText(trimmed, pipelineContext(context, itemId));

  if (!prepared || !isSilentCaptureReady(prepared)) {
    return {
      status: "needs_clarification",
      message: "Tell Sync a bit more so it can update this memory.",
    };
  }

  const enriched = enrichCapturePlan(prepared.plan, reference);
  const title = compactCaptureTitle(enriched);
  const destinations =
    prepared.destinations.length > 0
      ? prepared.destinations
      : sanitizeSyncDestinations(existing.destinations);

  const updated = {
    ...buildUpdatedCaptureFromPlan(existing, enriched, destinations, title),
    meaning: prepared.meaning,
    originalPrompt: trimmed,
  };

  handlers.updateCapturedItem(itemId, updated);
  return { status: "saved", title, itemId };
}
