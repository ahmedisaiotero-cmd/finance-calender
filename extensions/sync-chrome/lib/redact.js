(() => {
  const REDACTION = "[redacted]";
  const PATTERNS = [
    /\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi,
    /\b(sk|pk|rk|sb|ey|xox[baprs]|gh[pousr]|AIza|ya29|AKIA|ASIA)[-_A-Za-z0-9]{12,}\b/g,
    /\b(?:\d[ -]*?){13,19}\b/g,
    /\b\d{3}-\d{2}-\d{4}\b/g,
  ];

  function redactText(text) {
    if (!text) return { text, redacted: false };
    let cleaned = text;
    for (const pattern of PATTERNS) {
      cleaned = cleaned.replace(pattern, REDACTION);
    }
    return { text: cleaned, redacted: cleaned !== text };
  }

  const api = { redactText };
  globalThis.SyncCaptureRedact = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
