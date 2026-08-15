import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decideAppAuthGate } from "@/lib/auth/app-auth-gate";
import { isSyncDemoMode } from "@/lib/auth/demo-mode";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const supabaseConfigured = isSupabaseConfigured();
  const demoMode = isSyncDemoMode();

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let hasTrustedSession = false;

  if (supabaseConfigured) {
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    hasTrustedSession = Boolean(data.user?.id);
  }

  const decision = decideAppAuthGate({
    pathname,
    hasTrustedSession,
    supabaseConfigured,
    demoMode,
  });

  if (decision.action === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = decision.to;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Preserve any cookies written during getUser() refresh.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
