import { NextResponse } from "next/server";

import { legalAcceptanceRecord } from "@/lib/auth/legal-acceptance";
import { createSupabaseServerAuthClient } from "@/lib/auth/session";
import { ensureUserAndWorkspace } from "@/lib/db/workspace";
import { prisma } from "@/lib/prisma";
import { LEGAL_POLICY_VERSION } from "@/lib/site/legal";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  try {
    const supabase = await createSupabaseServerAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth", url.origin));
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (user?.id) {
      await ensureUserAndWorkspace({
        id: user.id,
        email: user.email ?? null,
      });

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const birthYear = Number(metadata.birthYear);
      const policyVersion =
        typeof metadata.legalPolicyVersion === "string"
          ? metadata.legalPolicyVersion
          : LEGAL_POLICY_VERSION;
      const acceptedAt =
        typeof metadata.legalAcceptedAt === "string"
          ? metadata.legalAcceptedAt
          : null;

      if (Number.isInteger(birthYear) && acceptedAt) {
        const record = legalAcceptanceRecord({
          ok: true,
          birthYear,
          policyVersion,
          acceptedAt,
        });
        const appleIdentity = user.identities?.find(
          (identity) => identity.provider === "apple",
        );
        const appleSub =
          appleIdentity &&
          appleIdentity.identity_data &&
          typeof appleIdentity.identity_data === "object" &&
          "sub" in appleIdentity.identity_data &&
          typeof appleIdentity.identity_data.sub === "string"
            ? appleIdentity.identity_data.sub
            : appleIdentity?.id;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...record,
            appleSubject: appleSub ?? undefined,
          },
        });
      }
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }
}
