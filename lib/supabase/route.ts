import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { BrowserAuthClient } from "@/lib/auth/browser-auth";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function createSupabaseRouteAuthClient(): Promise<BrowserAuthClient> {
  const cookieStore = await cookies();
  const client = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
  return client as unknown as BrowserAuthClient;
}
