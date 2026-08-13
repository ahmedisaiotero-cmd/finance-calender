import { NextResponse } from "next/server";

import {
  DatabaseUnavailableError,
  RequestIdentityError,
  requireRequestIdentity,
  type RequestIdentity,
} from "@/lib/auth/request-identity";

export async function loadRequestIdentity(): Promise<
  | { ok: true; identity: RequestIdentity }
  | { ok: false; response: NextResponse }
> {
  try {
    const identity = await requireRequestIdentity();
    return { ok: true, identity };
  } catch (error) {
    if (error instanceof RequestIdentityError) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    if (error instanceof DatabaseUnavailableError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "DATABASE_URL is not configured" },
          { status: 503 },
        ),
      };
    }
    console.error("request identity", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Unexpected error" }, { status: 500 }),
    };
  }
}
