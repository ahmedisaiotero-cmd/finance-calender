import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env";
import {
  PUBLIC_AUTH_ERROR,
  publicAuthErrorMessage,
} from "@/lib/auth/app-auth-gate";

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

type OtpAuthResult = {
  data: { user: AuthUser | null; session: { access_token?: string } | null };
  error: { message: string } | null;
};

type OAuthAuthResult = {
  data: { url?: string | null; provider?: string };
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
    signInWithOtp: (input: {
      email: string;
      options?: {
        emailRedirectTo?: string;
        shouldCreateUser?: boolean;
        data?: Record<string, unknown>;
      };
    }) => Promise<OtpAuthResult>;
    signInWithOAuth: (input: {
      provider: "google" | "apple";
      options?: { redirectTo?: string; skipBrowserRedirect?: boolean };
    }) => Promise<OAuthAuthResult>;
    resetPasswordForEmail: (
      email: string,
      options?: { redirectTo?: string },
    ) => Promise<{ error: { message: string } | null }>;
    updateUser: (input: {
      password: string;
    }) => Promise<{ error: { message: string } | null }>;
    signUp: (input: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
    }) => Promise<PasswordAuthResult>;
    signOut: () => Promise<{ error: { message: string } | null }>;
  };
};

export type BrowserAuthDeps = {
  isConfigured?: () => boolean;
  createClient?: () => BrowserAuthClient;
};

const defaultDeps: Required<BrowserAuthDeps> = {
  isConfigured: isSupabaseBrowserConfigured,
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
      error: PUBLIC_AUTH_ERROR.config,
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
  input: {
    email: string;
    password: string;
    userMetadata?: Record<string, unknown>;
    emailRedirectTo?: string;
  },
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true; user: BrowserAuthUser } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) {
    return {
      ok: false,
      error: PUBLIC_AUTH_ERROR.config,
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: input.userMetadata,
        emailRedirectTo: input.emailRedirectTo,
      },
    });

    if (error) {
      return { ok: false, error: publicAuthErrorMessage(error) };
    }

    if (!data.user) {
      return {
        ok: false,
        error: PUBLIC_AUTH_ERROR.confirmEmail,
      };
    }

    if (!data.session) {
      return {
        ok: false,
        error: PUBLIC_AUTH_ERROR.confirmEmail,
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

function unconfigured(): { ok: false; error: string } {
  return { ok: false, error: PUBLIC_AUTH_ERROR.config };
}

export async function signInWithMagicLink(
  input: {
    email: string;
    emailRedirectTo: string;
    userMetadata?: Record<string, unknown>;
  },
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) return unconfigured();

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: input.email.trim(),
      options: {
        emailRedirectTo: input.emailRedirectTo,
        shouldCreateUser: true,
        data: input.userMetadata,
      },
    });
    if (error) return { ok: false, error: publicAuthErrorMessage(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: publicAuthErrorMessage(error) };
  }
}

export async function signInWithOAuthProvider(
  input: {
    provider: "google" | "apple";
    redirectTo: string;
  },
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true; url?: string | null } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) return unconfigured();

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: input.provider,
      options: {
        redirectTo: input.redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { ok: false, error: publicAuthErrorMessage(error) };
    if (data.url && typeof window !== "undefined") {
      window.location.assign(data.url);
    }
    return { ok: true, url: data.url };
  } catch (error) {
    return { ok: false, error: publicAuthErrorMessage(error) };
  }
}

export async function requestPasswordReset(
  input: { email: string; redirectTo: string },
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) return unconfigured();

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      input.email.trim(),
      { redirectTo: input.redirectTo },
    );
    if (error) return { ok: false, error: publicAuthErrorMessage(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: publicAuthErrorMessage(error) };
  }
}

export async function updateBrowserPassword(
  input: { password: string },
  deps: BrowserAuthDeps = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { isConfigured, createClient } = { ...defaultDeps, ...deps };
  if (!isConfigured()) return unconfigured();

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (error) return { ok: false, error: publicAuthErrorMessage(error) };
    return { ok: true };
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
