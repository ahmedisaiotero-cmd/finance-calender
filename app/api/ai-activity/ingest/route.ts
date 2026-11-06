import {
  handleAiActivityIngestOptions,
  handleAiActivityIngestPost,
} from "@/lib/api/ai-activity-ingest-handler";
import { createPrismaPairingStore } from "@/lib/db/ai-pairing";

export async function OPTIONS(request: Request) {
  return handleAiActivityIngestOptions(request);
}

export async function POST(request: Request) {
  return handleAiActivityIngestPost(request, {
    pairingStore: createPrismaPairingStore(),
  });
}
