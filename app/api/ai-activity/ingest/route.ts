import {
  handleAiActivityIngestOptions,
  handleAiActivityIngestPost,
} from "@/lib/api/ai-activity-ingest-handler";
import {
  DatabaseUnavailableError,
  RequestIdentityError,
  requireRequestIdentity,
} from "@/lib/auth/request-identity";
import { createPrismaPairingStore } from "@/lib/db/ai-pairing";

export async function OPTIONS(request: Request) {
  return handleAiActivityIngestOptions(request);
}

export async function POST(request: Request) {
  return handleAiActivityIngestPost(request, {
    pairingStore: createPrismaPairingStore(),
    getSessionOwner: async () => {
      try {
        const identity = await requireRequestIdentity();
        return {
          ownerId: identity.user.id,
          ownerEmail: identity.user.email || "unknown@sync.local",
        };
      } catch (error) {
        if (
          error instanceof RequestIdentityError ||
          error instanceof DatabaseUnavailableError
        ) {
          return null;
        }
        return null;
      }
    },
  });
}
