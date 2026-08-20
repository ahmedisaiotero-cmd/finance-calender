import { handleChatGet, handleChatPost } from "@/lib/api/chat-handler";

export async function GET(request: Request) {
  return handleChatGet(request);
}

export async function POST(request: Request) {
  return handleChatPost(request);
}
