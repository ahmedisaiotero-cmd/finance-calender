import { isProductionRuntime } from "@/lib/api/endpoint-rate-limit-config";

const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "authorization, content-type";

const EXTENSION_ORIGIN = /^chrome-extension:\/\/([a-p]{32})(?::\d+)?$/i;

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function parseAllowedExtensionIds(
  env: EnvLike = process.env,
): string[] {
  const raw = env.SYNC_EXTENSION_IDS?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => /^[a-p]{32}$/.test(id));
}

export function isAllowedAiActivityOrigin(
  origin: string | null,
  env: EnvLike = process.env,
): origin is string {
  if (!origin) return false;

  const extension = origin.match(EXTENSION_ORIGIN);
  if (extension) {
    const id = extension[1]?.toLowerCase() ?? "";
    return parseAllowedExtensionIds(env).includes(id);
  }

  if (isProductionRuntime(env)) return false;

  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function aiActivityCorsHeaders(
  request: Request,
  env: EnvLike = process.env,
): HeadersInit {
  const origin = request.headers.get("origin");
  if (!isAllowedAiActivityOrigin(origin, env)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    Vary: "Origin",
  };
}

export function withAiActivityCors(
  request: Request,
  response: Response,
  env: EnvLike = process.env,
): Response {
  const headers = aiActivityCorsHeaders(request, env);
  const next = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    next.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: next,
  });
}
