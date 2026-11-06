(() => {
  const detect = globalThis.SyncCaptureDetect;

  function visibleText(node) {
    if (!node) return "";
    const text = node.innerText || node.textContent || "";
    return text.replace(/\s+\n/g, "\n").trim();
  }

  function messageFromNode(node, roleHint) {
    const text = visibleText(node);
    if (!text) return null;
    return { role: roleHint || "unknown", text };
  }

  function extractBySelectors() {
    const messages = [];
    const roleNodes = document.querySelectorAll("[data-message-author-role]");
    roleNodes.forEach((node) => {
      const role = node.getAttribute("data-message-author-role") || "unknown";
      const mapped =
        role === "user" || role === "assistant" || role === "system" || role === "tool"
          ? role
          : "unknown";
      const message = messageFromNode(node, mapped);
      if (message) messages.push(message);
    });
    if (messages.length) return messages;

    const turns = document.querySelectorAll(
      '[data-testid="conversation-turn"], [data-testid="chat-message"], article[data-test-render-count]',
    );
    turns.forEach((node) => {
      const heading = visibleText(node.querySelector("h1, h2, h3, strong"));
      const role =
        /you|human|user/i.test(heading)
          ? "user"
          : /assistant|chatgpt|claude|grok|gemini|cursor/i.test(heading)
            ? "assistant"
            : "unknown";
      const message = messageFromNode(node, role);
      if (message) messages.push(message);
    });
    return messages;
  }

  function extractVisibleConversation() {
    const labeled = extractBySelectors();
    if (labeled.length) return labeled;

    const main = document.querySelector("main") || document.body;
    const text = visibleText(main);
    if (!text || text.length < 20) return [];
    return [{ role: "user", text: text.slice(0, 8000) }];
  }

  function pageTitle() {
    const heading = document.querySelector("main h1, header h1, title");
    const text = heading ? visibleText(heading) : document.title;
    return text.slice(0, 200) || undefined;
  }

  function currentPage() {
    const detected = detect?.detectAiProviderFromUrl(location.href);
    return {
      url: location.href,
      title: pageTitle(),
      detected,
      supported: Boolean(detected),
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SYNC_PAGE_INFO") {
      sendResponse(currentPage());
      return false;
    }
    if (message?.type === "SYNC_EXTRACT") {
      const page = currentPage();
      if (!page.detected) {
        sendResponse({ ok: false, error: "This page is not a supported AI chat." });
        return false;
      }
      const messages = extractVisibleConversation();
      if (!messages.length) {
        sendResponse({
          ok: false,
          error: "Could not find a visible conversation on this page.",
        });
        return false;
      }
      sendResponse({
        ok: true,
        provider: page.detected.provider,
        origin: page.detected.origin,
        title: page.title,
        url: page.url,
        messages,
      });
      return false;
    }
    return false;
  });
})();
