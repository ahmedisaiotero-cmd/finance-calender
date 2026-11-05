import { handleAiActivityIngestPost } from "@/lib/api/ai-activity-ingest-handler";

export async function POST(request: Request) {
  return handleAiActivityIngestPost(request);
}
