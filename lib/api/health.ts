export type HealthCheck = "ok" | "skipped" | "error";

export type HealthReport = {
  ok: boolean;
  status: "ok" | "degraded";
  checks: {
    app: HealthCheck;
    database: HealthCheck;
  };
};

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export async function buildHealthReport(input: {
  env?: EnvLike;
  pingDatabase?: () => Promise<void>;
} = {}): Promise<HealthReport> {
  const env = input.env ?? process.env;
  const configured = Boolean(env.DATABASE_URL?.trim());
  if (!configured) {
    return {
      ok: true,
      status: "ok",
      checks: { app: "ok", database: "skipped" },
    };
  }

  try {
    await (input.pingDatabase ?? (async () => undefined))();
    return {
      ok: true,
      status: "ok",
      checks: { app: "ok", database: "ok" },
    };
  } catch {
    return {
      ok: false,
      status: "degraded",
      checks: { app: "ok", database: "error" },
    };
  }
}

export function healthReportLeaksSecrets(
  report: HealthReport,
  env: EnvLike = process.env,
): boolean {
  const serialized = JSON.stringify(report);
  const suspects = [
    env.DATABASE_URL,
    env.OPENAI_API_KEY,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SENTRY_DSN,
    env.RESEND_API_KEY,
    env.CRON_SECRET,
  ].filter((value): value is string => Boolean(value && value.length > 8));
  return suspects.some((value) => serialized.includes(value));
}
