import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  return <LoginForm configMissing={!isSupabaseConfigured()} />;
}
