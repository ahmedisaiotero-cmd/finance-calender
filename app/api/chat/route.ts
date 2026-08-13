import { handleChatPost } from "@/lib/api/chat-handler";

export async function POST(request: Request) {
  return handleChatPost(request);
}
