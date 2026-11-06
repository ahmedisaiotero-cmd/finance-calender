import {
  handleAiActivityPairClaim,
  handleAiActivityPairOptions,
} from "@/lib/api/ai-activity-pair-handler";

export async function OPTIONS(request: Request) {
  return handleAiActivityPairOptions(request);
}

export async function POST(request: Request) {
  return handleAiActivityPairClaim(request);
}
