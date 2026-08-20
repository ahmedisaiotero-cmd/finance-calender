export const DEFAULT_OPENAI_CHAT_MODEL = "gpt-4o-mini";

export const OPENAI_CHAT_MODEL_ALLOWLIST = [
  "gpt-4o-mini",
  "gpt-4o",
] as const;

export type OpenAIChatPublicError = {
  status: 429 | 503;
  error: string;
};

export function resolveOpenAIApiKey(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  return env.OPENAI_API_KEY?.trim() ?? "";
}

export function resolveOpenAIChatModel(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): { ok: true; model: string } | { ok: false } {
  const raw = env.OPENAI_MODEL?.trim();
  if (!raw) {
    return { ok: true, model: DEFAULT_OPENAI_CHAT_MODEL };
  }
  if (
    (OPENAI_CHAT_MODEL_ALLOWLIST as readonly string[]).includes(raw)
  ) {
    return { ok: true, model: raw };
  }
  return { ok: false };
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { status?: unknown; statusCode?: unknown };
  if (typeof record.status === "number") return record.status;
  if (typeof record.statusCode === "number") return record.statusCode;
  return null;
}

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

/** Map provider failures to safe copy. Never include keys or raw bodies. */
export function publicOpenAIChatError(error: unknown): OpenAIChatPublicError {
  const status = errorStatus(error);
  const lower = errorText(error).toLowerCase();

  if (
    status === 401 ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid_api_key")
  ) {
    return { status: 503, error: "Chat is unavailable" };
  }

  if (
    lower.includes("insufficient_quota") ||
    lower.includes("insufficient quota") ||
    lower.includes("billing") ||
    lower.includes("credit")
  ) {
    return { status: 503, error: "Chat is temporarily unavailable" };
  }

  if (status === 429 || lower.includes("rate limit")) {
    return { status: 429, error: "Chat is busy. Please try again later." };
  }

  if (
    status === 404 ||
    (lower.includes("model") &&
      (lower.includes("not found") ||
        lower.includes("does not exist") ||
        lower.includes("unavailable")))
  ) {
    return { status: 503, error: "Chat model is unavailable" };
  }

  return { status: 503, error: "Chat is temporarily unavailable" };
}

export function logChatDownstreamFailure(error: unknown) {
  const status = errorStatus(error);
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name ?? "Error")
      : "Error";
  console.error("POST /api/chat downstream", { name, status });
}
