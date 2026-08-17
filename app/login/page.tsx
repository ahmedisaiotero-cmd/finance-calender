import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  return <LoginForm configMissing={!isSupabaseBrowserConfigured()} />;
}
