import { NextResponse } from "next/server";

import { isAppleAuthEnabled } from "@/lib/auth/oauth-providers";
import {
  appleRevocationRequired,
  revokeAppleTokensForUser,
} from "@/lib/auth/apple-notifications";
import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { completeConsumerFirstRun } from "@/lib/auth/consumer-first-run";
import { setLlmChatConsent } from "@/lib/auth/llm-chat-consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACCOUNT_DELETION_RETAINED,
  deleteUserAccount,
} from "@/lib/db/delete-user-account";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  const user = await prisma.user.findUnique({
    where: { id: loaded.identity.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      birthYear: true,
      legalPolicyVersion: true,
      legalAcceptedAt: true,
      llmChatConsentAt: true,
      consumerFirstRunAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: user ?? loaded.identity.user,
    retainedAfterDeletion: ACCOUNT_DELETION_RETAINED,
  });
}

export async function PATCH(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  let body: { llmChatConsent?: unknown; consumerFirstRun?: unknown } = {};
  try {
    body = (await request.json()) as {
      llmChatConsent?: unknown;
      consumerFirstRun?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.consumerFirstRun === true) {
    const result = await completeConsumerFirstRun({
      userId: loaded.identity.user.id,
    });
    return NextResponse.json({
      ok: true,
      consumerFirstRunAt: result.consumerFirstRunAt,
    });
  }

  if (typeof body.llmChatConsent !== "boolean") {
    return NextResponse.json(
      { error: "llmChatConsent must be true or false." },
      { status: 400 },
    );
  }

  const result = await setLlmChatConsent({
    userId: loaded.identity.user.id,
    consented: body.llmChatConsent,
  });

  return NextResponse.json({
    ok: true,
    llmChatConsent: Boolean(result.llmChatConsentAt),
    llmChatConsentAt: result.llmChatConsentAt,
  });
}

export async function DELETE(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  let body: { confirm?: string } = {};
  try {
    body = (await request.json()) as { confirm?: string };
  } catch {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }

  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm account deletion." },
      { status: 400 },
    );
  }

  const appleEnabled = isAppleAuthEnabled();
  const appleReady = appleRevocationRequired(appleEnabled, process.env);
  if (!appleReady.ok) {
    return NextResponse.json({ error: appleReady.error }, { status: 503 });
  }

  const userId = loaded.identity.user.id;
  const notifyEmail =
    loaded.identity.user.email?.trim() ||
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
    )?.email?.trim() ||
    "";

  const result = await deleteUserAccount(userId, {
    revokeAppleTokens: async () => {
      if (!appleEnabled) return;
      const admin = createSupabaseServerClient();
      const { data } = await admin.auth.admin.getUserById(userId);
      const refresh =
        (data.user?.app_metadata as { provider_refresh_token?: string } | undefined)
          ?.provider_refresh_token ?? null;
      await revokeAppleTokensForUser({
        refreshToken: refresh,
        appleEnabled: true,
        env: process.env,
      });
    },
    deleteAuthUser: async (id) => {
      const admin = createSupabaseServerClient();
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (notifyEmail) {
    try {
      await sendTransactionalEmail({
        template: "account_deleted",
        to: notifyEmail,
      });
    } catch {
      // Deletion already succeeded; mail is best-effort.
    }
  }

  return NextResponse.json({
    ok: true,
    retained: ACCOUNT_DELETION_RETAINED,
  });
}
