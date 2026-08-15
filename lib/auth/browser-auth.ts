import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { publicAuthErrorMessage } from "@/lib/auth/app-auth-gate";

export type BrowserAuthUser = {
  id: string;
  email: string | null;
};

type AuthUser = { id: string; email?: string | null };
type PasswordAuthResult = {
  data: {
    user: AuthUser | null;
    session: { access_token?: string } | null;
  };
  error: { message: string } | null;
};

export type BrowserAuthClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: AuthUser | null };
      error: { message: string } | null;
    }>;
    signInWithPassword: (input: {
      email: string;
      password: string;
    }) => Promise<PasswordAuthResult>;
    signUp: (input: {
      email: string;
      password: string;
    }) => Promise<PasswordAuthResult>;
    signOut: () => Promise<{ error: { message: string } | null }>;
  };
};

export type BrowserAuthDeps = {
  isConfigured?: () => boolean;
  createClient?: () => BrowserAuthClient;
};

const defaultDeps: Required<BrowserAuthDeps> = {
  isConfigured: isSupabaseConfigured,
  createClient: () => createSupabaseBrowserClient() as unknown as BrowserAuthClient,
};

export async function getBrowserSessionUser(
  deps: BrowserAuthDeps = {},
): Promise<BrowserAuthUser | null> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  } catch {
    return null;
  }
}

export async function signInWithPassword(
  input: { email: string; password: string },
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true; user: BrowserAuthUser } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) {
    return {
      ok: false,
      error: "Authentication is not configured for this environment.",
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });

    if (error || !data.user) {
      return { ok: false, error: publicAuthErrorMessage(error) };
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    };
  } catch (error) {
    return { ok: false, error: publicAuthErrorMessage(error) };
  }
}

export async function signUpWithPassword(
  input: { email: string; password: string },
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true; user: BrowserAuthUser } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) {
    return {
      ok: false,
      error: "Authentication is not configured for this environment.",
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
    });

    if (error) {
      return { ok: false, error: publicAuthErrorMessage(error) };
    }

    if (!data.user) {
      return {
        ok: false,
        error: "Check your email to confirm the account, then sign in.",
      };
    }

    if (!data.session) {
      return {
        ok: false,
        error: "Check your email to confirm the account, then sign in.",
      };
    }

    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    };
  } catch (error) {
    return { ok: false, error: publicAuthErrorMessage(error) };
  }
}

export async function signOutBrowserSession(
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) {
    return { ok: true };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { ok: false, error: publicAuthErrorMessage(error) };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: publicAuthErrorMessage(error) };
  }
}
