import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import {
  isAppleAuthEnabled,
  isGoogleAuthEnabled,
} from "@/lib/auth/oauth-providers";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm
        configMissing={!isSupabaseBrowserConfigured()}
        googleEnabled={isGoogleAuthEnabled()}
        appleEnabled={isAppleAuthEnabled()}
      />
    </Suspense>
  );
}
