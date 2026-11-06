(() => {
  const HOSTS = [
    { host: "chatgpt.com", provider: "chatgpt" },
    { host: "chat.openai.com", provider: "chatgpt" },
    { host: "claude.ai", provider: "claude" },
    { host: "grok.com", provider: "grok" },
    { host: "x.com", provider: "grok" },
    { host: "cursor.com", provider: "cursor" },
    { host: "gemini.google.com", provider: "gemini" },
  ];

  function isGrokOnXPath(pathname) {
    return (
      pathname === "/i/grok" ||
      pathname.startsWith("/i/grok/") ||
      pathname === "/grok" ||
      pathname.startsWith("/grok/")
    );
  }

  function detectAiProviderFromUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.replace(/^www\./, "");
    const match = HOSTS.find((entry) => entry.host === host);
    if (!match) return null;
    if (match.host === "x.com" && !isGrokOnXPath(url.pathname)) return null;
    return { provider: match.provider, origin: url.origin };
  }

  const api = { detectAiProviderFromUrl, HOSTS };
  globalThis.SyncCaptureDetect = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
