import { resolveCaptureAction } from "@/lib/capture-action-resolver";
import type { CapturedSyncItem } from "@/lib/captured-items";
import type { LifeDrilldownTarget } from "@/lib/intelligence/consequence-link";
import { buildAllConsequences } from "@/lib/intelligence/sync-consequences";
import {
  buildCapturePreview,
  buildCapturePreviewFromItem,
  type CapturePreview,
} from "@/lib/mobile-prototype/build-capture-preview";
import { buildCaptureConfirmation } from "@/lib/mobile-prototype/build-capture-confirmation";
import { CAPTURE_VAGUE } from "@/lib/mobile-prototype/sync-voice";
import {
  captureSourceMetadata,
  resolveCaptureText,
  type CaptureSourceMetadata,
  type SyncCaptureInput,
} from "@/lib/sync-capture/capture-source";
import { isCaptureInputVague } from "@/lib/sync-capture/apply-capture-input";
import {
  isSilentCaptureReady,
  prepareCaptureFromText,
  prepareUniversalCapture,
  type PreparedCapture,
} from "@/lib/sync-capture/save-capture";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";
import type { CaptureCategoryHint } from "@/lib/sync-capture/capture-hint";

export type PreviewCaptureContext = {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  categoryHint?: CaptureCategoryHint;
};

export type PreviewCaptureResult =
  | { status: "empty" }
  | { status: "too_vague"; message: string }
  | {
      status: "duplicate";
      existing: CapturePreview;
      existingItem: CapturedSyncItem;
      viewTarget: LifeDrilldownTarget | null;
      prepared: PreparedCapture;
      inputText: string;
      sourceMeta: CaptureSourceMetadata;
    }
  | { status: "command" }
  | {
      status: "ready";
      preview: CapturePreview;
      prepared: PreparedCapture;
      inputText: string;
      sourceMeta: CaptureSourceMetadata;
    };

function viewTargetForExistingItem(
  item: CapturedSyncItem,
  items: CapturedSyncItem[],
  reference: Date,
): LifeDrilldownTarget | null {
  const consequences = buildAllConsequences({ items, reference });
  return buildCaptureConfirmation(item, { reference, consequences }).target;
}

function pipelineContext(context: PreviewCaptureContext) {
  return {
    items: context.items,
    workSchedule: context.workSchedule,
    reference: context.reference,
    categoryHint: context.categoryHint,
  };
}

export function previewCaptureInput(
  input: SyncCaptureInput | string,
  context: PreviewCaptureContext,
): PreviewCaptureResult {
  const inputText = resolveCaptureText(input);
  if (!inputText) return { status: "empty" };

  if (isCaptureInputVague(inputText)) {
    return { status: "too_vague", message: CAPTURE_VAGUE };
  }

  const action = resolveCaptureAction(inputText, context.items);
  if (action.intent !== "create") {
    return { status: "command" };
  }

  const pipe = pipelineContext(context);
  let prepared =
    prepareCaptureFromText(inputText, pipe) ??
    prepareUniversalCapture(inputText, pipe);

  if (!isSilentCaptureReady(prepared)) {
    prepared = prepareUniversalCapture(inputText, pipe);
  }

  const reference = context.reference ?? new Date();

  if (prepared.duplicate.isDuplicate && prepared.duplicate.bestMatch) {
    const existingItem = prepared.duplicate.bestMatch.item;
    return {
      status: "duplicate",
      existing: buildCapturePreviewFromItem(existingItem, reference),
      existingItem,
      viewTarget: viewTargetForExistingItem(existingItem, context.items, reference),
      prepared,
      inputText,
      sourceMeta: captureSourceMetadata(input),
    };
  }

  const preview = buildCapturePreview(prepared, reference);

  return {
    status: "ready",
    preview,
    prepared,
    inputText,
    sourceMeta: captureSourceMetadata(input),
  };
}
