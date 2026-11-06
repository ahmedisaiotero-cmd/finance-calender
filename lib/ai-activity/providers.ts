import type { AiProviderSlug } from "@/lib/ai-activity/types";

export const AI_PROVIDER_DETAILS: Record<
  AiProviderSlug,
  { displayName: string; supportedOrigins: string[] }
> = {
  chatgpt: {
    displayName: "ChatGPT",
    supportedOrigins: ["https://chatgpt.com", "https://chat.openai.com"],
  },
  claude: {
    displayName: "Claude",
    supportedOrigins: ["https://claude.ai"],
  },
  grok: {
    displayName: "Grok",
    supportedOrigins: ["https://grok.com", "https://x.com"],
  },
  cursor: {
    displayName: "Cursor",
    supportedOrigins: ["https://cursor.com"],
  },
  gemini: {
    displayName: "Gemini",
    supportedOrigins: ["https://gemini.google.com"],
  },
  paste_import: {
    displayName: "Paste import",
    supportedOrigins: ["https://sync.local"],
  },
};

export const AI_PROVIDER_ORIGINS: Record<AiProviderSlug, string[]> = {
  chatgpt: AI_PROVIDER_DETAILS.chatgpt.supportedOrigins,
  claude: AI_PROVIDER_DETAILS.claude.supportedOrigins,
  grok: AI_PROVIDER_DETAILS.grok.supportedOrigins,
  cursor: AI_PROVIDER_DETAILS.cursor.supportedOrigins,
  gemini: AI_PROVIDER_DETAILS.gemini.supportedOrigins,
  paste_import: AI_PROVIDER_DETAILS.paste_import.supportedOrigins,
};

type DetectableAiProvider = Exclude<AiProviderSlug, "paste_import">;

const CHAT_HOST_PROVIDERS: Array<{ host: string; provider: DetectableAiProvider }> = [
  { host: "chatgpt.com", provider: "chatgpt" },
  { host: "chat.openai.com", provider: "chatgpt" },
  { host: "claude.ai", provider: "claude" },
  { host: "grok.com", provider: "grok" },
  { host: "x.com", provider: "grok" },
  { host: "cursor.com", provider: "cursor" },
  { host: "gemini.google.com", provider: "gemini" },
];

export function normalizeHttpOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function detectAiProviderFromUrl(value: string): {
  provider: DetectableAiProvider;
  origin: string;
} | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "");
  const match = CHAT_HOST_PROVIDERS.find((entry) => host === entry.host);
  if (!match) return null;
  if (match.host === "x.com" && !isGrokOnXPath(url.pathname)) return null;

  return { provider: match.provider, origin: url.origin };
}

function isGrokOnXPath(pathname: string): boolean {
  return (
    pathname === "/i/grok" ||
    pathname.startsWith("/i/grok/") ||
    pathname === "/grok" ||
    pathname.startsWith("/grok/")
  );
}

export function primaryOriginForProvider(provider: AiProviderSlug): string {
  return AI_PROVIDER_ORIGINS[provider][0] ?? "https://sync.local";
}
