import { handleAiActivityListGet } from "@/lib/api/ai-activity-list-handler";
import { handleAiActivityPairOptions } from "@/lib/api/ai-activity-pair-handler";

export async function OPTIONS(request: Request) {
  return handleAiActivityPairOptions(request);
}

export async function GET(request: Request) {
  return handleAiActivityListGet(request);
}
