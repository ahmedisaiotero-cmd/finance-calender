import { NextResponse } from "next/server";

import { isAppleAuthEnabled } from "@/lib/auth/oauth-providers";
import {
  appleRevocationRequired,
  verifyAppleServerNotification,
} from "@/lib/auth/apple-notifications";
import { deleteUserAccount } from "@/lib/db/delete-user-account";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sign in with Apple server-to-server notifications.
 * Apple posts `payload=<jwt>`. Consent revocation and account-delete events
 * remove the matching Sync user. This endpoint never no-ops when Apple is on.
 */
export async function POST(request: Request) {
  const appleEnabled = isAppleAuthEnabled();
  const required = appleRevocationRequired(appleEnabled, process.env);
  if (!required.ok) {
    return NextResponse.json({ error: required.error }, { status: 503 });
  }
  if (!appleEnabled) {
    return NextResponse.json(
      { error: "Sign in with Apple is not enabled." },
      { status: 404 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let token = "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    token = String(form.get("payload") ?? "");
  } else {
    const json = (await request.json().catch(() => null)) as
      | { payload?: string }
      | null;
    token = json?.payload ?? "";
  }

  let event: Awaited<ReturnType<typeof verifyAppleServerNotification>>;
  try {
    event = await verifyAppleServerNotification(token);
  } catch {
    return NextResponse.json({ error: "Invalid Apple notification." }, { status: 401 });
  }

  const type = event.events?.type ?? event.type ?? "";
  const sub = event.events?.sub ?? event.sub;
  if (!sub) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (
    type === "consent-revoked" ||
    type === "account-delete" ||
    type === "email-disabled"
  ) {
    const user = await prisma.user.findUnique({
      where: { appleSubject: sub },
      select: { id: true },
    });
    if (user) {
      await deleteUserAccount(user.id, {
        deleteAuthUser: async (id) => {
          const admin = createSupabaseServerClient();
          await admin.auth.admin.deleteUser(id);
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
